import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

// Types matching the schema provided
export type SignalingMessage =
  | { type: 'join'; roomId: string; username: string }
  | { type: 'joined'; userId: string; users: string[] }
  | { type: 'user_joined'; userId: string; username: string }
  | { type: 'user_left'; userId: string }
  | { type: 'offer'; target: string; caller: string; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; target: string; caller: string; sdp: RTCSessionDescriptionInit }
  | { type: 'candidate'; target: string; candidate: RTCIceCandidateInit }
  | { type: 'message'; roomId: string; content: string; senderId?: string; isSystem?: boolean; username?: string }
  | { type: 'error'; message: string };

interface UseWebRTCOptions {
  roomId: string;
  username: string;
  enabled: boolean;
}

interface PeerConnectionMap {
  [userId: string]: RTCPeerConnection;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

export function useWebRTC({ roomId, username, enabled }: UseWebRTCOptions) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [users, setUsers] = useState<string[]>([]);
  const [messages, setMessages] = useState<Array<{
    id: string;
    senderId: string;
    username?: string;
    content: string;
    isSystem?: boolean;
    timestamp: number;
  }>>([]);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<PeerConnectionMap>({});
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  // Helper to safely send JSON
  const send = useCallback((msg: SignalingMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // Initialize Audio/Video Stream
  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setIsInCall(true);
      return stream;
    } catch (err) {
      console.error('Failed to get user media', err);
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to start a call.",
        variant: "destructive"
      });
      return null;
    }
  };

  // Stop all tracks
  const stopLocalStream = () => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    setIsInCall(false);
    setIsMuted(false);
    
    // Close all peer connections
    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Create Peer Connection
  const createPeerConnection = (targetUserId: string, stream: MediaStream | null) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        send({
          type: 'candidate',
          target: targetUserId,
          candidate: event.candidate.toJSON()
        });
      }
    };

    pc.ontrack = (event) => {
      // Create audio element for remote stream
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.autoplay = true;
      audio.id = `audio-${targetUserId}`;
      // Append to document if not exists (usually we manage this in React, but direct DOM is easier for dynamic audio elements)
      if (!document.getElementById(`audio-${targetUserId}`)) {
        document.body.appendChild(audio);
      }
    };

    if (stream) {
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
    }

    peersRef.current[targetUserId] = pc;
    return pc;
  };

  // Handle incoming signals
  const handleSignal = async (msg: SignalingMessage) => {
    switch (msg.type) {
      case 'joined':
        setUsers(msg.users);
        setConnectionState('connected');
        toast({ title: "Connected", description: `Joined room: ${roomId}` });
        break;

      case 'user_joined':
        setUsers(prev => [...prev, msg.userId]);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          senderId: 'system',
          content: `${msg.username} joined the room`,
          isSystem: true,
          timestamp: Date.now()
        }]);
        
        // If we are in a call, connect to the new user
        if (isInCall && localStreamRef.current) {
          const pc = createPeerConnection(msg.userId, localStreamRef.current);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          send({
            type: 'offer',
            target: msg.userId,
            caller: socketRef.current?.url || '', // server handles caller ID, this is placeholder
            sdp: offer
          });
        }
        break;

      case 'user_left':
        setUsers(prev => prev.filter(id => id !== msg.userId));
        // Remove audio element
        const audioEl = document.getElementById(`audio-${msg.userId}`);
        if (audioEl) audioEl.remove();
        // Close PC
        if (peersRef.current[msg.userId]) {
          peersRef.current[msg.userId].close();
          delete peersRef.current[msg.userId];
        }
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          senderId: 'system',
          content: `User left the room`,
          isSystem: true,
          timestamp: Date.now()
        }]);
        break;

      case 'offer':
        // Incoming call offer
        // If we are not in a call, we might want to auto-join or ask (for now, let's assume auto-accept audio if "in call" logic allows, 
        // OR better: if we receive an offer, we accept it if we are ready. 
        // In this mesh, usually everyone should join explicitly. 
        // IF we receive an offer, it means someone else is in a call. 
        // We only create an answer if WE have also started the call (clicked Join Call).
        // However, standard mesh often negotiates regardless. Let's negotiate but only send track if we have one.
        
        const pcOffer = peersRef.current[msg.caller] || createPeerConnection(msg.caller, localStreamRef.current);
        await pcOffer.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        
        // Only answer if we have set remote desc successfully
        const answer = await pcOffer.createAnswer();
        await pcOffer.setLocalDescription(answer);
        
        send({
          type: 'answer',
          target: msg.caller,
          caller: '', // server handles
          sdp: answer
        });
        break;

      case 'answer':
        const pcAnswer = peersRef.current[msg.caller];
        if (pcAnswer) {
          await pcAnswer.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        }
        break;

      case 'candidate':
        const pcCand = peersRef.current[msg.target]; // msg.target in 'candidate' message from server context implies who sent it? 
        // Actually the server usually forwards "candidate" from A to B. So "target" in the received message is ME, but I need to look up the sender.
        // Wait, the type definition: { type: 'candidate'; target: string; candidate: any }
        // When SENDING, target is the remote peer.
        // When RECEIVING, the server usually wraps it or we deduce sender. 
        // Let's assume the server modifies the message to include `senderId` or `caller`.
        // We'll cast `msg` to include `senderId` or `caller` as per standard signaling patterns for this implementation.
        // Re-checking schema... Schema says `target` and `candidate`. 
        // In a real app, the server MUST tell us who sent this candidate. 
        // Assuming the server adds a `senderId` field to forwarded messages.
        const candidateMsg = msg as any;
        const senderId = candidateMsg.senderId || candidateMsg.caller; // Fallback
        
        if (senderId && peersRef.current[senderId]) {
          await peersRef.current[senderId].addIceCandidate(new RTCIceCandidate(msg.candidate));
        }
        break;

      case 'message':
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          senderId: msg.senderId || 'unknown',
          username: msg.username,
          content: msg.content,
          isSystem: msg.isSystem,
          timestamp: Date.now()
        }]);
        break;
        
      case 'error':
        toast({ title: "Error", description: msg.message, variant: "destructive" });
        break;
    }
  };

  // Connect to WebSocket
  useEffect(() => {
    if (!enabled || !roomId || !username) return;

    setConnectionState('connecting');
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setSocket(ws);
      send({ type: 'join', roomId, username });
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleSignal(msg);
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    ws.onclose = () => {
      setConnectionState('disconnected');
      setSocket(null);
    };

    return () => {
      stopLocalStream();
      ws.close();
    };
  }, [enabled, roomId, username]);

  const sendMessage = (content: string) => {
    send({ type: 'message', roomId, content });
  };

  const startCall = async () => {
    const stream = await startLocalStream();
    if (stream) {
      // Initiate offers to all existing users
      users.forEach(async (userId) => {
        const pc = createPeerConnection(userId, stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        send({
          type: 'offer',
          target: userId,
          caller: '', // handled by server
          sdp: offer
        });
      });
    }
  };

  const endCall = () => {
    stopLocalStream();
  };

  return {
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
  };
}
