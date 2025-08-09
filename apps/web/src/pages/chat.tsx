import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWebSocketChat } from "@/hooks/use-websocket";
import { ClientRole, MessageType } from "../../../server/websocket";
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
  Mail,
  Camera,
  FileText,
  Image,
  X
} from "lucide-react";
// @ts-ignore
import accountCircleIcon from "../assets/images/account_circle.svg";
// @ts-ignore
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
  driverId?: number;
  productId?: string;
  conversationType: "QUOTE" | "ORDER" | "PICKUP" | "DELIVERY" | "GENERAL";
  status: "ACTIVE" | "CLOSED";
  customerName: string;
  vendorName: string;
  driverName?: string;
  customerPhoto?: string;
  vendorPhoto?: string;
  driverPhoto?: string;
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
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showCallMenu, setShowCallMenu] = useState(false);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket integration for real-time chat
  const { connected: wsConnected, chatMessages: wsMessages, sendChatMessage, connectionError: wsError } = useWebSocketChat();

  // Get conversations for current user based on role
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ['/api/conversations', user?.id, user?.role],
    queryFn: async () => {
      const response = await fetch(`/api/conversations?userId=${user?.id}&role=${user?.role}`);
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
    onSuccess: (data: ChatMessage) => {
      // Update queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', selectedConversation, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', user?.id] });
      setNewMessage("");

      // Also send via WebSocket for real-time delivery
      if (selectedConversation) {
        const conversation = conversations.find((c: Conversation) => c.id === selectedConversation);
        if (conversation) {
          // Determine recipient based on user role
          let recipientId: string;
          let recipientRole: ClientRole;

          if (user?.role === "CONSUMER") {
            recipientId = conversation.vendorId.toString();
            recipientRole = ClientRole.MERCHANT;
          } else if (user?.role === "MERCHANT") {
            recipientId = conversation.customerId.toString();
            recipientRole = ClientRole.CONSUMER;
          } else if (user?.role === "DRIVER") {
            // For drivers, determine if they're talking to merchant or consumer
            if (conversation.conversationType === "PICKUP") {
              recipientId = conversation.vendorId.toString();
              recipientRole = ClientRole.MERCHANT;
            } else {
              recipientId = conversation.customerId.toString();
              recipientRole = ClientRole.CONSUMER;
            }
          } else {
            // Default fallback
            recipientId = conversation.customerId.toString();
            recipientRole = ClientRole.CONSUMER;
          }

          // Send the message via WebSocket
          sendChatMessage(recipientId, recipientRole, data.content);
        }
      }
    }
  });

  // Process WebSocket messages and add them to the UI
  useEffect(() => {
    if (wsMessages.length > 0 && selectedConversation) {
      // Find new messages for the current conversation
      const newWsMessages = wsMessages.filter((msg: { type: MessageType; senderId: string; recipientId?: string }) => {
        // Check if this message belongs to the current conversation
        // In a real app, you would have a more robust way to match messages to conversations
        return msg.type === MessageType.CHAT_MESSAGE && 
               (msg.senderId === String(user?.id) || msg.recipientId === String(user?.id));
      });

      if (newWsMessages.length > 0) {
        // Refresh the messages query to include the new WebSocket messages
        queryClient.invalidateQueries({ queryKey: ['/api/conversations', selectedConversation, 'messages'] });
      }
    }
  }, [wsMessages, selectedConversation, user?.id, queryClient]);

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
    setShowImageMenu(false);
    setShowCallMenu(false);
    setShowProfileDetails(false);
  };

  const handleImageMenuOption = (option: 'camera' | 'photo' | 'document') => {
    setShowImageMenu(false);
    switch(option) {
      case 'camera':
        // Trigger camera capture
        console.log('Opening camera...');
        break;
      case 'photo':
        // Trigger photo picker
        console.log('Opening photo gallery...');
        break;
      case 'document':
        // Trigger document picker
        console.log('Opening document picker...');
        break;
    }
  };

  const handleCallOption = (option: 'in-app' | 'cellular') => {
    setShowCallMenu(false);
    switch(option) {
      case 'in-app':
        console.log('Starting in-app call...');
        break;
      case 'cellular':
        console.log('Starting cellular call...');
        break;
    }
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
              <p>
                {user?.role === "CONSUMER" && "Start shopping to connect with merchants"}
                {user?.role === "MERCHANT" && "Customers will contact you about quotes and orders"}
                {user?.role === "DRIVER" && "You'll receive pickup and delivery requests here"}
              </p>
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
                        className="w-16 h-16 rounded-full overflow-hidden border-2"
                        style={{ borderColor: COLORS.PRIMARY + '40' }}
                      >
                        {(() => {
                          let profilePhoto = null;
                          if (user?.role === "CONSUMER") {
                            profilePhoto = conv.vendorPhoto;
                          } else if (user?.role === "MERCHANT") {
                            profilePhoto = conv.customerPhoto;
                          } else if (user?.role === "DRIVER") {
                            profilePhoto = conv.conversationType === "PICKUP" ? conv.vendorPhoto : conv.customerPhoto;
                          }

                          return profilePhoto ? (
                            <img 
                              src={profilePhoto} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div 
                              className="w-full h-full flex items-center justify-center"
                              style={{ backgroundColor: COLORS.PRIMARY + '20' }}
                            >
                              <img 
                                src={accountCircleIcon} 
                                alt="Profile" 
                                className="w-12 h-12"
                                style={{ filter: `brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(176deg) brightness(102%) contrast(97%)` }}
                              />
                            </div>
                          );
                        })()}
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
                          {(() => {
                            if (user?.role === "CONSUMER") return conv.vendorName;
                            if (user?.role === "MERCHANT") return conv.customerName;
                            if (user?.role === "DRIVER") {
                              return conv.conversationType === "PICKUP" ? conv.vendorName : conv.customerName;
                            }
                            return "Unknown";
                          })()}
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
                          variant="default"
                          className="rounded-full px-3 py-1"
                          style={{ 
                            backgroundColor: (() => {
                              switch(conv.conversationType) {
                                case "QUOTE": return '#FEF3C7';
                                case "ORDER": return '#DBEAFE';
                                case "PICKUP": return '#FECACA';
                                case "DELIVERY": return '#D1FAE5';
                                default: return COLORS.PRIMARY + '20';
                              }
                            })(),
                            color: (() => {
                              switch(conv.conversationType) {
                                case "QUOTE": return '#92400E';
                                case "ORDER": return '#1E40AF';
                                case "PICKUP": return '#DC2626';
                                case "DELIVERY": return '#059669';
                                default: return COLORS.PRIMARY;
                              }
                            })()
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
                  className="w-12 h-12 rounded-full overflow-hidden border-2 cursor-pointer hover:opacity-80"
                  style={{ borderColor: COLORS.PRIMARY + '40' }}
                  onClick={() => setShowProfileDetails(!showProfileDetails)}
                >
                  {(() => {
                    let profilePhoto = null;
                    if (user?.role === "CONSUMER") {
                      profilePhoto = selectedConv.vendorPhoto;
                    } else if (user?.role === "MERCHANT") {
                      profilePhoto = selectedConv.customerPhoto;
                    } else if (user?.role === "DRIVER") {
                      profilePhoto = selectedConv.conversationType === "PICKUP" ? selectedConv.vendorPhoto : selectedConv.customerPhoto;
                    }

                    return profilePhoto ? (
                      <img 
                        src={profilePhoto} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: COLORS.PRIMARY + '20' }}
                      >
                        <img 
                          src={accountCircleIcon} 
                          alt="Profile" 
                          className="w-8 h-8"
                          style={{ filter: `brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(176deg) brightness(102%) contrast(97%)` }}
                        />
                      </div>
                    );
                  })()}
                </div>
                <div className="cursor-pointer" onClick={() => setShowProfileDetails(!showProfileDetails)}>
                  <h2 className="font-semibold text-lg" style={{ color: COLORS.TEXT }}>
                    {(() => {
                      if (user?.role === "CONSUMER") return selectedConv.vendorName;
                      if (user?.role === "MERCHANT") return selectedConv.customerName;
                      if (user?.role === "DRIVER") {
                        return selectedConv.conversationType === "PICKUP" ? selectedConv.vendorName : selectedConv.customerName;
                      }
                      return "Unknown";
                    })()}
                  </h2>
                  {selectedConv.productName && (
                    <p className="text-sm" style={{ color: COLORS.TEXT + '70' }}>About: {selectedConv.productName}</p>
                  )}
                  <p className="text-xs" style={{ color: COLORS.PRIMARY }}>Tap to view profile</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {selectedConv && (
              <Badge 
                variant="default"
                className="rounded-full"
                style={{ 
                  backgroundColor: (() => {
                    switch(selectedConv.conversationType) {
                      case "QUOTE": return '#FEF3C7';
                      case "ORDER": return '#DBEAFE';
                      case "PICKUP": return '#FECACA';
                      case "DELIVERY": return '#D1FAE5';
                      default: return COLORS.PRIMARY + '20';
                    }
                  })(),
                  color: (() => {
                    switch(selectedConv.conversationType) {
                      case "QUOTE": return '#92400E';
                      case "ORDER": return '#1E40AF';
                      case "PICKUP": return '#DC2626';
                      case "DELIVERY": return '#059669';
                      default: return COLORS.PRIMARY;
                    }
                  })()
                }}
              >
                {selectedConv.conversationType}
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-full p-2 relative"
              onClick={() => setShowCallMenu(!showCallMenu)}
            >
              <Phone className="h-5 w-5" style={{ color: COLORS.PRIMARY }} />
            </Button>
            <Button variant="ghost" size="sm" className="rounded-full p-2">
              <Mail className="h-5 w-5" style={{ color: COLORS.PRIMARY }} />
            </Button>
          </div>
        </div>

        {/* Profile Details Modal */}
        {showProfileDetails && selectedConv && (
          <div className="absolute top-16 left-4 right-4 z-50">
            <div 
              className="rounded-3xl p-6 shadow-xl border"
              style={{ backgroundColor: COLORS.WHITE, borderColor: COLORS.PRIMARY + '30' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: COLORS.TEXT }}>Public Profile</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowProfileDetails(false)}
                  className="rounded-full"
                >
                  <X className="h-4 w-4" style={{ color: COLORS.TEXT }} />
                </Button>
              </div>

              <div className="flex items-center space-x-4 mb-4">
                <div 
                  className="w-16 h-16 rounded-full overflow-hidden border-2"
                  style={{ borderColor: COLORS.PRIMARY + '40' }}
                >
                  {(() => {
                    let profilePhoto = null;
                    if (user?.role === "CONSUMER") {
                      profilePhoto = selectedConv.vendorPhoto;
                    } else if (user?.role === "MERCHANT") {
                      profilePhoto = selectedConv.customerPhoto;
                    } else if (user?.role === "DRIVER") {
                      profilePhoto = selectedConv.conversationType === "PICKUP" ? selectedConv.vendorPhoto : selectedConv.customerPhoto;
                    }

                    return profilePhoto ? (
                      <img 
                        src={profilePhoto} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: COLORS.PRIMARY + '20' }}
                      >
                        <img 
                          src={accountCircleIcon} 
                          alt="Profile" 
                          className="w-12 h-12"
                          style={{ filter: `brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(176deg) brightness(102%) contrast(97%)` }}
                        />
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <h4 className="font-semibold text-xl" style={{ color: COLORS.TEXT }}>
                    {(() => {
                      if (user?.role === "CONSUMER") return selectedConv.vendorName;
                      if (user?.role === "MERCHANT") return selectedConv.customerName;
                      if (user?.role === "DRIVER") {
                        return selectedConv.conversationType === "PICKUP" ? selectedConv.vendorName : selectedConv.customerName;
                      }
                      return "Unknown";
                    })()}
                  </h4>
                  <p className="text-sm" style={{ color: COLORS.TEXT + '70' }}>
                    {(() => {
                      if (user?.role === "CONSUMER") return "Merchant";
                      if (user?.role === "MERCHANT") return "Customer";
                      if (user?.role === "DRIVER") {
                        return selectedConv.conversationType === "PICKUP" ? "Merchant (Pickup)" : "Customer (Delivery)";
                      }
                      return "User";
                    })()}
                  </p>
                  <div className="flex items-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-xs" style={{ color: COLORS.TEXT + '70' }}>Online</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium" style={{ color: COLORS.TEXT }}>Interaction Type</p>
                  <p className="text-sm" style={{ color: COLORS.TEXT + '70' }}>
                    {(() => {
                      switch(selectedConv.conversationType) {
                        case "QUOTE": return "Quote Discussion";
                        case "ORDER": return "Order Management";
                        case "PICKUP": return "Pickup Request";
                        case "DELIVERY": return "Delivery Service";
                        default: return "General Communication";
                      }
                    })()}
                  </p>
                </div>

                {selectedConv.productName && (
                  <div>
                    <p className="text-sm font-medium" style={{ color: COLORS.TEXT }}>Current Discussion</p>
                    <p className="text-sm" style={{ color: COLORS.PRIMARY }}>{selectedConv.productName}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium" style={{ color: COLORS.TEXT }}>Member Since</p>
                  <p className="text-sm" style={{ color: COLORS.TEXT + '70' }}>
                    {new Date(selectedConv.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long' 
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Call Options Menu */}
        {showCallMenu && (
          <div className="absolute top-16 right-4 z-50">
            <div 
              className="rounded-3xl p-4 shadow-xl border min-w-48"
              style={{ backgroundColor: COLORS.WHITE, borderColor: COLORS.PRIMARY + '30' }}
            >
              <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.TEXT }}>Call Options</h4>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  onClick={() => handleCallOption('in-app')}
                  className="w-full justify-start rounded-2xl p-3 hover:bg-gray-50"
                >
                  <Phone className="h-4 w-4 mr-3" style={{ color: COLORS.PRIMARY }} />
                  <span style={{ color: COLORS.TEXT }}>In-App Call</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleCallOption('cellular')}
                  className="w-full justify-start rounded-2xl p-3 hover:bg-gray-50"
                >
                  <Phone className="h-4 w-4 mr-3" style={{ color: COLORS.SECONDARY }} />
                  <span style={{ color: COLORS.TEXT }}>Cellular Call</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: '#F8F9FA' }}>
        {/* WebSocket Connection Status */}
        {wsConnected ? (
          <div className="text-center">
            <Badge 
              variant="default"
              className="rounded-full px-3 py-1 mb-2"
              style={{ backgroundColor: '#D1FAE5', color: '#059669' }}
            >
              Real-time connected
            </Badge>
          </div>
        ) : wsError ? (
          <div className="text-center">
            <Badge 
              variant="default"
              className="rounded-full px-3 py-1 mb-2"
              style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
            >
              {wsError}
            </Badge>
          </div>
        ) : null}

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

      {/* Message Input - Enhanced Chat UI */}
      <div className="p-5 relative" style={{ backgroundColor: COLORS.WHITE }}>
        {/* Image Options Menu */}
        {showImageMenu && (
          <div className="absolute bottom-20 right-5 z-50">
            <div 
              className="rounded-3xl p-4 shadow-xl border min-w-48"
              style={{ backgroundColor: COLORS.WHITE, borderColor: '#A7C7E7' }}
            >
              <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.TEXT }}>Add Attachment</h4>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  onClick={() => handleImageMenuOption('camera')}
                  className="w-full justify-start rounded-2xl p-3 hover:bg-gray-50"
                >
                  <Camera className="h-4 w-4 mr-3" style={{ color: COLORS.PRIMARY }} />
                  <span style={{ color: COLORS.TEXT }}>Take Photo</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleImageMenuOption('photo')}
                  className="w-full justify-start rounded-2xl p-3 hover:bg-gray-50"
                >
                  <Image className="h-4 w-4 mr-3" style={{ color: COLORS.PRIMARY }} />
                  <span style={{ color: COLORS.TEXT }}>Upload Photo</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleImageMenuOption('document')}
                  className="w-full justify-start rounded-2xl p-3 hover:bg-gray-50"
                >
                  <FileText className="h-4 w-4 mr-3" style={{ color: COLORS.SECONDARY }} />
                  <span style={{ color: COLORS.TEXT }}>Upload Document</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-3">
          {/* Message Input Container with Light Blue Border */}
          <div className="flex-1 relative">
            <div 
              className="rounded-3xl px-4 py-4"
              style={{ 
                border: '2px solid #A7C7E7',
                backgroundColor: COLORS.WHITE
              }}
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

          {/* Image/Camera Button with Round Border */}
          <Button
            onClick={() => setShowImageMenu(!showImageMenu)}
            className="w-15 h-15 p-0 rounded-full hover:opacity-80 transition-opacity"
            style={{ 
              border: '2px solid #A7C7E7',
              backgroundColor: COLORS.WHITE
            }}
          >
            <img 
              src={cameraIcon} 
              alt="Attachment" 
              className="w-10 h-10"
              style={{ filter: `brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(176deg) brightness(102%) contrast(97%)` }}
            />
          </Button>
        </div>
      </div>
    </div>
  );
}