import { useState, useEffect } from 'react';
import { PeerService } from '../services/PeerService';

/**
 * Custom hook to handle peer connection initialization
 * @param peerService The PeerService instance to initialize
 * @returns Object containing connection status and error information
 */
export const usePeerConnection = (peerService: PeerService | undefined) => {
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializePeer = async () => {
      if (!peerService) return;
      
      try {
        setConnectionStatus('connecting');
        await peerService.initConnection();
        setConnectionStatus('connected');
      } catch (error) {
        console.error('Failed to initialize peer:', error);
        setConnectionStatus('error');
        setError('Failed to connect to the signaling server. Please try again.');
      }
    };

    initializePeer();
  }, [peerService]);

  return { connectionStatus, error, setError };
}; 