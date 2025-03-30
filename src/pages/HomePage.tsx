import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameContext } from '../contexts/GameContext';
import ConnectionStatus from '../components/common/ConnectionStatus';
import { usePeerConnection } from '../hooks/usePeerConnection';

// Main component for the HomePage
const HomePage: React.FC = () => {
  const [createGameName, setCreateGameName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { dispatch, peerService } = useGameContext();
  const { connectionStatus, error, setError } = usePeerConnection(peerService);
  const navigate = useNavigate();

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
      </div>
      
      {/* Info text */}
      <p className="info-text">
        Create a new game to become the admin. Share your Peer ID with others to let them join.
      </p>
    </div>
  );
};

export default HomePage; 