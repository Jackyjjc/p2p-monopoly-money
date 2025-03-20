import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { GameState } from '../types';
import { GameAction, gameReducer, GameStateReducer } from './GameStateReducer';
import { PeerService } from '../services/PeerService';
import { PeerMessageType, PeerServiceMessage } from '../types/peerMessages';

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
  const [state, dispatch] = useReducer(gameReducer, {} as GameState);

  // Subscribe to PeerService events
  useEffect(() => {
    if (!peerService) return;

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
              dispatch({
                type: 'ADD_TRANSACTION',
                payload: {
                  id: message.payload.id,
                  timestamp: message.payload.timestamp,
                  senderId: message.payload.senderId,
                  receiverId: message.payload.receiverId,
                  amount: message.payload.amount,
                  isDeleted: false
                }
              });
              
              // After processing a transaction, we should broadcast updated state
              // This will happen in a useEffect that watches for state changes
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
      console.log('Peer connected:', remotePeerId);
      
      try {
        const isAdmin = !!state.players[peerService.getPeerId() || '']?.isAdmin;
        if (isAdmin) {
          dispatch({
            type: 'ADD_PLAYER',
            payload: {
              playerId: remotePeerId
            }
          });
          
          // The state will be broadcast automatically after update
          // due to the useEffect that watches state changes
        }
      } catch (error) {
        console.error('Error handling peer connection:', error);
      }
    };

    // Handle peer disconnections
    const handlePeerDisconnect = (remotePeerId: string) => {
      console.log('Peer disconnected:', remotePeerId);
      // Additional disconnect handling could be added here
    };

    // Listen for events
    peerService.on('message', handleMessage);
    peerService.on('peer:connect', handlePeerConnect);
    peerService.on('peer:disconnect', handlePeerDisconnect);

    // Cleanup event listeners
    return () => {
      peerService.removeListener('message', handleMessage);
      peerService.removeListener('peer:connect', handlePeerConnect);
      peerService.removeListener('peer:disconnect', handlePeerDisconnect);
    };
  }, [peerService, state]);

  // Broadcast state changes if we're the admin
  useEffect(() => {
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