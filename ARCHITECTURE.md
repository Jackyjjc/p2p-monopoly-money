# P2P Money Tracker - Architecture Overview

This document provides a comprehensive overview of the P2P Money Tracker application architecture, detailing the components, their responsibilities, and how they interact with each other.

## 1. Project Overview

P2P Money Tracker is a peer-to-peer application that allows users to track money transactions between players in a game setting. The application uses WebRTC for direct peer-to-peer communication without requiring a central server for data exchange after the initial connection is established.

### Key Features

- **Peer-to-peer communication** using WebRTC to communicate with other browser clients.
- **Decentralized architecture:** No server is involved apart from signaling. For the MVP, we have a star style peer network where the leader is acting as the exchange for all peer information.
- **Real-time transaction processing:** transactions are sent and updated in real time.
- **Persistence support:** with local storage persisting game state changes for history and persistence across refresh.
- **Transaction validation** to ensure data integrity.

## 2. High-Level Architecture

The application follows a component-based architecture using React with TypeScript. It uses a combination of React Context API for state management and custom services for handling peer-to-peer communication and game state management.

### Core Architectural Components

1. **UI Layer**: React components organized by feature
2. **State Management**: React Context API with custom hooks
3. **Peer Communication**: WebRTC implementation using PeerJS
4. **Data Persistence**: Local storage for handling page reload.
5. **Business Logic**: Distributed across services

## 3. Directory Structure

```
/src
  /components        # UI components organized by feature
    /common          # Reusable UI components
  /contexts          # React context providers for state management
  /hooks             # Custom React hooks
  /pages             # Main application pages/screens
  /services          # Core services for business logic
  /styles            # CSS styles
  /types             # TypeScript type definitions
  /utils             # Utility functions
  /assets            # Static assets
```

## 4. Core Components and Services

### 4.1 Data Models

The application is built around these core data models:

- **Player**: Represents a user in the game with properties like peerId, name, balance, admin status, and connection status
- **Stash**: Represents a money pool with properties like id, name, balance, and whether it's infinite
- **Transaction**: Represents a money transfer between players or stashes. Append only, edit involve marking the previous transaction as deleted and append a new transaction.
- **GameState**: The complete state of a game including players, stashes, transactions, and metadata

### Player
```typescript
interface Player {
  peerId: string;
  name: string;
  balance: number;
  isAdmin: boolean;
}
```

### Stash
```typescript
interface Stash {
  id: string;
  name: string;
  balance: number;
  isInfinite: boolean;
}
```

### Transaction
```typescript
interface Transaction {
  id: string;
  timestamp: number;
  senderId: string;
  receiverId: string;
  amount: number;
  isDeleted: boolean;
}
```

### Game State
```typescript
interface GameState {
  id: string;
  displayName: string;
  status: 'configuring' | 'active' | 'ended';
  players: Record<string, Player>; // Map of peerId to Player
  stashes: Record<string, Stash>; // Map of id to Stash
  transactions: Transaction[];
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  version: number;
}
```

### 4.2 Services

#### PeerService

**Responsibility**: Abstract away WebRTC implementation using PeerJS.

**Key Functions**:
- Creates and maintains a singleton Peer object.
- Establishes and maintains connection to the signal server.
- Establishes and maintains peer connections in a star network topology, where all peers connect to the leader but not each other
- Sends and receives messages between peers.
- Leader broadcasts messages to all connected peers.
- Handles connection events (connect, disconnect, errors).
- Emits events for connection status changes, peer connections/disconnections, and message reception.
- Provides methods for direct peer-to-peer communication.
- This service does not know what messages are sent; it is only responsible for sending and receiving messages.

#### Message Utilities

**Responsibility**: Utility functions for creating messages to send to other peers. They also provide basic validation of the messages to ensure they are not malformed. Message serialization and deserialization are handled by PeerJS, not these utility functions.

**Key Functions**:
- Provides helper methods for creating messages to send to other peers.
- It also provides basic validation of the messages to ensure they are not malformed after deserialized by peerjs.

#### GameService

**Responsibility**: Encapsulates game state and peer service, expose methods to change the game state, and emits events for UI updates. UI and other components should not directly modify the game state.

**Key Functions**:
- Creating games
- Adding and removing players (only before the game starts)
- Managing player balances (initial configuration only before the game starts)
- Creating and updating stashes (only before the game starts)
- Processing transactions (during active game)
- Updating game status
- Enforcing game rules (e.g., preventing player/stash additions after game start)

## 5. Communication Flow

### 5.1 Game Creation and Joining

1. **Player opens app**:
   - PeerService is initialized and connects to the signaling server.

2. **Admin creates game**:
   - Creates initial GameState
   - Waits for players to connect
   - Configures player initial money amount and creates stashes.

2. **Player joins game**:
   - Player connects to admin using admin's peer ID
   - Admin and player perform handshake process, during which:
      - player provides the admin the player's username.
      - admin updates game state to include new player
      - admin broadcasts game state

3. **Admin starts game**:
   - Admin starts the game, updates gamestate and broadcast state to players
   - Players can now start making transaction with each other.

### 5.2 Transaction Processing

1. **Player initiates transaction**:
   - UI collects transaction details (sender, receiver, amount)
   - Client-side validation ensures transaction is valid
   - Transaction request is sent to admin

2. **Admin processes transaction**:
   - Admin processes transactions in a first come first serve order.
   - Admin validates transactions and rejects any that are invalid. Sender gets a rejection response.
   - Updates GameState with new transaction
   - Updates player balances
   - Broadcasts updated GameState to all players

3. **Players receive update**:
   - All players receive updated GameState
   - UI reflects new balances and transaction history

### 5.3 Admin Disconnection and Reconnection

1. **Admin disconnects**:
   - Disconnection is detected by all players
   - Players cannot make any further changes to the game state
   - Players wait for admin to reconnect

2. **Admin reconnection**:
   - Admin connects back to all players
   - Game continues

## 6. State Management

### 6.1 Game State Lifecycle

1. **Creation**: Admin creates initial state with game metadata
2. **Configuration**: Admin configures initial balances and stashes, and players can join
3. **Active**: Game is in progress, transactions are processed, no new players or stashes can be added
4. **Ended**: Game is completed, final balances are displayed

### 6.2 State Synchronization

- **Version Control**: Each state update increments a version number, the later version always wins.
- **Admin Authority**: Admin is the source of truth for state updates
- **Broadcast Updates**: State changes are broadcast to all peers
- **Conflict Resolution**: Later versions override earlier versions

## 7. Error Handling

### 7.1 Connection Errors

- **Connection Failure**: Handled with clear error messages and retry options
- **Peer Disconnection**: Detected and displayed with reconnection attempts
- **WebRTC Errors**: Specific error handling for WebRTC-related issues

### 7.2 Transaction Errors

- **Validation Errors**: Client-side validation prevents invalid transactions
- **Insufficient Funds**: Checked before transaction submission
- **Transaction Conflicts**: Resolved using version numbers and timestamps

## 8. Security Considerations

- **Data Privacy**: No sensitive user data is collected or stored
- **Input Validation**: All user inputs are validated to prevent injection attacks
- **WebRTC Security**: WebRTC connections are encrypted by default
- **State Integrity**: Version control ensures state consistency

## 9. Component Relationships

### 9.1 Service Dependencies
- **PeerService**: Core service with no dependencies
- **GameService**: Depends on PeerService to send and receive messages