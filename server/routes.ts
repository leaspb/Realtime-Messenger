import type { Express } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { SignalingMessage } from "@shared/schema";
import { randomUUID } from "crypto";

interface Client {
  ws: WebSocket;
  userId: string;
  username: string;
  roomId: string;
  isAlive: boolean;
  messageCount: number;
  lastMessageReset: number;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // API Routes
  app.get(api.health.check.path, (req, res) => {
    res.json({ status: "ok" });
  });

  // WebSocket Signaling Server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, Client>(); // userId -> Client

  wss.on('connection', (ws) => {
    let currentUser: Client | null = null;

    // Heartbeat mechanism
    ws.on('pong', () => {
      if (currentUser) {
        currentUser.isAlive = true;
      }
    });

    ws.on('message', async (rawMessage) => {
      try {
        // Rate limiting (except for join messages)
        if (currentUser) {
          const now = Date.now();
          if (now - currentUser.lastMessageReset > 10000) { // Reset every 10 seconds
            currentUser.messageCount = 0;
            currentUser.lastMessageReset = now;
          }

          currentUser.messageCount++;
          if (currentUser.messageCount > 50) { // Max 50 messages per 10 seconds
            ws.send(JSON.stringify({ type: 'error', message: 'Rate limit exceeded' }));
            return;
          }
        }

        // Validate message size
        if (rawMessage.length > 100000) { // 100KB limit
          ws.send(JSON.stringify({ type: 'error', message: 'Message too large' }));
          return;
        }

        const message = JSON.parse(rawMessage.toString()) as SignalingMessage;

        // Validate message type
        if (!message || typeof message.type !== 'string') {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
          return;
        }

        switch (message.type) {
          case 'join': {
            // Validate join message fields
            if (!message.roomId || typeof message.roomId !== 'string' || message.roomId.length > 100) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid room ID' }));
              return;
            }
            if (!message.username || typeof message.username !== 'string' || message.username.length > 50) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid username' }));
              return;
            }
            const userId = randomUUID();
            currentUser = {
              ws,
              userId,
              username: message.username,
              roomId: message.roomId,
              isAlive: true,
              messageCount: 0,
              lastMessageReset: Date.now()
            };
            clients.set(userId, currentUser);

            // Notify sender of success and list of other users in the room
            const usersInRoom = Array.from(clients.values())
              .filter(c => c.roomId === message.roomId && c.userId !== userId)
              .map(c => c.userId);

            const joinedMsg: SignalingMessage = {
              type: 'joined',
              userId,
              users: usersInRoom
            };

            try {
              ws.send(JSON.stringify(joinedMsg));
            } catch (err) {
              console.error('Failed to send joined message:', err);
            }

            // Notify others in the room
            const userJoinedMsg: SignalingMessage = {
              type: 'user_joined',
              userId,
              username: message.username
            };
            broadcastToRoom(message.roomId, userJoinedMsg, userId);
            break;
          }

          case 'message': {
            if (!currentUser) {
              ws.send(JSON.stringify({ type: 'error', message: 'Not joined to a room' }));
              return;
            }

            // Validate message content
            if (!message.content || typeof message.content !== 'string' || message.content.length > 10000) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid message content' }));
              return;
            }

            // Broadcast chat message to room
            const chatMsg: SignalingMessage = {
              type: 'message',
              roomId: currentUser.roomId,
              content: message.content,
              senderId: currentUser.userId
            };
            broadcastToRoom(currentUser.roomId, chatMsg); // Broadcast to everyone including sender for confirmation/ordering
            break;
          }

          case 'offer':
          case 'answer':
          case 'candidate': {
            if (!currentUser) {
              ws.send(JSON.stringify({ type: 'error', message: 'Not joined to a room' }));
              return;
            }

            // Direct signaling between peers
            const target = 'target' in message ? message.target : null;
            if (!target || typeof target !== 'string') {
              ws.send(JSON.stringify({ type: 'error', message: 'Missing or invalid target' }));
              return;
            }

            const targetClient = clients.get(target);
            if (!targetClient) {
              ws.send(JSON.stringify({ type: 'error', message: 'Target user not found' }));
              return;
            }

            if (targetClient.roomId !== currentUser.roomId) {
              ws.send(JSON.stringify({ type: 'error', message: 'Target user in different room' }));
              return;
            }

            if (targetClient) {
              let signalingForward: SignalingMessage;

              if (message.type === 'offer') {
                signalingForward = {
                  type: 'offer',
                  target: target,
                  caller: currentUser.userId,
                  sdp: message.sdp
                };
              } else if (message.type === 'answer') {
                signalingForward = {
                  type: 'answer',
                  target: target,
                  caller: currentUser.userId,
                  sdp: message.sdp
                };
              } else {
                signalingForward = {
                  type: 'candidate',
                  target: target,
                  caller: currentUser.userId,
                  candidate: message.candidate
                };
              }

              if (targetClient.ws.readyState === WebSocket.OPEN) {
                try {
                  targetClient.ws.send(JSON.stringify(signalingForward));
                } catch (err) {
                  console.error('Failed to send signaling message:', err);
                }
              }
            }
            break;
          }

          default: {
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
            break;
          }
        }
      } catch (err) {
        console.error('WebSocket error:', err);
        try {
          ws.send(JSON.stringify({ type: 'error', message: 'Failed to process message' }));
        } catch (sendErr) {
          console.error('Failed to send error message:', sendErr);
        }
      }
    });

    ws.on('close', () => {
      if (currentUser) {
        clients.delete(currentUser.userId);
        const leftMsg: SignalingMessage = {
          type: 'user_left',
          userId: currentUser.userId
        };
        broadcastToRoom(currentUser.roomId, leftMsg);
      }
    });
  });

  function broadcastToRoom(roomId: string, message: SignalingMessage, excludeUserId?: string) {
    const closedClients: string[] = [];

    for (const client of clients.values()) {
      if (client.roomId === roomId && client.userId !== excludeUserId) {
        if (client.ws.readyState === WebSocket.OPEN) {
          try {
            client.ws.send(JSON.stringify(message));
          } catch (err) {
            console.error('Failed to broadcast message:', err);
            closedClients.push(client.userId);
          }
        } else if (client.ws.readyState === WebSocket.CLOSED) {
          closedClients.push(client.userId);
        }
      }
    }

    // Clean up closed connections
    for (const userId of closedClients) {
      clients.delete(userId);
    }
  }

  // Heartbeat to detect dead connections
  const heartbeatInterval = setInterval(() => {
    const deadClients: string[] = [];

    for (const client of clients.values()) {
      if (!client.isAlive) {
        client.ws.terminate();
        deadClients.push(client.userId);
        continue;
      }

      client.isAlive = false;
      try {
        client.ws.ping();
      } catch (err) {
        console.error('Failed to send ping:', err);
        deadClients.push(client.userId);
      }
    }

    // Clean up dead connections
    for (const userId of deadClients) {
      const client = clients.get(userId);
      if (client) {
        clients.delete(userId);
        // Notify room that user left
        broadcastToRoom(client.roomId, { type: 'user_left', userId });
      }
    }
  }, 30000); // Check every 30 seconds

  // Clean up on server shutdown
  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  return httpServer;
}
