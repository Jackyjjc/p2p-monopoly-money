import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameContext } from '../contexts/GameContext';

const JoiningPage: React.FC = () => {
  const { state, peerService } = useGameContext();
  const navigate = useNavigate();
  
  // Check if we're connected and if we've received game state
  useEffect(() => {
    console.log("rendering JoiningPage");
    console.log("state", state);
    // If the game state has been set (we have an ID) and we're in the player list
    if (state.id && peerService && state.players[peerService.getPeerId() || '']) {
      // We've successfully joined the game, redirect to the appropriate page
      console.log("state.status", state.status);
      if (state.status === 'configuring') {
        navigate('/lobby');
      } else if (state.status === 'active') {
        navigate('/game');
      } else if (state.status === 'ended') {
        navigate('/game-ended');
      }
    }
  }, [state, peerService, navigate]);
  
  return (
    <div className="joining-page">
      <h1>Joining Game...</h1>
      <div className="loading-spinner"></div>
      <p>Connecting to game session...</p>
      
      <button 
        className="secondary-button"
        onClick={() => navigate('/')}
      >
        Cancel
      </button>
    </div>
  );
};

export default JoiningPage; 