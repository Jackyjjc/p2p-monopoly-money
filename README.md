# P2P Money Tracker

A browser-based peer-to-peer application for tracking money and transactions in tabletop games, using WebRTC for direct communication between players without a central server.

## Features

- **Peer-to-peer communication**: Real-time syncing via WebRTC (using PeerJS)
- **No central server**: After initial connection, all data flows directly between players
- **Money tracking**: Keep track of player balances and transactions
- **Stash management**: Create money stashes (banks, funds) with finite or infinite balances
- **Real-time updates**: Transactions are immediately broadcasted to all players
- **Local persistence**: Game state saves to local storage for continuity
- **Easy sharing**: Share game URL via copy link or QR code for quick mobile access
- **URL-safe encoding**: Peer IDs are automatically encoded for safe URL sharing

## How It Works

1. **Admin creates a game**: Generates a unique game ID and becomes the game leader
2. **Players join**: By clicking a shareable game URL or scanning a QR code that contains the admin's peer ID (automatically encoded for URL safety)
3. **Setup phase**: Admin configures stashes and initial balances
4. **Game play**: Players can make transactions that modify balances
5. **All transactions**: Flow through the admin for validation and broadcasting

## Technologies

- **React**: UI framework with functional components and hooks
- **TypeScript**: For type safety and better developer experience
- **PeerJS**: WebRTC abstraction for peer-to-peer communication
- **React Context API**: For state management with reducer pattern
- **CSS Modules**: For component-scoped styling

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- NPM (v6 or higher)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/p2p-money.git
cd p2p-money

# Install dependencies
npm install

# Start the development server
npm start
```

### Usage

1. **Create a game**:
   - Enter your name and click "Create Game"
   - Share the generated game URL with other players (via copy link or QR code)
   - The URL automatically encodes the peer ID for safe sharing

2. **Join a game**:
   - Click the shared game URL or scan the QR code
   - Enter your name and click "Join Game"

3. **During setup**:
   - Admin can create stashes (banks, pools of money)
   - When everyone is ready, admin starts the game

4. **During gameplay**:
   - Create transactions between players and stashes
   - View transaction history and current balances

## Architecture

The application follows a component-based architecture with clear separation of concerns:

- **PeerService**: Handles all WebRTC communication
- **Custom Hooks**: Encapsulate and abstract complex logic like peer connection initialization
- **GameStateReducer**: Contains pure business logic for state transformations
- **GameContext**: Connects the UI with state management and peer communication
- **React Components**: Provide the user interface layer

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed technical documentation.

## Project Status

This project is actively under development. See [docs/TODO.md](docs/TODO.md) for current status and upcoming features.