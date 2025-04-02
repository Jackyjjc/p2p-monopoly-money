import React, { createContext, useContext, useReducer, ReactNode, useEffect, useRef, useState } from 'react';
import { GameState } from '../types';
import { GameAction, gameReducer } from './GameStateReducer';
import { PeerService } from '../services/PeerService';
import { PeerMessageType, PeerServiceMessage } from '../types/peerMessages';
import { validateTransaction } from '../utils/transactionValidator';
import { createErrorMessage } from '../utils/messageUtils';
import { useSessionStorage, STORAGE_KEYS } from '../hooks/useSessionStorage';

// Create the context with initial undefined values
const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  peerService: PeerService | undefined;
} | undefined>(undefined);

// Provider component that wraps the app
interface GameProviderProps {
  children: ReactNode;
  initialState?: GameState;
  peerService?: PeerService;
}

export const GameProvider = ({ 
  children, 
  peerService
}: GameProviderProps) => {
  // Initialize state from session storage or empty state
  const [storedState, setStoredState] = useSessionStorage<GameState>(
    STORAGE_KEYS.GAME_STATE,
    {} as GameState
  );

  // Use reducer with stored state as initial value
  const [state, dispatch] = useReducer(gameReducer, storedState);

  // Update session storage when state changes
  useEffect(() => {
    setStoredState(state);
  }, [state, setStoredState]);

  // Subscribe to PeerService events
  useEffect(() => {
    console.log('Subscribing to PeerService events when peerService or state changes.');
    if (!peerService) return;

    // Set current user as connected whenever peerService is available
    const currentPeerId = peerService.getPeerId();
    if (currentPeerId && state.id && state.players[currentPeerId] && state.players[currentPeerId].isAdmin) {
      dispatch({
        type: 'SET_PLAYER_CONNECTED',
        payload: {
          playerId: currentPeerId
        }
      });
    }

    // Handle incoming messages from peers
    const handleMessage = ({ peerId, message }: { peerId: string, message: PeerServiceMessage }) => {
      console.log('Received message from peer', peerId, message);
      
      try {
        // Ignore messages from self
        if (peerId === peerService.getPeerId()) {
          console.log('Received message from self, ignoring');
          return;
        }
        
        // Check if we're admin
        const isAdmin = state.id &&!!state.players[peerService.getPeerId() || '']?.isAdmin;
        
        
        switch (message.type) {
          case PeerMessageType.STATE_SYNC:
            console.log('Received state sync message');
            // Validate received state
            const receivedState = message.payload.gameState as GameState;
            
            dispatch({ 
              type: 'SYNC_STATE', 
              payload: receivedState
            });
            break;
          
          case PeerMessageType.TRANSACTION_REQUEST:
            // Add new transaction (only admin should process this)
            if (isAdmin) {
              const transaction = {
                id: message.payload.id,
                timestamp: message.payload.timestamp,
                senderId: message.payload.senderId,
                receiverId: message.payload.receiverId,
                amount: message.payload.amount,
                isDeleted: false
              };
              
              // Validate the transaction
              const validation = validateTransaction(state, transaction);
              
              if (validation.isValid) {
                // Transaction is valid, process it
                dispatch({
                  type: 'ADD_TRANSACTION',
                  payload: transaction
                });
              } else {
                // Transaction is invalid, send error back to peer
                console.error('Invalid transaction request:', validation.errorMessage);
                
                // Send error message back to the peer who sent the transaction
                peerService.sendToPeer(peerId, createErrorMessage(
                  'INVALID_TRANSACTION', 
                  validation.errorMessage
                ));
              }
              
              // After processing a transaction, we should broadcast updated state
              // This will happen in a useEffect that watches for state changes
            }
            break;
          
          case PeerMessageType.PLAYER_NAME:
            // Update player name (only admin should process this)
            console.log('Received player name update from peer', message.payload.playerId, message.payload.playerName);
            if (isAdmin) {
              console.log('Updating player name in state');
              dispatch({
                type: 'UPDATE_PLAYER_NAME',
                payload: {
                  playerId: message.payload.playerId,
                  playerName: message.payload.playerName
                }
              });
              
              // State will be broadcast automatically after update
            }
            break;
          
          case PeerMessageType.GAME_START:
            // Start the game
            dispatch({
              type: 'START_GAME',
              payload: { startedAt: message.payload.startedAt }
            });
            break;
          
          case PeerMessageType.GAME_END:
            // End the game
            dispatch({
              type: 'END_GAME',
              payload: { endedAt: message.payload.endedAt }
            });
            break;
          
          case PeerMessageType.ERROR:
            // Handle error messages
            console.error('Peer error:', message.payload.message);
            break;
        }
      } catch (error) {
        console.error('Error handling peer message:', error);
      }
    };

    // Handle peer connections
    const handlePeerConnect = (remotePeerId: string) => {
      try {
        const isAdmin = !!state.players[peerService.getPeerId() || '']?.isAdmin;
        if (isAdmin) {
          // Check if player already exists in state
          if (state.players[remotePeerId]) {
            // Update existing player's connection status
            dispatch({
              type: 'SET_PLAYER_CONNECTED',
              payload: {
                playerId: remotePeerId
              }
            });
          } else if (state.status === 'configuring') {
            // Add new player if in config mode
            dispatch({
              type: 'ADD_PLAYER',
              payload: {
                playerId: remotePeerId
              }
            });
          }
        }
      } catch (error) {
        console.error('Error handling peer connection:', error);
      }
    };

    // Handle peer disconnections
    const handlePeerDisconnect = (remotePeerId: string) => {
      console.log('Peer disconnected:', remotePeerId);
      
      try {
        const isAdmin = !!state.players[peerService.getPeerId() || '']?.isAdmin;
        
        if (isAdmin) {
          // If game has started, just mark player as disconnected
          dispatch({
            type: 'SET_PLAYER_DISCONNECTED',
            payload: {
              playerId: remotePeerId
            }
          });
        }
      } catch (error) {
        console.error('Error handling peer disconnection:', error);
      }
    };

    const reconnectToPeers = async () => {
      if (!peerService || !state.id) return;

      if (!peerService.isConnectedToSignalServer()) return;

      const currentPeerId = peerService.getPeerId();
      if (!currentPeerId || !state.players) return;

      try {
        const isAdmin = state.players[currentPeerId]?.isAdmin;
        console.log('Reconnection check - Current player is admin:', isAdmin);

        if (isAdmin) {
          // Admin reconnects to all players in the state
          const playerIds = Object.keys(state.players).filter(id => 
            id !== currentPeerId && state.players[id]?.isConnected
          );
          
          console.log('Admin attempting to reconnect to players:', playerIds);
          
          for (const playerId of playerIds) {
            try {
              await peerService.connectToPeer(playerId);
            } catch (error) {
              console.error(`Failed to reconnect to player ${playerId}:`, error);
            }
          }
        } else {
          // Non-admin reconnects to the admin
          const adminId = Object.keys(state.players).find(id => 
            state.players[id]?.isAdmin && state.players[id]?.isConnected
          );
          
          if (adminId) {
            console.log('Non-admin attempting to reconnect to admin:', adminId);
            await peerService.connectToPeer(adminId);
          } else {
            console.warn('No admin found to reconnect to');
          }
        }
      } catch (error) {
        console.error('Error during reconnection:', error);
      }
    };

    // Listen for events
    peerService.on('message', handleMessage);
    peerService.on('peer:connect', handlePeerConnect);
    peerService.on('peer:disconnect', handlePeerDisconnect);
    peerService.on('signal:connected', reconnectToPeers);

    // Cleanup event listeners
    return () => {
      peerService.removeListener('message', handleMessage);
      peerService.removeListener('peer:connect', handlePeerConnect);
      peerService.removeListener('peer:disconnect', handlePeerDisconnect);
    };
    // TODO: it is a bit weird that we are subscribing to state here.
  }, [peerService, state]);

  // Broadcast state changes if we're the admin
  useEffect(() => {
    console.log('Entering broadcast hook');

    if (!peerService) return;

    if (!state.id) {
      console.log('Game state not initialized, skipping broadcast');
      return;
    }
    
    const isAdmin = !!state.players[peerService.getPeerId() || '']?.isAdmin;
    if (!isAdmin) return;
    
    const connectedPeers = peerService.getPeers();
    if (connectedPeers.length === 0) return;
    
    // Broadcast state to all connected peers
    try {
      console.log('Broadcasting game state on game state or peer service change');

      // Fix the type by using a properly typed message
      peerService.broadcast({
        type: PeerMessageType.STATE_SYNC,
        payload: {
          gameState: state
        }
      } as PeerServiceMessage);
    } catch (error) {
      console.error('Error broadcasting game state:', error);
    }
  }, [peerService, state]);

  return (
    <GameContext.Provider value={{ state, dispatch, peerService }}>
      {children}
    </GameContext.Provider>
  );
};

// Custom hook for consuming the context
export const useGameContext = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
};

export default GameContext; 