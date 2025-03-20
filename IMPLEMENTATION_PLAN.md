1. Set Up Core Project Structure & Tooling

1.1 Initialize Repository & Tools

1.1.1 Create a Git repo and commit an empty package.json, .gitignore.
1.1.2 Install dependencies: react, react-dom, typescript, webpack, babel (if needed), ts-loader, etc.
1.1.3 Add essential scripts: "start", "build", "test".

1.2 Directory Structure & Basic Scripts

1.2.1 Create /src folder and subfolders: services, types, utils, components, pages.
1.2.2 Add a minimal src/index.tsx with a ReactDOM.render(<App />, ...).
1.2.3 Verify that npm run build outputs a working bundle, and npm run start launches a local dev server.

⸻

2. Implement Peer-to-Peer Foundation (PeerService)

2.1 Create PeerService Skeleton

2.1.1 Import Peer from peerjs.
2.1.2 Implement the constructor that calls new Peer() and sets up peer.on('open'), etc.
2.1.3 Create an internal map to track open connections.

2.2 Connection & Messaging Methods

2.2.1 Implement connectToPeer(remotePeerId) that returns a Promise resolved on “open.”
2.2.2 Add broadcast(message) that loops over all connected peers and sends the message.
2.2.3 Emit an 'message' event whenever a connected peer sends data.

⸻

3. Implement Game Logic (GameService)

3.1 Set Up GameService Class

3.1.1 Accept PeerService via constructor.
3.1.2 In initGame, set or load a GameState. Decide if local user is admin.
3.1.3 Listen to 'peer:connect' events so admin can add the new player to the game.

3.2 Core Methods (Add/Update Player, Stash, Transactions)

3.2.1 addPlayer(playerId, playerName?) → modifies local GameState if admin.
3.2.2 updateStash(...) → modifies stashes in local GameState.
3.2.3 processTransaction(transaction) → checks balances, if admin, updates and broadcasts. If not admin, forward to admin.
3.2.4 syncState(incomingGameState) → merges if incomingGameState.version > currentGameState.version.

⸻

4. Build React State & Context

4.1 GameContext & Reducer

4.1.1 Create GameContext.tsx with React.createContext().
4.1.2 Define the gameReducer(state, action) that handles e.g. SYNC_STATE, START_GAME.
4.1.3 Provide a GameProvider that wraps the app, storing [state, dispatch].

4.2 Local Storage & Initialization

4.2.1 On app start, check if local storage has a gameState. If so, dispatch it to the reducer.
4.2.2 On every reducer update, write the new state to local storage.
4.2.3 Confirm it doesn’t conflict with the real-time sync from the admin.

⸻

5. Create Core UI Pages & Components

5.1 HomePage

5.1.1 Provide an input for the user’s display name.
5.1.2 “Create Game” button: calls GameService.initGame(), sets local user as admin.
5.1.3 “Join Game” button: prompts for admin’s peerId, calls PeerService.connectToPeer(...).

5.2 LobbyPage

5.2.1 Display list of players and stashes from the GameState.
5.2.2 If admin, allow adding stash: input fields for name/balance, “Add” button.
5.2.3 Provide “Start Game” button → calls GameService.startGame().

5.3 GamePage

5.3.1 Show a transaction “dashboard” of balances for all players and stashes.
5.3.2 “New Transaction” button → open a modal with fields for sender, receiver, amount.
5.3.3 On confirm, call GameService.processTransaction(transaction) or forward to admin.

5.4 GameEndedPage

5.4.1 Render final balances (or just show the read-only version of GameState).
5.4.2 “Return to Home” → user resets or navigates to main.

⸻

6. Finalize Testing & Deployment

6.1 Unit Tests

6.1.1 For PeerService, mock PeerJS or use a test harness to connect two peers.
6.1.2 For GameService, test adding stashes, players, transactions. Confirm version updates.

6.2 Integration Tests & Deployment

6.2.1 Optional: write an E2E test with something like Cypress or Playwright.
6.2.2 Confirm final npm run build produces /dist.
6.2.3 Deploy the bundle to a static host (e.g., Vercel, Netlify).