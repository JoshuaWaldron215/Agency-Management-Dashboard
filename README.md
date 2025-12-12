A full-stack SaaS platform for agency performance tracking, earnings management, and team coordination. Built for mid-sized agencies with 30+ team members.

> **Note:** Screenshots use demo/sample data. Production data and credentials are intentionally excluded.

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
- React 18 (TypeScript), Vite, Tailwind CSS, shadcn/ui (Radix UI), TanStack Query, Recharts, React Hook Form + Zod

### Backend
- Node.js, Express, PostgreSQL (Supabase), JWT auth with role-based access


### Infrastructure
- **Supabase** for database, auth, and real-time features
- **Row-Level Security** for data protection

----

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
