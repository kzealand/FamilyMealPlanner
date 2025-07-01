import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChefHat, Calendar, ShoppingCart, Users } from 'lucide-react'
import { recipeAPI, familyAPI, shoppingListAPI } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'

interface DashboardStats {
  totalRecipes: number
  weeklyMeals: number
  shoppingItems: number
  familyMembers: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRecipes: 0,
    weeklyMeals: 0,
    shoppingItems: 0,
    familyMembers: 0
  })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { user } = useAuth()

  console.log('Dashboard rendering, user:', user, 'loading:', loading)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        console.log('Fetching dashboard data...')
        setLoading(true)
        
        // Fetch user's families first
        const families = await familyAPI.getAll()
        console.log('Families fetched:', families)
        
        // Since families from getAll() don't include members, we need to fetch details for each family
        const userFamilies = []
        let totalFamilyMembers = 0
        
        for (const family of families) {
          try {
            const { family: familyDetails, members } = await familyAPI.getById(family.id)
            console.log(`Family details for ${family.name}:`, { family: familyDetails, members })
            
            // Check if current user is a member of this family
            const isUserMember = members.some((member: any) => member.id === user?.id)
            if (isUserMember) {
              userFamilies.push({ ...family, members })
              totalFamilyMembers += members.length
            }
          } catch (error) {
            console.error(`Error fetching details for family ${family.id}:`, error)
          }
        }
        
        console.log('User families with members:', userFamilies)
        
        // Fetch recipes for all user's families
        let totalRecipes = 0
        let totalShoppingItems = 0
        
        for (const family of userFamilies) {
          try {
            const recipes = await recipeAPI.getAll(family.id)
            console.log(`Recipes for family ${family.id}:`, recipes)
            totalRecipes += recipes.length
            
            // Fetch shopping lists for this family
            try {
              const shoppingLists = await shoppingListAPI.getAll(family.id)
              console.log(`Shopping lists for family ${family.id}:`, shoppingLists)
              
              // Sum up all items from all shopping lists
              for (const list of shoppingLists) {
                totalShoppingItems += list.item_count || 0
              }
            } catch (error) {
              console.error(`Error fetching shopping lists for family ${family.id}:`, error)
            }
          } catch (error) {
            console.error(`Error fetching recipes for family ${family.id}:`, error)
          }
        }

        const familyMembers = totalFamilyMembers

        // For now, use placeholder data for meals
        // TODO: Implement meal plans API to get actual weekly meal count
        const weeklyMeals = 0

        const newStats = {
          totalRecipes,
          weeklyMeals,
          shoppingItems: totalShoppingItems,
          familyMembers
        }
        console.log('Setting stats:', newStats)
        setStats(newStats)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchDashboardData()
    }
  }, [user])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome to your family meal planning dashboard
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {user?.first_name}! Here's what's happening with your meal planning.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChefHat className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Recipes
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalRecipes}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    This Week's Meals
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.weeklyMeals}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingCart className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Shopping Items
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.shoppingItems}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Family Members
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.familyMembers}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Quick Actions
          </h3>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button 
              onClick={() => navigate('/recipes')}
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
            >
              <ChefHat className="h-6 w-6 text-primary-600" />
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Add Recipe</p>
                <p className="text-sm text-gray-500">Create a new recipe</p>
              </div>
            </button>

            <button 
              onClick={() => navigate('/meal-planner')}
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
            >
              <Calendar className="h-6 w-6 text-primary-600" />
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Plan Meals</p>
                <p className="text-sm text-gray-500">Schedule this week's meals</p>
              </div>
            </button>

            <button 
              onClick={() => navigate('/shopping-list')}
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
            >
              <ShoppingCart className="h-6 w-6 text-primary-600" />
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Shopping List</p>
                <p className="text-sm text-gray-500">Generate shopping list</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 