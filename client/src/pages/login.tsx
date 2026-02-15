import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Mic, Video, Users, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [, setLocation] = useLocation();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && roomId.trim()) {
      // Navigate to chat room with query params
      setLocation(`/room/${roomId}?username=${encodeURIComponent(username)}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 p-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl opacity-50" />
        <div className="absolute top-[60%] -left-[10%] w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-3xl opacity-50" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8 space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 mb-6 rotate-3">
            <Mic className="text-primary-foreground w-6 h-6" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Mesh Chat</h1>
          <p className="text-muted-foreground text-lg">WebRTC Voice & Text Rooms</p>
        </div>

        <Card className="border-border/50 shadow-xl shadow-black/5 backdrop-blur-xl bg-white/80 dark:bg-zinc-900/80">
          <CardHeader>
            <CardTitle>Join a Room</CardTitle>
            <CardDescription>Enter your details to start chatting instantly.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">Display Name</Label>
                <div className="relative">
                  <Input
                    id="username"
                    placeholder="e.g. Alice"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-11"
                    required
                  />
                  <Users className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="room" className="text-sm font-medium">Room ID</Label>
                <div className="relative">
                  <Input
                    id="room"
                    placeholder="e.g. daily-standup"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="pl-10 h-11"
                    required
                  />
                  <Video className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
              >
                Enter Room
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center mt-6 text-sm text-muted-foreground">
          Secure, peer-to-peer voice chat powered by WebRTC.
        </p>
      </div>
    </div>
  );
}
