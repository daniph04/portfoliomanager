# Portfolio League

A modern, interactive investing game for private groups. Track portfolios, compete on rankings, and monitor investments in real-time.

## Features

- 🔐 **Supabase Authentication** - Secure login with email/password
- 👥 **Multi-Group Support** - Join multiple investment groups
- 📊 **4 Dashboard Tabs**:
  - **My Portfolio** - Your holdings, performance, cash management
  - **Group** - Combined group stats and asset allocation  
  - **Ranking** - Leaderboard with performance race chart
  - **Activity** - Real-time feed of all trades
- 📱 **PWA Ready** - Install on mobile for app-like experience
- 🌍 **English UI** - Fully translated interface
- 💹 **Live Prices** - Real-time stock/crypto prices via APIs

## Quick Start

```bash
# Install dependencies
npm install

# Set environment variables (create .env.local)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Run development server
npm run dev
```

Open `http://localhost:3000`

## PWA Installation (Add to Home Screen)

### iOS Safari
1. Open the app in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" - the app will appear on your home screen

### Android Chrome
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Tap "Install app" or "Add to Home screen"
4. Confirm installation

### Benefits of PWA
- **No App Store needed** - Direct installation from browser
- **Offline support** - Works without internet connection
- **Push notifications** - Get updates on trades (coming soon)
- **Auto-updates** - Always get the latest version
- **No download size** - Instant installation

## App Store Alternative

The PWA approach means you don't need to publish to the App Store. For true native apps:

| Option | Cost | Notes |
|--------|------|-------|
| **PWA (Recommended)** | Free | Works on all devices, no approval needed |
| **Apple TestFlight** | $99/year | Distribute to testers, requires Developer account |
| **Google Play Store** | $25 one-time | Requires signed APK, no recurring cost |

## Project Structure

```
portfolio-league/
├── app/                    # Next.js pages
│   ├── dashboard/         # Main dashboard
│   ├── groups/            # Group selection
│   └── setup/             # New user onboarding
├── components/            # React components
├── lib/                   # Utilities
│   ├── hooks/             # Custom React hooks
│   ├── supabase/          # Database client
│   ├── notifications.ts   # Notification utilities
│   └── historyService.ts  # Portfolio history
└── public/                # Static assets & PWA icons
```

## Tech Stack

- **Next.js 15** with App Router
- **TypeScript** + **TailwindCSS**
- **Supabase** for auth & database
- **Recharts** for data visualization

## Deployment

Deployed via Vercel. Push to `main` triggers auto-deploy.

```bash
git add .
git commit -m "Your changes"
git push origin main
```

## License

Private project.
