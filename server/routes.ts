import type { Express } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { SignalingMessage } from "@shared/schema";

interface Client {
  ws: WebSocket;
  userId: string;
  username: string;
  roomId: string;
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

    ws.on('message', async (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString()) as SignalingMessage;
        
        switch (message.type) {
          case 'join': {
            const userId = Math.random().toString(36).substring(7);
            currentUser = {
              ws,
              userId,
              username: message.username,
              roomId: message.roomId
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
            ws.send(JSON.stringify(joinedMsg));

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
            if (!currentUser) return;
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
            if (!currentUser) return;
            // Direct signaling between peers
            const targetClient = clients.get((message as any).target);
            if (targetClient && targetClient.roomId === currentUser.roomId) {
              const signalingForward: SignalingMessage = {
                ...message,
                caller: currentUser.userId // Ensure caller ID is set correctly
              } as any;
              targetClient.ws.send(JSON.stringify(signalingForward));
            }
            break;
          }
        }
      } catch (err) {
        console.error('WebSocket error:', err);
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
    for (const client of clients.values()) {
      if (client.roomId === roomId && client.userId !== excludeUserId) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify(message));
        }
      }
    }
  }

  return httpServer;
}
