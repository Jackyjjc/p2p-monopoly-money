/**
 * Utility functions for handling message serialization and deserialization
 */
import { 
  PeerMessageType, 
  ErrorMessage, 
  StateSyncMessage, 
  TransactionRequestMessage, 
  GameStartMessage, 
  GameEndMessage, 
  PlayerNameMessage
} from '../types/peerMessages';

/**
 * Creates an error message
 * @param code Error code
 * @param message Error message
 * @returns Error message
 */
export function createErrorMessage(code: string, message: string): ErrorMessage {
  return {
    type: PeerMessageType.ERROR,
    payload: {
      code,
      message
    }
  };
}

/**
 * Creates a state sync message with the game state
 * @param gameState The game state to send
 * @returns State sync message
 */
export function createStateSyncMessage(gameState: any): StateSyncMessage {
  return {
    type: PeerMessageType.STATE_SYNC,
    payload: {
      gameState
    }
  };
}

/**
 * Creates a transaction request message
 * @param id Transaction ID
 * @param senderId Sender's ID
 * @param receiverId Receiver's ID
 * @param amount Transaction amount
 * @returns Transaction request message
 */
export function createTransactionRequestMessage(
  id: string, 
  senderId: string, 
  receiverId: string, 
  amount: number
): TransactionRequestMessage {
  return {
    type: PeerMessageType.TRANSACTION_REQUEST,
    payload: {
      id,
      timestamp: Date.now(),
      senderId,
      receiverId,
      amount
    }
  };
}

/**
 * Creates a game start message
 * @returns Game start message
 */
export function createGameStartMessage(): GameStartMessage {
  return {
    type: PeerMessageType.GAME_START,
    payload: {
      startedAt: Date.now()
    }
  };
}

/**
 * Creates a game end message
 * @returns Game end message
 */
export function createGameEndMessage(): GameEndMessage {
  return {
    type: PeerMessageType.GAME_END,
    payload: {
      endedAt: Date.now()
    }
  };
}

/**
 * Creates a player name message
 * @param playerId Player's ID
 * @param playerName Player's name
 * @returns Player name message
 */
export function createPlayerNameMessage(playerId: string, playerName: string): PlayerNameMessage {
  return {
    type: PeerMessageType.PLAYER_NAME,
    payload: {
      playerId,
      playerName
    }
  };
}

/**
 * Validates a message
 * @param message The message to validate
 * @returns True if the message is valid
 */
export function validateMessage(message: any): boolean {
  // Check if the message has the required fields
  if (!message.type || !message.payload) {
    console.error('Invalid message:', message);
    return false;
  }
  
  // Check if the message type is valid
  if (!Object.values(PeerMessageType).includes(message.type)) {
    console.error('Invalid message type:', message.type);
    return false;
  }
  
  // Check if the message has the required payload based on its type
  switch (message.type) {
    case PeerMessageType.ERROR:
      return !!message.payload?.code && !!message.payload?.message;
    case PeerMessageType.TRANSACTION_REQUEST:
      return (
        !!message.payload?.id &&
        !!message.payload?.timestamp &&
        !!message.payload?.senderId &&
        !!message.payload?.receiverId &&
        typeof message.payload?.amount === 'number'
      );
    case PeerMessageType.STATE_SYNC:
      return !!message.payload?.gameState;
    case PeerMessageType.GAME_START:
      return !!message.payload?.startedAt;
    case PeerMessageType.GAME_END:
      return !!message.payload?.endedAt;
    case PeerMessageType.PLAYER_NAME:
      return !!message.payload?.playerId && !!message.payload?.playerName;
    default:
      return false;
  }
} 