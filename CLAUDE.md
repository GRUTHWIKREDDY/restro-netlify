# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- **Development**: `npm run dev` (Starts the unified Express and Vite dev server)
- **Build**: `npm run build` (Builds frontend with Vite and backend with esbuild)
- **Production Start**: `npm run start` (Runs the bundled server from `dist/server.cjs`)
- **Lint/Type Check**: `npm run lint` (Runs `tsc --noEmit`)
- **Deployment**: `npm run deploy` (Deploys to GitHub Pages)

## Architecture & Structure

### High-Level Design
The project is a multi-tenant SaaS for restaurant operations. It uses a unified Node.js/Express server that serves both the API and the React frontend. Real-time data synchronization is handled by Firebase Firestore.

### Key Components & Portals
The application is split into several role-based interfaces:
- **Staff Portal (`StaffPortalLogin.tsx`)**: Central authentication and routing for operational staff.
- **Super Admin Dashboard (`SuperAdminDashboard.tsx`)**: SaaS operator's view for tenant onboarding, platform monitoring, and global administration.
- **Restaurant Admin Panel (`RestaurantAdminPanel.tsx`)**: Management tool for restaurant owners (menu editing, table/QR code management, financial auditing).
- **Kitchen Display System (KDS) (`KitchenDisplaySystem.tsx`)**: High-contrast real-time order tracking for kitchen staff.
- **Customer Digital Menu (`UserMenu.tsx` / `DineInCustomerUI.tsx`)**: Customer-facing PWA accessed via QR codes (`/r/:restaurantId/t/:tableNumber`) for browsing and ordering.

### Technical Stack
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React, Motion.
- **Backend**: Express (Node.js), TSX/Esbuild.
- **Database**: Firebase Firestore (NoSQL, real-time listeners).
- **Integration**: Google Generative AI (`@google/genai`) for AI-driven features.

### Key Implementation Details
- **Multi-Tenancy**: Data isolation is maintained per tenant within Firestore.
- **Real-time Sync**: State management relies heavily on Firebase real-time listeners rather than traditional REST polling.
- **QR Routing**: Dynamic routing is used to identify the restaurant and table automatically based on the URL.
- **Environment**: Firebase credentials are managed via `.env` files using `VITE_FIREBASE_*` prefixes.
