import React from 'react';
import styles from '../styles/PlayersList.module.css';
import { Player } from '../types/game';

interface PlayersListProps {
  players: Record<string, Player>;
  currentPeerId: string;
}

const PlayersList: React.FC<PlayersListProps> = ({ players, currentPeerId }) => {
  return (
    <ul className={styles['player-list']}>
      {Object.values(players).map(player => (
        <li key={player.peerId} className={`${player.isAdmin ? styles.admin : ''} ${!player.isConnected ? styles.disconnected : ''}`}>
          <span className={`${styles['status-dot']} ${player.isConnected ? styles['status-connected'] : styles['status-disconnected']}`} />
          <span className={styles['player-name']}>{player.name}</span>
          <span className={styles['player-balance']}>Balance: {player.balance}</span>
          {player.isAdmin && <span className={styles['admin-badge']}>Admin</span>}
          {player.peerId === currentPeerId && <span className={styles['you-badge']}>You</span>}
        </li>
      ))}
    </ul>
  );
};

export default PlayersList; 