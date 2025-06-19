import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { recipeAPI, familyAPI } from '@/services/api'
import { Recipe, Family } from '@/types'
import { Search, Plus, Star, Clock, Users, Heart, Edit, Trash2, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { ChangeEvent, FormEvent } from 'react'

export default function Recipes() {
  const { user } = useAuth()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [currentFamily, setCurrentFamily] = useState<Family | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dietaryFilter, setDietaryFilter] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    image_url: '',
    prep_time_minutes: '',
    cook_time_minutes: '',
    servings: '',
    dietary_tags: [] as string[],
    cooking_instructions: '',
    ingredients: [
      { name: '', quantity: '', unit: '', notes: '' }
    ],
    star_rating: undefined as number | undefined
  })
  const [createLoading, setCreateLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<any>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null)

  // Load families and recipes on component mount
  useEffect(() => {
    loadFamilies()
  }, [])

  useEffect(() => {
    if (currentFamily) {
      loadRecipes()
    }
  }, [currentFamily])

  const loadFamilies = async () => {
    try {
      const familiesData = await familyAPI.getAll()
      setFamilies(familiesData)
      
      // Set the first family as current, or show message if no families
      if (familiesData.length > 0) {
        setCurrentFamily(familiesData[0])
      } else {
        setLoading(false)
        toast.error('No family found. Please create or join a family first.')
      }
    } catch (error) {
      console.error('Error loading families:', error)
      toast.error('Failed to load families')
      setLoading(false)
    }
  }

  const loadRecipes = async () => {
    if (!currentFamily) return
    
    try {
      setLoading(true)
      const params: any = {}
      
      if (searchTerm) params.search = searchTerm
      if (dietaryFilter) params.dietary_tags = dietaryFilter
      if (favoritesOnly) params.favorite_only = true

      const recipesData = await recipeAPI.getAll(currentFamily.id, params)
      setRecipes(recipesData)
    } catch (error) {
      console.error('Error loading recipes:', error)
      toast.error('Failed to load recipes')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    loadRecipes()
  }

  const handleToggleFavorite = async (recipeId: string) => {
    if (!currentFamily) return
    
    try {
      await recipeAPI.toggleFavorite(currentFamily.id, recipeId)
      // Reload recipes to get updated favorite status
      loadRecipes()
      toast.success('Recipe updated')
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('Failed to update recipe')
    }
  }

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!currentFamily) return
    
    if (!confirm('Are you sure you want to delete this recipe?')) return
    
    try {
      await recipeAPI.delete(currentFamily.id, recipeId)
      setRecipes(recipes.filter(recipe => recipe.id !== recipeId))
      toast.success('Recipe deleted')
    } catch (error) {
      console.error('Error deleting recipe:', error)
      toast.error('Failed to delete recipe')
    }
  }

  const getTotalTime = (recipe: Recipe) => {
    const prep = recipe.prep_time_minutes || 0
    const cook = recipe.cook_time_minutes || 0
    return prep + cook
  }

  const dietaryTags = [
    'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 
    'low-carb', 'keto', 'paleo', 'mediterranean'
  ]

  // Handle form field changes
  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (name === 'dietary_tags') {
      const options = (e.target as HTMLSelectElement).options
      const selected: string[] = []
      for (let i = 0; i < options.length; i++) {
        if (options[i].selected) selected.push(options[i].value)
      }
      setCreateForm(f => ({ ...f, dietary_tags: selected }))
    } else if (type === 'number') {
      setCreateForm(f => ({ ...f, [name]: value.replace(/[^0-9]/g, '') }))
    } else {
      setCreateForm(f => ({ ...f, [name]: value }))
    }
  }

  // Handle ingredient changes
  const handleIngredientChange = (idx: number, field: string, value: string) => {
    setCreateForm(f => ({
      ...f,
      ingredients: f.ingredients.map((ing, i) => i === idx ? { ...ing, [field]: value } : ing)
    }))
  }

  // Add/remove ingredient rows
  const addIngredient = () => {
    setCreateForm(f => ({ ...f, ingredients: [...f.ingredients, { name: '', quantity: '', unit: '', notes: '' }] }))
  }
  const removeIngredient = (idx: number) => {
    setCreateForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }))
  }

  // Handle form submit
  const handleCreateRecipe = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!currentFamily) return

    // Validate required fields
    if (!createForm.name.trim()) {
      setFormError('Recipe name is required')
      return
    }
    if (createForm.ingredients.length === 0 || !createForm.ingredients[0].name.trim()) {
      setFormError('At least one ingredient is required')
      return
    }
    // Validate all ingredients
    for (const ing of createForm.ingredients) {
      if (!ing.name.trim()) {
        setFormError('All ingredients must have a name')
        return
      }
      if (!ing.quantity || isNaN(Number(ing.quantity)) || Number(ing.quantity) <= 0) {
        setFormError('All ingredients must have a positive quantity')
        return
      }
    }
    // Validate image_url length
    if (createForm.image_url && createForm.image_url.length > 500) {
      setFormError('Image URL must be 500 characters or less')
      return
    }

    setCreateLoading(true)
    try {
      const recipeData = {
        name: createForm.name,
        description: createForm.description,
        image_url: typeof createForm.image_url === 'string' ? createForm.image_url : '',
        prep_time_minutes: createForm.prep_time_minutes ? parseInt(createForm.prep_time_minutes) : undefined,
        cook_time_minutes: createForm.cook_time_minutes ? parseInt(createForm.cook_time_minutes) : undefined,
        servings: createForm.servings ? parseInt(createForm.servings) : undefined,
        dietary_tags: createForm.dietary_tags,
        cooking_instructions: createForm.cooking_instructions,
        ingredients: createForm.ingredients
          .filter(ing => ing.name.trim())
          .map(ing => ({
            name: ing.name,
            quantity: ing.quantity ? parseFloat(ing.quantity) : 0,
            unit: ing.unit,
            notes: ing.notes
          })),
        star_rating: createForm.star_rating
      }
      
      console.log('Creating recipe with data:', recipeData)
      console.log('Family ID:', currentFamily.id)
      
      await recipeAPI.create(currentFamily.id, recipeData)
      setShowCreateModal(false)
      setCreateForm({
        name: '', description: '', image_url: '', prep_time_minutes: '', cook_time_minutes: '', servings: '', dietary_tags: [], cooking_instructions: '', ingredients: [{ name: '', quantity: '', unit: '', notes: '' }], star_rating: undefined
      })
      toast.success('Recipe created!')
      loadRecipes()
    } catch (error: any) {
      console.error('Recipe creation error:', error)
      console.error('Error response:', error.response?.data)
      toast.error('Failed to create recipe')
    } finally {
      setCreateLoading(false)
    }
  }

  // Open edit modal with recipe data
  const handleEditRecipe = (recipe: Recipe) => {
    setEditForm({
      ...recipe,
      prep_time_minutes: recipe.prep_time_minutes?.toString() || '',
      cook_time_minutes: recipe.cook_time_minutes?.toString() || '',
      servings: recipe.servings?.toString() || '',
      dietary_tags: recipe.dietary_tags || [],
      ingredients: (recipe.ingredients || []).map(ing => ({
        name: ing.name,
        quantity: ing.quantity?.toString() || '',
        unit: ing.unit || '',
        notes: ing.notes || ''
      })),
      star_rating: recipe.star_rating
    })
    setEditError('')
    setShowEditModal(true)
  }

  // Handle edit form field changes
  const handleEditFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (!editForm) return
    if (name === 'dietary_tags') {
      const options = (e.target as HTMLSelectElement).options
      const selected: string[] = []
      for (let i = 0; i < options.length; i++) {
        if (options[i].selected) selected.push(options[i].value)
      }
      setEditForm((f: any) => ({ ...f, dietary_tags: selected }))
    } else if (type === 'number') {
      setEditForm((f: any) => ({ ...f, [name]: value.replace(/[^0-9]/g, '') }))
    } else {
      setEditForm((f: any) => ({ ...f, [name]: value }))
    }
  }

  // Handle edit ingredient changes
  const handleEditIngredientChange = (idx: number, field: string, value: string) => {
    setEditForm((f: any) => ({
      ...f,
      ingredients: f.ingredients.map((ing: any, i: number) => i === idx ? { ...ing, [field]: value } : ing)
    }))
  }
  const addEditIngredient = () => {
    setEditForm((f: any) => ({ ...f, ingredients: [...f.ingredients, { name: '', quantity: '', unit: '', notes: '' }] }))
  }
  const removeEditIngredient = (idx: number) => {
    setEditForm((f: any) => ({ ...f, ingredients: f.ingredients.filter((_: any, i: number) => i !== idx) }))
  }

  // Handle edit form submit
  const handleUpdateRecipe = async (e: FormEvent) => {
    e.preventDefault()
    setEditError('')
    if (!currentFamily || !editForm) return
    // Validate required fields
    if (!editForm.name.trim()) {
      setEditError('Recipe name is required')
      return
    }
    if (editForm.ingredients.length === 0 || !editForm.ingredients[0].name.trim()) {
      setEditError('At least one ingredient is required')
      return
    }
    for (const ing of editForm.ingredients) {
      if (!ing.name.trim()) {
        setEditError('All ingredients must have a name')
        return
      }
      if (!ing.quantity || isNaN(Number(ing.quantity)) || Number(ing.quantity) <= 0) {
        setEditError('All ingredients must have a positive quantity')
        return
      }
    }
    if (editForm.image_url && editForm.image_url.length > 500) {
      setEditError('Image URL must be 500 characters or less')
      return
    }
    setEditLoading(true)
    try {
      // Send allowed fields including ingredients
      const recipeData = {
        name: editForm.name,
        description: editForm.description,
        image_url: typeof editForm.image_url === 'string' ? editForm.image_url : '',
        prep_time_minutes: editForm.prep_time_minutes ? parseInt(editForm.prep_time_minutes) : undefined,
        cook_time_minutes: editForm.cook_time_minutes ? parseInt(editForm.cook_time_minutes) : undefined,
        servings: editForm.servings ? parseInt(editForm.servings) : undefined,
        dietary_tags: editForm.dietary_tags,
        cooking_instructions: editForm.cooking_instructions,
        ingredients: editForm.ingredients
          .filter((ing: any) => ing.name.trim())
          .map((ing: any) => ({
            name: ing.name,
            quantity: ing.quantity ? parseFloat(ing.quantity) : 0,
            unit: ing.unit,
            notes: ing.notes
          })),
        star_rating: editForm.star_rating
      }
      await recipeAPI.update(currentFamily.id, editForm.id, recipeData)
      // Fetch the updated recipe and update recipes state
      const updatedRecipe = await recipeAPI.getById(currentFamily.id, editForm.id)
      setRecipes(prev => prev.map(r => r.id === updatedRecipe.id ? updatedRecipe : r))
      setShowEditModal(false)
      setEditForm(null)
      toast.success('Recipe updated!')
      loadRecipes()
    } catch (error: any) {
      console.error('Recipe update error:', error)
      toast.error('Failed to update recipe')
    } finally {
      setEditLoading(false)
    }
  }

  const handleViewRecipe = (recipe: Recipe) => {
    setViewRecipe(recipe)
    setShowViewModal(true)
  }

  // Show message if no family is available
  if (families.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recipes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your family's recipe collection
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <div className="text-gray-400 mb-4">
            <Users className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Family Found</h3>
          <p className="text-gray-500 mb-6">
            You need to create or join a family to manage recipes.
          </p>
          <button
            onClick={() => window.location.href = '/family'}
            className="btn btn-primary"
          >
            Go to Family Page
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recipes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your family's recipe collection
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recipes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your family's recipe collection ({recipes.length} recipes)
          </p>
          {currentFamily && (
            <p className="mt-1 text-sm text-primary-600">
              Family: {currentFamily.name}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Recipe
        </button>
      </div>

      {/* Family Selector */}
      {families.length > 1 && (
        <div className="bg-white shadow rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Family
          </label>
          <select
            value={currentFamily?.id || ''}
            onChange={(e) => {
              const family = families.find(f => f.id === e.target.value)
              setCurrentFamily(family || null)
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
      )}

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="input pl-10 w-full"
              />
            </div>
          </div>

          {/* Dietary Filter */}
          <div>
            <select
              value={dietaryFilter}
              onChange={(e) => setDietaryFilter(e.target.value)}
              className="input w-full"
            >
              <option value="">All Dietary Tags</option>
              {dietaryTags.map(tag => (
                <option key={tag} value={tag}>
                  {tag.charAt(0).toUpperCase() + tag.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Favorites Toggle */}
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={favoritesOnly}
                onChange={(e) => setFavoritesOnly(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Favorites only</span>
            </label>
          </div>
        </div>

        {/* Apply Filters Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSearch}
            className="btn btn-secondary"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Recipes Grid */}
      {recipes.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <div className="text-gray-400 mb-4">
            <Search className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No recipes found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || dietaryFilter || favoritesOnly 
              ? 'Try adjusting your search criteria'
              : 'Get started by adding your first recipe'
            }
          </p>
          {!searchTerm && !dietaryFilter && !favoritesOnly && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Recipe
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDeleteRecipe}
              onEdit={handleEditRecipe}
              onView={handleViewRecipe}
            />
          ))}
        </div>
      )}

      {/* Create Recipe Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold mb-4">Add New Recipe</h2>
            <form onSubmit={handleCreateRecipe} className="space-y-4">
              {formError && <div className="text-red-600 text-sm mb-2">{formError}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input name="name" value={createForm.name} onChange={handleFormChange} className="input w-full" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input name="description" value={createForm.description} onChange={handleFormChange} className="input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Image URL</label>
                  <input name="image_url" value={createForm.image_url} onChange={handleFormChange} className="input w-full" maxLength={500} placeholder="https://example.com/image.jpg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Servings</label>
                  <input name="servings" type="number" min="1" value={createForm.servings} onChange={handleFormChange} className="input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prep Time (min)</label>
                  <input name="prep_time_minutes" type="number" min="0" value={createForm.prep_time_minutes} onChange={handleFormChange} className="input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cook Time (min)</label>
                  <input name="cook_time_minutes" type="number" min="0" value={createForm.cook_time_minutes} onChange={handleFormChange} className="input w-full" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Dietary Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {dietaryTags.map(tag => {
                      const selected = createForm.dietary_tags.includes(tag)
                      return (
                        <button
                          type="button"
                          key={tag}
                          className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors focus:outline-none ${selected ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-primary-100 hover:text-primary-800'}`}
                          onClick={() => {
                            setCreateForm(f => ({
                              ...f,
                              dietary_tags: selected
                                ? f.dietary_tags.filter(t => t !== tag)
                                : [...f.dietary_tags, tag]
                            }))
                          }}
                        >
                          {tag.charAt(0).toUpperCase() + tag.slice(1)}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Cooking Instructions</label>
                  <textarea name="cooking_instructions" value={createForm.cooking_instructions} onChange={handleFormChange} className="input w-full min-h-[60px]" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Star Rating</label>
                  <div className="flex items-center gap-1">
                    {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((val, i) => (
                      <button
                        type="button"
                        key={val}
                        aria-label={`Set rating to ${val}`}
                        className="focus:outline-none"
                        onClick={() => setCreateForm(f => ({ ...f, star_rating: f.star_rating === val ? undefined : val }))}
                      >
                        <Star
                          className={`w-6 h-6 ${createForm.star_rating && createForm.star_rating >= val ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} ${val % 1 !== 0 ? 'relative -ml-3' : ''}`}
                          style={val % 1 !== 0 ? { clipPath: 'inset(0 50% 0 0)' } : {}}
                          fill={createForm.star_rating && createForm.star_rating >= val ? 'currentColor' : 'none'}
                        />
                      </button>
                    ))}
                    {createForm.star_rating && (
                      <button type="button" className="ml-2 text-xs text-gray-500 underline" onClick={() => setCreateForm(f => ({ ...f, star_rating: undefined }))}>Clear</button>
                    )}
                  </div>
                </div>
              </div>
              {/* Ingredients */}
              <div>
                <label className="block text-sm font-medium mb-1">Ingredients *</label>
                <div className="space-y-2">
                  {createForm.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        placeholder="Name"
                        value={ing.name}
                        onChange={e => handleIngredientChange(idx, 'name', e.target.value)}
                        className="input flex-1"
                        required={idx === 0}
                      />
                      <input
                        placeholder="Qty"
                        type="number"
                        min="0"
                        step="any"
                        value={ing.quantity}
                        onChange={e => handleIngredientChange(idx, 'quantity', e.target.value)}
                        className="input w-20"
                      />
                      <input
                        placeholder="Unit"
                        value={ing.unit}
                        onChange={e => handleIngredientChange(idx, 'unit', e.target.value)}
                        className="input w-20"
                      />
                      <input
                        placeholder="Notes"
                        value={ing.notes}
                        onChange={e => handleIngredientChange(idx, 'notes', e.target.value)}
                        className="input w-32"
                      />
                      {createForm.ingredients.length > 1 && (
                        <button type="button" onClick={() => removeIngredient(idx)} className="btn btn-outline text-red-600">Remove</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addIngredient} className="btn btn-secondary mt-2">Add Ingredient</button>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setFormError('')
                    setCreateForm({
                      name: '', description: '', image_url: '', prep_time_minutes: '', cook_time_minutes: '', servings: '', dietary_tags: [], cooking_instructions: '', ingredients: [{ name: '', quantity: '', unit: '', notes: '' }], star_rating: undefined
                    })
                  }}
                  className="btn btn-secondary"
                  disabled={createLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createLoading}
                >
                  {createLoading ? 'Creating...' : 'Create Recipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Recipe Modal */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold mb-4">Edit Recipe</h2>
            <form onSubmit={handleUpdateRecipe} className="space-y-4">
              {editError && <div className="text-red-600 text-sm mb-2">{editError}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input name="name" value={editForm.name} onChange={handleEditFormChange} className="input w-full" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input name="description" value={editForm.description} onChange={handleEditFormChange} className="input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Image URL</label>
                  <input name="image_url" value={editForm.image_url} onChange={handleEditFormChange} className="input w-full" maxLength={500} placeholder="https://example.com/image.jpg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Servings</label>
                  <input name="servings" type="number" min="1" value={editForm.servings} onChange={handleEditFormChange} className="input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prep Time (min)</label>
                  <input name="prep_time_minutes" type="number" min="0" value={editForm.prep_time_minutes} onChange={handleEditFormChange} className="input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cook Time (min)</label>
                  <input name="cook_time_minutes" type="number" min="0" value={editForm.cook_time_minutes} onChange={handleEditFormChange} className="input w-full" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Dietary Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {dietaryTags.map(tag => {
                      const selected = editForm.dietary_tags.includes(tag)
                      return (
                        <button
                          type="button"
                          key={tag}
                          className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors focus:outline-none ${selected ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-primary-100 hover:text-primary-800'}`}
                          onClick={() => {
                            setEditForm((f: any) => ({
                              ...f,
                              dietary_tags: selected
                                ? f.dietary_tags.filter((t: string) => t !== tag)
                                : [...f.dietary_tags, tag]
                            }))
                          }}
                        >
                          {tag.charAt(0).toUpperCase() + tag.slice(1)}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Cooking Instructions</label>
                  <textarea name="cooking_instructions" value={editForm.cooking_instructions} onChange={handleEditFormChange} className="input w-full min-h-[60px]" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Star Rating</label>
                  <div className="flex items-center gap-1">
                    {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((val, i) => (
                      <button
                        type="button"
                        key={val}
                        aria-label={`Set rating to ${val}`}
                        className="focus:outline-none"
                        onClick={() => setEditForm((f: any) => ({ ...f, star_rating: f.star_rating === val ? undefined : val }))}
                      >
                        <Star
                          className={`w-6 h-6 ${editForm.star_rating && editForm.star_rating >= val ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} ${val % 1 !== 0 ? 'relative -ml-3' : ''}`}
                          style={val % 1 !== 0 ? { clipPath: 'inset(0 50% 0 0)' } : {}}
                          fill={editForm.star_rating && editForm.star_rating >= val ? 'currentColor' : 'none'}
                        />
                      </button>
                    ))}
                    {editForm.star_rating && (
                      <button type="button" className="ml-2 text-xs text-gray-500 underline" onClick={() => setEditForm((f: any) => ({ ...f, star_rating: undefined }))}>Clear</button>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ingredients</label>
                {editForm.ingredients.map((ing: any, idx: number) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input placeholder="Name" value={ing.name} onChange={e => handleEditIngredientChange(idx, 'name', e.target.value)} className="input flex-1" />
                    <input
                      placeholder="Qty"
                      type="number"
                      min="0"
                      step="any"
                      value={ing.quantity}
                      onChange={e => handleEditIngredientChange(idx, 'quantity', e.target.value)}
                      className="input w-20"
                    />
                    <input placeholder="Unit" value={ing.unit} onChange={e => handleEditIngredientChange(idx, 'unit', e.target.value)} className="input w-20" />
                    <input
                      placeholder="Notes"
                      value={ing.notes}
                      onChange={e => handleEditIngredientChange(idx, 'notes', e.target.value)}
                      className="input w-32"
                    />
                    <button type="button" onClick={() => removeEditIngredient(idx)} className="btn btn-xs btn-error">Remove</button>
                  </div>
                ))}
                <button type="button" onClick={addEditIngredient} className="btn btn-xs btn-secondary mt-2">Add Ingredient</button>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setShowEditModal(false); setEditForm(null); }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && viewRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold mb-4">{viewRecipe.name}</h2>
            {viewRecipe.image_url && (
              <img src={viewRecipe.image_url} alt={viewRecipe.name} className="w-full h-64 object-cover rounded mb-4" />
            )}
            <div className="mb-2 text-gray-700">{viewRecipe.description}</div>
            <div className="mb-2"><strong>Servings:</strong> {viewRecipe.servings}</div>
            <div className="mb-2"><strong>Prep Time:</strong> {viewRecipe.prep_time_minutes} min</div>
            <div className="mb-2"><strong>Cook Time:</strong> {viewRecipe.cook_time_minutes} min</div>
            <div className="mb-2"><strong>Dietary Tags:</strong> {viewRecipe.dietary_tags?.join(', ')}</div>
            <div className="mb-2"><strong>Ingredients:</strong>
              <ul className="list-disc ml-6">
                {viewRecipe.ingredients.map((ing, idx) => (
                  <li key={idx}>{ing.quantity} {ing.unit} {ing.name} {ing.notes && `(${ing.notes})`}</li>
                ))}
              </ul>
            </div>
            <div className="mb-2"><strong>Instructions:</strong>
              <div className="whitespace-pre-line mt-1">{viewRecipe.cooking_instructions}</div>
            </div>
            {typeof viewRecipe.star_rating === 'number' && (() => {
              const rating = viewRecipe.star_rating as number;
              return (
                <div className="mb-2 flex items-center">
                  <span className="mr-2 font-semibold">Rating:</span>
                  {[1, 2, 3, 4, 5].map((val) => (
                    <Star
                      key={val}
                      className={`w-5 h-5 ${rating >= val ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                      fill={rating >= val ? 'currentColor' : 'none'}
                    />
                  ))}
                  {rating % 1 !== 0 && (
                    <Star
                      className="w-5 h-5 fill-yellow-400 text-yellow-400 relative -ml-3"
                      style={{ clipPath: 'inset(0 50% 0 0)' }}
                      fill="currentColor"
                    />
                  )}
                  <span className="ml-2 text-sm text-gray-600">{rating} / 5</span>
                </div>
              );
            })()}
            <div className="flex justify-end mt-4">
              <button onClick={() => { setShowViewModal(false); setViewRecipe(null); }} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Recipe Card Component
interface RecipeCardProps {
  recipe: Recipe
  onToggleFavorite: (recipeId: string) => void
  onDelete: (recipeId: string) => void
  onEdit: (recipe: Recipe) => void
  onView: (recipe: Recipe) => void
}

function RecipeCard({ recipe, onToggleFavorite, onDelete, onEdit, onView }: RecipeCardProps) {
  const getTotalTime = (recipe: Recipe) => {
    const prep = recipe.prep_time_minutes || 0
    const cook = recipe.cook_time_minutes || 0
    return prep + cook
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Recipe Image */}
      <div className="h-48 bg-gray-200 relative">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">🍽️</div>
              <div className="text-sm">No image</div>
            </div>
          </div>
        )}
        
        {/* Favorite Button */}
        <button
          onClick={() => onToggleFavorite(recipe.id)}
          className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${
            recipe.is_favorite 
              ? 'bg-red-500 text-white' 
              : 'bg-white text-gray-400 hover:text-red-500'
          }`}
        >
          <Heart className={`w-4 h-4 ${recipe.is_favorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Recipe Content */}
      <div className="p-4">
        {/* Recipe Name and Rating */}
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-900 line-clamp-2">{recipe.name}</h3>
          {recipe.star_rating && (
            <div className="flex items-center text-yellow-400">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm text-gray-600 ml-1">{recipe.star_rating}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {recipe.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {recipe.description}
          </p>
        )}

        {/* Recipe Stats */}
        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
          {getTotalTime(recipe) > 0 && (
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {getTotalTime(recipe)} min
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {recipe.servings} servings
            </div>
          )}
        </div>

        {/* Dietary Tags */}
        {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {recipe.dietary_tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded-full"
              >
                {tag}
              </span>
            ))}
            {recipe.dietary_tags.length > 3 && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                +{recipe.dietary_tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <div className="flex space-x-2">
            <button
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="View Recipe"
              onClick={() => onView(recipe)}
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Edit Recipe"
              onClick={() => onEdit(recipe)}
            >
              <Edit className="w-4 h-4 text-blue-500 cursor-pointer ml-2" />
            </button>
          </div>
          <button
            onClick={() => onDelete(recipe.id)}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete Recipe"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
} 