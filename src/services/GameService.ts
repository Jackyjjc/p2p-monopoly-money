/**
 * GameService encapsulates game state and peer service functionality
 * It exposes methods to change the game state and query connection status
 * UI and other components should not directly modify the game state or have access to the peer service
 */
import { 
  GameState, 
  Player, 
  Stash, 
  Transaction
} from '../types';
import { PeerServiceMessage, PeerMessageType } from '../types/peerMessages';
import { PeerService } from './PeerService';
import { createDataMessage } from '../utils';
import { GameStateUpdater } from './GameStateUpdater';

export class GameService {
  private isAdmin: boolean = false;

  private peerService: PeerService;
  private gameState: GameState | null = null;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(peerService: PeerService) {
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
      this.handlePeerMessage(peerId, message as PeerServiceMessage);
    });
  }

  /**
   * Initializes a new GameState or loads an existing one
   * @param options Optional partial GameState to initialize with
   */
  public initGame(options?: Partial<GameState>): void {
    const peerId = this.peerService.getPeerId();
    if (!peerId) {
      throw new Error('Peer ID not available. Make sure PeerService is initialized.');
    }

    // Use GameStateUpdater to initialize the game state
    this.gameState = GameStateUpdater.initGame(peerId, options);
    
    // Check if current user is admin
    this.isAdmin = !!this.gameState.players[peerId]?.isAdmin;
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

    try {
      // Use GameStateUpdater to add the player to the game state
      this.gameState = GameStateUpdater.addPlayer(this.gameState, remotePeerId);
      this.broadcastGameState();
    } catch (error) {
      console.error('Error handling peer connect:', error);
    }
  }

  /**
   * Handle data message from a peer
   * @param senderId Peer ID of the sender
   * @param message Data message
   */
  private handlePeerMessage(senderId: string, message: PeerServiceMessage): void {
    // if i'm the sender, ignore the message
    if (senderId === this.peerService.getPeerId()) {
      return;
    }

    try {
      // Handle different message types based on the type
      if (message.type === PeerMessageType.STATE_SYNC) {
        // Parse the game state from the message payload
        const receivedState = message.payload.gameState as GameState;
        
        // Validate the received state
        if (!receivedState || !receivedState.id) {
          console.error('Invalid game state received:', receivedState);
          return;
        }
        
        // Use GameStateUpdater to sync the state
        this.gameState = GameStateUpdater.syncState(this.gameState, receivedState);
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

    if (this.peerService.getPeers().length === 0) {
      return;
    }

    const connectedPeers = this.peerService.getPeers();
    
    // Broadcast game state to all connected peers
    connectedPeers.forEach((peerId: string) => {
      const dataMessage = createDataMessage(peerId, this.gameState);
      this.peerService.broadcast(dataMessage);
    });
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
    if (!this.gameState) {
      throw new Error('Game not initialized');
    }

    // Only admin can update other players
    if (playerId !== this.peerService.getPeerId() && !this.isAdmin) {
      throw new Error('Only the admin can update other players');
    }
    
    try {
      // Use GameStateUpdater to update the player
      this.gameState = GameStateUpdater.updatePlayer(this.gameState, playerId, updates);
      
      if (this.isAdmin) {
        this.broadcastGameState();
      }
    } catch (error) {
      console.error('Error updating player:', error);
      throw error;
    }
  }

  /**
   * Add a new stash
   * @param name Stash name
   * @param balance Initial balance
   * @param isInfinite Whether the stash has infinite balance
   */
  public addStash(name: string, balance: number = 0, isInfinite: boolean = false): void {
    if (!this.gameState) {
      throw new Error('Game not initialized');
    }

    // Only admin can add stashes
    if (!this.isAdmin) {
      throw new Error('Only the admin can add stashes');
    }
    
    try {
      // Use GameStateUpdater to add the stash
      const updatedState = GameStateUpdater.addStash(this.gameState, name, balance, isInfinite);
      this.gameState = updatedState;
      this.broadcastGameState();
      
      // Get the latest added stash (last key in stashes)
      const stashId = Object.keys(updatedState.stashes).pop();
      if (!stashId || !updatedState.stashes[stashId]) {
        throw new Error('Failed to create stash');
      }
    } catch (error) {
      console.error('Error adding stash:', error);
      throw error;
    }
  }

  /**
   * Update a stash
   * @param stashId ID of the stash to update
   * @param updates Partial stash object with updates
   */
  public updateStash(stashId: string, updates: Partial<Stash>): void {
    if (!this.gameState) {
      throw new Error('Game not initialized');
    }

    // Only admin can update stashes
    if (!this.isAdmin) {
      throw new Error('Only the admin can update stashes');
    }
    
    try {
      // Use GameStateUpdater to update the stash
      this.gameState = GameStateUpdater.updateStash(this.gameState, stashId, updates);
      this.broadcastGameState();
    } catch (error) {
      console.error('Error updating stash:', error);
      throw error;
    }
  }

  /**
   * Processes a transaction request from a player
   * @param transaction Transaction to process
   */
  public processTransaction(transaction: Transaction): void {
    if (!this.gameState) {
      throw new Error('Game not initialized');
    }

    try {
      // If not admin, forward the transaction request to admin
      if (!this.isAdmin) {
        const adminPeerId = Object.keys(this.gameState.players).find(
          key => this.gameState!.players[key]!.isAdmin
        );
        
        if (!adminPeerId) {
          throw new Error('Admin not found');
        }
        
        // Create transaction request message
        const dataMessage = createDataMessage(adminPeerId, {
          type: 'transaction_request',
          payload: { transaction }
        });
        
        // Send to admin
        this.peerService.sendToPeer(adminPeerId, dataMessage);
        return;
      }
      
      // Use GameStateUpdater to process the transaction
      this.gameState = GameStateUpdater.processTransaction(this.gameState, transaction);
      this.broadcastGameState();
    } catch (error) {
      console.error('Error processing transaction:', error);
    }
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
    
    try {
      // Use GameStateUpdater to start the game
      this.gameState = GameStateUpdater.startGame(this.gameState);
      this.broadcastGameState();
    } catch (error) {
      console.error('Error starting game:', error);
      throw error;
    }
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
    
    try {
      // Use GameStateUpdater to end the game
      this.gameState = GameStateUpdater.endGame(this.gameState);
      this.broadcastGameState();
    } catch (error) {
      console.error('Error ending game:', error);
      throw error;
    }
  }

  /**
   * Merges a new state (broadcast by the admin) into the local state if the version is higher
   * @param incomingState The incoming GameState to sync with
   */
  public syncState(incomingState: GameState): void {
    if (!this.gameState) {
      // If we don't have a game state yet, just use the incoming state
      this.gameState = incomingState;
      return;
    }
    
    try {
      // Use GameStateUpdater to sync the state
      this.gameState = GameStateUpdater.syncState(this.gameState, incomingState);
    } catch (error) {
      console.error('Error syncing state:', error);
      throw error;
    }
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
    
    try {
      // Use GameStateUpdater to set the configuring state
      this.gameState = GameStateUpdater.setConfiguringState(this.gameState);
      this.broadcastGameState();
    } catch (error) {
      console.error('Error setting configuring state:', error);
      throw error;
    }
  }

  /**
   * Stop the game service and clean up resources
   */
  public async stop(): Promise<void> {
    // Stop the peer service
    await this.peerService.stop();
    
    // Reset state
    this.gameState = null;
  }
} 