import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import ChatPage from '../../../client/src/pages/chat';

// Mock the auth hook
const mockUser = {
  id: 1,
  fullName: 'Test User',
  email: 'test@example.com',
  role: 'CONSUMER'
};

jest.mock('../../../client/src/hooks/use-auth', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: () => true,
    login: jest.fn(),
    logout: jest.fn()
  })
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ChatPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  const renderChat = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Router>
          <ChatPage />
        </Router>
      </QueryClientProvider>
    );
  };

  test('should render chat interface', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          {
            id: 'conv-1',
            customerName: 'Test Customer',
            vendorName: 'Test Vendor',
            lastMessage: 'Hello',
            conversationType: 'QUOTE'
          }
        ])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          {
            id: 'msg-1',
            content: 'Test message',
            senderName: 'Test User',
            createdAt: new Date().toISOString()
          }
        ])
      });

    renderChat();

    expect(screen.getByText('Messages')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Test Vendor')).toBeInTheDocument();
    });
  });

  test('should display conversations list', async () => {
    const mockConversations = [
      {
        id: 'conv-1',
        customerName: 'Customer 1',
        vendorName: 'Vendor 1',
        lastMessage: 'Hello there',
        conversationType: 'QUOTE',
        lastMessageAt: new Date().toISOString()
      },
      {
        id: 'conv-2',
        customerName: 'Customer 2',
        vendorName: 'Vendor 2',
        lastMessage: 'Order update',
        conversationType: 'ORDER',
        lastMessageAt: new Date().toISOString()
      }
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockConversations)
    });

    renderChat();

    await waitFor(() => {
      expect(screen.getByText('Vendor 1')).toBeInTheDocument();
      expect(screen.getByText('Vendor 2')).toBeInTheDocument();
      expect(screen.getByText('Hello there')).toBeInTheDocument();
      expect(screen.getByText('Order update')).toBeInTheDocument();
    });
  });

  test('should display messages for selected conversation', async () => {
    const mockMessages = [
      {
        id: 'msg-1',
        content: 'First message',
        senderName: 'User 1',
        senderId: 1,
        messageType: 'TEXT',
        createdAt: new Date().toISOString()
      },
      {
        id: 'msg-2',
        content: 'Second message',
        senderName: 'User 2',
        senderId: 2,
        messageType: 'QUOTE_REQUEST',
        createdAt: new Date().toISOString()
      }
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{
          id: 'conv-1',
          customerName: 'Test Customer',
          vendorName: 'Test Vendor'
        }])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMessages)
      });

    renderChat();

    await waitFor(() => {
      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
      expect(screen.getByText('Quote Request')).toBeInTheDocument();
    });
  });

  test('should send message when form is submitted', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{
          id: 'conv-1',
          customerName: 'Test Customer',
          vendorName: 'Test Vendor'
        }])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'msg-new',
          content: 'New message',
          senderId: 1
        })
      });

    renderChat();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/messages', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Test message')
      }));
    });
  });

  test('should handle empty conversations state', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });

    renderChat();

    await waitFor(() => {
      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
      expect(screen.getByText('Start by requesting a quote or placing an order')).toBeInTheDocument();
    });
  });

  test('should handle loading states', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderChat();

    expect(screen.getByText('Loading conversations...')).toBeInTheDocument();
  });

  test('should display message types correctly', async () => {
    const messagesWithTypes = [
      {
        id: 'msg-1',
        content: 'Quote request message',
        messageType: 'QUOTE_REQUEST',
        senderName: 'Customer',
        senderId: 2,
        createdAt: new Date().toISOString()
      },
      {
        id: 'msg-2',
        content: 'Quote response message',
        messageType: 'QUOTE_RESPONSE',
        senderName: 'Vendor',
        senderId: 3,
        createdAt: new Date().toISOString()
      }
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{
          id: 'conv-1',
          customerName: 'Test Customer',
          vendorName: 'Test Vendor'
        }])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(messagesWithTypes)
      });

    renderChat();

    await waitFor(() => {
      expect(screen.getByText('Quote Request')).toBeInTheDocument();
      expect(screen.getByText('Quote Response')).toBeInTheDocument();
    });
  });
});