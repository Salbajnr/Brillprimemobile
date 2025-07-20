import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Send, 
  ShoppingCart, 
  Package, 
  Clock,
  CheckCircle,
  Phone,
  Mail
} from "lucide-react";
import accountCircleIcon from "../assets/images/account_circle.svg";
import cameraIcon from "../assets/images/camera_icon.png";

// Color constants
const COLORS = {
  PRIMARY: '#4682b4',
  SECONDARY: '#0b1a51', 
  ACTIVE: '#010e42',
  TEXT: '#131313',
  WHITE: '#ffffff'
} as const;

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: number;
  senderName: string;
  senderRole: string;
  content: string;
  messageType: "TEXT" | "QUOTE_REQUEST" | "QUOTE_RESPONSE" | "ORDER_UPDATE";
  attachedData?: any;
  createdAt: Date;
}

interface Conversation {
  id: string;
  customerId: number;
  vendorId: number;
  productId?: string;
  conversationType: "QUOTE" | "ORDER" | "GENERAL";
  status: "ACTIVE" | "CLOSED";
  customerName: string;
  vendorName: string;
  productName?: string;
  lastMessage?: string;
  lastMessageAt: Date;
  createdAt: Date;
}

export default function ChatPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get conversations for current user
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ['/api/conversations', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/conversations?userId=${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch conversations');
      return response.json();
    },
    enabled: !!user?.id
  });

  // Get messages for selected conversation
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['/api/conversations', selectedConversation, 'messages'],
    queryFn: async () => {
      const response = await fetch(`/api/conversations/${selectedConversation}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!selectedConversation
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { conversationId: string; content: string; messageType?: string }) => {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          senderId: user?.id
        })
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', selectedConversation, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', user?.id] });
      setNewMessage("");
    }
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0].id);
    }
  }, [conversations, selectedConversation]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    sendMessageMutation.mutate({
      conversationId: selectedConversation,
      content: newMessage.trim(),
      messageType: "TEXT"
    });
  };

  const selectedConv = conversations.find((c: Conversation) => c.id === selectedConversation);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Conversations Sidebar */}
        <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/dashboard")}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-semibold text-[#131313]">Messages</h1>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="p-4 text-center text-gray-500">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No conversations yet</p>
                <p className="text-sm">Start by requesting a quote or placing an order</p>
              </div>
            ) : (
              conversations.map((conversation: Conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation.id)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedConversation === conversation.id ? 'bg-blue-50 border-l-4 border-l-[#4682b4]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={accountCircleIcon} alt="Profile" />
                        <AvatarFallback>
                          {user?.role === "CONSUMER" 
                            ? conversation.vendorName.charAt(0).toUpperCase()
                            : conversation.customerName.charAt(0).toUpperCase()
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#131313] truncate">
                          {user?.role === "CONSUMER" ? conversation.vendorName : conversation.customerName}
                        </p>
                        {conversation.productName && (
                          <p className="text-xs text-gray-500 truncate">{conversation.productName}</p>
                        )}
                        <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge 
                        variant={conversation.conversationType === "QUOTE" ? "secondary" : "default"}
                        className="text-xs"
                      >
                        {conversation.conversationType}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {new Date(conversation.lastMessageAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={accountCircleIcon} alt="Profile" />
                      <AvatarFallback>
                        {user?.role === "CONSUMER" 
                          ? selectedConv.vendorName.charAt(0).toUpperCase()
                          : selectedConv.customerName.charAt(0).toUpperCase()
                        }
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-semibold text-[#131313]">
                        {user?.role === "CONSUMER" ? selectedConv.vendorName : selectedConv.customerName}
                      </h2>
                      {selectedConv.productName && (
                        <p className="text-sm text-gray-600">About: {selectedConv.productName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={selectedConv.conversationType === "QUOTE" ? "secondary" : "default"}>
                      {selectedConv.conversationType}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: COLORS.WHITE }}>
                {loadingMessages ? (
                  <div className="text-center text-gray-500">Loading messages...</div>
                ) : (
                  messages.map((message: ChatMessage) => {
                    const isOwnMessage = message.senderId === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                          <div
                            className="rounded-2xl p-3"
                            style={{
                              backgroundColor: isOwnMessage ? COLORS.PRIMARY : COLORS.SECONDARY,
                              color: COLORS.WHITE,
                              fontFamily: 'Montserrat',
                              fontWeight: '500'
                            }}
                          >
                            {message.messageType === "QUOTE_REQUEST" && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
                                <div className="flex items-center space-x-2">
                                  <Package className="h-4 w-4 text-yellow-600" />
                                  <span className="text-sm font-medium text-yellow-800">Quote Request</span>
                                </div>
                              </div>
                            )}
                            
                            {message.messageType === "QUOTE_RESPONSE" && (
                              <div className="bg-green-50 border border-green-200 rounded p-2 mb-2">
                                <div className="flex items-center space-x-2">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-800">Quote Response</span>
                                </div>
                              </div>
                            )}
                            
                            <p className="text-sm">{message.content}</p>
                            
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs opacity-80">
                                {message.senderName}
                              </span>
                              <span className="text-xs opacity-70">
                                {new Date(message.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <Avatar className={`h-8 w-8 ${isOwnMessage ? 'order-1 mr-2' : 'order-2 ml-2'}`}>
                          <AvatarImage src={accountCircleIcon} alt="Profile" />
                          <AvatarFallback className="text-xs">
                            {message.senderName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input - Standardized Chat UI */}
              <div className="p-5 bg-white">
                <div className="flex items-center space-x-3">
                  {/* Message Input Container */}
                  <div className="flex-1 relative">
                    <div 
                      className="rounded-3xl border-3 px-4 py-4"
                      style={{ borderColor: COLORS.PRIMARY }}
                    >
                      <input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Message..."
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="w-full bg-transparent outline-none text-base"
                        style={{ 
                          color: newMessage ? COLORS.TEXT : '#D9D9D9',
                          fontFamily: 'Montserrat',
                          fontWeight: '400'
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Camera Button */}
                  <Button
                    onClick={() => {
                      // In real app, would open camera/image picker
                      console.log('Camera button clicked');
                    }}
                    className="w-15 h-15 p-0 rounded-full border-3"
                    style={{ 
                      borderColor: COLORS.PRIMARY,
                      backgroundColor: COLORS.WHITE
                    }}
                  >
                    <img 
                      src={cameraIcon} 
                      alt="Camera" 
                      className="w-10 h-10"
                      style={{ filter: `brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(176deg) brightness(102%) contrast(97%)` }}
                    />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">Select a conversation</h3>
                <p className="text-gray-500">Choose a conversation from the sidebar to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}