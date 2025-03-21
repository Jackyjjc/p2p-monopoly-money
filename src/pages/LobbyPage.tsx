import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameContext } from '../contexts/GameContext';
import ConnectionStatus from '../components/common/ConnectionStatus';
import PlayersList from '../components/PlayersList';
import StashList from '../components/StashList';
import StashForm from '../components/StashForm';
import styles from '../styles/LobbyPage.module.css';

const LobbyPage: React.FC = () => {
  const { state, dispatch, peerService } = useGameContext();
  const navigate = useNavigate();

  // Check if the current user is admin
  const currentPeerId = peerService?.getPeerId() || '';
  const isAdmin = state.players[currentPeerId]?.isAdmin || false;

  // Navigate to game page when game status changes to 'active'
  useEffect(() => {
    if (state.status === 'active') {
      navigate('/game');
    }
  }, [state.status, navigate]);

  // Handle adding a new stash
  const handleAddStash = (name: string, balance: number, isInfinite: boolean) => {
    dispatch({
      type: 'ADD_STASH',
      payload: {
        name,
        balance,
        isInfinite
      }
    });
  };

  // Handle starting the game
  const handleStartGame = () => {
    dispatch({
      type: 'START_GAME',
      payload: { startedAt: Date.now() }
    });
  };

  return (
    <div className={styles['lobby-page']}>
      <h1>Game Lobby: {state.displayName}</h1>
      <ConnectionStatus />

      <div className={styles['lobby-sections']}>
        {/* Players Section */}
        <section className={styles['player-section']}>
          <h2>Players</h2>
          <PlayersList players={state.players} currentPeerId={currentPeerId} />
        </section>

        {/* Stashes Section */}
        <section className={styles['stash-section']}>
          <h2>Stashes</h2>
          <StashList stashes={state.stashes} />

          {/* Admin-only: Add Stash Form */}
          {isAdmin && <StashForm onAddStash={handleAddStash} />}
        </section>
      </div>

      {/* Admin-only: Start Game Button */}
      {isAdmin && (
        <div className={styles['start-game-container']}>
          <button 
            className={styles['start-game-button']}
            onClick={handleStartGame}
          >
            Start Game
          </button>
        </div>
      )}
    </div>
  );
};

export default LobbyPage; 