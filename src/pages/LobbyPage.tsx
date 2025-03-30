import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useGameContext } from '../contexts/GameContext';
import ConnectionStatus from '../components/common/ConnectionStatus';
import PlayersList from '../components/PlayersList';
import StashList from '../components/StashList';
import StashForm from '../components/StashForm';
import PlayerBalanceForm from '../components/PlayerBalanceForm';
import styles from '../styles/LobbyPage.module.css';

const LobbyPage: React.FC = () => {
  const { state, dispatch, peerService } = useGameContext();
  const navigate = useNavigate();
  const [copySuccess, setCopySuccess] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  // Check if the current user is admin
  const currentPeerId = peerService?.getPeerId() || '';
  const isAdmin = state.players[currentPeerId]?.isAdmin || false;

  // Get the game URL
  const gameUrl = `${window.location.origin}/joining?adminPeerId=${btoa(currentPeerId)}`;

  // Handle copying the URL
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(gameUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

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

  // Handle updating a player's balance
  const handleUpdatePlayerBalance = (playerId: string, balance: number) => {
    dispatch({
      type: 'UPDATE_PLAYER_BALANCE',
      payload: {
        playerId,
        balance
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

      {/* Game URL Section */}
      <section className={styles['url-section']}>
        <h2>Game URL</h2>
        <div className={styles['url-container']}>
          <input 
            type="text" 
            value={gameUrl} 
            readOnly 
            className={styles['url-input']}
          />
          <div className={styles['button-group']}>
            <button 
              onClick={handleCopyUrl}
              className={styles['copy-button']}
            >
              {copySuccess ? 'Copied!' : 'Copy URL'}
            </button>
            <button 
              onClick={() => setShowQRCode(!showQRCode)}
              className={styles['qr-button']}
            >
              {showQRCode ? 'Hide QR' : 'Show QR'}
            </button>
          </div>
        </div>
        {showQRCode && (
          <div className={styles['qr-container']}>
            <QRCodeSVG value={gameUrl} size={200} />
          </div>
        )}
      </section>

      <div className={styles['lobby-sections']}>
        {/* Players Section */}
        <section className={styles['player-section']}>
          <h2>Players</h2>
          <PlayersList players={state.players} currentPeerId={currentPeerId} />
          
          {/* Admin-only: Player Balance Form */}
          {isAdmin && (
            <PlayerBalanceForm 
              players={state.players} 
              onUpdateBalance={handleUpdatePlayerBalance} 
              currentPeerId={currentPeerId}
            />
          )}
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