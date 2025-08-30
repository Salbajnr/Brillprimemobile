
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

interface Rating {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  customerName: string;
  orderId: number;
}

interface RatingSummary {
  averageRating: number;
  totalRatings: number;
  breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export default function MerchantRatingsPage() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMerchantRatings();
  }, [merchantId]);

  const fetchMerchantRatings = async () => {
    try {
      const response = await api.get(`/ratings/merchant/${merchantId}/summary`);
      if (response.data.success) {
        setSummary(response.data.data.summary);
        setRatings(response.data.data.recentRatings);
      }
    } catch (error) {
      console.error('Failed to fetch merchant ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <span 
        key={index}
        className={`text-xl ${index < rating ? 'text-yellow-400' : 'text-gray-300'}`}
      >
        ⭐
      </span>
    ));
  };

  const renderRatingBar = (stars: number, count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <div className="flex items-center gap-2 mb-2">
        <span className="w-8 text-sm">{stars}★</span>
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            className="bg-yellow-400 h-2 rounded-full" 
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="w-8 text-sm text-gray-600">{count}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading ratings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button 
            onClick={() => window.history.back()}
            variant="outline"
            className="mb-4"
          >
            ← Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Merchant Ratings</h1>
        </div>

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Rating Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Overall Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    {summary.averageRating.toFixed(1)}
                  </div>
                  <div className="flex justify-center mb-2">
                    {renderStars(Math.round(summary.averageRating))}
                  </div>
                  <p className="text-gray-600">
                    Based on {summary.totalRatings} reviews
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Rating Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Rating Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {[5, 4, 3, 2, 1].map(stars => 
                  renderRatingBar(stars, summary.breakdown[stars as keyof typeof summary.breakdown], summary.totalRatings)
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Ratings */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {ratings.length > 0 ? (
              <div className="space-y-4">
                {ratings.map((rating) => (
                  <div key={rating.id} className="border-b pb-4 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rating.customerName}</span>
                        <div className="flex">
                          {renderStars(rating.rating)}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(rating.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    {rating.comment && (
                      <p className="text-gray-700 mb-2">{rating.comment}</p>
                    )}
                    <p className="text-sm text-gray-500">Order #{rating.orderId}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No reviews yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
