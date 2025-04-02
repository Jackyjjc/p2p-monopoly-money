import React from 'react';
import ConnectionStatus from './ConnectionStatus';
import styles from '../styles/StateLoading.module.css';

interface StateLoadingProps {
  connectionStatus: string;
  error?: string | null;
}

const StateLoading: React.FC<StateLoadingProps> = ({ 
  connectionStatus, 
  error 
}) => {
  const getLoadingMessage = () => {
    if (connectionStatus !== 'connected') {
      return `Connecting to signal server (${connectionStatus})...`;
    }
    return 'Loading game state...';
  };

  return (
    <div className={styles['loading-container']}>
      <div className={styles['loading-spinner']} />
      <h2 className={styles['loading-message']}>{getLoadingMessage()}</h2>
      {error && <p className={styles['error-message']}>{error}</p>}
      <ConnectionStatus />
    </div>
  );
};

export default StateLoading; 