import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export type SignalingMessage =
  | { type: 'join'; roomId: string; username: string }
  | { type: 'joined'; userId: string; users: string[] }
  | { type: 'user_joined'; userId: string; username: string }
  | { type: 'user_left'; userId: string }
  | { type: 'offer'; target: string; caller: string; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; target: string; caller: string; sdp: RTCSessionDescriptionInit }
  | { type: 'candidate'; target: string; caller?: string; candidate: RTCIceCandidateInit }
  | {
      type: 'message';
      roomId: string;
      content: string;
      senderId?: string;
      isSystem?: boolean;
      username?: string;
    }
  | { type: 'error'; message: string };

interface UseWebRTCOptions {
  roomId: string;
  username: string;
  enabled: boolean;
}

interface PeerConnectionMap {
  [userId: string]: RTCPeerConnection;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

const PEER_RECONNECT_DELAY_MS = 2000;

export function useWebRTC({ roomId, username, enabled }: UseWebRTCOptions) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [users, setUsers] = useState<string[]>([]);
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      senderId: string;
      username?: string;
      content: string;
      isSystem?: boolean;
      timestamp: number;
    }>
  >([]);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [connectionState, setConnectionState] = useState<
    'disconnected' | 'connecting' | 'connected'
  >('disconnected');

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<PeerConnectionMap>({});
  const pendingCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const makingOfferRef = useRef<Record<string, boolean>>({});
  const ignoreOfferRef = useRef<Record<string, boolean>>({});
  const reconnectTimersRef = useRef<Record<string, number>>({});
  const localUserIdRef = useRef<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const isInCallRef = useRef(false);
  const usersRef = useRef<string[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    isInCallRef.current = isInCall;
  }, [isInCall]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  const send = useCallback((msg: SignalingMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const addSystemMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        senderId: 'system',
        content,
        isSystem: true,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const attachRemoteAudio = useCallback((peerId: string, stream: MediaStream) => {
    const audioId = `audio-${peerId}`;
    const existing = document.getElementById(audioId) as HTMLAudioElement | null;

    if (existing) {
      if (existing.srcObject !== stream) {
        existing.srcObject = stream;
      }
      return;
    }

    const audio = document.createElement('audio');
    audio.id = audioId;
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.playsInline = true;
    document.body.appendChild(audio);
  }, []);

  const removeRemoteAudio = useCallback((peerId: string) => {
    const audioEl = document.getElementById(`audio-${peerId}`) as HTMLAudioElement | null;
    if (audioEl) {
      // Clean up srcObject before removing to prevent memory leak
      if (audioEl.srcObject) {
        const stream = audioEl.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        audioEl.srcObject = null;
      }
      audioEl.remove();
    }
  }, []);

  const clearReconnectTimer = useCallback((peerId: string) => {
    const timerId = reconnectTimersRef.current[peerId];
    if (timerId) {
      window.clearTimeout(timerId);
      delete reconnectTimersRef.current[peerId];
    }
  }, []);

  const cleanupPeer = useCallback(
    (peerId: string) => {
      clearReconnectTimer(peerId);

      const pc = peersRef.current[peerId];
      if (pc) {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.onnegotiationneeded = null;
        pc.oniceconnectionstatechange = null;
        pc.onconnectionstatechange = null;
        pc.close();
      }

      delete peersRef.current[peerId];
      delete pendingCandidatesRef.current[peerId];
      delete makingOfferRef.current[peerId];
      delete ignoreOfferRef.current[peerId];

      removeRemoteAudio(peerId);
    },
    [clearReconnectTimer, removeRemoteAudio],
  );

  const isPolitePeer = useCallback((peerId: string) => {
    const localUserId = localUserIdRef.current;
    if (!localUserId) {
      return true;
    }

    // Deterministic role split to avoid offer glare.
    return localUserId > peerId;
  }, []);

  const flushPendingCandidates = useCallback(async (peerId: string) => {
    const pc = peersRef.current[peerId];
    if (!pc || !pc.remoteDescription) {
      return;
    }

    const queued = pendingCandidatesRef.current[peerId] || [];
    pendingCandidatesRef.current[peerId] = [];

    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Failed to add queued ICE candidate', err);
      }
    }
  }, []);

  const attachLocalTracks = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
    const senderTrackIds = new Set(
      pc
        .getSenders()
        .map((sender) => sender.track?.id)
        .filter((trackId): trackId is string => Boolean(trackId)),
    );

    stream.getTracks().forEach((track) => {
      if (!senderTrackIds.has(track.id)) {
        pc.addTrack(track, stream);
      }
    });
  }, []);

  const createPeerConnection = useCallback(
    (peerId: string) => {
      const existing = peersRef.current[peerId];
      if (existing) {
        return existing;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peersRef.current[peerId] = pc;
      pendingCandidatesRef.current[peerId] = pendingCandidatesRef.current[peerId] || [];

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          send({
            type: 'candidate',
            target: peerId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) {
          attachRemoteAudio(peerId, stream);
        }
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;

        if (state === 'disconnected') {
          clearReconnectTimer(peerId);
          reconnectTimersRef.current[peerId] = window.setTimeout(() => {
            const current = peersRef.current[peerId];
            if (
              current &&
              (current.iceConnectionState === 'disconnected' ||
                current.iceConnectionState === 'failed')
            ) {
              try {
                current.restartIce();
              } catch (err) {
                console.error('Failed to restart ICE after disconnect', err);
              }
            }
          }, PEER_RECONNECT_DELAY_MS);
        }

        if (state === 'failed') {
          try {
            pc.restartIce();
          } catch (err) {
            console.error('Failed to restart ICE', err);
          }
        }

        if (state === 'closed') {
          cleanupPeer(peerId);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') {
          cleanupPeer(peerId);
          setUsers((prev) => prev.filter((id) => id !== peerId));
        }
      };

      pc.onnegotiationneeded = async () => {
        if (!isInCallRef.current || !localStreamRef.current) {
          return;
        }

        try {
          makingOfferRef.current[peerId] = true;
          await pc.setLocalDescription(await pc.createOffer());

          if (pc.localDescription) {
            send({
              type: 'offer',
              target: peerId,
              caller: '',
              sdp: pc.localDescription,
            });
          }
        } catch (err) {
          console.error('Failed during negotiationneeded', err);
        } finally {
          makingOfferRef.current[peerId] = false;
        }
      };

      return pc;
    },
    [attachRemoteAudio, cleanupPeer, clearReconnectTimer, send],
  );

  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      localStreamRef.current = stream;
      setIsInCall(true);
      setIsMuted(false);
      return stream;
    } catch (err) {
      console.error('Failed to get user media', err);
      toast({
        title: 'Microphone Access Denied',
        description: 'Please allow microphone access to start a call.',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setIsInCall(false);
    setIsMuted(false);

    const peerIds = Object.keys(peersRef.current);
    peerIds.forEach((peerId) => cleanupPeer(peerId));
  }, [cleanupPeer]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) {
      return;
    }

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (!audioTrack) {
      return;
    }

    audioTrack.enabled = !audioTrack.enabled;
    setIsMuted(!audioTrack.enabled);
  }, []);

  const handleSignal = useCallback(
    async (msg: SignalingMessage) => {
      switch (msg.type) {
        case 'joined': {
          localUserIdRef.current = msg.userId;
          setUsers(msg.users);
          setConnectionState('connected');
          toast({ title: 'Connected', description: `Joined room: ${roomId}` });
          break;
        }

        case 'user_joined': {
          setUsers((prev) => (prev.includes(msg.userId) ? prev : [...prev, msg.userId]));
          addSystemMessage(`${msg.username} joined the room`);

          if (isInCallRef.current && localStreamRef.current) {
            const pc = createPeerConnection(msg.userId);
            attachLocalTracks(pc, localStreamRef.current);
          }
          break;
        }

        case 'user_left': {
          setUsers((prev) => prev.filter((id) => id !== msg.userId));
          cleanupPeer(msg.userId);
          addSystemMessage('User left the room');
          break;
        }

        case 'offer': {
          const peerId = msg.caller;
          const pc = createPeerConnection(peerId);

          const offerCollision =
            makingOfferRef.current[peerId] || pc.signalingState !== 'stable';
          const ignoreOffer = !isPolitePeer(peerId) && offerCollision;
          ignoreOfferRef.current[peerId] = ignoreOffer;

          if (ignoreOffer) {
            return;
          }

          if (offerCollision) {
            try {
              await pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit);
            } catch {
              // noop
            }
          }

          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));

          if (isInCallRef.current && localStreamRef.current) {
            attachLocalTracks(pc, localStreamRef.current);
          }

          await flushPendingCandidates(peerId);

          await pc.setLocalDescription(await pc.createAnswer());
          if (pc.localDescription) {
            send({
              type: 'answer',
              target: peerId,
              caller: '',
              sdp: pc.localDescription,
            });
          }
          break;
        }

        case 'answer': {
          const peerId = msg.caller;
          const pc = peersRef.current[peerId];
          if (!pc) {
            return;
          }

          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          await flushPendingCandidates(peerId);
          break;
        }

        case 'candidate': {
          const senderPeerId =
            (msg as { caller?: string; senderId?: string }).caller ||
            (msg as { caller?: string; senderId?: string }).senderId;

          if (!senderPeerId) {
            return;
          }

          const pc = peersRef.current[senderPeerId];
          if (!pc || !pc.remoteDescription) {
            pendingCandidatesRef.current[senderPeerId] = [
              ...(pendingCandidatesRef.current[senderPeerId] || []),
              msg.candidate,
            ];
            return;
          }

          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
          break;
        }

        case 'message': {
          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              senderId: msg.senderId || 'unknown',
              username: msg.username,
              content: msg.content,
              isSystem: msg.isSystem,
              timestamp: Date.now(),
            },
          ]);
          break;
        }

        case 'error': {
          toast({
            title: 'Error',
            description: msg.message,
            variant: 'destructive',
          });
          break;
        }
      }
    },
    [
      addSystemMessage,
      attachLocalTracks,
      cleanupPeer,
      createPeerConnection,
      flushPendingCandidates,
      isPolitePeer,
      roomId,
      send,
      toast,
    ],
  );

  useEffect(() => {
    if (!enabled || !roomId || !username) {
      return;
    }

    setConnectionState('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setSocket(ws);
      send({ type: 'join', roomId, username });
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as SignalingMessage;
        handleSignal(msg).catch((err) => {
          console.error('Failed to handle signaling message', err);
        });
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    ws.onclose = () => {
      setConnectionState('disconnected');
      setSocket(null);
      setUsers([]);
      localUserIdRef.current = null;
      stopLocalStream();
    };

    return () => {
      // Clear all reconnect timers
      Object.values(reconnectTimersRef.current).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      reconnectTimersRef.current = {};

      stopLocalStream();
      ws.close();
    };
  }, [enabled, roomId, username, handleSignal, send, stopLocalStream]);

  const sendMessage = useCallback(
    (content: string) => {
      send({ type: 'message', roomId, content });
    },
    [roomId, send],
  );

  const startCall = useCallback(async () => {
    if (isInCallRef.current && localStreamRef.current) {
      return;
    }

    const stream = await startLocalStream();
    if (!stream) {
      return;
    }

    usersRef.current.forEach((userId) => {
      const pc = createPeerConnection(userId);
      attachLocalTracks(pc, stream);
    });
  }, [attachLocalTracks, createPeerConnection, startLocalStream]);

  const endCall = useCallback(() => {
    stopLocalStream();
  }, [stopLocalStream]);

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
    toggleMute,
  };
}
