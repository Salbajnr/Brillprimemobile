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
        "border-2 rounded-brill p-3 sm:p-4 cursor-pointer transition-all duration-200 hover:border-blue-800 h-10 sm:h-12",
        isSelected ? "border-blue-800 bg-blue-800 text-white" : "border-blue-800 bg-white text-blue-800"
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
            isSelected ? "bg-white border-white" : "border-blue-800"
          )}
        >
          {isSelected && <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-800" />}
        </div>
      </div>
    </div>
  );
}
