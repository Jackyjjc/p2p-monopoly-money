import { useState } from 'react';

// Storage keys constants
export const STORAGE_KEYS = {
  PEER_ID: 'p2p_money_peer_id',
  GAME_STATE: 'p2p_money_game_state',
};

/**
 * Custom hook for working with sessionStorage in a React-friendly way
 * @param key The sessionStorage key to store/retrieve data
 * @param initialValue The initial value if no value exists in sessionStorage
 * @returns [storedValue, setValue] pair for reading and writing
 */
export function useSessionStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // Get from sessionStorage on first render
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });
  
  // Update sessionStorage when state changes
  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  };
  
  return [storedValue, setValue];
} 