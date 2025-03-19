/**
 * Utility functions for handling message serialization and deserialization
 */
import { DataMessage, ErrorMessage, MessageType } from '../types';

/**
 * Protocol version for message compatibility
 */
const PROTOCOL_VERSION: string = '1.0.0';

/**
 * Creates a data message
 * @param senderId The sender's peer ID
 * @param data The data payload
 * @returns Data message
 */
export function createDataMessage(senderId: string, data: any): DataMessage {
  return {
    type: MessageType.DATA,
    senderId,
    timestamp: Date.now(),
    payload: data,
    protocolVersion: PROTOCOL_VERSION
  };
}

/**
 * Creates an error message
 * @param senderId The sender's peer ID
 * @param code Error code
 * @param message Error message
 * @returns Error message
 */
export function createErrorMessage(senderId: string, code: string, message: string): ErrorMessage {
  return {
    type: MessageType.ERROR,
    senderId,
    timestamp: Date.now(),
    payload: {
      code,
      message
    },
    protocolVersion: PROTOCOL_VERSION
  };
}

/**
 * Validates a message
 * @param message The message to validate
 * @returns True if the message is valid
 */
export function validateMessage(message: any): boolean {
  if (message.protocolVersion !== PROTOCOL_VERSION) {
    console.error('Invalid protocol version:', message.protocolVersion);
    return false;
  }

  // Check if the message has the required fields
  if (!message.type || !message.senderId || !message.timestamp) {
    console.error('Invalid message:', message);
    return false;
  }
  
  // Check if the message type is valid
  if (!Object.values(MessageType).includes(message.type)) {
    return false;
  }
  
  // Check if the message has the required payload based on its type
  switch (message.type) {
    case MessageType.ERROR:
      return !!message.payload?.code && !!message.payload?.message;
    default:
      return true;
  }
} 