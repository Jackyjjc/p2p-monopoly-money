# P2P Money Tracker – Comprehensive Architecture

This document outlines the architecture for the **P2P Money Tracker** application, detailing how peer-to-peer (P2P) game state synchronization is implemented without reliance on a dedicated server for data flow (other than signaling).

---

## 1. Project Overview

**P2P Money Tracker** is a browser-based application that enables real-time money tracking among players in a game. The system uses **WebRTC** for direct peer-to-peer communication after an initial signaling handshake.

### Key Features

- **Peer-to-peer communication**: Browser-based via WebRTC (PeerJS).
- **Decentralized architecture**: No central server beyond the initial signaling.
- **Star Topology**: One player (the "Admin" or "Leader") relays all transactions to other peers.
- **Real-time transaction processing**: Transactions are sent, validated, and broadcast immediately.
- **Local data persistence**: Game state is persisted in each client's local storage for continuity.
- **Transaction validation**: Ensures data integrity and consistent game balances.
- **URL-safe peer IDs**: Peer IDs are automatically encoded using base64 for safe URL sharing.

---

## 2. High-Level Architecture

P2P Money Tracker uses a **React** application (TypeScript-based) structured into clear layers:

1. **UI Layer**: React components that display pages and modals to the user.  
2. **State Management**: A global React Context with a `useReducer` for game state, plus local storage for offline persistence.  
3. **Peer Communication**: A `PeerService` built on PeerJS to manage WebRTC connections.  
4. **Business Logic**: A pure functional `GameStateReducer` that handles all game state transformations.

### Directory Structure (Implemented)

```
/src
  /components        # Feature-based UI components
    /common          # Reusable UI components
    /player          # Player-related components
    /stash           # Stash-related components
    /transaction     # Transaction-related components
  /contexts          # React context providers for global state
    GameContext.tsx  # Main game state context with useReducer
    GameStateReducer.ts # Pure functions for state transformations
  /hooks             # Custom React hooks
    usePeerConnection.ts  # Hook for peer connection initialization
  /pages             # Page-level components
    HomePage.tsx     # Entry point for users to create/join games
    LobbyPage.tsx    # Game configuration before starting
    GamePage.tsx     # Active game interface with transactions
    JoiningPage.tsx  # Connecting to an existing game
  /services          # Core services
    PeerService.ts   # WebRTC abstraction layer
  /styles            # Global and component styles
  /types             # TypeScript type definitions
    models.ts        # Core data model interfaces
    peerMessages.ts  # Message types for peer communication
  /utils             # General utility functions
```

---

## 3. Data Models

The application uses several key data models:

### 3.1 Player
```ts
export interface Player {
  peerId: string;     // Unique identifier from PeerJS
  name: string;       // Display name
  balance: number;    // Current money balance
  isAdmin: boolean;   // Whether this player is the admin
}
```

### 3.2 Stash
```ts
export interface Stash {
  id: string;         // Unique ID for the stash
  name: string;       // Display name
  balance: number;    // Current money balance
  isInfinite: boolean; // Whether stash has unlimited funds
}
```

### 3.3 Transaction
```ts
export interface Transaction {
  id: string;         // Unique ID
  timestamp: number;  // Unix timestamp in milliseconds
  senderId: string;   // ID of sending player or stash
  receiverId: string; // ID of receiving player or stash
  amount: number;     // Amount transferred
  isDeleted: boolean; // Soft-delete flag
}
```

### 3.4 GameState
```ts
export interface GameState {
  id: string;                     // Unique game ID
  displayName: string;            // Game name for display
  status: 'configuring' | 'active' | 'ended'; // Current game phase
  players: Record<string, Player>; // Map of players by peerId
  stashes: Record<string, Stash>; // Map of stashes by ID
  transactions: Transaction[];    // List of all transactions
  createdAt: number;              // Creation timestamp
  startedAt?: number;             // Game start timestamp
  endedAt?: number;               // Game end timestamp
  version: number;                // Version for sync
}
```

---

## 4. Services

### 4.1 `PeerService`
**Implementation**: `src/services/PeerService.ts`

This service abstracts WebRTC connections via PeerJS with these features:

- **Event-based architecture**: Uses Node's EventEmitter for communication
- **Connection management**: Tracks connected peers and handles reconnection
- **Message handling**: Validates and processes incoming messages
- **Broadcasting**: Sends messages to all connected peers
- **Error handling**: Emits errors with detailed information

Key methods:
```ts
initConnection(): Promise<string>       // Initialize and get peer ID
connectToPeer(remotePeerId: string)     // Connect to another peer
broadcast(message: PeerServiceMessage)  // Send to all peers
sendToPeer(peerId, message)             // Send to specific peer
getPeers(): string[]                    // Get all connected peer IDs
```

### 4.2 `usePeerConnection` Hook
**Implementation**: `src/hooks/usePeerConnection.ts`

This custom React hook encapsulates the peer connection initialization logic:

- **Abstraction**: Provides a simple interface for components to initialize peer connections
- **State management**: Tracks connection status and error messages
- **Reusability**: Used across multiple components that need peer connectivity
- **Error handling**: Properly captures and surfaces connection errors

Key features:
```ts
const { connectionStatus, error, setError } = usePeerConnection(peerService);
```

### 4.3 `GameContext` and `GameStateReducer`
**Implementation**: 
- `src/contexts/GameContext.tsx`  
- `src/contexts/GameStateReducer.ts`

#### `GameStateReducer`
The reducer implements pure functional state transformations:

- **Initialization**: Creates a new game with the admin player
- **Player management**: Adds/updates/removes players
- **Stash management**: Creates and modifies money stashes 
- **Transaction processing**: Validates and applies monetary transactions
- **Game lifecycle**: Handles transitions between game phases
- **State synchronization**: Merges state updates with versioning

The state transformations use immutable patterns, always returning a new state object rather than modifying the existing one.

#### `GameContext`
The context provides:

- **State access**: Makes game state available throughout the app
- **Action dispatching**: Provides a dispatch function to update state
- **Peer integration**: Subscribes to PeerService events and handles:
  - Incoming state updates from admin
  - Transaction requests from non-admin players
  - Player connection/disconnection events
  - Message error handling

The context also handles broadcasting state changes from the admin to all connected peers after state updates.

---

## 5. Application Flow

### 5.1 Home Page (`HomePage.tsx`)
1. **PeerService Initialization**: 
   - Uses the `usePeerConnection` hook to initialize PeerJS
   - Automatically manages connection status and errors
2. **User Details**: User enters their display name
3. **Create Game**:
   - Initializes GameState as admin
   - Generates a shareable game URL containing the admin's peer ID (base64 encoded)
   - Provides options to copy URL or display QR code for mobile sharing
   - Navigates to the lobby page

### 5.2 Joining Page (`JoiningPage.tsx`)
1. **URL Processing**: 
   - Extracts admin's peer ID from the game URL
   - Decodes the base64-encoded peer ID
2. **PeerService Initialization**: 
   - Uses the `usePeerConnection` hook to establish WebRTC connection
   - Automatically manages connection status and errors
3. **User Details**: User enters their display name
4. **Connection Flow**:
   - Connects to admin's peer
   - Updates player name in game state
   - Automatically navigates to appropriate page based on game status

### 5.3 Lobby (`LobbyPage.tsx`)
1. **Admin capabilities**:
   - Add/edit stashes with names, balances, and infinite flag
   - See connected players and their information
   - Start the game when ready
2. **Player view** (non-admin):
   - View-only access to game configuration
   - See other connected players
   - Wait for admin to start the game

### 5.4 Active Game (`GamePage.tsx`)
1. **Balance Overview**: Shows current balances for all players and stashes
2. **Transaction creation**:
   - Player selects sender (self or stash)
   - Player selects receiver (another player or stash)
   - Player enters amount
   - Transaction request is sent to admin
3. **Transaction validation** (admin):
   - Verifies sender has sufficient balance
   - Applies transaction to game state
   - Broadcasts updated state to all players
4. **Transaction history**: Shows a chronological list of all transactions

### 5.5 Ending the Game
1. **Admin ends the game**: Changes status to "ended"
2. **Final state**: All players can see final balances and transaction history
3. **Game over**: No new transactions can be processed

---

## 6. State Management

### 6.1 Implementation Details
- **Reducer Pattern**: Uses React's `useReducer` with TypeScript for type safety
- **Action Types**: Clearly defined action types for all state changes
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

### 6.2 Local Storage Persistence
The game state is persisted in local storage to handle:
- Page refreshes
- Temporary disconnections
- Browser restarts

### 6.3 Synchronization Flow
1. **Admin updates**: Admin dispatches actions locally, modifying the state
2. **Broadcast**: Changes are broadcast to all connected peers
3. **Client updates**: Non-admin peers receive state updates and sync their local state

---

## 7. Peer-to-Peer Communication

### 7.1 Message Types
```ts
enum PeerMessageType {
  STATE_SYNC = 'STATE_SYNC',           // Full state updates
  TRANSACTION_REQUEST = 'TRANSACTION_REQUEST', // New transaction
  PLAYER_NAME = 'PLAYER_NAME',         // Player name updates
  GAME_START = 'GAME_START',           // Game start notification
  GAME_END = 'GAME_END',               // Game end notification
  ERROR = 'ERROR'                      // Error messages
}
```

### 7.2 Star Topology
- **Admin hub**: All communication flows through the admin player
- **Direct connections**: Non-admin players connect only to the admin
- **Benefits**: Simplified synchronization and conflict resolution
- **Tradeoffs**: Single point of failure if admin disconnects

### 7.3 Error Handling
- **Transaction validation**: Checks for invalid transactions (insufficient funds)
- **Connection management**: Detects and handles peer disconnections
- **Message validation**: Ensures message format correctness

---

## 8. Pages & Components

### 8.1 Pages
1. **HomePage**: Entry point for creating/joining games
2. **JoiningPage**: Connection handling when joining existing games
3. **LobbyPage**: Game configuration before starting, including URL sharing via copy link and QR code
4. **GamePage**: Active gameplay with transaction management

### 8.2 Key Components
- **Balance displays**: Show current balances of players and stashes
- **Transaction form**: Interface for creating new transactions
- **Transaction history**: Chronological list of all transactions
- **Peer status indicator**: Shows connection status for all players
- **URL sharing**: Copy link and QR code generation for easy game sharing

---

## 9. Implemented vs. Planned Features

### 9.1 Implemented
- **Core P2P communication** via WebRTC/PeerJS
- **Game state management** with reducer pattern
- **Player and stash management**
- **Transaction creation and validation**
- **Complete game lifecycle** (setup, active, ended)

### 9.2 Planned/In Progress
- **Optimistic UI updates** for transactions
- **Enhanced error recovery** for disconnections
- **Data export** functionality
- **Transaction filtering and search**
- **Game statistics and visualizations**

---

## 10. Conclusion

The implemented architecture follows the original design principles with a clear separation of concerns:
- **PeerService**: Handles all WebRTC communication
- **GameStateReducer**: Maintains pure business logic
- **GameContext**: Connects the UI with state and peer communication
- **React components**: Provide the user interface

This architecture supports scalable development while maintaining the core P2P functionality for money tracking in games.

