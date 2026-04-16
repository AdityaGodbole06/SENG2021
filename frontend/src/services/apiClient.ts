import axios, { AxiosInstance, AxiosError } from 'axios'
import { ApiTokens } from '@/context/AuthContext'

interface ApiClientConfig {
  baseURL: string
  apiKey?: string
  token?: string
  authType?: 'bearer' | 'apiKey'
  credentials?: {
    chalksnifferKey?: string
    gptlessToken?: string
    despatchToken?: string
  }
}

export class ApiClient {
  private instance: AxiosInstance
  private config: ApiClientConfig

  constructor(config: ApiClientConfig) {
    this.config = config
    this.instance = axios.create({
      baseURL: config.baseURL,
      timeout: 10000,
    })

    // Add interceptors
    this.instance.interceptors.request.use(
      config => this.addAuthHeaders(config),
      error => Promise.reject(error)
    )

    this.instance.interceptors.response.use(
      response => response,
      error => this.handleError(error)
    )
  }

  private addAuthHeaders(config: any) {
    if (this.config.token && this.config.authType === 'bearer') {
      config.headers.Authorization = `Bearer ${this.config.token}`
    } else if (this.config.apiKey) {
      config.headers['X-API-Key'] = this.config.apiKey
    }

    // Add external API credentials as custom headers
    if (this.config.credentials) {
      if (this.config.credentials.chalksnifferKey) {
        config.headers['X-Chalksniffer-Key'] = this.config.credentials.chalksnifferKey
      }
      if (this.config.credentials.gptlessToken) {
        config.headers['X-Gptless-Token'] = this.config.credentials.gptlessToken
      }
      if (this.config.credentials.despatchToken) {
        config.headers.Authorization = `Bearer ${this.config.credentials.despatchToken}`
      }
    }

    return config
  }

  private handleError(error: AxiosError) {
    console.error('API Error:', error.message)
    return Promise.reject(error)
  }

  setToken(token: string) {
    this.config.token = token
  }

  setApiKey(key: string) {
    this.config.apiKey = key
  }

  async get<T>(url: string, params?: Record<string, any>) {
    const response = await this.instance.get<T>(url, { params })
    return response.data
  }

  async post<T>(url: string, data?: any) {
    const response = await this.instance.post<T>(url, data)
    return response.data
  }

  async put<T>(url: string, data?: any) {
    const response = await this.instance.put<T>(url, data)
    return response.data
  }

  async delete<T>(url: string) {
    const response = await this.instance.delete<T>(url)
    return response.data
  }

  async patch<T>(url: string, data?: any) {
    const response = await this.instance.patch<T>(url, data)
    return response.data
  }
}

// Create client instances for each API (all pointing to local backend proxy)
export const createApiClients = (
  tokens: ApiTokens,
  credentials?: {
    chalksnifferKey?: string
    gptlessToken?: string
    despatchToken?: string
  }
) => ({
  // Local backend proxy that forwards to external APIs
  authApi: new ApiClient({
    baseURL: 'http://localhost:3000/api/auth',
    authType: 'bearer',
  }),
  ordersApi: new ApiClient({
    baseURL: 'http://localhost:3000/api/proxy',
    token: tokens.ordersApi,
    authType: 'bearer',
    credentials: {
      chalksnifferKey: credentials?.chalksnifferKey,
    },
  }),
  dispatchApi: new ApiClient({
    baseURL: 'http://localhost:3000/api/proxy',
    token: tokens.dispatchApi,
    authType: 'bearer',
    credentials: {
      despatchToken: credentials?.despatchToken,
    },
  }),
  invoicesApi: new ApiClient({
    baseURL: 'http://localhost:3000/api/proxy',
    token: tokens.invoicesApi,
    authType: 'bearer',
    credentials: {
      gptlessToken: credentials?.gptlessToken,
    },
  }),
})

export type ApiClients = ReturnType<typeof createApiClients>
