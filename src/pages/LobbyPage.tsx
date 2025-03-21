import React from 'react';
import { useGameContext } from '../contexts/GameContext';
import ConnectionStatus from '../components/common/ConnectionStatus';
import PlayersList from '../components/PlayersList';
import StashList from '../components/StashList';
import StashForm from '../components/StashForm';
import styles from '../styles/LobbyPage.module.css';

const LobbyPage: React.FC = () => {
  const { state, dispatch, peerService } = useGameContext();

  // Check if the current user is admin
  const currentPeerId = peerService?.getPeerId() || '';
  const isAdmin = state.players[currentPeerId]?.isAdmin || false;

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
            disabled={Object.keys(state.stashes).length === 0}
          >
            Start Game
          </button>
          {Object.keys(state.stashes).length === 0 && (
            <p className={styles['start-game-hint']}>You need at least one stash to start the game.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default LobbyPage; 