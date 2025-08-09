import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, Video, MoreVertical, Paperclip, Smile, MapPin, Camera, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessage {
  id: string;
  senderId: number;
  senderName: string;
  senderRole: string;
  message: string;
  messageType: 'TEXT' | 'IMAGE' | 'LOCATION' | 'VOICE' | 'FILE';
  timestamp: Date;
  attachments?: any[];
  isRead?: boolean;
}

interface ChatParticipant {
  id: number;
  name: string;
  role: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

interface RealTimeChatSystemProps {
  roomId: string;
  roomType: 'customer-merchant' | 'customer-driver' | 'support';
  participants: ChatParticipant[];
  currentUserId: number;
  orderInfo?: {
    orderId: string;
    orderNumber: string;
    status: string;
  };
}

export const RealTimeChatSystem: React.FC<RealTimeChatSystemProps> = ({
  roomId,
  roomType,
  participants,
  currentUserId,
  orderInfo
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    connected,
    chatMessages,
    sendChatMessage,
    joinChatRoom,
    leaveChatRoom,
    presenceUpdates
  } = useRealTimeUpdates();

  // Filter messages for this room
  const roomMessages = chatMessages.filter(msg => msg.roomId === roomId);

  // Get online participants
  const onlineParticipants = participants.filter(p => 
    presenceUpdates.some(presence => presence.userId === p.id && presence.status === 'online')
  );

  // Join room on mount
  useEffect(() => {
    joinChatRoom(roomId, roomType);
    return () => leaveChatRoom(roomId);
  }, [roomId, roomType, joinChatRoom, leaveChatRoom]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages]);

  // Handle typing indicator
  const handleTyping = (isTypingNow: boolean) => {
    if (isTypingNow !== isTyping) {
      setIsTyping(isTypingNow);
      // Send typing indicator via WebSocket
      if (connected) {
        // webSocketService would handle this
      }
    }

    if (isTypingNow) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 3000);
    }
  };

  const handleSendMessage = () => {
    if (message.trim() && connected) {
      sendChatMessage({
        roomId,
        message: message.trim(),
        messageType: 'TEXT'
      });
      setMessage('');
      handleTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    handleTyping(e.target.value.length > 0);
  };

  const getMessageAlignment = (senderId: number) => {
    return senderId === currentUserId ? 'justify-end' : 'justify-start';
  };

  const getMessageStyle = (senderId: number) => {
    return senderId === currentUserId
      ? 'bg-blue-500 text-white ml-12'
      : 'bg-gray-100 text-gray-900 mr-12';
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'merchant':
        return 'bg-green-100 text-green-800';
      case 'driver':
        return 'bg-blue-100 text-blue-800';
      case 'consumer':
        return 'bg-purple-100 text-purple-800';
      case 'support':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAttachment = (type: string) => {
    setIsAttachmentOpen(false);
    // Handle different attachment types
    switch (type) {
      case 'camera':
        // Open camera
        break;
      case 'location':
        // Share location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position) => {
            sendChatMessage({
              roomId,
              message: `📍 Location shared`,
              messageType: 'LOCATION',
              attachments: [{
                type: 'location',
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              }]
            });
          });
        }
        break;
      case 'file':
        // Open file picker
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,application/pdf,.doc,.docx';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            // Handle file upload
            console.log('File selected:', file);
          }
        };
        input.click();
        break;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      {/* Chat Header */}
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {participants.slice(0, 3).map((participant) => (
                <Avatar key={participant.id} className="h-8 w-8 border-2 border-white">
                  <AvatarImage src={participant.avatar} />
                  <AvatarFallback className="text-xs">
                    {participant.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {participants.length > 3 && (
                <div className="h-8 w-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs">
                  +{participants.length - 3}
                </div>
              )}
            </div>
            
            <div>
              <CardTitle className="text-sm">
                {roomType === 'support' ? 'Support Chat' : 'Order Chat'}
              </CardTitle>
              {orderInfo && (
                <p className="text-xs text-gray-600">
                  Order #{orderInfo.orderNumber}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <Badge variant="outline" className="text-xs">
              {onlineParticipants.length} online
            </Badge>
            
            <div className="flex gap-1">
              <Button variant="ghost" size="sm">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Video className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Participants Status */}
        <div className="flex gap-2 flex-wrap">
          {participants.map((participant) => {
            const isOnline = presenceUpdates.some(p => 
              p.userId === participant.id && p.status === 'online'
            );
            return (
              <Badge
                key={participant.id}
                variant="outline"
                className={`text-xs ${getRoleColor(participant.role)}`}
              >
                <div className={`h-1.5 w-1.5 rounded-full mr-1 ${
                  isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                {participant.name} ({participant.role})
              </Badge>
            );
          })}
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {roomMessages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Start the conversation!</p>
                {orderInfo && (
                  <p className="text-sm">
                    Discuss order #{orderInfo.orderNumber}
                  </p>
                )}
              </div>
            ) : (
              roomMessages.map((msg) => (
                <div key={msg.id} className={`flex ${getMessageAlignment(msg.senderId)}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${getMessageStyle(msg.senderId)}`}>
                    {msg.senderId !== currentUserId && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">{msg.senderName}</span>
                        <Badge className={`text-xs ${getRoleColor(msg.senderRole)}`}>
                          {msg.senderRole}
                        </Badge>
                      </div>
                    )}
                    
                    <div className="break-words">
                      {msg.messageType === 'LOCATION' ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>Location shared</span>
                        </div>
                      ) : (
                        <span>{msg.message}</span>
                      )}
                    </div>
                    
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.attachments.map((attachment, index) => (
                          <div key={index} className="text-xs opacity-75">
                            📎 {attachment.name || 'Attachment'}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className={`text-xs mt-1 ${
                      msg.senderId === currentUserId ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Typing Indicator */}
            {typingUsers.size > 0 && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-gray-600">typing...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      {/* Message Input */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              value={message}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="pr-20"
              disabled={!connected}
            />
            
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsAttachmentOpen(!isAttachmentOpen)}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Smile className="h-4 w-4" />
              </Button>
            </div>

            {/* Attachment Menu */}
            {isAttachmentOpen && (
              <div className="absolute bottom-full right-0 mb-2 bg-white border rounded-lg shadow-lg p-2 min-w-[150px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleAttachment('camera')}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Camera
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleAttachment('location')}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Location
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleAttachment('file')}
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  File
                </Button>
              </div>
            )}
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || !connected}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {!connected && (
          <p className="text-xs text-red-500 mt-1">
            Not connected. Messages will be sent when connection is restored.
          </p>
        )}
      </div>
    </Card>
  );
};

export default RealTimeChatSystem;