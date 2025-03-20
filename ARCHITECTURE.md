# P2P Money Tracker – Comprehensive Architecture

This document outlines the architecture for the **P2P Money Tracker** application, detailing how peer-to-peer (P2P) game state synchronization is implemented without reliance on a dedicated server for data flow (other than signaling).

---

## 1. Project Overview

**P2P Money Tracker** is a browser-based application that enables real-time money tracking among players in a game. The system uses **WebRTC** for direct peer-to-peer communication after an initial signaling handshake.

### Key Features

- **Peer-to-peer communication**: Browser-based via WebRTC (PeerJS).
- **Decentralized architecture**: No central server beyond the initial signaling.
- **Star Topology** (MVP Approach): One player (the "Admin" or "Leader") relays all transactions to other peers.
- **Real-time transaction processing**: Transactions are sent, validated, and broadcast immediately.
- **Local data persistence**: Game state is persisted in each client's local storage for continuity.
- **Transaction validation**: Ensures data integrity and consistent game balances.

---

## 2. High-Level Architecture

P2P Money Tracker uses a **React** application (TypeScript-based) structured into clear layers:

1. **UI Layer**: React components that display pages and modals to the user.  
2. **State Management**: A global React Context with a `useReducer` for game state, plus local storage for offline persistence.  
3. **Peer Communication**: A `PeerService` built on PeerJS to manage WebRTC connections.  
4. **Business Logic**: A pure functional `GameStateReducer` that handles all game state transformations.

### Directory Structure (Illustrative)

```
/src
  /components        # Feature-based UI components
    /common          # Reusable UI components
  /contexts          # React context providers for global state
  /hooks             # Custom React hooks
  /pages             # Page-level components (Home, Lobby, Game)
  /services          # Core services: PeerService, GameService, etc.
  /styles            # Styles, if any
  /types             # TypeScript type definitions
  /utils             # General utility functions
  /assets            # Static assets (images, icons, etc.)
```

---

## 3. Data Models

See INTERFACES_AND_EVENTS.md file for details about the data model.

---

## 4. Services

### 4.1 `PeerService`
**Goal**: Abstract WebRTC connections (via PeerJS).

- **Create and manage** the PeerJS `Peer` instance.
- **Connect to signaling server** to obtain a unique `peerId`.
- **Handle peer connections** in a star topology (non-admin clients connect only to admin).
- **Broadcast messages** (admin → other players) or direct messages (player → admin).
- **Emit events** for connection status changes, disconnections, and incoming messages.

`PeerService` stays agnostic to the game logic; it simply sends/receives data.

### 4.2 `GameContext` and `GameStateReducer`
**Goal**: Provide a central state management solution and pure functional state transformations.

#### `GameStateReducer`
- **Pure functional**: Takes current state and an action, returns new state without side effects.
- **Process transactions**: Validates and applies transactions, updates balances.
- **Handle game lifecycle**: Functions for transitions between `configuring` → `active` → `ended` states.
- **Game configuration**: Methods for adding/updating players, stashes, and other game elements.

#### `GameContext`
- **Provides state access**: Wraps the app with a React Context that contains the game state.
- **Dispatches actions**: Exposes a dispatch function to trigger state changes.
- **Handles P2P integration**: Uses useEffect hooks to:
  - Subscribe to PeerService events
  - Broadcast state changes to connected peers
  - Process incoming peer messages

This approach separates:
- **Pure logic** (GameStateReducer - what should happen)
- **State management & side effects** (GameContext - when and how it happens)

---

## 5. Application Flow

### 5.1 Home Page
1. **PeerService Initialization**: User obtains a `peerId` from the signaling server.
2. **Username Entry**: User provides a display name (player name).
3. **Create or Join**: User chooses:
   - **Create a New Game**: Becomes admin, initializes GameContext with a new GameState.
   - **Join an Existing Game**: Must have admin's `peerId` to connect.

### 5.2 Lobby (Configuring Stage)
1. **Admin** can:
   - Add/remove `Stash` objects via dispatch actions.
   - Configure player balances via dispatch actions.
   - Confirm which players are in the game.
2. **Players** see limited data (such as existing stashes, other players) but cannot edit them.
3. **Start Game**: Admin dispatches a START_GAME action, broadcasts final initial state.

### 5.3 Active Game
1. **Transactions**:
   - A player (including admin) initiates a transaction (send or receive from stash/player).
   - Player dispatches an ADD_TRANSACTION action.
   - For non-admin players, this is relayed to the admin via PeerService.
2. **Admin Validation**:
   - Admin's GameStateReducer validates the transaction (e.g., sufficient funds).
   - If valid, processes the transaction and updates GameState via reducer.
   - Broadcasts the new state to all players.
3. **Real-Time UI**:
   - Each client's reducer processes the new state via a SYNC_STATE action.
4. **Disconnections**:
   - If the admin disconnects, no transactions can be processed until they reconnect.
   - Players remain in read-only mode, with local state intact.

### 5.4 Ending the Game
1. **Admin** ends the game, setting state to `ended`.
2. **Players** view final balances and transaction history. No new transactions are allowed.
3. **Exit**: Players leave or refresh to return to the home page if they wish to start/join another game.

---

## 6. State Management

### 6.1 Single Global Context & `useReducer`
- A single **GameContext** provides the `GameState` and a reducer-based dispatch function.
- **GameStateReducer** contains all pure functions for state transformations.
- **Actions** describe high-level events (e.g., `START_GAME`, `ADD_TRANSACTION`, `SYNC_STATE`, `END_GAME`).
- **Versioning** ensures that out-of-date updates are ignored if a newer version has already been applied.

```ts
type GameAction =
  | { type: 'START_GAME'; payload: { startedAt: number } }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'END_GAME'; payload: { endedAt: number } }
  | { type: 'SYNC_STATE'; payload: GameState };
```

### 6.2 Synchronization Flow
1. **Local Dispatch**: The admin updates game state and dispatches a local action.
2. **Broadcast**: The updated `GameState` is sent to players via `PeerService`.
3. **Remote Sync**: Each player receives the new state, dispatches `SYNC_STATE` locally, and the reducer merges changes if `version` is higher.

---

## 7. Error Handling & Security

### 7.1 Connection Errors
- Connection failures to the signaling server or peer disconnections raise clear UI alerts.
- Retrying connections or displaying "admin offline" messages ensures clarity for players.

### 7.2 Transaction Errors
- **Client-Side Validation**: Basic checks (e.g., non-negative amounts).
- **Admin Validation**: Official final check to ensure the transaction is valid (e.g., sufficient balance).
- **Conflict Resolution**: Latest `GameState.version` always wins.

### 7.3 Security Considerations
- **WebRTC Encryption**: All peer connections are encrypted by default.
- **Data Privacy**: Minimal personal info required; primarily usernames and game data.
- **Input Validation**: Defense-in-depth approach, validating inputs on both client and admin side.

---

## 8. UI/UX Details

1. **Optimistic UI Updates** (optional enhancement):
   - Show a pending transaction in the UI while waiting for admin confirmation.
   - Revert if admin rejects or if a conflict arises.

2. **Dedicated Transaction Dialogs**:
   - Minimalistic modals where users specify transaction type (send or receive), target, and amount.
   - On confirmation, data is sent to admin.

3. **Chronological Transaction History**:
   - Display a running log of transactions (most recent first).
   - Filtering by player or stash for clarity.

4. **Local Storage Persistence**:
   - On refresh, a client reloads the most recent known game state from local storage.
   - If a newer broadcast is received, that latest version replaces local data.

---

## 9. Summary of Architecture Decisions

1. **Star Topology with Admin as Leader**: The admin acts as a single source of truth.  
2. **Single Global React Context with Reducer**: Simplifies state management with separation of concerns:
   - `GameContext` for state access and side effects
   - `GameStateReducer` for pure state transformations
3. **Versioned State Updates**: Ensures reliable synchronization among peers.  
4. **Local Storage for Persistence**: Provides continuity across page reloads.  
5. **Admin-Only Configuration**: Prevents confusion and conflicts by centralizing major configuration tasks.

---

## Potential Contradictions or Areas of Caution

1. **"Decentralized" vs. Star Topology**  
   - Despite calling it decentralized, the MVP uses a star topology. In practice, the admin is a single point of failure. This might be acceptable for an MVP but is not a purely decentralized model.

2. **Scalability**  
   - With many connected players, the admin peer could become a bottleneck. This may need further optimization or a more robust architecture for large-scale use.

3. **Append-Only Transaction List**  
   - Using `isDeleted` for edits can lead to a large transaction log. Consider pruning or snapshotting for long-running games.

4. **Local Storage Volatility**  
   - Users might lose data if they clear browser storage. For more critical use cases, consider additional persistence or an export feature.

Overall, the architecture is consistent for an MVP. The star topology choice is intentional yet slightly at odds with a fully decentralized vision. As long as this trade-off is understood, it should not pose a significant issue for early development.

# P2P Money Tracker – React Pages & Components Documentation

Below is a proposed outline of the **React pages** and **components** needed to implement the user interface for the P2P Money Tracker application, based on the previously described architecture. These serve as a reference for how to structure the front-end, ensuring each key feature (game configuration, transactions, real-time sync, etc.) is properly represented.

---

## 1. Pages

### 1.1 **HomePage**
**File**: `src/pages/HomePage.tsx`

**Purpose**:
- The entry point for users.
- Allows a user to:
  1. Enter a display name.
  2. Choose to **Create a New Game** (and become Admin).
  3. Join an existing game with an **Admin's peerId**.

**Key Elements**:
- **Username input** field (local state or global context).
- **Create New Game** button → triggers creating a new `GameState` and generating a new `peerId` via `PeerService`.
- **Join Existing Game** button → prompts user to enter the admin's peerId, attempts connection via `PeerService`.
- Basic connection status indicator to show readiness from the `PeerService`.

**State/Props**:
- State for "displayName" text.
- Optional error/notification states (e.g., connection error).

---

### 1.2 **LobbyPage**
**File**: `src/pages/LobbyPage.tsx`

**Purpose**:
- Displays the game "lobby," which is the **configuring** stage where Admin sets up the game (players, stashes) and others wait.
- Only the Admin can modify game settings:
  - Add/remove `Stash` objects.
  - Configure player balances.
- Non-admin players see a read-only list of stashes and players.

**Key Elements**:
- **Stash List & Editor** (admin-only controls to add/delete stashes, set infinite stashes).
- **Player List** (shows all connected players, their balances).
  - Admin might adjust balances before the game starts.
- **Start Game** button (admin-only):
  - Dispatches `START_GAME` action and transitions the application state to `active`.

**State/Props**:
- Connected to the global `GameContext` to read/write `GameState`.
- Distinguish admin vs. non-admin logic (e.g., `isAdmin` check).

---

### 1.3 **GamePage**
**File**: `src/pages/GamePage.tsx`

**Purpose**:
- The main game interface during the **active** state.
- Displays real-time balances, transaction history, and includes UI for initiating new transactions.

**Key Elements**:
1. **Balance Overview**:
   - A concise list of players and stashes with current balances.
2. **Transaction History**:
   - Chronological log of transactions (newest first or oldest first).
   - Potential filtering/search capabilities (optional).
3. **Transaction Initiation**:
   - A button or modal to create a new transaction:
     - Send from a player/stash to another player/stash.
     - Enter amount and optional note/description.
   - "Submit" triggers a request to the admin for validation and broadcast.
4. **Connection Status**:
   - Indicate if the admin or any peers are disconnected (admin is critical).
5. **End Game** button (admin-only):
   - Moves `GameState` to `ended`.
   - Broadcasts the final state to all peers.

**State/Props**:
- Subscribes to global `GameContext` for real-time changes (transactions, balances).
- Dispatches `ADD_TRANSACTION` event

---

### 1.4 **GameEndedPage**
**File**: `src/pages/GameEndedPage.tsx` or part of `GamePage.tsx` under `status === 'ended'`

**Purpose**:
- Displays final game results after admin ends the game.
- If separated into its own route/page, users see a summary and can choose to go back to the Home page.

**Key Elements**:
- **Final Balances** of players/stashes.
- **Complete Transaction History** for reference.
- "Return to Home" link or button to reset the app or start a new game.

**State/Props**:
- Reads the final `GameState` (with `status = 'ended'`).

---

## 2. Shared/Reusable Components

Below are example components that each page may utilize. These components are typically placed in `src/components/`.

### 2.1 **PlayerList**
**File**: `src/components/player/PlayerList.tsx`
- Renders a list of `Player` objects (name, balance, admin status).
- Could allow inline editing of balances (admin-only) or attach modals.

### 2.2 **StashList**
**File**: `src/components/stash/StashList.tsx`
- Renders a list of `Stash` objects (name, balance, infinite status).
- Allows adding/removing stashes or editing stash attributes (admin-only).

### 2.3 **TransactionLog**
**File**: `src/components/transaction/TransactionLog.tsx`
- Displays the list of `Transaction` objects from the `GameState`.
- Could be styled as a table or feed showing sender/receiver, amounts, timestamps.
- Allows filtering or sorting if desired.

### 2.4 **TransactionModal**
**File**: `src/components/transaction/TransactionModal.tsx`
- A modal dialog to create or confirm a new transaction.
- Fields:
  - **Sender** (player or stash)
  - **Receiver** (player or stash)
  - **Amount**
- After input validation, calls an action to request admin approval.

### 2.5 **ConnectionStatus**
**File**: `src/components/common/ConnectionStatus.tsx`
- Displays the status of the WebRTC connection to the admin (for non-admin clients) or the status of connected peers (for admin).
- Could show a list of connected peerIds, highlight if any connection is lost.

### 2.6 **GameControls** (Optional)
**File**: `src/components/common/GameControls.tsx`
- A toolbar or set of buttons for actions like:
  - Start Game (admin-only)
  - End Game (admin-only)
  - Show Transaction Modal
  - Etc.

### 2.7 **Layout** (Optional)
**File**: `src/components/common/Layout.tsx`
- A higher-level layout wrapper for consistent header/footer, styling, or alert systems across pages.

---

## 3. Data Flow & Integration

### 3.1 **Using the Global Context**
- All pages and most components will consume data from the global `GameContext`.
- Example usage:
  ```tsx
  const { state: gameState, dispatch } = useGameContext();
  ```
- For admin-related logic (e.g., updating stashes), guard with:
  ```tsx
  if (!currentPlayer.isAdmin) return null;
  ```
### 3.2 **Initiating Transactions**
- Typically triggered in `TransactionModal`.
- The flow:
  1. User fills out form → local validation (non-negative amount, etc.).
  2. "Send" → dispatch an ADD_TRANSACTION action.
  3. If user is admin, the GameStateReducer directly processes the transaction.
     If user is not admin, GameContext sends the action to admin via `PeerService`.

### 3.3 **Broadcasting State Changes**
- When the admin changes the game configuration or processes a transaction, it updates the `GameState` locally (dispatch).
- Then, GameContext broadcasts the updated state to all connected peers via PeerService.
- Peers receive the new state (via `PeerService` listener) and dispatch a `SYNC_STATE` action to merge it.

---

## 4. Example Directory Structure (UI-Focused)

```
/src
  /pages
    HomePage.tsx
    LobbyPage.tsx
    GamePage.tsx
    GameEndedPage.tsx
  /components
    /common
      ConnectionStatus.tsx
      Layout.tsx
      GameControls.tsx
      ...
    /player
      PlayerList.tsx
      PlayerItem.tsx
    /stash
      StashList.tsx
      StashItem.tsx
    /transaction
      TransactionLog.tsx
      TransactionModal.tsx
    ...
  /contexts
    GameContext.tsx           # useReducer, main game state
  /services
    PeerService.ts            # PeerJS abstraction
  /types
    index.ts                  # All TS interfaces: Player, Stash, Transaction, GameState
  ...
```

---

## 5. Implementation Notes & Best Practices

1. **Modular Components**: Smaller components (e.g., `PlayerItem`, `StashItem`) can help keep code organized and maintainable.
2. **Admin vs. Non-Admin** UIs: Use conditionals (e.g., `isAdmin`) to protect certain functionality and avoid confusion in the UI.
3. **Local Storage Integration**: Ensure pages load from local storage upon mount (if no live data yet). The context initialization is typically the best place to rehydrate state.
4. **Connection Handling**: Provide clear user feedback if the admin is offline or the connection is unstable. This can be integrated in `ConnectionStatus`.
5. **Error/Alerts**: For transaction failures or conflict resolution, consider a small alert or toast system to inform the user.

---

## 6. Conclusion

By structuring the P2P Money Tracker application with these pages and components, the React front end will remain aligned with the core architecture:

- **HomePage** handles user setup and initial P2P connection.
- **LobbyPage** focuses on game configuration.
- **GamePage** manages real-time transactions.
- **GameEndedPage** or an ended-game view presents final results.

Each page and component leverages the global `GameContext`, with the `PeerService` as underlying layers for synchronization and business logic. This approach should help maintain a clear separation of concerns, making future expansions and feature additions (e.g., additional transaction types, custom UI themes, or advanced error handling) more straightforward.

