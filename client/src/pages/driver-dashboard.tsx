import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationProvider, useNotifications } from "@/components/ui/notification-system";
import { Link } from "wouter";
import { 
  Menu, 
  X,
  Truck, 
  Package, 
  Navigation, 
  DollarSign, 
  Clock, 
  User, 
  MessageCircle, 
  Star,
  MapPin,
  CheckCircle,
  Settings,
  Bell,
  Home,
  MessageSquare,
  Phone
} from "lucide-react";
import logoImage from "../assets/images/logo.png";
import accountCircleIcon from "../assets/images/account_circle.svg";
import mapBackground from "../assets/images/map_background.png";

interface DeliveryJob {
  id: string;
  deliveryType: 'FUEL' | 'FOOD' | 'PACKAGE' | 'COMMODITY';
  pickupAddress: string;
  deliveryAddress: string;
  customerName: string;
  customerPhone: string;
  deliveryFee: number;
  distance: string;
  estimatedTime: string;
  status: string;
  scheduledTime?: Date;
  notes?: string;
  createdAt: Date;
  customer: {
    fullName: string;
    phone: string;
  };
}

interface DriverProfile {
  id: number;
  userId: number;
  vehicleType: string;
  vehiclePlate: string;
  vehicleModel?: string;
  isAvailable: boolean;
  currentLocation?: any;
  totalDeliveries: number;
  totalEarnings: number;
  rating: number;
  reviewCount: number;
}

interface DriverEarnings {
  todayEarnings: number;
  weeklyEarnings: number;
  totalEarnings: number;
  completedDeliveries: number;
}

// Color constants
const COLORS = {
  PRIMARY: '#4682b4',
  SECONDARY: '#0b1a51', 
  ACTIVE: '#010e42',
  TEXT: '#131313',
  WHITE: '#ffffff'
} as const;

function DriverDashboardContent() {
  const [selectedTab, setSelectedTab] = useState("jobs");
  const [isOnline, setIsOnline] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();

  // Sample data for demonstration
  const sampleJobs: DeliveryJob[] = [
    {
      id: "job-1",
      deliveryType: "FUEL",
      pickupAddress: "Shell Station, Victoria Island",
      deliveryAddress: "23 Allen Avenue, Ikeja",
      customerName: "John Adebayo",
      customerPhone: "+234 801 234 5678",
      deliveryFee: 2500,
      distance: "12.5 km",
      estimatedTime: "35 mins",
      status: "PENDING",
      notes: "Please call customer on arrival",
      createdAt: new Date(),
      customer: {
        fullName: "John Adebayo",
        phone: "+234 801 234 5678"
      }
    },
    {
      id: "job-2",
      deliveryType: "PACKAGE",
      pickupAddress: "Jumia Warehouse, Oregun",
      deliveryAddress: "Plot 15, Lekki Phase 1",
      customerName: "Sarah Okonkwo",
      customerPhone: "+234 807 654 3210",
      deliveryFee: 1800,
      distance: "8.2 km",
      estimatedTime: "25 mins",
      status: "PENDING",
      createdAt: new Date(),
      customer: {
        fullName: "Sarah Okonkwo",
        phone: "+234 807 654 3210"
      }
    }
  ];

  const sampleEarnings: DriverEarnings = {
    todayEarnings: 15750,
    weeklyEarnings: 87340,
    totalEarnings: 342890,
    completedDeliveries: 156
  };

  const sampleProfile: DriverProfile = {
    id: 1,
    userId: 12345,
    vehicleType: "Motorcycle",
    vehiclePlate: "LAG-123-AA",
    vehicleModel: "Honda CB 150",
    isAvailable: true,
    totalDeliveries: 156,
    totalEarnings: 342890,
    rating: 4.8,
    reviewCount: 89
  };

  // Accept job mutation
  const acceptJobMutation = useMutation({
    mutationFn: (jobId: string) => 
      apiRequest("POST", `/api/driver/accept-job/${jobId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver", "available-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["driver", "delivery-history"] });
    },
  });

  const handleAcceptJob = (jobId: string) => {
    acceptJobMutation.mutate(jobId);
    addNotification({
      type: 'success',
      title: 'Order Accepted!',
      message: `You have successfully accepted order #${jobId.split('-')[1].toUpperCase()}. Customer will be notified.`,
      duration: 5000
    });
  };

  const handleDeclineJob = (jobId: string) => {
    addNotification({
      type: 'info',
      title: 'Order Declined',
      message: `Order #${jobId.split('-')[1].toUpperCase()} has been declined. It will be offered to other drivers.`,
      duration: 4000
    });
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short'
    }).format(date);
  };

  const getJobTypeColor = (type: string) => {
    switch (type) {
      case 'FUEL': return `bg-orange-100 text-orange-800 border-orange-200`;
      case 'FOOD': return `bg-green-100 text-green-800 border-green-200`;
      case 'PACKAGE': return `bg-blue-100 text-[${COLORS.SECONDARY}] border-blue-200`;
      case 'COMMODITY': return `bg-purple-100 text-purple-800 border-purple-200`;
      default: return `bg-gray-100 text-[${COLORS.TEXT}] border-gray-200`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ACCEPTED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'IN_TRANSIT': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'DELIVERED': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: `linear-gradient(to bottom right, #f9fafb, #dbeafe)` }}>
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-80 shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 border-r-2`} style={{ backgroundColor: COLORS.WHITE, borderColor: COLORS.PRIMARY + '40' }}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-6 border-b-2" style={{ 
            background: `linear-gradient(to right, ${COLORS.PRIMARY}, ${COLORS.SECONDARY})`,
            borderColor: COLORS.PRIMARY + '40'
          }}>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: COLORS.WHITE }}>
                <img src={logoImage} alt="BrillPrime" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <h2 className="font-bold text-xl" style={{ color: COLORS.WHITE }}>BrillPrime</h2>
                <p className="text-sm opacity-80" style={{ color: COLORS.WHITE }}>Driver Portal</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden rounded-full hover:bg-white/20"
              style={{ color: COLORS.WHITE }}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Driver Status Card */}
          <div className="p-6 border-b-2" style={{ 
            background: `linear-gradient(to bottom right, ${COLORS.PRIMARY}20, ${COLORS.WHITE})`,
            borderColor: COLORS.PRIMARY + '40'
          }}>
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{
                background: `linear-gradient(135deg, ${COLORS.PRIMARY}, ${COLORS.SECONDARY})`
              }}>
                <span className="font-bold text-lg" style={{ color: COLORS.WHITE }}>
                  {sampleProfile.vehiclePlate.split('-')[1] || 'DR'}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg" style={{ color: COLORS.TEXT }}>Driver #{sampleProfile.userId}</h3>
                <p className="text-sm" style={{ color: COLORS.TEXT + '80' }}>{sampleProfile.vehiclePlate}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="text-sm font-medium" style={{ color: COLORS.TEXT }}>{sampleProfile.rating}/5</span>
                  <span className="text-xs" style={{ color: COLORS.TEXT + '60' }}>({sampleProfile.reviewCount} reviews)</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center p-3 rounded-xl border-2 shadow-sm" style={{ 
                backgroundColor: COLORS.WHITE,
                borderColor: COLORS.PRIMARY + '40'
              }}>
                <p className="text-2xl font-bold" style={{ color: COLORS.SECONDARY }}>{sampleProfile.totalDeliveries}</p>
                <p className="text-xs" style={{ color: COLORS.TEXT + '80' }}>Completed</p>
              </div>
              <div className="text-center p-3 rounded-xl border-2 shadow-sm" style={{ 
                backgroundColor: COLORS.WHITE,
                borderColor: COLORS.PRIMARY + '40'
              }}>
                <p className="text-2xl font-bold text-green-600">₦{(sampleEarnings.todayEarnings / 1000).toFixed(1)}k</p>
                <p className="text-xs" style={{ color: COLORS.TEXT + '80' }}>Today</p>
              </div>
            </div>

            <Button
              onClick={() => {
                setIsOnline(!isOnline);
                addNotification({
                  type: isOnline ? 'info' : 'success',
                  title: isOnline ? 'You are now offline' : 'You are now online',
                  message: isOnline ? 'You will not receive new orders' : 'You will now receive new pickup orders',
                  duration: 3000
                });
              }}
              className="w-full rounded-xl py-3 transition-all duration-300"
              style={{
                backgroundColor: isOnline ? '#22c55e' : COLORS.PRIMARY,
                color: COLORS.WHITE
              }}
            >
              <div className={`w-3 h-3 rounded-full mr-3 ${isOnline ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
              {isOnline ? "Available for Orders" : "Currently Offline"}
            </Button>
          </div>

          {/* Navigation Menu */}
          <div className="flex-1 p-6">
            <nav className="space-y-3">
              <Button
                variant={selectedTab === "jobs" ? "default" : "ghost"}
                className="w-full justify-start rounded-xl py-3 text-left"
                onClick={() => setSelectedTab("jobs")}
                style={selectedTab === "jobs" ? { 
                  backgroundColor: COLORS.PRIMARY,
                  color: COLORS.WHITE
                } : {}}
              >
                <Package className="h-5 w-5 mr-3" style={{ color: COLORS.SECONDARY }} />
                <div className="text-left">
                  <div className="font-medium">Pickup Orders</div>
                  <div className="text-xs opacity-70">{sampleJobs.length} available</div>
                </div>
              </Button>
              <Button
                variant={selectedTab === "navigate" ? "default" : "ghost"}
                className="w-full justify-start rounded-xl py-3"
                onClick={() => setSelectedTab("navigate")}
                style={selectedTab === "navigate" ? { 
                  backgroundColor: COLORS.PRIMARY,
                  color: COLORS.WHITE
                } : {}}
              >
                <Navigation className="h-5 w-5 mr-3" style={{ color: COLORS.SECONDARY }} />
                Navigation & Routes
              </Button>
              <Button
                variant={selectedTab === "earnings" ? "default" : "ghost"}
                className="w-full justify-start rounded-xl py-3"
                onClick={() => setSelectedTab("earnings")}
                style={selectedTab === "earnings" ? { 
                  backgroundColor: COLORS.PRIMARY,
                  color: COLORS.WHITE
                } : {}}
              >
                <DollarSign className="h-5 w-5 mr-3" style={{ color: COLORS.SECONDARY }} />
                Earnings & Payouts
              </Button>
              <Button
                variant={selectedTab === "history" ? "default" : "ghost"}
                className="w-full justify-start rounded-xl py-3"
                onClick={() => setSelectedTab("history")}
                style={selectedTab === "history" ? { 
                  backgroundColor: COLORS.PRIMARY,
                  color: COLORS.WHITE
                } : {}}
              >
                <Clock className="h-5 w-5 mr-3" style={{ color: COLORS.SECONDARY }} />
                Delivery History
              </Button>
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="p-6 border-t-2 border-blue-100 space-y-2">
            <Link href="/profile">
              <Button variant="ghost" className="w-full justify-start rounded-xl">
                <User className="h-4 w-4 mr-3" />
                Profile Settings
              </Button>
            </Link>
            <Link href="/chat">
              <Button variant="ghost" className="w-full justify-start rounded-xl">
                <MessageCircle className="h-4 w-4 mr-3" />
                Support Chat
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => {/* Logout logic */}}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="bg-white shadow-sm border-b-2 border-blue-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 text-[#0b1a51] hover:bg-blue-50 rounded-xl"
              >
                <Menu className="h-6 w-6" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-[#0b1a51]">
                  {selectedTab === "jobs" ? "Available Pickup Orders" : 
                   selectedTab === "navigate" ? "Navigation & GPS" :
                   selectedTab === "earnings" ? "Earnings Dashboard" : "Delivery History"}
                </h1>
                <p className="text-gray-600 text-sm">
                  {selectedTab === "jobs" ? `${sampleJobs.length} orders waiting for pickup` :
                   selectedTab === "navigate" ? "GPS navigation and route planning" :
                   selectedTab === "earnings" ? "Track your earnings and payouts" : "Your completed deliveries"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Badge className="bg-green-100 text-green-800 px-3 py-1 rounded-full hidden sm:inline-flex">
                {isOnline ? "Available" : "Offline"}
              </Badge>
              <Button 
                variant="outline" 
                size="icon"
                className="rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50"
              >
                <Bell className="h-4 w-4 text-[#0b1a51]" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div 
          className="flex-1 overflow-auto p-6 relative"
          style={{
            backgroundImage: `url(${mapBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Background overlay for better content readability */}
          <div className="absolute inset-0 bg-white/85 backdrop-blur-sm"></div>
          
          {/* Content wrapper */}
          <div className="relative z-10">
          {/* Jobs Tab - Pickup and Delivery Orders */}
          {selectedTab === "jobs" && (
            <div className="space-y-6">
              {sampleJobs.length === 0 ? (
                <Card className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50 shadow-xl">
                  <CardContent className="text-center py-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mx-auto mb-6 flex items-center justify-center">
                      <Package className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No Orders Available</h3>
                    <p className="text-gray-500 mb-6">Check back soon for new pickup orders</p>
                    <Button className="rounded-full bg-blue-600 hover:bg-blue-700">
                      Refresh Orders
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {sampleJobs.map((job) => (
                    <Card 
                      key={job.id} 
                      className="rounded-3xl border shadow-lg hover:shadow-xl transition-all duration-300"
                      style={{ 
                        borderColor: COLORS.PRIMARY,
                        backgroundColor: COLORS.WHITE 
                      }}
                    >
                      <CardContent className="p-6">
                        {/* Header with customer name and action buttons */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 rounded-full overflow-hidden border-2" style={{ borderColor: COLORS.PRIMARY }}>
                              <img 
                                src={accountCircleIcon} 
                                alt="Customer" 
                                className="w-full h-full object-cover"
                                style={{ filter: `brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(176deg) brightness(102%) contrast(97%)` }}
                              />
                            </div>
                            <div>
                              <h3 className="text-xl font-medium" style={{ color: COLORS.TEXT }}>{job.customerName}</h3>
                            </div>
                          </div>
                          
                          <div className="flex space-x-3">
                            <Button 
                              variant="outline"
                              size="sm"
                              className="w-10 h-10 p-0 rounded-full border-2"
                              style={{ 
                                borderColor: COLORS.PRIMARY,
                                backgroundColor: COLORS.PRIMARY,
                                color: COLORS.WHITE
                              }}
                            >
                              <MessageCircle className="h-5 w-5" />
                            </Button>
                            <Button 
                              variant="outline"
                              size="sm"
                              className="w-10 h-10 p-0 rounded-full border-2"
                              style={{ 
                                borderColor: COLORS.PRIMARY,
                                backgroundColor: COLORS.PRIMARY,
                                color: COLORS.WHITE
                              }}
                            >
                              <Phone className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="w-full h-px mb-6" style={{ backgroundColor: '#D4D4D4' }}></div>

                        {/* Route and timing information */}
                        <div className="space-y-4 mb-6">
                          {/* Time and progress bar */}
                          <div className="flex items-center space-x-3">
                            <Clock className="h-5 w-5" style={{ color: COLORS.PRIMARY }} />
                            <div className="flex-1">
                              <p className="text-xl font-medium" style={{ color: COLORS.TEXT }}>{job.estimatedTime}</p>
                              <div className="w-full h-1 rounded-full mt-2" style={{ backgroundColor: '#D9D9D9' }}>
                                <div 
                                  className="h-1 rounded-full" 
                                  style={{ 
                                    backgroundColor: COLORS.PRIMARY,
                                    width: '64%' // Sample progress
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>

                          {/* Dotted line connector */}
                          <div className="flex items-center">
                            <div className="w-5 h-5 flex-shrink-0"></div>
                            <div className="w-px h-8 ml-2.5 border-l-2 border-dashed" style={{ borderColor: COLORS.PRIMARY }}></div>
                          </div>

                          {/* Distance */}
                          <div className="flex items-center space-x-3">
                            <div className="h-5 w-5 flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.PRIMARY }}></div>
                            </div>
                            <p className="text-base font-medium" style={{ color: COLORS.TEXT }}>{job.distance}</p>
                          </div>

                          {/* Dotted line connector */}
                          <div className="flex items-center">
                            <div className="w-5 h-5 flex-shrink-0"></div>
                            <div className="w-px h-8 ml-2.5 border-l-2 border-dashed" style={{ borderColor: COLORS.PRIMARY }}></div>
                          </div>

                          {/* Destination */}
                          <div className="flex items-center space-x-3">
                            <MapPin className="h-5 w-5" style={{ color: COLORS.PRIMARY }} />
                            <p className="text-base font-medium" style={{ color: COLORS.TEXT }}>{job.deliveryAddress}</p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex space-x-3">
                          <Button 
                            onClick={() => handleDeclineJob(job.id)}
                            className="flex-1 rounded-2xl py-2 px-6 font-normal"
                            style={{ 
                              backgroundColor: COLORS.PRIMARY,
                              color: COLORS.WHITE
                            }}
                          >
                            Decline
                          </Button>
                          <Button 
                            onClick={() => handleAcceptJob(job.id)}
                            disabled={acceptJobMutation.isPending}
                            className="flex-1 rounded-2xl py-2 px-6 font-normal"
                            style={{ 
                              backgroundColor: COLORS.ACTIVE,
                              color: COLORS.WHITE
                            }}
                          >
                            {acceptJobMutation.isPending ? "Accepting..." : "Accept"}
                          </Button>
                        </div>

                        {/* View Details Link */}
                        <div className="mt-3">
                          <Link href="/delivery-detail">
                            <Button 
                              variant="outline"
                              className="w-full rounded-2xl py-2 px-6 font-normal border"
                              style={{ 
                                borderColor: COLORS.PRIMARY,
                                color: COLORS.PRIMARY
                              }}
                            >
                              View Details
                            </Button>
                          </Link>
                        </div>

                        {job.notes && (
                          <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: '#FFF3CD', border: `1px solid #FFEAA7` }}>
                            <p className="text-sm font-medium" style={{ color: '#856404' }}>Special Instructions:</p>
                            <p className="text-sm mt-1" style={{ color: '#6C5A00' }}>{job.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Navigation Tab */}
          {selectedTab === "navigate" && (
            <div className="space-y-6">
              <Card className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center text-[#0b1a51]">
                    <div className="p-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full mr-3">
                      <Navigation className="h-5 w-5 text-white" />
                    </div>
                    GPS Navigation & Routes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Navigation className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-blue-600 mb-2">No Active Route</h3>
                    <p className="text-gray-500 mb-6">Accept an order to start navigation</p>
                    <Button className="rounded-full bg-blue-600 hover:bg-blue-700">
                      Update Location
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Earnings Tab */}
          {selectedTab === "earnings" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center text-[#0b1a51]">
                      <DollarSign className="h-5 w-5 mr-2" />
                      Earnings Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl border-2 border-green-200">
                      <span className="font-medium text-green-700">Today's Earnings:</span>
                      <span className="text-2xl font-bold text-green-800">₦{sampleEarnings.todayEarnings.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                      <span className="font-medium text-blue-700">Weekly Earnings:</span>
                      <span className="text-2xl font-bold text-blue-800">₦{sampleEarnings.weeklyEarnings.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
                      <span className="font-medium text-purple-700">Total Earnings:</span>
                      <span className="text-2xl font-bold text-purple-800">₦{sampleEarnings.totalEarnings.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center text-[#0b1a51]">
                      <DollarSign className="h-5 w-5 mr-2" />
                      Withdraw Earnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 mb-4">
                      <h3 className="text-green-800 font-semibold text-lg mb-2">Available Balance</h3>
                      <p className="text-4xl font-bold text-green-700">₦{sampleEarnings.totalEarnings.toLocaleString()}</p>
                    </div>
                    <Button className="w-full rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 py-3">
                      Withdraw Earnings
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* History Tab */}
          {selectedTab === "history" && (
            <div className="space-y-6">
              <Card className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center text-[#0b1a51]">
                    <Clock className="h-5 w-5 mr-2" />
                    Delivery History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No delivery history yet</h3>
                    <p className="text-gray-500 mb-6">Complete your first delivery to see history here</p>
                    <Button className="rounded-full bg-blue-600 hover:bg-blue-700">
                      View Available Orders
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DriverDashboard() {
  return (
    <NotificationProvider>
      <DriverDashboardContent />
    </NotificationProvider>
  );
}