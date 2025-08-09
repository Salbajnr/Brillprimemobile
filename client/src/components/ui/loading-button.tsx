import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function LoadingButton({
  loading = false,
  loadingText = "Loading...",
  children,
  className,
  disabled,
  variant = "default",
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      className={cn("btn-scale gradient-bg rounded-brill", className)}
      disabled={disabled || loading}
      variant={variant}
      {...props}
    >
      {loading ? (
        <div className="flex items-center">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText}
        </div>
      ) : (
        children
      )}
    </Button>
  );
}
