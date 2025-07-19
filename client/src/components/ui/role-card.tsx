import { cn } from "@/lib/utils";
import { Check, Car, Store, ShoppingCart } from "lucide-react";

interface RoleCardProps {
  role: "CONSUMER" | "MERCHANT" | "DRIVER";
  isSelected: boolean;
  onSelect: () => void;
}

export function RoleCard({ role, isSelected, onSelect }: RoleCardProps) {
  const roleConfig = {
    CONSUMER: {
      icon: ShoppingCart,
      title: "Consumer",
      description: "Personal transactions and payments",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    MERCHANT: {
      icon: Store,
      title: "Merchant",
      description: "Business and merchant services",
      iconBg: "bg-green-100",
      iconColor: "text-[var(--brill-success)]",
    },
    DRIVER: {
      icon: Car,
      title: "Driver",
      description: "Transport services and delivery",
      iconBg: "bg-blue-100",
      iconColor: "text-[var(--brill-secondary)]",
    },
  };

  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "border-2 rounded-brill p-3 sm:p-4 cursor-pointer transition-all duration-200 hover:border-[var(--brill-secondary)] h-10 sm:h-12",
        isSelected ? "border-[var(--brill-secondary)] bg-blue-50" : "border-gray-200"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center space-x-3 h-full">
        <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center", config.iconBg)}>
          <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", config.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[var(--brill-text)] text-sm sm:text-base truncate">{config.title}</h3>
          <p className="text-xs sm:text-sm text-[var(--brill-text-light)] font-light truncate">{config.description}</p>
        </div>
        <div
          className={cn(
            "w-5 h-5 sm:w-6 sm:h-6 border-2 rounded-full flex items-center justify-center flex-shrink-0",
            isSelected ? "bg-[var(--brill-secondary)] border-[var(--brill-secondary)]" : "border-gray-300"
          )}
        >
          {isSelected && <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />}
        </div>
      </div>
    </div>
  );
}
