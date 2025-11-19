# Reset PIN Flow & AsyncStorage Integration

## Current Implementation

### How Reset PIN Works Today

**Reset PIN Flow (No Offline Cache):**
```
1. User clicks "Reset PIN"
2. Enter phone number
3. Load user's security questions from backend
4. Answer 3 security questions
5. Enter new 4-digit PIN
6. Backend verifies answers and resets PIN
7. PIN updated in backend only
8. User can login with new PIN (only online)
```

**The Problem:**
- If backend unavailable during reset, user is stuck
- No offline caching of the new PIN
- User must have network to reset PIN
- Old cached PIN still in AsyncStorage (doesn't match new PIN)

### Current AuthService Methods

```javascript
// 1. Get security questions for a phone
async getSecurityQuestion(phone)
// Uses: ApiService.post('/users/security-question/')

// 2. Reset PIN (old way)
async resetPin(phone, securityAnswer, newPin)
// Uses: ApiService.post('/users/reset-pin/')

// 3. Verify answers and reset PIN (new way)
async verifyAnswersAndResetPin(phone, answers, newPin)
// Uses: ApiService.post('/users/verify-answers-reset-pin/')
```

## Problem with AsyncStorage Caching

When user successfully logs in once, we cache their credentials:
```
AsyncStorage[offline_user_cache] = { name: "Masolo", phone: "0770999999" }
AsyncStorage[offline_tokens_cache] = { access: "...", refresh: "..." }
```

**Issue with Reset PIN:**
1. User resets PIN in LoginScreen
2. Backend PIN is updated ✓
3. But cached PIN in AsyncStorage is NOT updated ❌
4. Next offline login still uses OLD cached PIN
5. User gets authentication error with new PIN

## Solution: Update AsyncStorage After PIN Reset

### Enhanced resetPin Logic

```javascript
async verifyAnswersAndResetPin(phone, answers, newPin) {
  try {
    // 1. Reset PIN on backend
    const response = await ApiService.post('/users/verify-answers-reset-pin/', {
      phone: phone,
      answers: answers,
      new_pin: newPin,
    });

    // 2. UPDATE AsyncStorage with new PIN
    // BUT WAIT: We can't cache the PIN itself (security risk)
    // Instead, we should CLEAR the old cache
    await this.clearOfflineCache();

    // 3. Force user to login online with new PIN
    // This will re-cache with new credentials

    return {
      success: true,
      message: 'PIN reset successful. Please login with your new PIN.',
    };
  } catch (error) {
    // Handle error...
  }
}

async clearOfflineCache() {
  // Remove cached credentials
  await AsyncStorage.removeItem('offline_user_cache');
  await AsyncStorage.removeItem('offline_tokens_cache');
  console.log('[AuthService] Offline cache cleared');
}
```

## Better Approach: Don't Cache PIN

**Why we can't cache PIN:**
- PINs are sensitive (though 4-digit, still auth credential)
- Should never store plaintext PIN
- Only store tokens (JWT, expiring)

**Current approach is correct:**
- Cache user data: name, phone, role ✓
- Cache tokens: access (expires), refresh ✓
- Don't cache PIN ✓

## Recommended PIN Reset Flow

### Online PIN Reset (Recommended)

```
User → Reset PIN → Backend validates → Success
                ↓
         Clear AsyncStorage cache
                ↓
         User forced to login online with new PIN
                ↓
         New credentials cached
```

### Offline PIN Reset (Not Possible)

❌ Cannot reset PIN offline
- Security question answers need backend validation
- PIN must be hashed before storing
- Tokens need to be issued by backend

**This is by design** - important auth changes require backend.

## Implementation Guide

### Step 1: Add Clear Cache Method to AuthService

```javascript
async clearOfflineCache() {
  try {
    await AsyncStorage.removeItem('offline_user_cache');
    await AsyncStorage.removeItem('offline_tokens_cache');
    console.log('[AuthService] Offline cache cleared after PIN reset');
  } catch (err) {
    console.error('[AuthService] Error clearing cache:', err);
  }
}
```

### Step 2: Update Reset PIN Method

```javascript
async verifyAnswersAndResetPin(phone, answers, newPin) {
  try {
    console.log('[AuthService] Resetting PIN and clearing cache for phone:', phone);

    const response = await ApiService.post('/users/verify-answers-reset-pin/', {
      phone: phone,
      answers: answers,
      new_pin: newPin,
    });

    // IMPORTANT: Clear offline cache after PIN reset
    // User must login online with new PIN to re-cache
    await this.clearOfflineCache();

    console.log('[AuthService] PIN reset successful - offline cache cleared');

    return {
      success: true,
      message: 'PIN reset successful! Please login with your new PIN.',
      requiresOnlineLogin: true, // Flag that new login needed
    };
  } catch (error) {
    console.error('[AuthService] Reset PIN error:', error.response?.data || error.message);

    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }

    throw new Error(error.message || 'Failed to reset PIN');
  }
}
```

### Step 3: Update LoginScreen to Handle Cache Clear

```javascript
const handleResetPin = async () => {
  // ... existing reset logic ...

  const result = await AuthService.verifyAnswersAndResetPin(
    resetPhoneNumber,
    formattedAnswers,
    fullNewPin
  );

  if (result.requiresOnlineLogin) {
    setMessage("PIN reset successful! Please login with your new PIN.");
    setMessageType("success");

    // Clear form and redirect to login
    setTimeout(() => {
      setIsResetPinMode(false);
      setResetPhoneNumber("");
      setResetSecurityAnswers(["", "", ""]);
      setPhoneNumber("");
      setPin(["", "", "", ""]);
    }, 1500);
  }
};
```

## Complete Flow After Implementation

### Scenario 1: User Resets PIN Online

```
1. User in login screen
2. Clicks "Reset PIN"
3. Enters phone number
4. Loads security questions (from backend)
5. Answers questions
6. Enters new PIN
7. Backend validates and updates PIN ✓
8. AsyncStorage cache CLEARED ✓
9. Message: "Reset successful, login with new PIN"
10. User must login online with new PIN
11. New login caches with new credentials ✓
```

**Result:** ✓ Works perfectly

### Scenario 2: User Resets PIN Offline

```
1. No internet connection
2. Cannot load security questions ❌
3. User sees: "Cannot connect to backend"
4. User must connect to internet first
```

**Result:** ✓ Proper error handling (expected)

### Scenario 3: User Has Cached Credentials After PIN Reset

```
1. First login: online, successful, cached ✓
2. PIN reset: online, successful, cache cleared ✓
3. Second login attempt offline: old cached PIN won't match
4. User sees: "Invalid credentials"
5. User must go online and login with new PIN ✓
6. New credentials cached ✓
7. Can now use offline with new PIN ✓
```

**Result:** ✓ Secure and working

## Security Considerations

### What We Cache
- ✅ User data (name, phone, role) - not sensitive
- ✅ JWT tokens (access, refresh) - expire automatically
- ❌ PIN - never, security risk
- ❌ Password - never, security risk

### PIN Reset Security
- ✅ Only works online (requires backend)
- ✅ Requires security answers (verification)
- ✅ Clears old cache after reset
- ✅ Forces new online login before caching new credentials
- ✅ Tokens auto-expire (JWT expiration)

### Best Practices
- Offline login for convenience (read-only access)
- Important auth changes require online
- Cache expiration for old tokens
- Clear cache when credentials change

## Testing PIN Reset

### Test Case 1: Reset PIN Online
1. Login successfully (creates cache)
2. Click "Reset PIN"
3. Enter phone, answer questions, enter new PIN
4. Verify: "Reset successful"
5. Verify: AsyncStorage cache is empty
6. Try login with old PIN → fails
7. Try login with new PIN → works

### Test Case 2: Reset PIN, Then Login Offline
1. Login with new PIN online (creates new cache)
2. Turn airplane mode ON
3. Login with new PIN → works (uses cache)
4. Try login with old PIN → fails (old cache cleared)

### Test Case 3: Reset PIN Without Internet
1. Turn airplane mode ON
2. Click "Reset PIN"
3. Enter phone
4. Verify: "Cannot load security questions"
5. Turn airplane mode OFF
6. Try again → works

## Files to Modify

If implementing this:

**`src/services/AuthService.js`**
- Add `clearOfflineCache()` method
- Update `verifyAnswersAndResetPin()` to clear cache
- Add `requiresOnlineLogin` flag to response

**`src/features/dashboard/screens/LoginScreen.js`**
- Handle `requiresOnlineLogin` flag
- Redirect to login form after reset
- Show appropriate message

## Why This Design

1. **Security First**
   - No PIN caching (never)
   - Old cache cleared on reset
   - Tokens auto-expire

2. **User Friendly**
   - Clear error messages
   - Expected behavior
   - Offline login still works

3. **Simple Implementation**
   - No complex logic
   - One clear flow
   - Easy to understand

## Migration Path

If you want to implement this:

1. Add `clearOfflineCache()` method
2. Call it in `verifyAnswersAndResetPin()`
3. Test all three scenarios above
4. Update LoginScreen if needed

But honestly, the **current implementation is mostly correct**. Just ensure that after PIN reset, the app clears the old cache so users must login online with new PIN first.

## TL;DR

**How Reset PIN works with AsyncStorage:**

1. **User resets PIN** → calls backend API
2. **Backend updates PIN** ✓
3. **Clear AsyncStorage cache** (can't cache PIN)
4. **User must login online** with new PIN
5. **New credentials cached** (including new tokens)
6. **Can now use offline** with new PIN ✓

**Why?** PINs are auth credentials and should never be cached. Only JWT tokens (which expire) and user data are cached.
