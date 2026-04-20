const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  auditLogId: {
    type: String,
    required: true,
    unique: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'CREATE_ORDER',
      'UPDATE_ORDER',
      'DELETE_ORDER',
      'CREATE_DESPATCH',
      'UPDATE_DESPATCH_STATUS',
      'SUBMIT_RECEIPT',
      'REQUEST_ADJUSTMENT',
      'CANCEL_FULFILMENT',
      'CREATE_INVOICE',
      'LOGIN',
      'REGISTER',
    ],
  },
  entityType: {
    type: String,
    required: true,
    enum: ['ORDER', 'DESPATCH', 'RECEIPT', 'INVOICE', 'ADJUSTMENT', 'PARTY'],
  },
  entityId: {
    type: String,
    required: true,
  },
  partyId: {
    type: String,
    required: true,
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  description: {
    type: String,
  },
  status: {
    type: String,
    enum: ['success', 'failure'],
    default: 'success',
  },
  errorMessage: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Index for efficient querying
AuditLogSchema.index({ partyId: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
