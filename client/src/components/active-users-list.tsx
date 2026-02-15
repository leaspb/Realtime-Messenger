import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { User, Mic, MicOff } from "lucide-react";

interface ActiveUsersListProps {
  users: string[]; // List of user IDs
  currentUserId?: string;
  isInCall?: boolean;
}

// In a real app we'd map IDs to names, here we mock or use what we have
export function ActiveUsersList({ users, currentUserId, isInCall }: ActiveUsersListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold flex items-center gap-2">
          <User className="w-4 h-4" />
          Active Users ({users.length})
        </h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {users.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No other users yet
            </div>
          )}
          {users.map((userId) => (
            <div key={userId} className="flex items-center gap-3 group">
              <Avatar className="h-8 w-8 border-2 border-background ring-2 ring-muted group-hover:ring-primary/20 transition-all">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {userId.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">
                  User {userId.slice(0, 8)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userId === currentUserId ? 'You' : 'Online'}
                </p>
              </div>
              {/* Status indicators */}
              <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
