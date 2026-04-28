# Order Number Autocomplete & Autofill — Design Spec

**Date:** 2026-04-28  
**Status:** Approved

## Summary

When creating a new order, typing in the Order Number field shows a dropdown of matching past orders. Selecting one autofills the form fields (buyer, seller, amount, delivery date) and clears the order number so the user must enter a new unique one.

## Scope

Single file change: `frontend/src/pages/OrdersPage.tsx`  
No new API calls, no new services, no new files.

## User Flow

1. User opens "Create Order" modal
2. Starts typing in the Order Number field
3. A dropdown appears below the field showing up to 5 matching past orders (filtered by order number, buyer party, or seller party — substring, case-insensitive)
4. User clicks a result
5. Form fields populate:
   - `buyerParty` ← from selected order
   - `sellerParty` ← from selected order
   - `amount` ← from selected order
   - `deliveryDate` ← from selected order (as a starting suggestion)
   - `orderDate` ← reset to today
   - `orderNumber` ← **cleared** (user must enter a new unique number)
6. Cursor returns to the order number field
7. Dropdown closes
8. User reviews/adjusts fields and submits

If no matches found, no dropdown is shown. If the field is empty, no dropdown is shown.

## State Changes

New local state added to the Create Order form section:

```ts
const [autocompleteResults, setAutocompleteResults] = useState<Order[]>([]);
const [showAutocomplete, setShowAutocomplete] = useState(false);
```

## Data Flow

```
user types in orderNumber field
  → filter orders[] already in memory (no extra API call)
  → setAutocompleteResults(matches.slice(0, 5))
  → render dropdown below input
  → user selects match
  → setCreateForm({ buyerParty, sellerParty, amount, deliveryDate, orderDate: today, orderNumber: '' })
  → setShowAutocomplete(false)
  → focus orderNumber input
```

## UI Spec

- Dropdown renders as an absolutely-positioned list below the order number input
- Each row shows: order number (bold) + buyer → seller + amount
- Matches the existing modal's colour scheme and border radius
- Dismisses on: item selection, Escape key, or click outside the input+dropdown area
- Max 5 results shown; no pagination needed

## Edge Cases

| Scenario | Behaviour |
|---|---|
| No matches | Dropdown hidden |
| Empty input | Dropdown hidden |
| Exact match typed | Dropdown still shows; user can clear and enter new number |
| User ignores dropdown | Types full new order number — works as before |
| Modal closed and reopened | Autocomplete state reset with the rest of the form |

## Out of Scope

- Saving named templates
- Autofilling from despatch advices or invoices
- Keyboard arrow-key navigation in dropdown (nice-to-have, not required)
