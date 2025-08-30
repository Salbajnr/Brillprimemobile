
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Star, Send, CheckCircle, Heart, ThumbsUp, MessageSquare, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/api";

interface OrderDetails {
  id: string;
  orderNumber: string;
  driverName: string;
  driverPhoto?: string;
  deliveryTime: string;
  orderType: string;
  items: string[];
  totalAmount: number;
}

interface FeedbackCategories {
  punctuality: number;
  professionalism: number;
  communication: number;
  vehicle_condition: number;
  overall: number;
}

export default function RateDelivery() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Get order ID from URL
  const orderId = window.location.pathname.split('/').pop();
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [overallRating, setOverallRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [categories, setCategories] = useState<FeedbackCategories>({
    punctuality: 0,
    professionalism: 0,
    communication: 0,
    vehicle_condition: 0,
    overall: 0
  });
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [bonus, setBonus] = useState(0);

  // Fetch order details
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) return;

      try {
        const response = await apiClient.order.getOrder(orderId);
        if (response.success && response.data) {
          const orderData = response.data.order;
          setOrder({
            id: orderData.id,
            orderNumber: orderData.orderNumber,
            driverName: orderData.driverName || 'Driver',
            deliveryTime: new Date(orderData.deliveredAt || orderData.updatedAt).toLocaleString(),
            orderType: orderData.orderType,
            items: orderData.items ? orderData.items.map((item: any) => item.name) : ['Delivery items'],
            totalAmount: parseFloat(orderData.totalAmount)
          });
        }
      } catch (error) {
        console.error('Error fetching order details:', error);
        toast({
          title: "Error",
          description: "Failed to load order details",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, toast]);

  // Update overall rating when categories change
  useEffect(() => {
    if (categories.punctuality && categories.professionalism && categories.communication && categories.vehicle_condition) {
      const avg = (categories.punctuality + categories.professionalism + categories.communication + categories.vehicle_condition) / 4;
      setCategories(prev => ({ ...prev, overall: Math.round(avg) }));
      setOverallRating(Math.round(avg));
    }
  }, [categories.punctuality, categories.professionalism, categories.communication, categories.vehicle_condition]);

  const handleStarClick = (rating: number, category?: keyof FeedbackCategories) => {
    if (category) {
      setCategories(prev => ({ ...prev, [category]: rating }));
    } else {
      setOverallRating(rating);
      setCategories(prev => ({ ...prev, overall: rating }));
    }
  };

  const handleSubmit = async () => {
    if (!orderId || overallRating === 0) {
      toast({
        title: "Rating Required",
        description: "Please provide an overall rating before submitting",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/delivery-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          orderId,
          rating: overallRating,
          comment: comment.trim() || undefined,
          categories: {
            punctuality: categories.punctuality || overallRating,
            professionalism: categories.professionalism || overallRating,
            communication: categories.communication || overallRating,
            vehicle_condition: categories.vehicle_condition || overallRating,
            overall: overallRating
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
        setBonus(data.feedback?.bonus || 0);
        
        toast({
          title: "Thank You!",
          description: "Your feedback has been submitted successfully",
        });

        // Redirect after 3 seconds
        setTimeout(() => {
          setLocation('/order-history');
        }, 3000);
      } else {
        throw new Error(data.message || 'Failed to submit feedback');
      }
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (value: number, onStarClick: (rating: number) => void, hover?: number, onHover?: (rating: number) => void, onLeave?: () => void) => (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onStarClick(star)}
          onMouseEnter={() => onHover?.(star)}
          onMouseLeave={() => onLeave?.()}
          className="focus:outline-none transition-colors"
        >
          <Star
            className={`w-8 h-8 ${
              star <= (hover || value)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <div className="mb-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
              <p className="text-gray-600">Your feedback has been submitted successfully</p>
            </div>
            
            {bonus > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <Award className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 font-medium">
                  Driver earned a ₦{bonus} bonus for your {overallRating}-star rating!
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-center">
                {renderStars(overallRating, () => {}, 0)}
              </div>
              <p className="text-sm text-gray-500">
                Redirecting to order history in a few seconds...
              </p>
              <Button
                onClick={() => setLocation('/order-history')}
                className="w-full"
              >
                View Order History
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Order not found</p>
          <Button onClick={() => setLocation("/order-history")}>
            View Order History
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/order-history")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-[#131313]">Rate Delivery</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order #{order.orderNumber}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Delivered by</span>
              <span className="font-medium">{order.driverName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery time</span>
              <span className="font-medium">{order.deliveryTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Order type</span>
              <Badge variant="outline">{order.orderType}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total amount</span>
              <span className="font-medium">₦{order.totalAmount.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Overall Rating */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Overall Rating
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">How was your overall delivery experience?</p>
            {renderStars(
              overallRating,
              (rating) => handleStarClick(rating),
              hoverRating,
              setHoverRating,
              () => setHoverRating(0)
            )}
            <p className="text-sm text-gray-500 mt-2">
              {overallRating > 0 && (
                <>
                  {overallRating === 5 && "Excellent! ⭐"}
                  {overallRating === 4 && "Great! 👍"}
                  {overallRating === 3 && "Good 👌"}
                  {overallRating === 2 && "Fair 😐"}
                  {overallRating === 1 && "Poor 😞"}
                </>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Category Ratings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rate by Category</CardTitle>
            <p className="text-sm text-gray-600">Help us understand specific areas</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'punctuality' as keyof FeedbackCategories, label: 'Punctuality', icon: '⏰' },
              { key: 'professionalism' as keyof FeedbackCategories, label: 'Professionalism', icon: '👔' },
              { key: 'communication' as keyof FeedbackCategories, label: 'Communication', icon: '💬' },
              { key: 'vehicle_condition' as keyof FeedbackCategories, label: 'Vehicle Condition', icon: '🚗' }
            ].map(({ key, label, icon }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{icon}</span>
                  <Label className="text-sm">{label}</Label>
                </div>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleStarClick(star, key)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= categories[key]
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Comment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Additional Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Share your experience or suggestions for improvement..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={500}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              {comment.length}/500 characters
            </p>
          </CardContent>
        </Card>

        {/* Rating Bonus Info */}
        {overallRating >= 4 && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-800">
                <Award className="w-5 h-5" />
                <span className="font-medium">
                  Your {overallRating}-star rating will earn the driver a ₦{overallRating === 5 ? 100 : 50} bonus!
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={overallRating === 0 || isSubmitting}
          className="w-full h-12 text-lg"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Submit Rating
            </div>
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          Your feedback helps us improve our service and reward great drivers
        </p>
      </div>
    </div>
  );
}
