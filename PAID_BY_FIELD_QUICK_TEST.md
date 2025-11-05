# Paid By Field - Quick Test Guide

## Quick Verification (5 minutes)

### ✅ Step 1: Check Endpoint Configuration
**File**: `src/services/staffService.js`

Look for line 56:
```javascript
const endpoint = 'staff/'; // Should be 'staff/' NOT 'users/'
```

**Status**: ✅ Should show `'staff/'`

---

### ✅ Step 2: Check Field Mapping
**File**: `src/services/staffService.js`

Look for lines 81-82:
```javascript
id: staff.staff_id || staff.id || staff.pk || staff._id || `staff_${index}`,
displayName: staff.full_name || formatStaffName(staff),
```

**Status**: ✅ Should use `staff.staff_id` and `staff.full_name`

---

### ✅ Step 3: Check Component Integration
**File**: `src/features/Aggregation/screens/AggregationScreen.js`

Look for line 25:
```javascript
import SearchableStaffPicker from '../../../components/SearchableStaffPicker';
```

Look for lines 1759-1773:
```javascript
if (field.key === 'paid_by' && field.type === 'searchable-staff' && !isFarmer) {
    return (
        <SearchableStaffPicker
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

**Status**: ✅ Component should be imported and rendered

---

### ✅ Step 4: Check HarvestFormScreen
**File**: `src/features/harvest/screens/HarvestFormScreen.js`

Look for line 9:
```javascript
import SearchableStaffPicker from '../../../components/SearchableStaffPicker';
```

Look for lines 216-221:
```javascript
<SearchableStaffPicker
    label="Paid By"
    selectedStaffId={formData.paidBy}
    onStaffSelect={(staff) => updateField('paidBy', staff.id)}
    selectedStaff={formData.selectedStaff}
/>
```

**Status**: ✅ Component should be imported and used

---

## App Testing (2 minutes per scenario)

### Scenario A: AggregationScreen Test

```
1. Open app
2. Navigate to AggregationScreen
3. Tap "Add Farmer Harvests"
4. Select a farmer (Step 1)
5. Progress to Step 2 (Quality & Payment)
6. Look for "Paid By" field
7. Tap dropdown
   → Should open modal with staff list
   → Should NOT show 404 error
   → Should show "Loading staff members..."
8. Type a staff name
   → Should filter results in real-time
9. Tap a staff member
   → Should close modal
   → Should show selected name
   → Should show staff ID below field
10. Tap Submit
    → Form should submit successfully
    → Should include paid_by field with staff ID
```

**Expected Console Output**:
```
[staffService] Making API call to endpoint: staff/
[staffService] Fetched X staff members
[SearchableStaffPicker] Loaded X staff members
[SearchableStaffPicker] Selected staff: [Name]
```

---

### Scenario B: HarvestFormScreen Test

```
1. Open app
2. Navigate to HarvestFormScreen
3. Progress through Step 1 (Worker & Block)
4. Progress to Step 2 (Delivery & Finance)
5. Look for "Paid By" field
6. Tap dropdown
   → Should open modal with staff list
7. Select staff member
   → Should work identically to AggregationScreen
8. Tap Submit
   → Form should submit with paidBy field
```

---

## Console Monitoring

### Open Console
- **Android**: Use `adb logcat`
- **iOS**: Use Xcode console
- **React Native**: Use `react-native log-android` or `react-native log-ios`

### Watch for these logs

✅ **Success**:
```
[staffService] Fetching staff from API...
[staffService] API response received: {status: 200, ...}
[staffService] Fetched X staff members
```

❌ **Error**:
```
[staffService] Error fetching staff: {status: 404, ...}
```

If you see 404, the endpoint is wrong.

---

## Common Issues & Fixes

### Issue 1: Dropdown shows "No staff members available"

**Check**:
- [ ] Backend API is running
- [ ] Staff records exist in database
- [ ] User is authenticated (has valid JWT token)
- [ ] Network connectivity is working

**Console Should Show**:
```
[staffService] Fetched 0 staff members
```

If it shows 0, check backend database for staff records.

---

### Issue 2: 404 Error when opening "Paid By" field

**Check**:
- [ ] staffService.js line 56 shows `'staff/'` (not `'users/'`)
- [ ] Is the error in the OpenAPI spec different?

**Console Will Show**:
```
[staffService] Error fetching staff: {status: 404, endpoint: 'staff/'}
```

**Fix**:
Update line 56 in staffService.js from `'users/'` to `'staff/'`

---

### Issue 3: Dropdown shows error message with "Retry" button

**Likely Causes**:
- Network disconnected
- Backend API not running
- Authentication token expired

**Fix**:
1. Check network connection
2. Check backend is running
3. Re-authenticate in app
4. Tap "Retry" button

---

### Issue 4: Selected staff name not showing

**Check**:
- [ ] Did you tap a staff member?
- [ ] Is SearchableStaffPicker receiving `onStaffSelect` callback?

**Console Should Show**:
```
[SearchableStaffPicker] Selected staff: [Name]
```

If not, check console for errors.

---

## Verification Checklist

- [ ] staffService endpoint is `'staff/'`
- [ ] Field mapping uses `staff.staff_id` and `staff.full_name`
- [ ] SearchableStaffPicker imported in both screens
- [ ] "Paid By" field renders without errors
- [ ] Dropdown opens and loads staff list
- [ ] Can search staff by name/email
- [ ] Can select staff member
- [ ] Selected staff displays in field
- [ ] Staff ID shows below field
- [ ] Form submits with `paid_by` field

---

## Quick Command Reference

### Clear Cache (if staff list is stale)
```javascript
// In console or AsyncStorage debugger:
await AsyncStorage.removeItem('staff_cache');
await AsyncStorage.removeItem('staff_cache_expiry');
```

Then reload the "Paid By" field to fetch fresh data.

---

## Status Summary

**All Code**: ✅ Ready
**All Components**: ✅ Configured
**All Integrations**: ✅ Complete

**Next Step**: Run the app and test the scenarios above.

If all scenarios pass, the implementation is working correctly.

---

## Support

If issues occur:
1. Check console logs
2. Verify backend API is running
3. Check network connectivity
4. Review `PAID_BY_FIELD_COMPLETE_VERIFICATION.md` for detailed debugging
