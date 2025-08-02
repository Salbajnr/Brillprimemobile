
import { pgTable, serial, text, integer, decimal, timestamp, real, boolean } from "drizzle-orm/pg-core";

export const fuelOrders = pgTable("fuel_orders", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().unique(),
  customerId: integer("customer_id").notNull(),
  stationId: text("station_id").notNull(),
  driverId: integer("driver_id"),
  fuelType: text("fuel_type").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryLatitude: real("delivery_latitude").notNull(),
  deliveryLongitude: real("delivery_longitude").notNull(),
  scheduledDeliveryTime: timestamp("scheduled_delivery_time"),
  actualDeliveryTime: timestamp("actual_delivery_time"),
  status: text("status").notNull().default("PENDING"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const fuelStations = pgTable("fuel_stations", {
  id: serial("id").primaryKey(),
  stationId: text("station_id").notNull().unique(),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  address: text("address").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  pmsPrice: decimal("pms_price", { precision: 10, scale: 2 }),
  agoPrice: decimal("ago_price", { precision: 10, scale: 2 }),
  dpkPrice: decimal("dpk_price", { precision: 10, scale: 2 }),
  fuelTypes: text("fuel_types").array(),
  rating: real("rating").default(0),
  reviewCount: integer("review_count").default(0),
  deliveryRadius: integer("delivery_radius").default(10000), // in meters
  estimatedDeliveryTime: text("estimated_delivery_time").default("15-30 mins"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
