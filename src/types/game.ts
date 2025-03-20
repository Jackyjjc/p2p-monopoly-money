/**
 * Type definitions for game entities
 */

/**
 * Represents a player in the game
 */
export interface Player {
  /** Unique peer ID */
  peerId: string;
  /** Display name */
  name: string;
  /** Current balance */
  balance: number;
  /** Whether this player is an admin */
  isAdmin: boolean;
}

/**
 * Represents a stash (money pool) in the game
 */
export interface Stash {
  /** Unique stash ID */
  id: string;
  /** Display name */
  name: string;
  /** Current balance */
  balance: number;
  /** Whether this stash has infinite funds */
  isInfinite: boolean;
}

/**
 * Transaction type definition (for reference only)
 */
export interface Transaction {
  id: string;
  fromType: 'player' | 'stash';
  fromId: string;
  toType: 'player' | 'stash';
  toId: string;
  amount: number;
  timestamp: number;
  description?: string;
} 