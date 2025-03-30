import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGameContext } from '../contexts/GameContext';
import ConnectionStatus from '../components/common/ConnectionStatus';

const JoiningPage: React.FC = () => {
  const { state, dispatch, peerService } = useGameContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const encodedAdminPeerId = searchParams.get('adminPeerId');
  const adminPeerId = encodedAdminPeerId ? atob(encodedAdminPeerId) : null;
  const [playerName, setPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [hasAttemptedJoin, setHasAttemptedJoin] = useState(false);
  
  // Initialize peer service when component mounts
  useEffect(() => {
    const initializePeerService = async () => {
      if (!adminPeerId) {
        setError('Invalid game link. Please check the URL and try again.');
        return;
      }

      if (!peerService) {
        setConnectionStatus('connecting');
        return;
      }

      try {
        setConnectionStatus('connecting');
        await peerService.initConnection();
        setConnectionStatus('connected');
      } catch (error) {
        console.error('Failed to initialize connection:', error);
        setConnectionStatus('error');
        setError('Failed to initialize connection. Please try again.');
      }
    };

    initializePeerService();
  }, [adminPeerId, peerService]);

  // Handle game state updates and navigation
  useEffect(() => {
    if (state.id && peerService && playerName.trim() && hasAttemptedJoin) {
      const peerId = peerService.getPeerId();
      if (peerId && state.players[peerId]?.name !== playerName) {
        dispatch({ 
          type: 'UPDATE_PLAYER_NAME', 
          payload: { 
            playerId: peerId, 
            playerName: playerName 
          } 
        });
      }

      // Navigate based on game status
      if (state.status === 'configuring') {
        navigate('/lobby');
      } else if (state.status === 'active') {
        navigate('/game');
      } else if (state.status === 'ended') {
        navigate('/game-ended');
      }
    }
  }, [state, peerService, hasAttemptedJoin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (connectionStatus !== 'connected') {
      setError('Waiting for signal server connection...');
      return;
    }

    try {
      setIsLoading(true);
      await peerService?.connectToPeer(adminPeerId!);
      setHasAttemptedJoin(true);
    } catch (error) {
      console.error('Failed to connect to game:', error);
      setError('Failed to connect to the game. Please check the link and try again.');
      setIsLoading(false);
    }
  };
  
  return (
    <div className="joining-page">
      <h1>Join Game</h1>
      
      {/* Connection Status */}
      <ConnectionStatus showPeerId={true} />
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="form-container">
        <div className="form-group">
          <label htmlFor="playerName">Your Name:</label>
          <input
            type="text"
            id="playerName"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            disabled={isLoading || hasAttemptedJoin}
          />
        </div>
        
        <div className="loading-spinner" style={{ display: isLoading ? 'block' : 'none' }}></div>
        
        <button 
          type="submit"
          className="primary-button"
          disabled={isLoading || connectionStatus !== 'connected' || !playerName.trim()}
        >
          {isLoading ? 'Joining...' : 'Join Game'}
        </button>
      </form>
    </div>
  );
};

export default JoiningPage; 