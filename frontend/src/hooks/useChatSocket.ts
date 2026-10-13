import { useState, useEffect, useCallback, useRef } from 'react';
// @ts-ignore - Ignore module declaration warning
import { io, Socket } from 'socket.io-client';
import { getServerUrl } from '@/utils/apiUrl';

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  isSelf: boolean;
}

export const useChatSocket = (userId: string, activeChatId: string | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Generate a consistent Room ID based on the two users
  const getRoomId = useCallback((id1: string, id2: string) => {
    return [String(id1), String(id2)].sort().join('_');
  }, []);

  useEffect(() => {
    const SERVER_URL = getServerUrl();
    
    const socket = io(SERVER_URL || undefined, {
      transports: ['websocket', 'polling'],
      auth: { token: userId }
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to Socket.io backend');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from Socket.io backend');
    });

    const handleReceiveMessage = (message: ChatMessage) => {
      // Skip incoming messages that we sent ourselves to prevent duplicates 
      // (the optimistic UI update already added it immediately when clicking send)
      if (message.senderId === userId) return;

      // Ensure the message belongs to the currently active chat before appending
      if (message.senderId === activeChatId || message.receiverId === activeChatId) {
        setMessages((prev) => {
          if (prev.some(m => m.id === message.id)) return prev;
          // When receiving, it is NOT 'self' for this client
          return [...prev, { ...message, isSelf: false }];
        });
      }
    };

    socket.on('receiveMessage', handleReceiveMessage);

    socket.on('typing_start', ({ senderId }: { senderId: string }) => {
      if (senderId === activeChatId) setIsTyping(true);
    });

    socket.on('typing_stop', ({ senderId }: { senderId: string }) => {
      if (senderId === activeChatId) setIsTyping(false);
    });

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.disconnect();
    };
  }, [userId, activeChatId]);

  // Handle Room Joining when activeChatId changes
  useEffect(() => {
    if (socketRef.current && activeChatId) {
      const roomId = getRoomId(userId, activeChatId);
      socketRef.current.emit('join_room', roomId);
    }
  }, [activeChatId, userId, getRoomId]);

  const sendMessage = useCallback((text: string, receiverId: string) => {
    if (!socketRef.current) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: userId,
      receiverId,
      text,
      timestamp: new Date().toISOString(),
      isSelf: true,
    };

    // Optimistic UI update
    setMessages((prev) => [...prev, newMessage]);

    const roomId = getRoomId(userId, receiverId);

    // Emit to backend
    socketRef.current.emit('sendMessage', {
      roomId,
      message: newMessage
    });
  }, [userId, getRoomId]);

  const sendTypingStatus = useCallback((receiverId: string, isTyping: boolean) => {
    if (!socketRef.current) return;

    const roomId = getRoomId(userId, receiverId);
    
    socketRef.current.emit(isTyping ? 'typing_start' : 'typing_stop', {
      roomId,
      senderId: userId
    });
  }, [userId, getRoomId]);

  const seedMessages = useCallback((initialMessages: ChatMessage[]) => {
    setMessages(initialMessages);
  }, []);

  const fetchChatHistory = useCallback(async (receiverId: string) => {
    try {
      const roomId = getRoomId(userId, receiverId);
      const SERVER_URL = getServerUrl();
      const response = await fetch(`${SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')}/api/messages/${roomId}`);
      
      if (!response.ok) throw new Error('Failed to fetch messages');
      
      const data = await response.json();
      
      // Map the messages to determine isSelf
      const formatted = data.map((msg: any) => ({
        ...msg,
        isSelf: msg.senderId === userId
      }));
      
      setMessages(formatted);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  }, [userId, getRoomId]);

  return {
    messages,
    isTyping,
    isConnected,
    sendMessage,
    sendTypingStatus,
    seedMessages,
    fetchChatHistory
  };
};
