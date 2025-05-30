# P2P Money Implementation Checklist

## 1. Set Up Core Project Structure & Tooling

### 1.1 Initialize Repository & Tools
- [x] 1.1.1 Create a Git repo and commit an empty package.json, .gitignore
- [x] 1.1.2 Install dependencies: react, react-dom, typescript, webpack, babel (if needed), ts-loader, etc.
- [x] 1.1.3 Add essential scripts: "start", "build", "test"

### 1.2 Directory Structure & Basic Scripts
- [x] 1.2.1 Create /src folder and subfolders: services, types, utils, components, pages
- [x] 1.2.2 Add a minimal src/index.tsx with a ReactDOM.render(<App />, ...)
- [x] 1.2.3 Verify that npm run build outputs a working bundle, and npm run start launches a local dev server

## 2. Implement Peer-to-Peer Foundation (PeerService)

### 2.1 Create PeerService Skeleton
- [x] 2.1.1 Import Peer from peerjs
- [x] 2.1.2 Implement the constructor that calls new Peer() and sets up peer.on('open'), etc.
- [x] 2.1.3 Create an internal map to track open connections

### 2.2 Connection & Messaging Methods
- [x] 2.2.1 Implement connectToPeer(remotePeerId) that returns a Promise resolved on "open"
- [x] 2.2.2 Add broadcast(message) that loops over all connected peers and sends the message
- [x] 2.2.3 Emit an 'message' event whenever a connected peer sends data
- [x] 2.2.4 Add URL-safe peer ID encoding/decoding for game sharing

## 3. Implement Game Logic (GameStateReducer & GameContext)

### 3.1 Set Up GameStateReducer
- [x] 3.1.1 Create pure functional reducer class with static methods
- [x] 3.1.2 Implement core state transformation methods (processTransaction, startGame, etc.)
- [x] 3.1.3 Define a main gameReducer function that maps actions to reducer methods

### 3.2 Create GameContext Provider
- [x] 3.2.1 Define React Context with GameState and dispatch
- [x] 3.2.2 Implement GameProvider that uses the gameReducer
- [x] 3.2.3 Create useEffect hooks to handle PeerService integration
- [x] 3.2.4 Implement side effects for broadcasting state changes when admin

## 4. Build React State & Context

### 4.1 GameContext & Reducer
- [x] 4.1.1 Create GameContext.tsx with React.createContext()
- [x] 4.1.2 Define the gameReducer(state, action) that handles e.g. SYNC_STATE, START_GAME
- [x] 4.1.3 Provide a GameProvider that wraps the app, storing [state, dispatch]

### 4.2 Local Storage & Initialization
- [ ] 4.2.1 On app start, check if local storage has a gameState. If so, dispatch it to the reducer
- [ ] 4.2.2 On every reducer update, write the new state to local storage
- [ ] 4.2.3 Confirm it doesn't conflict with the real-time sync from the admin

## 5. Create Core UI Pages & Components

### 5.1 HomePage
- [x] 5.1.1 Provide an input for the user's display name
- [x] 5.1.2 "Create Game" button: calls GameStateReducer.initGame(), sets local user as admin
- [x] 5.1.3 Generate and display shareable game URL with admin's peer ID (base64 encoded)

### 5.2 JoiningPage
- [x] 5.2.1 Extract and decode admin's peer ID from URL parameters
- [x] 5.2.2 Initialize PeerService connection
- [x] 5.2.3 Handle player name input and connection to admin
- [x] 5.2.4 Auto-navigate based on game status

### 5.3 LobbyPage
- [x] 5.3.1 Display list of players and stashes from the GameState
- [x] 5.3.2 If admin, allow adding stash: input fields for name/balance, "Add" button
- [x] 5.3.3 Provide "Start Game" button → dispatch START_GAME action
- [x] 5.3.4 Display and allow copying of game URL for sharing (with encoded peer ID)

### 5.4 GamePage
- [x] 5.4.1 Show a transaction "dashboard" of balances for all players and stashes
- [x] 5.4.2 "New Transaction" button → open a modal with fields for sender, receiver, amount
- [x] 5.4.3 On confirm, dispatch ADD_TRANSACTION action which handles admin vs. non-admin flows

### 5.5 GameEndedPage
- [x] 5.5.1 Render final balances (or just show the read-only version of GameState)
- [x] 5.5.2 "Return to Home" → user resets or navigates to main

## 6. Finalize Testing & Deployment

### 6.1 Unit Tests
- [ ] 6.1.1 For PeerService, mock PeerJS or use a test harness to connect two peers
- [ ] 6.1.2 For GameStateReducer, test pure functions for adding stashes, players, transactions
- [ ] 6.1.3 Test URL-safe peer ID encoding/decoding functionality

## 7. Enhancements and Bug Fixes

### 7.1 Local Storage Implementation
- [ ] 7.1.1 Add a utility service for saving/loading game state from localStorage
- [ ] 7.1.2 Implement versioning to avoid conflicts with newer states from admin
- [ ] 7.1.3 Add "Resume Game" option to HomePage for locally saved games

### 7.2 User Experience Improvements
- [ ] 7.2.1 Add transaction history filtering and sorting options
- [ ] 7.2.2 Implement confirmation modals for critical actions (end game, delete transaction)
- [ ] 7.2.3 Add visual feedback for transaction success/failure states
- [x] 7.2.4 Add QR code generation for game URL sharing
- [x] 7.2.5 Add URL-safe peer ID encoding for game sharing
- [ ] 7.2.6 Add loading states for peer connection process

### 7.3 Advanced Features
- [ ] 7.3.1 Implement transaction categories or tags
- [ ] 7.3.2 Add export functionality for game history (CSV, JSON)
- [ ] 7.3.3 Enable transaction attachment messages or notes 