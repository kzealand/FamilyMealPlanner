import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { shoppingListAPI, familyAPI } from '@/services/api'
import type { ShoppingList } from '@/types'
import { Family } from '@/types'
import { 
  ShoppingCart, 
  Plus, 
  Calendar, 
  CheckCircle, 
  Circle, 
  Trash2, 
  RefreshCw,
  Edit3,
  Save,
  X,
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ShoppingListWithMeta extends ShoppingList {
  item_count?: number
  checked_count?: number
}

export default function ShoppingListPage() {
  const { user } = useAuth()
  const [families, setFamilies] = useState<Family[]>([])
  const [currentFamily, setCurrentFamily] = useState<Family | null>(null)
  const [shoppingLists, setShoppingLists] = useState<ShoppingListWithMeta[]>([])
  const [currentList, setCurrentList] = useState<ShoppingList | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState('')
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesText, setNotesText] = useState('')

  // Get current week start date (Sunday)
  const getCurrentWeekStart = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diff = now.getDate() - dayOfWeek
    const sunday = new Date(now.setDate(diff))
    return sunday.toISOString().split('T')[0]
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Initialize selectedWeek with the test week (June 29, 2025)
        setSelectedWeek('2025-06-29')
        
        // Fetch user's families
        const familiesData = await familyAPI.getAll()
        console.log('Families data received:', familiesData)
        
        // The API returns families where the user is already a member, so we can use all of them
        // Add defensive check to ensure familiesData is an array
        const validFamilies = Array.isArray(familiesData) ? familiesData : []
        setFamilies(validFamilies)
        
        if (validFamilies.length > 0) {
          setCurrentFamily(validFamilies[0])
          await fetchShoppingLists(validFamilies[0].id)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load shopping list data')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchData()
    }
  }, [user])

  const fetchShoppingLists = async (familyId: string) => {
    try {
      const lists = await shoppingListAPI.getAll(familyId)
      setShoppingLists(lists)
    } catch (error) {
      console.error('Error fetching shopping lists:', error)
      toast.error('Failed to load shopping lists')
    }
  }

  const generateShoppingList = async () => {
    if (!currentFamily || !selectedWeek) {
      toast.error('Please select a family and week')
      return
    }

    try {
      setGenerating(true)
      const newList = await shoppingListAPI.generate(currentFamily.id, {
        week_start_date: selectedWeek
      })
      
      setCurrentList(newList)
      await fetchShoppingLists(currentFamily.id)
      toast.success('Shopping list generated successfully!')
    } catch (error: any) {
      console.error('Error generating shopping list:', error)
      if (error.response?.status === 409) {
        toast.error('Shopping list already exists for this week')
      } else if (error.response?.status === 400) {
        toast.error('No meal plans found for this week. Please create meal plans first.')
      } else {
        toast.error('Failed to generate shopping list')
      }
    } finally {
      setGenerating(false)
    }
  }

  const loadShoppingList = async (weekStartDate: string) => {
    if (!currentFamily) return

    try {
      const list = await shoppingListAPI.getByWeek(currentFamily.id, weekStartDate)
      setCurrentList(list)
      setSelectedWeek(weekStartDate)
    } catch (error) {
      console.error('Error loading shopping list:', error)
      toast.error('Failed to load shopping list')
    }
  }

  const updateItem = async (itemId: string, updates: { is_checked?: boolean; notes?: string }) => {
    if (!currentFamily || !currentList) return

    try {
      // Find the current item to get existing values
      const currentItem = currentList.items.find(item => item.id === itemId)
      if (!currentItem) return
      
      // Prepare API updates with existing values as fallbacks
      const apiUpdates: { is_checked: boolean; notes?: string } = {
        is_checked: updates.is_checked !== undefined ? updates.is_checked : currentItem.is_checked
      }
      
      if (updates.notes !== undefined) {
        apiUpdates.notes = updates.notes
      }
      
      await shoppingListAPI.updateItem(currentFamily.id, itemId, apiUpdates)
      
      // Update local state
      setCurrentList(prev => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map(item => 
            item.id === itemId 
              ? { ...item, ...updates }
              : item
          )
        }
      })
      
      // Update summary
      if (updates.is_checked !== undefined) {
        setCurrentList(prev => {
          if (!prev) return prev
          const checkedCount = prev.items.filter(item => item.is_checked).length
          return {
            ...prev,
            summary: {
              ...prev.summary,
              checked_items: checkedCount,
              unchecked_items: prev.items.length - checkedCount
            }
          }
        })
      }
    } catch (error) {
      console.error('Error updating item:', error)
      toast.error('Failed to update item')
    }
  }

  const deleteShoppingList = async (weekStartDate: string) => {
    if (!currentFamily) return

    if (!confirm('Are you sure you want to delete this shopping list?')) {
      return
    }

    try {
      await shoppingListAPI.delete(currentFamily.id, weekStartDate)
      await fetchShoppingLists(currentFamily.id)
      
      if (currentList?.week_start_date === weekStartDate) {
        setCurrentList(null)
        setSelectedWeek('')
      }
      
      toast.success('Shopping list deleted successfully')
    } catch (error) {
      console.error('Error deleting shopping list:', error)
      toast.error('Failed to delete shopping list')
    }
  }

  const startEditingNotes = (item: any) => {
    setEditingNotes(item.id)
    setNotesText(item.notes || '')
  }

  const saveNotes = async () => {
    if (!editingNotes) return
    
    await updateItem(editingNotes, { notes: notesText })
    setEditingNotes(null)
    setNotesText('')
  }

  const cancelEditingNotes = () => {
    setEditingNotes(null)
    setNotesText('')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getWeekRange = (weekStartDate: string) => {
    const start = new Date(weekStartDate)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    
    return `${formatDate(weekStartDate)} - ${formatDate(end.toISOString().split('T')[0])}`
  }

  const parseRecipeInfo = (notes: string) => {
    if (!notes || !notes.includes('From recipes:')) {
      return { recipes: null, additionalNotes: notes }
    }
    
    const parts = notes.split('|')
    const recipePart = parts[0]
    const additionalNotes = parts[1]?.trim() || null
    
    const recipes = recipePart.split('From recipes:')[1]?.trim() || null
    
    return { recipes, additionalNotes }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shopping List</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your shopping lists
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (families.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shopping List</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your shopping lists
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No families found</h3>
            <p className="mt-1 text-sm text-gray-500">
              You need to be part of a family to use shopping lists.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shopping List</h1>
        <p className="mt-1 text-sm text-gray-500">
          Generate and manage shopping lists from your meal plans
        </p>
      </div>

      {/* Family Selector */}
      <div className="bg-white shadow rounded-lg p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Family
        </label>
        <select
          value={currentFamily?.id || ''}
          onChange={(e) => {
            const family = families.find(f => f.id === e.target.value)
            setCurrentFamily(family || null)
            setCurrentList(null)
            setSelectedWeek('')
            if (family) {
              fetchShoppingLists(family.id)
            }
          }}
          className="input w-full max-w-xs"
        >
          {families.map(family => (
            <option key={family.id} value={family.id}>
              {family.name}
            </option>
          ))}
        </select>
      </div>

      {currentFamily && (
        <>
          {/* Generate New Shopping List */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Generate New Shopping List</h2>
            <div className="flex gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Week Starting
                </label>
                <input
                  type="date"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="input"
                  min={getCurrentWeekStart()}
                />
              </div>
              <button
                onClick={generateShoppingList}
                disabled={!selectedWeek || generating}
                className="btn btn-primary flex items-center gap-2"
              >
                {generating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {generating ? 'Generating...' : 'Generate List'}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Generate a shopping list based on your meal plans for the selected week.
            </p>
          </div>

          {/* Available Shopping Lists */}
          {shoppingLists.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Available Shopping Lists</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {shoppingLists.map(list => (
                  <div
                    key={list.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      currentList?.id === list.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => loadShoppingList(list.week_start_date)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {getWeekRange(list.week_start_date)}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteShoppingList(list.week_start_date)
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-sm text-gray-500">
                      {list.item_count || 0} items • {list.checked_count || 0} checked
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Generated {formatDate(list.generated_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Shopping List */}
          {currentList && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    Shopping List: {getWeekRange(currentList.week_start_date)}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {currentList.summary.checked_items} of {currentList.summary.total_items} items checked
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-500">
                    Generated {formatDate(currentList.generated_at)}
                  </div>
                </div>
              </div>

              {currentList.items.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="text-gray-500 mt-2">No items in this shopping list</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentList.items.map(item => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        item.is_checked ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'
                      }`}
                    >
                      <button
                        onClick={() => updateItem(item.id, { is_checked: !item.is_checked })}
                        className="flex-shrink-0"
                      >
                        {item.is_checked ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${item.is_checked ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {item.ingredient_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.total_quantity} {item.unit || item.ingredient_unit}
                        </div>
                        {item.notes && (
                          <div className="text-sm text-gray-600 mt-1">
                            {/* Extract and display recipe information */}
                            {(() => {
                              const { recipes, additionalNotes } = parseRecipeInfo(item.notes)
                              return (
                                <div>
                                  {recipes && (
                                    <div className="mb-1">
                                      <div className="font-medium text-blue-600 text-xs">
                                        📋 From recipes:
                                      </div>
                                      <div className="text-sm text-gray-700">
                                        {recipes.split(', ').map((recipe, index) => (
                                          <span key={index} className="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs mr-1 mb-1">
                                            {recipe}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {additionalNotes && (
                                    <div className="text-xs text-gray-500">
                                      {additionalNotes}
                                    </div>
                                  )}
                                </div>
                              )
                            })()}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {editingNotes === item.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={notesText}
                              onChange={(e) => setNotesText(e.target.value)}
                              className="input text-sm w-32"
                              placeholder="Add notes..."
                              onKeyPress={(e) => e.key === 'Enter' && saveNotes()}
                            />
                            <button
                              onClick={saveNotes}
                              className="text-green-600 hover:text-green-800"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={cancelEditingNotes}
                              className="text-gray-600 hover:text-gray-800"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditingNotes(item)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* No Shopping Lists Message */}
          {shoppingLists.length === 0 && !currentList && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No shopping lists yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Generate your first shopping list from your meal plans.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
} 