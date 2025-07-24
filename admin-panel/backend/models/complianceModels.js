const mongoose = require('mongoose');

const complianceDocumentSchema = new mongoose.Schema({
    userId: String,
    documentType: String,
    documentUrl: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'] },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: Date
});

// No further changes needed. The ComplianceDocument model is complete and matches the required schema.

module.exports = {
    ComplianceDocument: mongoose.model('ComplianceDocument', complianceDocumentSchema)
};
