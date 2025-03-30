# P2P Money Tracker – Interfaces & Events

This document provides a reference for the core TypeScript interfaces, as well as the key events used by the major services (`PeerService`) and components (`GameContext`, `GameStateReducer`) in the **P2P Money Tracker** application.  

---

## 1. Data Models

### 1.1 `Player`

```ts
export interface Player {
  /** Unique identifier assigned by PeerJS */
  peerId: string;

  /** Display name of the player */
  name: string;

  /** Current balance of the player */
  balance: number;

  /** Indicates if this player is the admin/leader */
  isAdmin: boolean;
}
```

Note: The `peerId` is automatically encoded using base64 when used in URLs for safe sharing.

### 1.2 `Stash`

```ts
export interface Stash {
  /** Unique ID */
  id: string;

  /** Display name of the stash */
  name: string;

  /** Current stash balance */
  balance: number;

  /** If true, stash never runs out of funds */
  isInfinite: boolean;
}
```

### 1.3 `Transaction`

```ts
export interface Transaction {
  /** Unique ID for the transaction */
  id: string;

  /** Unix timestamp (milliseconds) when the transaction was created */
  timestamp: number;

  /** ID (peerId) of the sending player or stash ID if from stash */
  senderId: string;

  /** ID (peerId) of the receiving player or stash ID if to stash */
  receiverId: string;

  /** Amount of money transferred */
  amount: number;

  /** Indicates if the transaction has been invalidated or "soft-deleted" */
  isDeleted: boolean;
}
```

### 1.4 `GameState`

```ts
export interface GameState {
  /** Unique game ID */
  id: string;

  /** Name/label for display */
  displayName: string;

  /** Current status of the game */
  status: 'configuring' | 'active' | 'ended';

  /** All players in the game, keyed by their peerId */
  players: Record<string, Player>;

  /** All stashes in the game, keyed by stash ID */
  stashes: Record<string, Stash>;

  /** Log of transactions (append-only) */
  transactions: Transaction[];

  /** Creation timestamp (milliseconds) */
  createdAt: number;

  /** Timestamp (milliseconds) when game was started */
  startedAt?: number;

  /** Timestamp (milliseconds) when game ended */
  endedAt?: number;

  /**
   * Version number for synchronization.
   * Incremented each time an admin makes a state update.
   */
  version: number;
}
```

---

## 2. State Management

### 2.1 Reducer Actions

```ts
export type GameAction =
  | { type: 'INIT_GAME'; payload: { peerId: string, playerName: string } }
  | { type: 'START_GAME'; payload: { startedAt: number } }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'END_GAME'; payload: { endedAt: number } }
  | { type: 'SYNC_STATE'; payload: GameState }
  | { type: 'ADD_PLAYER'; payload: { playerId: string, playerName?: string } }
  | { type: 'REMOVE_PLAYER'; payload: { playerId: string } }
  | { type: 'UPDATE_PLAYER_NAME'; payload: { playerId: string, playerName: string } }
  | { type: 'UPDATE_PLAYER_BALANCE'; payload: { playerId: string, balance: number } }
  | { type: 'ADD_STASH'; payload: { name: string, balance?: number, isInfinite?: boolean } }
  | { type: 'UPDATE_STASH'; payload: { stashId: string, updates: Partial<Stash> } };
```

#### Action Definitions

1. **`INIT_GAME`**  
   - Initializes a new game state with the current user as admin.
   - Payload contains `peerId` and `playerName`.

2. **`START_GAME`**  
   - Used by the admin to transition from `configuring` to `active`.
   - Payload contains `startedAt`.

3. **`ADD_TRANSACTION`**  
   - Adds a single new transaction to the list (and updates balances accordingly).
   - Payload contains the `Transaction`.

4. **`END_GAME`**  
   - Used by the admin to mark the game as `ended`.
   - Payload contains `endedAt`.

5. **`SYNC_STATE`**  
   - Replaces the current state with the payload `GameState` if the payload's `version` is newer.

6. **`ADD_PLAYER`**
   - Adds a new player to the game.
   - Payload contains `playerId` and optional `playerName`.

7. **`REMOVE_PLAYER`**
   - Removes a player from the game.
   - Payload contains `playerId`.

8. **`UPDATE_PLAYER_NAME`**
   - Updates a player's display name.
   - Payload contains `playerId` and `playerName`.

9. **`UPDATE_PLAYER_BALANCE`**
   - Updates a player's balance (only in configuring state).
   - Payload contains `playerId` and `balance`.

10. **`ADD_STASH`**
    - Adds a new stash to the game.
    - Payload contains `name`, optional `balance`, and optional `isInfinite`.

11. **`UPDATE_STASH`**
    - Updates properties of an existing stash.
    - Payload contains `stashId` and `updates` (partial Stash object).

---

## 3. PeerService

`PeerService` is responsible for managing WebRTC connections (via PeerJS), sending/receiving data, and emitting events about the peer-to-peer lifecycle.  

```ts
export class PeerService extends EventEmitter {
  /**
   * Initializes a PeerJS connection and returns the generated peerId.
   * @returns Promise that resolves when the peer is connected to the signal server
   */
  public async initConnection(): Promise<string>;

  /**
   * Connects to a peer using their peer ID
   * @param remotePeerId The peer ID to connect to
   * @returns Promise that resolves when connected
   */
  public async connectToPeer(remotePeerId: string): Promise<void>;

  /**
   * Get the current peer's ID
   * @returns The peer ID or null if not initialized
   */
  public getPeerId(): string | null;

  /**
   * Get all connected peers
   * @returns Array of peer IDs
   */
  public getPeers(): string[];

  /**
   * Send a message to all connected peers
   * @param message The message to send
   */
  public async broadcast(message: PeerServiceMessage): Promise<void>;

  /**
   * Send a message to a specific peer
   * @param peerId The peer ID to send to
   * @param message The message to send
   */
  public async sendToPeer(peerId: string, message: PeerServiceMessage): Promise<void>;

  /**
   * Disconnect from a specific peer
   * @param peerId The peer ID to disconnect from
   */
  public async disconnectFromPeer(peerId: string): Promise<void>;

  /**
   * Check if connected to a specific peer
   * @param peerId The peer ID to check
   * @returns True if connected to the peer
   */
  public isConnectedToPeer(peerId: string): boolean;

  /**
   * Stop the PeerJS instance and clean up
   */
  public async stop(): Promise<void>;
}
```

### 3.1 Peer Messages

```ts
/**
 * Types of messages that can be sent via PeerJS
 */
export enum PeerMessageType {
  STATE_SYNC = 'STATE_SYNC',           // Full state updates
  TRANSACTION_REQUEST = 'TRANSACTION_REQUEST', // New transaction
  PLAYER_NAME = 'PLAYER_NAME',         // Player name updates
  GAME_START = 'GAME_START',           // Game start notification
  GAME_END = 'GAME_END',               // Game end notification
  ERROR = 'ERROR'                      // Error messages
}

/**
 * A generic shape for data sent via PeerJS.
 * Could include transaction requests, state sync broadcasts, etc.
 */
export interface PeerServiceMessage {
  /** Type of the message (e.g., "transaction", "state", "chat") */
  type: PeerMessageType;

  /** Arbitrary payload specific to the message type */
  payload: any;
}
```

### 3.2 PeerService Event Types

PeerService emits the following events:

1. **`status`**  
   Emitted when the connection status to the signal server changes.

2. **`peer:connect`**  
   Emitted when a new peer connection is established. Payload: remotePeerId (string).

3. **`peer:disconnect`**  
   Emitted when a peer disconnects. Payload: remotePeerId (string).

4. **`error`**  
   Emitted when any error occurs in the peer connection or message handling. Payload: { message: string, originalError: Error }.

5. **`message`**  
   Emitted when a message is received from a peer. Payload: { peerId: string, message: PeerServiceMessage }.

---

## 4. GameStateReducer & GameContext

The game state management has been implemented using a combination of React Context API for state distribution and a pure functional reducer for state transformations.

### 4.1 GameStateReducer

`GameStateReducer` is a collection of pure functional methods that transform the game state based on actions.

```ts
export class GameStateReducer {
  /**
   * Initializes a new GameState
   * @param peerId Current user's peer ID
   * @param playerName The player's display name
   * @returns A new GameState
   */
  public static initGame(peerId: string, playerName: string): GameState;

  /**
   * Add a new player to the game state
   * @param state Current game state
   * @param playerId Peer ID of the new player
   * @param playerName Optional name for the player
   * @returns Updated game state with the new player
   */
  public static addPlayer(state: GameState, playerId: string, playerName?: string): GameState;

  /**
   * Remove a player from the game
   * @param state Current game state
   * @param playerId Peer ID of the player to remove
   * @returns Updated game state without the player
   */
  public static removePlayer(state: GameState, playerId: string): GameState;

  /**
   * Update player information
   * @param state Current game state
   * @param playerId Peer ID of the player to update
   * @param updates Partial player object with updates
   * @returns Updated game state
   */
  public static updatePlayer(state: GameState, playerId: string, updates: Partial<Player>): GameState;

  /**
   * Add a new stash to the game state
   * @param state Current game state
   * @param name Stash name
   * @param balance Initial balance
   * @param isInfinite Whether the stash has infinite balance
   * @returns Updated game state with the new stash
   */
  public static addStash(state: GameState, name: string, balance?: number, isInfinite?: boolean): GameState;

  /**
   * Update a stash
   * @param state Current game state
   * @param stashId ID of the stash to update
   * @param updates Partial stash object with updates
   * @returns Updated game state
   */
  public static updateStash(state: GameState, stashId: string, updates: Partial<Stash>): GameState;

  /**
   * Process a transaction between players/stashes
   * @param state Current game state
   * @param transaction Transaction to process
   * @returns Updated game state with the transaction applied
   */
  public static processTransaction(state: GameState, transaction: Transaction): GameState;

  /**
   * Start the game
   * @param state Current game state
   * @returns Updated game state with 'active' status
   */
  public static startGame(state: GameState): GameState;

  /**
   * End the game
   * @param state Current game state
   * @returns Updated game state with 'ended' status
   */
  public static endGame(state: GameState): GameState;

  /**
   * Set the game to configuring state
   * @param state Current game state
   * @returns Updated game state with 'configuring' status
   */
  public static setConfiguringState(state: GameState): GameState;

  /**
   * Merge a new state with an existing state, taking the newer version
   * @param currentState Current local game state
   * @param incomingState Incoming game state to merge
   * @returns The updated game state (either current or incoming)
   */
  public static syncState(currentState: GameState, incomingState: GameState): GameState;
}
```

### 4.2 GameContext

`GameContext` is a React Context that provides the game state and dispatch function to components, along with handling side effects for P2P communication.

```tsx
interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  peerService: PeerService | undefined;
}

export const GameProvider: React.FC<{
  children: ReactNode;
  peerService?: PeerService;
}>;

export const useGameContext: () => GameContextValue;
```

The `GameProvider` component:
1. Initializes a reducer with the game state
2. Subscribes to PeerService events to handle P2P messages:
   - STATE_SYNC: Updates local state with received state
   - TRANSACTION_REQUEST: Validates and processes transactions (admin only)
   - PLAYER_NAME: Updates player names
   - GAME_START/GAME_END: Updates game status
3. Handles peer connections and disconnections
4. Broadcasts state changes if the current user is admin
5. Provides state and dispatch function to all child components

---

## 5. Peer-to-Peer Communication Flow

### 5.1 Message Flow

1. **Player Input → UI Interaction**
   - User interacts with the UI to perform an action (e.g., send money)
   - When sharing game URL, peer IDs are automatically base64 encoded

2. **UI Component → GameContext Dispatch**
   - Component calls dispatch with appropriate action
   - When joining a game, the encoded peer ID is automatically decoded

3. **GameContext → Message Logic**
   - For admin: directly processes the action
   - For non-admin: sends a message to admin via PeerService

4. **PeerService → Message Delivery**
   - Delivers the message to appropriate peer(s)

5. **Recipient → Message Processing**
   - Admin: Validates and processes messages, updates state
   - Non-admin: Typically receives STATE_SYNC messages to update local state

### 5.2 Typical Message Flows

#### Transaction Flow
1. Player A initiates transaction
2. If Player A is admin:
   - Transaction is validated and processed locally
   - Updated state is broadcast to all peers
3. If Player A is not admin:
   - TRANSACTION_REQUEST message sent to admin
   - Admin validates and processes the transaction
   - Admin broadcasts updated state to all peers
4. All peers receive STATE_SYNC with updated game state

#### Game State Synchronization
1. Admin makes a change (adds stash, starts game, etc.)
2. Admin's GameContext dispatches appropriate action
3. GameStateReducer processes action and returns new state
4. GameContext detects state change
5. Admin's GameContext broadcasts STATE_SYNC message
6. All peers receive the message and update their state

---

## 6. Implemented UI Components

The application includes these key components:

### 6.1 Pages
- **HomePage**: User entry, create/join game
- **JoiningPage**: Handles joining an existing game
- **LobbyPage**: Game configuration pre-start
- **GamePage**: Active gameplay and transactions

### 6.2 Components
- **Balance displays**: Shows player and stash balances
- **Transaction creation**: Forms for money transfers
- **Transaction history**: Log of all game transactions
- **Peer status indicators**: Connection status display

---

## 7. Summary

This implementation follows a clear architecture with:

1. **Strong typing** through TypeScript interfaces
2. **Event-based communication** via PeerService
3. **Pure functional state management** in GameStateReducer
4. **React Context** for state distribution
5. **P2P synchronization** with versioned state updates

The architecture enables real-time money tracking in a peer-to-peer environment without requiring a dedicated game server for data flow.