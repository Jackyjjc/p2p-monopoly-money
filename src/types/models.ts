/**
 * Core data models for the P2P Money Tracker application
 */

/**
 * Represents a player in the game
 */
export interface Player {
  peerId: string;
  name: string;
  balance: number;
  isAdmin: boolean;
}

/**
 * Represents a money stash in the game
 */
export interface Stash {
  id: string;
  name: string;
  balance: number;
  isInfinite: boolean;
}

/**
 * Represents a money transaction between players or stashes
 */
export interface Transaction {
  id: string;
  timestamp: number;
  senderId: string;
  receiverId: string;
  amount: number;
  isEdited: boolean;
  originalAmount?: number;
}

/**
 * Game status types
 */
export type GameStatus = 'configuring' | 'active' | 'ended';

/**
 * Represents the complete state of a game
 */
export interface GameState {
  id: string;
  displayName: string;
  status: GameStatus;
  players: Record<string, Player>; // Map of peerId to Player
  stashes: Record<string, Stash>; // Map of id to Stash
  transactions: Transaction[];
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  version: number;
} 