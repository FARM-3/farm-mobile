# Paid By Field - File Location Reference

Quick reference guide showing exactly where to find the paid_by field implementation.

---

## Core Service File

### 1. Staff Service
**File**: `src/services/staffService.js`

#### Endpoint Configuration
**Line 56**: Endpoint definition
```javascript
const endpoint = 'staff/'; // Correct endpoint per API schema
```

#### Field Mapping
**Lines 80-90**: Transform API response to internal format
```javascript
const formattedStaff = staffList.map((staff, index) => ({
    id: staff.staff_id || staff.id || staff.pk || staff._id || `staff_${index}`,
    displayName: staff.full_name || formatStaffName(staff),
    firstName: staff.first_name || staff.firstName || '',
    lastName: staff.last_name || staff.lastName || '',
    email: staff.email || '',
    role: staff.role || staff.position || '',
    username: staff.username || '',
    __raw: staff,
}));
```

#### Error Logging
**Line 107**: Error message endpoint reference
```javascript
endpoint: 'staff/'  // Fixed from 'users/'
```

---

## Component Files

### 2. SearchableStaffPicker Component
**File**: `src/components/SearchableStaffPicker.js`

#### Import staffService
**Line 22**: Import staff service functions
```javascript
import { fetchAllStaff, searchStaff } from '../services/staffService';
```

#### Load Staff Data
**Lines 74-104**: Fetch staff from API or cache
```javascript
const loadStaffData = async () => {
    setIsLoading(true);
    const result = await fetchAllStaff(true); // Uses cached data
    // Handle success/error states
};
```

#### Search Filtering
**Lines 62-69**: Real-time search
```javascript
useEffect(() => {
    if (searchTerm.trim() === '') {
        setFilteredStaff(staffList);
    } else {
        const filtered = searchStaff(staffList, searchTerm);
        setFilteredStaff(filtered);
    }
}, [searchTerm, staffList]);
```

#### Error States
**Lines 202-225**: Handle loading, error, and empty states

#### User Interface
**Lines 239-265**: Dropdown button and selected ID display

#### Selection Handling
**Lines 109-119**: Handle staff member selection
```javascript
const handleSelectStaff = (staff) => {
    console.log('[SearchableStaffPicker] Selected staff:', staff.displayName);
    onStaffSelect({
        id: staff.id,
        displayName: staff.displayName,
        firstName: staff.firstName,
        lastName: staff.lastName,
    });
    setModalVisible(false);
    setSearchTerm('');
};
```

---

## Screen Files

### 3. AggregationScreen
**File**: `src/features/Aggregation/screens/AggregationScreen.js`

#### Import Component
**Line 25**: Import SearchableStaffPicker
```javascript
import SearchableStaffPicker from '../../../components/SearchableStaffPicker';
```

#### Field Definition
**Line 156** (in harvestFieldDefinitions): Define paid_by field
```javascript
const harvestFieldDefinitions = [
    { key: 'paid_by', label: 'Paid By', type: 'searchable-staff' },
    // ... other fields
];
```

#### Form State Initialization
**Line 1048**: Initialize harvest form with paid_by
```javascript
const [harvestForm, setHarvestForm] = useState({
    farmer_uid: '',
    farmer_name: '',
    weight_on_delivery: '',
    harvest_id: '',
    date_of_delivery: new Date().toISOString().slice(0,10),
    coffee_type: '',
    price_per_kg: '',
    amount_paid: '',
    paid_by: '',           // Initialized empty
    selectedStaff: null,   // Initialized null
    number_of_bags: ''
});
```

#### Component Rendering
**Lines 1759-1773**: Render SearchableStaffPicker for paid_by field
```javascript
if (field.key === 'paid_by' && field.type === 'searchable-staff' && !isFarmer) {
    console.log('[AggregationScreen] Rendering SearchableStaffPicker for paid_by field');
    return (
        <SearchableStaffPicker
            key={field.key}
            label={`${field.label}${field.required ? ' *' : ''}`}
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

### 4. HarvestFormScreen
**File**: `src/features/harvest/screens/HarvestFormScreen.js`

#### Import Component
**Line 9**: Import SearchableStaffPicker
```javascript
import SearchableStaffPicker from '../../../components/SearchableStaffPicker';
```

#### Step Definition
**Line 231**: Define Step 2 with paidBy as required field
```javascript
{ title: 'Delivery & Finance', Component: Step2_DeliveryAndFinance, requiredFields: ['weight', 'pricePerKg', 'paidBy'] },
```

#### Form State Initialization
**Lines 242-243**: Initialize paidBy in form state
```javascript
paidBy: "", // Staff ID - will be set by SearchableStaffPicker
selectedStaff: null, // Full staff object from SearchableStaffPicker
```

#### Component Usage
**Lines 216-221**: Use SearchableStaffPicker in Step 2
```javascript
<SearchableStaffPicker
    label="Paid By"
    selectedStaffId={formData.paidBy}
    onStaffSelect={(staff) => updateField('paidBy', staff.id)}
    selectedStaff={formData.selectedStaff}
/>
```

#### Form Submission
**Line 480**: Include paidBy in form submission
```javascript
paidBy: formData.paidBy, // Integer PK (don't trim)
```

---

## Configuration & Constants

### API Schema Location
The OpenAPI specification defines:
- **Endpoint**: `/api/staff/`
- **Response**: Paginated format with `results` array
- **Primary Fields**: `staff_id`, `full_name`

This matches the implementation in staffService.js.

---

## Data Flow Path

```
1. User taps "Paid By" dropdown
   ↓
2. SearchableStaffPicker.js line 241-244 opens modal
   ↓
3. SearchableStaffPicker.js line 74-104 calls fetchAllStaff()
   ↓
4. staffService.js line 56 calls endpoint: 'staff/'
   ↓
5. staffService.js lines 80-90 transforms response with correct fields
   ↓
6. SearchableStaffPicker renders list and handles search
   ↓
7. User selects staff member
   ↓
8. SearchableStaffPicker.js line 109-119 calls onStaffSelect callback
   ↓
9. AggregationScreen.js/HarvestFormScreen.js line ~1768 updates form:
   - paid_by: staff.id
   - selectedStaff: staff object
   ↓
10. User submits harvest
    ↓
11. Form sends paid_by with selected staff ID
```

---

## Quick Location Summary

| Task | File | Line(s) |
|------|------|---------|
| Check endpoint | staffService.js | 56 |
| Check field mapping | staffService.js | 81-82 |
| Check error logging | staffService.js | 107 |
| View SearchableStaffPicker | SearchableStaffPicker.js | 1-300+ |
| AggregationScreen import | AggregationScreen.js | 25 |
| AggregationScreen field definition | AggregationScreen.js | 156 |
| AggregationScreen form state | AggregationScreen.js | 1048 |
| AggregationScreen rendering | AggregationScreen.js | 1759-1773 |
| HarvestFormScreen import | HarvestFormScreen.js | 9 |
| HarvestFormScreen form state | HarvestFormScreen.js | 242-243 |
| HarvestFormScreen component | HarvestFormScreen.js | 216-221 |
| HarvestFormScreen submission | HarvestFormScreen.js | 480 |

---

## Testing Entry Points

### Test 1: AggregationScreen
Navigate to: `src/features/Aggregation/screens/AggregationScreen.js`
- Rendering at line 1759-1773
- Form state at line 1048
- Look for "Paid By" field in Step 2

### Test 2: HarvestFormScreen
Navigate to: `src/features/harvest/screens/HarvestFormScreen.js`
- Component at line 216-221
- Form state at line 242-243
- Look for "Paid By" in Step 2 (Delivery & Finance)

### Test 3: Service
Navigate to: `src/services/staffService.js`
- Endpoint at line 56
- Field mapping at line 81-82
- Console logs during API call

---

## Line-by-Line Verification

**staffService.js verification**:
```
Line 56:  endpoint = 'staff/'  (NOT 'users/')
Line 81:  id: staff.staff_id  (Primary ID field)
Line 82:  displayName: staff.full_name  (Display name field)
Line 107: endpoint: 'staff/'  (Error logging)
```

**AggregationScreen.js verification**:
```
Line 25:   import SearchableStaffPicker
Line 156:  { key: 'paid_by', label: 'Paid By', type: 'searchable-staff' }
Line 1048: paid_by: '', selectedStaff: null
Line 1759: if (field.key === 'paid_by' && field.type === 'searchable-staff')
Line 1762: <SearchableStaffPicker
```

**HarvestFormScreen.js verification**:
```
Line 9:    import SearchableStaffPicker
Line 216:  <SearchableStaffPicker
Line 242:  paidBy: "",
Line 480:  paidBy: formData.paidBy,
```

---

## Browser/File Explorer Navigation

### Quickest Path to Check Implementation
1. Open project in code editor
2. Go to: `src/services/staffService.js`
3. Go to line 56 → See endpoint
4. Go to line 81-82 → See field mapping
5. Go to line 107 → See error logging

### To Test AggregationScreen
1. Navigate to: `src/features/Aggregation/screens/AggregationScreen.js`
2. Search for: `paid_by`
3. Should find lines 156, 1048, 1759-1773

### To Test HarvestFormScreen
1. Navigate to: `src/features/harvest/screens/HarvestFormScreen.js`
2. Search for: `paidBy` or `SearchableStaffPicker`
3. Should find lines 9, 216-221, 242, 480

---

## Summary

All implementation files are in place and correctly configured:
- ✅ staffService.js: Uses correct endpoint and field mapping
- ✅ SearchableStaffPicker.js: Imports and uses staffService correctly
- ✅ AggregationScreen.js: Imports and renders component correctly
- ✅ HarvestFormScreen.js: Imports and uses component correctly

**Status**: Ready for testing in the app.
