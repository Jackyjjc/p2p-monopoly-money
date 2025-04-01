/**
 * Core data models for the P2P Money Tracker application
 */

/**
 * Represents a player in the game
 */
export interface Player {
  /** Unique identifier assigned by PeerJS */
  peerId: string;
  /** Display name of the player */
  name: string;
  /** Current balance of the player */
  balance: number;
  /** Indicates if this player is the admin/leader */
  isAdmin: boolean;
  /** Indicates if this player is currently connected */
  isConnected: boolean;
}

/**
 * Represents a money stash in the game
 */
export interface Stash {
  /** Unique ID */
  id: string;
  /** Display name of the stash */
  name: string;
  /** Current stash balance */
  balance: number;
  /** If true, stash never runs out of funds */
  isInfinite: boolean;
}

/**
 * Represents a money transaction between players or stashes
 */
export interface Transaction {
  /** Unique ID for the transaction */
  id: string;
  /** Unix timestamp (milliseconds) when the transaction was created */
  timestamp: number;
  /** ID (peerId) of the sending player or stash ID if from stash */
  senderId: string;
  /** ID (peerId) of the receiving player or stash ID if to stash */
  receiverId: string;
  /** Amount of money transferred */
  amount: number;
  /** Indicates if the transaction has been invalidated or "soft-deleted" */
  isDeleted: boolean;
}

/**
 * Game status types
 */
export type GameStatus = 'configuring' | 'active' | 'ended';

/**
 * Represents the complete state of a game
 */
export interface GameState {
  /** Unique game ID */
  id: string;
  /** Name/label for display */
  displayName: string;
  /** Current status of the game */
  status: GameStatus;
  /** All players in the game, keyed by their peerId */
  players: Record<string, Player>;
  /** All stashes in the game, keyed by stash ID */
  stashes: Record<string, Stash>;
  /** Log of transactions (append-only) */
  transactions: Transaction[];
  /** Creation timestamp (milliseconds) */
  createdAt: number;
  /** Timestamp (milliseconds) when game was started */
  startedAt?: number;
  /** Timestamp (milliseconds) when game ended */
  endedAt?: number;
  /**
   * Version number for synchronization.
   * Incremented each time an admin makes a state update.
   */
  version: number;
} 