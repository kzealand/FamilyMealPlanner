export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  profile_image_url?: string
  birthday?: string
  dietary_restrictions?: string[]
  nutrition_targets?: Record<string, any>
  favorite_foods?: string[]
  created_at: string
}

export interface Family {
  id: string
  name: string
  description?: string
  created_at: string
}

export interface FamilyMember {
  id: string
  first_name: string
  last_name: string
  email: string
  profile_image_url?: string
  role: 'admin' | 'member'
  joined_at: string
}

export interface Recipe {
  id: string
  name: string
  description?: string
  image_url?: string
  prep_time_minutes?: number
  cook_time_minutes?: number
  servings?: number
  cooking_instructions?: string
  star_rating?: number
  dietary_tags?: string[]
  created_by_first_name?: string
  created_by_last_name?: string
  created_at: string
  updated_at: string
  ingredients: RecipeIngredient[]
  is_favorite?: boolean
}

export interface RecipeIngredient {
  id: string
  name: string
  unit?: string
  quantity: number
  recipe_unit?: string
  notes?: string
}

export interface MealPlan {
  id: string
  user_id: string
  week_start_date: string
  created_at: string
  updated_at: string
  first_name: string
  last_name: string
  meals: Record<number, Record<string, MealPlanItem>>
}

export interface MealPlanItem {
  id: string
  meal_slot_name: string
  recipe_id?: string
  recipe_name?: string
  recipe_image?: string
  custom_meal_name?: string
  notes?: string
}

export interface ShoppingList {
  id: string
  family_id: string
  week_start_date: string
  generated_at: string
  items: ShoppingListItem[]
  summary: {
    total_items: number
    checked_items: number
    unchecked_items: number
  }
}

export interface ShoppingListItem {
  id: string
  ingredient_id: string
  ingredient_name: string
  ingredient_unit?: string
  total_quantity: number
  unit?: string
  is_checked: boolean
  notes?: string
}

export interface ApiResponse<T> {
  message?: string
  data?: T
  error?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  first_name: string
  last_name: string
  birthday?: string
  dietary_restrictions?: string[]
  nutrition_targets?: Record<string, any>
  favorite_foods?: string[]
}

export interface CreateRecipeRequest {
  name: string
  description?: string
  image_url?: string
  prep_time_minutes?: number
  cook_time_minutes?: number
  servings?: number
  cooking_instructions?: string
  star_rating?: number
  dietary_tags?: string[]
  ingredients: {
    name: string
    quantity: number
    unit?: string
    notes?: string
  }[]
}

export interface CreateMealPlanRequest {
  week_start_date: string
  meals: {
    day_of_week: number
    meal_slot_name: string
    recipe_id?: string
    custom_meal_name?: string
    notes?: string
  }[]
}

export interface GenerateShoppingListRequest {
  week_start_date: string
} 