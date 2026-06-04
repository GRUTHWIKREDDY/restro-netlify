# Multi-Tenant Digital Menu & Operations Suite (kCodeIT)

A comprehensive, multi-tenant SaaS application designed to streamline restaurant operations, digitize menus, and provide real-time order management tools. This platform connects customers, kitchen staff, restaurant owners, and platform administrators through a unified suite of interfaces.

## 🚀 Key Features

- **Multi-Tenant Architecture:** Supports multiple restaurant brands on a single instance, with isolated data per tenant.
- **Real-Time Synchronization:** Leverages Firebase Firestore to instantly sync orders, menu updates, and status changes across all disconnected clients.
- **AI-Powered Dining Assistant:** DeepSeek AI drives the "Aarudy D'" concierge for menu recommendations, AI copywriting for dish descriptions, and strategic business reports.
- **Dynamic QR Code Routing:** Generate unique, table-specific QR codes that route customers directly to their interactive ordering sessions.
- **Granular Access Control:** Role-based access ensures Super Admins, Restaurant Admins, and Chefs only see the portals relevant to their workflow.

---

## 🧩 Core Components

### 1. Unified Staff Portal (`StaffPortalLogin.tsx`)
A secure gateway for all operational personnel to authenticate and route to the correct workflow (Admin, KDS, Super Admin).

### 2. Super Admin Dashboard (`SuperAdminDashboard.tsx`)
The centralized command center for the SaaS platform operator.
- **Features:** Onboard new tenant restaurants, suspend/block existing nodes, monitor aggregate platform sales, restrict specific capabilities (e.g., locking menus), and view detailed cross-tenant ledgers. AI-powered SaaS analytics reports via DeepSeek.

### 3. Restaurant Admin Panel (`RestaurantAdminPanel.tsx`)
The management hub for individual restaurant owners.
- **Features:** Create, edit, and categorize menu items. Manage table capacity, dynamically generate and preview table-tent QR codes, monitor live floor occupancy, and audit the financial ledger. AI-assisted menu copywriting and strategic recommendations powered by DeepSeek.

### 4. Kitchen Display System (KDS) (`KitchenDisplaySystem.tsx`)
A streamlined, high-contrast interface built specifically for fast-paced kitchen environments.
- **Features:** View incoming orders in real-time, bump or track prep status ("Received", "Preparing", "Ready").

### 5. Dine-In Customer UI (`DineInCustomerUI.tsx`)
The customer-facing interface accessed via scanning a table's QR code.
- **Features:** Browse categorized menus, view descriptions and prices, manage a local cart, place live orders directly to the KDS, track real-time ticket progression, rate completed dishes. AI "Aarudy D'" concierge for menu recommendations powered by DeepSeek.

---

## 🛠️ Tech Stack & Architecture

- **Frontend Framework:** React 19 powered by Vite for rapid development and optimized builds.
- **Styling:** Tailwind CSS v4 (utility-first via `@theme` in CSS, no PostCSS config).
- **Backend Infrastructure Server:** Custom Node.js (Express server) using TSX & Esbuild.
- **Database:** Firebase Firestore for NoSQL real-time document storage.
- **AI Engine:** DeepSeek Chat API (OpenAI-compatible) for dining assistant, menu copy, and business reports.
- **Icons:** `lucide-react` for crisp, consistent vector iconography.
- **State Management:** React hooks tightly bound with real-time Firebase listeners.

---

## 💻 Running the Project Locally

### 1. Prerequisites
- Node.js (`v18` or higher recommended)
- DeepSeek API key (or any OpenAI-compatible API key)

### 2. Setup
1. Clone the repository to your local machine.
2. Install dependencies:
   ```bash
   npm install
   ```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
DEEPSEEK_API_KEY="sk-your-deepseek-api-key"
```
If no key is set, AI features run in mock fallback mode (app still works).

### 4. Running the Dev Server
The backend and frontend run using a single unified process via Express and Vite middleware.
```bash
npm run dev
```
The application will be accessible at `http://localhost:3001` (port 3001 is used if port 3000 is occupied).

---

## 🌎 Deployment

A consolidated containerized build handles both Express backend routing and optimized React Vite bundles.

### Standard Build
1. Create a production build:
   ```bash
   npm run build
   ```
2. The code will output to the `dist` folder. To test the build locally:
   ```bash
   npm run start
   ```

### Cloud Run Deployment
Containerized environments like Google Cloud Run or AWS ECS are recommended. Configure the port to be externally accessible depending on your orchestration engine.

---

## 📈 Future Enhancements: Analytics & Reporting

To provide deeper operational insights, the platform can be extended with a comprehensive Analytics Suite tailored to both Restaurant Admins and Platform Super Admins.

### 1. Restaurant Admin Analytics
- **Key Metrics:** Peak hours heatmap, item popularity, floor/table efficiency, revenue trends.

### 2. Super Admin Analytics
- **Key Metrics:** Global Gross Volume (GGV), tenant health, system load, top-performing tenants.

### 📜 Technical Requirements to Implement Analytics
- **Time-Series Data Aggregation:** Scheduled functions or triggered updates to aggregate sales into daily/weekly summary documents.
- **Visualization Libraries:** Integration of a React charting library such as `recharts` or `d3`.
- **Date Range Pickers:** UI components to filter ledger queries by custom date intervals.
- **Reporting Exports:** Download raw CSVs or formatted PDF reports.
- **Tenant Data Isolation:** Strict Firestore security rules to prevent data bleed across restaurant bounds.
