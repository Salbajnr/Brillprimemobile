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
            <div className="mb-6">
              <div className="h-32 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                <div className="text-center">
                  <MapPin className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Live location tracking active</p>
                  <p className="text-xs opacity-80">Lagos, Nigeria</p>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                className="flex-1 bg-white text-[#4682b4] hover:bg-gray-100"
                onClick={() => setLocation("/wallet/fund")}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Money
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