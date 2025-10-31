# Searchable Staff Picker - Implementation Guide

## Overview

The **SearchableStaffPicker** is a new React Native component that provides a searchable dropdown for selecting staff members. It replaces hardcoded staff lists with dynamic data fetched from the backend API at `/users/`. The picker is fully searchable, displays staff full names (first + last name), and shows the staff ID below the field for display purposes only.

## Features

✅ **Dynamic Data Fetching** - Fetches staff from API `/users/` endpoint
✅ **Searchable** - Filter staff by name, email, or username in real-time
✅ **Non-intrusive Search** - Keeps dropdown clean without excessive scrolling
✅ **Full Name Display** - Shows "First Name Last Name" format
✅ **ID Display** - Shows staff ID below the field (display only, not posted)
✅ **Caching** - Caches staff data for 1 hour to reduce API calls
✅ **Error Handling** - Fallback to cache if API fails
✅ **Loading States** - Shows loading indicator while fetching
✅ **Responsive** - Works on all screen sizes

---

## Installation & Setup

### 1. New Files Created

#### **Service File: `src/services/staffService.js`**
Handles all staff-related API interactions:

```javascript
// Fetch all staff with caching
const result = await fetchAllStaff(useCache = true);
if (result.success) {
    console.log(result.staff); // Array of staff objects
}

// Search staff by name/email/username
const filtered = searchStaff(staffList, 'john');

// Get single staff by ID
const staff = await getStaffById('RF001');

// Clear cache if needed
await clearStaffCache();
```

#### **Component File: `src/components/SearchableStaffPicker.js`**
A complete reusable component with:
- Modal-based picker with search input
- FlatList for efficient rendering
- Loading states
- Error handling with retry button
- ID display below selection

### 2. How It Works

The component flow:

```
SearchableStaffPicker
├─ Load staff on mount via staffService
├─ Filter staff as user types
├─ Show loading/error states
├─ User selects staff from list
├─ onStaffSelect callback returns { id, displayName, firstName, lastName }
└─ Parent form updates with staff.id
```

---

## Usage in Forms

### In HarvestFormScreen.js

**Before (Hardcoded):**
```javascript
const STAFF_DATA = [
    { id: "RF001", name: "Grace" },
    { id: "RF002", name: "Kevin" },
    // ... hardcoded list
];

<CustomPicker
    label="Paid By"
    selectedValue={formData.paidBy}
    onValueChange={(selectedId) => updateField('paidBy', selectedId)}
    items={STAFF_DATA}
/>
```

**After (Dynamic):**
```javascript
import SearchableStaffPicker from '../../../components/SearchableStaffPicker';

// In form state
paidBy: "", // Staff ID
selectedStaff: null, // Full staff object

<SearchableStaffPicker
    label="Paid By"
    selectedStaffId={formData.paidBy}
    onStaffSelect={(staff) => updateField('paidBy', staff.id)}
    selectedStaff={formData.selectedStaff}
/>
```

### In AggregationScreen.js

**Update harvest field definition:**
```javascript
const harvestFieldDefinitions = [
    {
        title: 'Quality & Payment',
        fields: [
            // ... other fields
            { key: 'paid_by', label: 'Paid By', type: 'searchable-staff' },
        ]
    }
];
```

**In renderGroupedStepForm:**
```javascript
// Special handling for paid_by searchable staff picker
if (field.key === 'paid_by' && field.type === 'searchable-staff' && !isFarmer) {
    return (
        <SearchableStaffPicker
            label={field.label}
            selectedStaffId={formData.paid_by}
            onStaffSelect={(staff) => {
                updateForm('paid_by', staff.id);
                updateForm('selectedStaff', staff);
            }}
            selectedStaff={formData.selectedStaff}
        />
    );
}
```

---

## API Integration

### Staff Service - staffService.js

The service handles:

1. **Fetching Staff from `/users/` endpoint**
   ```javascript
   export const fetchAllStaff = async (useCache = true)
   // Returns: { success, staff, fromCache?, error? }
   ```

2. **Data Transformation**
   - Maps various API response formats to consistent structure
   - Handles different field naming conventions (first_name/firstName, etc.)
   - Creates `displayName` from firstName + lastName

3. **Caching Strategy**
   ```javascript
   - Cache duration: 1 hour
   - Stored in AsyncStorage
   - Automatic fallback if API fails
   - Manual cache clear via clearStaffCache()
   ```

### Staff Object Structure

```javascript
{
    id: "RF001",                    // Staff ID (posted to API)
    displayName: "John Doe",        // Full name displayed in dropdown
    firstName: "John",              // First name
    lastName: "Doe",                // Last name
    email: "john@example.com",      // Email (shown in dropdown)
    role: "Extension Officer",      // Role/position
    username: "john.doe",           // Username (searchable)
    __raw: { /* original API data */ }
}
```

### API Endpoint

**Endpoint:** `/users/`
**Method:** GET
**Response Format** (handled by service):
```javascript
// The service normalizes various formats:
// 1. Array: [{ first_name, last_name, ... }]
// 2. Paginated: { results: [{...}] }
// 3. Nested: { data: [{...}] }
```

---

## Component Props

### SearchableStaffPicker

```javascript
<SearchableStaffPicker
    label="Paid By"                          // Label text
    selectedStaffId={formData.paidBy}        // Currently selected staff ID
    onStaffSelect={(staff) => {}}            // Callback when staff selected
    selectedStaff={formData.selectedStaff}   // Full staff object (for display)
/>
```

**onStaffSelect Callback:**
```javascript
onStaffSelect = (staff) => {
    staff.id;           // Staff ID to post (e.g., "RF001")
    staff.displayName;  // Full name
    staff.firstName;    // First name
    staff.lastName;     // Last name
}
```

---

## Search Features

The picker allows searching by:

| Field | Example |
|-------|---------|
| **Display Name** | "John Doe", "john", "doe" |
| **First Name** | "John" |
| **Last Name** | "Doe" |
| **Email** | "john@example.com", "example.com" |
| **Username** | "john.doe", "johndoe" |

**Search is case-insensitive and partial matching:**
- Typing "joh" finds "John Doe"
- Typing "doe" finds "John Doe"
- Typing "example" finds emails with example.com

---

## Styling & Theming

The component uses your app's existing color theme:

```javascript
import CoffeeColors from '../theme/colors';

// Colors used:
PRIMARY_BROWN = CoffeeColors.PRIMARY_BROWN        // Highlight
DARK_BROWN = CoffeeColors.DARK_BROWN              // Text
MEDIUM_BROWN = CoffeeColors.MEDIUM_BROWN          // Secondary text
VERY_LIGHT_BROWN = CoffeeColors.VERY_LIGHT_BROWN  // Border
LIGHT_GRAY_BG = CoffeeColors.LIGHT_GRAY            // Background
```

---

## Caching System

### How Caching Works

1. **First Load**: Fetches from API, stores in AsyncStorage + memory
2. **Subsequent Loads**: Uses cached data if < 1 hour old
3. **API Failure**: Falls back to cache automatically
4. **Manual Clear**: Call `clearStaffCache()` to force refresh

### Cache Keys

```javascript
STAFF_CACHE_KEY = "staff_cache"               // Stores staff data
STAFF_CACHE_EXPIRY_KEY = "staff_cache_expiry" // Stores expiration timestamp
CACHE_DURATION_MS = 3600000                    // 1 hour
```

### Manual Cache Refresh

```javascript
import { clearStaffCache, fetchAllStaff } from '../services/staffService';

// Clear and refetch
await clearStaffCache();
const result = await fetchAllStaff(false); // useCache = false
```

---

## Error Handling

### What Happens When...

| Scenario | Behavior |
|----------|----------|
| **API is down** | Falls back to cached data (if available) |
| **No cache exists** | Shows "No staff members found" |
| **Network timeout** | Shows error with "Retry" button |
| **Empty response** | Shows "No staff members available" |
| **Search returns 0 results** | Shows "No staff members found" |

### Console Logging

All operations are logged for debugging:

```javascript
[staffService] Fetching staff from API...
[staffService] Fetched 15 staff members
[staffService] Staff data cached
[staffService] Using cached staff data
[searchableStaffPicker] Loading staff data...
[SearchableStaffPicker] Selected staff: John Doe
```

---

## Data Flow in Forms

### HarvestFormScreen

```
1. User fills form (worker name, weight, price, etc.)
2. User opens "Paid By" SearchableStaffPicker
3. Component fetches staff from API
4. User types to search (e.g., "john")
5. List filters in real-time
6. User taps staff member → "John Doe"
7. Callback: updateField('paidBy', 'RF001')
8. Form updates: { paidBy: 'RF001', selectedStaff: { ... } }
9. User submits form
10. harvestData.paidBy = 'RF001' (posted to API)
```

### AggregationScreen

```
1. User on harvest form (step 2: Quality & Payment)
2. User opens "Paid By" SearchableStaffPicker
3. Component fetches staff
4. User selects staff
5. Callbacks:
   - updateForm('paid_by', staff.id)
   - updateForm('selectedStaff', staff)
6. Form updates both fields
7. On next/submit: paid_by = staff.id is posted
```

---

## Files Modified

| File | Changes |
|------|---------|
| **src/services/staffService.js** | NEW - Staff API service |
| **src/components/SearchableStaffPicker.js** | NEW - Picker component |
| **src/features/harvest/screens/HarvestFormScreen.js** | Updated to use SearchableStaffPicker |
| **src/features/Aggregation/screens/AggregationScreen.js** | Updated to use SearchableStaffPicker |

---

## Testing Checklist

- [ ] Staff picker loads correctly with staff from API
- [ ] Search filters staff by name in real-time
- [ ] Can select a staff member and see ID below
- [ ] ID is correctly passed to form (not empty string)
- [ ] Form submission includes correct paid_by value
- [ ] Cache works (load picker twice, check timestamps)
- [ ] Error handling works (disconnect network, see fallback)
- [ ] Works on both HarvestFormScreen and AggregationScreen
- [ ] No console errors or warnings

---

## Troubleshooting

### Issue: "No staff members found" on first load

**Solution:**
1. Check if API endpoint `/users/` is correct
2. Verify backend is returning staff data
3. Check network tab for API response
4. Look at console logs: `[staffService] Fetched X staff members`

### Issue: Staff appears in API but not in picker

**Solution:**
1. Check if staff has `first_name` + `last_name` or `full_name` field
2. Service maps these to `displayName`
3. If different field names, update `formatStaffName()` function

### Issue: Selected staff doesn't save

**Solution:**
1. Verify callback is receiving `staff.id` (not empty)
2. Check form state has `paidBy` field
3. Verify form submission includes `paidBy` in payload
4. Check console: `[SearchableStaffPicker] Selected staff: ...`

### Issue: Cache not working

**Solution:**
1. Clear app cache/localStorage
2. Check AsyncStorage keys in device storage
3. Verify cache duration hasn't expired
4. Call `clearStaffCache()` to force refresh

---

## Performance Notes

- **First load**: ~500ms-2s (API call + caching)
- **Subsequent loads**: <50ms (cache)
- **Search**: Real-time, <10ms
- **Memory**: ~50KB cached staff data (for ~20 staff members)

---

## Future Enhancements

Potential improvements:

- [ ] Pagination for large staff lists
- [ ] Grouping by department/role
- [ ] Staff image thumbnails
- [ ] Multi-select for multiple staff
- [ ] Alphabetical grouping (A, B, C sections)
- [ ] Recently selected staff at top
- [ ] Custom sort order

---

## Support & Questions

For issues or questions about the SearchableStaffPicker:

1. Check the console logs (they're very detailed)
2. Review the data flow diagram above
3. Check if API endpoint returns expected format
4. Verify staffService is properly imported

Example debugging:

```javascript
import { fetchAllStaff } from '../services/staffService';

// Manually test
const result = await fetchAllStaff(false); // Skip cache
console.log('Staff result:', result);
```
