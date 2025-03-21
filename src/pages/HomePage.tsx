import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameContext } from '../contexts/GameContext';
import ConnectionStatus from '../components/common/ConnectionStatus';

// Main component for the HomePage
const HomePage: React.FC = () => {
  const [createGameName, setCreateGameName] = useState('');
  const [joinGameName, setJoinGameName] = useState('');
  const [adminPeerId, setAdminPeerId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { dispatch, peerService } = useGameContext();
  const navigate = useNavigate();

  // Initialize PeerService on component mount
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

  // Create a new game and become the admin
  const handleCreateGame = async () => {
    if (!createGameName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!peerService || !peerService.getPeerId()) {
      setError('Peer connection not established. Please try again.');
      return;
    }

    setIsLoading(true);
    try {
      const peerId = peerService.getPeerId();
      if (!peerId) {
        throw new Error('Failed to get peer ID');
      }
      
      // Dispatch to sync the state
      dispatch({ type: 'INIT_GAME', payload: { peerId, playerName: createGameName } });
      
      // Navigate to the lobby page
      navigate('/lobby');
    } catch (error) {
      console.error('Error creating game:', error);
      setError('Failed to create game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Join an existing game as a player
  const handleJoinGame = async () => {
    if (!joinGameName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!adminPeerId.trim()) {
      setError('Please enter the admin\'s Peer ID');
      return;
    }

    if (!peerService || !peerService.getPeerId()) {
      setError('Peer connection not established. Please try again.');
      return;
    }

    setIsLoading(true);
    try {
      // Connect to the admin
      await peerService.connectToPeer(adminPeerId);
      
      // The admin will add this player to the game state and sync
      // We'll navigate to the joining page where we'll wait for the game state
      navigate('/joining', { state: { playerName: joinGameName } });
    } catch (error) {
      console.error('Error joining game:', error);
      setError('Failed to join game. Please check the admin\'s Peer ID and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="home-page">
      <h1>P2P Money Tracker</h1>
      
      {/* Connection Status */}
      <ConnectionStatus showPeerId={true} />
      
      {/* Error Message */}
      {error && <div className="error-message">{error}</div>}
      
      <div className="form-container">
        {/* Create Game Section */}
        <div className="section">
          <h2>Create a New Game</h2>
          <div className="form-group">
            <label htmlFor="createGameName">Your Name:</label>
            <input
              type="text"
              id="createGameName"
              value={createGameName}
              onChange={(e) => setCreateGameName(e.target.value)}
              placeholder="Enter your name"
              disabled={isLoading}
            />
          </div>
          
          <button 
            className="primary-button"
            onClick={handleCreateGame}
            disabled={isLoading || connectionStatus !== 'connected'}
          >
            {isLoading ? 'Creating...' : 'Create New Game'}
          </button>
        </div>
        
        <div className="divider">OR</div>
        
        {/* Join Game Section */}
        <div className="section">
          <h2>Join an Existing Game</h2>
          <div className="form-group">
            <label htmlFor="joinGameName">Your Name:</label>
            <input
              type="text"
              id="joinGameName"
              value={joinGameName}
              onChange={(e) => setJoinGameName(e.target.value)}
              placeholder="Enter your name"
              disabled={isLoading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="adminPeerId">Admin's Peer ID:</label>
            <input
              type="text"
              id="adminPeerId"
              value={adminPeerId}
              onChange={(e) => setAdminPeerId(e.target.value)}
              placeholder="Enter admin's Peer ID"
              disabled={isLoading}
            />
          </div>
          
          <button 
            className="secondary-button"
            onClick={handleJoinGame}
            disabled={isLoading || connectionStatus !== 'connected'}
          >
            {isLoading ? 'Joining...' : 'Join Existing Game'}
          </button>
        </div>
      </div>
      
      {/* Info text */}
      <p className="info-text">
        Create a new game to become the admin, or join an existing game by entering the admin's Peer ID.
      </p>
    </div>
  );
};

export default HomePage; 