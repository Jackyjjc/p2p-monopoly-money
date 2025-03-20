# P2P Money Tracker – Interfaces & Events

This document provides a reference for the core TypeScript interfaces, as well as the key events used by the major services (`PeerService` and `GameService`) in the **P2P Money Tracker** application.  

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
  | { type: 'SYNC_STATE'; payload: GameState };
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

---

## 3. PeerService

`PeerService` is responsible for managing WebRTC connections (via PeerJS), sending/receiving data, and emitting events about the peer-to-peer lifecycle.  

```ts
export interface PeerService {
  /**
   * Initializes a PeerJS connection and returns the generated peerId.
   */
  initConnection: () => Promise<string>;

  /**
   * Connects to a peer (usually the admin) given their peerId.
   */
  connectToPeer: (targetPeerId: string) => void;

  /**
   * Sends a data message to a specific connected peer.
   */
  sendToPeer: (peerId: string, data: PeerMessage) => void;

  /**
   * Broadcasts a data message to all currently connected peers (admin-only usage).
   */
  broadcast: (data: PeerMessage) => void;

  /**
   * Terminates all peer connections and cleans up resources.
   */
  destroy: () => void;

  /**
   * Registers an event listener for PeerService events.
   */
  on: (eventType: PeerEventType, callback: (data: any) => void) => void;
}
```

### 3.1 Peer Messages

```ts
/**
 * A generic shape for data sent via PeerJS.
 * Could include transaction requests, state sync broadcasts, etc.
 */
export interface PeerMessage {
  /** Type of the message (e.g., "transaction", "state", "chat") */
  type: string;

  /** Arbitrary payload specific to the message type */
  payload: any;
}
```

### 3.2 PeerService Event Types

```ts
export type PeerEventType =
  | 'connection-open'    // when a connection to a peer is established
  | 'connection-error'   // when a connection fails to establish
  | 'connection-close'   // when a peer disconnects
  | 'data-received';     // when data arrives from a peer
```

#### Event Definitions

1. **`connection-open`**  
   Fired when a new peer connection is successfully established. The callback might receive a simple `peerId` or a more detailed structure.

2. **`connection-error`**  
   Fired when there is an error establishing or maintaining a connection. The callback receives an error object or message.

3. **`connection-close`**  
   Fired when a peer intentionally disconnects or the connection is lost. The callback receives the `peerId` of the disconnected peer.

4. **`data-received`**  
   Fired when any `PeerMessage` is received from a connected peer. The callback receives the parsed `PeerMessage`.

---

## 4. GameService

`GameService` encapsulates the core game logic. It validates requests (e.g., transactions) and updates the `GameState` (for the admin). Non-admin clients mostly relay transaction requests to the admin, then handle the updated state upon broadcast.

```ts
export interface GameService {
  /**
   * Initializes a new GameState or loads an existing one (e.g., from local storage).
   */
  initGame: (options?: Partial<GameState>) => void;

  /**
   * Processes a transaction request from a player.
   * If valid (and we're the admin), it updates the game state.
   */
  processTransaction: (transaction: Transaction) => void;

  /**
   * Starts the game by setting status to 'active' and records the start time.
   */
  startGame: () => void;

  /**
   * Ends the game by setting status to 'ended' and records the end time.
   */
  endGame: () => void;

  /**
   * Merges a new state (broadcast by the admin) into the local state if the version is higher.
   */
  syncState: (incomingState: GameState) => void;
}
```

### 4.1 GameService Events

If `GameService` emits events (for example, to notify the UI or other parts of the system), you might define:

```ts
export type GameServiceEventType =
  | 'state-updated'       // after the admin updates the state
  | 'transaction-failed'  // if a transaction is invalid or rejected
  | 'game-started'
  | 'game-ended';
```

- **`state-updated`**: Emitted when `GameService` has successfully applied changes to the `GameState` (new version).  
- **`transaction-failed`**: Emitted when a transaction request is invalid (e.g., insufficient funds).  
- **`game-started`**: Emitted when the admin transitions from `configuring` to `active`.  
- **`game-ended`**: Emitted when the admin ends the game.

(These events are optional depending on the implementation approach—some teams rely solely on the reducer or the `PeerService` messages instead of separate "service events.")

---

## 5. Putting It All Together

- **UI Layer** calls `GameService` methods (e.g., `processTransaction`).
- `GameService` applies business logic, updates the `GameState`, then:
  - Uses `PeerService` to broadcast changes if this client is the admin.
  - Or if a non-admin client, it just sends the request to the admin.
- The **React reducer** consumes the new or merged `GameState` to update the UI.

This architecture cleanly separates responsibilities:
- **`PeerService`**: Networking (WebRTC)  
- **`GameService`**: Domain logic (validating transactions, game lifecycle)  
- **`GameContext` & Reducer**: Local state representation for React components

By following these interfaces and event definitions, your code remains organized, testable, and easier to maintain.