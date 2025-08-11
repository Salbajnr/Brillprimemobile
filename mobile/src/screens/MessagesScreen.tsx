
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { NavigationProps } from '../shared/types';
import { apiService } from '../services/api';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'direct' | 'support' | 'system';
}

interface Conversation {
  id: string;
  participantName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  type: 'direct' | 'support' | 'system';
}

const MessagesScreen: React.FC<NavigationProps> = ({ navigation, route }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    route?.params?.conversationId || null
  );

  useEffect(() => {
    loadConversations();
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      const response = await apiService.get('/api/messages/conversations');
      if (response.success) {
        setConversations(response.data || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await apiService.get(`/api/messages/conversation/${conversationId}`);
      if (response.success) {
        setMessages(response.data || []);
        // Mark messages as read
        await apiService.put(`/api/messages/conversation/${conversationId}/read`);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const response = await apiService.post('/api/messages/send', {
        conversationId: selectedConversation,
        message: newMessage.trim(),
      });

      if (response.success) {
        setNewMessage('');
        loadMessages(selectedConversation);
        loadConversations();
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'support': return '💬';
      case 'system': return '🔔';
      default: return '👤';
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[styles.conversationItem, item.unreadCount > 0 && styles.unreadConversation]}
      onPress={() => setSelectedConversation(item.id)}
    >
      <Text style={styles.conversationIcon}>{getMessageIcon(item.type)}</Text>
      <View style={styles.conversationContent}>
        <Text style={styles.conversationName}>{item.participantName}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
        <Text style={styles.messageTime}>{item.lastMessageTime}</Text>
      </View>
      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>{item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageItem, item.senderId === 'currentUser' && styles.ownMessage]}>
      <Text style={styles.senderName}>{item.senderName}</Text>
      <Text style={styles.messageText}>{item.message}</Text>
      <Text style={styles.messageTime}>{item.timestamp}</Text>
    </View>
  );

  if (selectedConversation) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedConversation(null)}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.placeholder} />
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.messagesList}
          inverted
        />

        <View style={styles.messageInput}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Support')}>
          <Text style={styles.newMessageButton}>✉️</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        contentContainerStyle={styles.conversationsList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>💬</Text>
            <Text style={styles.emptyStateText}>No messages yet</Text>
            <Text style={styles.emptyStateSubtext}>Start a conversation with support</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#4682b4',
  },
  backButton: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  newMessageButton: {
    fontSize: 20,
  },
  placeholder: {
    width: 50,
  },
  conversationsList: {
    padding: 15,
  },
  conversationItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadConversation: {
    borderLeftWidth: 4,
    borderLeftColor: '#4682b4',
  },
  conversationIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  conversationContent: {
    flex: 1,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadBadge: {
    backgroundColor: '#4682b4',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messagesList: {
    flex: 1,
    padding: 15,
  },
  messageItem: {
    backgroundColor: '#e5f2ff',
    padding: 12,
    borderRadius: 15,
    marginBottom: 10,
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  ownMessage: {
    backgroundColor: '#4682b4',
    alignSelf: 'flex-end',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 3,
  },
  messageInput: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#4682b4',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    padding: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default MessagesScreen;
