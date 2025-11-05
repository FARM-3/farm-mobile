# Staff Endpoint 404 Error - Fix Guide

## Issue
The app is trying to fetch staff from `users/` endpoint but getting **404 Not Found** error.

```
ERROR  [ApiService] Response error: {"status": 404, "url": "users/", "message": "Request failed with status code 404"}
```

---

## Solution: Find the Correct Endpoint

The endpoint `users/` doesn't exist on your backend. You need to find the actual endpoint for fetching staff/users.

### Step 1: Check Your Backend Documentation
Ask your backend team or check the Django admin panel for:
- **What endpoint returns a list of all users/staff?**
- **What are the available user/staff management endpoints?**

### Step 2: Try These Common Patterns
If you don't have documentation, try these endpoints one by one:

| Endpoint | Likely Use | How to Try |
|----------|-----------|-----------|
| `staff/` | Staff members | Change line 57 in `src/services/staffService.js` to `'staff/'` |
| `api/staff/` | Alternative staff endpoint | Change line 57 to `'api/staff/'` |
| `users/list/` | Explicit list users | Change line 57 to `'users/list/'` |
| `users/staff/` | Users marked as staff | Change line 57 to `'users/staff/'` |
| `aggregation/staff/` | Staff in aggregation module | Change line 57 to `'aggregation/staff/'` |

### Step 3: Test Each Endpoint

1. **Edit the file:** `src/services/staffService.js` (line 57)
2. **Change this line:**
   ```javascript
   let endpoint = 'users/'; // Change to your endpoint
   ```
3. **Run the app** and check console for logs:
   ```
   [staffService] API response received: {status: 200, ...}
   ```
4. **If you see status 200**, the endpoint is correct!
5. **If you see status 404 or 401**, try the next endpoint

---

## How to Identify the Correct Response Format

Once you find the working endpoint, the API should return staff data in one of these formats:

### Format 1: Direct Array
```json
[
  {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "username": "johndoe"
  },
  {
    "id": 2,
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com",
    "username": "janesmith"
  }
]
```

### Format 2: Paginated (DRF)
```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com"
    },
    {
      "id": 2,
      "first_name": "Jane",
      "last_name": "Smith",
      "email": "jane@example.com"
    }
  ]
}
```

### Format 3: Nested Data
```json
{
  "data": [
    {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com"
    },
    {
      "id": 2,
      "first_name": "Jane",
      "last_name": "Smith",
      "email": "jane@example.com"
    }
  ]
}
```

**The app supports ALL these formats automatically**, so any of them will work!

---

## File to Modify

**File:** `src/services/staffService.js`

**Line to change:** Line 57

**Current:**
```javascript
let endpoint = 'users/';
```

**Change to the correct endpoint:**
```javascript
let endpoint = 'staff/'; // Replace 'staff/' with your endpoint
```

---

## Console Logs to Watch For

### Success Indicators
```
[staffService] API response received: {
  status: 200,
  dataType: 'object',
  isArray: true or false,
  dataKeys: [...]
}
[staffService] Fetched 5 staff members
[staffService] Sample staff member: {
  id: "1",
  displayName: "John Doe",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com"
}
[SearchableStaffPicker] Loaded 5 staff members
```

### Error Indicators
```
[staffService] Error fetching staff: {
  status: 404,
  message: "Request failed with status code 404"
}
```

---

## If You Can't Find the Endpoint

If the backend doesn't have a staff endpoint, you have these options:

### Option 1: Create Staff Endpoint on Backend
Ask your backend team to create an endpoint that returns all staff/users:
```
GET /api/staff/
Response: [{ id, first_name, last_name, email, username, ... }]
```

### Option 2: Use Current User's Organization Staff
Fetch staff from the current user's organization or related users:
- Ask backend for related users endpoint
- Example: `/api/organizations/{id}/staff/`

### Option 3: Hardcode Staff Members
If you only have a few staff members, you can hardcode them in the app temporarily:

**File:** `src/services/staffService.js`

**Replace the fetchAllStaff function with:**
```javascript
export const fetchAllStaff = async (useCache = true) => {
    // Temporary hardcoded staff list
    const staffList = [
        { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
        { id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
        { id: 3, first_name: 'Bob', last_name: 'Johnson', email: 'bob@example.com' },
    ];

    const formattedStaff = staffList.map((staff, index) => ({
        id: staff.id,
        displayName: `${staff.first_name} ${staff.last_name}`,
        firstName: staff.first_name,
        lastName: staff.last_name,
        email: staff.email,
        role: '',
        username: staff.email.split('@')[0],
        __raw: staff,
    }));

    return { success: true, staff: formattedStaff, fromCache: false };
};
```

---

## Quick Fix Checklist

- [ ] Ask backend team for staff/users endpoint URL
- [ ] Check backend Django admin or API documentation
- [ ] Test the endpoint in Postman/Insomnia with Authorization header
- [ ] Update `src/services/staffService.js` line 57 with correct endpoint
- [ ] Run app and check console logs
- [ ] Verify staff list loads in the Paid By dropdown
- [ ] Test staff selection works end-to-end

---

## Example: How to Test Endpoint in Postman

1. **Get your Authorization token:**
   - Login to the app
   - Check console for the access token being set

2. **In Postman:**
   - Method: `GET`
   - URL: `http://142.93.94.236:8000/api/[ENDPOINT]/` (replace [ENDPOINT])
   - Header: `Authorization: Bearer [YOUR_ACCESS_TOKEN]`
   - Click Send

3. **Check response:**
   - Status 200 = Endpoint works!
   - Status 404 = Endpoint doesn't exist
   - Status 401 = Authentication failed (expired token)

---

## Files Modified
- `src/services/staffService.js` - Added comments about endpoint options

## Next Steps
1. Find the correct API endpoint from your backend
2. Update line 57 in `staffService.js` with the correct endpoint
3. Test the app and verify staff list loads
4. If multiple endpoints need support, add fallback logic

