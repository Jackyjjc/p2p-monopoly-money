import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider } from './contexts/GameContext';
import { PeerService } from './services/PeerService';
import HomePage from './pages/HomePage';
import JoiningPage from './pages/JoiningPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import './styles/main.css';

const App: React.FC = () => {
  const [peerService, setPeerService] = useState<PeerService | undefined>(undefined);

  // Initialize PeerService once on app start
  useEffect(() => {
    const newPeerService = new PeerService();
    setPeerService(newPeerService);

    // Cleanup on unmount
    return () => {
      newPeerService.stop();
    };
  }, []);

  return (
    <GameProvider peerService={peerService}>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/joining" element={<JoiningPage />} />
          <Route path="/lobby" element={<LobbyPage />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/game-ended" element={<div>Game Ended Page - To be implemented</div>} />
          {/* Redirect to home for any unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </GameProvider>
  );
};

export default App; 