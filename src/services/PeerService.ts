/**
 * This is a thin wrapper around the PeerJS library.
 * It maintains a peer-to-peer network of connected peers.
 * 
 * Events emitted by PeerService:
 * - 'status': Emitted when the connection status to the signal server changes. Payload: ConnectionStatus enum value.
 * - 'peer:connect': Emitted when a new peer connection is established. Payload: remotePeerId (string).
 * - 'peer:disconnect': Emitted when a peer disconnects. Payload: remotePeerId (string).
 * - 'error': Emitted when any error occurs in the peer connection or message handling. Payload: { message: string, originalError: Error }.
 * - 'message': Emitted when a message is received from a peer. Payload: { peerId: string, message: Message }.
 */
import Peer, { DataConnection } from 'peerjs';
import { EventEmitter } from 'events';
import { PeerServiceMessage } from '../types/peerMessages';
import { validateMessage } from '../utils';

export class PeerService extends EventEmitter {
  private initialized: boolean = false;
  private peer: Peer | null = null;

  private connectedPeers: Map<string, DataConnection> = new Map();
  private pendingConnections: Map<string, Promise<void>> = new Map();

  /**
   * Private constructor to enforce singleton pattern
   */
  public constructor() {
    super();
  }

  /**
   * Initialize the PeerJS instance, set up event listeners and connect to the signal server.
   * @returns Promise that resolves when the peer is connected to the signal server and has a peer ID.
   */
  public async initConnection(): Promise<string> {
    console.log('PeerService initialize is called');

    if (this.initialized) {
      console.log('PeerService is already initialized or being initialized');
      if (this.peer?.id) {
        return this.peer.id;
      }
      throw new Error('Peer is initialized but has no ID');
    } 

    this.initialized = true;
    
    // Create a new Peer instance with a random ID
    // TODO: use a custom ID if we had a game in progress and we disconnected.
    this.peer = new Peer({
      config: {
        // TODO: add TURN server for NAT traversal
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    this.setupEventListeners();
    
    // Promise to wait for the peer to be fully connected to the signal server. We only get a peer ID after the connection is open.
    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection to signal server timed out'));
      }, 10000);
      
      // Handle successful connection to the signal server. It means we now has a peer ID and can accept connections from other peers or connect to other peers.
      this.peer?.on('open', (id) => {
        clearTimeout(timeout);
        console.log('Connected to signal server with peer ID:', id);
        resolve(id);
      });

      // Handle connection error
      this.peer?.on('error', (error) => {
        clearTimeout(timeout);
        console.error('Failed to connect to signal server:', error);
        reject(error);
      });
    });
  }

  /**
   *  Set up event listeners for peer events
   */
  private setupEventListeners(): void {
    if (!this.peer) return;

    // Handle incoming connections from other peers
    this.peer.on('connection', (connection) => {
      const remotePeerId = connection.peer;
      
      connection.on('open', () => {
        console.log(`Peer ${remotePeerId} connected to us`);
        this.connectedPeers.set(remotePeerId, connection);
        this.emit('peer:connect', remotePeerId);
      });

      connection.on('close', () => {
        console.log(`Peer ${remotePeerId} disconnected from us`);
        this.connectedPeers.delete(remotePeerId);
        this.emit('peer:disconnect', remotePeerId);
      });

      connection.on('error', (error) => {
        console.error(`Connection error with peer ${remotePeerId}:`, error);
        this.emit('error', {
          message: `Connection error with peer ${remotePeerId}`,
          originalError: error
        });
      });

      // Handle incoming data
      connection.on('data', (data) => {
        this.handleMessage(remotePeerId, data as PeerServiceMessage);
      });
    });

    // Handle disconnection
    this.peer.on('disconnected', () => {
      console.log('Disconnected from signaling server');
    });

    // Handle errors
    this.peer.on('error', (error) => {
      console.error('PeerJS error:', error);
      
      this.emit('error', {
        message: 'An error occurred in the PeerJS instance',
        originalError: error
      });
    });
  }

  /**
   * Connect to a peer using their peer ID
   * @param remotePeerId The peer ID to connect to
   * @returns Promise that resolves when connected
   */
  public async connectToPeer(remotePeerId: string): Promise<void> {
    if (this.peer == null || !this.initialized) {
      throw new Error('PeerService is not initialized');
    }

    // Check if already connected
    if (this.connectedPeers.has(remotePeerId)) {
      console.log('Already connected to peer:', remotePeerId);
      return;
    }

    if (this.pendingConnections.has(remotePeerId)) {
      console.log('Already connecting to peer:', remotePeerId);
      return this.pendingConnections.get(remotePeerId);
    }

    // Connect to the peer
    const connection = this.peer?.connect(remotePeerId, {
      reliable: true
    });

    // Wait for the connection to open
    const pendingConnection = new Promise<void>((resolve, reject) => {
      // Set a timeout for the connection
      const timeout = setTimeout(() => {
        reject(new Error(`Connection to peer ${remotePeerId} timed out`));
      }, 10000); // 10 seconds timeout

      connection.on('open', () => {
        clearTimeout(timeout);
        this.connectedPeers.set(remotePeerId, connection);
        this.pendingConnections.delete(remotePeerId);
        console.log('Connected to peer:', remotePeerId);
        
        connection.on('close', () => {
          console.log('Disconnected from peer:', remotePeerId);
          this.connectedPeers.delete(remotePeerId);
          this.emit('peer:disconnect', remotePeerId);
        });

        connection.on('error', (error) => {
          console.error(`Connection error with peer ${remotePeerId}:`, error);
          this.pendingConnections.delete(remotePeerId);
          this.emit('error', {
            message: `Connection error with peer ${remotePeerId}`,
            originalError: error
          });
        });


        connection.on('data', (data) => {
          this.handleMessage(remotePeerId, data as PeerServiceMessage);
        });

        this.emit('peer:connect', remotePeerId);
        
        resolve();
      });

      connection.on('error', (error) => {
        clearTimeout(timeout);
        console.error('Failed to connect to peer:', error);
        this.pendingConnections.delete(remotePeerId);
        reject(error);
      });
    });

    this.pendingConnections.set(remotePeerId, pendingConnection);
    return pendingConnection;
  }

  /**
   * Get the current peer's ID
   * @returns The peer ID or null if not initialized
   */
  public getPeerId(): string | null {
    return this.peer?.id || null;
  }

  /**
   * Get all connected peers
   * @returns Array of peer IDs
   */
  public getPeers(): string[] {
    return Array.from(this.connectedPeers.keys());
  }

  /**
   * Handle an incoming message
   * @param senderId The peer ID that sent the message
   * @param message The message
   */
  private handleMessage(senderId: string, message: PeerServiceMessage): void {
    // Validate the message
    if (!validateMessage(message)) {
      console.error('Invalid message received:', message);
      return;
    }
    
    // Forward all data messages to listeners
    this.emit('message', { peerId: senderId, message });
  }

  /**
   * Send a message to all connected peers
   * @param message The message to send
   */
  public async broadcast(message: PeerServiceMessage): Promise<void> {
    if (this.peer == null || !this.initialized) {
      throw new Error('PeerService is not initialized');
    }

    console.log('Broadcasting message:', message);
    
    const promises = Array.from(this.connectedPeers.keys())
      .map((peerId) => this.sendToPeer(peerId, message));
    
    await Promise.allSettled(promises);
  }

  /**
   * Send a message to a specific peer
   * @param peerId The peer ID to send to
   * @param message The message to send
   */
  public async sendToPeer(peerId: string, message: PeerServiceMessage): Promise<void> {
    if (this.peer == null || !this.initialized) {
      throw new Error('PeerService is not initialized');
    }

    console.log("sending message to peer ", peerId, " with message", message);

    const connection = this.connectedPeers.get(peerId);
    if (!connection) {
      const error = new Error(`No connection to peer ${peerId}`);
      this.emit('error', {
        message: `No connection to peer ${peerId}`,
        originalError: error
      });
      throw error;
    }

    try {
      connection.send(message);
    } catch (error) {
      console.error('Failed to send message to peer:', error);
      this.emit('error', {
        message: `Failed to send message to peer ${peerId}`,
        originalError: error
      });
      throw error;
    }
  }

  /**
   * Disconnect from a specific peer
   * @param peerId The peer ID to disconnect from
   */
  public async disconnectFromPeer(peerId: string): Promise<void> {
    const connection = this.connectedPeers.get(peerId);
    if (connection) {
      connection.close();
      this.connectedPeers.delete(peerId);
      console.log('Disconnected from peer:', peerId);
    }
  }

  /**
   * Check if connected to a specific peer
   * @param peerId The peer ID to check
   * @returns True if connected to the peer
   */
  public isConnectedToPeer(peerId: string): boolean {
    return this.connectedPeers.has(peerId);
  }

  /**
   * Stop the PeerJS instance and clean up
   */
  public async stop(): Promise<void> {
    console.log('Stopping PeerJS instance');
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
      console.log('PeerJS instance stopped');
    }

    // Close all connections
    for (const connection of this.connectedPeers.values()) {
      connection.close();
    }
    this.pendingConnections.clear();
    this.connectedPeers.clear();
  }
}