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
  | { type: 'START_GAME'; payload: { startedAt: number } }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'END_GAME'; payload: { endedAt: number } }
  | { type: 'SYNC_STATE'; payload: GameState }
  | { type: 'ADD_PLAYER'; payload: { playerId: string, playerName?: string } }
  | { type: 'ADD_STASH'; payload: { name: string, balance?: number, isInfinite?: boolean } }
  | { type: 'UPDATE_STASH'; payload: { stashId: string, updates: Partial<Stash> } };
```

#### Action Definitions

1. **`START_GAME`**  
   - Used by the admin to transition from `configuring` to `active`.
   - Payload contains `startedAt`.

2. **`ADD_TRANSACTION`**  
   - Adds a single new transaction to the list (and updates balances accordingly).
   - Payload contains the `Transaction`.

3. **`END_GAME`**  
   - Used by the admin to mark the game as `ended`.
   - Payload contains `endedAt`.

4. **`SYNC_STATE`**  
   - Replaces the current state with the payload `GameState` if the payload's `version` is newer.

5. **`ADD_PLAYER`**
   - Adds a new player to the game.
   - Payload contains `playerId` and optional `playerName`.

6. **`ADD_STASH`**
   - Adds a new stash to the game.
   - Payload contains `name`, optional `balance`, and optional `isInfinite`.

7. **`UPDATE_STASH`**
   - Updates properties of an existing stash.
   - Payload contains `stashId` and `updates` (partial Stash object).

---

## 3. PeerService

`PeerService` is responsible for managing WebRTC connections (via PeerJS), sending/receiving data, and emitting events about the peer-to-peer lifecycle.  

```ts
export class PeerService extends EventEmitter {
  /**
   * Initializes a PeerJS connection and returns the generated peerId.
   * @param isLeader Whether this peer should be the leader of the star network
   * @returns Promise that resolves when the peer is connected to the signal server
   */
  public async initConnection(isLeader: boolean = false): Promise<string>;

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
 * A generic shape for data sent via PeerJS.
 * Could include transaction requests, state sync broadcasts, etc.
 */
export interface PeerServiceMessage {
  /** Type of the message (e.g., "transaction", "state", "chat") */
  type: string;

  /** Arbitrary payload specific to the message type */
  payload: any;
}
```

### 3.2 PeerService Event Types

PeerService emits the following events:

1. **`status`**  
   Emitted when the connection status to the signal server changes. Payload: ConnectionStatus enum value.

2. **`peer:connect`**  
   Emitted when a new peer connection is established. Payload: remotePeerId (string).

3. **`peer:disconnect`**  
   Emitted when a peer disconnects. Payload: remotePeerId (string).

4. **`error`**  
   Emitted when any error occurs in the peer connection or message handling. Payload: { message: string, originalError: Error }.

5. **`message`**  
   Emitted when a message is received from a peer. Payload: { peerId: string, message: Message }.

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
   * @param options Optional partial GameState to initialize with
   * @returns A new GameState
   */
  public static initGame(peerId: string, options?: Partial<GameState>): GameState;

  /**
   * Add a new player to the game state
   * @param state Current game state
   * @param playerId Peer ID of the new player
   * @param playerName Optional name for the player
   * @returns Updated game state with the new player
   */
  public static addPlayer(state: GameState, playerId: string, playerName?: string): GameState;

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
  public static syncState(currentState: GameState | null, incomingState: GameState): GameState;
}
```

### 4.2 Game Actions

```ts
export type GameAction =
  | { type: 'START_GAME'; payload: { startedAt: number } }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'END_GAME'; payload: { endedAt: number } }
  | { type: 'SYNC_STATE'; payload: GameState }
  | { type: 'ADD_PLAYER'; payload: { playerId: string, playerName?: string } }
  | { type: 'ADD_STASH'; payload: { name: string, balance?: number, isInfinite?: boolean } }
  | { type: 'UPDATE_STASH'; payload: { stashId: string, updates: Partial<Stash> } };
```

#### Action Definitions

1. **`START_GAME`**  
   - Used by the admin to transition from `configuring` to `active`.
   - Payload contains `startedAt`.

2. **`ADD_TRANSACTION`**  
   - Adds a single new transaction to the list (and updates balances accordingly).
   - Payload contains the `Transaction`.

3. **`END_GAME`**  
   - Used by the admin to mark the game as `ended`.
   - Payload contains `endedAt`.

4. **`SYNC_STATE`**  
   - Replaces the current state with the payload `GameState` if the payload's `version` is newer.

5. **`ADD_PLAYER`**
   - Adds a new player to the game.
   - Payload contains `playerId` and optional `playerName`.

6. **`ADD_STASH`**
   - Adds a new stash to the game.
   - Payload contains `name`, optional `balance`, and optional `isInfinite`.

7. **`UPDATE_STASH`**
   - Updates properties of an existing stash.
   - Payload contains `stashId` and `updates` (partial Stash object).

### 4.3 GameContext

`GameContext` is a React Context that provides the game state and dispatch function to components, along with handling side effects for P2P communication.

```tsx
interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  peerService: PeerService | undefined;
}

export const GameProvider: React.FC<{
  children: ReactNode;
  initialState?: GameState;
  peerService?: PeerService;
}>;

export const useGameContext: () => GameContextValue;
```

The `GameProvider` component:
1. Initializes a reducer with the provided initial state
2. Subscribes to PeerService events to handle P2P messages
3. Broadcasts state changes if the current user is admin
4. Provides state and dispatch function to all child components

---

## 5. Putting It All Together

- **UI Components** dispatch actions via the `useGameContext` hook.
- `GameContext` handles communication with `PeerService`:
  - For admin: broadcasts state changes to all peers after state updates
  - For non-admin: relays transaction requests to admin
- `GameStateReducer` provides pure functions for all state transformations
- The React component tree re-renders when state changes

This architecture cleanly separates responsibilities:
- **`PeerService`**: Networking (WebRTC)
- **`GameStateReducer`**: Pure state transformations (no side effects)
- **`GameContext`**: State distribution and side effects management
- **React Components**: UI representation of the game state

By following these interfaces and event definitions, your code remains organized, testable, and easier to maintain.