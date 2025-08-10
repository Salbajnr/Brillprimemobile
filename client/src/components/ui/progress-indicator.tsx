import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export function ProgressIndicator({ currentStep, totalSteps, className }: ProgressIndicatorProps) {
  return (
    <div className={cn("flex space-x-2", className)}>
      {Array.from({ length: totalSteps }, (_, index) => (
        <div
          key={index}
          className={cn(
            "h-2 flex-1 rounded-full transition-colors",
            index < currentStep ? "bg-primary" : "bg-gray-200"
          )}
        />
      ))}
    </div>
  );
}