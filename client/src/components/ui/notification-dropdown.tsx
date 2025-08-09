import { useState, useRef, useEffect } from "react";
import { Bell, X, Eye, MessageCircle, Package, CreditCard, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// Color constants
const COLORS = {
  PRIMARY: "#4682b4",
  SECONDARY: "#0b1a51", 
  ACTIVE: "#010e42",
  TEXT: "#131313",
  WHITE: "#ffffff"
};

interface Notification {
  id: string;
  type: "message" | "payment" | "order" | "delivery" | "system" | "security";
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  priority: "low" | "medium" | "high";
  actionUrl?: string;
  iconData?: {
    icon: any;
    color: string;
    bgColor: string;
  };
}

interface NotificationDropdownProps {
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notification: Notification) => void;
}

const getNotificationIcon = (type: string, priority: string) => {
  switch (type) {
    case "message":
      return {
        icon: MessageCircle,
        color: COLORS.PRIMARY,
        bgColor: COLORS.PRIMARY + "20"
      };
    case "payment":
      return {
        icon: CreditCard,
        color: "#059669",
        bgColor: "#D1FAE5"
      };
    case "order":
      return {
        icon: Package,
        color: "#1E40AF",
        bgColor: "#DBEAFE"
      };
    case "delivery":
      return {
        icon: Package,
        color: "#DC2626",
        bgColor: "#FECACA"
      };
    case "security":
      return {
        icon: priority === "high" ? AlertTriangle : CheckCircle,
        color: priority === "high" ? "#DC2626" : "#059669",
        bgColor: priority === "high" ? "#FECACA" : "#D1FAE5"
      };
    default:
      return {
        icon: Bell,
        color: COLORS.SECONDARY,
        bgColor: COLORS.SECONDARY + "20"
      };
  }
};

export function NotificationDropdown({ 
  notifications, 
  onMarkAsRead, 
  onMarkAllAsRead, 
  onNotificationClick 
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const displayNotifications = showUnreadOnly 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    onNotificationClick(notification);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100"
      >
        <Bell className="h-6 w-6" style={{ color: COLORS.SECONDARY }} />
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full text-xs"
            style={{ 
              backgroundColor: "#DC2626", 
              color: COLORS.WHITE,
              minWidth: "20px"
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-12 z-50">
          <Card 
            className="w-96 max-h-96 shadow-xl border"
            style={{ borderColor: COLORS.PRIMARY + "30" }}
          >
            {/* Header */}
            <div 
              className="p-4 border-b flex items-center justify-between"
              style={{ borderColor: COLORS.PRIMARY + "20" }}
            >
              <div>
                <h3 className="font-semibold text-lg" style={{ color: COLORS.TEXT }}>
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <p className="text-sm" style={{ color: COLORS.TEXT + "70" }}>
                    {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Filter Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                  className="text-xs rounded-full"
                  style={{ 
                    color: showUnreadOnly ? COLORS.WHITE : COLORS.PRIMARY,
                    backgroundColor: showUnreadOnly ? COLORS.PRIMARY : "transparent"
                  }}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  {showUnreadOnly ? "All" : "Unread"}
                </Button>
                
                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1"
                >
                  <X className="h-4 w-4" style={{ color: COLORS.TEXT }} />
                </Button>
              </div>
            </div>

            {/* Mark All as Read */}
            {unreadCount > 0 && (
              <div className="px-4 py-2 border-b" style={{ borderColor: COLORS.PRIMARY + "20" }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMarkAllAsRead}
                  className="text-xs rounded-full w-full"
                  style={{ color: COLORS.PRIMARY }}
                >
                  Mark all as read
                </Button>
              </div>
            )}

            {/* Notifications List */}
            <CardContent className="p-0 max-h-64 overflow-y-auto">
              {displayNotifications.length === 0 ? (
                <div className="p-8 text-center" style={{ color: COLORS.TEXT + "60" }}>
                  <Bell className="h-12 w-12 mx-auto mb-3" style={{ color: COLORS.PRIMARY + "40" }} />
                  <p className="text-sm">
                    {showUnreadOnly ? "No unread notifications" : "No notifications yet"}
                  </p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: COLORS.PRIMARY + "10" }}>
                  {displayNotifications.map((notification) => {
                    const iconConfig = getNotificationIcon(notification.type, notification.priority);
                    const IconComponent = iconConfig.icon;
                    
                    return (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 cursor-pointer transition-colors ${
                          !notification.isRead 
                            ? "bg-blue-50 hover:bg-blue-100" 
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {/* Icon */}
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: iconConfig.bgColor }}
                          >
                            <IconComponent 
                              className="h-5 w-5" 
                              style={{ color: iconConfig.color }} 
                            />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 
                                className={`text-sm font-medium truncate ${
                                  !notification.isRead ? "font-semibold" : ""
                                }`}
                                style={{ color: COLORS.TEXT }}
                              >
                                {notification.title}
                              </h4>
                              {!notification.isRead && (
                                <div 
                                  className="w-2 h-2 rounded-full flex-shrink-0 ml-2"
                                  style={{ backgroundColor: COLORS.PRIMARY }}
                                />
                              )}
                            </div>
                            
                            <p 
                              className="text-xs line-clamp-2 mb-1"
                              style={{ color: COLORS.TEXT + "70" }}
                            >
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <span 
                                className="text-xs"
                                style={{ color: COLORS.TEXT + "50" }}
                              >
                                {formatTimeAgo(notification.timestamp)}
                              </span>
                              
                              {notification.priority === "high" && (
                                <Badge 
                                  className="text-xs rounded-full"
                                  style={{ 
                                    backgroundColor: "#FEF3C7",
                                    color: "#92400E"
                                  }}
                                >
                                  High
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
            
            {/* Footer - View All */}
            {notifications.length > 5 && (
              <div 
                className="p-3 border-t text-center"
                style={{ borderColor: COLORS.PRIMARY + "20" }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false);
                    // Navigate to full notifications page
                  }}
                  className="text-xs rounded-full"
                  style={{ color: COLORS.PRIMARY }}
                >
                  View all notifications
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;