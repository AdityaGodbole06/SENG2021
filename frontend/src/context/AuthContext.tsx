import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { User, UserRole } from '@/types'

export interface ApiCredentials {
  chalksnifferKey?: string
  gptlessToken?: string
  despatchToken?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  role: UserRole
  apiCredentials: ApiCredentials | null
  setRole: (role: UserRole) => void
  login: (user: User, credentials: ApiCredentials) => void
  logout: () => void
  setTokens: (tokens: ApiTokens) => void
  tokens: ApiTokens
}

export interface ApiTokens {
  ordersApi?: string
  dispatchApi?: string
  invoicesApi?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole>('buyer')
  const [tokens, setTokensState] = useState<ApiTokens>(() => {
    const stored = localStorage.getItem('api_tokens')
    return stored ? JSON.parse(stored) : {}
  })
  const [apiCredentials, setApiCredentialsState] = useState<ApiCredentials | null>(() => {
    const stored = localStorage.getItem('api_credentials')
    return stored ? JSON.parse(stored) : null
  })

  const login = useCallback((newUser: User, credentials: ApiCredentials = {}) => {
    setUser(newUser)
    setRole(newUser.role)
    setApiCredentialsState(credentials)
    localStorage.setItem('user', JSON.stringify(newUser))
    localStorage.setItem('api_credentials', JSON.stringify(credentials))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setTokensState({})
    setApiCredentialsState(null)
    localStorage.removeItem('user')
    localStorage.removeItem('api_tokens')
    localStorage.removeItem('api_credentials')
  }, [])

  const setTokens = useCallback((newTokens: ApiTokens) => {
    setTokensState(newTokens)
    localStorage.setItem('api_tokens', JSON.stringify(newTokens))
  }, [])

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    role,
    apiCredentials,
    setRole: (newRole: UserRole) => {
      setRole(newRole)
      if (user) {
        const updatedUser = { ...user, role: newRole }
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
      }
    },
    login,
    logout,
    tokens,
    setTokens,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
