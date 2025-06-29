import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { authAPI } from '@/services/api'
import Button from '@/components/ui/Button'
import { User, Settings, Save, X, Plus, Trash2, Lock, Eye, EyeOff } from 'lucide-react'

interface ProfileFormData {
  first_name: string
  last_name: string
  email: string
  birthday: string
  dietary_restrictions: string[]
  nutrition_targets: {
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
  }
  favorite_foods: string[]
  profile_image_url?: string
}

const DIETARY_OPTIONS = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'keto',
  'paleo',
  'mediterranean',
  'low-carb',
  'low-sodium',
  'pescatarian'
]

// Utility function to format birthday for HTML date input
const formatBirthday = (birthday: string | null | undefined): string => {
  if (!birthday) return ''
  try {
    // If it's already in yyyy-MM-dd format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      return birthday
    }
    
    // If it's an ISO date string, extract just the date part
    if (birthday.includes('T')) {
      const datePart = birthday.split('T')[0]
      return datePart
    }
    
    // Fallback: create a date object and format
    const date = new Date(birthday)
    const formatted = date.toISOString().split('T')[0]
    return formatted
  } catch (error) {
    console.error('Error formatting birthday:', error)
    return ''
  }
}

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [newDietaryRestriction, setNewDietaryRestriction] = useState('')
  const [newFavoriteFood, setNewFavoriteFood] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  
  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    email: '',
    birthday: '',
    dietary_restrictions: [],
    nutrition_targets: {},
    favorite_foods: [],
    profile_image_url: ''
  })

  useEffect(() => {
    if (user) {
      const formattedBirthday = formatBirthday(user.birthday)
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        birthday: formattedBirthday,
        dietary_restrictions: user.dietary_restrictions || [],
        nutrition_targets: user.nutrition_targets || {},
        favorite_foods: user.favorite_foods || [],
        profile_image_url: user.profile_image_url || ''
      })
    }
  }, [user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleNutritionChange = (field: string, value: string) => {
    const numValue = value === '' ? undefined : parseInt(value)
    setFormData(prev => ({
      ...prev,
      nutrition_targets: {
        ...prev.nutrition_targets,
        [field]: numValue
      }
    }))
  }

  const addDietaryRestriction = () => {
    if (newDietaryRestriction && !formData.dietary_restrictions.includes(newDietaryRestriction)) {
      setFormData(prev => ({
        ...prev,
        dietary_restrictions: [...prev.dietary_restrictions, newDietaryRestriction]
      }))
      setNewDietaryRestriction('')
    }
  }

  const removeDietaryRestriction = (restriction: string) => {
    setFormData(prev => ({
      ...prev,
      dietary_restrictions: prev.dietary_restrictions.filter(r => r !== restriction)
    }))
  }

  const addFavoriteFood = () => {
    if (newFavoriteFood && !formData.favorite_foods.includes(newFavoriteFood)) {
      setFormData(prev => ({
        ...prev,
        favorite_foods: [...prev.favorite_foods, newFavoriteFood]
      }))
      setNewFavoriteFood('')
    }
  }

  const removeFavoriteFood = (food: string) => {
    setFormData(prev => ({
      ...prev,
      favorite_foods: prev.favorite_foods.filter(f => f !== food)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Exclude email from profile update for security reasons
      const { email, ...profileData } = formData
      console.log('Sending profile update data:', profileData)
      console.log('Birthday being sent:', profileData.birthday)
      await updateUser(profileData)
      setSuccess('Profile updated successfully!')
      setIsEditing(false)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        birthday: formatBirthday(user.birthday),
        dietary_restrictions: user.dietary_restrictions || [],
        nutrition_targets: user.nutrition_targets || {},
        favorite_foods: user.favorite_foods || [],
        profile_image_url: user.profile_image_url || ''
      })
    }
    setIsEditing(false)
    setError('')
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordError('')
    setPasswordSuccess('')

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('New passwords do not match')
      setPasswordLoading(false)
      return
    }

    if (passwordData.new_password.length < 8) {
      setPasswordError('New password must be at least 8 characters long')
      setPasswordLoading(false)
      return
    }

    try {
      await authAPI.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      })
      setPasswordSuccess('Password changed successfully!')
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      })
      setTimeout(() => {
        setShowPasswordModal(false)
        setPasswordSuccess('')
      }, 2000)
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || 'Failed to change password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const closePasswordModal = () => {
    setShowPasswordModal(false)
    setPasswordData({
      current_password: '',
      new_password: '',
      confirm_password: ''
    })
    setPasswordError('')
    setPasswordSuccess('')
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your profile and preferences
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your profile and preferences
          </p>
        </div>
        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Edit Profile
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Image */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Photo</h3>
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
              {formData.profile_image_url ? (
                <img 
                  src={formData.profile_image_url} 
                  alt="Profile" 
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-gray-400" />
              )}
            </div>
            {isEditing && (
              <div className="flex-1">
                <label htmlFor="profile_image_url" className="block text-sm font-medium text-gray-700">
                  Profile Image URL
                </label>
                <input
                  type="url"
                  id="profile_image_url"
                  name="profile_image_url"
                  value={formData.profile_image_url}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            )}
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                disabled
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
              />
              <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
            </div>
            <div>
              <label htmlFor="birthday" className="block text-sm font-medium text-gray-700">
                Birthday
              </label>
              <input
                type="date"
                id="birthday"
                name="birthday"
                value={formData.birthday}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Dietary Preferences */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Dietary Preferences</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dietary Restrictions
              </label>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={newDietaryRestriction}
                      onChange={(e) => setNewDietaryRestriction(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a restriction</option>
                      {DIETARY_OPTIONS.map(option => (
                        <option key={option} value={option}>
                          {option.charAt(0).toUpperCase() + option.slice(1).replace('-', ' ')}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      onClick={addDietaryRestriction}
                      disabled={!newDietaryRestriction}
                      className="px-4"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.dietary_restrictions.map(restriction => (
                      <span
                        key={restriction}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {restriction.charAt(0).toUpperCase() + restriction.slice(1).replace('-', ' ')}
                        <button
                          type="button"
                          onClick={() => removeDietaryRestriction(restriction)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {formData.dietary_restrictions.length > 0 ? (
                    formData.dietary_restrictions.map(restriction => (
                      <span
                        key={restriction}
                        className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {restriction.charAt(0).toUpperCase() + restriction.slice(1).replace('-', ' ')}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500">No dietary restrictions set</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Favorite Foods
              </label>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFavoriteFood}
                      onChange={(e) => setNewFavoriteFood(e.target.value)}
                      placeholder="Add a favorite food"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Button
                      type="button"
                      onClick={addFavoriteFood}
                      disabled={!newFavoriteFood}
                      className="px-4"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.favorite_foods.map(food => (
                      <span
                        key={food}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                      >
                        {food}
                        <button
                          type="button"
                          onClick={() => removeFavoriteFood(food)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {formData.favorite_foods.length > 0 ? (
                    formData.favorite_foods.map(food => (
                      <span
                        key={food}
                        className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                      >
                        {food}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500">No favorite foods set</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nutrition Targets */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Nutrition Targets</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="calories" className="block text-sm font-medium text-gray-700">
                Calories
              </label>
              <input
                type="number"
                id="calories"
                value={formData.nutrition_targets.calories || ''}
                onChange={(e) => handleNutritionChange('calories', e.target.value)}
                disabled={!isEditing}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="2000"
              />
            </div>
            <div>
              <label htmlFor="protein" className="block text-sm font-medium text-gray-700">
                Protein (g)
              </label>
              <input
                type="number"
                id="protein"
                value={formData.nutrition_targets.protein || ''}
                onChange={(e) => handleNutritionChange('protein', e.target.value)}
                disabled={!isEditing}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="150"
              />
            </div>
            <div>
              <label htmlFor="carbs" className="block text-sm font-medium text-gray-700">
                Carbs (g)
              </label>
              <input
                type="number"
                id="carbs"
                value={formData.nutrition_targets.carbs || ''}
                onChange={(e) => handleNutritionChange('carbs', e.target.value)}
                disabled={!isEditing}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="200"
              />
            </div>
            <div>
              <label htmlFor="fat" className="block text-sm font-medium text-gray-700">
                Fat (g)
              </label>
              <input
                type="number"
                id="fat"
                value={formData.nutrition_targets.fat || ''}
                onChange={(e) => handleNutritionChange('fat', e.target.value)}
                disabled={!isEditing}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="65"
              />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Security</h3>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Password</h4>
              <p className="text-sm text-gray-500">Change your account password</p>
            </div>
            <Button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Change Password
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              onClick={handleCancel}
              variant="outline"
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        )}
      </form>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
              <button
                onClick={closePasswordModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="current_password" className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <div className="relative mt-1">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    id="current_password"
                    name="current_password"
                    value={passwordData.current_password}
                    onChange={handlePasswordChange}
                    required
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.current ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <div className="relative mt-1">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    id="new_password"
                    name="new_password"
                    value={passwordData.new_password}
                    onChange={handlePasswordChange}
                    required
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.new ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters long</p>
              </div>

              <div>
                <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <div className="relative mt-1">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    id="confirm_password"
                    name="confirm_password"
                    value={passwordData.confirm_password}
                    onChange={handlePasswordChange}
                    required
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  onClick={closePasswordModal}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={passwordLoading}
                >
                  Change Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 