import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '@/services/api'
import Button from '@/components/ui/Button'

interface RegisterFormData {
  email: string
  password: string
  confirmPassword: string
  first_name: string
  last_name: string
  birthday: string
  dietary_restrictions: string[]
  nutrition_targets: {
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
  }
  favorite_foods: string[]
}

const dietaryOptions = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
  'Keto',
  'Paleo',
  'Low-Carb',
  'Low-Sodium',
  'Halal',
  'Kosher'
]

export default function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    birthday: '',
    dietary_restrictions: [],
    nutrition_targets: {},
    favorite_foods: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [favoriteFoodInput, setFavoriteFoodInput] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleNutritionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      nutrition_targets: {
        ...prev.nutrition_targets,
        [name]: value ? parseInt(value) : undefined
      }
    }))
  }

  const handleDietaryToggle = (restriction: string) => {
    setFormData(prev => ({
      ...prev,
      dietary_restrictions: prev.dietary_restrictions.includes(restriction)
        ? prev.dietary_restrictions.filter(r => r !== restriction)
        : [...prev.dietary_restrictions, restriction]
    }))
  }

  const addFavoriteFood = () => {
    if (favoriteFoodInput.trim() && !formData.favorite_foods.includes(favoriteFoodInput.trim())) {
      setFormData(prev => ({
        ...prev,
        favorite_foods: [...prev.favorite_foods, favoriteFoodInput.trim()]
      }))
      setFavoriteFoodInput('')
    }
  }

  const removeFavoriteFood = (food: string) => {
    setFormData(prev => ({
      ...prev,
      favorite_foods: prev.favorite_foods.filter(f => f !== food)
    }))
  }

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name) {
      setError('Please fill in all required fields')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) return

    setLoading(true)

    try {
      // Prepare data for API (remove confirmPassword and handle optional fields)
      const { confirmPassword, ...apiData } = formData
      
      // Only include fields that have values
      const cleanData: any = {
        email: apiData.email,
        password: apiData.password,
        first_name: apiData.first_name,
        last_name: apiData.last_name
      }

      if (apiData.birthday) cleanData.birthday = apiData.birthday
      if (apiData.dietary_restrictions.length > 0) cleanData.dietary_restrictions = apiData.dietary_restrictions
      if (apiData.favorite_foods.length > 0) cleanData.favorite_foods = apiData.favorite_foods
      if (Object.keys(apiData.nutrition_targets).length > 0) cleanData.nutrition_targets = apiData.nutrition_targets

      await authAPI.register(cleanData)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              sign in to your existing account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                  First Name *
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                  Last Name *
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="birthday" className="block text-sm font-medium text-gray-700">
                Birthday
              </label>
              <input
                id="birthday"
                name="birthday"
                type="date"
                value={formData.birthday}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Advanced Options Toggle */}
            <div className="pt-4">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
              >
                {showAdvanced ? 'Hide' : 'Show'} Advanced Options
              </button>
            </div>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="space-y-6 border-t border-gray-200 pt-6">
                {/* Dietary Restrictions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dietary Restrictions
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {dietaryOptions.map(option => (
                      <label key={option} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.dietary_restrictions.includes(option)}
                          onChange={() => handleDietaryToggle(option)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Nutrition Targets */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Nutrition Targets (optional)
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="calories" className="block text-xs text-gray-600">
                        Calories
                      </label>
                      <input
                        id="calories"
                        name="calories"
                        type="number"
                        value={formData.nutrition_targets.calories || ''}
                        onChange={handleNutritionChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="protein" className="block text-xs text-gray-600">
                        Protein (g)
                      </label>
                      <input
                        id="protein"
                        name="protein"
                        type="number"
                        value={formData.nutrition_targets.protein || ''}
                        onChange={handleNutritionChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="carbs" className="block text-xs text-gray-600">
                        Carbs (g)
                      </label>
                      <input
                        id="carbs"
                        name="carbs"
                        type="number"
                        value={formData.nutrition_targets.carbs || ''}
                        onChange={handleNutritionChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="fat" className="block text-xs text-gray-600">
                        Fat (g)
                      </label>
                      <input
                        id="fat"
                        name="fat"
                        type="number"
                        value={formData.nutrition_targets.fat || ''}
                        onChange={handleNutritionChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Favorite Foods */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Favorite Foods
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={favoriteFoodInput}
                      onChange={(e) => setFavoriteFoodInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFavoriteFood())}
                      placeholder="Add a favorite food"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Button
                      type="button"
                      onClick={addFavoriteFood}
                      disabled={!favoriteFoodInput.trim()}
                      size="sm"
                    >
                      Add
                    </Button>
                  </div>
                  {formData.favorite_foods.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.favorite_foods.map((food, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {food}
                          <button
                            type="button"
                            onClick={() => removeFavoriteFood(food)}
                            className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <Button
              type="submit"
              loading={loading}
              className="w-full"
            >
              Create Account
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              By creating an account, you agree to our{' '}
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                Privacy Policy
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
} 