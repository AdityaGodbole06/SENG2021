# Phase 2 PRD: Digital Trade Frontend Application

**Project:** Integrated Digital Trade (DigitalBook)  
**Timeline:** 1 week  
**Stack:** React + Tailwind CSS + TypeScript  
**Users:** Buyer & Supplier roles  
**Modules:** Orders, Dispatch, Invoices  

---

## 1. Overview

A desktop-first SaaS dashboard for SMEs managing digital trade workflows. Users can create, track, and manage UBL business documents (Orders, Despatch Advice, Invoices) across a distributed API ecosystem.

### Key Goals
- Integrate 3 external APIs with different auth mechanisms
- Enable both Buyer and Supplier workflows in one interface
- Provide real-time tracking and status visibility
- Generate/download UBL-compliant XML documents

---

## 2. Architecture

### APIs to Integrate
1. **Order Service** — https://www.chalksniffer.com/docs/
2. **Dispatch Service** — http://13.236.86.146:3000/api-docs/#/
3. **Invoice Service** — https://docs.gptless.au/

### Auth Strategy
- Unified auth wrapper that handles token/credential switching per API
- localStorage-based token storage with refresh logic
- Session management across multiple endpoints

### Frontend Structure
```
src/
├── components/          # Reusable components
│   ├── ui/             # Primitive components (Button, Card, Input, etc.)
│   ├── layouts/        # DashboardLayout, Header, Sidebar
│   └── features/       # Orders, Dispatch, Invoices feature components
├── pages/              # Route pages
├── hooks/              # Custom hooks (useAuth, useApi, etc.)
├── services/           # API clients for each external service
├── types/              # TypeScript interfaces
├── context/            # Auth & app state context
├── utils/              # Helpers, formatters, validators
└── styles/             # Tailwind config extensions
```

---

## 3. Feature Specifications

### 3.1 Orders Module

#### Buyer Workflow
- **List**: Table showing all orders with search, status filter, date filter
- **Create**: Form to create new order with validation
- **View/Edit**: Detail page with order editing capability
- **Actions**: Delete, Create Dispatch from Order
- **Download**: Export order as UBL XML

**Key Fields**
- Order ID, Buyer Party, Seller Party, Amount, Order Date, Delivery Date, Status

#### Supplier Workflow
- **Receive**: View orders placed by buyers
- **Respond**: Create Despatch Advice from order
- **Track**: Monitor order fulfillment status

---

### 3.2 Dispatch Module

#### Supplier Workflow
- **List**: All dispatch advices with search, status filter, date filter
- **Create**: Form to generate Despatch from Order document
- **View**: Detail view with delivery tracking
- **Edit/Delete**: Modify dispatch records
- **Download**: Export as UBL XML

**Key Fields**
- Dispatch ID, Order Ref, Delivery Party, Dispatch Date, Expected Arrival, Status, Discrepancies

#### Buyer Workflow
- **Receive**: View inbound despatch advices
- **Track**: Monitor delivery status (In Transit, Delivered, Issues)

---

### 3.3 Invoices Module

#### Seller Workflow
- **Create**: Generate invoice from order
- **List**: All invoices with status tracking
- **View**: Invoice details
- **Delete**: Remove invoice
- **Download**: PDF export

**Key Fields**
- Invoice ID, Order ID, Buyer Party, Total Amount, Invoice Date, Due Date, Status (Unpaid, Paid, Overdue)

#### Buyer Workflow
- **View**: Received invoices
- **Process**: Mark as paid, view payment history
- **Download**: PDF for records

---

## 4. UI/UX Design

### Design System

**Color Palette**
- Primary: Blue (#3B82F6)
- Secondary: Indigo (#6366F1)
- Success: Green (#10B981)
- Warning: Amber (#F59E0B)
- Danger: Red (#EF4444)
- Neutral: Gray scale (dark mode: #1F2937 bg, #F3F4F6 text)

**Typography**
- Heading: Inter, Bold (24px, 20px, 18px)
- Body: Inter, Regular (16px, 14px)
- Mono: JetBrains Mono (API responses, codes)

**Spacing**: 4px base unit (4, 8, 12, 16, 20, 24, 32px)  
**Radius**: 6px (buttons), 8px (cards), 12px (dialogs)  
**Shadows**: Subtle elevation system (1-4 levels)

### Layout
- **Sidebar**: 280px fixed, collapsible on mobile
- **Header**: 64px with user menu, notifications placeholder
- **Main Content**: Full width with 32px padding
- **Max Width**: 1400px for data-heavy tables

### Dark Mode
- Toggle in top-right corner (saved to localStorage)
- All components support both light/dark variants
- WCAG AA contrast ratios maintained

---

## 5. Key Components to Build

### UI Primitives (`src/components/ui/`)
- Button (variants: primary, secondary, outline, ghost, danger)
- Card (with header, body, footer sections)
- Input (text, email, number, date inputs)
- Select/Dropdown
- Badge (status indicators)
- Modal/Dialog
- Table (sortable, filterable)
- Tabs
- Toast notifications
- SearchBar

### Feature Components
- OrdersList, OrderForm, OrderDetail
- DispatchList, DispatchForm, DispatchDetail
- InvoicesList, InvoiceDetail, InvoiceGenerator
- DashboardLayout (sidebar, header)
- Navbar with role switcher (Buyer/Supplier)
- StatusBadge (color-coded status)
- DocumentDownloader (XML/PDF export)
- AuthProvider & useAuth hook
- ApiClient with unified auth

---

## 6. API Integration

### Auth Management
```typescript
// Unified token manager
interface ApiCredentials {
  ordersApi: { token?: string; apiKey?: string };
  dispatchApi: { token?: string; apiKey?: string };
  invoicesApi: { token?: string; apiKey?: string };
}

// Auto-inject credentials into each API call
```

### Error Handling
- Retry logic (3 attempts with exponential backoff)
- User-friendly error messages in toast notifications
- Log errors to console in dev mode
- Graceful degradation if one API is down

### Response Caching
- Cache GET requests for 5 minutes
- Invalidate cache on POST/PUT/DELETE
- useQuery hooks for data fetching

---

## 7. User Workflows

### Buyer Journey
1. Login → Dashboard
2. Create Order (form validates, calls Orders API)
3. View Order List (search, filter, sort)
4. Receive Dispatch Advice (auto-synced from supplier)
5. View Invoice (when seller sends)
6. Mark Invoice as Paid
7. Export any document as XML/PDF

### Supplier Journey
1. Login → Dashboard (switch to Supplier role)
2. View Incoming Orders (search, filter)
3. Create Dispatch Advice from Order
4. Create Invoice from Order
5. Track Dispatch Status
6. Export documents

---

## 8. Acceptance Criteria

- [ ] All 3 modules (Orders, Dispatch, Invoices) fully functional
- [ ] Create, Read, Update, Delete operations work end-to-end
- [ ] Search and filtering responsive (<200ms)
- [ ] Dark mode toggle works on all pages
- [ ] API errors handled gracefully with user feedback
- [ ] Documents can be downloaded as XML/PDF
- [ ] Responsive on desktop (mobile not required)
- [ ] All components use Tailwind (no custom CSS)
- [ ] TypeScript types for all data structures
- [ ] Authentication tokens managed securely
- [ ] Lighthouse score >80 for performance

---

## 9. Success Metrics

- **Code Quality**: TypeScript strict mode, no console errors
- **Performance**: <2s page load, <100ms user interactions
- **UX**: All workflows completable in <5 clicks
- **Reliability**: 0 runtime errors on happy path, graceful errors on sad path

---

## 10. Timeline Breakdown (1 Week)

| Day | Tasks |
|-----|-------|
| Day 1 | Project setup, UI components, layout |
| Day 2 | Orders module (list, create, detail) |
| Day 3 | Dispatch module (list, create, detail) |
| Day 4 | Invoices module (list, detail, actions) |
| Day 5 | API integration, auth handling, error handling |
| Day 6 | Testing, dark mode, polish |
| Day 7 | Final review, deployment, documentation |

---

## 11. Post-MVP Enhancements

- Real-time notifications when documents arrive
- Advanced analytics dashboard
- Batch operations (bulk create, bulk export)
- Custom document templates
- Payment gateway integration
- Email notifications
- Mobile app
- Multi-language support

