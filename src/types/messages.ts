/**
 * Message types for peer communication layer
 */
export enum MessageType {
    DATA = 'data', // data exchange
    ERROR = 'error'
}

/**
 * Base message interface for peer communication
 * - `type`: Identifies the message type    
 * - `senderId`: The peer ID of the sender
 * - `timestamp`: Unix timestamp in milliseconds when the message was created
 * - `payload`: Message-specific data structure
 * - `protocolVersion`: The version of the protocol used to serialize the message
 */
export interface PeerMessage {
    type: MessageType;
    senderId: string;
    timestamp: number;
    protocolVersion: string;
  }
  
  /**
   * Data message for exchanging data (e.g. game state) between peers
   */
  export interface DataMessage extends PeerMessage {
    type: MessageType.DATA;
    payload: any;
  }

  /**
   * Error message
   */
  export interface ErrorMessage extends PeerMessage {
    type: MessageType.ERROR;
    payload: {
      code: string;
      message: string;
    };
  }
  
  /**
   * Union type of all message types
   */
  export type Message =
    | DataMessage
    | ErrorMessage;