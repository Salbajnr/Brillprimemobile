import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import VendorFeedPage from '../../../client/src/pages/vendor-feed';

const mockUser = {
  id: 1,
  fullName: 'Test User',
  email: 'test@example.com',
  role: 'CONSUMER'
};

jest.mock('../../../client/src/hooks/use-auth', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: () => true
  })
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('VendorFeedPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderVendorFeed = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Router>
          <VendorFeedPage />
        </Router>
      </QueryClientProvider>
    );
  };

  test('should render vendor feed with posts', async () => {
    const mockPosts = [
      {
        id: '1',
        title: 'Premium Rice Collection',
        content: 'Fresh premium rice available',
        vendorName: 'Golden Grains Store',
        productName: 'Premium Rice',
        productPrice: '40000',
        postType: 'NEW_PRODUCT',
        originalPrice: '45000',
        discountPrice: '40000',
        discountPercentage: 11,
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        likeCount: 23,
        commentCount: 8,
        viewCount: 125
      }
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, posts: mockPosts })
    });

    renderVendorFeed();

    await waitFor(() => {
      expect(screen.getByText('Premium Rice Collection')).toBeInTheDocument();
      expect(screen.getByText('Golden Grains Store')).toBeInTheDocument();
      expect(screen.getByText('Fresh premium rice available')).toBeInTheDocument();
    });
  });

  test('should display business action buttons', async () => {
    const mockPosts = [
      {
        id: '1',
        title: 'Test Product',
        vendorName: 'Test Vendor',
        productId: 'prod-1',
        vendorId: 2,
        postType: 'NEW_PRODUCT',
        createdAt: new Date()
      }
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, posts: mockPosts })
    });

    renderVendorFeed();

    await waitFor(() => {
      expect(screen.getByText('Add to Cart')).toBeInTheDocument();
      expect(screen.getByText('Quote')).toBeInTheDocument();
      expect(screen.getByText('Wishlist')).toBeInTheDocument();
    });
  });

  test('should handle add to cart action', async () => {
    const mockPosts = [
      {
        id: '1',
        title: 'Test Product',
        vendorName: 'Test Vendor',
        productId: 'prod-1',
        vendorId: 2,
        postType: 'NEW_PRODUCT',
        createdAt: new Date()
      }
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, posts: mockPosts })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'Added to cart' })
      });

    renderVendorFeed();

    await waitFor(() => {
      const addToCartButton = screen.getByText('Add to Cart');
      fireEvent.click(addToCartButton);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/cart', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('prod-1')
      }));
    });
  });

  test('should display different post types correctly', async () => {
    const mockPosts = [
      {
        id: '1',
        title: 'New Product Alert',
        postType: 'NEW_PRODUCT',
        vendorName: 'Vendor 1',
        createdAt: new Date()
      },
      {
        id: '2',
        title: 'Flash Sale',
        postType: 'PROMOTION',
        vendorName: 'Vendor 2',
        createdAt: new Date()
      },
      {
        id: '3',
        title: 'Store Update',
        postType: 'ANNOUNCEMENT',
        vendorName: 'Vendor 3',
        createdAt: new Date()
      }
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, posts: mockPosts })
    });

    renderVendorFeed();

    await waitFor(() => {
      expect(screen.getByText('New Product Alert')).toBeInTheDocument();
      expect(screen.getByText('Flash Sale')).toBeInTheDocument();
      expect(screen.getByText('Store Update')).toBeInTheDocument();
    });
  });

  test('should handle loading state', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    renderVendorFeed();

    expect(screen.getByText('Loading posts...')).toBeInTheDocument();
  });

  test('should handle empty posts state', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, posts: [] })
    });

    renderVendorFeed();

    await waitFor(() => {
      expect(screen.getByText('No posts yet')).toBeInTheDocument();
    });
  });
});