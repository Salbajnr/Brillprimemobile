import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  totalSteps: number;
  currentStep: number;
  className?: string;
}

export function ProgressIndicator({ totalSteps, currentStep, className }: ProgressIndicatorProps) {
  return (
    <div className={cn("flex space-x-3", className)}>
      {Array.from({ length: totalSteps }, (_, index) => (
        <div
          key={index}
          className={cn(
            "w-2 h-2 rounded-full",
            index + 1 === currentStep ? "bg-[var(--brill-active)]" : "bg-gray-300"
          )}
        />
      ))}
    </div>
  );
}
