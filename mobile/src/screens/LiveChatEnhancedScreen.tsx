
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

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

export default function LiveChatEnhancedScreen() {
  const navigation = useNavigation();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSessions, setShowSessions] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Mock WebSocket connection
  const [isConnected, setIsConnected] = useState(true);

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
        setShowSessions(false);
        loadChatMessages(activeSessions[0].id);
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      Alert.alert('Error', 'Failed to load chat sessions');
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
    if (!message.trim() || !activeSession) return;

    const tempMessage: ChatMessage = {
      id: 'temp_' + Date.now(),
      senderId: 'current_user',
      senderName: 'You',
      senderRole: 'consumer',
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
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sending': return '⏳';
      case 'sent': return '✓';
      case 'delivered': return '✓✓';
      case 'read': return '✓✓';
      default: return '';
    }
  };

  const renderMessage = ({ item: msg, index }: { item: ChatMessage; index: number }) => {
    const isCurrentUser = msg.senderId === 'current_user';
    
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.sentMessage : styles.receivedMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.sentBubble : styles.receivedBubble
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.sentText : styles.receivedText
          ]}>
            {msg.message}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isCurrentUser ? styles.sentTime : styles.receivedTime
            ]}>
              {formatTime(msg.timestamp)}
            </Text>
            {isCurrentUser && (
              <Text style={styles.messageStatus}>
                {getMessageStatusIcon(msg.status)}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderSessionItem = ({ item: session }: { item: ChatSession }) => {
    const otherParticipant = session.participants.find(p => p.id !== 'current_user');
    const lastMessage = session.messages[session.messages.length - 1];

    return (
      <TouchableOpacity
        style={styles.sessionItem}
        onPress={() => {
          setActiveSession(session);
          setShowSessions(false);
          loadChatMessages(session.id);
        }}
      >
        <View style={styles.sessionAvatar}>
          <Text style={styles.avatarText}>
            {otherParticipant?.name.charAt(0).toUpperCase() || 'U'}
          </Text>
          {otherParticipant?.isOnline && (
            <View style={styles.onlineIndicator} />
          )}
        </View>

        <View style={styles.sessionInfo}>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionName}>
              {otherParticipant?.name || 'Unknown'}
            </Text>
            <View style={styles.sessionBadge}>
              <Text style={styles.sessionBadgeText}>{session.type}</Text>
            </View>
          </View>
          
          {session.orderId && (
            <Text style={styles.sessionOrder}>
              Order #{session.orderId.slice(-6)}
            </Text>
          )}
          
          {lastMessage && (
            <Text style={styles.sessionPreview} numberOfLines={1}>
              {lastMessage.message}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;

    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingBubble}>
          <View style={styles.typingDots}>
            <View style={[styles.typingDot, { animationDelay: '0ms' }]} />
            <View style={[styles.typingDot, { animationDelay: '150ms' }]} />
            <View style={[styles.typingDot, { animationDelay: '300ms' }]} />
          </View>
        </View>
      </View>
    );
  };

  useEffect(() => {
    loadChatSessions();
  }, []);

  useEffect(() => {
    if (activeSession?.messages && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [activeSession?.messages]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showSessions) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.connectionStatus}>
            <View style={[
              styles.connectionDot,
              { backgroundColor: isConnected ? '#28a745' : '#dc3545' }
            ]} />
            <Text style={styles.connectionText}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>

        <FlatList
          data={chatSessions}
          renderItem={renderSessionItem}
          keyExtractor={(item) => item.id}
          style={styles.sessionsList}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => setShowSessions(true)}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.chatHeaderInfo}>
            <View style={styles.chatAvatar}>
              <Text style={styles.avatarText}>
                {activeSession?.participants.find(p => p.id !== 'current_user')?.name.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View>
              <Text style={styles.chatHeaderName}>
                {activeSession?.participants.find(p => p.id !== 'current_user')?.name || 'Unknown'}
              </Text>
              <Text style={styles.chatHeaderStatus}>
                {activeSession?.participants.find(p => p.id !== 'current_user')?.isOnline 
                  ? 'Online' 
                  : 'Last seen recently'}
              </Text>
            </View>
          </View>

          <View style={styles.chatActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>📞</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>📹</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>⋯</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={activeSession?.messages || []}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {renderTypingIndicator()}

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Text style={styles.attachButtonText}>📎</Text>
          </TouchableOpacity>
          
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Type a message..."
            multiline
            maxLength={2000}
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              { opacity: message.trim() ? 1 : 0.5 }
            ]}
            onPress={sendMessage}
            disabled={!message.trim()}
          >
            <Text style={styles.sendButtonText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 24,
    color: '#007bff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    fontSize: 12,
    color: '#666',
  },
  sessionsList: {
    flex: 1,
  },
  sessionItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sessionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#28a745',
    borderWidth: 2,
    borderColor: 'white',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sessionBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sessionBadgeText: {
    fontSize: 10,
    color: '#1976d2',
    fontWeight: '500',
  },
  sessionOrder: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  sessionPreview: {
    fontSize: 14,
    color: '#666',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  chatHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 16,
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  chatHeaderStatus: {
    fontSize: 12,
    color: '#666',
  },
  chatActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 16,
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  sentMessage: {
    alignItems: 'flex-end',
  },
  receivedMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
  },
  sentBubble: {
    backgroundColor: '#007bff',
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  sentText: {
    color: 'white',
  },
  receivedText: {
    color: '#333',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  sentTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  receivedTime: {
    color: '#666',
  },
  messageStatus: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 4,
  },
  typingContainer: {
    padding: 16,
    alignItems: 'flex-start',
  },
  typingBubble: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  typingDots: {
    flexDirection: 'row',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666',
    marginHorizontal: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  attachButtonText: {
    fontSize: 18,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 18,
  },
});
