# Plan: Remove Restaurant Dropdown and Implement Identity-Based Routing

## Goal
Remove the "Select Restaurant" dropdown from the login flow and instead resolve the restaurant identity based on the user's email address during authentication.

## Current Context
- **Current Flow**: User selects a role $\rightarrow$ User selects a restaurant from a dropdown $\rightarrow$ User enters email/password $\rightarrow$ Backend verifies credentials for that specific restaurant.
- **Target Flow**: User selects a role $\rightarrow$ User enters email/password $\rightarrow$ Backend identifies the restaurant associated with that email $\rightarrow$ User is routed to the correct home page.
- **Database**: Supabase PostgreSQL.
- **Existing Restaurants**: 7 restaurants identified (rest-1 to rest-7).

## Proposed Approach
1. **Data Seeding**: Create a mapping between email addresses and restaurant IDs. Since there isn't a dedicated `users` table with `restaurant_id` visible in the current context (besides `user_roles` for superadmins), we will ensure the backend `merchant-login` endpoint can resolve the `restaurantId` from the email.
2. **Frontend Simplification**: Remove the restaurant selection logic and UI from `StaffPortalLogin.tsx`.
3. **Backend Modification**: Update the `/api/auth/merchant-login` endpoint to look up the `restaurantId` associated with the provided email if it's not provided in the request.

## Step-by-Step Plan

### Phase 1: Data Preparation & Seeding
1. **Create Credentials List**:
   - For each of the 7 restaurants, generate an email based on the restaurant name.
   - Example: `royalclayoven@restro.com` $\rightarrow$ `rest-1`.
2. **Insert Data**: Insert these users into the database (assuming a `merchant_users` or similar table exists, or updating the existing auth logic).
3. **Documentation**: Write all generated emails and passwords to `RESTRO_CREDENTIALS.md` for the user.

### Phase 2: Frontend Implementation
1. **Modify `src/components/StaffPortalLogin.tsx`**:
   - Remove the state/props related to `selectedRestaurantId` and `onSelectRestaurant`.
   - Remove the `<select>` element for restaurant selection.
   - Update the `handleLoginSubmit` function to stop sending `restaurantId` from the client side.

### Phase 3: Backend Implementation
1. **Update `server.ts` (or relevant auth controller)**:
   - Locate the `POST /api/auth/merchant-login` endpoint.
   - Implement a lookup mechanism: `Email` $\rightarrow$ `RestaurantID`.
   - If the email exists in the mapping, proceed with the login and return the associated `restaurantId` in the response.

## Files Likely to Change
- `src/components/StaffPortalLogin.tsx` (UI removal)
- `server.ts` (Backend logic update)
- `RESTRO_CREDENTIALS.md` (New file for credentials)

## Verification Steps
- [ ] **Test Login**: Enter a generated email (e.g., for "The Dim Sum House") and password.
- [ ] **Verify Routing**: Ensure the user is automatically directed to the correct restaurant's admin/kitchen panel without picking from a list.
- [ ] **Error Handling**: Verify that an unregistered email returns an "Invalid credentials" error.

## Risks & Tradeoffs
- **Email Uniqueness**: This assumes each restaurant has a unique primary admin email.
- **Security**: Moving the restaurant ID lookup to the server is actually *more* secure as it prevents users from attempting to brute-force passwords against different restaurant IDs via the client-side dropdown.

## Open Questions
- Does the current `merchant-login` endpoint use a specific table for restaurant staff, or is it using Supabase Auth with custom metadata? I will need to inspect the server code to confirm the exact table name for seeding.
