# Plan: Remove Restaurant Dropdown and Implement Identity-Based Routing

## Goal
Remove the "Select Restaurant" dropdown from the login flow and instead resolve the restaurant identity based on the user's email address during authentication.

## Current Context
- **Current Flow**: User selects a role $\rightarrow$ User selects a restaurant from a dropdown $\rightarrow$ User enters email/password $\rightarrow$ Backend verifies credentials for that specific restaurant.
- **Target Flow**: User selects a role $\rightarrow$ User enters email/password $\rightarrow$ Backend identifies the restaurant associated with that email $\rightarrow$ User is routed to the correct home page.
- **Database**: Supabase PostgreSQL.
- **Table Identified**: `staff_credentials` stores the mapping of `email`, `role`, and `restaurant_id`.
- **Existing Restaurants**: 7 restaurants identified (rest-1 to rest-7).

## Proposed Approach
1. **Data Seeding**: Insert a set of admin and kitchen users into the `staff_credentials` table for each of the 7 restaurants.
2. **Frontend Simplification**: Remove the restaurant selection UI and state from `StaffPortalLogin.tsx`.
3. **Backend Modification**: Update the `/api/auth/merchant-login` endpoint to resolve `restaurantId` from the `staff_credentials` table using the provided `email` and `role` before verifying the password.

## Step-by-Step Plan

### Phase 1: Data Preparation & Seeding
1. **Generate Credentials**: 
   - For each restaurant (rest-1 to rest-7), create one `restadmin` and one `kitchen` account.
   - Email format: `[restaurant-slug]@restro.com` (e.g., `royalclayoven@restro.com`).
   - Password: `password` for all.
2. **Insert via Supabase**: 
   - Generate appropriate `salt` and `password_hash` using the project's hashing logic.
   - Use the ID convention: `staff-{restaurantId}-{roleSuffix}`.
   - Upsert into `staff_credentials`.
3. **Documentation**: Write all generated emails and passwords to `RESTRO_CREDENTIALS.md`.

### Phase 2: Frontend Implementation
1. **Modify `src/components/StaffPortalLogin.tsx`**:
   - Remove `selectedRestaurantId` and `onSelectRestaurant` from props and state logic.
   - Remove the restaurant selection `<select>` dropdown.
   - Update `handleLoginSubmit` to only send `email`, `password`, and `role` to the backend.

### Phase 3: Backend Implementation
1. **Modify `server.ts` (`/api/auth/merchant-login` endpoint)**:
   - **Remove** the requirement for `restaurantId` in the request body validation.
   - **Step A**: Query `staff_credentials` using `email` and `role` to find the associated `restaurant_id`.
   - **Step B**: Use the retrieved `restaurant_id` to fetch the restaurant's name from the `restaurants` table.
   - **Step C**: Proceed with password hash verification as usual.
   - **Step D**: Return the resolved `restaurantId` and `restaurantName` in the success response.

## Files Likely to Change
- `src/components/StaffPortalLogin.tsx` (UI removal)
- `server.ts` (Auth logic update)
- `RESTRO_CREDENTIALS.md` (New file for generated credentials)

## Verification Steps
- [ ] **Verify Seeding**: Check `staff_credentials` table for the 14 new entries.
- [ ] **Test Admin Login**: Enter `royalclayoven@restro.com` $\rightarrow$ Verify automatic routing to "The Royal Clay Oven" admin panel.
- [ ] **Test Kitchen Login**: Enter `dakshindelights@restro.com` (kitchen role) $\rightarrow$ Verify routing to "Dakshin Delights" KDS.
- [ ] **Error Case**: Enter an email not associated with any restaurant $\rightarrow$ Verify "Invalid credentials" response.

## Risks & Tradeoffs
- **Role Collision**: Since a user might have different passwords/salts for different roles in the same restaurant, the query must strictly use both `email` and `role`.
- **Efficiency**: Adding one extra query to find the `restaurant_id` is a negligible performance hit for the benefit of a cleaner UX.
