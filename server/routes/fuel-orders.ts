
import type { Express } from "express";
import { storage } from "../storage";
import { insertFuelOrderSchema } from "../../shared/schema";

export function registerFuelOrderRoutes(app: Express) {
  // Get fuel stations near location
  app.get("/api/fuel/stations", async (req, res) => {
    try {
      const { lat, lng, radius = 10000 } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude required" });
      }

      const stations = await storage.getNearbyFuelStations(
        parseFloat(lat as string),
        parseFloat(lng as string),
        parseFloat(radius as string)
      );
      
      res.json({ success: true, stations });
    } catch (error) {
      console.error("Get fuel stations error:", error);
      res.status(500).json({ message: "Failed to fetch fuel stations" });
    }
  });

  // Create fuel order
  app.post("/api/fuel/orders", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const orderData = insertFuelOrderSchema.parse(req.body);
      const order = await storage.createFuelOrder({
        ...orderData,
        customerId: req.session.userId,
        status: 'PENDING'
      });

      // Real-time WebSocket notifications
      if (global.io) {
        // Notify customer
        global.io.to(`user_${req.session.userId}`).emit('order_created', {
          type: 'FUEL_ORDER_CREATED',
          orderId: order.id,
          status: 'PENDING',
          fuelType: order.fuelType,
          quantity: order.quantity,
          totalAmount: order.totalAmount,
          deliveryAddress: order.deliveryAddress,
          timestamp: Date.now()
        });

        // Notify available drivers about new order
        global.io.to('drivers').emit('new_fuel_order_available', {
          orderId: order.id,
          fuelType: order.fuelType,
          quantity: order.quantity,
          deliveryAddress: order.deliveryAddress,
          estimatedEarnings: (parseFloat(order.totalAmount) * 0.15).toFixed(2), // 15% commission
          distance: '2.3 km', // Calculate actual distance
          timestamp: Date.now()
        });

        // Notify fuel station/merchant
        global.io.to(`station_${order.stationId}`).emit('new_fuel_order', {
          orderId: order.id,
          customerName: req.session.user?.fullName || 'Customer',
          fuelType: order.fuelType,
          quantity: order.quantity,
          totalAmount: order.totalAmount,
          deliveryAddress: order.deliveryAddress,
          timestamp: Date.now()
        });

        // Notify admin dashboard
        global.io.to('admin_orders').emit('new_fuel_order', {
          orderId: order.id,
          customerId: req.session.userId,
          stationId: order.stationId,
          totalAmount: order.totalAmount,
          timestamp: Date.now()
        });
      }
      
      res.json({ 
        success: true,
        message: "Fuel order created successfully",
        order 
      });
    } catch (error) {
      console.error("Create fuel order error:", error);
      res.status(400).json({ message: "Failed to create fuel order" });
    }
  });

  // Get fuel orders for user
  app.get("/api/fuel/orders", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const orders = await storage.getFuelOrders(req.session.userId);
      res.json({ success: true, orders });
    } catch (error) {
      console.error("Get fuel orders error:", error);
      res.status(500).json({ message: "Failed to fetch fuel orders" });
    }
  });

  // Update fuel order status (for drivers/merchants)
  app.put("/api/fuel/orders/:orderId/status", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { orderId } = req.params;
      const { status, driverId, location, estimatedTime } = req.body;

      const order = await storage.updateFuelOrderStatus(orderId, status, driverId);

      // Real-time WebSocket notifications for status updates
      if (global.io) {
        const statusUpdate = {
          orderId,
          status,
          previousStatus: order.status,
          driverId,
          location,
          estimatedTime,
          timestamp: Date.now(),
          updatedBy: req.session.userId
        };

        // Notify customer
        global.io.to(`user_${order.customerId}`).emit('fuel_order_status_update', {
          ...statusUpdate,
          message: getFuelOrderStatusMessage(status, 'customer'),
          notificationTitle: 'Fuel Order Update'
        });

        // Notify driver if assigned
        if (driverId) {
          global.io.to(`user_${driverId}`).emit('fuel_delivery_status_update', {
            ...statusUpdate,
            message: getFuelOrderStatusMessage(status, 'driver'),
            notificationTitle: 'Delivery Update'
          });
        }

        // Notify fuel station
        global.io.to(`station_${order.stationId}`).emit('fuel_order_status_update', {
          ...statusUpdate,
          message: getFuelOrderStatusMessage(status, 'merchant'),
          notificationTitle: 'Order Status Update'
        });

        // Broadcast to order room
        global.io.to(`order_${orderId}`).emit('order_status_update', statusUpdate);

        // Notify admin dashboard
        global.io.to('admin_orders').emit('fuel_order_status_update', {
          ...statusUpdate,
          orderDetails: {
            customerId: order.customerId,
            stationId: order.stationId,
            totalAmount: order.totalAmount
          }
        });

        // Special handling for specific statuses
        if (status === 'CONFIRMED') {
          global.io.to('drivers').emit('fuel_delivery_opportunity', {
            orderId,
            pickupAddress: order.stationAddress,
            deliveryAddress: order.deliveryAddress,
            fuelType: order.fuelType,
            quantity: order.quantity,
            estimatedEarnings: (parseFloat(order.totalAmount) * 0.15).toFixed(2),
            distance: calculateDeliveryDistance(order),
            timestamp: Date.now()
          });
        }

        if (status === 'PICKED_UP' && driverId) {
          global.io.to(`user_${order.customerId}`).emit('fuel_delivery_started', {
            orderId,
            driverId,
            driverName: 'Driver', // Get from database
            estimatedDeliveryTime: estimatedTime || '20-30 minutes',
            trackingUrl: `/fuel-delivery-tracking/${orderId}`,
            timestamp: Date.now()
          });
        }

        if (status === 'DELIVERED') {
          global.io.to(`user_${order.customerId}`).emit('fuel_delivery_completed', {
            orderId,
            deliveryTime: Date.now(),
            ratingUrl: `/rate-delivery/${orderId}`,
            timestamp: Date.now()
          });
        }
      }
      
      res.json({ 
        success: true,
        message: "Order status updated",
        order 
      });
    } catch (error) {
      console.error("Update fuel order status error:", error);
      res.status(400).json({ message: "Failed to update order status" });
    }
  });

  // Helper function for status messages
  function getFuelOrderStatusMessage(status: string, role: string): string {
    const messages = {
      customer: {
        'PENDING': 'Your fuel order has been placed and is awaiting confirmation.',
        'CONFIRMED': 'Your fuel order has been confirmed and is being prepared.',
        'READY_FOR_PICKUP': 'Your fuel is ready and waiting for driver pickup.',
        'PICKED_UP': 'Your fuel has been picked up and is on the way to you.',
        'IN_TRANSIT': 'Your fuel delivery is in progress.',
        'DELIVERED': 'Your fuel has been delivered successfully!',
        'CANCELLED': 'Your fuel order has been cancelled.'
      },
      driver: {
        'CONFIRMED': 'New fuel delivery opportunity available.',
        'ASSIGNED': 'You have been assigned a fuel delivery.',
        'READY_FOR_PICKUP': 'Fuel is ready for pickup at the station.',
        'PICKED_UP': 'Fuel picked up. Please proceed to delivery location.',
        'IN_TRANSIT': 'Delivery in progress.',
        'DELIVERED': 'Delivery completed successfully.',
        'CANCELLED': 'Delivery has been cancelled.'
      },
      merchant: {
        'PENDING': 'New fuel order received. Please prepare the fuel.',
        'CONFIRMED': 'Fuel order confirmed. Please prepare for pickup.',
        'READY_FOR_PICKUP': 'Fuel is ready. Awaiting driver pickup.',
        'PICKED_UP': 'Fuel has been picked up by driver.',
        'DELIVERED': 'Fuel order completed successfully.',
        'CANCELLED': 'Fuel order has been cancelled.'
      }
    };

    return messages[role as keyof typeof messages]?.[status as keyof any] || `Order status updated to ${status}`;
  }

  function calculateDeliveryDistance(order: any): string {
    // Simplified distance calculation - in production use proper geocoding
    return '2.5 km';
  }

  // Get available fuel orders for drivers
  app.get("/api/fuel/orders/available", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || user.role !== "DRIVER") {
        return res.status(403).json({ message: "Only drivers can access this endpoint" });
      }

      const orders = await storage.getAvailableFuelOrders();
      res.json({ success: true, orders });
    } catch (error) {
      console.error("Get available fuel orders error:", error);
      res.status(500).json({ message: "Failed to fetch available orders" });
    }
  });

  // Get specific fuel station by ID
  app.get("/api/fuel/stations/:stationId", async (req, res) => {
    try {
      const { stationId } = req.params;
      
      const station = await storage.getFuelStationById(stationId);
      
      if (!station) {
        return res.status(404).json({ message: "Fuel station not found" });
      }
      
      res.json({ success: true, station });
    } catch (error) {
      console.error("Get fuel station error:", error);
      res.status(500).json({ message: "Failed to fetch fuel station" });
    }
  });

  // Get specific fuel order by ID
  app.get("/api/fuel/orders/:orderId", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { orderId } = req.params;
      const order = await storage.getFuelOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Check if user has permission to view this order
      const hasPermission = 
        order.customerId === req.session.userId || 
        order.sellerId === req.session.userId ||
        order.driverId === req.session.userId;

      if (!hasPermission) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json({ success: true, order });
    } catch (error) {
      console.error("Get fuel order error:", error);
      res.status(500).json({ message: "Failed to fetch fuel order" });
    }
  });

  // Get fuel orders for merchant
  app.get("/api/fuel/orders/merchant", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || user.role !== "MERCHANT") {
        return res.status(403).json({ message: "Only merchants can access this endpoint" });
      }

      const orders = await storage.getMerchantFuelOrders(req.session.userId);
      res.json({ success: true, orders });
    } catch (error) {
      console.error("Get merchant fuel orders error:", error);
      res.status(500).json({ message: "Failed to fetch merchant orders" });
    }
  });

  // Request delivery for order
  app.post("/api/delivery/request", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { orderId } = req.body;
      const order = await storage.getFuelOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.sellerId !== req.session.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Broadcast delivery request to available drivers
      if (global.io) {
        global.io.to('drivers').emit('delivery_request', {
          orderId: order.id,
          fuelType: order.fuelType,
          quantity: order.quantity,
          pickupAddress: order.stationAddress,
          deliveryAddress: order.deliveryAddress,
          totalAmount: order.totalAmount,
          timestamp: Date.now()
        });
      }

      res.json({ 
        success: true,
        message: "Delivery request sent to available drivers" 
      });
    } catch (error) {
      console.error("Request delivery error:", error);
      res.status(500).json({ message: "Failed to request delivery" });
    }
  });

  // Get driver location
  app.get("/api/tracking/driver/:driverId/location", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { driverId } = req.params;
      const driverProfile = await storage.getDriverProfile(parseInt(driverId));
      
      if (!driverProfile) {
        return res.status(404).json({ message: "Driver not found" });
      }

      res.json({ 
        success: true,
        location: driverProfile.currentLocation 
      });
    } catch (error) {
      console.error("Get driver location error:", error);
      res.status(500).json({ message: "Failed to fetch driver location" });
    }
  });

  // Real-time driver location updates for fuel delivery
  app.post("/api/fuel/delivery/location-update", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { orderId, latitude, longitude, heading, speed } = req.body;
      const driverId = req.session.userId;

      // Update driver location in database
      await storage.updateDriverLocation(driverId, {
        latitude: latitude.toString(),
        longitude: longitude.toString()
      });

      // Calculate ETA to delivery location
      const order = await storage.getFuelOrderById(orderId);
      if (order) {
        const distance = calculateDistance(
          latitude, longitude,
          parseFloat(order.deliveryLatitude),
          parseFloat(order.deliveryLongitude)
        );
        const etaMinutes = Math.round((distance / 25) * 60); // 25 km/h average speed

        // Real-time location broadcast
        if (global.io) {
          const locationUpdate = {
            orderId,
            driverId,
            location: { latitude, longitude },
            heading,
            speed,
            eta: `${etaMinutes} minutes`,
            distance: `${distance.toFixed(1)} km`,
            timestamp: Date.now()
          };

          // Notify customer about driver location
          global.io.to(`user_${order.customerId}`).emit('driver_location_update', locationUpdate);

          // Broadcast to order tracking room
          global.io.to(`order_${orderId}`).emit('real_time_tracking', locationUpdate);

          // Notify admin monitoring
          global.io.to('admin_monitoring').emit('driver_location_update', {
            ...locationUpdate,
            driverName: 'Driver Name', // Get from database
            customerAddress: order.deliveryAddress
          });
        }
      }

      res.json({ 
        success: true,
        message: "Location updated successfully"
      });
    } catch (error) {
      console.error("Driver location update error:", error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  // Helper function to calculate distance
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}
