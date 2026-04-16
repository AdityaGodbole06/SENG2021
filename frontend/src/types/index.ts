export type UserRole = 'buyer' | 'supplier'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  company: string
}

export interface Order {
  id: string
  orderNumber: string
  buyerParty: string
  sellerParty: string
  amount: number
  orderDate: string
  deliveryDate: string
  status: 'pending' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled'
  lineItems?: OrderLineItem[]
}

export interface OrderLineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface DespatchAdvice {
  id: string
  despatchNumber: string
  orderRef: string
  dispatchDate: string
  deliveryParty: string
  expectedArrival: string
  status: 'dispatched' | 'in_transit' | 'delivered' | 'delayed' | 'issue'
  items?: DespatchLineItem[]
  discrepancies?: string[]
}

export interface DespatchLineItem {
  id: string
  orderLineRef: string
  deliveredQuantity: number
  backorderQuantity?: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  orderId: string
  buyerParty: string
  sellerParty: string
  totalAmount: number
  invoiceDate: string
  dueDate: string
  status: 'unpaid' | 'paid' | 'overdue' | 'cancelled'
  lineItems?: InvoiceLineItem[]
}

export interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface ApiError {
  message: string
  code?: string
  details?: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
