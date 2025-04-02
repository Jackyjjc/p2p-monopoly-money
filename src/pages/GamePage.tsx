import React, { useState, useEffect } from 'react';
import { useGameContext } from '../contexts/GameContext';
import ConnectionStatus from '../components/ConnectionStatus';
import PlayersList from '../components/PlayersList';
import StashList from '../components/StashList';
import TransactionsList from '../components/TransactionsList';
import TransactionModal from '../components/TransactionModal';
import StateLoading from '../components/StateLoading';
import { PeerMessageType } from '../types/peerMessages';
import { validateTransaction } from '../utils/transactionValidator';
import { usePeerConnection } from '../hooks/usePeerConnection';
import styles from '../styles/GamePage.module.css';

const GamePage: React.FC = () => {
  const { state, dispatch, peerService } = useGameContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionError, setTransactionError] = useState<string | null>(null);

  // Use the usePeerConnection hook to ensure PeerService is initialized
  const { connectionStatus, error: peerError } = usePeerConnection(peerService);

  // Check if the current user is admin
  const currentPeerId = peerService?.getPeerId() || '';
  const players = state.players || {};
  const isAdmin = players[currentPeerId]?.isAdmin || false;

  // Listen for error messages from peers (especially transaction validation errors)
  useEffect(() => {
    if (!peerService) return;

    const handlePeerMessage = ({ peerId, message }: { peerId: string, message: any }) => {
      if (message.type === PeerMessageType.ERROR) {
        if (message.payload.code === 'INVALID_TRANSACTION') {
          setTransactionError(message.payload.message);
        }
      }
    };

    peerService.on('message', handlePeerMessage);

    return () => {
      peerService.removeListener('message', handlePeerMessage);
    };
  }, [peerService]);

  const handleCreateTransaction = (senderId: string, receiverId: string, amount: number) => {
    // Clear any previous error
    setTransactionError(null);

    const transactionData = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      senderId,
      receiverId,
      amount,
      isDeleted: false
    };

    // Validate the transaction
    const validation = validateTransaction(state, transactionData);
    
    if (!validation.isValid) {
      setTransactionError(validation.errorMessage);
      return;
    }

    // If admin, dispatch directly to update state
    if (isAdmin) {
      dispatch({
        type: 'ADD_TRANSACTION',
        payload: transactionData
      });
    } 
    // If not admin, send transaction request to admin
    else if (peerService) {
      // Find admin peer ID
      const adminPeerId = Object.keys(players).find(id => players[id].isAdmin);
      
      if (adminPeerId) {
        peerService.sendToPeer(adminPeerId, {
          type: PeerMessageType.TRANSACTION_REQUEST,
          payload: transactionData
        });
      }
    }

    // Close modal
    setIsModalOpen(false);
  };

  // Handle end game action
  const handleEndGame = () => {
    if (isAdmin && peerService) {
      // Dispatch end game action locally
      dispatch({
        type: 'END_GAME',
        payload: { endedAt: Date.now() }
      });
      
      // Broadcast to all peers
      peerService.broadcast({
        type: PeerMessageType.GAME_END,
        payload: { endedAt: Date.now() }
      });
    }
  };

  if (connectionStatus !== 'connected' || !state.id) {
    return (
      <StateLoading
        connectionStatus={connectionStatus}
        error={peerError}
      />
    );
  }

  return (
    <div className={styles['game-page']}>
      <div className={styles['header-container']}>
        <h1>Game: {state.displayName}</h1>
        {isAdmin && state.status === 'active' && (
          <button 
            className={styles['end-game-button']} 
            onClick={handleEndGame}
          >
            End Game
          </button>
        )}
      </div>
      <ConnectionStatus />
      
      {transactionError && (
        <div className={styles['error-banner']}>
          Transaction Error: {transactionError}
          <button 
            className={styles['error-close']} 
            onClick={() => setTransactionError(null)}
          >
            ×
          </button>
        </div>
      )}

      {state.status === 'ended' && (
        <div className={styles['info-banner']}>
          This game has ended. No new transactions can be made.
        </div>
      )}
      
      {/* Transaction Dashboard */}
      <div className={styles['dashboard']}>
        <section className={styles['section']}>
          <h2>Players</h2>
          <PlayersList 
            players={state.players} 
            currentPeerId={currentPeerId} 
          />
        </section>
        
        <section className={styles['section']}>
          <h2>Stashes</h2>
          <StashList stashes={state.stashes} />
        </section>
        
        <TransactionsList
          transactions={state.transactions}
          players={state.players}
          stashes={state.stashes}
          onNewTransaction={() => state.status === 'active' && setIsModalOpen(true)}
          disabled={state.status !== 'active'}
        />
      </div>
      
      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateTransaction}
        players={state.players}
        stashes={state.stashes}
        error={transactionError}
      />
    </div>
  );
};

export default GamePage; 