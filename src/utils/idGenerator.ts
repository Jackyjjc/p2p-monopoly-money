/**
 * Utility functions for generating unique IDs
 */
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a unique ID with a prefix and UUID
 * @param prefix Prefix for the ID
 * @returns Unique ID
 */
const generateId = (prefix: string): string => {
  return `${prefix}_${uuidv4()}`;
};

/**
 * Generates a unique game ID
 * @returns Unique game ID
 */
export const generateGameId = (): string => {
  return generateId('game');
};

/**
 * Generates a unique transaction ID
 * @returns Unique transaction ID
 */
export const generateTransactionId = (): string => {
  return generateId('tx');
};

/**
 * Generates a unique stash ID
 * @returns Unique stash ID
 */
export const generateStashId = (): string => {
  return generateId('stash');
}; 