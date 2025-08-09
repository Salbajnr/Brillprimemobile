import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";

interface Notification {
  id: string;
  type: "message" | "payment" | "order" | "delivery" | "system" | "security";
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  priority: "low" | "medium" | "high";
  actionUrl?: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate role-specific notifications
  useEffect(() => {
    if (!user) return;

    const generateNotifications = (): Notification[] => {
      const baseNotifications: Notification[] = [];

      if (user.role === "CONSUMER") {
        return [
          {
            id: "notif-1",
            type: "payment",
            title: "Payment Successful",
            message: "Your fuel purchase of ₦12,500 at Total Energies has been completed successfully.",
            timestamp: new Date(Date.now() - 30 * 60 * 1000),
            isRead: false,
            priority: "medium",
            actionUrl: "/transactions"
          },
          {
            id: "notif-2", 
            type: "message",
            title: "New Quote Response",
            message: "Golden Grains Store has responded to your bulk rice order quote with a 15% discount offer.",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            isRead: false,
            priority: "high",
            actionUrl: "/chat"
          },
          {
            id: "notif-3",
            type: "delivery",
            title: "Order Out for Delivery",
            message: "Your organic face cream order is now out for delivery. Expected arrival: 2:30 PM today.",
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            isRead: true,
            priority: "medium",
            actionUrl: "/orders"
          },
          {
            id: "notif-4",
            type: "system",
            title: "Wallet Top-up Complete",
            message: "₦50,000 has been successfully added to your Brillprime wallet via bank transfer.",
            timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
            isRead: true,
            priority: "low",
            actionUrl: "/wallet"
          }
        ];
      } else if (user.role === "MERCHANT") {
        return [
          {
            id: "notif-1",
            type: "order",
            title: "New Order Received",
            message: "You have received a new order for Premium Long Grain Rice (50kg). Order value: ₦34,000.",
            timestamp: new Date(Date.now() - 15 * 60 * 1000),
            isRead: false,
            priority: "high",
            actionUrl: "/merchant-dashboard"
          },
          {
            id: "notif-2",
            type: "message",
            title: "Customer Inquiry",
            message: "A customer is asking about bulk pricing for your electronics collection.",
            timestamp: new Date(Date.now() - 45 * 60 * 1000),
            isRead: false,
            priority: "medium",
            actionUrl: "/chat"
          },
          {
            id: "notif-3",
            type: "payment",
            title: "Payment Received",
            message: "Payment of ₦127,500 has been received for order #BP-2025-001.",
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
            isRead: true,
            priority: "medium",
            actionUrl: "/merchant-dashboard"
          },
          {
            id: "notif-4",
            type: "system",
            title: "Product Low Stock Alert",
            message: "Your Samsung Galaxy Tablet inventory is running low (3 items remaining).",
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
            isRead: true,
            priority: "medium",
            actionUrl: "/merchant-dashboard"
          }
        ];
      } else if (user.role === "DRIVER") {
        return [
          {
            id: "notif-1",
            type: "delivery",
            title: "New Pickup Request",
            message: "You have a new pickup request from Golden Grains Store. Package value: ₦34,000.",
            timestamp: new Date(Date.now() - 10 * 60 * 1000),
            isRead: false,
            priority: "high",
            actionUrl: "/driver-dashboard"
          },
          {
            id: "notif-2",
            type: "message",
            title: "Customer Update",
            message: "Customer has updated delivery address for order #BP-2025-001.",
            timestamp: new Date(Date.now() - 25 * 60 * 1000),
            isRead: false,
            priority: "medium",
            actionUrl: "/chat"
          },
          {
            id: "notif-3",
            type: "payment",
            title: "Delivery Payment Received",
            message: "You've earned ₦2,500 for completing delivery to Victoria Island, Lagos.",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            isRead: true,
            priority: "medium",
            actionUrl: "/driver-dashboard"
          },
          {
            id: "notif-4",
            type: "system",
            title: "Weekly Earnings Summary",
            message: "This week you've completed 12 deliveries and earned ₦28,500. Great work!",
            timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
            isRead: true,
            priority: "low",
            actionUrl: "/driver-dashboard"
          }
        ];
      }

      return baseNotifications;
    };

    setNotifications(generateNotifications());
    setLoading(false);
  }, [user]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, isRead: true }
          : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  };

  const addNotification = (notification: Omit<Notification, "id" | "timestamp">) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification
  };
}