import { cn } from "@/lib/utils";
import { Card, CardContent } from "./card";
import { Badge } from "./badge";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: Date;
}

interface NotificationDropdownProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  className?: string;
}

export function NotificationDropdown({ 
  notifications, 
  onMarkAsRead, 
  onMarkAllAsRead, 
  className 
}: NotificationDropdownProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={cn("w-80 max-h-96 overflow-auto", className)}>
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Notifications</h3>
        {unreadCount > 0 && (
          <Badge variant="default">{unreadCount}</Badge>
        )}
      </div>
      
      {notifications.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          No notifications
        </div>
      ) : (
        <div className="space-y-2 p-2">
          {notifications.map((notification) => (
            <Card 
              key={notification.id}
              className={cn(
                "cursor-pointer transition-colors",
                !notification.read && "bg-blue-50"
              )}
              onClick={() => onMarkAsRead(notification.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-1 ml-2" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {unreadCount > 0 && (
        <div className="p-4 border-t">
          <button 
            onClick={onMarkAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Mark all as read
          </button>
        </div>
      )}
    </div>
  );
}