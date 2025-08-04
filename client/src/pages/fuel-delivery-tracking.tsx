import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Phone, MessageCircle, Truck, Clock, MapPin, Star, Navigation } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { useWebSocketDriverTracking, useWebSocketPayments } from '../hooks/use-websocket';

export default function FuelDeliveryTracking() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const location = useLocation();
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);

  // WebSocket hooks for real-time tracking
  const { 
    connected: trackingConnected,
    driverLocations,
    etaUpdates,
    subscribeToDriverTracking,
    calculateETA
  } = useWebSocketDriverTracking();

  const {
    connected: paymentConnected,
    paymentUpdates,
    walletBalance
  } = useWebSocketPayments();

  const {
    connected: deliveryConnected,
    deliveryUpdates,
    driverLocationUpdates,
    subscribeToDeliveryTracking
  } = useWebSocketFuelDelivery();

  // Get tracking data from navigation state or initialize default
  const [tracking, setTracking] = useState(() => {
    return location.state?.tracking || {
      orderId: orderId || 'ORD-001',
      status: 'in_transit',
      driverName: 'John Smith',
      driverPhone: '+234 801 234 5678',
      driverRating: 4.8,
      vehicleDetails: 'Toyota Camry - ABC 123 XY',
      estimatedTime: '15 minutes',
      currentLocation: 'Approaching Victoria Island',
      fuelType: 'Premium Motor Spirit (PMS)',
      quantity: '20 Litres',
      amount: '₦15,000'
    };
  });

  const [realTimeLocation, setRealTimeLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [realTimeETA, setRealTimeETA] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting');

  // Subscribe to real-time tracking when component mounts
  useEffect(() => {
    if (trackingConnected && orderId) {
      subscribeToDriverTracking(orderId);
      setConnectionStatus('connected');
    } else if (!trackingConnected) {
      setConnectionStatus('disconnected');
    }
  }, [trackingConnected, orderId, subscribeToDriverTracking]);

  // Subscribe to fuel delivery tracking
  useEffect(() => {
    if (deliveryConnected && orderId) {
      subscribeToDeliveryTracking(orderId);
    }
  }, [deliveryConnected, orderId, subscribeToDeliveryTracking]);

  // Process real-time delivery updates
  useEffect(() => {
    if (deliveryUpdates[orderId || '']) {
      const deliveryData = deliveryUpdates[orderId || ''];
      
      if (deliveryData.type === 'DELIVERY_STARTED') {
        setTracking(prev => ({
          ...prev,
          status: 'in_transit',
          driverName: deliveryData.driverName || prev.driverName,
          estimatedTime: deliveryData.estimatedDeliveryTime || prev.estimatedTime
        }));

        toast({
          title: "Delivery Started",
          description: "Your fuel is now on the way!",
          duration: 5000,
        });
      }
    }
  }, [deliveryUpdates, orderId, toast]);

  // Process driver location updates from fuel delivery
  useEffect(() => {
    if (driverLocationUpdates[orderId || '']) {
      const locationData = driverLocationUpdates[orderId || ''];
      
      setRealTimeLocation(locationData.location);
      if (locationData.eta) {
        setRealTimeETA(locationData.eta);
        setTracking(prev => ({
          ...prev,
          estimatedTime: locationData.eta,
          currentLocation: locationData.distance ? 
            `${locationData.distance} away` : prev.currentLocation
        }));
      }

      toast({
        title: "Location Updated",
        description: locationData.eta ? 
          `ETA: ${locationData.eta}` : "Driver location updated",
        duration: 3000,
      });
    }
  }, [driverLocationUpdates, orderId, toast]);

  // Process real-time driver location updates
  useEffect(() => {
    if (driverLocations[orderId || '']) {
      const locationData = driverLocations[orderId || ''];
      setRealTimeLocation(locationData.location);

      if (locationData.eta) {
        setRealTimeETA(locationData.eta);
        setTracking(prev => ({
          ...prev,
          estimatedTime: locationData.eta,
          currentLocation: locationData.distance ? 
            `${locationData.distance} away` : prev.currentLocation
        }));
      }

      // Show toast notification for location updates
      toast({
        title: "Driver Location Updated",
        description: locationData.eta ? 
          `ETA: ${locationData.eta}` : "Driver location has been updated",
        duration: 3000,
      });
    }
  }, [driverLocations, orderId, toast]);

  // Process ETA updates
  useEffect(() => {
    if (etaUpdates[orderId || '']) {
      const etaData = etaUpdates[orderId || ''];
      setRealTimeETA(etaData.eta);

      setTracking(prev => ({
        ...prev,
        estimatedTime: etaData.eta,
        currentLocation: etaData.distance ? 
          `${etaData.distance} away` : prev.currentLocation
      }));

      toast({
        title: "ETA Updated",
        description: `New estimated arrival: ${etaData.eta}`,
        duration: 3000,
      });
    }
  }, [etaUpdates, orderId, toast]);

  // Process payment updates
  useEffect(() => {
    const latestPaymentUpdate = Object.values(paymentUpdates).pop();
    if (latestPaymentUpdate && latestPaymentUpdate.type === 'PAYMENT_SUCCESS') {
      toast({
        title: "Payment Confirmed",
        description: "Your payment has been processed successfully",
        duration: 5000,
      });
    }
  }, [paymentUpdates, toast]);
}