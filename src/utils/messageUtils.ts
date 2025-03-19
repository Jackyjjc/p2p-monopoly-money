/**
 * Utility functions for handling message serialization and deserialization
 */
import { PeerMessageType, ErrorMessage } from '../types/peerMessages';

/**
 * Creates an error message
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
    default:
      return false;
  }
} 