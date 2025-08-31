import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { useAuth } from "../hooks/use-auth";
import { useWebSocket } from "../hooks/use-websocket";
import { 
  ArrowLeft, 
  Send, 
  Phone, 
  Video, 
  MoreVertical, 
  Paperclip, 
  Image as ImageIcon,
  MapPin,
  Clock,
  Check,
  CheckCheck
} from 'lucide-react';
import { toast } from "../hooks/use-toast";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  timestamp: number;
  type: 'text' | 'image' | 'location' | 'system';
  attachments?: Array<{
    type: string;
    url: string;
    name: string;
  }>;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  orderId?: string;
}

interface ChatParticipant {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: number;
}

interface ChatSession {
  id: string;
  orderId?: string;
  participants: ChatParticipant[];
  messages: ChatMessage[];
  type: 'support' | 'order' | 'general';
  status: 'active' | 'closed';
}

export default function LiveChatEnhanced() {
  const { user } = useAuth();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const { socket, isConnected } = useWebSocket({
    onNewMessage: (data: any) => {
      const newMessage: ChatMessage = {
        id: data.id,
        senderId: data.senderId,
        senderName: data.senderName,
        senderRole: data.senderRole,
        message: data.message,
        timestamp: data.timestamp,
        type: data.type || 'text',
        attachments: data.attachments,
        status: 'delivered',
        orderId: data.orderId
      };

      setChatSessions(prev => prev.map(session => {
        if (session.id === data.chatId || session.orderId === data.orderId) {
          return {
            ...session,
            messages: [...session.messages, newMessage]
          };
        }
        return session;
      }));

      // Show notification if not in active session
      if (activeSession?.id !== data.chatId) {
        toast({
          title: `New message from ${data.senderName}`,
          description: data.message.slice(0, 50) + (data.message.length > 50 ? '...' : ''),
        });
      }
    },
    onTypingUpdate: (data: any) => {
      setTypingUsers(prev => {
        if (data.isTyping) {
          return prev.includes(data.userId) ? prev : [...prev, data.userId];
        } else {
          return prev.filter(id => id !== data.userId);
        }
      });

      // Clear typing indicator after 3 seconds
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(id => id !== data.userId));
      }, 3000);
    },
    onUserStatusUpdate: (data: any) => {
      setChatSessions(prev => prev.map(session => ({
        ...session,
        participants: session.participants.map(participant => 
          participant.id === data.userId 
            ? { ...participant, isOnline: data.isOnline, lastSeen: data.lastSeen }
            : participant
        )
      })));
    },
    onRoleBasedMessage: (data: any) => {
      // Handle role-specific message features
      if (data.messageType === 'driver_location') {
        // Handle driver location updates
        setChatSessions(prev => prev.map(session => {
          if (session.id === data.chatId) {
            const locationMessage: ChatMessage = {
              id: data.id,
              senderId: data.senderId,
              senderName: data.senderName,
              senderRole: 'driver',
              message: `📍 Location shared`,
              timestamp: data.timestamp,
              type: 'location',
              status: 'delivered',
              orderId: data.orderId
            };
            return { ...session, messages: [...session.messages, locationMessage] };
          }
          return session;
        }));
      }
    }
  });

  const loadChatSessions = async () => {
    try {
      const response = await fetch('/api/chat/sessions', {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to load chat sessions');

      const data = await response.json();
      setChatSessions(data.sessions || []);

      // Auto-select first active session
      const activeSessions = data.sessions.filter((s: ChatSession) => s.status === 'active');
      if (activeSessions.length > 0) {
        setActiveSession(activeSessions[0]);
        loadChatMessages(activeSessions[0].id);
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load chat sessions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadChatMessages = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chat/messages/${chatId}`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to load messages');

      const data = await response.json();

      setChatSessions(prev => prev.map(session => 
        session.id === chatId 
          ? { ...session, messages: data.messages || [] }
          : session
      ));
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !activeSession || !socket) return;

    const tempMessage: ChatMessage = {
      id: 'temp_' + Date.now(),
      senderId: user?.id || '',
      senderName: user?.firstName + ' ' + user?.lastName || '',
      senderRole: user?.role || '',
      message: message.trim(),
      timestamp: Date.now(),
      type: 'text',
      status: 'sending'
    };

    // Add message optimistically
    setChatSessions(prev => prev.map(session => 
      session.id === activeSession.id 
        ? { ...session, messages: [...session.messages, tempMessage] }
        : session
    ));

    try {
      const response = await fetch('/api/chat/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          chatId: activeSession.id,
          message: message.trim(),
          type: 'text',
          orderId: activeSession.orderId
        })
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();

      // Update message with server response
      setChatSessions(prev => prev.map(session => 
        session.id === activeSession.id 
          ? { 
              ...session, 
              messages: session.messages.map(msg => 
                msg.id === tempMessage.id 
                  ? { ...msg, id: data.messageId, status: 'sent' }
                  : msg
              )
            }
          : session
      ));

      setMessage('');
      setIsTyping(false);
    } catch (error) {
      console.error('Error sending message:', error);

      // Update message status to failed
      setChatSessions(prev => prev.map(session => 
        session.id === activeSession.id 
          ? { 
              ...session, 
              messages: session.messages.map(msg => 
                msg.id === tempMessage.id 
                  ? { ...msg, status: 'sent' } // Keep as sent for now
                  : msg
              )
            }
          : session
      ));

      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const handleTyping = useCallback(() => {
    if (!activeSession || !socket) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing_start', { 
        chatId: activeSession.id,
        userId: user?.id,
        userName: user?.firstName + ' ' + user?.lastName
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing_stop', { 
        chatId: activeSession.id,
        userId: user?.id 
      });
    }, 2000);
  }, [activeSession, socket, user, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sending': return <Clock className="h-3 w-3 text-gray-400" />;
      case 'sent': return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered': return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'read': return <CheckCheck className="h-3 w-3 text-blue-500" />;
      default: return null;
    }
  };

  useEffect(() => {
    loadChatSessions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages]);

  useEffect(() => {
    if (activeSession && socket) {
      socket.emit('join_chat', { chatId: activeSession.id });

      return () => {
        socket.emit('leave_chat', { chatId: activeSession.id });
      };
    }
  }, [activeSession, socket]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-96 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto flex h-screen">
        {/* Chat Sessions Sidebar */}
        <div className="w-80 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Messages</h2>
            <div className="flex items-center space-x-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-xs text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {chatSessions.map(session => (
              <div
                key={session.id}
                onClick={() => {
                  setActiveSession(session);
                  loadChatMessages(session.id);
                }}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                  activeSession?.id === session.id ? 'bg-blue-50 border-r-4 border-r-blue-500' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={session.participants[0]?.avatar} />
                      <AvatarFallback>
                        {session.participants[0]?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {session.participants[0]?.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">
                        {session.participants.filter(p => p.id !== user?.id)[0]?.name || 'Unknown'}
                      </p>
                      <Badge 
                        variant="secondary" 
                        className="text-xs"
                      >
                        {session.type}
                      </Badge>
                    </div>

                    {session.orderId && (
                      <p className="text-xs text-gray-500">Order #{session.orderId.slice(-6)}</p>
                    )}

                    {session.messages.length > 0 && (
                      <p className="text-xs text-gray-600 truncate mt-1">
                        {session.messages[session.messages.length - 1].message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {activeSession ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white border-b flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={activeSession.participants[0]?.avatar} />
                    <AvatarFallback>
                      {activeSession.participants.filter(p => p.id !== user?.id)[0]?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">
                      {activeSession.participants.filter(p => p.id !== user?.id)[0]?.name}
                    </h3>
                    <p className="text-xs text-gray-600">
                      {activeSession.participants.filter(p => p.id !== user?.id)[0]?.isOnline 
                        ? 'Online' 
                        : 'Last seen ' + formatTime(activeSession.participants.filter(p => p.id !== user?.id)[0]?.lastSeen || Date.now())}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeSession.messages.map((msg, index) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                        msg.senderId === user?.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {msg.type === 'location' ? (
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-5 w-5" />
                          <p className="text-sm">Location shared</p>
                        </div>
                      ) : (
                        <p className="text-sm">{msg.message}</p>
                      )}
                      <div className={`flex items-center justify-end space-x-1 mt-1 ${
                        msg.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        <span className="text-xs">{formatTime(msg.timestamp)}</span>
                        {msg.senderId === user?.id && getMessageStatusIcon(msg.status)}
                      </div>
                    </div>
                  </div>
                ))}

                {typingUsers.length > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 px-4 py-2 rounded-2xl">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 bg-white border-t">
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  <div className="flex-1 relative">
                    <Input
                      ref={messageInputRef}
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value);
                        handleTyping();
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          sendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      className="rounded-full pr-12"
                    />

                    <Button
                      onClick={sendMessage}
                      disabled={!message.trim()}
                      size="sm"
                      className="absolute right-1 top-1 rounded-full"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No conversation selected</h3>
                <p className="text-gray-600">Choose a conversation from the sidebar to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}