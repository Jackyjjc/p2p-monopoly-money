/**
 * GameService encapsulates game state and peer service functionality
 * It exposes methods to change the game state and query connection status
 * UI and other components should not directly modify the game state or have access to the peer service
 */
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { 
  GameState, 
  Player, 
  Stash, 
  Transaction,
  DataMessage
} from '../types';
import { PeerService } from './PeerService';
import { MessageService } from './MessageService';

// Game events
export enum GameEvent {
  STATE_CHANGED = 'state_changed',
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  TRANSACTION_ADDED = 'transaction_added',
  STASH_ADDED = 'stash_added',
  STASH_UPDATED = 'stash_updated',
  ADMIN_CHANGED = 'admin_changed',
  GAME_STARTED = 'game_started',
  GAME_ENDED = 'game_ended',
  ERROR = 'error'
}

export class GameService extends EventEmitter {
  private isAdmin: boolean = false;

  private peerService: PeerService;
  private gameState: GameState | null = null;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(peerService: PeerService) {
    super();
    this.peerService = peerService;
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for peer service events
   */
  private setupEventListeners(): void {
    // Listen for peer connection events
    this.peerService.on('peer:connect', (remotePeerId: string) => {
      this.handlePeerConnect(remotePeerId);
    });
    
    // Listen for messages from peers
    this.peerService.on('message', ({ peerId, message }: { peerId: string, message: any }) => {
      this.handleDataMessage(peerId, message as DataMessage);
    });
  }

  /**
   * Create a new game state
   * @param displayName Display name for the game
   */
  public createNewGame(displayName: string = 'New Game', playerName: string = 'Admin'): void {
    const peerId = this.peerService.getPeerId();
    if (!peerId) {
      throw new Error('Peer ID not available. Make sure PeerService is initialized.');
    }

    this.isAdmin = true;

    // Create a new player for the current user (admin)
    const player: Player = {
      peerId,
      name: playerName, // Default name, can be changed later
      balance: 0,
      isAdmin: true,
    };

    // Create initial game state
    this.gameState = {
      id: uuidv4(),
      displayName,
      status: 'configuring',
      players: { [peerId]: player },
      stashes: {},
      transactions: [],
      createdAt: Date.now(),
      version: 1
    };
    
    // Emit state changed event
    this.emit(GameEvent.STATE_CHANGED, this.gameState);
  }

  /**
   * Check if the game has started
   * @returns True if the game has started (status is 'active' or 'ended')
   */
  private hasGameStarted(): boolean {
    if (!this.gameState) {
      return false;
    }
    
    return this.gameState.status === 'active' || this.gameState.status === 'ended';
  }

  /**
   * Handle peer connection event.
   * @param remotePeerId Peer ID of the connected peer
   */
  private handlePeerConnect(remotePeerId: string): void {
    if (!this.isAdmin) {
      // Only admin can modify the game state. Others should wait for admin to broadcast the game state.
      return;
    }

    if (!this.gameState) {
      throw new Error('Game not initialized');
    }

    // Check if the player already exists
    if (!this.gameState.players[remotePeerId]) {
      // Check if the game has already started
      if (this.hasGameStarted()) {
        this.emit(GameEvent.ERROR, {
          code: 'game_already_started',
          message: 'Cannot add new players after the game has started.'
        });
        return;
      }
      
      // Add new player
      this.gameState.players[remotePeerId] = {
        peerId: remotePeerId,
        name: `Player ${Object.keys(this.gameState.players).length + 1}`,
        balance: 0,
        isAdmin: false,
      };
      
      // Increment version
      this.gameState.version++;
      
      this.broadcastGameState();
      
      // Emit player joined event
      this.emit(GameEvent.PLAYER_JOINED, this.gameState.players[remotePeerId]);
    }
  }

  /**
   * Handle data message from a peer
   * @param senderId Peer ID of the sender
   * @param message Data message
   */
  private handleDataMessage(senderId: string, message: DataMessage): void {
    // if i'm the sender, ignore the message
    if (senderId === this.peerService.getPeerId()) {
      return;
    }

    try {
      // Parse the game state from the message payload
      const receivedState = JSON.parse(message.payload) as GameState;
      
      // Validate the received state
      if (!receivedState || !receivedState.id) {
        console.error('Invalid game state received:', receivedState);
        return;
      }
      
      // If we don't have a game state yet, or our version is older, update it
      if (!this.gameState || receivedState.version > this.gameState.version) {
        this.gameState = receivedState
        this.emit(GameEvent.STATE_CHANGED, this.gameState);
      }
    } catch (error) {
      console.error('Error handling data message:', error);
    }
  }

  /**
   * Broadcast the current game state to all connected peers. Only admin should call this.
   */
  private broadcastGameState(): void {
    if (!this.gameState) {
      return;
    }

    if (!this.isAdmin) {
      throw new Error('Only admin can broadcast game state');
    }

    const peerId = this.peerService.getPeerId();
    if (!peerId) {
      console.error('Peer ID not available. Cannot broadcast game state.');
      return;
    }
    
    try {
      const dataMessage = MessageService.createDataMessage(peerId, this.gameState);
      this.peerService.broadcast(dataMessage);
    } catch (error) {
      console.error('Error broadcasting game state:', error);
    }
  }

  /**
   * Get the current game state
   * @returns Current game state or null if not initialized
   */
  public getGameState(): GameState | null {
    return this.gameState;
  }

  /**
   * Update player information
   * @param playerId Peer ID of the player to update
   * @param updates Partial player object with updates
   */
  public updatePlayer(playerId: string, updates: Partial<Player>): void {
    if (!this.gameState || !this.gameState.players[playerId]) {
      throw new Error(`Player ${playerId} not found`);
    }

    // Only admin can update other players
    if (playerId !== this.peerService.getPeerId() && !this.isAdmin) {
      throw new Error('Only the admin can update other players');
    }
    
    // If game has started, only allow updating player name
    if (this.hasGameStarted() && updates.balance !== undefined) {
      throw new Error('Cannot update player balance after the game has started. Use transactions instead.');
    }
    
    // Update player properties
    this.gameState.players[playerId] = {
      ...this.gameState.players[playerId],
      ...updates
    };
    
    // Increment version
    this.gameState.version++;
    
    if (this.isAdmin) {
      this.broadcastGameState();
    }
    
    // Emit state changed event
    this.emit(GameEvent.STATE_CHANGED, this.gameState);
  }

  /**
   * Add a new stash
   * @param name Stash name
   * @param balance Initial balance
   * @param isInfinite Whether the stash has infinite balance
   * @returns The created stash
   */
  public addStash(name: string, balance: number = 0, isInfinite: boolean = false): Stash {
    if (!this.gameState) {
      throw new Error('Game not initialized');
    }

    // Only admin can add stashes
    if (!this.isAdmin) {
      throw new Error('Only the admin can add stashes');
    }
    
    // Check if the game has already started
    if (this.hasGameStarted()) {
      throw new Error('Cannot add new stashes after the game has started');
    }
    
    // Create new stash
    const stash: Stash = {
      id: uuidv4(),
      name,
      balance,
      isInfinite
    };
    
    // Add to game state
    this.gameState.stashes[stash.id] = stash;
    
    // Increment version
    this.gameState.version++;
    
    this.broadcastGameState();
    
    // Emit stash added event
    this.emit(GameEvent.STASH_ADDED, stash);
    
    return stash;
  }

  /**
   * Update a stash
   * @param stashId ID of the stash to update
   * @param updates Partial stash object with updates
   */
  public updateStash(stashId: string, updates: Partial<Stash>): void {
    if (!this.gameState || !this.gameState.stashes[stashId]) {
      throw new Error(`Stash ${stashId} not found`);
    }

    // Only admin can update stashes
    if (!this.isAdmin) {
      throw new Error('Only the admin can update stashes');
    }
    
    // If game has started, only allow updating stash name
    if (this.hasGameStarted() && (updates.balance !== undefined || updates.isInfinite !== undefined)) {
      throw new Error('Cannot update stash balance or infinite status after the game has started. Use transactions instead.');
    }
    
    // Update stash properties
    this.gameState.stashes[stashId] = {
      ...this.gameState.stashes[stashId],
      ...updates
    };
    
    // Increment version
    this.gameState.version++;
    
    this.broadcastGameState();
    
    // Emit stash updated event
    this.emit(GameEvent.STASH_UPDATED, this.gameState.stashes[stashId]);
  }

  /**
   * Add a new transaction
   * @param senderId ID of the sender (player or stash)
   * @param receiverId ID of the receiver (player or stash)
   * @param amount Transaction amount
   * @returns The created transaction
   */
  public addTransaction(senderId: string, receiverId: string, amount: number): Transaction {
    if (!this.gameState) {
      throw new Error('Game not initialized');
    }

    // Only admin can add transactions
    if (!this.isAdmin) {
      throw new Error('Only the admin can add transactions');
    }
    
    // Validate transaction
    if (amount <= 0) {
      throw new Error('Transaction amount must be positive');
    }
    
    // Check if sender exists (player or stash)
    const sender = this.gameState.players[senderId] || this.gameState.stashes[senderId];
    if (!sender) {
      throw new Error(`Sender ${senderId} not found`);
    }
    
    // Check if receiver exists (player or stash)
    const receiver = this.gameState.players[receiverId] || this.gameState.stashes[receiverId];
    if (!receiver) {
      throw new Error(`Receiver ${receiverId} not found`);
    }
    
    // Check if sender has enough balance (unless it's an infinite stash)
    if (!this.isInfiniteStash(senderId) && sender.balance < amount) {
      throw new Error(`Sender ${senderId} has insufficient balance`);
    }
    
    // Create transaction
    const transaction: Transaction = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderId,
      receiverId,
      amount,
      isEdited: false
    };
    
    // Update balances
    if (!this.isInfiniteStash(senderId)) {
      if (this.gameState.players[senderId]) {
        this.gameState.players[senderId].balance -= amount;
      } else if (this.gameState.stashes[senderId]) {
        this.gameState.stashes[senderId].balance -= amount;
      }
    }
    
    if (!this.isInfiniteStash(receiverId)) {
      if (this.gameState.players[receiverId]) {
        this.gameState.players[receiverId].balance += amount;
      } else if (this.gameState.stashes[receiverId]) {
        this.gameState.stashes[receiverId].balance += amount;
      }
    }
    
    // Add transaction to game state
    this.gameState.transactions.push(transaction);
    
    // Increment version
    this.gameState.version++;
    
    this.broadcastGameState();
    
    // Emit transaction added event
    this.emit(GameEvent.TRANSACTION_ADDED, transaction);
    
    return transaction;
  }

  /**
   * Edit an existing transaction
   * @param transactionId ID of the transaction to edit
   * @param newAmount New transaction amount
   */
  public editTransaction(transactionId: string, newAmount: number): void {
    if (!this.gameState) {
      throw new Error('Game not initialized');
    }

    // Only admin can edit transactions
    if (!this.isAdmin) {
      throw new Error('Only the admin can edit transactions');
    }
    
    // Find the transaction
    const transactionIndex = this.gameState.transactions.findIndex(t => t.id === transactionId);
    if (transactionIndex === -1) {
      throw new Error(`Transaction ${transactionId} not found`);
    }
    
    const transaction = this.gameState.transactions[transactionIndex];
    
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }
    
    // Validate new amount
    if (newAmount <= 0) {
      throw new Error('Transaction amount must be positive');
    }
    
    // Store original amount if this is the first edit
    if (!transaction.isEdited) {
      transaction.originalAmount = transaction.amount;
    }
    
    // Calculate the difference in amount
    const amountDifference = newAmount - transaction.amount;
    
    // Update balances
    if (amountDifference !== 0) {
      // Adjust sender balance (deduct more or refund)
      if (!this.isInfiniteStash(transaction.senderId)) {
        const senderPlayer = this.gameState.players[transaction.senderId];
        const senderStash = this.gameState.stashes[transaction.senderId];
        
        if (senderPlayer) {
          // Check if sender has enough balance for the increase
          if (amountDifference > 0 && 
              senderPlayer.balance < amountDifference) {
            throw new Error(`Sender ${transaction.senderId} has insufficient balance for the edit`);
          }
          senderPlayer.balance -= amountDifference;
        } else if (senderStash) {
          // Check if stash has enough balance for the increase
          if (amountDifference > 0 && 
              senderStash.balance < amountDifference) {
            throw new Error(`Stash ${transaction.senderId} has insufficient balance for the edit`);
          }
          senderStash.balance -= amountDifference;
        }
      }
      
      // Adjust receiver balance (add more or deduct)
      if (!this.isInfiniteStash(transaction.receiverId)) {
        const receiverPlayer = this.gameState.players[transaction.receiverId];
        const receiverStash = this.gameState.stashes[transaction.receiverId];
        
        if (receiverPlayer) {
          // Check if receiver has enough balance for the decrease
          if (amountDifference < 0 && 
              receiverPlayer.balance < Math.abs(amountDifference)) {
            throw new Error(`Receiver ${transaction.receiverId} has insufficient balance for the edit`);
          }
          receiverPlayer.balance += amountDifference;
        } else if (receiverStash) {
          // Check if stash has enough balance for the decrease
          if (amountDifference < 0 && 
              receiverStash.balance < Math.abs(amountDifference)) {
            throw new Error(`Stash ${transaction.receiverId} has insufficient balance for the edit`);
          }
          receiverStash.balance += amountDifference;
        }
      }
    }
    
    // Update transaction
    transaction.amount = newAmount;
    transaction.isEdited = true;
    
    // Increment version
    this.gameState.version++;
    
    this.broadcastGameState();
    
    // Emit state changed event
    this.emit(GameEvent.STATE_CHANGED, this.gameState);
  }

  /**
   * Start the game
   */
  public startGame(): void {
    if (!this.gameState) {
      throw new Error('Game not initialized');
    }

    // Only admin can start the game
    if (!this.isAdmin) {
      throw new Error('Only the admin can start the game');
    }
    
    // Check if there are any players
    if (Object.keys(this.gameState.players).length === 0) {
      throw new Error('Cannot start a game with no players');
    }
    
    // Update game status
    this.gameState.status = 'active';
    this.gameState.startedAt = Date.now();
    
    // Increment version
    this.gameState.version++;
    
    this.broadcastGameState();
    
    // Emit game started event
    this.emit(GameEvent.GAME_STARTED, this.gameState);
  }

  /**
   * End the game
   */
  public endGame(): void {
    if (!this.gameState) {
      throw new Error('Game not initialized');
    }

    // Only admin can end the game
    if (!this.isAdmin) {
      throw new Error('Only the admin can end the game');
    }
    
    // Update game status
    this.gameState.status = 'ended';
    this.gameState.endedAt = Date.now();
    
    // Increment version
    this.gameState.version++;
    
    this.broadcastGameState();
    
    // Emit game ended event
    this.emit(GameEvent.GAME_ENDED, this.gameState);
  }

  /**
   * Check if an entity is an infinite stash
   * @param id Entity ID (player or stash)
   * @returns True if the entity is an infinite stash
   */
  private isInfiniteStash(id: string): boolean {
    return this.gameState?.stashes[id]?.isInfinite || false;
  }

  /**
   * Set the game to configuring state
   * This is a clear indication that the admin is configuring the game before starting it
   */
  public setConfiguringState(): void {
    if (!this.gameState) {
      throw new Error('Game not initialized');
    }

    // Only admin can change game state
    if (!this.isAdmin) {
      throw new Error('Only the admin can change the game state');
    }
    
    // Check if the game is in configuring state
    if (this.gameState.status !== 'configuring') {
      throw new Error(`Cannot set configuring state when game is in ${this.gameState.status} state`);
    }
    
    // Update game status
    this.gameState.status = 'configuring';
    
    // Increment version
    this.gameState.version++;
    
    this.broadcastGameState();
    
    // Emit state changed event
    this.emit(GameEvent.STATE_CHANGED, this.gameState);
  }

  /**
   * Stop the game service and clean up resources
   */
  public async stop(): Promise<void> {
    // Clean up event listeners
    this.removeAllListeners();
    
    // Stop the peer service
    await this.peerService.stop();
    
    // Reset state
    this.gameState = null;
  }
} 