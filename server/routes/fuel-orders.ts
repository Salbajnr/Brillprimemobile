
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
}
