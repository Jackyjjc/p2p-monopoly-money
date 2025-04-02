import React from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboard as faClipboardRegular } from '@fortawesome/free-regular-svg-icons';
import styles from './ConnectionStatus.module.css';

interface ConnectionStatusProps {
  showPeerId?: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ showPeerId = true }) => {
  console.log('rerendering connections status')
  
  const { peerService } = useGameContext();
  
  const peerId = peerService?.getPeerId() || null;
  const isConnected = peerService?.isConnectedToSignalServer();
  const connectedPeers = peerService?.getPeers() || [];
  
  const copyPeerId = () => {
    if (peerId) {
      navigator.clipboard.writeText(peerId)
        .catch(err => console.error('Failed to copy peer ID: ', err));
    }
  };
  
  return (
    <div className={styles.connectionStatus}>
      <div className={styles.statusIndicator}>
        <span className={`${styles.statusDot} ${isConnected ? styles.connected : styles.disconnected}`}></span>
        <span className={styles.statusText}>
          {isConnected ? 'Connected' : 'Disconnected'}
          {isConnected && showPeerId && (
            <span className={styles.peerIdContainer}>
              {` (Your ID: ${peerId})`}
              <button 
                className={styles.copyButton}
                onClick={copyPeerId}
                title="Copy Peer ID"
              >
                <FontAwesomeIcon icon={faClipboardRegular} size="xs" />
              </button>
            </span>
          )}
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