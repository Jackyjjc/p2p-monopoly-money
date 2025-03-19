/**
 * Message types for peer communication layer
 */
export enum PeerMessageType {
    TRANSACTION_REQUEST = 'transaction-request', // Player sends transaction request to admin
    STATE_SYNC = 'state',                        // Admin broadcasts updated game state
    GAME_START = 'game-start',                   // Admin broadcasts game start
    GAME_END = 'game-end',                       // Admin broadcasts game end
    ERROR = 'error'                              // Error message
}

/**
 * A generic shape for data sent via PeerJS.
 * Could include transaction requests, state sync broadcasts, etc.
 */
export interface PeerMessage {
    /** Type of the message (e.g., "transaction", "state", "chat") */
    type: string;

    /** Arbitrary payload specific to the message type */
    payload: any;
}

/**
 * Transaction request message sent from player to admin
 */
export interface TransactionRequestMessage extends PeerMessage {
    type: PeerMessageType.TRANSACTION_REQUEST;
    payload: {
        id: string;
        timestamp: number;
        senderId: string;
        receiverId: string;
        amount: number;
    };
}

/**
 * State synchronization message broadcast from admin to all players
 */
export interface StateSyncMessage extends PeerMessage {
    type: PeerMessageType.STATE_SYNC;
    payload: {
        gameState: any; // Will be GameState from interfaces
    };
}

/**
 * Game start message broadcast by admin
 */
export interface GameStartMessage extends PeerMessage {
    type: PeerMessageType.GAME_START;
    payload: {
        startedAt: number;
    };
}

/**
 * Game end message broadcast by admin
 */
export interface GameEndMessage extends PeerMessage {
    type: PeerMessageType.GAME_END;
    payload: {
        endedAt: number;
    };
}

/**
 * Error message
 */
export interface ErrorMessage extends PeerMessage {
    type: PeerMessageType.ERROR;
    payload: {
        code: string;
        message: string;
    };
}

/**
 * Union type of all peer message types
 */
export type PeerServiceMessage =
    | TransactionRequestMessage
    | StateSyncMessage
    | GameStartMessage
    | GameEndMessage
    | ErrorMessage;