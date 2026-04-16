import { ApiClients } from './apiClient'

export interface LoginRequest {
  partyId: string
  password: string
}

export interface RegisterRequest {
  partyId: string
  name: string
  password: string
  role: 'DESPATCH_PARTY' | 'DELIVERY_PARTY'
}

export interface AuthResponse {
  message: string
  token: string
  party: {
    partyId: string
    name: string
    role: string
  }
}

export const authService = {
  async register(clients: ApiClients, data: RegisterRequest): Promise<AuthResponse | null> {
    try {
      const response = await clients.authApi.post('/register', data)
      return response as AuthResponse
    } catch (error) {
      console.error('Registration error:', error)
      return null
    }
  },

  async login(clients: ApiClients, data: LoginRequest): Promise<AuthResponse | null> {
    try {
      const response = await clients.authApi.post('/login', data)
      return response as AuthResponse
    } catch (error) {
      console.error('Login error:', error)
      return null
    }
  },
}
