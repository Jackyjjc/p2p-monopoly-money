import React from 'react';
import styles from '../styles/LobbyPage.module.css';
import { Stash } from '../types/game';

interface StashListProps {
  stashes: Record<string, Stash>;
}

const StashList: React.FC<StashListProps> = ({ stashes }) => {
  const hasStashes = Object.keys(stashes).length > 0;

  return (
    <>
      {hasStashes ? (
        <ul className={styles['stash-list']}>
          {Object.values(stashes).map(stash => (
            <li key={stash.id}>
              <span className={styles['stash-name']}>{stash.name}</span>
              <span className={styles['stash-balance']}>
                Balance: {stash.isInfinite ? '∞' : stash.balance}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>No stashes created yet.</p>
      )}
    </>
  );
};

export default StashList; 