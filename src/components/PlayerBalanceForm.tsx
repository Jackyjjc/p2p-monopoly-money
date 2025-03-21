import React, { useState } from 'react';
import { Player } from '../types/models';
import styles from '../styles/LobbyPage.module.css';

interface PlayerBalanceFormProps {
  players: Record<string, Player>;
  onUpdateBalance: (playerId: string, balance: number) => void;
  currentPeerId: string;
}

const PlayerBalanceForm: React.FC<PlayerBalanceFormProps> = ({ 
  players, 
  onUpdateBalance,
  currentPeerId
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [balance, setBalance] = useState<number>(0);

  // Get all players including the admin
  const allPlayers = Object.values(players);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId) return;
    
    onUpdateBalance(selectedPlayerId, balance);
    
    // Reset form
    setSelectedPlayerId('');
    setBalance(0);
  };

  return (
    <div className={styles['player-balance-form']}>
      <h3>Set Player Starting Balance</h3>
      <form onSubmit={handleSubmit}>
        <div className={styles['form-group']}>
          <label htmlFor="player-select">Player:</label>
          <select
            id="player-select"
            value={selectedPlayerId}
            onChange={(e) => {
              setSelectedPlayerId(e.target.value);
              // Pre-fill balance with current player balance
              if (e.target.value) {
                setBalance(players[e.target.value].balance);
              }
            }}
            required
          >
            <option value="">Select a player</option>
            {allPlayers.map(player => (
              <option key={player.peerId} value={player.peerId}>
                {player.name} {player.peerId === currentPeerId ? '(You)' : ''}
              </option>
            ))}
          </select>
        </div>
        
        <div className={styles['form-group']}>
          <label htmlFor="player-balance">Balance:</label>
          <input
            id="player-balance"
            type="number"
            min="0"
            value={balance}
            onChange={(e) => setBalance(Number(e.target.value))}
            required
          />
        </div>
        
        <button 
          type="submit"
          className={styles['update-balance-button']}
          disabled={!selectedPlayerId}
        >
          Update Balance
        </button>
      </form>
    </div>
  );
};

export default PlayerBalanceForm; 