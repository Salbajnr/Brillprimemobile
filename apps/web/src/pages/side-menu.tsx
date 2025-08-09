import { useState } from "react";
import { useLocation } from "wouter";
import { X, User, Clock, Package, HelpCircle, Info, LogOut, RotateCcw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import logo from "../assets/images/logo.png";

interface MenuItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  route: string;
  badge?: string;
}

export default function SideMenu() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const menuItems: MenuItem[] = [
    {
      id: "account",
      title: "Account Settings",
      icon: <User className="w-5 h-5" />,
      route: "/account-settings"
    },
    {
      id: "transactions",
      title: "Transaction History",
      icon: <Clock className="w-5 h-5" />,
      route: "/transactions",
      badge: "3"
    },
    {
      id: "orders",
      title: "Order History",
      icon: <Package className="w-5 h-5" />,
      route: "/order-history",
      badge: "New"
    },
    {
      id: "support",
      title: "Support & Help",
      icon: <HelpCircle className="w-5 h-5" />,
      route: "/support"
    },
    {
      id: "about",
      title: "About Brillprime",
      icon: <Info className="w-5 h-5" />,
      route: "/about"
    }
  ];

  const handleMenuItemClick = (route: string) => {
    setLocation(route);
  };

  const handleSwitchToVendor = async () => {
    setIsLoading(true);
    
    // Simulate role switch process
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In real app, this would make API call to switch user role
    console.log("Switching to vendor mode...");
    
    setIsLoading(false);
    setLocation("/vendor-dashboard");
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    
    try {
      await logout();
      setLocation("/signin");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const closeMenu = () => {
    setLocation("/map-home");
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      {/* Overlay */}
      <div className="absolute inset-0" onClick={closeMenu}></div>
      
      {/* Sidebar */}
      <div className="absolute left-0 top-0 bottom-0 w-80 bg-white shadow-2xl animate-in slide-in-from-left duration-300">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#4682b4] to-[#0b1a51] p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <img src={logo} alt="Brillprime" className="w-8 h-8" />
                <span className="font-semibold">Brillprime</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeMenu}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* User Profile Section */}
            <div className="flex items-center space-x-3">
              <Avatar className="w-12 h-12 border-2 border-white/20">
                <AvatarImage src={user?.profileImageUrl} alt={user?.fullName} />
                <AvatarFallback className="bg-white/20 text-white font-semibold">
                  {user ? getInitials(user.fullName) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold">{user?.fullName || "User"}</h3>
                <p className="text-white/80 text-sm">{user?.email || "user@example.com"}</p>
                <Badge className="bg-white/20 text-white border-white/30 text-xs mt-1">
                  {user?.role || "CONSUMER"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-2">
              {menuItems.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer transition-colors hover:bg-gray-50 border-0 shadow-none"
                  onClick={() => handleMenuItemClick(item.route)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-[#4682b4]">{item.icon}</div>
                        <span className="font-medium text-[#131313]">{item.title}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {item.badge && (
                          <Badge 
                            className={`text-xs ${
                              item.badge === "New" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {item.badge}
                          </Badge>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-2">
              <h4 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
                Quick Actions
              </h4>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => handleMenuItemClick("/consumer-home")}
                  className="w-full justify-start border-[#4682b4]/30 text-[#4682b4] hover:bg-[#4682b4]/10"
                >
                  <User className="w-4 h-4 mr-3" />
                  Go to Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleMenuItemClick("/profile")}
                  className="w-full justify-start border-[#4682b4]/30 text-[#4682b4] hover:bg-[#4682b4]/10"
                >
                  <User className="w-4 h-4 mr-3" />
                  Edit Profile
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="border-t bg-gray-50 p-4 space-y-3">
            {/* Switch to Vendor */}
            {user?.role === "CONSUMER" && (
              <Button
                variant="outline"
                onClick={handleSwitchToVendor}
                disabled={isLoading}
                className="w-full justify-start border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                <RotateCcw className="w-4 h-4 mr-3" />
                {isLoading ? "Switching..." : "Switch to Vendor Mode"}
              </Button>
            )}

            {/* Sign Out */}
            <Button
              variant="outline"
              onClick={handleSignOut}
              disabled={isLoading}
              className="w-full justify-start border-red-300 text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-3" />
              {isLoading ? "Signing Out..." : "Sign Out"}
            </Button>

            {/* App Version */}
            <div className="text-center text-xs text-gray-500 pt-2">
              Brillprime v1.0.0
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}