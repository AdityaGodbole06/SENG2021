import { ApiClients } from './apiClient'

export interface AuditLog {
  auditLogId: string
  action: string
  entityType: string
  entityId: string
  description: string
  status: 'success' | 'failure'
  createdAt: string
  changes?: any
}

export const auditService = {
  async getAuditTrail(clients: ApiClients, filters?: {
    entityType?: string
    action?: string
    startDate?: string
    endDate?: string
    limit?: number
  }): Promise<AuditLog[]> {
    try {
      const params = new URLSearchParams()
      if (filters?.entityType) params.append('entityType', filters.entityType)
      if (filters?.action) params.append('action', filters.action)
      if (filters?.startDate) params.append('startDate', filters.startDate)
      if (filters?.endDate) params.append('endDate', filters.endDate)
      if (filters?.limit) params.append('limit', filters.limit.toString())

      const response = await clients.auditApi.get(`/audit-trail?${params.toString()}`)
      return response.logs as AuditLog[]
    } catch (error) {
      console.error('Error fetching audit trail:', error)
      return []
    }
  },

  async getEntityAuditTrail(clients: ApiClients, entityType: string, entityId: string): Promise<AuditLog[]> {
    try {
      const response = await clients.auditApi.get(`/audit-trail/${entityType}/${entityId}`)
      return response.logs as AuditLog[]
    } catch (error) {
      console.error('Error fetching entity audit trail:', error)
      return []
    }
  },
}
