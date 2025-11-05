# Fix: Entries Disappearing After Failed Sync

## Problem

When a user tapped the cloud sync icon in AggregationScreen to sync pending entries, the entries would **disappear from the app even if the sync failed**. This was a critical data loss issue.

### Root Cause

The `handleSyncRecords()` function in `AggregationScreen.js` had this logic:

```javascript
// Old code - WRONG!
// Sync all drafts
for (const draft of harvestDrafts) {
    try {
        await submitHarvest(draft);
    } catch (e) {
        console.error('[handleSyncRecords] Error syncing harvest:', e);
    }
}

// Clear ALL drafts after attempting sync
// This happened even if ALL syncs failed!
await AsyncStorage.removeItem('farmer_drafts');
await AsyncStorage.removeItem('harvest_drafts');
```

**The problem**: The code would:
1. Try to sync all records
2. Catch and ignore errors if they occurred
3. **Delete all drafts regardless of sync success**
4. Display a "success" message even if sync failed

This meant failed syncs resulted in data loss!

---

## Solution

Changed the sync handler to **only remove drafts that were successfully synced**:

### Key Changes

1. **Track which drafts sync successfully**
   - Created `syncedFarmerIds[]` and `syncedHarvestIds[]` arrays
   - Only add IDs to these arrays when `submitFarmer()` or `submitHarvest()` succeeds

2. **Only delete successfully synced drafts**
   ```javascript
   // Only remove drafts that succeeded
   if (syncedFarmerIds.length > 0) {
       const remainingFarmerDrafts = farmerDrafts.filter(
           d => !syncedFarmerIds.includes(d.id)
       );
       if (remainingFarmerDrafts.length > 0) {
           await AsyncStorage.setItem('farmer_drafts', JSON.stringify(remainingFarmerDrafts));
       } else {
           await AsyncStorage.removeItem('farmer_drafts');
       }
   }
   ```

3. **Show appropriate alerts based on sync results**
   - **All succeeded**: Green "✓ Sync Successful" message
   - **Partial sync**: Orange "⚠ Partial Sync" warning - shows how many succeeded/failed
   - **All failed**: Red error message - reassures user data is still saved locally

4. **Added detailed logging**
   ```
   [handleSyncRecords] Starting sync...
   [handleSyncRecords] Syncing farmer: FD001
   [handleSyncRecords] ✓ Farmer synced: FD001
   [handleSyncRecords] ✗ Error syncing harvest: HV001
   [handleSyncRecords] Successfully synced: 1, Failed: 1
   ```

---

## Behavior After Fix

### Scenario 1: All records sync successfully
- ✅ All drafts are removed from storage
- ✅ Records appear as "synced" in the UI
- ✅ Shows "✓ Sync Successful" message

### Scenario 2: Some records fail
- ✅ Only successful records are removed
- ✅ Failed records remain in "Pending" state
- ✅ Shows "⚠ Partial Sync" message with counts
- ✅ User can retry failed records

### Scenario 3: All records fail
- ✅ All drafts remain in storage
- ✅ All records still show as "Pending"
- ✅ Shows error message reassuring user data is safe locally

---

## File Modified

**File**: `src/features/Aggregation/screens/AggregationScreen.js`

**Function**: `handleSyncRecords()` (lines 1154-1274)

---

## Testing

To test this fix:

1. **Create a pending entry** (add farmer or harvest harvest)
2. **Go offline** (disable WiFi/mobile data)
3. **Tap cloud sync icon** - should fail and show error
4. **Entry should still be visible** in the pending list
5. **Go online** and sync again - should succeed this time

---

## Alert Messages

### Success (All synced)
```
Title: ✓ Sync Successful
Message: X record(s) have been synced to the cloud successfully!
Type: Green
```

### Partial (Some failed)
```
Title: ⚠ Partial Sync
Message: Successfully synced X record(s), but Y record(s) failed.
         The failed records remain in your pending list.
Type: Orange
```

### Failed (All failed)
```
Title: Sync Failed
Message: All records failed to sync. Please check your internet
         connection and try again. Your records are still saved locally.
Type: Red
```

---

## Why This Matters

This fix ensures:
- ✅ **Data is never lost** during failed syncs
- ✅ **Users have clear feedback** on what succeeded/failed
- ✅ **Offline resilience** - app works perfectly offline
- ✅ **Retry capability** - failed records can be retried later

