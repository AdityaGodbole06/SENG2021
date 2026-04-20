import axios from 'axios'

const setupApi = axios.create({
  baseURL: 'http://localhost:3000/api/proxy',
})

export const externalApiSetup = {
  async initialize(): Promise<boolean> {
    try {
      const response = await setupApi.post('/setup')
      console.log('External APIs initialized:', response.data)
      return true
    } catch (error) {
      console.error('Failed to initialize external APIs:', error)
      return false
    }
  },
}
