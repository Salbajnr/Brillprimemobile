const mongoose = require('mongoose');

const suspiciousTransactionSchema = new mongoose.Schema({
    transactionId: String,
    userId: String,
    amount: Number,
    reason: String,
    flagged: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = {
    SuspiciousTransaction: mongoose.model('SuspiciousTransaction', suspiciousTransactionSchema)
};