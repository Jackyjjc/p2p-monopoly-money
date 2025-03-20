import React, { useState } from 'react';
import styles from '../styles/LobbyPage.module.css';

interface StashFormProps {
  onAddStash: (name: string, balance: number, isInfinite: boolean) => void;
}

const StashForm: React.FC<StashFormProps> = ({ onAddStash }) => {
  const [stashName, setStashName] = useState('');
  const [stashBalance, setStashBalance] = useState<number>(0);
  const [isInfinite, setIsInfinite] = useState(false);

  const handleAddStash = () => {
    if (!stashName.trim()) return;
    
    onAddStash(stashName, stashBalance, isInfinite);

    // Reset form
    setStashName('');
    setStashBalance(0);
    setIsInfinite(false);
  };

  return (
    <div className={styles['add-stash-form']}>
      <h3>Add New Stash</h3>
      <div className={styles['form-group']}>
        <label htmlFor="stash-name">Name:</label>
        <input
          id="stash-name"
          type="text"
          value={stashName}
          onChange={(e) => setStashName(e.target.value)}
          placeholder="Stash name"
        />
      </div>
      
      <div className={styles['form-group']}>
        <label htmlFor="stash-balance">Balance:</label>
        <input
          id="stash-balance"
          type="number"
          min="0"
          value={stashBalance}
          onChange={(e) => setStashBalance(Number(e.target.value))}
          disabled={isInfinite}
        />
      </div>
      
      <div className={styles['form-group']}>
        <label htmlFor="stash-infinite">
          <input
            id="stash-infinite"
            type="checkbox"
            checked={isInfinite}
            onChange={(e) => setIsInfinite(e.target.checked)}
          />
          Infinite Stash
        </label>
      </div>
      
      <button 
        className={styles['add-stash-button']}
        onClick={handleAddStash}
        disabled={!stashName.trim()}
      >
        Add Stash
      </button>
    </div>
  );
};

export default StashForm; 