import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, CreditCard, Clock, CheckCircle, AlertTriangle, 
  Eye, DollarSign, Calendar, FileText, Star, MessageSquare
} from 'lucide-react';

interface SecurePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    totalAmount: number;
    merchantName: string;
    items: any[];
    deliveryAddress: string;
  } | null;
}

export default function SecurePaymentModal({ isOpen, onClose, order }: SecurePaymentModalProps) {
  const [paymentStep, setPaymentStep] = useState<'payment' | 'processing' | 'escrow' | 'completed'>('payment');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [escrowTimer, setEscrowTimer] = useState(7 * 24 * 60 * 60); // 7 days in seconds
  const { toast } = useToast();

  // Initiate secure payment
  const initiatePaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      return apiRequest("POST", "/api/transactions/initiate-payment", paymentData);
    },
    onSuccess: async (response) => {
      const result = await response.json();
      if (result.success) {
        setTransactionId(result.transaction.id);
        setPaymentStep('processing');
        
        // Simulate processing delay
        setTimeout(() => {
          setPaymentStep('escrow');
          toast({ 
            title: "Payment Successful",
            description: "Funds secured in escrow. Merchant has been notified."
          });
        }, 2000);
      }
    },
    onError: (error) => {
      toast({ 
        title: "Payment Failed",
        description: "Please check your payment method and try again.",
        variant: "destructive"
      });
    }
  });

  // Confirm delivery
  const confirmDeliveryMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/transactions/confirm-delivery", data);
    },
    onSuccess: () => {
      setPaymentStep('completed');
      toast({ 
        title: "Delivery Confirmed",
        description: "Funds have been released to the merchant."
      });
    }
  });

  // Get transaction status
  const { data: transactionHistory } = useQuery({
    queryKey: ['/api/transactions/history'],
    enabled: paymentStep === 'escrow',
    refetchInterval: 30000 // Check every 30 seconds
  });

  // Countdown timer effect
  useEffect(() => {
    if (paymentStep === 'escrow' && escrowTimer > 0) {
      const timer = setInterval(() => {
        setEscrowTimer(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [paymentStep, escrowTimer]);

  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const handlePayment = () => {
    if (!order) return;

    initiatePaymentMutation.mutate({
      orderId: order.id,
      amount: order.totalAmount,
      paymentMethod: selectedPaymentMethod,
      customerDetails: {
        name: 'Customer Name', // Get from user session
        email: 'customer@example.com',
        phone: '+234123456789'
      }
    });
  };

  const handleConfirmDelivery = (rating: number, feedback?: string) => {
    confirmDeliveryMutation.mutate({
      transactionId,
      rating,
      feedback
    });
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2 text-blue-600" />
            Secure Payment & Escrow
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold">Total Amount</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                <p>Merchant: {order.merchantName}</p>
                <p>Items: {order.items.length} item(s)</p>
                <p>Delivery: {order.deliveryAddress}</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Step */}
          {paymentStep === 'payment' && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>
                  Your payment will be held securely in escrow until delivery is confirmed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">
                      <div className="flex items-center">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Credit/Debit Card
                      </div>
                    </SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="wallet">Digital Wallet</SelectItem>
                  </SelectContent>
                </Select>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <Shield className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                    <div className="text-sm">
                      <h4 className="font-semibold text-blue-900">Secure Escrow Protection</h4>
                      <p className="text-blue-700 mt-1">
                        Your payment is held safely until you confirm delivery. 
                        Automatic release after 7 days if no issues are reported.
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handlePayment}
                  disabled={initiatePaymentMutation.isPending}
                  className="w-full"
                >
                  {initiatePaymentMutation.isPending ? 'Processing...' : 'Pay Securely'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Processing Step */}
          {paymentStep === 'processing' && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                    <CreditCard className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Processing Payment...</h3>
                  <Progress value={75} className="w-full max-w-sm mx-auto" />
                  <p className="text-sm text-gray-600">
                    Securing your payment with Paystack/Flutterwave
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Escrow Step */}
          {paymentStep === 'escrow' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-green-600">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Payment Secured in Escrow
                  </CardTitle>
                  <CardDescription>
                    Transaction ID: {transactionId}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <DollarSign className="w-8 h-8 mx-auto text-green-600 mb-2" />
                      <p className="font-semibold">Funds Secured</p>
                      <p className="text-sm text-gray-600">{formatCurrency(order.totalAmount)}</p>
                    </div>
                    <div className="text-center">
                      <Clock className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                      <p className="font-semibold">Auto Release</p>
                      <p className="text-sm text-gray-600">{formatTime(escrowTimer)}</p>
                    </div>
                    <div className="text-center">
                      <Eye className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                      <p className="font-semibold">Status</p>
                      <Badge variant="secondary">Awaiting Delivery</Badge>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">What happens next?</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Merchant has been notified and will prepare your order</li>
                      <li>• You'll receive real-time updates on order progress</li>
                      <li>• Confirm delivery to release funds to merchant</li>
                      <li>• Funds automatically released after 7 days</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Mock delivery confirmation */}
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Confirmation</CardTitle>
                  <CardDescription>
                    Confirm when you receive your order to release payment
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Order Delivered?</p>
                      <p className="text-sm text-gray-600">Click to confirm and release funds</p>
                    </div>
                    <Button onClick={() => handleConfirmDelivery(5, 'Great service!')}>
                      Confirm Delivery
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Having issues?</p>
                    <Button variant="outline" size="sm" className="w-full">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Report Problem / File Dispute
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Completed Step */}
          {paymentStep === 'completed' && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-600">Transaction Complete!</h3>
                  <p className="text-gray-600">
                    Funds have been released to the merchant. Thank you for your purchase!
                  </p>
                  <div className="flex justify-center space-x-2">
                    <Button variant="outline" onClick={onClose}>
                      Close
                    </Button>
                    <Button>
                      <Star className="w-4 h-4 mr-2" />
                      Rate Experience
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transaction Timeline */}
          {paymentStep !== 'payment' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Transaction Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-gray-600">Payment initiated and secured</span>
                    <span className="ml-auto text-xs text-gray-500">2 mins ago</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-gray-600">Merchant notified</span>
                    <span className="ml-auto text-xs text-gray-500">2 mins ago</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-gray-300 rounded-full mr-3"></div>
                    <span className="text-gray-400">Awaiting delivery confirmation</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}