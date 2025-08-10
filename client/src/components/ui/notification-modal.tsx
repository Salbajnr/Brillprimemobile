import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertCircle, Info } from "lucide-react"

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  confirmText?: string
  onConfirm?: () => void
}

export function NotificationModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  confirmText = "OK",
  onConfirm
}: NotificationModalProps) {
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