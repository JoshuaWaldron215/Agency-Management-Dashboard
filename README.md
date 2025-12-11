# Agency Management Dashboard

A full-stack SaaS platform for agency performance tracking, earnings management, and team coordination. Built for mid-sized agencies with 30+ team members.

![React](https://img.shields.io/badge/React-18.3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-purple)

## Features

### Performance Tracking
- Real-time earnings calculator with transaction parsing
- Weekly performance sheets with commission tracking
- Hourly rate calculations and bonus management
- Per-model earnings breakdown with multi-timeframe views

### Analytics Dashboard
- Interactive charts and data visualization (Recharts)
- Leaderboard rankings with achievement badges
- Performance trend analysis
- Goal tracking and progress indicators

### Team Management
- Role-based access control (Admin/Chatter roles)
- Team assignment and organization
- User signup approval system
- Comprehensive audit logging

### Data Management
- CSV export functionality across all major views
- Transaction history with filtering and pagination
- Real-time data synchronization
- Secure data handling with Row-Level Security

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** components (Radix UI primitives)
- **TanStack Query** for server state management
- **Recharts** for data visualization
- **React Hook Form** with Zod validation

### Backend
- **Node.js** with Express
- **PostgreSQL** via Supabase
- **JWT Authentication** with role-based access
- **Real-time subscriptions** for live updates

### Infrastructure
- **Supabase** for database, auth, and real-time features
- **Row-Level Security** for data protection
- Cloud deployment ready

## Architecture Highlights

- **Mobile-first responsive design** optimized for iPad and mobile devices
- **Lazy loading** with React.lazy() for optimized initial page loads
- **Query caching** with TanStack Query for instant data reuse
- **Component memoization** for expensive calculations
- **Audit logging** for compliance and activity tracking

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account (free tier works)

### Installation

1. Clone the repository
```bash
git clone https://github.com/JoshuaWaldron215/Agency-Management-Dashboard.git
cd Agency-Management-Dashboard
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

4. Add your Supabase credentials to `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_database_url
```

5. Run database migrations (in Supabase SQL Editor)
- Execute `supabase_migration.sql`
- Execute `supabase_model_transactions.sql`
- Execute `supabase_performance_indexes.sql`

6. Start the development server
```bash
npm run dev
```

## Project Structure

```
├── client/src/
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities and helpers
│   ├── pages/          # Route components
│   └── integrations/   # Supabase client setup
├── server/
│   ├── index.ts        # Express server with API routes
│   └── vite.ts         # Vite middleware
└── shared/
    └── schema.ts       # Database types and schemas
```

## Security Features

- JWT token validation on all API endpoints
- Role-based access control (RBAC)
- Row-Level Security (RLS) at database level
- Rate limiting (30 requests/min per IP)
- Input validation with Zod schemas
- Audit logging for sensitive operations
- Soft delete for user data (GDPR-friendly)

## License

MIT License
