# Components

This directory contains React components for the P2P Money application. The components are organized into two main categories: main components in the root directory and common/reusable components in the `common/` subdirectory.

## Main Components

### TransactionModal.tsx
A modal component for creating new money transactions between players and stashes. Features include:
- Sender and receiver selection
- Amount input with validation
- Swap functionality for sender/receiver
- Error handling

### PlayerBalanceForm.tsx
Form component for setting or updating player starting balances. Features:
- Player selection dropdown
- Balance input field
- Pre-fills with current player balance when selected

### StashForm.tsx
Form component for creating new money stashes. Features:
- Name input
- Balance input
- Toggle for infinite stashes (unlimited funds)

### TransactionsList.tsx
Displays a table of recent money transactions. Features:
- Shows sender, receiver, amount and timestamp
- Sorts transactions by most recent
- Displays up to 10 most recent transactions
- Option to trigger new transaction creation

### PlayersList.tsx
Simple list component that displays all players with their balances. Features:
- Shows player names and balances
- Indicates admin status
- Highlights the current player

### StashList.tsx
Simple list component that displays all stashes with their balances. Features:
- Shows stash names
- Displays infinite (∞) or numeric balance
- Shows a message when no stashes exist

## Common Components

### BalanceDisplay.tsx
Reusable component for displaying lists of items with balances. Features:
- Customizable title
- Optional action button
- Flexible item rendering
- Support for infinite balances

### ConnectionStatus.tsx
Component that displays the current peer-to-peer connection status. Features:
- Shows connected/disconnected status
- Displays peer ID with copy functionality
- Shows number of connected peers

## Usage Guidelines

1. Use functional components with TypeScript interfaces for props
2. Follow the existing patterns for state management
3. Use the CSS modules from the styles directory
4. For complex state management, consider using reducers instead of multiple useState hooks
5. For game state modifications, always use dispatch instead of direct state mutations 