import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  MessageCircle, 
  Send,
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
  const [showChatScreen, setShowChatScreen] = useState(false);
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

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    sendMessageMutation.mutate({
      conversationId: selectedConversation,
      content: newMessage.trim(),
      messageType: "TEXT"
    });
  };

  const handleConversationClick = (conversationId: string) => {
    setSelectedConversation(conversationId);
    setShowChatScreen(true);
  };

  const handleBackToList = () => {
    setShowChatScreen(false);
    setSelectedConversation(null);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen" style={{ backgroundColor: COLORS.WHITE }}>
        <h1 className="text-2xl font-bold mb-4" style={{ color: COLORS.TEXT }}>Please Sign In</h1>
        <p className="mb-4" style={{ color: COLORS.TEXT + '80' }}>You need to be signed in to access chat</p>
        <Button 
          onClick={() => setLocation('/signin')}
          className="rounded-3xl py-3 px-6"
          style={{ backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE }}
        >
          Sign In
        </Button>
      </div>
    );
  }

  // Show conversation list first
  if (!showChatScreen) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
        {/* Header */}
        <div className="p-6 pb-4" style={{ backgroundColor: COLORS.WHITE }}>
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => setLocation('/dashboard')}
              className="p-2 rounded-2xl hover:bg-gray-100"
            >
              <ArrowLeft className="h-6 w-6" style={{ color: COLORS.TEXT }} />
            </Button>
            <h1 className="text-2xl font-bold" style={{ color: COLORS.TEXT }}>Messages</h1>
            <div className="w-10"></div>
          </div>
        </div>

        {/* Conversations List */}
        <div className="px-4 pb-6">
          {loadingConversations ? (
            <div className="p-8 text-center" style={{ color: COLORS.TEXT + '80' }}>
              <MessageCircle className="h-12 w-12 mx-auto mb-4" style={{ color: COLORS.PRIMARY }} />
              <p>Loading conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center" style={{ color: COLORS.TEXT + '80' }}>
              <MessageCircle className="h-16 w-16 mx-auto mb-4" style={{ color: COLORS.PRIMARY + '40' }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: COLORS.TEXT }}>No conversations yet</h3>
              <p>Start shopping to connect with merchants</p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conv: Conversation) => (
                <div
                  key={conv.id}
                  onClick={() => handleConversationClick(conv.id)}
                  className="rounded-3xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg card-3d"
                  style={{ 
                    backgroundColor: COLORS.WHITE,
                    border: `1px solid #E5E7EB`
                  }}
                >
                  <div className="flex items-center space-x-4">
                    {/* Profile Avatar */}
                    <div className="relative">
                      <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: COLORS.PRIMARY + '20' }}
                      >
                        <img 
                          src={accountCircleIcon} 
                          alt="Profile" 
                          className="w-12 h-12"
                          style={{ filter: `brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(176deg) brightness(102%) contrast(97%)` }}
                        />
                      </div>
                      {/* Online indicator */}
                      <div 
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2"
                        style={{ 
                          backgroundColor: '#10B981',
                          borderColor: COLORS.WHITE
                        }}
                      ></div>
                    </div>

                    {/* Conversation Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-lg truncate" style={{ color: COLORS.TEXT }}>
                          {user?.role === "CONSUMER" ? conv.vendorName : conv.customerName}
                        </h3>
                        <span className="text-xs" style={{ color: COLORS.TEXT + '60' }}>
                          {new Date(conv.lastMessageAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {conv.productName && (
                        <p className="text-sm mb-2 truncate" style={{ color: COLORS.PRIMARY }}>
                          About: {conv.productName}
                        </p>
                      )}
                      
                      {conv.lastMessage && (
                        <p className="text-sm truncate" style={{ color: COLORS.TEXT + '70' }}>
                          {conv.lastMessage}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <Badge 
                          variant={conv.conversationType === "QUOTE" ? "secondary" : "default"}
                          className="rounded-full px-3 py-1"
                          style={{ 
                            backgroundColor: conv.conversationType === "QUOTE" ? '#FEF3C7' : COLORS.PRIMARY + '20',
                            color: conv.conversationType === "QUOTE" ? '#92400E' : COLORS.PRIMARY
                          }}
                        >
                          {conv.conversationType}
                        </Badge>
                        
                        {/* Unread indicator */}
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS.PRIMARY }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show full chat screen when conversation is selected
  const selectedConv = conversations.find((c: Conversation) => c.id === selectedConversation);
  
  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: COLORS.WHITE }}>
      {/* Chat Header */}
      <div className="p-4 border-b" style={{ borderColor: '#E5E7EB', backgroundColor: COLORS.WHITE }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              onClick={handleBackToList}
              className="p-2 rounded-2xl hover:bg-gray-100"
            >
              <ArrowLeft className="h-6 w-6" style={{ color: COLORS.TEXT }} />
            </Button>
            
            {selectedConv && (
              <>
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: COLORS.PRIMARY + '20' }}
                >
                  <img 
                    src={accountCircleIcon} 
                    alt="Profile" 
                    className="w-8 h-8"
                    style={{ filter: `brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(176deg) brightness(102%) contrast(97%)` }}
                  />
                </div>
                <div>
                  <h2 className="font-semibold text-lg" style={{ color: COLORS.TEXT }}>
                    {user?.role === "CONSUMER" ? selectedConv.vendorName : selectedConv.customerName}
                  </h2>
                  {selectedConv.productName && (
                    <p className="text-sm" style={{ color: COLORS.TEXT + '70' }}>About: {selectedConv.productName}</p>
                  )}
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {selectedConv && (
              <Badge 
                variant={selectedConv.conversationType === "QUOTE" ? "secondary" : "default"}
                className="rounded-full"
                style={{ 
                  backgroundColor: selectedConv.conversationType === "QUOTE" ? '#FEF3C7' : COLORS.PRIMARY + '20',
                  color: selectedConv.conversationType === "QUOTE" ? '#92400E' : COLORS.PRIMARY
                }}
              >
                {selectedConv.conversationType}
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="rounded-full p-2">
              <Phone className="h-5 w-5" style={{ color: COLORS.PRIMARY }} />
            </Button>
            <Button variant="ghost" size="sm" className="rounded-full p-2">
              <Mail className="h-5 w-5" style={{ color: COLORS.PRIMARY }} />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: '#F8F9FA' }}>
        {loadingMessages ? (
          <div className="text-center py-8" style={{ color: COLORS.TEXT + '80' }}>Loading messages...</div>
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
                    className="rounded-2xl p-4 shadow-sm"
                    style={{
                      backgroundColor: isOwnMessage ? COLORS.PRIMARY : COLORS.SECONDARY,
                      color: COLORS.WHITE,
                      fontFamily: 'Montserrat',
                      fontWeight: '500'
                    }}
                  >
                    {message.messageType === "QUOTE_REQUEST" && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-3">
                        <div className="flex items-center space-x-2">
                          <Package className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">Quote Request</span>
                        </div>
                      </div>
                    )}
                    
                    {message.messageType === "QUOTE_RESPONSE" && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">Quote Response</span>
                        </div>
                      </div>
                    )}
                    
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs opacity-80">
                        {message.senderName}
                      </span>
                      <span className="text-xs opacity-70">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - Standardized Chat UI */}
      <div className="p-5" style={{ backgroundColor: COLORS.WHITE }}>
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
            className="w-15 h-15 p-0 rounded-full border-3 hover:opacity-80 transition-opacity"
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
    </div>
  );
}