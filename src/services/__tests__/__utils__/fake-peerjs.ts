/**
 * FakePeerJS - A mock implementation of PeerJS for local testing
 * 
 * This library emulates the behavior of PeerJS for local development and testing.
 * It mimics the PeerJS API while keeping all connections local to the browser.
 */

// Event types used in the library
type PeerEventType = 'open' | 'connection' | 'call' | 'close' | 'disconnected' | 'error';
type ConnectionEventType = 'open' | 'data' | 'close' | 'error';

// Options interface similar to PeerJS
interface FakePeerOptions {
  debug?: number;
  host?: string;
  port?: number;
  path?: string;
  key?: string;
  token?: string;
  config?: RTCConfiguration;
  secure?: boolean;
  pingInterval?: number;
  reconnectTimer?: number;
  iceTransportPolicy?: RTCIceTransportPolicy;
  autoCreateConnection?: boolean; // Special option for fake implementation
  connectionDelay?: number; // Simulate network delay
  errorRate?: number; // Simulate random errors (0-1)
}

// Connection metadata similar to PeerJS
interface FakeConnectionMetadata {
  [key: string]: any;
}

/**
 * Main FakePeer class that mimics the Peer class from PeerJS
 */
export class FakePeer {
  private id: string;
  private options: FakePeerOptions;
  private connections: Map<string, FakeDataConnection>;
  private eventHandlers: Map<PeerEventType, Function[]>;
  private isDestroyed: boolean;
  private isConnected: boolean;
  
  // Static registry to keep track of all fake peers for local "networking"
  private static registry: Map<string, FakePeer> = new Map();

  /**
   * Constructor for FakePeer
   * @param id Optional ID for this peer. If not provided, a random one is generated.
   * @param options Configuration options
   */
  constructor(id?: string, options: FakePeerOptions = {}) {
    this.id = id || this.generateRandomId();
    this.options = {
      debug: 0,
      autoCreateConnection: true,
      connectionDelay: 100,
      errorRate: 0,
      ...options
    };
    this.connections = new Map();
    this.eventHandlers = new Map();
    this.isDestroyed = false;
    this.isConnected = false;
    
    // Register this peer in the static registry
    if (FakePeer.registry.has(this.id)) {
      this.emitError('ID already taken');
      return;
    }
    
    FakePeer.registry.set(this.id, this);
    
    // Simulate connection establishment
    setTimeout(() => {
      this.isConnected = true;
      this.emit('open', this.id);
    }, this.options.connectionDelay || 0);
  }

  /**
   * Get this peer's ID
   */
  get(): string {
    return this.id;
  }

  /**
   * Connect to a remote peer
   * @param peer ID of the peer to connect to
   * @param options Optional connection options
   */
  connect(targetPeerId: string, options: any = {}): FakeDataConnection {
    if (this.isDestroyed) {
      throw new Error('This peer has been destroyed');
    }
    
    // Check if the error simulation should trigger
    if (Math.random() < (this.options.errorRate || 0)) {
      this.emitError('Simulated random connection error');
      const errorConn = new FakeDataConnection(this.id, targetPeerId, {});
      setTimeout(() => {
        errorConn.emit('error', new Error('Simulated connection failure'));
      }, this.options.connectionDelay || 0);
      return errorConn;
    }
    
    // Check if target peer exists
    const targetPeer = FakePeer.registry.get(targetPeerId);
    if (!targetPeer) {
      const failedConn = new FakeDataConnection(this.id, targetPeerId, options);
      setTimeout(() => {
        failedConn.emit('error', new Error(`Could not connect to peer ${targetPeerId}`));
      }, this.options.connectionDelay || 0);
      return failedConn;
    }
    
    // Create our side of the connection
    const connection = new FakeDataConnection(this.id, targetPeerId, options);
    this.connections.set(targetPeerId, connection);
    
    // Simulate network delay
    setTimeout(() => {
      // If the target also wants automatic connections
      if (targetPeer.options.autoCreateConnection) {
        console.log("setting up the other end of the connection from ", targetPeerId, " to ", this.id);
        // Create the connection on the other side
        const remoteConnection = new FakeDataConnection(targetPeerId, this.id, options);
        targetPeer.connections.set(this.id, remoteConnection);
        
        // Link the connections (each will see the other's data)
        connection._linkConnection(remoteConnection);
        remoteConnection._linkConnection(connection);
        
        // Notify both sides of the connection
        connection.emit('open');
        targetPeer.emit('connection', remoteConnection);
        remoteConnection.emit('open');
      }
    }, this.options.connectionDelay || 0);
    
    return connection;
  }

  /**
   * Register an event handler
   * @param event Event type
   * @param handler Function to call when the event occurs
   */
  on(event: PeerEventType, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(handler);
  }

  /**
   * Remove an event handler
   * @param event Event type
   * @param handler Function to remove (if not provided, all handlers for this event are removed)
   */
  off(event: PeerEventType, handler?: Function): void {
    if (!handler) {
      this.eventHandlers.delete(event);
      return;
    }
    
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
      if (handlers.length === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  /**
   * Disconnect from the server (simulated)
   */
  disconnect(): void {
    if (this.isDestroyed) {
      return;
    }
    
    this.isConnected = false;
    this.emit('disconnected', this.id);
  }

  /**
   * Reconnect to the server (simulated)
   */
  reconnect(): void {
    if (this.isDestroyed) {
      return;
    }
    
    if (!this.isConnected) {
      setTimeout(() => {
        this.isConnected = true;
        this.emit('open', this.id);
      }, this.options.connectionDelay || 0);
    }
  }

  /**
   * Destroy this peer and clean up all connections
   */
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }
    
    this.isDestroyed = true;
    
    // Close all connections
    this.connections.forEach(conn => {
      conn.close();
    });
    
    // Remove from registry
    FakePeer.registry.delete(this.id);
    
    // Clear maps
    this.connections.clear();
    this.eventHandlers.clear();
    
    // Emit close event
    this.emit('close');
  }

  /**
   * Emit an event to all registered handlers
   * @param event Event type
   * @param args Arguments to pass to the handlers
   */
  private emit(event: PeerEventType, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  /**
   * Emit an error event
   * @param message Error message
   */
  private emitError(message: string): void {
    this.emit('error', new Error(message));
  }

  /**
   * Generate a random ID
   */
  private generateRandomId(): string {
    return 'fake-' + Math.random().toString(36).substring(2, 15);
  }
}

/**
 * FakeDataConnection class that mimics the DataConnection class from PeerJS
 */
export class FakeDataConnection {
  readonly peer: string;
  readonly connectionId: string;
  readonly label: string;
  readonly metadata: FakeConnectionMetadata;
  readonly serialization: string;
  readonly reliable: boolean;
  open: boolean;
  
  private eventHandlers: Map<ConnectionEventType, Function[]>;
  private linkedConnection: FakeDataConnection | null;
  
  constructor(localPeerId: string, remotePeerId: string, options: any = {}) {
    this.peer = remotePeerId;
    this.connectionId = `dc_${localPeerId}_${remotePeerId}_${Date.now()}`;
    this.label = options.label || 'peerjs';
    this.metadata = options.metadata || {};
    this.serialization = options.serialization || 'binary';
    this.reliable = options.reliable !== false;
    this.open = false;
    this.eventHandlers = new Map();
    this.linkedConnection = null;
  }

  /**
   * Link this connection to another one for simulation
   * @param connection The connection to link with
   */
  _linkConnection(connection: FakeDataConnection): void {
    this.linkedConnection = connection;
  }

  /**
   * Send data to the remote peer
   * @param data The data to send
   */
  send(data: any): void {
    if (!this.open) {
      throw new Error('Connection is not open');
    }
    
    if (!this.linkedConnection) {
      this.emit('error', new Error('No linked connection to send data to'));
      return;
    }
    
    // Simulate network delay
    setTimeout(() => {
      this.linkedConnection?.emit('data', data);
    }, 10);
  }

  /**
   * Close the connection
   */
  close(): void {
    if (!this.open) {
      return;
    }
    
    this.open = false;
    this.emit('close');
    
    // Notify the linked connection if it exists
    if (this.linkedConnection) {
      this.linkedConnection.emit('close');
      this.linkedConnection = null;
    }
  }

  /**
   * Register an event handler
   * @param event Event type
   * @param handler Function to call when the event occurs
   */
  on(event: ConnectionEventType, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(handler);
  }

  /**
   * Remove an event handler
   * @param event Event type
   * @param handler Function to remove (if not provided, all handlers for this event are removed)
   */
  off(event: ConnectionEventType, handler?: Function): void {
    if (!handler) {
      this.eventHandlers.delete(event);
      return;
    }
    
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
      if (handlers.length === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  /**
   * Emit an event to all registered handlers
   * @param event Event type
   * @param args Arguments to pass to the handlers
   */
  emit(event: ConnectionEventType, ...args: any[]): void {
    // Special handling for 'open' event to set open state
    if (event === 'open') {
      this.open = true;
    }
    
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }
}