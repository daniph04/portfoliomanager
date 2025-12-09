# Formula 1 Group - Portfolio League

A modern, interactive investing game for a private group of friends. Built with Next.js, TypeScript, and TailwindCSS.

## Features

- 🔐 Password-protected group access
- 📊 Interactive dashboard with 4 tabs
  - **Overview**: Group stats, asset allocation, performance charts
  - **Leaderboard**: Rankings and performance comparison
  - **Members**: Individual portfolios with full CRUD operations
  - **Activity**: Real-time feed of trades and updates
- 💾 Persistent localStorage state
- 🎨 Modern dark theme UI
- 📱 Responsive design
- 📈 Interactive charts with Recharts

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set group password** (optional):
   Create `.env.local`:
   ```
   NEXT_PUBLIC_GROUP_PASSWORD=your-password-here
   ```
   Default is `f1-secret` if not set.

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Open browser**:
   Navigate to `http://localhost:3000` and enter the group password.

## Project Structure

```
portfolio-league/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Password screen
│   └── dashboard/         # Dashboard page
├── components/            # React components
│   ├── TopNav.tsx
│   ├── Sidebar.tsx
│   ├── OverviewTab.tsx
│   ├── LeaderboardTab.tsx
│   ├── MembersTab.tsx
│   ├── ActivityTab.tsx
│   └── HoldingFormModal.tsx
└── lib/                   # Utilities and data
    ├── types.ts           # TypeScript types
    ├── auth.ts            # Authentication
    ├── utils.ts           # Helper functions
    ├── mockData.ts        # Initial data
    └── useGroupData.ts    # State management
```

## Tech Stack

- **Next.js 15** with App Router
- **TypeScript**
- **TailwindCSS**
- **Recharts** for data visualization
- **localStorage** for persistence

## Current User

The app has a "current user" concept (default: Daniel) who can edit their own portfolio. Other members are read-only. This can be changed in `lib/auth.ts`.

## Data Management

- Initial data is seeded from `lib/mockData.ts` (5 members with realistic holdings)
- All changes are persisted to `localStorage`
- State managed via custom hook `usePersistentGroupData()`

## Building for Production

```bash
npm run build
npm start
```

## License

Private project for a group of friends.
