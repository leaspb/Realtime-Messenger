import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Message {
  id: string;
  senderId: string;
  username?: string;
  content: string;
  isSystem?: boolean;
  timestamp: number;
}

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  onStartCall: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  isInCall: boolean;
  isMuted: boolean;
  currentUserId?: string;
}

export function ChatArea({
  messages,
  onSendMessage,
  onStartCall,
  onEndCall,
  onToggleMute,
  isInCall,
  isMuted,
  currentUserId
}: ChatAreaProps) {
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onSendMessage(inputValue);
    setInputValue("");
  };

  return (
    <div className="flex flex-col h-full bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
      {/* Header / Call Controls */}
      <div className="p-4 border-b flex items-center justify-between bg-white dark:bg-zinc-900 shadow-sm z-10">
        <div className="flex flex-col">
          <h3 className="font-bold text-lg">Room Chat</h3>
          <span className="text-xs text-muted-foreground">
            {isInCall ? "Voice Active - Mesh Connected" : "Ready to join call"}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {isInCall ? (
            <>
              <Button
                variant={isMuted ? "destructive" : "secondary"}
                size="icon"
                onClick={onToggleMute}
                className="rounded-full w-10 h-10 transition-all duration-300"
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Button
                variant="destructive"
                onClick={onEndCall}
                className="gap-2 rounded-full px-6 shadow-red-500/20 shadow-lg hover:shadow-red-500/40 transition-all"
              >
                <PhoneOff className="w-4 h-4" />
                <span className="hidden sm:inline">End Call</span>
              </Button>
            </>
          ) : (
            <Button
              onClick={onStartCall}
              className="gap-2 rounded-full px-6 bg-green-600 hover:bg-green-700 text-white shadow-green-500/20 shadow-lg hover:shadow-green-500/40 transition-all hover:-translate-y-0.5"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">Start Call</span>
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-4 max-w-3xl mx-auto pb-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}
          
          {messages.map((msg, index) => {
            // Check if previous message was from same user to group visually
            const isSequential = index > 0 && messages[index - 1].senderId === msg.senderId && !msg.isSystem;
            const isMe = msg.senderId === currentUserId; // In real app, match actual ID

            if (msg.isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                    {msg.content}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[80%] animate-message-slide-in",
                  isMe ? "self-end items-end" : "self-start items-start",
                  isSequential ? "mt-1" : "mt-4"
                )}
              >
                {!isSequential && !isMe && (
                  <span className="text-xs text-muted-foreground ml-1 mb-1 font-medium">
                    {msg.username || 'User ' + msg.senderId.slice(0, 4)}
                  </span>
                )}
                
                <div
                  className={cn(
                    "px-4 py-2 rounded-2xl text-sm shadow-sm",
                    isMe 
                      ? "bg-primary text-primary-foreground rounded-tr-sm" 
                      : "bg-white dark:bg-zinc-800 border rounded-tl-sm"
                  )}
                >
                  {msg.content}
                </div>
                
                {!isSequential && (
                  <span className="text-[10px] text-muted-foreground mt-1 mx-1 opacity-70">
                    {format(msg.timestamp, "h:mm a")}
                  </span>
                )}
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-zinc-900 border-t">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 max-w-3xl mx-auto relative"
        >
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="pr-12 py-6 rounded-full border-muted-foreground/20 focus-visible:ring-primary/20 shadow-sm"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!inputValue.trim()}
            className="absolute right-1.5 h-9 w-9 rounded-full bg-primary hover:bg-primary/90 transition-transform active:scale-95"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
