
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
      const { status, driverId } = req.body;

      const order = await storage.updateFuelOrderStatus(orderId, status, driverId);
      
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
}
