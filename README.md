# Multi-Tenant Digital Menu & Operations Suite

A comprehensive, multi-tenant SaaS application designed to streamline restaurant operations, digitize menus, and provide real-time order management tools. This platform connects customers, kitchen staff, restaurant owners, and platform administrators through a unified suite of interfaces.

## 🚀 Key Features

- **Multi-Tenant Architecture:** Supports multiple restaurant brands on a single instance, with isolated data per tenant.
- **Real-Time Synchronization:** Leverages Firebase Firestore to instantly sync orders, menu updates, and status changes across all disconnected clients.
- **Dynamic QR Code Routing:** Generate unique, table-specific QR codes that route customers directly to their interactive ordering sessions.
- **Granular Access Control:** Role-based access ensures Super Admins, Restaurant Admins, and Chefs only see the portals relevant to their workflow.

---

## 🧩 Core Components

### 1. Unified Staff Portal (`StaffPortalLogin.tsx`)
A secure gateway for all operational personnel to authenticate and route to the correct workflow (Admin, KDS, Super Admin).

### 2. Super Admin Dashboard (`SuperAdminDashboard.tsx`)
The centralized command center for the SaaS platform operator.
- **Features:** Onboard new tenant restaurants, suspend/block existing nodes, monitor aggregate platform sales, restrict specific capabilities (e.g., locking menus), and view detailed cross-tenant ledgers.

### 3. Restaurant Admin Panel (`RestaurantAdminPanel.tsx`)
The management hub for individual restaurant owners.
- **Features:** Create, edit, and categorize menu items. Manage table capacity, dynamically generate and preview table-tent QR codes, monitor live floor occupancy, and audit the financial ledger.

### 4. Kitchen Display System (KDS) (`KitchenDisplaySystem.tsx`)
A streamlined, high-contrast interface built specifically for fast-paced kitchen environments.
- **Features:** View incoming orders in real-time, bump or track prep status ("Received", "Preparing", "Ready").

### 5. User Digital Menu (`UserMenu.tsx` / `DineInCustomerUI.tsx`)
The customer-facing progressive web app accessed via scanning a table's QR code.
- **Features:** Browse categorized menus, view descriptions and prices, manage a local cart, place live orders directly to the KDS, and track real-time ticket progression. Requires 10-digit Indian phone-number validation for identification.

---

## 🛠️ Tech Stack & Architecture

- **Frontend Framework:** React 18+ powered by Vite for rapid development and optimized builds.
- **Styling:** Tailwind CSS for a fully responsive, utility-first UI design system.
- **Backend Infrastructure Server:** Custom Node.js (Express server) using TSX & Esbuild.
- **Database / Backend:** Firebase Firestore for NoSQL real-time document storage.
- **Icons:** `lucide-react` for crisp, consistent vector iconography.
- **State Management:** React hooks tightly bound with real-time Firebase listeners.

---

## 💻 Running the Project Locally

### 1. Prerequisites
- Node.js (`v18` or higher recommended)
- Existing Firebase Project with Firestore Document store enabled

### 2. Setup
1. Clone the repository to your local machine.
2. Install dependencies:
   ```bash
   npm install
   ```

### 3. Environment Configuration
Create a `.env` file in the root directory and add your Firebase configurations. Ensure you DO NOT push this to version control.
```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-auth-domain"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-storage-bucket"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
```

### 4. Running the Dev Server
The backend and frontend run using a single unified process via express and vite middleware.
```bash
npm run dev
```
The application will be accessible at `http://localhost:3000`. 
By default, the root `/` URL points to the Staff Portal. Navigating to the client scanner URL (`/r/:restaurantId/t/:tableNumber`) will invoke the customer-facing interface.

---

## 🌎 Deployment

A consolidated containerized build handles both Express backend routing and optimized React Vite bundles. 

### Standard Build
1. Create a production build:
   ```bash
   npm run build
   ```
2. The code will output to the `dist` folder. To test the build locally, you can run:
   ```bash
   npm run start
   ```

### Cloud Run Deployment
Given there is an Express Node backend server bundled in `server.ts`/`dist/server.cjs`, containerized environments like Google Cloud Run or AWS ECS are strongly recommended. Configure port `3000` to be externally accessible depending on your orchestration engine.

---

## 📈 Future Enhancements: Analytics & Reporting

To provide deeper operational insights, the platform can be extended with a comprehensive Analytics Suite tailored to both Restaurant Admins and Platform Super Admins. Implementing these features will require specific architectural and technical additions.

### 1. Restaurant Admin Analytics
Empower individual restaurant owners with localized metrics to optimize their menu and staffing.
- **Key Metrics:** 
  - **Peak Hours:** Visual heatmap of order volume to staff accordingly.
  - **Item Popularity:** Top-performing and under-performing menu items.
  - **Floor/Table Efficiency:** Average turnover time per table/floor.
  - **Revenue Trends:** Daily, weekly, and monthly gross sales graphs.

### 2. Super Admin Analytics
Provide the platform operator with a macro view of the SaaS business health.
- **Key Metrics:**
  - **Global Gross Volume (GGV):** Total transacted value across all tenants.
  - **Tenant Health:** Growth rate of new restaurants vs. churn.
  - **System Load:** Active concurrent diners and order bandwidth.
  - **Top Performing Tenants:** Leaderboards of the highest volume restaurants.

### 📜 Technical Requirements to Implement Analytics
To build these analytics features effectively, the following concepts and tools should be integrated:

- **Time-Series Data Aggregation:** Instead of querying all raw orders (which gets computationally expensive in Firestore), the backend will need scheduled functions (e.g., Firebase Cloud Functions) or triggered updates to aggregate sales data dynamically into daily/weekly summary documents.
- **Visualization Libraries:** Integration of a React charting library such as `recharts` or `d3` to render responsive, interactive charts (line graphs for revenue, pie charts for item popularity).
- **Date Range Pickers:** UI components allowing admins to filter ledger queries by custom date intervals (e.g., "Last 7 Days", "Last Month").
- **Reporting Exports:** Functionality for admins to download raw CSVs or formatted PDF reports of their metrics for external accounting.
- **Tenant Data Isolation:** Strict Firestore security rules and backend validation to ensure aggregate queries never bleed data across restaurant bounds.