import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from '@/components/ui/card';
import { X, Bell, CheckCircle, XCircle, AlertCircle, Info, AlertTriangle } from "lucide-react"

interface SimpleNotificationModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  confirmText?: string
  onConfirm?: () => void
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  orderId?: string;
  isRead?: boolean;
  actions?: {
    label: string;
    action: () => void;
    variant?: 'default' | 'destructive' | 'outline';
  }[];
}

interface NotificationModalProps {
  notification: Notification | null;
  onClose: () => void;
  onAction?: (actionLabel: string) => void;
}

export function SimpleNotificationModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  confirmText = "OK",
  onConfirm
}: SimpleNotificationModalProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case 'error':
        return <XCircle className="h-6 w-6 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-6 w-6 text-yellow-600" />
      case 'info':
        return <Info className="h-6 w-6 text-blue-600" />
    }
  }

  const getHeaderColor = () => {
    switch (type) {
      case 'success':
        return "text-green-800"
      case 'error':
        return "text-red-800"
      case 'warning':
        return "text-yellow-800"
      case 'info':
        return "text-blue-800"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <DialogTitle className={getHeaderColor()}>
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="mt-2">
            {message}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm || onClose}>
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


export function NotificationModal({ notification, onClose, onAction }: NotificationModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
    }
  }, [notification]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200); // Allow fade-out animation
  };

  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Info className="h-6 w-6 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (notification.type) {
      case 'success':
        return 'border-l-green-500';
      case 'warning':
        return 'border-l-yellow-500';
      case 'error':
        return 'border-l-red-500';
      default:
        return 'border-l-blue-500';
    }
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-200 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        className={`fixed top-4 right-4 left-4 z-50 max-w-sm mx-auto transition-all duration-200 ${
          isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-[-20px] opacity-0 scale-95'
        }`}
      >
        <Card className={`border-l-4 ${getBorderColor()} shadow-lg`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {getIcon()}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">
                      {notification.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {notification.message}
                    </p>
                    {notification.orderId && (
                      <p className="text-xs text-gray-500 mb-2">
                        Order: {notification.orderId}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="h-6 w-6 p-0 ml-2 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Action buttons */}
                {notification.actions && notification.actions.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {notification.actions.map((action, index) => (
                      <Button
                        key={index}
                        size="sm"
                        variant={action.variant || 'default'}
                        onClick={() => {
                          action.action();
                          onAction?.(action.label);
                          handleClose();
                        }}
                        className="text-xs"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// Toast notification component for quick messages
export function ToastNotification({ 
  notification, 
  onClose 
}: { 
  notification: Notification;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000); // Auto-close after 5 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <Card className={`border-l-4 ${notification.type === 'success' ? 'border-l-green-500' : 
        notification.type === 'warning' ? 'border-l-yellow-500' :
        notification.type === 'error' ? 'border-l-red-500' : 'border-l-blue-500'
      } shadow-lg max-w-sm`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-gray-500" />
            <div className="flex-1">
              <p className="font-medium text-sm">{notification.title}</p>
              <p className="text-xs text-gray-600">{notification.message}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
