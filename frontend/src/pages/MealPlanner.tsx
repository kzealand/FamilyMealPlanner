import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { recipeAPI, familyAPI, mealPlanAPI } from '@/services/api';
import { Recipe, Family } from '@/types';
import toast from 'react-hot-toast';
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MEALS = ['Breakfast', 'AM Snack', 'Lunch', 'PM Snack', 'Dinner', 'Dessert'];

const MEAL_SLOT_MAP: Record<string, string> = {
  'Breakfast': 'breakfast',
  'AM Snack': 'am_snack',
  'Lunch': 'lunch',
  'PM Snack': 'pm_snack',
  'Dinner': 'dinner',
  'Dessert': 'dessert',
};

const REVERSE_MEAL_SLOT_MAP = Object.fromEntries(
  Object.entries(MEAL_SLOT_MAP).map(([k, v]) => [v, k])
);

const MealPlanner: React.FC = () => {
  const { user } = useAuth();
  const [families, setFamilies] = useState<Family[]>([]);
  const [currentFamily, setCurrentFamily] = useState<Family | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 0 }));

  // plan[day][meal] = recipeId | null
  const [plan, setPlan] = useState<{ [day: string]: { [meal: string]: string | null } }>(() => {
    const initial: { [day: string]: { [meal: string]: string | null } } = {};
    DAYS.forEach(day => {
      initial[day] = {};
      MEALS.forEach(meal => {
        initial[day][meal] = null;
      });
    });
    return initial;
  });

  useEffect(() => {
    loadFamilies();
  }, []);

  useEffect(() => {
    if (families.length > 0) {
      loadRecipes();
    }
  }, [families]);

  useEffect(() => {
    loadMealPlan();
  }, [selectedWeek]);

  const loadFamilies = async () => {
    try {
      const familiesData = await familyAPI.getAll();
      setFamilies(familiesData);
      if (familiesData.length > 0) {
        // Try to restore the previously selected family
        const savedFamilyId = localStorage.getItem('selectedFamilyId');
        const savedFamily = familiesData.find(f => f.id === savedFamilyId);
        const familyToSet = savedFamily || familiesData[0];
        setCurrentFamily(familyToSet);
        localStorage.setItem('selectedFamilyId', familyToSet.id);
      } else {
        setLoading(false);
        toast.error('No family found. Please create or join a family first.');
      }
    } catch (error) {
      console.error('Error loading families:', error);
      toast.error('Failed to load families');
      setLoading(false);
    }
  };

  const loadRecipes = async () => {
    if (!families.length) return;
    setLoading(true);
    try {
      // Load recipes from all families the user has access to
      const allRecipes: Recipe[] = [];
      for (const family of families) {
        try {
          const familyRecipes = await recipeAPI.getAll(family.id);
          allRecipes.push(...familyRecipes);
        } catch (error) {
          console.error(`Error loading recipes for family ${family.name}:`, error);
        }
      }
      setRecipes(allRecipes);
      console.log('Loaded recipes from all families:', allRecipes);
    } catch (error) {
      console.error('Error loading recipes:', error);
      toast.error('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  // Conversion helpers
  const dayIndexToName = (index: number) => DAYS[index] || '';

  function backendToFrontendMeals(mealsArr: any[]): { [day: string]: { [meal: string]: string | null } } {
    console.log('Starting backendToFrontendMeals with:', mealsArr);
    const plan: { [day: string]: { [meal: string]: string | null } } = {};
    DAYS.forEach(day => {
      plan[day] = {};
      MEALS.forEach(meal => {
        plan[day][meal] = null;
      });
    });
    console.log('Initialized empty plan:', plan);
    
    mealsArr.forEach(item => {
      console.log('Processing item:', item);
      console.log('day_of_week:', item.day_of_week);
      console.log('meal_slot_name:', item.meal_slot_name);
      const day = dayIndexToName(item.day_of_week);
      console.log('dayIndexToName result:', day);
      console.log('DAYS array:', DAYS);
      const mealDisplayName = REVERSE_MEAL_SLOT_MAP[item.meal_slot_name] || item.meal_slot_name;
      console.log('mealDisplayName:', mealDisplayName);
      console.log('REVERSE_MEAL_SLOT_MAP:', REVERSE_MEAL_SLOT_MAP);
      
      if (day && plan[day]) {
        plan[day][mealDisplayName] = item.recipe_id || null;
        console.log('Set plan[', day, '][', mealDisplayName, '] =', item.recipe_id);
        console.log('Current plan state:', plan);
      } else {
        console.log('Skipping item - day not found or plan[day] not available');
      }
    });
    console.log('Final plan after mapping:', plan);
    return plan;
  }

  function frontendToBackendMeals(plan: { [day: string]: { [meal: string]: string | null } }) {
    const arr: any[] = [];
    DAYS.forEach((day, dayIdx) => {
      MEALS.forEach(meal => {
        if (plan[day][meal]) {
          arr.push({
            day_of_week: dayIdx,
            meal_slot_name: MEAL_SLOT_MAP[meal],
            recipe_id: plan[day][meal],
          });
        }
      });
    });
    return arr;
  }

  const loadMealPlan = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const weekStartDate = format(selectedWeek, 'yyyy-MM-dd');
      console.log('Loading meal plan for week:', weekStartDate);
      const mealPlan = await mealPlanAPI.getByWeek(weekStartDate);
      console.log('Received meal plan from API:', mealPlan);
      
      if (mealPlan && mealPlan.meals) {
        let mealsArr: any[];
        const rawMeals = mealPlan.meals;
        console.log('Raw meals data:', rawMeals);
        console.log('Type of rawMeals:', typeof rawMeals);
        console.log('Is array?', Array.isArray(rawMeals));
        
        if (typeof rawMeals === 'object' && rawMeals !== null) {
          // Convert backend object to array with day_of_week preserved
          mealsArr = [];
          Object.entries(rawMeals).forEach(([dayIdx, mealsForDay]) => {
            console.log('Processing day', dayIdx, 'with meals:', mealsForDay);
            Object.entries(mealsForDay).forEach(([mealSlotName, meal]) => {
              console.log('Processing meal for day', dayIdx, 'slot', mealSlotName, ':', meal);
              mealsArr.push({
                ...meal,
                day_of_week: Number(dayIdx)
              });
            });
          });
        } else if (Array.isArray(rawMeals)) {
          mealsArr = rawMeals;
        } else {
          mealsArr = [];
        }
        console.log('Final mealsArr:', mealsArr);
        const mappedPlan = backendToFrontendMeals(mealsArr);
        console.log('Mapped plan:', mappedPlan);
        console.log('Sunday breakfast value:', mappedPlan['Sunday']?.['Breakfast']);
        console.log('Sunday AM Snack value:', mappedPlan['Sunday']?.['AM Snack']);
        console.log('Recipes:', recipes);
        setPlan(mappedPlan);
      } else {
        console.log('No meal plan or meals found, setting empty plan');
        setPlan(() => {
          const initial: { [day: string]: { [meal: string]: string | null } } = {};
          DAYS.forEach(day => {
            initial[day] = {};
            MEALS.forEach(meal => {
              initial[day][meal] = null;
            });
          });
          return initial;
        });
      }
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        // No meal plan for this week: show empty plan, no error toast
        console.log('404 - No meal plan found for this week');
        setPlan(() => {
          const initial: { [day: string]: { [meal: string]: string | null } } = {};
          DAYS.forEach(day => {
            initial[day] = {};
            MEALS.forEach(meal => {
              initial[day][meal] = null;
            });
          });
          return initial;
        });
      } else {
        console.error('Error loading meal plan:', error);
        toast.error('Failed to load meal plan');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (day: string, meal: string, recipeId: string | null) => {
    setPlan(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [meal]: recipeId,
      },
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      const weekStartDate = format(selectedWeek, 'yyyy-MM-dd');
      const mealsData = frontendToBackendMeals(plan);
      console.log('Saving meal plan with data:', {
        week_start_date: weekStartDate,
        meals: mealsData,
        currentPlan: plan
      });
      await mealPlanAPI.create({
        week_start_date: weekStartDate,
        meals: mealsData,
      });
      toast.success('Meal plan saved!');
    } catch (error) {
      console.error('Error saving meal plan:', error);
      toast.error('Failed to save meal plan');
    }
  };

  // Week navigation handlers
  const goToPrevWeek = () => setSelectedWeek(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setSelectedWeek(prev => addWeeks(prev, 1));
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedWeek(startOfWeek(new Date(e.target.value), { weekStartsOn: 0 }));
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  if (!currentFamily) {
    return <div className="p-8 text-center text-gray-500">No family found. Please create or join a family first.</div>;
  }

  return (
    <div className="max-w-full overflow-x-auto p-4">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Meal Plan</h1>
          <p className="mt-1 text-sm text-gray-500">Plan your meals for the week</p>
          {currentFamily && (
            <p className="mt-1 text-sm text-primary-600">
              Family: {currentFamily.name}
            </p>
          )}
          {/* Week Selector */}
          <div className="flex items-center space-x-2 mt-2">
            <button onClick={goToPrevWeek} className="px-2 py-1 border rounded">&#8592;</button>
            <span className="font-medium">Week of {format(selectedWeek, 'MMMM d, yyyy')}</span>
            <button onClick={goToNextWeek} className="px-2 py-1 border rounded">&#8594;</button>
            <input
              type="date"
              value={format(selectedWeek, 'yyyy-MM-dd')}
              onChange={handleDateChange}
              className="ml-2 border rounded px-2 py-1"
            />
          </div>
        </div>
      </div>

      {/* Family Selector */}
      {families.length > 1 && (
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Family
          </label>
          <select
            value={currentFamily?.id || ''}
            onChange={(e) => {
              const family = families.find(f => f.id === e.target.value);
              setCurrentFamily(family || null);
              if (family) {
                localStorage.setItem('selectedFamilyId', family.id);
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
      )}

      <table className="min-w-max border-collapse w-full bg-white shadow rounded">
        <thead>
          <tr>
            <th className="border p-2 bg-gray-100"></th>
            {DAYS.map(day => (
              <th key={day} className="border p-2 bg-gray-100 text-center">{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MEALS.map(meal => (
            <tr key={meal}>
              <td className="border p-2 font-semibold bg-gray-50">{meal}</td>
              {DAYS.map(day => (
                <td key={day} className="border p-2">
                  <select
                    className="w-full border rounded p-1"
                    value={plan[day][meal] ?? ''}
                    onChange={e => handleSelect(day, meal, e.target.value ? e.target.value : null)}
                  >
                    <option value="">-- None --</option>
                    {/* Show the selected recipe even if not in recipes */}
                    {plan[day][meal] && !recipes.some(r => r.id === plan[day][meal]) && (
                      <option value={plan[day][meal]}>(Unknown Recipe)</option>
                    )}
                    {recipes.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button
        className="mt-6 px-6 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition"
        onClick={handleSave}
      >
        Save Meal Plan
      </button>
    </div>
  );
};

export default MealPlanner; 