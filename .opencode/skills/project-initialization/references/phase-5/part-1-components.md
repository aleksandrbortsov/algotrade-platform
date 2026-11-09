# Phase 5 - Part 1: Components

> **Step file.** Component documentation for NEW_PROJECT and EXISTING_PROJECT.
>
> **Parent:** [requirements.md](../requirements.md) - Phase 5 router
> **Read first:** [overview.md](overview.md) - adaptive mode and the skip-by-default policy that govern every Part
> **Next step file:** [part-1-5-api-docs.md](part-1-5-api-docs.md) - API documentation discovery

---

## Part 1: Components Documentation

### For NEW_PROJECT

Ask progressively:

```
1. What are the main features or sections of your application?
   (List 3-5 key features, e.g., "User auth, Product catalog, Shopping cart")

2. Are there any specific components you know you'll need?
   (e.g., "Data tables, Charts, Forms, Modal dialogs")
```

Document as:
```markdown
## Project Components & Their Purpose

**Main Features:**
1. User Authentication - Login, registration, password reset
2. Product Catalog - Browse, search, filter products
3. Shopping Cart - Add to cart, quantity management
4. Checkout - Payment processing, order confirmation

**Planned Components:**
- DataTable: Sortable, filterable table for product lists
- ChartWidget: Analytics charts using Chart.js
- FormBuilder: Dynamic form generation
- ImageGallery: Product image viewer with zoom
```

### For EXISTING_PROJECT

1. **Scan component files** in `src/components/`, `src/pages/`
2. **Generate inventory** with brief purpose for each:
   ```markdown
   ## Project Components & Their Purpose
   
   **Pages/Routes:**
   - HomePage (src/pages/Home.tsx): Landing page with hero and features
   - DashboardPage (src/pages/Dashboard.tsx): User dashboard with stats
   - ProductListPage (src/pages/ProductList.tsx): Paginated product grid
   
   **UI Components:**
   - Button (src/shared/components/Button.tsx): Reusable button with variants
   - Modal (src/shared/components/Modal.tsx): Accessible modal dialog
   - Card (src/shared/components/Card.tsx): Content card wrapper
   
   **Feature Components:**
   - UserProfile (src/features/user/Profile.tsx): User profile management
   - ProductCard (src/features/products/Card.tsx): Product display card
   - CartSummary (src/features/cart/Summary.tsx): Cart totals and checkout button
   ```
