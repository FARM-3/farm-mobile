# Staff Picker Debugging Guide

## Issue
The "Paid By" field in the AggregationScreen is not loading staff members from the database (`api/staff/` or `/users/`).

## Debugging Steps

### Step 1: Check Component Rendering
When you open the AggregationScreen and go to the "Add Farmer Harvests" form, you should see a field labeled "Paid By" with a dropdown button.

**Console Logs to Look For:**
```
[SearchableStaffPicker] Loading staff data...
[SearchableStaffPicker] Opening modal, staff list size: [number]
```

If these don't appear, the component might not be rendering.

---

### Step 2: Check API Response
When the SearchableStaffPicker component mounts, it should fetch staff from the API.

**Console Logs to Look For:**
```
[staffService] Fetching staff from API...
[staffService] Making API call to endpoint: users/
[staffService] API response received: {
    status: 200,
    dataType: 'object',
    isArray: [true/false],
    dataKeys: [array of keys]
}
[staffService] Fetched [number] staff members
[staffService] Sample staff member: {...}
```

**Possible Issues:**

| Issue | Signs | Solution |
|-------|-------|----------|
| **API endpoint wrong** | 404 error or no response | Check if `users/` is correct endpoint. Try `api/staff/` instead |
| **Authentication failed** | 401 Unauthorized error | Token might be expired. Re-login to the app |
| **Empty staff list** | API returns 200 but `staffCount: 0` | Database has no staff members, or API returns data in wrong format |
| **Wrong data format** | `dataKeys` shows unexpected fields | API response structure doesn't match expected format |

---

### Step 3: Check Data Transformation
The staffService expects data in one of these formats:

**Expected Formats:**
```javascript
// Format 1: Direct array
[
    { id: 1, first_name: "John", last_name: "Doe", email: "john@example.com" },
    { id: 2, first_name: "Jane", last_name: "Smith", email: "jane@example.com" }
]

// Format 2: Paginated (DRF style)
{
    results: [
        { id: 1, first_name: "John", ... },
        { id: 2, first_name: "Jane", ... }
    ]
}

// Format 3: Nested data
{
    data: [
        { id: 1, first_name: "John", ... },
        { id: 2, first_name: "Jane", ... }
    ]
}
```

**What staffService looks for in each staff object:**
- `id`, `pk`, `_id` (for ID)
- `first_name`, `firstName` (for first name)
- `last_name`, `lastName` (for last name)
- `full_name`, `fullName`, `name` (alternative full name)
- `email` (for email)
- `username` (for username)

---

### Step 4: Check Modal & UI
Once staff data loads, you should be able to:
1. Click the "Paid By" dropdown button
2. See "Loading staff members..." message briefly
3. See a list of staff members with search box
4. See staff name and email in the list
5. See Staff ID displayed below the field after selection

**Console Logs to Look For:**
```
[SearchableStaffPicker] Opening modal, staff list size: [number]
[SearchableStaffPicker] Selected staff: [name]
```

---

## How to Test

### Local Testing
1. **Add console logs** (already done):
   - staffService logs API response
   - SearchableStaffPicker logs when modal opens

2. **Check the console** during these actions:
   - Navigate to Aggregation Screen
   - Click "Add Farmer Harvests"
   - Go to step 2 (Quality & Payment)
   - Click the "Paid By" dropdown

3. **Verify each step**:
   - Component renders? Check initial logs
   - API called? Check API response logs
   - Data formatted correctly? Check sample staff log
   - Modal opens? Check modal open log

---

## Common Solutions

### Solution 1: Wrong API Endpoint
If you see 404 errors, try changing the endpoint in [staffService.js:56](src/services/staffService.js#L56):

**Current:**
```javascript
const endpoint = 'users/';
```

**Try alternatives:**
```javascript
const endpoint = 'staff/';
const endpoint = 'api/staff/';
const endpoint = 'users/staff/';
```

---

### Solution 2: API Response Format Mismatch
If staff data is returned but not formatted correctly, modify the response parsing in [staffService.js:63-75](src/services/staffService.js#L63-L75).

**Example: If API returns `{ users: [...] }`:**
```javascript
} else if (response.data && Array.isArray(response.data.users)) {
    // Add this new format handler
    staffList = response.data.users;
}
```

---

### Solution 3: Field Names Don't Match
If staff names aren't displaying correctly, check the field names returned by the API and update [staffService.js:20-36](src/services/staffService.js#L20-L36):

**Example: If API uses `full_name` instead:**
```javascript
const firstName = staff.first_name || staff.firstName || '';
const lastName = staff.last_name || staff.lastName || '';
const fullName = staff.full_name || staff.fullName || staff.name || staff.full_name || ''; // Add here
```

---

### Solution 4: Authentication Issues
If you see 401 errors:
1. Log out and log back in
2. Check if your session token is valid
3. Clear app cache: Settings > Apps > Rugyeyo > Storage > Clear Cache

---

## Files Modified for Debugging

### [SearchableStaffPicker.js](src/components/SearchableStaffPicker.js)
- Added detailed API response logging
- Added modal open logging
- Enhanced error messages

### [staffService.js](src/services/staffService.js)
- Added API call logging
- Added response format logging
- Added sample staff data logging
- Improved error messages

---

## Next Steps After Debugging

Once you identify the issue:

1. **Document the actual API endpoint** being used
2. **Document the actual response format** from the API
3. **Update staffService.js** with correct endpoint/format if needed
4. **Test thoroughly** on AggregationScreen with Add Farmer Harvests form
5. **Clear logs** - Remove detailed console logs from production code

---

## Quick Reference

### File Locations
- **Component:** `src/components/SearchableStaffPicker.js`
- **Service:** `src/services/staffService.js`
- **Aggregation Screen:** `src/features/Aggregation/screens/AggregationScreen.js` (line 1689)
- **API Service:** `src/services/ApiService.js`

### Important Lines
- **Staff endpoint:** [staffService.js:56](src/services/staffService.js#L56)
- **Response parsing:** [staffService.js:63-75](src/services/staffService.js#L63-L75)
- **Data transformation:** [staffService.js:80-90](src/services/staffService.js#L80-L90)
- **Component rendering:** [AggregationScreen.js:1689-1703](src/features/Aggregation/screens/AggregationScreen.js#L1689-L1703)

