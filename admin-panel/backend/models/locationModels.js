const mongoose = require('mongoose');

const driverLocationSchema = new mongoose.Schema({
    driverId: String,
    latitude: Number,
    longitude: Number,
    updatedAt: { type: Date, default: Date.now }
});

const fuelDeliverySchema = new mongoose.Schema({
    deliveryId: String,
    driverId: String,
    customerId: String,
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
    scheduledAt: Date,
    completedAt: Date,
    location: {
        latitude: Number,
        longitude: Number
    }
});

module.exports = {
    DriverLocation: mongoose.model('DriverLocation', driverLocationSchema),
    FuelDelivery: mongoose.model('FuelDelivery', fuelDeliverySchema)
};
