const { v4: uuidv4 } = require('uuid');
const AuditLog = require('../models/AuditLog');

class AuditService {
  async log(action, entityType, entityId, partyId, changes = {}, description = '', status = 'success', errorMessage = null) {
    try {
      const auditLog = new AuditLog({
        auditLogId: `AL-${uuidv4()}`,
        action,
        entityType,
        entityId,
        partyId,
        changes,
        description,
        status,
        errorMessage,
      });

      await auditLog.save();
      return auditLog;
    } catch (error) {
      console.error('Error logging audit:', error);
      // Don't throw error - audit logging should not break the main operation
    }
  }

  async getAuditTrail(partyId, filters = {}) {
    try {
      const query = { partyId };

      if (filters.entityType) {
        query.entityType = filters.entityType;
      }

      if (filters.action) {
        query.action = filters.action;
      }

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.createdAt.$lte = new Date(filters.endDate);
        }
      }

      const logs = await AuditLog.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 100);

      return logs;
    } catch (error) {
      console.error('Error retrieving audit trail:', error);
      throw error;
    }
  }

  async getEntityAuditTrail(entityType, entityId) {
    try {
      const logs = await AuditLog.find({ entityType, entityId }).sort({ createdAt: 1 });
      return logs;
    } catch (error) {
      console.error('Error retrieving entity audit trail:', error);
      throw error;
    }
  }
}

module.exports = AuditService;
