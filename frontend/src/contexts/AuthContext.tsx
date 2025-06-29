import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@/types'
import { authAPI } from '@/services/api'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (userData: any) => Promise<void>
  logout: () => void
  updateUser: (data: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
        // Verify token is still valid
        authAPI.getProfile().then(setUser).catch(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        })
      } catch (error) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const response = await authAPI.login({ email, password })
    const { user: userData, token } = response
    
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const register = async (userData: any) => {
    const response = await authAPI.register(userData)
    const { user: newUser, token } = response
    
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(newUser))
    setUser(newUser)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const updateUser = async (data: Partial<User>) => {
    const updatedUser = await authAPI.updateProfile(data)
    console.log('Backend returned updated user:', updatedUser)
    console.log('Backend returned birthday:', updatedUser.birthday)
    console.log('Backend returned birthday type:', typeof updatedUser.birthday)
    const newUser = { ...user, ...updatedUser }
    console.log('Merged user data:', newUser)
    console.log('Merged user birthday:', newUser.birthday)
    localStorage.setItem('user', JSON.stringify(newUser))
    setUser(newUser as User)
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 