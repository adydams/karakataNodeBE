# Implementation Plan: Edit Profile and Product Table Pagination/Filtering

## Feature 1: Edit Profile Functionality

### Goals
- Update `EditProfileModal.tsx` to use the standardized `apiUsers.updateProfile` service instead of direct `axios` calls.
- Ensure `Profile.tsx` correctly triggers the `EditProfileModal` via `useModal`.

### Changes
#### 1. `karakatacommerce/src/components/adminDashboard/EditProfileModal.tsx`
- **Remove** `import axios from "axios";`.
- **Add** `import { updateProfile } from "../../services/apiUsers";`.
- **Modify** `handleSubmit` function:
  - Replace the `axios.put` call with `await updateProfile(formData);`.
  - Remove the manual token retrieval from `localStorage` and the headers configuration, as `axiosInstance` in `apiUsers.ts` handles this.

#### 2. `karakatacommerce/src/pages/adminDashboard/Profile.tsx`
- The button already calls `openModal(<EditProfileModal user={user} />)`. I will verify if the modal renders correctly. If the user reports it "does nothing", I will check the `useModal` context provider implementation to ensure the modal is being rendered in the DOM.

---

## Feature 2: Product Table Pagination and Filtering

### Goals
- Transition the product list from client-side to server-side pagination and filtering.
- Implement search and category filtering.
- Match the UX pattern used in `Orders.tsx`.

### Changes
#### 1. `karakatacommerce/src/services/adminDashboard/apiProducts.ts`
- **Modify** `getProducts` function:
  - Accept a `params` object: `getProducts(params: { limit: number, offset: number, search?: string, categoryId?: string })`.
  - Use `URLSearchParams` or string interpolation to append these parameters to the request: `/api/products?limit=${params.limit}&offset=${params.offset}&search=${params.search || ''}&categoryId=${params.categoryId || ''}`.

#### 2. `controllers/productController.js`
- **Modify** `exports.getAll` function:
  - Extract `limit`, `offset`, `search`, and `categoryId` from `req.query`.
  - Convert `limit` and `offset` to numbers.
  - Pass these values to `ProductService.getAllProducts`.
  - Update the response format to include the total count: `{ success: true, data: products, total: totalCount }`.

#### 3. `services/productServices.js`
- **Modify** `getAllProducts` function:
  - Accept the filter parameters.
  - Create a `where` clause using Sequelize `Op`:
    - `isDeleted: false`
    - If `search` is provided, use `Op.or` with `Op.like` (or `Op.iLike` for Postgres) on `name` and `description`.
    - If `categoryId` is provided, add it to the `where` clause.
  - Replace `Product.findAll` with `Product.findAndCountAll` to retrieve both the product list and the total number of matching records.
  - Apply `limit` and `offset` in the options.
  - Keep the logic that iterates through results to calculate `currentPrice`, `isDiscounted`, and `originalPrice`.
  - Return an object containing `{ products, total }`.

#### 4. `karakatacommerce/src/pages/adminDashboard/Products.tsx`
- **State Management**:
  - Add state for `search`, `page`, `limit`, and `categoryId`.
  - Add "temporary" state for inputs (`tempSearch`, `tempCategoryId`) to avoid rerendering on every keystroke.
- **Data Fetching**:
  - Update `useQuery` for `products`:
    - `queryKey`: Include `page`, `search`, `limit`, and `categoryId`.
    - `queryFn`: Pass these states to `getProducts`.
  - Remove client-side pagination logic (`allProducts.slice(...)`).
- **UI Updates**:
  - Add a search input field and a category dropdown selector in the table header.
  - Implement `applyFilters` function: updates the actual filter states and resets `page` to 1.
  - Add a "Loading" overlay using `isFetching` or `isApplying` state, similar to `Orders.tsx`.
  - Update `DashboardPagination` to use the `total` count returned from the API.
  - Ensure `onPageChange` updates the `page` state.

### Dependencies & Sequencing
1. **Backend**: Update `ProductService` $\rightarrow$ `productController`.
2. **API**: Update `apiProducts.ts`.
3. **Frontend**: Update `Products.tsx` to utilize the new API and implement the UI filters.
