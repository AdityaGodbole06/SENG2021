import React, { useState, useEffect } from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/context/AuthContext'
import { createApiClients } from '@/services/apiClient'
import { auditService, AuditLog } from '@/services/auditService'

const AuditTrailPage: React.FC = () => {
  const { tokens, apiCredentials } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
  })

  useEffect(() => {
    const fetchAuditTrail = async () => {
      try {
        setLoading(true)
        setError(null)
        const clients = createApiClients(tokens || {}, apiCredentials || {})
        const data = await auditService.getAuditTrail(clients, filters)
        setLogs(data)
      } catch (err) {
        setError('Failed to load audit trail')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAuditTrail()
  }, [tokens, apiCredentials, filters])

  const getStatusVariant = (status: string): 'success' | 'danger' | 'default' => {
    return status === 'success' ? 'success' : status === 'failure' ? 'danger' : 'default'
  }

  const getActionColor = (action: string): string => {
    const colors: Record<string, string> = {
      CREATE_ORDER: 'bg-blue-100 text-blue-800',
      UPDATE_ORDER: 'bg-yellow-100 text-yellow-800',
      DELETE_ORDER: 'bg-red-100 text-red-800',
      CREATE_DESPATCH: 'bg-green-100 text-green-800',
      SUBMIT_RECEIPT: 'bg-purple-100 text-purple-800',
      REQUEST_ADJUSTMENT: 'bg-orange-100 text-orange-800',
      CREATE_INVOICE: 'bg-indigo-100 text-indigo-800',
      LOGIN: 'bg-cyan-100 text-cyan-800',
    }
    return colors[action] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900 p-6'>
      <div className='max-w-7xl mx-auto'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2'>Audit Trail</h1>
          <p className='text-slate-600 dark:text-slate-400'>View all system activities and changes</p>
        </div>

        {/* Filters */}
        <Card className='mb-6'>
          <CardBody>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>
                  Entity Type
                </label>
                <select
                  value={filters.entityType}
                  onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
                  className='w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50'
                >
                  <option value=''>All Types</option>
                  <option value='ORDER'>Order</option>
                  <option value='DESPATCH'>Despatch</option>
                  <option value='RECEIPT'>Receipt</option>
                  <option value='INVOICE'>Invoice</option>
                </select>
              </div>

              <div>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>
                  Action
                </label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  className='w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50'
                >
                  <option value=''>All Actions</option>
                  <option value='CREATE_ORDER'>Create Order</option>
                  <option value='UPDATE_ORDER'>Update Order</option>
                  <option value='DELETE_ORDER'>Delete Order</option>
                  <option value='CREATE_DESPATCH'>Create Despatch</option>
                  <option value='SUBMIT_RECEIPT'>Submit Receipt</option>
                </select>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Error Message */}
        {error && (
          <div className='mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded text-red-700 dark:text-red-400'>
            {error}
          </div>
        )}

        {/* Audit Logs Table */}
        <Card>
          <CardBody>
            {loading ? (
              <div className='text-center py-8 text-slate-500'>Loading audit trail...</div>
            ) : logs.length === 0 ? (
              <div className='text-center py-8 text-slate-500'>No audit logs found</div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr className='border-b border-slate-200 dark:border-slate-700'>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>
                        Timestamp
                      </th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>
                        Action
                      </th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>
                        Entity
                      </th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>
                        Description
                      </th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.auditLogId} className='border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'>
                        <td className='py-3 px-4 text-sm text-slate-600 dark:text-slate-400'>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className='py-3 px-4'>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className='py-3 px-4 text-sm text-slate-900 dark:text-slate-50'>
                          {log.entityType}
                          <div className='text-xs text-slate-500 dark:text-slate-400'>{log.entityId}</div>
                        </td>
                        <td className='py-3 px-4 text-sm text-slate-900 dark:text-slate-50'>
                          {log.description}
                        </td>
                        <td className='py-3 px-4'>
                          <Badge variant={getStatusVariant(log.status)}>
                            {log.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

export default AuditTrailPage
