import React from 'react';
import styles from '../styles/LobbyPage.module.css';
import { Player } from '../types/game';

interface PlayersListProps {
  players: Record<string, Player>;
}

const PlayersList: React.FC<PlayersListProps> = ({ players }) => {
  return (
    <ul className={styles['player-list']}>
      {Object.values(players).map(player => (
        <li key={player.peerId} className={player.isAdmin ? styles.admin : ''}>
          <span className={styles['player-name']}>{player.name}</span>
          <span className={styles['player-balance']}>Balance: {player.balance}</span>
          {player.isAdmin && <span className={styles['admin-badge']}>Admin</span>}
        </li>
      ))}
    </ul>
  );
};

export default PlayersList; 