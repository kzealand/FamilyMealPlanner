import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { recipeAPI, familyAPI } from '@/services/api';
import { Recipe, Family } from '@/types';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = ['Breakfast', 'AM Snack', 'Lunch', 'PM Snack', 'Dinner', 'Dessert'];

const MealPlanner: React.FC = () => {
  const { user } = useAuth();
  const [families, setFamilies] = useState<Family[]>([]);
  const [currentFamily, setCurrentFamily] = useState<Family | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (currentFamily) {
      loadRecipes();
    }
  }, [currentFamily]);

  const loadFamilies = async () => {
    try {
      const familiesData = await familyAPI.getAll();
      setFamilies(familiesData);
      if (familiesData.length > 0) {
        setCurrentFamily(familiesData[0]);
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
    if (!currentFamily) return;
    setLoading(true);
    try {
      const recipesData = await recipeAPI.getAll(currentFamily.id);
      setRecipes(recipesData);
    } catch (error) {
      console.error('Error loading recipes:', error);
      toast.error('Failed to load recipes');
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

  const handleSave = () => {
    // TODO: send plan to backend
    alert('Meal plan saved! (stub)');
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