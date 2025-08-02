import { Home, Search, ShoppingCart, User, Menu } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function Navigation() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const navItems = [
    { icon: Home, label: "Home", path: user?.role === "CONSUMER" ? "/consumer-home" : user?.role === "MERCHANT" ? "/merchant-dashboard" : "/driver-dashboard" },
    { icon: Search, label: "Search", path: "/merchants" },
    { icon: ShoppingCart, label: "Orders", path: "/order-history" },
    { icon: User, label: "Profile", path: "/profile" },
    { icon: Menu, label: "Menu", path: "/side-menu" }
  ];

  const isActive = (path: string) => location === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 max-w-md mx-auto">
      <div className="flex justify-around">
        {navItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            size="sm"
            onClick={() => setLocation(item.path)}
            className={`flex flex-col items-center space-y-1 p-2 ${
              isActive(item.path) ? "text-blue-600" : "text-gray-600"
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs">{item.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}