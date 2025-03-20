/**
 * GameStateReducer provides pure functional methods to modify game state
 * Each method takes a game state and returns a new game state without side effects
 */
import { v4 as uuidv4 } from 'uuid';
import { 
  GameState, 
  Player, 
  Stash, 
  Transaction
} from '../types';
import { generateGameId, generateStashId, generateTransactionId } from '../utils';

// Define GameAction type
export type GameAction =
  | { type: 'START_GAME'; payload: { startedAt: number } }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'END_GAME'; payload: { endedAt: number } }
  | { type: 'SYNC_STATE'; payload: GameState }
  | { type: 'ADD_PLAYER'; payload: { playerId: string, playerName?: string } }
  | { type: 'ADD_STASH'; payload: { name: string, balance?: number, isInfinite?: boolean } }
  | { type: 'UPDATE_STASH'; payload: { stashId: string, updates: Partial<Stash> } };

export class GameStateReducer {
  /**
   * Initializes a new GameState
   * @param peerId Current user's peer ID
   * @param options Optional partial GameState to initialize with
   * @returns A new GameState
   */
  public static initGame(peerId: string, options?: Partial<GameState>): GameState {
    if (options && options.id) {
      // Return the provided game state
      return options as GameState;
    }
    
    // Create a new player for the current user (admin)
    const playerName = options?.players?.[peerId]?.name || 'Admin';
    const player: Player = {
      peerId,
      name: playerName,
      balance: 0,
      isAdmin: true,
    };

    // Create initial game state
    return {
      id: generateGameId() || uuidv4(),
      displayName: options?.displayName || 'New Game',
      status: 'configuring',
      players: { [peerId]: player },
      stashes: {},
      transactions: [],
      createdAt: Date.now(),
      version: 1
    };
  }

  /**
   * Add a new player to the game state
   * @param state Current game state
   * @param playerId Peer ID of the new player
   * @param playerName Optional name for the player
   * @returns Updated game state with the new player
   */
  public static addPlayer(state: GameState, playerId: string, playerName?: string): GameState {
    // Check if the player already exists
    if (state.players[playerId]) {
      return state;
    }
    
    // Check if the game has already started
    if (this.hasGameStarted(state)) {
      throw new Error('Cannot add new players after the game has started.');
    }
    
    // Create new player
    const player: Player = {
      peerId: playerId,
      name: playerName || `Player ${Object.keys(state.players).length + 1}`,
      balance: 0,
      isAdmin: false,
    };
    
    // Return updated state
    return {
      ...state,
      players: {
        ...state.players,
        [playerId]: player
      },
      version: state.version + 1
    };
  }

  /**
   * Update player information
   * @param state Current game state
   * @param playerId Peer ID of the player to update
   * @param updates Partial player object with updates
   * @returns Updated game state
   */
  public static updatePlayer(state: GameState, playerId: string, updates: Partial<Player>): GameState {
    if (!state.players[playerId]) {
      throw new Error(`Player ${playerId} not found`);
    }
    
    // If game has started, only allow updating player name
    if (this.hasGameStarted(state) && updates.balance !== undefined) {
      throw new Error('Cannot update player balance after the game has started. Use transactions instead.');
    }
    
    // Update player properties
    const updatedPlayers = {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        ...updates
      }
    };
    
    // Return updated state
    return {
      ...state,
      players: updatedPlayers,
      version: state.version + 1
    };
  }

  /**
   * Add a new stash to the game state
   * @param state Current game state
   * @param name Stash name
   * @param balance Initial balance
   * @param isInfinite Whether the stash has infinite balance
   * @returns Updated game state with the new stash
   */
  public static addStash(state: GameState, name: string, balance: number = 0, isInfinite: boolean = false): GameState {
    // Check if the game has already started
    if (this.hasGameStarted(state)) {
      throw new Error('Cannot add new stashes after the game has started');
    }
    
    // Create new stash
    const stash: Stash = {
      id: generateStashId() || uuidv4(),
      name,
      balance,
      isInfinite
    };
    
    // Return updated state
    return {
      ...state,
      stashes: {
        ...state.stashes,
        [stash.id]: stash
      },
      version: state.version + 1
    };
  }

  /**
   * Update a stash
   * @param state Current game state
   * @param stashId ID of the stash to update
   * @param updates Partial stash object with updates
   * @returns Updated game state
   */
  public static updateStash(state: GameState, stashId: string, updates: Partial<Stash>): GameState {
    if (!state.stashes[stashId]) {
      throw new Error(`Stash ${stashId} not found`);
    }
    
    // If game has started, only allow updating stash name
    if (this.hasGameStarted(state) && (updates.balance !== undefined || updates.isInfinite !== undefined)) {
      throw new Error('Cannot update stash balance or infinite status after the game has started. Use transactions instead.');
    }
    
    // Update stash properties
    const updatedStashes = {
      ...state.stashes,
      [stashId]: {
        ...state.stashes[stashId],
        ...updates
      }
    };
    
    // Return updated state
    return {
      ...state,
      stashes: updatedStashes,
      version: state.version + 1
    };
  }

  /**
   * Process a transaction between players/stashes
   * @param state Current game state
   * @param transaction Transaction to process
   * @returns Updated game state with the transaction applied
   */
  public static processTransaction(state: GameState, transaction: Transaction): GameState {
    // Validate transaction
    if (transaction.amount <= 0) {
      throw new Error('Transaction amount must be positive');
    }
    
    // Check if sender exists (player or stash)
    const sender = state.players[transaction.senderId] || state.stashes[transaction.senderId];
    if (!sender) {
      throw new Error(`Sender ${transaction.senderId} not found`);
    }
    
    // Check if receiver exists (player or stash)
    const receiver = state.players[transaction.receiverId] || state.stashes[transaction.receiverId];
    if (!receiver) {
      throw new Error(`Receiver ${transaction.receiverId} not found`);
    }
    
    // Check if sender has enough balance (unless it's an infinite stash)
    if (!this.isInfiniteStash(state, transaction.senderId) && sender.balance < transaction.amount) {
      throw new Error(`Sender ${transaction.senderId} has insufficient balance`);
    }

    // Create a deep copy of the state to work with
    const newState = { ...state };
    newState.players = { ...state.players };
    newState.stashes = { ...state.stashes };
    
    // Update sender balance (unless it's an infinite stash)
    if (!this.isInfiniteStash(state, transaction.senderId)) {
      // Handle player sender
      const senderPlayer = state.players[transaction.senderId];
      if (senderPlayer) {
        // Since we verified sender exists, we can create a proper Player object
        newState.players[transaction.senderId] = {
          ...senderPlayer,
          balance: senderPlayer.balance - transaction.amount
        };
      } 
      // Handle stash sender
      else {
        const senderStash = state.stashes[transaction.senderId];
        if (senderStash) {
          newState.stashes[transaction.senderId] = {
            ...senderStash,
            balance: senderStash.balance - transaction.amount
          };
        }
      }
    }
    
    // Update receiver balance (unless it's an infinite stash)
    if (!this.isInfiniteStash(state, transaction.receiverId)) {
      // Handle player receiver
      const receiverPlayer = state.players[transaction.receiverId];
      if (receiverPlayer) {
        newState.players[transaction.receiverId] = {
          ...receiverPlayer,
          balance: receiverPlayer.balance + transaction.amount
        };
      } 
      // Handle stash receiver
      else {
        const receiverStash = state.stashes[transaction.receiverId];
        if (receiverStash) {
          newState.stashes[transaction.receiverId] = {
            ...receiverStash,
            balance: receiverStash.balance + transaction.amount
          };
        }
      }
    }
    
    // Create a processed transaction with ID and timestamp if not provided
    const processedTransaction: Transaction = {
      ...transaction,
      id: transaction.id || generateTransactionId() || uuidv4(),
      timestamp: transaction.timestamp || Date.now(),
      isDeleted: false
    };
    
    // Add to transactions list
    newState.transactions = [...state.transactions, processedTransaction];
    
    // Increment version
    newState.version = state.version + 1;
    
    return newState;
  }

  /**
   * Start the game
   * @param state Current game state
   * @returns Updated game state with 'active' status
   */
  public static startGame(state: GameState): GameState {
    // Check if there are any players
    if (Object.keys(state.players).length === 0) {
      throw new Error('Cannot start a game with no players');
    }
    
    // Return updated state
    return {
      ...state,
      status: 'active',
      startedAt: Date.now(),
      version: state.version + 1
    };
  }

  /**
   * End the game
   * @param state Current game state
   * @returns Updated game state with 'ended' status
   */
  public static endGame(state: GameState): GameState {
    // Return updated state
    return {
      ...state,
      status: 'ended',
      endedAt: Date.now(),
      version: state.version + 1
    };
  }

  /**
   * Set the game to configuring state
   * @param state Current game state
   * @returns Updated game state with 'configuring' status
   */
  public static setConfiguringState(state: GameState): GameState {
    // Check if the game is already in configuring state
    if (state.status === 'configuring') {
      return state;
    }
    
    // Return updated state
    return {
      ...state,
      status: 'configuring',
      version: state.version + 1
    };
  }

  /**
   * Merge a new state with an existing state, taking the newer version
   * @param currentState Current local game state
   * @param incomingState Incoming game state to merge
   * @returns The updated game state (either current or incoming)
   */
  public static syncState(currentState: GameState | null, incomingState: GameState): GameState {
    // If we don't have a game state yet, just use the incoming state
    if (!currentState) {
      return incomingState;
    }
    
    // Only update if incoming state is for the same game and has a newer version
    if (incomingState.id === currentState.id && incomingState.version > currentState.version) {
      return incomingState;
    }
    
    return currentState;
  }

  /**
   * Check if the game has started
   * @param state Game state to check
   * @returns True if the game has started (status is 'active' or 'ended')
   */
  private static hasGameStarted(state: GameState): boolean {
    return state.status === 'active' || state.status === 'ended';
  }

  /**
   * Check if an entity is an infinite stash
   * @param state Game state to check
   * @param id Entity ID (player or stash)
   * @returns True if the entity is an infinite stash
   */
  private static isInfiniteStash(state: GameState, id: string): boolean {
    return state.stashes[id]?.isInfinite || false;
  }
}

/**
 * Game reducer function that handles all game actions
 * @param state Current game state
 * @param action Action to process
 * @returns Updated game state
 */
export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'START_GAME':
      return GameStateReducer.startGame(state);

    case 'ADD_TRANSACTION':
      return GameStateReducer.processTransaction(state, action.payload);

    case 'END_GAME':
      return GameStateReducer.endGame(state);

    case 'SYNC_STATE':
      return GameStateReducer.syncState(state, action.payload);
      
    case 'ADD_PLAYER':
      return GameStateReducer.addPlayer(
        state, 
        action.payload.playerId, 
        action.payload.playerName
      );
      
    case 'ADD_STASH':
      return GameStateReducer.addStash(
        state,
        action.payload.name,
        action.payload.balance,
        action.payload.isInfinite
      );
      
    case 'UPDATE_STASH':
      return GameStateReducer.updateStash(
        state,
        action.payload.stashId,
        action.payload.updates
      );

    default:
      return state;
  }
}; 