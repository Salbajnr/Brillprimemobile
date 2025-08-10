
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Search, Plus, MessageCircle, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import accountCircle from "../assets/images/account_circle.svg";

// Color constants
const COLORS = {
  PRIMARY: '#4682b4',
  SECONDARY: '#0b1a51', 
  ACTIVE: '#010e42',
  TEXT: '#131313',
  WHITE: '#ffffff'
} as const;

interface Conversation {
  id: string;
  participantName: string;
  participantRole: string;
  participantAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  conversationType: 'QUOTE' | 'ORDER' | 'GENERAL';
  productName?: string;
}

export default function Messages() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'UNREAD' | 'MERCHANTS' | 'DRIVERS'>('ALL');

  // Get conversations for the current user
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['/api/conversations', user?.id, user?.role],
    enabled: !!user?.id
  });

  // Sample data for demonstration
  const sampleConversations: Conversation[] = [
    {
      id: "conv-1",
      participantName: "AgriMart Lagos",
      participantRole: "MERCHANT",
      participantAvatar: "",
      lastMessage: "Your order of Premium Rice (50kg) is ready for pickup. Total: ₦45,000",
      lastMessageTime: "2 min ago",
      unreadCount: 2,
      isOnline: true,
      conversationType: "ORDER",
      productName: "Premium Rice 50kg"
    },
    {
      id: "conv-2",
      participantName: "John Driver",
      participantRole: "DRIVER",
      participantAvatar: "",
      lastMessage: "I'm 5 minutes away from your delivery location. Please be ready.",
      lastMessageTime: "15 min ago",
      unreadCount: 1,
      isOnline: true,
      conversationType: "ORDER"
    },
    {
      id: "conv-3",
      participantName: "FreshFoods Market",
      participantRole: "MERCHANT",
      participantAvatar: "",
      lastMessage: "Thank you for your inquiry about bulk tomatoes. Our current price is ₦800 per basket.",
      lastMessageTime: "1 hour ago",
      unreadCount: 0,
      isOnline: false,
      conversationType: "QUOTE",
      productName: "Fresh Tomatoes"
    },
    {
      id: "conv-4",
      participantName: "Sarah Express",
      participantRole: "DRIVER",
      participantAvatar: "",
      lastMessage: "Your fuel delivery has been completed. Thank you for choosing our service!",
      lastMessageTime: "2 hours ago",
      unreadCount: 0,
      isOnline: false,
      conversationType: "ORDER"
    },
    {
      id: "conv-5",
      participantName: "TechMall Electronics",
      participantRole: "MERCHANT",
      participantAvatar: "",
      lastMessage: "We have received your quote request for iPhone 15 Pro Max. We'll get back to you with pricing.",
      lastMessageTime: "1 day ago",
      unreadCount: 0,
      isOnline: true,
      conversationType: "QUOTE",
      productName: "iPhone 15 Pro Max"
    }
  ];

  const filteredConversations = sampleConversations.filter(conv => {
    const matchesSearch = conv.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (conv.productName && conv.productName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    switch (selectedFilter) {
      case 'UNREAD':
        return conv.unreadCount > 0;
      case 'MERCHANTS':
        return conv.participantRole === 'MERCHANT';
      case 'DRIVERS':
        return conv.participantRole === 'DRIVER';
      default:
        return true;
    }
  });

  const handleConversationClick = (conversationId: string) => {
    setLocation(`/chat?conversationId=${conversationId}`);
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  const getConversationIcon = (type: string) => {
    switch (type) {
      case 'ORDER':
        return '📦';
      case 'QUOTE':
        return '💰';
      default:
        return '💬';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'MERCHANT':
        return '#4682b4';
      case 'DRIVER':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const { socket, isConnected } = useWebSocket(true);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto px-2 sm:px-4">{/*Responsive container*/}
      {/* Header */}
      <div 
        className="sticky top-0 z-10 px-4 py-4"
        style={{ background: 'linear-gradient(135deg, #4682b4 0%, #0b1a51 100%)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              className="text-white hover:bg-white/20 w-8 h-8"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-white">Messages</h1>
              <p className="text-white/80 text-sm">{filteredConversations.length} conversations</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/chat/new')}
            className="text-white hover:bg-white/20 w-8 h-8"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search messages, contacts, or products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/10 border-white/20 text-white placeholder-white/60 focus:bg-white/20"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-2 mt-3">
          {(['ALL', 'UNREAD', 'MERCHANTS', 'DRIVERS'] as const).map((filter) => (
            <Button
              key={filter}
              variant={selectedFilter === filter ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSelectedFilter(filter)}
              className={`text-xs ${
                selectedFilter === filter 
                  ? 'bg-white text-slate-900' 
                  : 'text-white/80 hover:bg-white/20'
              }`}
            >
              {filter === 'ALL' ? 'All' : filter === 'UNREAD' ? 'Unread' : filter.toLowerCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Conversations List */}
      <div className="px-4 pb-20">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {searchQuery ? 'No messages found' : 'No conversations yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery 
                ? 'Try adjusting your search or filters' 
                : 'Start chatting with merchants and drivers'}
            </p>
            <Button 
              onClick={() => setLocation('/commodities')}
              style={{ backgroundColor: COLORS.PRIMARY }}
              className="text-white"
            >
              Browse Marketplace
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conversation) => (
              <Card 
                key={conversation.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-l-4 hover:border-l-blue-500"
                onClick={() => handleConversationClick(conversation.id)}
                style={{ 
                  borderLeftColor: conversation.unreadCount > 0 ? COLORS.PRIMARY : 'transparent',
                  backgroundColor: conversation.unreadCount > 0 ? '#f8faff' : COLORS.WHITE
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={conversation.participantAvatar || accountCircle} />
                        <AvatarFallback className="bg-gray-200">
                          {conversation.participantName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {conversation.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {conversation.participantName}
                          </h3>
                          <Badge 
                            variant="outline" 
                            className="text-xs px-1.5 py-0.5"
                            style={{ 
                              borderColor: getRoleColor(conversation.participantRole),
                              color: getRoleColor(conversation.participantRole)
                            }}
                          >
                            {conversation.participantRole}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {formatTime(conversation.lastMessageTime)}
                          </span>
                          {conversation.unreadCount > 0 && (
                            <Badge 
                              className="bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-5 h-5 flex items-center justify-center rounded-full"
                            >
                              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm">{getConversationIcon(conversation.conversationType)}</span>
                        <span className="text-xs text-gray-600 font-medium">
                          {conversation.conversationType}
                        </span>
                        {conversation.productName && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-600 truncate">
                              {conversation.productName}
                            </span>
                          </>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 line-clamp-2 leading-snug">
                        {conversation.lastMessage}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}