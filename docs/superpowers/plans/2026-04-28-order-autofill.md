# Order Number Autocomplete & Autofill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When creating a new order, typing in the Order Number field shows a filtered dropdown of past orders; selecting one autofills buyer, seller, amount, and delivery date, then clears the order number so the user must enter a fresh unique one.

**Architecture:** All changes are in `frontend/src/pages/OrdersPage.tsx`. Two new state variables (`autocompleteResults`, `showAutocomplete`) drive the dropdown. The existing `orders` array (already in memory) is filtered client-side on every keystroke — no new API calls. A `useRef` on a wrapper div handles outside-click dismissal.

**Tech Stack:** React 18, TypeScript, TailwindCSS, existing `Order` type from `orderService`

---

### Task 1: Add autocomplete state and filter logic

**Files:**
- Modify: `frontend/src/pages/OrdersPage.tsx` (state declarations ~line 36, imports ~line 1)

- [ ] **Step 1: Add two new state variables after the existing `createFieldErrors` state (around line 38)**

```tsx
const [autocompleteResults, setAutocompleteResults] = useState<Order[]>([])
const [showAutocomplete, setShowAutocomplete] = useState(false)
```

- [ ] **Step 2: Add a `useRef` import and declare the wrapper ref (add `useRef` to the React import on line 1, then declare ref after the state block)**

Change line 1 from:
```tsx
import React, { useState, useEffect } from 'react'
```
To:
```tsx
import React, { useState, useEffect, useRef } from 'react'
```

Then add after the state declarations:
```tsx
const autocompleteRef = useRef<HTMLDivElement>(null)
```

- [ ] **Step 3: Add a `useEffect` that dismisses the dropdown on outside click (add after existing useEffects)**

```tsx
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
      setShowAutocomplete(false)
    }
  }
  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [])
```

- [ ] **Step 4: Add the `handleOrderNumberChange` handler (add after `validateEditForm` around line 139)**

```tsx
const handleOrderNumberChange = (value: string) => {
  setFormData(prev => ({ ...prev, orderNumber: value }))
  setCreateFieldErrors(prev => ({ ...prev, orderNumber: '' }))

  if (!value.trim()) {
    setAutocompleteResults([])
    setShowAutocomplete(false)
    return
  }

  const q = value.toLowerCase()
  const matches = orders.filter(o =>
    o.orderNumber.toLowerCase().includes(q) ||
    o.buyerParty.toLowerCase().includes(q) ||
    o.sellerParty.toLowerCase().includes(q)
  ).slice(0, 5)

  setAutocompleteResults(matches)
  setShowAutocomplete(matches.length > 0)
}
```

- [ ] **Step 5: Add the `handleAutofill` handler (add directly after `handleOrderNumberChange`)**

```tsx
const handleAutofill = (order: Order) => {
  setFormData(prev => ({
    ...prev,
    orderNumber: '',
    buyerParty: order.buyerParty,
    sellerParty: order.sellerParty,
    amount: String(order.amount),
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: order.deliveryDate
      ? new Date(order.deliveryDate).toISOString().split('T')[0]
      : '',
  }))
  setAutocompleteResults([])
  setShowAutocomplete(false)
  setCreateFieldErrors({})
}
```

- [ ] **Step 6: Reset autocomplete when the create modal closes — update the existing onClose handler on the Create Order Modal (around line 598)**

Change:
```tsx
onClose={() => { setIsCreateModalOpen(false); setCreateFieldErrors({}) }}
```
To:
```tsx
onClose={() => {
  setIsCreateModalOpen(false)
  setCreateFieldErrors({})
  setShowAutocomplete(false)
  setAutocompleteResults([])
}}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/OrdersPage.tsx
git commit -m "feat: add autocomplete state and filter logic for order autofill"
```

---

### Task 2: Replace the Order Number input with autocomplete UI

**Files:**
- Modify: `frontend/src/pages/OrdersPage.tsx` (Create Order Modal, order number field ~line 603)

- [ ] **Step 1: Wrap the Order Number field in a relative-positioned `div` with the ref, and replace the `onChange` handler**

Replace the entire Order Number `<div>` block (lines ~603–616):
```tsx
<div>
  <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
    Order Number *
  </label>
  <Input
    value={formData.orderNumber}
    onChange={(e) => {
      setFormData({ ...formData, orderNumber: e.target.value })
      setCreateFieldErrors(prev => ({ ...prev, orderNumber: '' }))
    }}
    placeholder='ORD-001'
    error={createFieldErrors.orderNumber}
  />
</div>
```

With:
```tsx
<div className='relative' ref={autocompleteRef}>
  <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
    Order Number *
  </label>
  <Input
    value={formData.orderNumber}
    onChange={(e) => handleOrderNumberChange(e.target.value)}
    onKeyDown={(e) => { if (e.key === 'Escape') setShowAutocomplete(false) }}
    placeholder='ORD-001 or type to search past orders'
    error={createFieldErrors.orderNumber}
    autoComplete='off'
  />
  {showAutocomplete && (
    <ul className='absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg overflow-hidden'>
      {autocompleteResults.map((order) => (
        <li
          key={order.orderNumber}
          className='px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors'
          onMouseDown={(e) => {
            e.preventDefault()
            handleAutofill(order)
          }}
        >
          <div className='flex items-center justify-between gap-2'>
            <span className='font-medium text-sm text-slate-900 dark:text-slate-100 truncate'>
              {order.orderNumber}
            </span>
            <span className='text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap'>
              ${order.amount.toFixed(2)}
            </span>
          </div>
          <div className='text-xs text-slate-500 dark:text-slate-400 truncate'>
            {order.buyerParty} → {order.sellerParty}
          </div>
        </li>
      ))}
    </ul>
  )}
</div>
```

- [ ] **Step 2: Verify the frontend builds without TypeScript errors**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/OrdersPage.tsx
git commit -m "feat: render autocomplete dropdown on order number input"
```

---

### Task 3: Manual smoke test

- [ ] **Step 1: Start backend**
```bash
npm start
```

- [ ] **Step 2: Start frontend**
```bash
cd frontend && npm run dev
```

- [ ] **Step 3: Log in, create at least one order, then open Create Order modal**

- [ ] **Step 4: Type the first few characters of an existing order number — confirm dropdown appears with matching rows**

- [ ] **Step 5: Click a result — confirm all fields populate, order number is cleared, order date is today**

- [ ] **Step 6: Type a brand-new order number (no match) — confirm no dropdown appears**

- [ ] **Step 7: Press Escape while dropdown is open — confirm it closes**

- [ ] **Step 8: Click outside the input while dropdown is open — confirm it closes**
