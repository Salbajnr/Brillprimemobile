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

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Merchant Dashboard</h1>
        <p className="text-gray-600 mb-6">Manage your business and accept payments</p>

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