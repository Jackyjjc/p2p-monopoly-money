import React from 'react';
import { useGameContext } from '../../contexts/GameContext';
import styles from './ConnectionStatus.module.css';

interface ConnectionStatusProps {
  showPeerId?: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ showPeerId = true }) => {
  const { peerService } = useGameContext();
  
  const peerId = peerService?.getPeerId() || null;
  const isConnected = !!peerId;
  const connectedPeers = peerService?.getPeers() || [];
  
  return (
    <div className={styles.connectionStatus}>
      <div className={styles.statusIndicator}>
        <span className={`${styles.statusDot} ${isConnected ? styles.connected : styles.disconnected}`}></span>
        <span className={styles.statusText}>
          {isConnected ? 'Connected' : 'Disconnected'}
          {isConnected && showPeerId && ` (Your ID: ${peerId})`}
        </span>
      </div>
      
      {connectedPeers.length > 0 && (
        <div className={styles.peersList}>
          <small>{connectedPeers.length} connected peer(s)</small>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus; 