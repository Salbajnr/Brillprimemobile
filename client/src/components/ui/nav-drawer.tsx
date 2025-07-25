import React from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Menu,
  User,
  Settings,
  CreditCard,
  Package,
  BarChart3,
  Gift,
  LogOut,
  RotateCcw
} from "lucide-react";
import type { Business } from "@/lib/types";

interface NavDrawerProps {
  business?: Business;
  onNavigate: (path: string) => void;
  onSwitchMode: () => void;
  onSignOut: () => void;
}

export function NavDrawer({ business, onNavigate, onSwitchMode, onSignOut }: NavDrawerProps) {
  const menuItems = [
    { icon: User, label: "Business Profile", path: "business-profile" },
    { icon: Package, label: "Inventory", path: "inventory" },
    { icon: CreditCard, label: "Payments", path: "payments" },
    { icon: BarChart3, label: "Analytics", path: "merchant-analytics" },
    { icon: Gift, label: "Promotions", path: "promotions" },
    { icon: Settings, label: "Settings", path: "settings" },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="w-6 h-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center space-x-3">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-bold">
                  {business?.name?.charAt(0) || 'M'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  {business?.name || 'Merchant Business'}
                </h3>
                <div className="flex items-center space-x-2">
                  <Badge variant={business?.operatingHours ? Object.values(business.operatingHours).some(hours => hours.isOpen) ? "default" : "secondary" : "secondary"} className="text-xs">
                    {business?.operatingHours ? Object.values(business.operatingHours).some(hours => hours.isOpen) ? 'Open' : 'Closed' : 'Closed'}
                  </Badge>
                  <span className="text-sm text-gray-500">{business?.category || 'Fuel Station'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex-1 py-4">
            <nav className="space-y-1 px-3">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    className="w-full justify-start h-12 px-3"
                    onClick={() => onNavigate(item.path)}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>
          </div>

          {/* Footer Actions */}
          <div className="border-t p-4 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start h-12 px-3"
              onClick={onSwitchMode}
            >
              <RotateCcw className="w-5 h-5 mr-3" />
              Switch to Consumer
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start h-12 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={onSignOut}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}