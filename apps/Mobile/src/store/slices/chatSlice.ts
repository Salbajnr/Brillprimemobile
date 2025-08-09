import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ChatState {
  conversations: any[];
  activeConversation: any | null;
  messages: any[];
  loading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  conversations: [],
  activeConversation: null,
  messages: [],
  loading: false,
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setConversations: (state, action: PayloadAction<any[]>) => {
      state.conversations = action.payload;
      state.loading = false;
      state.error = null;
    },
    addConversation: (state, action: PayloadAction<any>) => {
      state.conversations.unshift(action.payload);
    },
    setActiveConversation: (state, action: PayloadAction<any>) => {
      state.activeConversation = action.payload;
    },
    setMessages: (state, action: PayloadAction<any[]>) => {
      state.messages = action.payload;
    },
    addMessage: (state, action: PayloadAction<any>) => {
      state.messages.push(action.payload);
      // Update last message in conversation
      const conversation = state.conversations.find(
        conv => conv.id === action.payload.conversationId
      );
      if (conversation) {
        conversation.lastMessage = action.payload.content;
        conversation.lastMessageAt = action.payload.createdAt;
      }
    },
    updateMessage: (state, action: PayloadAction<{ id: string; updates: any }>) => {
      const index = state.messages.findIndex(msg => msg.id === action.payload.id);
      if (index !== -1) {
        state.messages[index] = { ...state.messages[index], ...action.payload.updates };
      }
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearMessages: (state) => {
      state.messages = [];
    },
  },
});

export const {
  setLoading,
  setConversations,
  addConversation,
  setActiveConversation,
  setMessages,
  addMessage,
  updateMessage,
  setError,
  clearError,
  clearMessages,
} = chatSlice.actions;

export default chatSlice.reducer;