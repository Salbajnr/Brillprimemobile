
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'other';
  timestamp: Date;
  delivered: boolean;
}

const ChatScreen = ({ navigation, route }: any) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const { user } = useSelector((state: RootState) => state.auth);
  const { vendorName } = route.params || { vendorName: 'Vendor' };

  useEffect(() => {
    // Simulate initial messages
    const initialMessages: Message[] = [
      {
        id: '1',
        text: 'Hello! How can I help you today?',
        sender: 'other',
        timestamp: new Date(Date.now() - 300000),
        delivered: true,
      },
      {
        id: '2',
        text: 'Hi, I\'m interested in your products',
        sender: 'user',
        timestamp: new Date(Date.now() - 240000),
        delivered: true,
      },
      {
        id: '3',
        text: 'Great! What specifically are you looking for?',
        sender: 'other',
        timestamp: new Date(Date.now() - 180000),
        delivered: true,
      },
    ];
    setMessages(initialMessages);
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: message.trim(),
        sender: 'user',
        timestamp: new Date(),
        delivered: false,
      };

      setMessages(prev => [...prev, newMessage]);
      setMessage('');

      // Simulate message delivery
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === newMessage.id 
              ? { ...msg, delivered: true }
              : msg
          )
        );

        // Simulate response
        setTimeout(() => {
          const responses = [
            'I understand. Let me check that for you.',
            'That sounds good! Would you like more details?',
            'I can help you with that. What\'s your preferred time?',
            'Thank you for your interest. I\'ll get back to you shortly.',
          ];
          
          const randomResponse = responses[Math.floor(Math.random() * responses.length)];
          
          const responseMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: randomResponse,
            sender: 'other',
            timestamp: new Date(),
            delivered: true,
          };
          
          setMessages(prev => [...prev, responseMessage]);
        }, 2000);
      }, 1000);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{vendorName}</Text>
        <View style={styles.onlineStatus}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Online</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageWrapper,
              msg.sender === 'user' ? styles.userMessageWrapper : styles.otherMessageWrapper,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                msg.sender === 'user' ? styles.userMessage : styles.otherMessage,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  msg.sender === 'user' ? styles.userMessageText : styles.otherMessageText,
                ]}
              >
                {msg.text}
              </Text>
            </View>
            <View style={styles.messageInfo}>
              <Text style={styles.timestamp}>{formatTime(msg.timestamp)}</Text>
              {msg.sender === 'user' && (
                <Text style={styles.deliveryStatus}>
                  {msg.delivered ? '✓✓' : '✓'}
                </Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !message.trim() && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={!message.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    padding: 15,
    backgroundColor: '#2563eb',
  },
  backButton: {
    color: 'white',
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 5,
  },
  onlineText: {
    color: 'white',
    fontSize: 12,
  },
  messagesContainer: {
    flex: 1,
    padding: 15,
  },
  messageWrapper: {
    marginBottom: 15,
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  otherMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
  },
  userMessage: {
    backgroundColor: '#2563eb',
  },
  otherMessage: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: '#333',
  },
  messageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginRight: 5,
  },
  deliveryStatus: {
    fontSize: 12,
    color: '#10b981',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChatScreen;
