import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useWebRTC } from "@/hooks/use-webrtc";
import { ChatLayout } from "@/components/chat-layout";
import { ActiveUsersList } from "@/components/active-users-list";
import { ChatArea } from "@/components/chat-area";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Loader2, Users } from "lucide-react";

export default function RoomPage() {
  const [, params] = useRoute("/room/:id");
  const [location] = useLocation();
  const [isMobileUsersOpen, setIsMobileUsersOpen] = useState(false);

  // Parse query params for username
  const searchParams = new URLSearchParams(window.location.search);
  const username = searchParams.get("username");
  const roomId = params?.id;

  // Redirect if missing data
  if (!roomId || !username) {
    window.location.href = "/";
    return null;
  }

  const {
    socket,
    users,
    messages,
    isInCall,
    isMuted,
    connectionState,
    sendMessage,
    startCall,
    endCall,
    toggleMute
  } = useWebRTC({
    roomId,
    username,
    enabled: true
  });

  if (connectionState === 'connecting') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-medium animate-pulse">Connecting to room...</p>
      </div>
    );
  }

  // Mobile sidebar content
  const sidebarContent = (
    <ActiveUsersList 
      users={users} 
      currentUserId={username} // Simplification: using username as ID for display
      isInCall={isInCall}
    />
  );

  return (
    <ChatLayout
      sidebar={sidebarContent}
      chat={
        <>
          {/* Mobile Users Toggle */}
          <div className="md:hidden absolute top-4 right-4 z-50">
            <Sheet open={isMobileUsersOpen} onOpenChange={setIsMobileUsersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full shadow-md bg-background/80 backdrop-blur-sm">
                  <Users className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80">
                {sidebarContent}
              </SheetContent>
            </Sheet>
          </div>

          <ChatArea
            messages={messages}
            onSendMessage={sendMessage}
            onStartCall={startCall}
            onEndCall={endCall}
            onToggleMute={toggleMute}
            isInCall={isInCall}
            isMuted={isMuted}
            currentUserId={undefined} // Server handles ID generation, we rely on "Me" logic in ChatArea being loosely typed or derived
          />
        </>
      }
    />
  );
}
