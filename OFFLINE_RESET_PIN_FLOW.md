# What Happens When User Tries Reset PIN While Offline

## Step-by-Step Flow

```
USER ACTION: Clicks "Reset PIN" while OFFLINE

Step 1: User enters phone number
        ✓ Validation: Checks if 10 digits
        ✓ Local validation only (no API call yet)

Step 2: User clicks "Load Security Questions"
        ↓
        ApiService.post('/users/user-security-questions/', {
          phone: phoneNumber
        })
        ↓
        NO INTERNET → Network Error
        ↓
        Caught in catch() block (line 195)

Step 3: Error handling (line 195-202)
        err.message = "Network error" or "Failed to fetch"
        ↓
        Sets error message on screen
        ↓
        Shows to user: "Failed to load security questions."
        (or more specific error if backend responds)

Step 4: User sees
        - Loading spinner disappears
        - Error message in red box
        - Cannot proceed to answer questions
        - Stuck on "Reset PIN" screen
```

## Exact Code Flow

**File:** `src/features/dashboard/screens/LoginScreen.js`

```javascript
// Line 153: User clicks button to load security questions
const handleLoadSecurityQuestionsForReset = async () => {
  setLoading(true);  // Show loading spinner

  try {
    // Line 170: Makes API call to backend
    const response = await ApiService.post('/users/user-security-questions/', {
      phone: resetPhoneNumber,
    });

    // Lines 176-192: Only runs if successful
    const { questions } = response.data;
    setResetSecurityQuestions(questions);
    setResetStep(2);  // Show question answering screen

  } catch (err) {
    // Lines 195-199: OFFLINE = You end up here
    console.error('[LoginScreen] Error loading user questions for reset:', err);

    // Get error message
    const errorMsg = err.response?.data?.error
                  || err.message
                  || "Failed to load security questions.";

    // Show to user
    setMessage(errorMsg);
    setMessageType("error");

    // Still on same screen - cannot proceed
  } finally {
    setLoading(false);  // Hide spinner
  }
};
```

## What User Sees

### Screen 1: Enter Phone Number (Works Offline)
```
┌─────────────────────────┐
│  Reset PIN              │
│                         │
│  Enter phone number:    │
│  [0770999999]           │
│                         │
│  [Load Questions]       │
└─────────────────────────┘
```
✓ Can type phone number
✓ Validation works locally
✗ But clicking "Load Questions" fails

### Screen 2: After Clicking "Load Questions" (Offline)
```
┌─────────────────────────┐
│  Reset PIN              │
│                         │
│  Enter phone number:    │
│  [0770999999]           │
│                         │
│  ❌ Failed to load      │
│     security questions. │
│                         │
│  [Load Questions]       │
└─────────────────────────┘
```
✗ Error message appears
✗ Red error box
✗ Cannot proceed
✗ Loading spinner disappears

## What Doesn't Happen

❌ Questions don't load
❌ Can't answer security questions
❌ Can't set new PIN
❌ Can't submit PIN reset
❌ No fallback to offline cache (no cache exists)
❌ No "pending sync" mechanism
❌ No offline verification

## The Problem

User is stuck on the Reset PIN screen with:
- Cannot proceed forward (no questions loaded)
- Cannot go backward easily (depends on UI)
- Must get internet connection
- Cannot reset PIN without backend

## Error Message Shown

The error comes from line 197:
```javascript
const errorMsg = err.response?.data?.error
             || err.message
             || "Failed to load security questions.";
```

**Most likely message:** `"Failed to load security questions."`

**Why?** Because:
- `err.response` = undefined (no backend response = offline)
- `err.response?.data?.error` = doesn't exist
- Falls back to `err.message` = "Network error" or similar from axios
- If that's also generic, falls back to hardcoded string

## Network Error Details

When offline, axios error looks like:
```javascript
{
  message: "Network error",
  code: "ECONNREFUSED" or similar,
  response: undefined,  // No response from server
  request: {...}
}
```

So it ends up showing:
```
"Network error"  // or
"Failed to load security questions."  // fallback
```

## What Should Happen (But Doesn't)

Ideal flow:
1. User enters phone
2. App checks for cached security answers locally
3. Shows cached questions (if available)
4. User answers from memory
5. PIN reset happens locally
6. Syncs to backend when online

**But this isn't implemented**, so user just gets stuck.

## Current Behavior Summary

**Offline Reset PIN:**
```
✓ User can type phone number
✓ User can click "Load Questions"
✗ API call fails (no backend)
✗ Error message shown
✗ User cannot proceed
✗ User stuck on same screen
✗ Must get internet to reset PIN
```

**Best case:** User sees helpful error message and knows to go online
**Worst case:** User confused why nothing happens
