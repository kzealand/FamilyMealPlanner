const request = require('supertest');
const app = require('../server');

describe('Meal Planner API', () => {
  let authToken;
  let familyId;
  let recipeId;
  let userId;

  describe('Authentication', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          first_name: 'Test',
          last_name: 'User',
          dietary_restrictions: ['vegetarian'],
          nutrition_targets: { calories: 1800 },
          favorite_foods: ['pasta', 'salad']
        });

      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
      
      authToken = response.body.token;
      userId = response.body.user.id;
    });

    it('should login existing user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
    });
  });

  describe('Family Management', () => {
    it('should create a new family', async () => {
      const response = await request(app)
        .post('/api/families')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Family',
          description: 'A test family for API testing'
        });

      expect(response.status).toBe(201);
      expect(response.body.family).toBeDefined();
      
      familyId = response.body.family.id;
    });

    it('should get user families', async () => {
      const response = await request(app)
        .get('/api/families')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.families).toBeDefined();
      expect(response.body.families.length).toBeGreaterThan(0);
    });
  });

  describe('Recipe Management', () => {
    it('should create a new recipe', async () => {
      const response = await request(app)
        .post(`/api/recipes/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Recipe',
          description: 'A test recipe for API testing',
          prep_time_minutes: 10,
          cook_time_minutes: 20,
          servings: 4,
          ingredients: [
            {
              name: 'Test Ingredient',
              quantity: 2,
              unit: 'cups'
            }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body.recipe).toBeDefined();
      
      recipeId = response.body.recipe.id;
    });

    it('should get recipes for family', async () => {
      const response = await request(app)
        .get(`/api/recipes/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.recipes).toBeDefined();
      expect(response.body.recipes.length).toBeGreaterThan(0);
    });
  });

  describe('Meal Planning', () => {
    it('should create a meal plan', async () => {
      const weekStartDate = new Date().toISOString().split('T')[0];
      
      const response = await request(app)
        .post(`/api/meal-plans/${familyId}/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          week_start_date: weekStartDate,
          meals: [
            {
              day_of_week: 0,
              meal_slot_name: 'dinner',
              recipe_id: recipeId
            }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body.meal_plan).toBeDefined();
    });

    it('should get meal plan for user', async () => {
      const weekStartDate = new Date().toISOString().split('T')[0];
      
      const response = await request(app)
        .get(`/api/meal-plans/${familyId}/${userId}?week_start_date=${weekStartDate}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.meal_plan).toBeDefined();
    });
  });

  describe('Shopping Lists', () => {
    it('should generate shopping list', async () => {
      const weekStartDate = new Date().toISOString().split('T')[0];
      
      const response = await request(app)
        .post(`/api/shopping-lists/${familyId}/generate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          week_start_date: weekStartDate
        });

      expect(response.status).toBe(201);
      expect(response.body.shopping_list).toBeDefined();
    });

    it('should get shopping list', async () => {
      const weekStartDate = new Date().toISOString().split('T')[0];
      
      const response = await request(app)
        .get(`/api/shopping-lists/${familyId}?week_start_date=${weekStartDate}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.shopping_list).toBeDefined();
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
    });
  });
}); 