const express = require('express');
const router = express.Router();
const AuditService = require('../services/auditService');

const auditService = new AuditService();

// GET /audit-trail - Get user's audit trail
router.get('/', async (req, res) => {
  if (!req.party) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { entityType, action, startDate, endDate, limit } = req.query;

    const filters = {
      entityType,
      action,
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : 100,
    };

    const logs = await auditService.getAuditTrail(req.party.partyId, filters);

    res.status(200).json({
      total: logs.length,
      filters,
      logs: logs.map((log) => ({
        auditLogId: log.auditLogId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        description: log.description,
        status: log.status,
        createdAt: log.createdAt,
        changes: log.changes,
      })),
    });
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /audit-trail/:entityType/:entityId - Get audit trail for specific entity
router.get('/:entityType/:entityId', async (req, res) => {
  if (!req.party) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { entityType, entityId } = req.params;

    const logs = await auditService.getEntityAuditTrail(entityType, entityId);

    res.status(200).json({
      entityType,
      entityId,
      total: logs.length,
      logs: logs.map((log) => ({
        auditLogId: log.auditLogId,
        action: log.action,
        description: log.description,
        status: log.status,
        createdAt: log.createdAt,
        changes: log.changes,
      })),
    });
  } catch (error) {
    console.error('Error fetching entity audit trail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
