const mongoose = require('mongoose');

const contentReportSchema = new mongoose.Schema({
    reportedBy: String,
    contentId: String,
    reason: String,
    createdAt: { type: Date, default: Date.now },
    responses: [
        {
            adminId: String,
            response: String,
            respondedAt: Date
        }
    ]
});

const vendorViolationSchema = new mongoose.Schema({
    vendorId: String,
    violationType: String,
    description: String,
    reportedAt: { type: Date, default: Date.now },
    responses: [
        {
            adminId: String,
            response: String,
            respondedAt: Date
        }
    ]
});

module.exports = {
    ContentReport: mongoose.model('ContentReport', contentReportSchema),
    VendorViolation: mongoose.model('VendorViolation', vendorViolationSchema)
};
