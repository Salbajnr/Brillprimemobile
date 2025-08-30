
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Star, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";

interface OrderDetails {
  id: string;
  orderNumber: string;
  driverName: string;
  deliveredAt: string;
  totalAmount: string;
  deliveryAddress: string;
}

export default function RateDelivery() {
  const [, setLocation] = useLocation();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [driverRating, setDriverRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [deliveryTimeRating, setDeliveryTimeRating] = useState(0);
  const [deliveryQuality, setDeliveryQuality] = useState<'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR'>('GOOD');
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [comment, setComment] = useState('');
  const [additionalFeedback, setAdditionalFeedback] = useState('');
  const [issuesReported, setIssuesReported] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const orderId = window.location.pathname.split('/').pop();

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) return;

      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setOrder(data.order);
        } else {
          toast({
            title: "Error",
            description: "Failed to load order details",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Failed to fetch order details:', error);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  const handleStarRating = (rating: number, type: 'driver' | 'service' | 'time') => {
    switch (type) {
      case 'driver':
        setDriverRating(rating);
        break;
      case 'service':
        setServiceRating(rating);
        break;
      case 'time':
        setDeliveryTimeRating(rating);
        break;
    }
  };

  const handleIssueToggle = (issue: string) => {
    setIssuesReported(prev => 
      prev.includes(issue) 
        ? prev.filter(i => i !== issue)
        : [...prev, issue]
    );
  };

  const submitRating = async () => {
    if (!order || driverRating === 0 || serviceRating === 0 || deliveryTimeRating === 0) {
      toast({
        title: "Missing Rating",
        description: "Please rate all aspects of your delivery",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback/rate-delivery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          orderId: order.id,
          driverRating,
          serviceRating,
          deliveryTimeRating,
          deliveryQuality,
          wouldRecommend,
          comment: comment.trim() || undefined,
          additionalFeedback: additionalFeedback.trim() || undefined,
          issuesReported: issuesReported.length > 0 ? issuesReported : undefined
        })
      });

      if (response.ok) {
        toast({
          title: "Thank You!",
          description: "Your feedback has been submitted successfully",
          variant: "default"
        });
        
        setTimeout(() => {
          setLocation("/order-history");
        }, 2000);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to submit rating",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Rating submission error:', error);
      toast({
        title: "Error",
        description: "Failed to submit rating. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({ rating, onRate, label }: { rating: number; onRate: (rating: number) => void; label: string }) => (
    <div className="space-y-2">
      <p className="font-medium text-gray-700">{label}</p>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onRate(star)}
            className="focus:outline-none"
          >
            <Star 
              className={`w-8 h-8 ${
                star <= rating 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
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
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#131313]">Order #{order.orderNumber}</h3>
              <Badge className="bg-green-100 text-green-800">Delivered</Badge>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p><span className="font-medium">Driver:</span> {order.driverName}</p>
              <p><span className="font-medium">Delivered:</span> {new Date(order.deliveredAt).toLocaleString()}</p>
              <p><span className="font-medium">Amount:</span> ₦{order.totalAmount}</p>
            </div>
          </CardContent>
        </Card>

        {/* Rating Sections */}
        <Card>
          <CardContent className="p-4 space-y-6">
            <h3 className="font-semibold text-[#131313] mb-4">Rate Your Experience</h3>
            
            <StarRating 
              rating={driverRating}
              onRate={(rating) => handleStarRating(rating, 'driver')}
              label="Driver Performance"
            />

            <StarRating 
              rating={serviceRating}
              onRate={(rating) => handleStarRating(rating, 'service')}
              label="Service Quality"
            />

            <StarRating 
              rating={deliveryTimeRating}
              onRate={(rating) => handleStarRating(rating, 'time')}
              label="Delivery Time"
            />
          </CardContent>
        </Card>

        {/* Delivery Quality */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-[#131313] mb-3">Overall Delivery Quality</h3>
            <div className="grid grid-cols-2 gap-2">
              {(['EXCELLENT', 'GOOD', 'AVERAGE', 'POOR'] as const).map((quality) => (
                <button
                  key={quality}
                  onClick={() => setDeliveryQuality(quality)}
                  className={`p-3 rounded-lg text-sm font-medium border ${
                    deliveryQuality === quality
                      ? 'bg-[#4682b4] text-white border-[#4682b4]'
                      : 'bg-white text-gray-700 border-gray-200'
                  }`}
                >
                  {quality.charAt(0) + quality.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recommendation */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-[#131313] mb-3">Would you recommend this driver?</h3>
            <div className="flex space-x-4">
              <button
                onClick={() => setWouldRecommend(true)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  wouldRecommend
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Yes</span>
              </button>
              <button
                onClick={() => setWouldRecommend(false)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  !wouldRecommend
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
                <span>No</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Issues Reported */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-[#131313] mb-3">Any Issues? (Optional)</h3>
            <div className="space-y-2">
              {[
                'Late delivery',
                'Poor communication',
                'Damaged items',
                'Wrong location',
                'Unprofessional behavior',
                'Payment issues'
              ].map((issue) => (
                <div key={issue} className="flex items-center space-x-2">
                  <Checkbox
                    id={issue}
                    checked={issuesReported.includes(issue)}
                    onCheckedChange={() => handleIssueToggle(issue)}
                  />
                  <label htmlFor={issue} className="text-sm text-gray-700">
                    {issue}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-[#131313] mb-3">
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Comments (Optional)
            </h3>
            <Textarea
              placeholder="Tell us about your delivery experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mb-3"
              maxLength={500}
            />
            <Textarea
              placeholder="Additional feedback or suggestions..."
              value={additionalFeedback}
              onChange={(e) => setAdditionalFeedback(e.target.value)}
              maxLength={500}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          onClick={submitRating}
          disabled={isSubmitting || driverRating === 0 || serviceRating === 0 || deliveryTimeRating === 0}
          className="w-full bg-[#4682b4] hover:bg-[#3a6b99] text-white py-3"
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Submitting...</span>
            </div>
          ) : (
            'Submit Rating'
          )}
        </Button>
      </div>
    </div>
  );
}
