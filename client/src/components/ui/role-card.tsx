import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface RoleCardProps {
  role: "CONSUMER" | "MERCHANT" | "DRIVER";
  isSelected: boolean;
  onSelect: () => void;
}

export function RoleCard({ role, isSelected, onSelect }: RoleCardProps) {
  const roleConfig = {
    CONSUMER: {
      title: "Consumer",
    },
    MERCHANT: {
      title: "Merchant",
    },
    DRIVER: {
      title: "Driver",
    },
  };

  const config = roleConfig[role];

  return (
    <div
      className={cn(
        "border-2 rounded-brill p-3 sm:p-4 cursor-pointer transition-all duration-200 h-10 sm:h-12",
        isSelected 
          ? "bg-[var(--brill-secondary)] text-[var(--brill-white)] border-[var(--brill-secondary)]" 
          : "bg-[var(--brill-white)] text-[var(--brill-secondary)] border-[var(--brill-secondary)] hover:bg-[var(--brill-secondary)] hover:text-[var(--brill-white)]"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between h-full">
        <div className="flex-1 text-center">
          <h3 className="font-bold text-sm sm:text-base">{config.title}</h3>
        </div>
        <div
          className={cn(
            "w-5 h-5 sm:w-6 sm:h-6 border-2 rounded-full flex items-center justify-center flex-shrink-0 ml-3",
            isSelected 
              ? "bg-[var(--brill-white)] border-[var(--brill-white)]" 
              : "border-[var(--brill-secondary)]"
          )}
        >
          {isSelected && <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-[var(--brill-secondary)]" />}
        </div>
      </div>
    </div>
  );
}
