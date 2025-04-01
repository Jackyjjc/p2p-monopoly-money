# Implementation Plan for Reusing Peer ID Across Page Reloads

## Problem Statement
Currently when a user refreshes the GamePage, they get assigned a new Peer ID, making them appear as a different player. We need to persist the Peer ID in local storage and reuse it when reconnecting after a page reload. Additionally, we need to handle reconnection for both Lobby and Game pages, ensure admins can reconnect to all peers, and maintain game state across page reloads.

## Implementation Steps

### 1. Modify PeerService to Properly Initialize Peer with Existing ID

**File: src/services/PeerService.ts**

- Update the `initConnection` method to handle different constructor calls based on whether an ID exists:

```typescript
public async initConnection(existingPeerId?: string): Promise<string> {  
  // Common configuration for all peer connections
  const peerConfig = {
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    }
  };

  // Create a new Peer instance with proper constructor based on whether ID exists
  if (existingPeerId) {
    // Use existing ID constructor
    this.peer = new Peer(existingPeerId, peerConfig);
  } else {
    // Generate new ID constructor
    this.peer = new Peer(peerConfig);
  }
}
```

### 2. Create a Custom Hook for Local Storage

**File: src/hooks/useLocalStorage.ts** (create if it doesn't exist)

```typescript
import { useState, useEffect } from 'react';

// Storage keys constants
export const STORAGE_KEYS = {
  PEER_ID: 'p2p_money_peer_id',
  GAME_STATE: 'p2p_money_game_state',
};

/**
 * Custom hook for working with localStorage in a React-friendly way
 * @param key The localStorage key to store/retrieve data
 * @param initialValue The initial value if no value exists in localStorage
 * @returns [storedValue, setValue] pair for reading and writing
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // Get from localStorage on first render
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });
  
  // Update localStorage when state changes
  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  };
  
  return [storedValue, setValue];
}
```

### 3. Update usePeerConnection Hook with Enhanced Reconnection Support

**File: src/hooks/usePeerConnection.ts**

```typescript
import { useState, useEffect } from 'react';
import { PeerService } from '../services/PeerService';
import { useLocalStorage, STORAGE_KEYS } from './useLocalStorage';

export const usePeerConnection = (peerService: PeerService | undefined) => {
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [peerId, setPeerId] = useLocalStorage<string | null>(STORAGE_KEYS.PEER_ID, null);
  
  useEffect(() => {
    const initializePeer = async () => {
      if (!peerService) return;
      
      try {
        setConnectionStatus('connecting');
        
        // Initialize with existing peer ID if available
        const newPeerId = await peerService.initConnection(peerId);
        
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
  }, [peerService, peerId, setPeerId]);

  return { connectionStatus, error, setError, peerId };
};
```

### 4. Create a Shared Reconnection Utility

**File: src/utils/reconnection.ts** (create if it doesn't exist)

```typescript
import { PeerService } from '../services/PeerService';
import { PeerMessageType } from '../types/PeerMessages';

interface ReconnectionParams {
  peerService: PeerService;
  peerId: string;
  isAdmin: boolean;
  gameState: any;
  setError: (error: string) => void;
}

// Shared reconnection logic that can be used by both Lobby and Game pages
export const handleReconnection = async ({
  peerService,
  peerId,
  isAdmin,
  gameState,
  setError
}: ReconnectionParams): Promise<void> => {
  if (!peerService || !peerId) return;
  
  const isExistingPlayer = Boolean(gameState.players[peerId]);
  
  if (isExistingPlayer) {
    // Admin reconnection - need to connect to all peers
    if (isAdmin) {
      const peerIds = Object.keys(gameState.players).filter(id => id !== peerId);
      
      // Connect to all peers in parallel
      const reconnectionPromises = peerIds.map(async (otherPeerId) => {
        try {
          await peerService.connectToPeer(otherPeerId);
          
          // Notify the peer that admin has reconnected
          peerService.sendToPeer(otherPeerId, {
            type: PeerMessageType.ADMIN_RECONNECTED,
            payload: { gameState }
          });
          
          return { success: true, peerId: otherPeerId };
        } catch (error) {
          console.warn(`Failed to reconnect to peer ${otherPeerId}:`, error);
          return { success: false, peerId: otherPeerId };
        }
      });
      
      // Wait for all reconnection attempts
      const results = await Promise.all(reconnectionPromises);
      const failedConnections = results.filter(r => !r.success);
      
      if (failedConnections.length > 0) {
        console.warn('Some peers could not be reconnected:', failedConnections);
      }
    } else {
      // Player reconnection - connect to admin
      const adminPeerId = Object.keys(gameState.players).find(id => gameState.players[id].isAdmin);
      
      if (adminPeerId) {
        try {
          await peerService.connectToPeer(adminPeerId);
          
          // Request latest game state from admin
          peerService.sendToPeer(adminPeerId, {
            type: PeerMessageType.GAME_STATE_REQUEST,
            payload: { peerId }
          });
        } catch (error) {
          console.error('Failed to reconnect to admin peer:', error);
          setError('Failed to reconnect to game. Please try again.');
        }
      }
    }
  }
};
```

### 5. Persist Game State for Reconnection

**File: src/contexts/GameContext.tsx** (or wherever game state is managed)

```typescript
import { useLocalStorage, STORAGE_KEYS } from '../hooks/useLocalStorage';

// In your GameContext component
function GameContextProvider({ children }) {
  // Use the custom hook for game state persistence
  const [state, dispatch] = useReducer(gameStateReducer, initialState);
  const [savedGameState, setSavedGameState] = useLocalStorage(STORAGE_KEYS.GAME_STATE, null);
  
  // Sync game state to localStorage when it changes
  useEffect(() => {
    if (state.status !== 'idle') {
      setSavedGameState({
        players: state.players,
        stashes: state.stashes,
        transactions: state.transactions,
        status: state.status,
        gameId: state.gameId,
        // any other relevant state
      });
    }
  }, [state, setSavedGameState]);
  
  // Restore game state on initial load
  useEffect(() => {
    // On initial load, try to restore game state from localStorage
    if (savedGameState && savedGameState.status !== 'idle') {
      // Check if the player ID matches a player in the saved game
      if (currentPeerId && savedGameState.players[currentPeerId]) {
        // Restore the game state
        dispatch({
          type: 'RESTORE_GAME_STATE',
          payload: savedGameState
        });
        
        // Trigger reconnection
        handleReconnection({
          peerService,
          peerId: currentPeerId,
          isAdmin: savedGameState.players[currentPeerId]?.isAdmin || false,
          gameState: savedGameState,
          setError
        });
      }
    }
  }, [currentPeerId, peerService, savedGameState]);

  // ...rest of the context provider
}
```

### 6. Update GamePage to Use Shared Reconnection Logic

**File: src/pages/GamePage.tsx**

```typescript
import { handleReconnection } from '../utils/reconnection';
import { useLocalStorage, STORAGE_KEYS } from '../hooks/useLocalStorage';

// In your GamePage component
function GamePage() {
  // Use custom hook to access saved game state
  const [savedGameState] = useLocalStorage(STORAGE_KEYS.GAME_STATE, null);
  
  useEffect(() => {
    // Only run reconnection if we have a valid peer ID and connection
    if (peerService && currentPeerId && connectionStatus === 'connected') {
      if (savedGameState && savedGameState.status === 'active') {
        handleReconnection({
          peerService,
          peerId: currentPeerId,
          isAdmin: savedGameState.players[currentPeerId]?.isAdmin || false,
          gameState: savedGameState,
          setError: setTransactionError
        });
      }
    }
  }, [peerService, currentPeerId, connectionStatus, savedGameState]);
  
  // ...rest of the component
}
```

### 7. Update LobbyPage to Use Shared Reconnection Logic

**File: src/pages/LobbyPage.tsx**

```typescript
import { handleReconnection } from '../utils/reconnection';
import { useLocalStorage, STORAGE_KEYS } from '../hooks/useLocalStorage';

// In your LobbyPage component
function LobbyPage() {
  // Use custom hook to access saved game state
  const [savedGameState] = useLocalStorage(STORAGE_KEYS.GAME_STATE, null);
  
  useEffect(() => {
    // Only run reconnection if we have a valid peer ID and connection
    if (peerService && currentPeerId && connectionStatus === 'connected') {
      if (savedGameState && savedGameState.status === 'lobby') {
        handleReconnection({
          peerService,
          peerId: currentPeerId,
          isAdmin: savedGameState.players[currentPeerId]?.isAdmin || false,
          gameState: savedGameState,
          setError: setLobbyError
        });
      }
    }
  }, [peerService, currentPeerId, connectionStatus, savedGameState]);
  
  // ...rest of the component
}
```

### 8. Add Game State Request Handler for Admins

In the GameContext or appropriate component, make sure the admin handles game state requests from reconnecting peers:

```typescript
// In admin's peer message handler
if (message.type === PeerMessageType.GAME_STATE_REQUEST) {
  const requestingPeerId = message.payload.peerId;
  
  // Send the current game state to the reconnected peer
  peerService.sendToPeer(requestingPeerId, {
    type: PeerMessageType.GAME_STATE_UPDATE,
    payload: {
      players: state.players,
      stashes: state.stashes,
      transactions: state.transactions,
      status: state.status,
      // Include any other state needed
    }
  });
}

// Add handler for admin reconnection
if (message.type === PeerMessageType.ADMIN_RECONNECTED) {
  // Update local state with the admin's latest state
  dispatch({
    type: 'RESTORE_GAME_STATE',
    payload: message.payload.gameState
  });
}
```

### 9. Update Game State Reducer to Handle Restoration

**File: src/reducers/gameStateReducer.ts** (or wherever your reducer is defined)

```typescript
// Add a new action type for restoring state
const gameStateReducer = (state, action) => {
  switch (action.type) {
    // ... existing cases
    
    case 'RESTORE_GAME_STATE':
      return {
        ...state,
        players: action.payload.players,
        stashes: action.payload.stashes,
        transactions: action.payload.transactions,
        status: action.payload.status,
        // Restore any other relevant state
      };
      
    // ... other cases
  }
};
```

## Testing Plan

1. Test basic peer ID persistence:
   - Open game, note peer ID
   - Refresh page
   - Verify peer ID remains the same

2. Test reconnection to active game:
   - Start a game with 2+ players
   - Have one player refresh the page
   - Verify they rejoin as the same player with correct balance
   - Verify they can continue making transactions

3. Test lobby reconnection:
   - Create a lobby with multiple players
   - Have players refresh their pages
   - Verify all players remain in the lobby with the same roles

4. Test admin reconnection:
   - Start a game with an admin and multiple players
   - Have the admin refresh their page
   - Verify the admin reconnects to all players and the game continues
   - Verify all players can see the admin and continue to interact

5. Test game state persistence:
   - Start a game and perform several transactions
   - Refresh the page
   - Verify the game state is restored correctly with proper balances

6. Test edge cases:
   - Try reconnecting after the game has ended
   - Try reconnecting with an invalid/outdated peer ID
   - Test behavior when localStorage is cleared
   - Test simultaneous reconnections of multiple players

## Rollout Plan

1. Implement changes in a feature branch
2. Test thoroughly in development environment
3. Deploy to staging/testing environment if available
4. Merge to main branch and deploy to production

## Notes

1. This implementation focuses on a seamless reconnection experience for both admins and players.
2. Game state is persisted locally to handle reconnections even if peers are temporarily unavailable.
3. The shared reconnection logic reduces code duplication between Lobby and Game pages.
4. We handle the different Peer constructor invocations properly based on whether an ID exists.
5. Using a custom hook for localStorage makes the code more React-idiomatic and provides reactive state management.
