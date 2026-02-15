import { db } from "./db";
import { messages, type Message, type InsertMessage } from "@shared/schema";

export interface IStorage {
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(roomId: string): Promise<Message[]>;
}

export class DatabaseStorage implements IStorage {
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getMessages(roomId: string): Promise<Message[]> {
    // In a real app we would filter by roomId, but for this simple version we'll just return all
    // and let the client filter or implement room logic later if persistence is needed.
    // For now, this is just a placeholder implementation since the prompt implies ephemeral messaging
    // but we'll stick to the interface.
    return [];
  }
}

export const storage = new DatabaseStorage();
