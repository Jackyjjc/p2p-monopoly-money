import { useState, useEffect } from 'react';
import { PeerService } from '../services/PeerService';
import { useSessionStorage, STORAGE_KEYS } from './useSessionStorage';

/**
 * Custom hook to handle peer connection initialization
 * @param peerService The PeerService instance to initialize
 * @returns Object containing connection status, error information, and peer ID
 */
export const usePeerConnection = (peerService: PeerService | undefined) => {
  const [signalServerConnectionStatus, setSignalServerConnectionStatus] = useState<string>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [peerId, setPeerId] = useSessionStorage<string | null>(STORAGE_KEYS.PEER_ID, null);
  
  useEffect(() => {
    console.log('PeerService is changed, try initializing it.');
    const initializePeer = async () => {
      if (!peerService) return;

      if (peerService.isConnectedToSignalServer()) {
        setSignalServerConnectionStatus('connected');
        setPeerId(peerService.getPeerId());
        return;
      }
      
      try {
        setSignalServerConnectionStatus('connecting');
        
        // Initialize with existing peer ID if available
        const newPeerId = await peerService.initConnection(peerId || undefined);
        
        // Update the peer ID in localStorage if it's changed
        setPeerId(newPeerId);
        
        setSignalServerConnectionStatus('connected');
      } catch (error) {
        console.error('Failed to initialize peer:', error);
        setSignalServerConnectionStatus('error');
        setError('Failed to connect to the signaling server. Please try again.');
      }
    };

    initializePeer();
  }, [peerService]);

  return { connectionStatus: signalServerConnectionStatus, error, setError, peerId };
}; 