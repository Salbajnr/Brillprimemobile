import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import mailboxIcon from "../../assets/images/mailbox.png";
import failIcon from "../../assets/images/confirmation_fail_img.png";
import successIcon from "../../assets/images/congratulations_icon.png";

export type NotificationType = "success" | "error" | "email";

export interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: NotificationType;
  title: string;
  description?: string;
  message?: string; // Added message prop as an alternative to description
  actionText?: string;
  onAction?: () => void;
  showSecondaryAction?: boolean;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  imageSrc?: string;
  buttonText?: string;
}

const getModalConfig = (type: NotificationType) => {
  switch (type) {
    case "success":
      return {
        icon: successIcon,
        iconAlt: "Success",
        iconSize: "w-20 h-20",
        titleColor: "text-green-600",
        buttonColor: "bg-green-600 hover:bg-green-700",
      };
    case "error":
      return {
        icon: failIcon,
        iconAlt: "Error",
        iconSize: "w-20 h-20",
        titleColor: "text-red-600",
        buttonColor: "bg-red-600 hover:bg-red-700",
      };
    case "email":
      return {
        icon: mailboxIcon,
        iconAlt: "Email Sent",
        iconSize: "w-24 h-24",
        titleColor: "text-[var(--brill-primary)]",
        buttonColor: "bg-[var(--brill-primary)] hover:bg-[var(--brill-secondary)]",
      };
    default:
      return {
        icon: successIcon,
        iconAlt: "Notification",
        iconSize: "w-20 h-20",
        titleColor: "text-[var(--brill-text)]",
        buttonColor: "bg-[var(--brill-primary)] hover:bg-[var(--brill-secondary)]",
      };
  }
};

export function NotificationModal({
  isOpen,
  onClose,
  type,
  title,
  description,
  message,
  actionText = "OK",
  onAction,
  showSecondaryAction = false,
  secondaryActionText = "Cancel",
  onSecondaryAction,
  imageSrc,
  buttonText,
}: NotificationModalProps) {
  const config = getModalConfig(type);

  const handlePrimaryAction = () => {
    if (onAction) {
      onAction();
    } else {
      onClose();
    }
  };

  const handleSecondaryAction = () => {
    if (onSecondaryAction) {
      onSecondaryAction();
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-sm mx-auto rounded-3xl border-none shadow-2xl">
        <DialogHeader className="text-center space-y-4 pt-6">
          {/* Icon */}
          <div className="flex justify-center">
            <img 
              src={imageSrc || config.icon} 
              alt={config.iconAlt}
              className={`${config.iconSize} object-contain`}
            />
          </div>
          
          {/* Title */}
          <DialogTitle className={`text-xl font-bold ${config.titleColor}`}>
            {title}
          </DialogTitle>
          
          {/* Description */}
          <DialogDescription className="text-[var(--brill-text-light)] text-sm leading-relaxed px-2">
            {description || message}
          </DialogDescription>
        </DialogHeader>

        {/* Actions */}
        <div className="flex flex-col space-y-3 p-6 pt-4">
          <Button
            onClick={handlePrimaryAction}
            className={`w-full py-3 rounded-xl text-white font-medium ${config.buttonColor}`}
          >
            {buttonText || actionText}
          </Button>
          
          {showSecondaryAction && (
            <Button
              onClick={handleSecondaryAction}
              variant="outline"
              className="w-full py-3 rounded-xl border-gray-300 text-[var(--brill-text)] hover:bg-gray-50"
            >
              {secondaryActionText}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}