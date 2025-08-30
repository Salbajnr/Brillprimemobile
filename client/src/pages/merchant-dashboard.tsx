import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { useLocation } from 'wouter';

export default function MerchantDashboard() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [notifications, setNotifications] = useState([]);
  const [isBusinessOpen, setIsBusinessOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [newOrderTimer, setNewOrderTimer] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  // Dummy data for stats - replace with actual data fetching
  const stats = {
    totalOrders: 150,
    totalRevenue: 75000,
    activeProducts: 45,
    pendingOrders: 12,
    averageRating: 4.5,
    totalRatings: 200,
  };

  // Dummy user data - replace with actual user data fetching
  const user = {
    id: "merchant-123",
  };

  // Function to navigate to merchant ratings page
  const navigate = (path: string) => {
    setLocation(path);
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Merchant Dashboard</h1>
        <p className="text-gray-600 mb-6">Manage your business and accept payments</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold">{stats.totalOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold">₦{stats.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Products</p>
                    <p className="text-2xl font-bold">{stats.activeProducts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                    <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(`/merchant-ratings/${user?.id}`)}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Rating</p>
                    <div className="flex items-center gap-1">
                      <p className="text-2xl font-bold">{stats.averageRating || 0}</p>
                      <span className="text-yellow-400">⭐</span>
                    </div>
                    <p className="text-xs text-gray-500">{stats.totalRatings || 0} reviews</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        <div className="space-y-3">
          <button className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors">
            View Sales
          </button>
          <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors">
            Accept Payment
          </button>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2 text-orange-600" />
                Manage Inventory
              </CardTitle>
              <CardDescription>Update product stock and pricing</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full bg-orange-600 hover:bg-orange-700"
                onClick={() => setLocation('/merchant-inventory')}
              >
                Manage Inventory
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}