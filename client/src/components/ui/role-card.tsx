import { cn } from "@/lib/utils";
import { Check, Car, Store } from "lucide-react";

interface RoleCardProps {
  role: "DRIVER" | "VENDOR";
  isSelected: boolean;
  onSelect: () => void;
}

export function RoleCard({ role, isSelected, onSelect }: RoleCardProps) {
  const roleConfig = {
    DRIVER: {
      icon: Car,
      title: "Driver",
      description: "Transport services and delivery",
      iconBg: "bg-blue-100",
      iconColor: "text-[var(--brill-secondary)]",
    },
    VENDOR: {
      icon: Store,
      title: "Vendor",
      description: "Business and merchant services",
      iconBg: "bg-green-100",
      iconColor: "text-[var(--brill-success)]",
    },
  };

  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "border-2 rounded-brill p-6 cursor-pointer transition-all duration-200 hover:border-[var(--brill-secondary)]",
        isSelected ? "border-[var(--brill-secondary)] bg-blue-50" : "border-gray-200"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center space-x-4">
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", config.iconBg)}>
          <Icon className={cn("h-5 w-5", config.iconColor)} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-[var(--brill-text)]">{config.title}</h3>
          <p className="text-sm text-[var(--brill-text-light)] font-light">{config.description}</p>
        </div>
        <div
          className={cn(
            "w-6 h-6 border-2 rounded-full flex items-center justify-center",
            isSelected ? "bg-[var(--brill-secondary)] border-[var(--brill-secondary)]" : "border-gray-300"
          )}
        >
          {isSelected && <Check className="h-3 w-3 text-white" />}
        </div>
      </div>
    </div>
  );
}
