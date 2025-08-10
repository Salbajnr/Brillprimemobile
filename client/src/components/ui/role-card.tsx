import { cn } from "@/lib/utils";
import { Card, CardContent } from "./card";

interface RoleCardProps {
  role: "CONSUMER" | "MERCHANT" | "DRIVER";
  isSelected: boolean;
  onSelect: () => void;
}

const roleConfig = {
  CONSUMER: {
    title: "Consumer",
    description: "Send money, pay bills, and manage finances",
    icon: "👤"
  },
  MERCHANT: {
    title: "Merchant", 
    description: "Accept payments and manage your business",
    icon: "🏪"
  },
  DRIVER: {
    title: "Driver",
    description: "Deliver orders and earn money", 
    icon: "🚗"
  }
};

export function RoleCard({ role, isSelected, onSelect }: RoleCardProps) {
  const config = roleConfig[role];
  
  return (
    <Card 
      className={cn(
        "cursor-pointer border-2 transition-all hover:border-blue-300",
        isSelected ? "border-blue-600 bg-blue-50" : "border-gray-200"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{config.title}</h3>
            <p className="text-gray-600 text-sm">{config.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}