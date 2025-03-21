import React, { useState, useEffect } from 'react';
import styles from '../styles/GamePage.module.css';

interface EntityMap {
  [key: string]: {
    name: string;
    balance: number;
    isInfinite?: boolean;
    [key: string]: any;
  };
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (senderId: string, receiverId: string, amount: number) => void;
  players: EntityMap;
  stashes: EntityMap;
  error?: string | null;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  players, 
  stashes,
  error 
}) => {
  const [senderId, setSenderId] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [amount, setAmount] = useState('');
  const [localError, setLocalError] = useState('');

  // Update localError when the external error prop changes
  useEffect(() => {
    if (error) {
      setLocalError(error);
    }
  }, [error]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    // Validation
    if (!senderId) {
      setLocalError('Please select a sender');
      return;
    }
    if (!receiverId) {
      setLocalError('Please select a receiver');
      return;
    }
    if (senderId === receiverId) {
      setLocalError('Sender and receiver cannot be the same');
      return;
    }
    
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      setLocalError('Please enter a valid positive amount');
      return;
    }

    // Submit transaction
    onSubmit(senderId, receiverId, amountValue);
    
    // Reset form
    setSenderId('');
    setReceiverId('');
    setAmount('');
  };

  const handleSwap = () => {
    // Swap sender and receiver
    if (senderId || receiverId) {
      const tempSender = senderId;
      setSenderId(receiverId);
      setReceiverId(tempSender);
    }
  };

  return (
    <div className={styles['modal-overlay']}>
      <div className={styles['modal-content']}>
        <h2>New Transaction</h2>
        
        <form onSubmit={handleSubmit}>
          <div className={styles['form-group']}>
            <label htmlFor="sender">From:</label>
            <select 
              id="sender" 
              value={senderId} 
              onChange={(e) => setSenderId(e.target.value)}
              className={styles['form-control']}
            >
              <option value="">Select sender</option>
              {/* Players options */}
              <optgroup label="Players">
                {Object.values(players).map(player => (
                  <option key={player.peerId} value={player.peerId}>
                    {player.name} (Balance: {player.balance})
                  </option>
                ))}
              </optgroup>
              
              {/* Stashes options */}
              <optgroup label="Stashes">
                {Object.values(stashes).map(stash => (
                  <option key={stash.id} value={stash.id}>
                    {stash.name} ({stash.isInfinite ? '∞' : `Balance: ${stash.balance}`})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          
          <div className={styles['swap-button-container']} style={{ textAlign: 'center', margin: '10px 0' }}>
            <button 
              type="button" 
              onClick={handleSwap}
              className={styles['swap-button']}
              title="Swap sender and receiver"
              style={{ padding: '5px 10px' }}
            >
              ↑↓ Swap
            </button>
          </div>
          
          <div className={styles['form-group']}>
            <label htmlFor="receiver">To:</label>
            <select 
              id="receiver" 
              value={receiverId} 
              onChange={(e) => setReceiverId(e.target.value)}
              className={styles['form-control']}
            >
              <option value="">Select receiver</option>
              {/* Players options */}
              <optgroup label="Players">
                {Object.values(players).map(player => (
                  <option key={player.peerId} value={player.peerId}>
                    {player.name} (Balance: {player.balance})
                  </option>
                ))}
              </optgroup>
              
              {/* Stashes options */}
              <optgroup label="Stashes">
                {Object.values(stashes).map(stash => (
                  <option key={stash.id} value={stash.id}>
                    {stash.name} ({stash.isInfinite ? '∞' : `Balance: ${stash.balance}`})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          
          <div className={styles['form-group']}>
            <label htmlFor="amount">Amount:</label>
            <input 
              type="number"
              id="amount"
              value={amount}
              min="0.01"
              step="0.01"
              onChange={(e) => setAmount(e.target.value)}
              className={styles['form-control']}
            />
          </div>
          
          {localError && <div className={styles['error-message']}>{localError}</div>}
          
          <div className={styles['button-group']}>
            <button 
              type="button" 
              onClick={onClose}
              className={styles['cancel-button']}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className={styles['submit-button']}
            >
              Create Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal; 