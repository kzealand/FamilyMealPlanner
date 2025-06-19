# Family Meal Planner Frontend

A modern React frontend for the Family Meal Planning App built with TypeScript, Vite, and Tailwind CSS.

## Features

- **Modern React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **React Query** for data fetching
- **React Hook Form** with Zod validation
- **Lucide React** for icons
- **Framer Motion** for animations
- **React Hot Toast** for notifications

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router DOM
- React Query
- React Hook Form
- Zod
- Lucide React
- Framer Motion
- React Hot Toast

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Backend server running on port 3001

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI components (Button, Input, etc.)
│   └── Layout.tsx      # Main layout with navigation
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication context
├── pages/              # Page components
│   ├── Dashboard.tsx   # Dashboard page
│   ├── Login.tsx       # Login page
│   ├── Register.tsx    # Registration page
│   ├── Recipes.tsx     # Recipes management
│   ├── MealPlanner.tsx # Meal planning
│   ├── ShoppingList.tsx # Shopping lists
│   ├── Family.tsx      # Family management
│   └── Profile.tsx     # User profile
├── services/           # API services
│   └── api.ts          # API client and endpoints
├── types/              # TypeScript type definitions
│   └── index.ts        # Shared types
├── App.tsx             # Main app component
├── main.tsx            # App entry point
└── index.css           # Global styles
```

## API Integration

The frontend connects to the backend API running on port 3001. The Vite dev server is configured to proxy API requests to the backend.

### API Endpoints

- Authentication: `/api/auth/*`
- Families: `/api/families/*`
- Recipes: `/api/recipes/*`
- Meal Plans: `/api/meal-plans/*`
- Shopping Lists: `/api/shopping-lists/*`

## Development

### Adding New Pages

1. Create a new component in `src/pages/`
2. Add the route to `src/App.tsx`
3. Add navigation link to `src/components/Layout.tsx`

### Styling

The app uses Tailwind CSS with custom design tokens defined in `tailwind.config.js`. Custom component classes are defined in `src/index.css`.

### State Management

- **Authentication**: Managed by `AuthContext`
- **Server State**: Managed by React Query
- **Form State**: Managed by React Hook Form

## Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:3001/api
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Contributing

1. Follow the existing code style
2. Use TypeScript for all new code
3. Add proper error handling
4. Test your changes thoroughly
5. Update documentation as needed 