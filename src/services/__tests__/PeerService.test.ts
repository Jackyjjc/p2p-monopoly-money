// Mock the peerjs module before imports
jest.mock('peerjs', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((options) => {
    // Dynamically import FakePeer when the mock is used
    const { FakePeer } = require('./__utils__/fake-peerjs');
    console.log('Creating FakePeer with options:', options);
    return new FakePeer(undefined, options);
  })
}));

import { PeerMessageType, PeerServiceMessage } from '../../types/peerMessages';
import { PeerService } from '../PeerService';


// Helper function to wait for a specified time
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('PeerService', () => {
  let peer1: PeerService;
  let peer2: PeerService;

  beforeEach(() => {
    // Create new instances for each test
    peer1 = new PeerService();
    peer2 = new PeerService();
  });

  afterEach(async () => {
    // Clean up after each test
    await peer1.stop();
    await peer2.stop();
  });

  it('should initialize successfully', async () => {
    await peer1.initConnection(); // Initialize as leader
    const peerId = peer1.getPeerId();
    expect(peerId).toBeTruthy();
  });

  it('should allow peer2 to connect to peer1', async () => {
    // Initialize peer1 as leader
    await peer1.initConnection();
    const peer1Id = peer1.getPeerId();
    expect(peer1Id).toBeTruthy();

    // Initialize peer2
    await peer2.initConnection();
    const peer2Id = peer2.getPeerId();
    expect(peer2Id).toBeTruthy();

    // Connect peer2 to peer1
    await peer2.connectToPeer(peer1Id!);
    
    // Wait for connection to be established
    await wait(500);

    // Verify that peer2 is connected to peer1
    expect(peer2.isConnectedToPeer(peer1Id!)).toBe(true);
  });

  it('should allow sending messages between connected peers', async () => {
    // Set up message listeners
    const peer1MessageSpy = jest.fn();
    const peer2MessageSpy = jest.fn();
    
    peer1.on('message', peer1MessageSpy);
    peer2.on('message', peer2MessageSpy);

    // Initialize and connect peers
    await peer1.initConnection();
    const peer1Id = peer1.getPeerId();
    console.log("peer1Id", peer1Id);

    await peer2.initConnection();
    const peer2Id = peer2.getPeerId();
    console.log("peer2Id", peer2Id);
    await peer2.connectToPeer(peer1Id!);
    
    // Wait for connection to be established
    await wait(500);

    // Create a test message
    const testMessage: PeerServiceMessage = {
      type: PeerMessageType.STATE_SYNC,
      payload: { 
        gameState: { test: 'Hello from peer2' }
      }
    };

    // Send message from peer2 to peer1
    await peer2.sendToPeer(peer1Id!, testMessage);
    console.log("sent message from peer2 to peer1");
    // Wait for message to be processed
    await wait(500);

    // Verify peer1 received the message
    expect(peer1MessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        peerId: peer2Id,
        message: expect.objectContaining({
          payload: { gameState: { test: 'Hello from peer2' } }
        })
      })
    );

    // Create a response message
    const responseMessage: PeerServiceMessage = {
      type: PeerMessageType.STATE_SYNC,
      payload: { 
        gameState: { test: 'Hello from peer1' }
      }
    };

    // Send message from peer1 to peer2
    await peer1.sendToPeer(peer2Id!, responseMessage);
    console.log("sent message from peer1 to peer2");

    // Wait for message to be processed
    await wait(500);

    // Verify peer2 received the message
    expect(peer2MessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        peerId: peer1Id,
        message: expect.objectContaining({
          payload: { gameState: { test: 'Hello from peer1' } }
        })
      })
    );
  });

  it('should broadcast messages from leader to all connected peers', async () => {
    // Set up message listeners
    const peer2MessageSpy = jest.fn();
    const peer3MessageSpy = jest.fn();
    
    // Create a third peer for this test
    const peer3 = new PeerService();
    
    try {
      peer2.on('message', peer2MessageSpy);
      peer3.on('message', peer3MessageSpy);

      // Initialize peer1 as leader
      await peer1.initConnection();
      const peer1Id = peer1.getPeerId();
      
      // Initialize peer2 and peer3
      await peer2.initConnection();
      await peer3.initConnection();
      
      // Connect peer2 and peer3 to peer1 (the leader)
      await peer2.connectToPeer(peer1Id!);
      await peer3.connectToPeer(peer1Id!);
      
      // Wait for connections to be established
      await wait(500);
      
      // Create a broadcast message
      const broadcastMessage: PeerServiceMessage = {
        type: PeerMessageType.STATE_SYNC,
        payload: { 
          gameState: { test: 'Broadcast from leader' }
        }
      };
      
      // Broadcast message from peer1 (leader) to all connected peers
      await peer1.broadcast(broadcastMessage);
      
      // Wait for messages to be processed
      await wait(500);
      
      // Verify both peer2 and peer3 received the broadcast message
      expect(peer2MessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          peerId: peer1Id,
          message: expect.objectContaining({
            payload: { gameState: { test: 'Broadcast from leader' } }
          })
        })
      );
      
      expect(peer3MessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          peerId: peer1Id,
          message: expect.objectContaining({
            payload: { gameState: { test: 'Broadcast from leader' } }
          })
        })
      );
    } finally {
      // Clean up the third peer
      await peer3.stop();
    }
  });

  it('should handle disconnection between peers', async () => {
    try {
      // Set up disconnect listeners
      const peer1DisconnectSpy = jest.fn();
      const peer2DisconnectSpy = jest.fn();
      
      peer1.on('peer:disconnect', peer1DisconnectSpy);
      peer2.on('peer:disconnect', peer2DisconnectSpy);

      // Initialize and connect peers
      await peer1.initConnection();
      const peer1Id = peer1.getPeerId();
      
      await peer2.initConnection();
      const peer2Id = peer2.getPeerId();
      
      await peer2.connectToPeer(peer1Id!);
      
      // Wait for connection to be established
      await wait(500);

      // Disconnect peer2 from peer1
      await peer2.disconnectFromPeer(peer1Id!);
      
      // Wait for disconnection events to propagate
      await wait(500);

      // Verify disconnect events were fired
      expect(peer1DisconnectSpy).toHaveBeenCalledWith(peer2Id);
      expect(peer2DisconnectSpy).toHaveBeenCalledWith(peer1Id);

      // Verify connection status
      expect(peer2.isConnectedToPeer(peer1Id!)).toBe(false);
      expect(peer1.isConnectedToPeer(peer2Id!)).toBe(false);
    } catch (error) {
      console.error('Test failed with error:', error);
      throw error;
    }
  });
}); 