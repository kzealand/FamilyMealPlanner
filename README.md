# Family Meal Planning App

A comprehensive meal planning application designed for families to manage recipes, create weekly meal plans, and generate shopping lists. Built with Node.js, Express, PostgreSQL, and React.

## 🎯 Features

### Core Features (Must Have)
- **User Management**: Individual profiles with dietary restrictions, nutrition targets, and favorite foods
- **Family Groups**: Create and manage family units with role-based access (Admin/Member)
- **Recipe Database**: Centralized recipe storage with ingredients, instructions, and ratings
- **Meal Planning**: Weekly meal plans with 6 meal slots (Breakfast, AM Snack, Lunch, PM Snack, Dinner, Dessert)
- **Shopping Lists**: Automatically generated from meal plan ingredients
- **Role-Based Permissions**: Admins can edit others' plans, members manage their own

### Additional Features (Should Have)
- **Recipe Favoriting**: Star and save favorite recipes
- **Dietary Filtering**: Filter recipes by dietary tags and user preferences
- **Search Functionality**: Find recipes by name or description

## 🏗️ Architecture

### Backend Stack
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with UUID primary keys
- **Authentication**: JWT tokens with bcrypt password hashing
- **Validation**: Joi schema validation
- **Security**: Helmet, CORS, Rate limiting

### Database Schema
- **Users**: Profiles with dietary info and preferences
- **Families**: Family groups with member management
- **Recipes**: Recipe storage with ingredients and metadata
- **Meal Plans**: Weekly planning with meal slots
- **Shopping Lists**: Aggregated ingredients from meal plans

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MealPlanner
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your database credentials:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/meal_planner
   JWT_SECRET=your-super-secret-jwt-key
   PORT=3001
   ```

4. **Set up the database**
   ```bash
   # Create database
   createdb meal_planner
   
   # Run migrations
   npm run db:migrate
   
   # Seed with sample data
   npm run db:seed
   ```

5. **Start the server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001`

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "birthday": "1990-01-01",
  "dietary_restrictions": ["gluten-free"],
  "nutrition_targets": { "calories": 2000 },
  "favorite_foods": ["chicken", "salmon"]
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Family Management

#### Create Family
```http
POST /api/families
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "The Smith Family",
  "description": "Our happy family"
}
```

#### Add Family Member
```http
POST /api/families/{familyId}/members
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "member@example.com",
  "role": "member"
}
```

### Recipe Management

#### Create Recipe
```http
POST /api/recipes/{familyId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Grilled Chicken",
  "description": "Healthy grilled chicken",
  "prep_time_minutes": 15,
  "cook_time_minutes": 25,
  "servings": 4,
  "ingredients": [
    {
      "name": "Chicken Breast",
      "quantity": 2,
      "unit": "lbs"
    }
  ]
}
```

#### Get Recipes with Filters
```http
GET /api/recipes/{familyId}?search=chicken&dietary_tags=gluten-free&favorite_only=true
Authorization: Bearer <token>
```

### Meal Planning

#### Create Meal Plan
```http
POST /api/meal-plans/{familyId}/{userId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "week_start_date": "2024-01-01",
  "meals": [
    {
      "day_of_week": 0,
      "meal_slot_name": "dinner",
      "recipe_id": "recipe-uuid"
    }
  ]
}
```

#### Get Meal Plan
```http
GET /api/meal-plans/{familyId}/{userId}?week_start_date=2024-01-01
Authorization: Bearer <token>
```

### Shopping Lists

#### Generate Shopping List
```http
POST /api/shopping-lists/{familyId}/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "week_start_date": "2024-01-01"
}
```

#### Get Shopping List
```http
GET /api/shopping-lists/{familyId}?week_start_date=2024-01-01
Authorization: Bearer <token>
```

## 🧪 Testing

### Sample Data
After running the seed script, you can test with these credentials:
- **Email**: john.doe@example.com
- **Password**: password123

### API Testing
Use tools like Postman or curl to test the endpoints. All protected routes require the `Authorization: Bearer <token>` header.

## 📁 Project Structure

```
MealPlanner/
├── config/
│   └── database.js          # Database configuration
├── database/
│   └── schema.sql           # PostgreSQL schema
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── families.js          # Family management routes
│   ├── recipes.js           # Recipe management routes
│   ├── mealPlans.js         # Meal planning routes
│   └── shoppingLists.js     # Shopping list routes
├── scripts/
│   ├── migrate.js           # Database migration script
│   └── seed.js              # Database seeding script
├── server.js                # Main Express server
├── package.json             # Dependencies and scripts
└── README.md               # This file
```

## 🔧 Development

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data
- `npm test` - Run tests (when implemented)

### Environment Variables
- `PORT` - Server port (default: 3001)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV` - Environment (development/production)

## 🚀 Deployment

### Backend Deployment
1. Set up PostgreSQL database (Supabase, AWS RDS, etc.)
2. Configure environment variables
3. Deploy to platform (Render, Heroku, AWS, etc.)
4. Run database migrations

### Frontend Integration
The API is designed to work with React frontends. Update the CORS configuration in `server.js` to allow your frontend domain.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For questions or issues, please create an issue in the repository or contact the development team.

---

**Built with ❤️ for families who love to cook together** 