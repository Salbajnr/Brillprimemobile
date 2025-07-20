import { useState } from "react";
import { useLocation } from "wouter";
import { Bell, Scan, Send, Plus, CreditCard, MapPin, Fuel, Receipt, ShoppingCart, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import logo from "../assets/images/logo.png";
import scanIcon from "../assets/images/scan_qr_code_white.png";
import orderFuelIcon from "../assets/images/order_fuel_icon.png";
import purchaseTollIcon from "../assets/images/purchase_toll_gate_white.png";
import viewCartIcon from "../assets/images/view_cart.png";
import masterCardLogo from "../assets/images/master_card_logo.png";
import visaCardLogo from "../assets/images/visa_card_logo.png";

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  route: string;
  bgColor: string;
}

interface Transaction {
  id: string;
  type: "credit" | "debit";
  description: string;
  amount: number;
  date: string;
  status: "completed" | "pending" | "failed";
}

export default function ConsumerHome() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
  const [walletBalance] = useState(45750.00); // Mock data - will be replaced with API

  // Mock transaction data - will be replaced with API
  const [recentTransactions] = useState<Transaction[]>([
    {
      id: "1",
      type: "debit",
      description: "Fuel Purchase - Total Energies",
      amount: 12500,
      date: "2025-07-19T10:30:00Z",
      status: "completed"
    },
    {
      id: "2",
      type: "credit",
      description: "Wallet Top-up",
      amount: 50000,
      date: "2025-07-19T08:15:00Z",
      status: "completed"
    },
    {
      id: "3",
      type: "debit",
      description: "Bill Payment - AEDC",
      amount: 8750,
      date: "2025-07-18T16:45:00Z",
      status: "completed"
    },
    {
      id: "4",
      type: "debit",
      description: "Toll Gate - Lagos-Ibadan",
      amount: 1200,
      date: "2025-07-18T14:20:00Z",
      status: "pending"
    }
  ]);

  const quickActions: QuickAction[] = [
    {
      id: "scan",
      title: "Scan QR",
      icon: scanIcon,
      route: "/qr-scanner",
      bgColor: "bg-[#4682b4]"
    },
    {
      id: "fuel",
      title: "Order Fuel",
      icon: orderFuelIcon,
      route: "/fuel-ordering",
      bgColor: "bg-[#0b1a51]"
    },
    {
      id: "toll",
      title: "Toll Gates",
      icon: purchaseTollIcon,
      route: "/toll-payments",
      bgColor: "bg-[#010e42]"
    },
    {
      id: "cart",
      title: "Cart",
      icon: viewCartIcon,
      route: "/cart",
      bgColor: "bg-[#4682b4]"
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    return type === "credit" ? "↗" : "↙";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <img src={logo} alt="Brillprime" className="w-8 h-8" />
            <div>
              <h1 className="text-lg font-semibold text-[#131313]">
                Good morning, {user?.fullName?.split(' ')[0] || 'User'}
              </h1>
              <p className="text-sm text-gray-600">Welcome back to Brillprime</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/notifications")}
              className="relative"
            >
              <Bell className="w-5 h-5 text-[#131313]" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/profile")}
            >
              <div className="w-8 h-8 bg-[#4682b4] rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.fullName?.charAt(0) || 'U'}
                </span>
              </div>
            </Button>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-6">
        {/* Live Location Map Card */}
        <Card className="bg-gradient-to-r from-[#4682b4] to-[#0b1a51] text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-end mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/location-setup")}
                className="text-white hover:bg-white/20"
              >
                <MapPin className="w-5 h-5" />
              </Button>
            </div>
            <div className="mb-4">
              <div className="h-40 bg-white/10 rounded-xl overflow-hidden relative mx-2">
                <svg 
                  viewBox="0 0 400 160" 
                  className="w-full h-full"
                  style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)' }}
                >
                  {/* Water/Lagos Lagoon */}
                  <path d="M0 120 Q100 110 200 115 T400 120 L400 160 L0 160 Z" fill="#0ea5e9" opacity="0.3" />
                  
                  {/* Major Roads */}
                  <path d="M0 60 L400 60" stroke="#ffffff" strokeWidth="4" strokeDasharray="8,4" />
                  <path d="M0 100 L400 100" stroke="#ffffff" strokeWidth="3" strokeDasharray="6,3" />
                  <path d="M80 0 L80 160" stroke="#ffffff" strokeWidth="3" strokeDasharray="6,3" />
                  <path d="M200 0 L200 160" stroke="#ffffff" strokeWidth="4" strokeDasharray="8,4" />
                  <path d="M320 0 L320 160" stroke="#ffffff" strokeWidth="3" strokeDasharray="6,3" />
                  
                  {/* Secondary Streets */}
                  <path d="M0 30 L400 30" stroke="#e2e8f0" strokeWidth="2" />
                  <path d="M0 130 L400 130" stroke="#e2e8f0" strokeWidth="2" />
                  <path d="M40 0 L40 160" stroke="#e2e8f0" strokeWidth="2" />
                  <path d="M140 0 L140 160" stroke="#e2e8f0" strokeWidth="2" />
                  <path d="M260 0 L260 160" stroke="#e2e8f0" strokeWidth="2" />
                  <path d="M360 0 L360 160" stroke="#e2e8f0" strokeWidth="2" />
                  
                  {/* Buildings - Residential */}
                  <rect x="10" y="10" width="25" height="15" fill="#4682b4" opacity="0.8" rx="2" />
                  <rect x="45" y="8" width="20" height="18" fill="#0b1a51" opacity="0.8" rx="2" />
                  <rect x="15" y="65" width="30" height="20" fill="#4682b4" opacity="0.7" rx="2" />
                  <rect x="50" y="70" width="25" height="25" fill="#0b1a51" opacity="0.7" rx="2" />
                  
                  {/* Buildings - Commercial */}
                  <rect x="90" y="5" width="40" height="30" fill="#4682b4" opacity="0.9" rx="3" />
                  <rect x="150" y="8" width="35" height="25" fill="#0b1a51" opacity="0.9" rx="3" />
                  <rect x="85" y="65" width="50" height="30" fill="#4682b4" opacity="0.8" rx="3" />
                  <rect x="145" y="70" width="45" height="25" fill="#0b1a51" opacity="0.8" rx="3" />
                  
                  {/* Buildings - High-rise */}
                  <rect x="210" y="2" width="30" height="55" fill="#4682b4" opacity="0.9" rx="4" />
                  <rect x="250" y="5" width="25" height="50" fill="#0b1a51" opacity="0.9" rx="4" />
                  <rect x="285" y="3" width="28" height="52" fill="#4682b4" opacity="0.9" rx="4" />
                  <rect x="330" y="10" width="35" height="45" fill="#0b1a51" opacity="0.8" rx="4" />
                  <rect x="370" y="8" width="25" height="47" fill="#4682b4" opacity="0.8" rx="4" />
                  
                  {/* Parks/Green Areas */}
                  <ellipse cx="160" cy="135" rx="25" ry="15" fill="#22c55e" opacity="0.4" />
                  <ellipse cx="300" cy="130" rx="30" ry="20" fill="#22c55e" opacity="0.4" />
                  
                  {/* Your location pin with shadow */}
                  <ellipse cx="200" cy="85" rx="12" ry="4" fill="#000000" opacity="0.2" />
                  <path d="M200 60 C190 60 182 68 182 78 C182 88 200 90 200 90 C200 90 218 88 218 78 C218 68 210 60 200 60 Z" fill="#ef4444" />
                  <circle cx="200" cy="78" r="8" fill="#ffffff" />
                  <circle cx="200" cy="78" r="4" fill="#ef4444" />
                  
                  {/* Location pulse animation circles */}
                  <circle cx="200" cy="78" r="20" fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.3">
                    <animate attributeName="r" values="20;35;20" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                  </circle>
                  
                  {/* Landmarks */}
                  <polygon points="120,40 125,30 130,40" fill="#fbbf24" opacity="0.8" />
                  <rect x="123" y="40" width="4" height="8" fill="#92400e" />
                  
                  {/* Traffic indicators */}
                  <circle cx="80" cy="60" r="3" fill="#22c55e" opacity="0.8" />
                  <circle cx="200" cy="60" r="3" fill="#eab308" opacity="0.8" />
                  <circle cx="320" cy="60" r="3" fill="#ef4444" opacity="0.8" />
                </svg>
                
                {/* Floating location info */}
                <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="text-xs text-[#4682b4] font-semibold">Live • Victoria Island, Lagos</p>
                  </div>
                </div>
                
                {/* Zoom controls */}
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-sm">
                  <div className="flex flex-col space-y-1">
                    <button className="w-6 h-6 flex items-center justify-center text-[#4682b4] hover:bg-blue-50 rounded text-sm font-bold">+</button>
                    <button className="w-6 h-6 flex items-center justify-center text-[#4682b4] hover:bg-blue-50 rounded text-sm font-bold">−</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                className="flex-1 bg-white text-[#4682b4] hover:bg-gray-100"
                onClick={() => setLocation("/location-setup")}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Where are you?
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-semibold text-[#131313] mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action) => (
              <Card
                key={action.id}
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => setLocation(action.route)}
              >
                <CardContent className="p-4">
                  <div className={`w-12 h-12 ${action.bgColor} rounded-2xl flex items-center justify-center mb-3`}>
                    <img src={action.icon} alt={action.title} className="w-6 h-6" />
                  </div>
                  <h4 className="font-medium text-[#131313]">{action.title}</h4>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Services Grid */}
        <div>
          <h3 className="text-lg font-semibold text-[#131313] mb-4">Services</h3>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col space-y-2 border-[#4682b4] text-[#4682b4] hover:bg-[#4682b4]/10"
              onClick={() => setLocation("/commodities")}
            >
              <ShoppingCart className="w-6 h-6" />
              <span className="text-sm">Marketplace</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col space-y-2 border-[#4682b4] text-[#4682b4] hover:bg-[#4682b4]/10"
              onClick={() => setLocation("/merchants")}
            >
              <MapPin className="w-6 h-6" />
              <span className="text-sm">Find Merchants</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col space-y-2 border-[#4682b4] text-[#4682b4] hover:bg-[#4682b4]/10"
              onClick={() => setLocation("/fuel-stations")}
            >
              <Fuel className="w-6 h-6" />
              <span className="text-sm">Fuel Stations</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col space-y-2 border-[#4682b4] text-[#4682b4] hover:bg-[#4682b4]/10"
              onClick={() => setLocation("/payment-methods")}
            >
              <CreditCard className="w-6 h-6" />
              <span className="text-sm">Payment Cards</span>
            </Button>
          </div>
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#131313]">Recent Transactions</h3>
            <Button
              variant="ghost"
              className="text-[#4682b4] hover:text-[#0b1a51]"
              onClick={() => setLocation("/transactions")}
            >
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {recentTransactions.slice(0, 4).map((transaction) => (
              <Card key={transaction.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.type === "credit" ? "bg-green-100" : "bg-red-100"
                      }`}>
                        <span className={`text-lg ${
                          transaction.type === "credit" ? "text-green-600" : "text-red-600"
                        }`}>
                          {getTransactionIcon(transaction.type)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-[#131313] text-sm">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatDate(transaction.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        transaction.type === "credit" ? "text-green-600" : "text-red-600"
                      }`}>
                        {transaction.type === "credit" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </p>
                      <Badge className={`text-xs ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Payment Methods Preview */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-[#131313]">Payment Methods</h4>
              <Button
                variant="ghost"
                size="sm"
                className="text-[#4682b4]"
                onClick={() => setLocation("/payment-methods")}
              >
                Manage
              </Button>
            </div>
            <div className="flex space-x-3">
              <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-3 flex-1">
                <img src={masterCardLogo} alt="Mastercard" className="w-8 h-5" />
                <span className="text-sm font-medium">•••• 4532</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-3 flex-1">
                <div className="w-8 h-5 bg-[#1A1F71] rounded flex items-center justify-center">
                  <span className="text-white font-bold text-xs">VISA</span>
                </div>
                <span className="text-sm font-medium">•••• 8901</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}