import { Bell, Plus, Send, Download, CreditCard, TrendingUp, Phone, Wifi, ArrowUp, ArrowDown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

export default function DashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white">
      {/* Dashboard Header */}
      <div className="gradient-bg px-6 pt-12 pb-8 text-white">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-blue-100 text-sm font-light">{getGreeting()}</p>
            <h2 className="text-xl font-bold">{user?.fullName || "User"}</h2>
          </div>
          <div className="flex items-center space-x-4">
            <Button className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center p-0 hover:bg-white hover:bg-opacity-30">
              <Bell className="text-white h-5 w-5" />
            </Button>
            <Button 
              onClick={() => setLocation("/profile")}
              className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center p-0 hover:bg-white hover:bg-opacity-30"
            >
              <span className="text-white font-bold text-lg">
                {user ? getInitials(user.fullName) : "U"}
              </span>
            </Button>
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-white bg-opacity-15 rounded-brill p-6 backdrop-blur-sm">
          <p className="text-blue-100 text-sm font-light mb-2">Total Balance</p>
          <h3 className="text-3xl font-bold mb-4">₦127,450.00</h3>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-blue-100 text-xs">This Month</p>
              <p className="text-white font-medium">+12.5%</p>
            </div>
            <Button className="bg-white text-[var(--brill-secondary)] px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-100">
              <Plus className="h-4 w-4 mr-1" />
              Add Money
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-6 py-6">
        <h3 className="text-lg font-bold text-[var(--brill-text)] mb-4">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="text-center">
            <div className="w-14 h-14 bg-blue-100 rounded-brill flex items-center justify-center mx-auto mb-2">
              <Send className="text-[var(--brill-secondary)] h-5 w-5" />
            </div>
            <p className="text-xs text-[var(--brill-text-light)] font-medium">Send</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 bg-green-100 rounded-brill flex items-center justify-center mx-auto mb-2">
              <Download className="text-[var(--brill-success)] h-5 w-5" />
            </div>
            <p className="text-xs text-[var(--brill-text-light)] font-medium">Request</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 bg-purple-100 rounded-brill flex items-center justify-center mx-auto mb-2">
              <CreditCard className="text-purple-600 h-5 w-5" />
            </div>
            <p className="text-xs text-[var(--brill-text-light)] font-medium">Pay Bills</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 bg-orange-100 rounded-brill flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="text-[var(--brill-warning)] h-5 w-5" />
            </div>
            <p className="text-xs text-[var(--brill-text-light)] font-medium">Invest</p>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-[var(--brill-text)]">Recent Transactions</h3>
            <Button variant="link" className="text-[var(--brill-secondary)] text-sm font-medium p-0 h-auto">
              See All
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-brill">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <ArrowDown className="text-[var(--brill-success)] h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-[var(--brill-text)] text-sm">Payment Received</p>
                  <p className="text-xs text-[var(--brill-text-light)]">From Alex Johnson</p>
                </div>
              </div>
              <p className="font-bold text-[var(--brill-success)]">+₦5,200</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-brill">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <ArrowUp className="text-[var(--brill-error)] h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-[var(--brill-text)] text-sm">Transfer Sent</p>
                  <p className="text-xs text-[var(--brill-text-light)]">To Sarah Williams</p>
                </div>
              </div>
              <p className="font-bold text-[var(--brill-error)]">-₦2,500</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-brill">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <CreditCard className="text-[var(--brill-secondary)] h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-[var(--brill-text)] text-sm">Bill Payment</p>
                  <p className="text-xs text-[var(--brill-text-light)]">Electricity Bill</p>
                </div>
              </div>
              <p className="font-bold text-[var(--brill-error)]">-₦8,750</p>
            </div>
          </div>
        </div>

        {/* Services Section */}
        <div>
          <h3 className="text-lg font-bold text-[var(--brill-text)] mb-4">Services</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-brill p-4 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Phone className="text-purple-600 h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-[var(--brill-text)]">Airtime</p>
            </div>
            <div className="border border-gray-200 rounded-brill p-4 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Wifi className="text-[var(--brill-success)] h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-[var(--brill-text)]">Data</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
