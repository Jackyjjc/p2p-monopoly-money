import { GameState, Transaction } from '../types';

/**
 * Validates a transaction against the current game state
 * @param state Current game state
 * @param transaction Transaction to validate
 * @returns An object containing validation result and error message if invalid
 */
export function validateTransaction(
  state: GameState,
  transaction: Transaction
): { isValid: boolean; errorMessage: string } {
  // Check if sender exists (player or stash)
  const sender = state.players[transaction.senderId] || state.stashes[transaction.senderId];
  if (!sender) {
    return {
      isValid: false,
      errorMessage: `Sender ${transaction.senderId} not found`
    };
  }
  
  // Check if receiver exists (player or stash)
  const receiver = state.players[transaction.receiverId] || state.stashes[transaction.receiverId];
  if (!receiver) {
    return {
      isValid: false,
      errorMessage: `Receiver ${transaction.receiverId} not found`
    };
  }
  
  // Check if sender and receiver are the same
  if (transaction.senderId === transaction.receiverId) {
    return {
      isValid: false,
      errorMessage: 'Sender and receiver cannot be the same'
    };
  }

  // Check transaction amount is positive
  if (transaction.amount <= 0) {
    return {
      isValid: false,
      errorMessage: 'Transaction amount must be positive'
    };
  }
  
  // Check if sender has enough balance (unless it's an infinite stash)
  const isInfiniteStash = state.stashes[transaction.senderId]?.isInfinite || false;
  if (!isInfiniteStash && sender.balance < transaction.amount) {
    return {
      isValid: false,
      errorMessage: `Sender ${sender.name} has insufficient balance (${sender.balance}) for this transaction (${transaction.amount})`
    };
  }

  // Check if the game is active
  if (state.status !== 'active') {
    return {
      isValid: false,
      errorMessage: `Cannot perform transactions while game is in '${state.status}' state`
    };
  }
  
  // All checks passed
  return {
    isValid: true,
    errorMessage: ''
  };
} 