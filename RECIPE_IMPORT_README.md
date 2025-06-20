# Recipe Bulk Import Guide

This guide will help you bulk import recipes into your family meal planner using a CSV file.

## CSV Template Format

The `recipe_import_template.csv` file contains sample recipes and shows the correct format. Here's how to fill it out:

### Required Fields:
- **name**: Recipe name (e.g., "Spaghetti Carbonara")
- **description**: Brief description of the recipe
- **image_url**: URL to an image of the recipe (optional, can be left empty)
- **prep_time_minutes**: Preparation time in minutes
- **cook_time_minutes**: Cooking time in minutes
- **servings**: Number of people this recipe serves
- **cooking_instructions**: Step-by-step cooking instructions (use \n for line breaks)
- **star_rating**: Rating from 1-5 stars
- **dietary_tags**: Comma-separated tags (e.g., "Italian,Quick,Vegetarian")
- **ingredients**: List of ingredients in format "Name:Quantity:Unit" separated by commas

### Ingredient Format:
Each ingredient should be in the format: `Name:Quantity:Unit`

Examples:
- `Pasta:500:g` (500 grams of pasta)
- `Eggs:4:whole` (4 whole eggs)
- `Olive Oil:30:ml` (30 milliliters of olive oil)
- `Black Pepper:2:tsp` (2 teaspoons of black pepper)

### Dietary Tags:
Common tags you can use:
- Italian, Mexican, Asian, American, etc.
- Quick, Slow-Cooker, One-Pot
- Vegetarian, Vegan, Gluten-Free
- Healthy, Family-Friendly, Kid-Friendly
- Breakfast, Lunch, Dinner, Dessert

## How to Use:

1. **Open the CSV file** in Excel, Google Sheets, or any spreadsheet application
2. **Add your recipes** following the format shown in the examples
3. **Save the file** as CSV format
4. **Use the bulk import feature** in the app to upload your recipes

## Tips:

- Make sure ingredient names are consistent (e.g., always use "Chicken Breast" not "Chicken breast" or "Chicken")
- Use standard units: g (grams), kg (kilograms), ml (milliliters), l (liters), tsp (teaspoon), tbsp (tablespoon), cup, whole, etc.
- Keep descriptions concise but informative
- Use clear, step-by-step cooking instructions
- Rate recipes honestly (1-5 stars)

## Example Recipe Entry:

```
"Chicken Stir Fry","Quick and healthy stir fry with vegetables",10,15,4,"1. Cut chicken into bite-sized pieces\n2. Stir fry chicken until cooked\n3. Add vegetables and stir fry\n4. Add sauce and serve over rice",4,"Asian,Healthy,Quick","Chicken Breast:500:g,Broccoli:300:g,Carrots:200:g,Soy Sauce:60:ml,Rice:400:g"
```

This creates a recipe with:
- Name: Chicken Stir Fry
- 10 minutes prep time, 15 minutes cook time
- Serves 4 people
- 4-star rating
- Tags: Asian, Healthy, Quick
- 5 ingredients with quantities and units 