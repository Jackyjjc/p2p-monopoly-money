import { useState, useEffect } from 'react';
import { PeerService } from '../services/PeerService';
import { useSessionStorage, STORAGE_KEYS } from './useSessionStorage';

/**
 * Custom hook to handle peer connection initialization
 * @param peerService The PeerService instance to initialize
 * @returns Object containing connection status, error information, and peer ID
 */
export const usePeerConnection = (peerService: PeerService | undefined) => {
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [peerId, setPeerId] = useSessionStorage<string | null>(STORAGE_KEYS.PEER_ID, null);
  
  useEffect(() => {
    console.log('usePeerConnection hook is called when peerService changes.');
    const initializePeer = async () => {
      if (!peerService) return;
      
      try {
        setConnectionStatus('connecting');
        
        // Initialize with existing peer ID if available
        const newPeerId = await peerService.initConnection(peerId || undefined);
        
        // Update the peer ID in localStorage if it's changed
        setPeerId(newPeerId);
        
        setConnectionStatus('connected');
      } catch (error) {
        console.error('Failed to initialize peer:', error);
        setConnectionStatus('error');
        setError('Failed to connect to the signaling server. Please try again.');
      }
    };

    initializePeer();
  }, [peerService]);

  return { connectionStatus, error, setError, peerId };
}; 