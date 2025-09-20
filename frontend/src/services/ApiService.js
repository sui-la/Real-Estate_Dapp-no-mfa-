const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL
  }

  getAuthHeaders() {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      headers: this.getAuthHeaders(),
      ...options
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error)
      throw error
    }
  }

  // Auth endpoints
  async walletLogin(walletAddress, signature) {
    return this.request('/auth/wallet-login', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, signature })
    })
  }

  async getCurrentUser() {
    return this.request('/auth/me')
  }

  // Property endpoints
  async getProperties(params = {}) {
    const queryString = new URLSearchParams(params).toString()
    return this.request(`/properties${queryString ? `?${queryString}` : ''}`)
  }

  async getProperty(id) {
    return this.request(`/properties/${id}`)
  }

  async createProperty(propertyData) {
    return this.request('/properties', {
      method: 'POST',
      body: JSON.stringify(propertyData)
    })
  }

  async updateProperty(id, propertyData) {
    return this.request(`/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(propertyData)
    })
  }

  async updateSharesSold(id, sharesSold) {
    return this.request(`/properties/${id}/shares`, {
      method: 'PUT',
      body: JSON.stringify({ sharesSold })
    })
  }

  async deleteProperty(id) {
    return this.request(`/properties/${id}`, {
      method: 'DELETE'
    })
  }

  async updateTradingStatus(tokenId, tradingEnabled) {
    return this.request(`/properties/${tokenId}/trading`, {
      method: 'PUT',
      body: JSON.stringify({ tradingEnabled })
    })
  }

  async getPlatformStats() {
    return this.request('/properties/stats/platform')
  }

  // User endpoints
  async updateProfile(profileData) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    })
  }
}

export default new ApiService()
