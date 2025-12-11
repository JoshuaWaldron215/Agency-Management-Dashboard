# MAP MGT - Management Dashboard

## Overview
MAP MGT is a comprehensive management dashboard for OnlyFans model management, tracking chatter performance, sales, and team activities. It enables both administrators and chatters to monitor earnings, manage daily sheets, view leaderboards, and coordinate team activities. The application focuses on commission tracking, hourly rate calculations, and detailed sales breakdowns to optimize model performance and team management.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework:** React 18.3.1 with TypeScript, Vite for build and development.
- **UI:** shadcn/ui components built on Radix UI, styled with Tailwind CSS for a responsive, themeable design (light/dark mode).
- **State Management:** TanStack Query for server state, React's useState/useEffect for local state, custom hooks for business logic.
- **Data Visualization:** Recharts library for interactive charts and custom components.
- **Form Handling:** React Hook Form with Zod for type-safe validation.
- **Patterns:** Component composition (atomic design), separation of concerns, protected routes with role-based access.

### Backend
- **API Server:** Express.js server (port 3001) for secure admin operations requiring service role key.
- **Database & Services:** Supabase (PostgreSQL) for database, authentication, and real-time subscriptions, with Row-Level Security (RLS).
- **Authentication:** Supabase Auth for email/password, Role-Based Access Control (RBAC) for `admin` and `chatter` roles. Signup approval system with pending/approved/denied status.
- **Data Access:** Direct Supabase client queries, real-time subscriptions, optimistic updates via React Query, custom RPC functions.
- **Business Logic:** Client-side commission/earnings calculations, OnlyFans transaction parsing, timezone-aware date handling (America/New_York).

### API Security (server/index.ts)
- **JWT Token Validation:** All endpoints verify Bearer tokens via Supabase Auth
- **Role Verification:** Admin-only endpoints check user_roles table before processing
- **Rate Limiting:** 30 requests per minute per IP address with automatic cleanup
- **Input Validation:** UUID format validation, type checking, null/empty guards
- **Security Logging:** All auth failures, rate limits, and sensitive operations logged to console and audit_log table
- **Startup Validation:** Server fails fast if environment variables are missing
- **Health Check:** `/api/health` endpoint for monitoring

### User Deletion (Enterprise-grade SOFT DELETE via `/api/delete-user`):
  - Sets profile status to "deleted" with deleted_at timestamp
  - Anonymizes PII (profile name becomes "Deleted User", email/team cleared)
  - Preserves original chatter_name on sheets for historical/audit purposes
  - Sheets display "(Deleted)" badge next to chatter name for visibility
  - Removes user_roles to prevent login access
  - Creates audit log entry for compliance
  - Historical sheets/transactions preserved for analytics and reporting

### Key Features
- **Performance Tracking:** Earnings calculator from OnlyFans exports, transaction categorization, hourly breakdowns, per-model earnings breakdown with multi-timeframe view (today, last 7, last 30, all time).
- **Chatter Sheets:** Weekly performance sheets with daily sales, commission/hourly rate calculation, bonus tracking, inline editing, real-time collaboration, CSV export.
- **Leaderboard:** Top performer rankings with timeframes, team filtering, achievement badges, performance trend visualization, CSV export.
- **CSV Export:** One-click exports available on Admin Dashboard (full summary), Chatter Sheets, Leaderboard, Model Transactions, and Model Earnings. All exports respect current filters (dates, teams, categories).
- **Dashboard & Analytics:** Personal dashboards, earnings history, rank progression, goal tracking, admin view for other users.
- **Model Management (Admin):** CRUD for model profiles, image upload, sales breakdown by model/chatter, soft delete.
- **Model Analytics:** Sale type breakdown (PPV, Tips, Subscriptions, Bundles, Other) with pie chart visualization, transaction history with filtering and pagination.
- **Team Member Management (Admin):** User role assignment, team assignment, user deletion, signup approval (approve/deny new users).
- **Audit Logging:** Comprehensive trail for critical operations (CREATE, UPDATE, DELETE, LOGIN, LOGOUT).

### Database Setup Required
- **model_transactions table:** Run `supabase_model_transactions.sql` in Supabase Dashboard SQL Editor to enable transaction history on model pages.
- **Performance indexes:** Run `supabase_performance_indexes.sql` in Supabase Dashboard SQL Editor to add database indexes for faster queries at scale.

### Production Performance Optimizations
- **Route-Level Lazy Loading:** All pages use React.lazy() with Suspense fallback for faster initial page loads.
- **React Query Caching:** Dashboard and leaderboard hooks use TanStack Query with 2-3 minute stale times and 10 minute garbage collection for instant data reuse.
- **Component Memoization:** Chart components (SaleTypeBreakdown, EarningsHistoryChart) wrapped in React.memo() with useMemo for expensive calculations.
- **Query Batching:** EarningsHistoryChart optimized from 36 sequential database calls to 3 parallel Promise.all calls with client-side filtering.
- **PlaceholderData:** Previous data shown during background refetches for seamless user experience.

### Mobile Optimization
- **Touch-Friendly Controls:** 44px minimum touch targets for all buttons, inputs, and interactive elements.
- **Mobile Card Views:** Spreadsheet tables transform to card layouts on mobile with sticky summary headers showing totals.
- **Responsive Layouts:** All pages use responsive padding and typography that adapts to screen size.
- **PWA Support:** Installable as app on iOS/Android with offline support via service worker.
- **Input Optimization:** Number inputs use `inputMode="decimal"` for proper mobile keyboard.

## External Dependencies

### Core Infrastructure
- **Supabase** (@supabase/supabase-js): BaaS for PostgreSQL, authentication, real-time, storage.

### UI Components & Styling
- **Radix UI:** Headless, accessible UI primitives.
- **shadcn/ui:** Pre-styled components built on Radix UI and Tailwind CSS.
- **Lucide React:** Icon library.
- **Tailwind CSS:** Utility-first CSS framework.
- **class-variance-authority, clsx, tailwind-merge:** Styling utilities.
- **next-themes:** Theme management.

### Data & State Management
- **TanStack Query:** Server state management and caching.

### Date & Time
- **date-fns:** Date manipulation.
- **date-fns-tz:** Timezone-aware date operations.

### Form Management
- **React Hook Form:** Form state management.
- **@hookform/resolvers:** Zod integration.
- **Zod:** TypeScript-first schema validation.

### Development Tools
- **Vite:** Build tool.
- **TypeScript:** Type safety.
- **ESLint:** Code linting.