import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// We don't need persistent storage for this ephemeral chat app based on the requirements,
// but we'll set up a basic schema for potential future use or history.
// For now, most state (rooms, active calls) will be in-memory for the signaling server.

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  // In a real app we'd have auth, but for this "enter room" style, we just track active sessions
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").notNull(),
  senderId: text("sender_id").notNull(),
  content: text("content").notNull(),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  roomId: true,
  senderId: true,
  content: true,
  isSystem: true,
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// === WebSocket Signaling Types ===

export const WS_EVENTS = {
  JOIN: 'join',
  JOINED: 'joined',
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  OFFER: 'offer',
  ANSWER: 'answer',
  CANDIDATE: 'candidate',
  MESSAGE: 'message',
  ERROR: 'error',
} as const;

export type SignalingMessage =
  | { type: 'join'; roomId: string; username: string }
  | { type: 'joined'; userId: string; users: string[] } // users is list of other userIds
  | { type: 'user_joined'; userId: string; username: string }
  | { type: 'user_left'; userId: string }
  | { type: 'offer'; target: string; caller: string; sdp: any }
  | { type: 'answer'; target: string; caller: string; sdp: any }
  | { type: 'candidate'; target: string; candidate: any }
  | { type: 'message'; roomId: string; content: string; senderId?: string; isSystem?: boolean } // senderId added by server
  | { type: 'error'; message: string };
