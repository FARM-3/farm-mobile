# Harvest Cloud Sync - Debugging Guide

## Overview
This guide helps diagnose and fix issues with harvest records not syncing to the cloud when you tap the cloud icon in the HarvestSummaryScreen.

## Recent Improvements (Latest Changes)

The sync flow has been enhanced with **comprehensive logging** to help identify exactly why sync is failing:

### 1. **Enhanced Logging in Sync Process**
- **File**: `src/services/harvestRecord.js` (lines 224-297)
- **Changes**:
  - Full JSON logging of records being synced
  - Detailed validation error messages for each failing record
  - Error details from API responses
  - Success confirmation logs

### 2. **Improved User Feedback**
- **File**: `src/features/harvest/screens/HarvestSummaryScreen.js` (lines 66-87)
- **Changes**:
  - Clear sync success/partial/failure messages
  - Shows count of records synced vs. failed
  - Tells user to check logs for detailed error information

### 3. **Better Form Logging**
- **File**: `src/features/harvest/screens/HarvestFormScreen.js` (lines 533-534)
- **Changes**:
  - Logs complete harvest record structure when saved
  - Specifically validates paidBy field type and value

---

## How to Debug Sync Issues

### Step 1: Check the Device Logs
When you submit a harvest form and tap the cloud sync button, open your browser's developer console to see detailed logs:

```
[HarvestForm] Saved to local storage - Full record: { ... }
[HarvestForm] paidBy value check - type: string value: RF001
[HarvestSummary] Screen focused, refreshing data...
[syncAllRecords] Attempting to sync 1 local records...
[syncAllRecords] Records in queue: [...]
```

### Step 2: Identify the Validation Error

Look for logs like:
```
[syncAllRecords] Skipping record XXXX: Invalid paid_by field "". Must be a non-empty string
```

**Common Issues:**

| Error | Cause | Fix |
|-------|-------|-----|
| `paidBy is missing or null` | Staff member not selected | Select a staff member from "Paid By" dropdown |
| `paidBy is not a string` | Data corruption | Clear app cache and retry |
| `paidBy is an empty string` | Empty selection saved | Check CustomPicker selection logic |
| `workerName is missing` | Worker name field empty | Enter a worker name |
| `date is missing` | Date not set | Select a date using date picker |
| `weight is missing` | Weight field empty or zero | Enter valid weight > 0 |

### Step 3: Check the API Response

If the record passes validation but still fails to sync, check for API errors:

```
[syncAllRecords] Sync failed for record XXXX: Status 400 {
  errorMessage: { detail: "..." }
}
```

**Common API Errors:**

| Status | Issue | Action |
|--------|-------|--------|
| 400 | Bad request - payload format error | Check field mappings in `mapToApiPayload()` |
| 401 | Unauthorized - token expired | Log out and back in to refresh token |
| 403 | Forbidden - permission denied | Check user role/permissions on backend |
| 500 | Server error | Backend issue - contact admin |
| 0 | Network error | No internet connection or API unreachable |

### Step 4: Verify the Network

In `HarvestSummaryScreen`, check the sync status message:

- **"Online: Initiating data synchronization."** → Device is online, sync starting
- **"✓ Success! All N records uploaded to cloud."** → All records synced ✅
- **"Partial: N uploaded, M failed."** → Some records failed, check logs
- **"Failed: Could not sync N records..."** → All failed, check connectivity
- **"Offline Mode: Data saved locally..."** → No internet, will sync when online

### Step 5: Manual Testing Steps

1. **Fill out the form completely:**
   - Worker Name: Enter any name
   - Date: Select today or earlier
   - Block: Select any block
   - Weight: Enter a number > 0 (e.g., 12.5)
   - Price per Kg: Enter a number > 0 (e.g., 4000)
   - Paid By: **Select from dropdown** (must not be empty)
   - Amount Paid: Auto-calculated

2. **Submit the form**
   - Watch browser console for logs
   - Should see: `[HarvestForm] Saved to local storage - Full record: {...}`

3. **Return to Harvest Summary**
   - New record appears with cloud-upload-outline icon (pending)
   - Red badge shows "1" pending record

4. **Tap the cloud icon**
   - Watch console for sync logs
   - Record should disappear from pending list if synced
   - Cloud icon should change to cloud-done if successfully synced

---

## Data Flow Diagram

```
1. HarvestFormScreen.handleSubmit()
   ↓
2. Validate all fields including paidBy
   ↓
3. Create harvestData object with:
   - workerName (string)
   - blockId (block ID)
   - weight (number)
   - date (Date object)
   - pricePerKg (number)
   - amountPaid (number)
   - paidBy (Staff ID like "RF001") ← CRITICAL
   - id (generated ID)
   - synced: false
   ↓
4. Save to AsyncStorage queue ("harvests_sync_queue")
   ↓
5. User taps cloud icon → HarvestSummaryScreen.handleSyncPress()
   ↓
6. syncAllRecords() reads queue from AsyncStorage
   ↓
7. For each record:
   a) Validate: paidBy must be non-empty string
   b) Call postHarvestRecord(record)
      - mapToApiPayload transforms camelCase → snake_case
      - paidBy → paid_by
   c) POST to "aggregation/farmer-harvest/"
   d) On success: removeRecordFromQueue()
   ↓
8. fetchAllHarvestRecords() to refresh synced records
   ↓
9. Update UI with refreshed data
```

---

## Key Functions and Their Locations

### Form Submission
- **File**: [HarvestFormScreen.js:464-557](src/features/harvest/screens/HarvestFormScreen.js#L464-L557)
- **Function**: `handleSubmit()`
- **Does**: Validates form, saves to queue, resets form

### Sync Trigger
- **File**: [HarvestSummaryScreen.js:187-199](src/features/harvest/screens/HarvestSummaryScreen.js#L187-L199)
- **Function**: `handleSyncPress()`
- **Does**: Calls `loadAndSyncData()` if pending records exist

### Sync Execution
- **File**: [harvestRecord.js:224-297](src/services/harvestRecord.js#L224-L297)
- **Function**: `syncAllRecords()`
- **Does**: Iterates queue, validates, POSTs to API, removes from queue on success

### Data Mapping
- **File**: [harvestRecord.js:18-55](src/services/harvestRecord.js#L18-L55)
- **Function**: `mapToApiPayload()`
- **Does**: Transforms UI format to API format

### API Call
- **File**: [harvestRecord.js:62-89](src/services/harvestRecord.js#L62-L89)
- **Function**: `postHarvestRecord()`
- **Does**: Makes HTTP POST to backend

---

## Expected Data Format

### Before Sync (In Queue)
```javascript
{
  id: "PA120825A00",           // Generated locally
  workerName: "Patrick",       // From form
  blockId: "block01",          // From dropdown
  weight: 12.5,                // From numeric input
  date: Date,                  // JavaScript Date object
  dateReadable: "2025-10-30",  // YYYY-MM-DD format
  pricePerKg: 4000,            // From numeric input
  amountPaid: 50000,           // Calculated: weight × pricePerKg
  paidBy: "RF001",             // ← CRITICAL: Must be string like "RF001"
  synced: false
}
```

### After Mapping (API Request)
```javascript
{
  name: "Patrick",                    // workerName
  weight_on_delivery: 13,             // weight (rounded to int)
  date_of_delivery: "2025-10-30",     // dateReadable (YYYY-MM-DD)
  price_per_kg: 4000,                 // pricePerKg (int)
  amount_paid: "50000.00",            // amountPaid (string)
  paid_by: "RF001"                    // paidBy (Staff ID string)
}
```

### After Sync (From API)
```javascript
{
  id: 123,                        // Database ID (number)
  Worker_name: "Patrick",         // API format
  block_ID: "block01",            // API format
  weight_on_delivery: 13,         // API format
  date_of_delivery: "2025-10-30",
  price_per_kg: 4000,
  amount_paid: "50000.00",
  paid_by: "RF001"
}
```

---

## Staff Data Reference

Valid `paidBy` values (must select from this list):

```javascript
STAFF_DATA = [
  { id: "RF001", name: "Grace" },
  { id: "RF002", name: "Kevin" },
  { id: "RF003", name: "Edna" },
  { id: "RF004", name: "John" },
  { id: "RF005", name: "Mary" },
];
```

**Important**: The `id` field (like "RF001") is what gets saved, not the name.

---

## Common Scenarios

### Scenario 1: "No Records to Sync" Alert
**Problem**: User taps cloud icon but sees "All harvest records are already synced to the cloud"

**Cause**: `unsyncedCount` is 0
- Either all records have been synced
- Or the pending count was not updated correctly

**Solution**:
1. Check if new records appear in the "Pending" filter
2. Refresh the page (pull down or close/reopen)
3. Check browser console for `[HarvestSummary] Sync result:` logs

### Scenario 2: Record Shows as Pending But Doesn't Sync
**Problem**: Record has cloud-upload-outline icon but tapping cloud does nothing

**Cause**:
- Network offline (check `setSyncStatus` message)
- Validation failing silently (check console logs)
- paidBy field is empty or invalid

**Solution**:
1. Check `setSyncStatus` shows "Online: ..."
2. Open console and look for `[syncAllRecords] Skipping record` with error
3. If paidBy error, delete the record and re-submit with proper selection

### Scenario 3: Sync Succeeds But Record Still Shows as Pending
**Problem**: Record was synced but still shows pending icon

**Cause**:
- UI didn't refresh after sync
- Record removal from queue failed silently

**Solution**:
1. Pull to refresh HarvestSummaryScreen
2. Check console for `[syncAllRecords] Successfully synced record`
3. Verify record was removed from queue logs

---

## Network Testing

### Simulate Offline
1. Open DevTools → Network tab
2. Throttle to "Offline"
3. Try to sync
4. Should see: "Offline Mode: Data saved locally..."

### Simulate Online
1. Restore to normal in DevTools
2. Pull to refresh
3. Should see sync attempt with logs

---

## Token Expiration

If you see `Status 401` errors:
1. Your JWT token has expired
2. The app attempts automatic refresh
3. If refresh fails, you're logged out
4. Solution: Log out and back in via Login screen

Check logs for:
```
[ApiService] Response: 401 aggregation/farmer-harvest/
```

---

## Performance Tips

- Sync typically takes 2-5 seconds per record
- Multiple records sync sequentially (one at a time)
- Large payloads might timeout (server returns 504)
- Check `timeout: 15000` in ApiService.js if needed

---

## Further Debugging

### Enable Network Inspection
```javascript
// In ApiService.js, request interceptor already logs:
console.log('[ApiService] Request:', config.method?.toUpperCase(), fullUrl);
console.log('[ApiService] Response:', response.status, response.config.url);
```

### Check AsyncStorage Queue
```javascript
// In browser console (if WebStorageAPI available):
const queue = await AsyncStorage.getItem("harvests_sync_queue");
console.log(JSON.parse(queue));
```

### Verify Block IDs
Valid block IDs in the form:
- "block01", "block02", "block03", "block04", "block05", "block06"

Check if API expects different values (e.g., "1", "2", etc.)

---

## Contact Support

If you still can't sync after checking all above:
1. Export a CSV of records (for backup)
2. Take screenshots of console logs
3. Clear app data and reinstall
4. Contact the development team with:
   - Console logs from form submission
   - Console logs from sync attempt
   - Device info (iOS/Android, version)
   - Network details (WiFi/4G)
