import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Home,
  Package,
  Truck,
  BarChart3,
  MoreHorizontal
} from "lucide-react";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
    },
    {
      id: "merchant-products",
      label: "Products",
      icon: Package,
    },
    {
      id: "merchant-orders",
      label: "Orders",
      icon: Truck,
    },
    {
      id: "merchant-analytics",
      label: "Analytics",
      icon: BarChart3,
    },
    {
      id: "more",
      label: "More",
      icon: MoreHorizontal,
    },
  ];

  return (
    <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-4 py-2">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              className={cn(
                "flex flex-col items-center space-y-1 h-auto py-2 px-3 min-w-0",
                isActive
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700"
              )}
              onClick={() => onTabChange(item.id)}
            >
              <Icon className={cn(
                "w-5 h-5",
                isActive ? "text-blue-600" : "text-gray-500"
              )} />
              <span className={cn(
                "text-xs font-medium",
                isActive ? "text-blue-600" : "text-gray-500"
              )}>
                {item.label}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}