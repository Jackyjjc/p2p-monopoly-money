import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGameContext } from '../contexts/GameContext';

const JoiningPage: React.FC = () => {
  const { state, dispatch, peerService } = useGameContext();
  const navigate = useNavigate();
  const location = useLocation();
  const playerName = location.state?.playerName || '';
  
  // Check if we're connected and if we've received game state
  useEffect(() => {
    console.log("rendering JoiningPage");
    console.log("state", state);
    // If the game state has been set (we have an ID) and we're in the player list
    if (state.id && peerService) {
      // Update player name in the game state
      const peerId = peerService.getPeerId();
      if (peerId && playerName && state.players[peerId].name !== playerName) {
        dispatch({ 
          type: 'UPDATE_PLAYER_NAME', 
          payload: { 
            playerId: peerId, 
            playerName: playerName 
          } 
        });
      }

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