import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody } from '@/components/ui/Card'
import { createApiClients } from '@/services/apiClient'
import { authService } from '@/services/authService'

type AuthMode = 'login' | 'register'

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Login form
  const [loginData, setLoginData] = useState({
    partyId: '',
    password: '',
  })

  // Register form
  const [registerData, setRegisterData] = useState({
    partyId: '',
    name: '',
    password: '',
    confirmPassword: '',
    role: 'DELIVERY_PARTY' as 'DESPATCH_PARTY' | 'DELIVERY_PARTY',
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const clients = createApiClients({})
      const response = await authService.login(clients, {
        partyId: loginData.partyId,
        password: loginData.password,
      })

      if (!response) {
        setError('Login failed. Please check your credentials.')
        return
      }

      // Login with user info and API credentials
      login(
        {
          id: response.party.partyId,
          name: response.party.name,
          email: response.party.partyId,
          role: response.party.role.includes('DELIVERY') ? 'buyer' : 'supplier',
          company: 'Trading Partner',
        },
        response.apiCredentials || {}
      )

      navigate('/dashboard')
    } catch (err) {
      setError('An error occurred during login')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!registerData.partyId || !registerData.name || !registerData.password) {
      setError('Please fill in all fields')
      return
    }

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (registerData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const clients = createApiClients({})
      const response = await authService.register(clients, {
        partyId: registerData.partyId,
        name: registerData.name,
        password: registerData.password,
        role: registerData.role,
      })

      if (!response) {
        setError('Registration failed. PartyId may already exist.')
        return
      }

      setError(null)
      alert('Registration successful! Please login.')
      setMode('login')
      setRegisterData({
        partyId: '',
        name: '',
        password: '',
        confirmPassword: '',
        role: 'DELIVERY_PARTY',
      })
    } catch (err) {
      setError('An error occurred during registration')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center p-4'>
      <Card className='w-full max-w-md'>
        <CardBody className='pt-8'>
          <h1 className='text-3xl font-bold text-center mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'>
            DigitalBook
          </h1>
          <p className='text-center text-slate-600 dark:text-slate-400 mb-6'>
            Digital Trade Management Platform
          </p>

          {error && (
            <div className='mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm'>
              {error}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className='space-y-4'>
              <Input
                label='Party ID'
                placeholder='Enter your party ID'
                value={loginData.partyId}
                onChange={e => setLoginData({ ...loginData, partyId: e.target.value })}
                required
              />

              <Input
                label='Password'
                type='password'
                placeholder='Enter your password'
                value={loginData.password}
                onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                required
              />

              <Button type='submit' fullWidth isLoading={loading} className='mt-6'>
                Login
              </Button>

              <div className='text-center'>
                <p className='text-slate-600 dark:text-slate-400 text-sm'>
                  Don't have an account?{' '}
                  <button
                    type='button'
                    onClick={() => setMode('register')}
                    className='text-blue-600 dark:text-blue-400 font-medium hover:underline'
                  >
                    Register
                  </button>
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className='space-y-4'>
              <Input
                label='Party ID'
                placeholder='e.g., SUPPLIER001'
                value={registerData.partyId}
                onChange={e => setRegisterData({ ...registerData, partyId: e.target.value })}
                required
              />

              <Input
                label='Full Name'
                placeholder='Your full name'
                value={registerData.name}
                onChange={e => setRegisterData({ ...registerData, name: e.target.value })}
                required
              />

              <Input
                label='Password'
                type='password'
                placeholder='At least 6 characters'
                value={registerData.password}
                onChange={e => setRegisterData({ ...registerData, password: e.target.value })}
                required
              />

              <Input
                label='Confirm Password'
                type='password'
                placeholder='Confirm your password'
                value={registerData.confirmPassword}
                onChange={e => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                required
              />

              <div>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>
                  Role
                </label>
                <select
                  value={registerData.role}
                  onChange={e =>
                    setRegisterData({
                      ...registerData,
                      role: e.target.value as 'DESPATCH_PARTY' | 'DELIVERY_PARTY',
                    })
                  }
                  className='w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option value='DELIVERY_PARTY'>Buyer (Delivery Party)</option>
                  <option value='DESPATCH_PARTY'>Supplier (Despatch Party)</option>
                </select>
              </div>

              <Button type='submit' fullWidth isLoading={loading} className='mt-6'>
                Register
              </Button>

              <div className='text-center'>
                <p className='text-slate-600 dark:text-slate-400 text-sm'>
                  Already have an account?{' '}
                  <button
                    type='button'
                    onClick={() => setMode('login')}
                    className='text-blue-600 dark:text-blue-400 font-medium hover:underline'
                  >
                    Login
                  </button>
                </p>
              </div>
            </form>
          )}

          <div className='mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-slate-600 dark:text-slate-400'>
            <p className='font-medium mb-1'>Demo Credentials:</p>
            <p>Party ID: BUYER001, Password: test123</p>
            <p>Party ID: SUPPLIER001, Password: test123</p>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

export default LoginPage
