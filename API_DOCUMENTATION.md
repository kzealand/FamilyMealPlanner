# Family Meal Planner API Documentation

## Base URL
```
http://localhost:3001/api
```

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

#### Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "birthday": "1990-01-01",
  "dietary_restrictions": ["gluten-free", "vegetarian"],
  "nutrition_targets": {
    "calories": 2000,
    "protein": 150,
    "carbs": 200,
    "fat": 65
  },
  "favorite_foods": ["chicken", "salmon", "quinoa"]
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "birthday": "1990-01-01",
    "dietary_restrictions": ["gluten-free", "vegetarian"],
    "nutrition_targets": { "calories": 2000, "protein": 150 },
    "favorite_foods": ["chicken", "salmon", "quinoa"]
  },
  "token": "jwt-token"
}
```

#### Login User
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "token": "jwt-token"
}
```

#### Get User Profile
```http
GET /auth/profile
Authorization: Bearer <token>
```

#### Update User Profile
```http
PUT /auth/profile
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "dietary_restrictions": ["gluten-free"],
  "nutrition_targets": { "calories": 1800 }
}
```

#### Change Password
```http
PUT /auth/change-password
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "current_password": "oldpassword123",
  "new_password": "newpassword123"
}
```

**Response:**
```json
{
  "message": "Password changed successfully"
}
```

### Family Management

#### Create Family
```http
POST /families
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "The Smith Family",
  "description": "Our happy family of four"
}
```

#### Get User's Families
```http
GET /families
Authorization: Bearer <token>
```

#### Get Family Details
```http
GET /families/{familyId}
Authorization: Bearer <token>
```

#### Add Family Member
```http
POST /families/{familyId}/members
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "email": "member@example.com",
  "role": "member"
}
```

#### Remove Family Member
```http
DELETE /families/{familyId}/members/{userId}
Authorization: Bearer <token>
```

#### Update Member Role
```http
PUT /families/{familyId}/members/{userId}/role
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "role": "admin"
}
```

#### Leave Family
```http
DELETE /families/{familyId}/members/leave
Authorization: Bearer <token>
```

### Recipe Management

#### Create Recipe
```http
POST /recipes/{familyId}
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Grilled Chicken with Rice",
  "description": "Healthy grilled chicken served with brown rice",
  "prep_time_minutes": 15,
  "cook_time_minutes": 25,
  "servings": 4,
  "cooking_instructions": "1. Season chicken\n2. Grill for 6-8 minutes per side\n3. Cook rice",
  "star_rating": 4.5,
  "dietary_tags": ["high-protein", "gluten-free"],
  "ingredients": [
    {
      "name": "Chicken Breast",
      "quantity": 2,
      "unit": "lbs"
    },
    {
      "name": "Brown Rice",
      "quantity": 2,
      "unit": "cups"
    }
  ]
}
```

#### Get Recipes
```http
GET /recipes/{familyId}
Authorization: Bearer <token>
```

**Query Parameters:**
- `search` - Search recipes by name or description
- `dietary_tags` - Filter by dietary tags (comma-separated)
- `favorite_only` - Show only favorited recipes (true/false)

#### Get Recipe Details
```http
GET /recipes/{familyId}/{recipeId}
Authorization: Bearer <token>
```

#### Update Recipe
```http
PUT /recipes/{familyId}/{recipeId}
Authorization: Bearer <token>
```

#### Delete Recipe
```http
DELETE /recipes/{familyId}/{recipeId}
Authorization: Bearer <token>
```

#### Toggle Favorite Recipe
```http
POST /recipes/{familyId}/{recipeId}/favorite
Authorization: Bearer <token>
```

### Meal Planning

#### Create/Update Meal Plan
```http
POST /meal-plans/{familyId}/{userId}
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "week_start_date": "2024-01-01",
  "meals": [
    {
      "day_of_week": 0,
      "meal_slot_name": "dinner",
      "recipe_id": "recipe-uuid"
    },
    {
      "day_of_week": 1,
      "meal_slot_name": "breakfast",
      "custom_meal_name": "Oatmeal with berries",
      "notes": "Use gluten-free oats"
    }
  ]
}
```

**Meal Slots:**
- `breakfast`
- `am_snack`
- `lunch`
- `pm_snack`
- `dinner`
- `dessert`

**Day of Week:**
- 0 = Sunday
- 1 = Monday
- 2 = Tuesday
- 3 = Wednesday
- 4 = Thursday
- 5 = Friday
- 6 = Saturday

#### Get User Meal Plan
```http
GET /meal-plans/{familyId}/{userId}?week_start_date=2024-01-01
Authorization: Bearer <token>
```

#### Get All Family Meal Plans (Admin Only)
```http
GET /meal-plans/{familyId}?week_start_date=2024-01-01
Authorization: Bearer <token>
```

#### Delete Meal Plan
```http
DELETE /meal-plans/{familyId}/{userId}?week_start_date=2024-01-01
Authorization: Bearer <token>
```

### Shopping Lists

#### Generate Shopping List
```http
POST /shopping-lists/{familyId}/generate
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "week_start_date": "2024-01-01"
}
```

#### Get Shopping List
```http
GET /shopping-lists/{familyId}?week_start_date=2024-01-01
Authorization: Bearer <token>
```

#### Update Shopping List Item
```http
PUT /shopping-lists/{familyId}/items/{itemId}
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "is_checked": true,
  "notes": "Buy organic if available"
}
```

#### Get Available Shopping Lists
```http
GET /shopping-lists/{familyId}/lists
Authorization: Bearer <token>
```

#### Delete Shopping List
```http
DELETE /shopping-lists/{familyId}?week_start_date=2024-01-01
Authorization: Bearer <token>
```

## Error Responses

### Validation Error (400)
```json
{
  "error": "Validation error message"
}
```

### Authentication Error (401)
```json
{
  "error": "Access token required"
}
```

### Authorization Error (403)
```json
{
  "error": "Access denied: Admin role required"
}
```

### Not Found Error (404)
```json
{
  "error": "Resource not found"
}
```

### Conflict Error (409)
```json
{
  "error": "Resource already exists"
}
```

### Server Error (500)
```json
{
  "error": "Internal server error"
}
```

## Rate Limiting

The API implements rate limiting:
- 100 requests per 15 minutes per IP address
- Rate limit headers are included in responses

## Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

## Testing

Use the provided test credentials after seeding the database:
- Email: `john.doe@example.com`
- Password: `password123`

## Example Usage with curl

### Register a new user:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User"
  }'
```

### Create a family:
```bash
curl -X POST http://localhost:3001/api/families \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Family",
    "description": "Our family"
  }'
```

### Get recipes:
```bash
curl -X GET "http://localhost:3001/api/recipes/FAMILY_ID?search=chicken" \
  -H "Authorization: Bearer YOUR_TOKEN"
``` 