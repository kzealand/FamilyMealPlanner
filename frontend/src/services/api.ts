import axios from 'axios'
import { 
  User, 
  Family, 
  FamilyMember, 
  Recipe, 
  MealPlan, 
  ShoppingList,
  LoginRequest,
  RegisterRequest,
  CreateRecipeRequest,
  CreateMealPlanRequest,
  GenerateShoppingListRequest
} from '@/types'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: async (data: LoginRequest) => {
    const response = await api.post('/auth/login', data)
    return response.data
  },

  register: async (data: RegisterRequest) => {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile')
    return response.data.user as User
  },

  updateProfile: async (data: Partial<User>) => {
    const response = await api.put('/auth/profile', data)
    return response.data.user as User
  },
}

// Family API
export const familyAPI = {
  create: async (data: { name: string; description?: string }) => {
    const response = await api.post('/families', data)
    return response.data.family as Family
  },

  getAll: async () => {
    const response = await api.get('/families')
    return response.data.families as Family[]
  },

  getById: async (familyId: string) => {
    const response = await api.get(`/families/${familyId}`)
    return response.data as { family: Family; members: FamilyMember[] }
  },

  addMember: async (familyId: string, data: { email: string; role?: string }) => {
    const response = await api.post(`/families/${familyId}/members`, data)
    return response.data.members as FamilyMember[]
  },

  removeMember: async (familyId: string, userId: string) => {
    await api.delete(`/families/${familyId}/members/${userId}`)
  },

  updateMemberRole: async (familyId: string, userId: string, role: string) => {
    await api.put(`/families/${familyId}/members/${userId}/role`, { role })
  },

  leave: async (familyId: string) => {
    await api.delete(`/families/${familyId}/members/leave`)
  },
}

// Recipe API
export const recipeAPI = {
  create: async (familyId: string, data: CreateRecipeRequest) => {
    const response = await api.post(`/recipes/${familyId}`, data)
    return response.data.recipe as Recipe
  },

  getAll: async (familyId: string, params?: { 
    search?: string; 
    dietary_tags?: string; 
    favorite_only?: boolean 
  }) => {
    const response = await api.get(`/recipes/${familyId}`, { params })
    return response.data.recipes as Recipe[]
  },

  getById: async (familyId: string, recipeId: string) => {
    const response = await api.get(`/recipes/${familyId}/${recipeId}`)
    return response.data.recipe as Recipe
  },

  update: async (familyId: string, recipeId: string, data: Partial<Recipe>) => {
    const response = await api.put(`/recipes/${familyId}/${recipeId}`, data)
    return response.data.recipe as Recipe
  },

  delete: async (familyId: string, recipeId: string) => {
    await api.delete(`/recipes/${familyId}/${recipeId}`)
  },

  toggleFavorite: async (familyId: string, recipeId: string) => {
    const response = await api.post(`/recipes/${familyId}/${recipeId}/favorite`)
    return response.data
  },
}

// Meal Plan API
export const mealPlanAPI = {
  create: async (familyId: string, userId: string, data: CreateMealPlanRequest) => {
    const response = await api.post(`/meal-plans/${familyId}/${userId}`, data)
    return response.data.meal_plan as MealPlan
  },

  getByUser: async (familyId: string, userId: string, weekStartDate: string) => {
    const response = await api.get(`/meal-plans/${familyId}/${userId}`, {
      params: { week_start_date: weekStartDate }
    })
    return response.data.meal_plan as MealPlan
  },

  getAllForFamily: async (familyId: string, weekStartDate: string) => {
    const response = await api.get(`/meal-plans/${familyId}`, {
      params: { week_start_date: weekStartDate }
    })
    return response.data.meal_plans as MealPlan[]
  },

  delete: async (familyId: string, userId: string, weekStartDate: string) => {
    await api.delete(`/meal-plans/${familyId}/${userId}`, {
      params: { week_start_date: weekStartDate }
    })
  },
}

// Shopping List API
export const shoppingListAPI = {
  generate: async (familyId: string, data: GenerateShoppingListRequest) => {
    const response = await api.post(`/shopping-lists/${familyId}/generate`, data)
    return response.data.shopping_list as ShoppingList
  },

  getByWeek: async (familyId: string, weekStartDate: string) => {
    const response = await api.get(`/shopping-lists/${familyId}`, {
      params: { week_start_date: weekStartDate }
    })
    return response.data.shopping_list as ShoppingList
  },

  updateItem: async (familyId: string, itemId: string, data: { 
    is_checked: boolean; 
    notes?: string 
  }) => {
    const response = await api.put(`/shopping-lists/${familyId}/items/${itemId}`, data)
    return response.data.item
  },

  getAll: async (familyId: string) => {
    const response = await api.get(`/shopping-lists/${familyId}/lists`)
    return response.data.shopping_lists
  },

  delete: async (familyId: string, weekStartDate: string) => {
    await api.delete(`/shopping-lists/${familyId}`, {
      params: { week_start_date: weekStartDate }
    })
  },
}

export default api 