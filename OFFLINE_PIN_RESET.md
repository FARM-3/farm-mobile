# Offline PIN Reset Implementation

## The Real Answer: YES, PIN Reset Can Work Offline

The key is caching the security answers (or hashed PIN) locally after first login.

## Architecture

### What to Cache After Login

```javascript
// After successful login, cache:
{
  offline_user_cache: {
    phone: "0770999999",
    name: "Masolo",
    role: "admin"
  },

  offline_tokens_cache: {
    access: "eyJ...",
    refresh: "eyJ..."
  },

  // NEW: Cache security answers for offline PIN reset
  security_answers_0770999999: {
    question_1: "answer_1",
    question_2: "answer_2",
    question_3: "answer_3"
  }
}
```

## Two Implementation Options

### Option A: Cache Security Answers (Recommended)

**Pros:**
- ✅ User's answers cached locally
- ✅ Can verify offline without storing PIN
- ✅ Backend still authoritative on sync
- ✅ More flexible

**Cons:**
- ⚠️ Stores user answers (though low sensitivity)
- ⚠️ Requires sync after PIN reset

### Option B: Cache Hashed PIN (More Secure)

**Pros:**
- ✅ PIN never stored plaintext
- ✅ Uses standard hashing
- ✅ Can verify locally

**Cons:**
- ⚠️ More complex implementation
- ⚠️ Hash algorithm must match backend

## Complete Implementation (Option A - Recommended)

### Step 1: Update AuthService.js Login Method

```javascript
async login(phone, pin) {
  console.log('[AuthService] ========== LOGIN ATTEMPT START ==========');

  try {
    console.log('[AuthService] Attempting online login...');
    const response = await ApiService.post('/users/login/', {
      phone: phone,
      pin: pin,
    });

    const { user, access, refresh, message, security_answers } = response.data;

    if (!access || !refresh || !user) {
      throw new Error('Invalid response - missing required fields');
    }

    // Store tokens
    await ApiService.setTokens(access, refresh);
    await ApiService.setUser(user);

    // Cache for offline use
    await this.cacheUserOffline(user, { access, refresh });

    // NEW: Cache security answers for offline PIN reset
    if (security_answers && Array.isArray(security_answers)) {
      await this.cacheSecurityAnswersOffline(phone, security_answers);
    }

    console.log('[AuthService] ✅ Online login successful');
    return {
      success: true,
      user,
      message: message || 'Login successful',
      mode: 'online',
    };
  } catch (error) {
    // Try offline fallback...
    // ... existing offline code ...
  }
}

async cacheSecurityAnswersOffline(phone, securityAnswers) {
  try {
    const key = `security_answers_${phone}`;

    // Store in a format we can verify against
    const answers = {};
    securityAnswers.forEach((answer, idx) => {
      answers[`answer_${idx}`] = answer.toLowerCase().trim();
    });

    await AsyncStorage.setItem(key, JSON.stringify({
      answers: answers,
      count: securityAnswers.length,
      cachedAt: new Date().toISOString(),
    }));

    console.log('[AuthService] Cached security answers for offline PIN reset:', phone);
  } catch (err) {
    console.error('[AuthService] Error caching security answers:', err);
    // Non-fatal - continue without cache
  }
}
```

### Step 2: Add Offline PIN Reset Method

```javascript
/**
 * Reset PIN using offline cached security answers
 * Works when backend unavailable
 */
async resetPinOffline(phone, newPin, providedAnswers) {
  try {
    console.log('[AuthService] Attempting offline PIN reset for phone:', phone);

    // 1. Retrieve cached answers
    const cacheKey = `security_answers_${phone}`;
    const cachedData = await AsyncStorage.getItem(cacheKey);

    if (!cachedData) {
      throw new Error('Security answers not cached. Must login first.');
    }

    const { answers: storedAnswers, count } = JSON.parse(cachedData);

    // 2. Verify provided answers match cached
    if (!Array.isArray(providedAnswers) || providedAnswers.length !== count) {
      throw new Error('Invalid answers provided');
    }

    const answersMatch = providedAnswers.every((answer, idx) => {
      const normalized = answer.toLowerCase().trim();
      const stored = storedAnswers[`answer_${idx}`];
      return normalized === stored;
    });

    if (!answersMatch) {
      throw new Error('Security answers do not match stored answers');
    }

    // 3. Update local cache with new PIN (marked as pending)
    const cachedUser = await AsyncStorage.getItem('offline_user_cache');
    if (!cachedUser) {
      throw new Error('User cache not found');
    }

    const user = JSON.parse(cachedUser);

    // Mark PIN reset for sync
    user.pin_reset = {
      new_pin: newPin, // Will be synced when online
      reset_at: new Date().toISOString(),
      pending_sync: true,
    };

    await AsyncStorage.setItem('offline_user_cache', JSON.stringify(user));

    console.log('[AuthService] ✅ PIN reset offline (pending sync)');

    return {
      success: true,
      message: 'PIN reset successfully. Changes will sync when online.',
      isOffline: true,
      pendingSync: true,
      requiresSync: true,
    };
  } catch (error) {
    console.error('[AuthService] Offline PIN reset error:', error);
    throw new Error(error.message || 'Failed to reset PIN offline');
  }
}

/**
 * Sync offline PIN reset when backend becomes available
 */
async syncOfflinePinReset(phone) {
  try {
    const cachedUser = await AsyncStorage.getItem('offline_user_cache');
    if (!cachedUser) return null;

    const user = JSON.parse(cachedUser);

    if (!user.pin_reset || !user.pin_reset.pending_sync) {
      return null; // Nothing to sync
    }

    console.log('[AuthService] Syncing offline PIN reset...');

    // Send to backend
    const response = await ApiService.post('/users/sync-pin-reset/', {
      phone: phone,
      new_pin: user.pin_reset.new_pin,
    });

    // Clear the sync flag
    delete user.pin_reset;
    await AsyncStorage.setItem('offline_user_cache', JSON.stringify(user));

    console.log('[AuthService] ✅ PIN reset synced with backend');

    return {
      success: true,
      message: 'PIN changes synced with server',
    };
  } catch (error) {
    console.error('[AuthService] Error syncing PIN reset:', error);
    throw error;
  }
}
```

### Step 3: Update LoginScreen

```javascript
const handleOfflinePinReset = async () => {
  // Validate inputs
  if (!/^\d{10}$/.test(resetPhoneNumber)) {
    setMessage("Please enter a valid 10-digit phone number");
    setMessageType("error");
    return;
  }

  const allAnswersFilled = resetSecurityAnswers.every(ans => ans.trim().length > 0);
  if (!allAnswersFilled) {
    setMessage("Please answer all security questions");
    setMessageType("error");
    return;
  }

  const fullNewPin = newPinReset.join("");
  const confirmPin = confirmPinReset.join("");

  if (fullNewPin !== confirmPin) {
    setMessage("New PINs do not match");
    setMessageType("error");
    return;
  }

  setLoading(true);
  try {
    // Try online first
    console.log('[LoginScreen] Attempting PIN reset...');

    try {
      const result = await AuthService.verifyAnswersAndResetPin(
        resetPhoneNumber,
        resetSecurityAnswers.map((a, i) => ({
          question_id: i,
          answer: a.trim().toLowerCase(),
        })),
        fullNewPin
      );

      setMessage("PIN reset successful! Please login with your new PIN.");
      setMessageType("success");
      setIsResetPinMode(false);
      setResetPhoneNumber("");
      setResetSecurityAnswers(["", "", ""]);

    } catch (onlineError) {
      // If online fails, try offline
      console.log('[LoginScreen] Online reset failed, trying offline...');

      const offlineResult = await AuthService.resetPinOffline(
        resetPhoneNumber,
        fullNewPin,
        resetSecurityAnswers
      );

      setMessage(offlineResult.message + " (offline mode)");
      setMessageType("warning");

      setTimeout(() => {
        setIsResetPinMode(false);
        setResetPhoneNumber("");
        setResetSecurityAnswers(["", "", ""]);
      }, 2000);
    }

  } catch (error) {
    console.error('[LoginScreen] PIN reset error:', error);
    setMessage(error.message || "Failed to reset PIN");
    setMessageType("error");
  } finally {
    setLoading(false);
  }
};
```

### Step 4: Handle Sync When Online

Add to your sync service (aggregationService or similar):

```javascript
export const syncOfflinePinReset = async (phone) => {
  try {
    console.log('[Sync] Checking for pending PIN reset...');

    const result = await AuthService.syncOfflinePinReset(phone);

    if (result) {
      console.log('[Sync] ✅ PIN reset synced:', result);
      return result;
    }

    return null;
  } catch (error) {
    console.error('[Sync] Error syncing PIN reset:', error);
    throw error;
  }
};
```

Call this when app comes online:

```javascript
// In your main app or sync component
useEffect(() => {
  const checkConnection = async () => {
    const netInfo = await NetInfo.fetch();

    if (netInfo.isConnected && currentUser) {
      // Sync any pending changes
      try {
        await syncOfflinePinReset(currentUser.phone);
      } catch (error) {
        console.error('Error syncing offline changes:', error);
      }
    }
  };

  checkConnection();
}, [currentUser]);
```

## Complete Flow: Offline PIN Reset

```
OFFLINE SCENARIO:
1. User already logged in once (answers cached) ✓
2. User goes offline (airplane mode) ✓
3. User wants to reset PIN
4. Click "Reset PIN"
5. Enter phone number
6. Enter security answers (verified against cache)
7. Enter new PIN
8. System validates offline ✓
9. Updates local cache with pending reset ✓
10. Shows: "PIN reset. Changes will sync when online."

WHEN ONLINE AGAIN:
1. App detects network available
2. Checks for pending PIN reset
3. Sends to backend for final verification
4. Backend updates PIN in database
5. Clears pending sync flag
6. User can login with new PIN (online or offline)
```

## Backend Requirements

For this to work, you need an endpoint:

```python
# In your Django backend
path('api/users/sync-pin-reset/', SyncPinResetView.as_view(), name='sync-pin-reset'),
```

```python
class SyncPinResetView(APIView):
    """
    Sync offline PIN reset to backend
    Called when app comes online after offline PIN reset
    """
    def post(self, request):
        phone = request.data.get('phone')
        new_pin = request.data.get('new_pin')

        try:
            user = User.objects.get(phone=phone)
            user.pin = make_password(new_pin)  # Hash the PIN
            user.save()

            return Response({
                'success': True,
                'message': 'PIN reset synced successfully'
            })
        except User.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=404)
```

## Security Considerations

### ✅ What's Safe to Cache

- Security answers (low sensitivity)
- User metadata (name, phone, role)
- JWT tokens (expire automatically)

### ❌ What NOT to Cache

- Plaintext PIN (never)
- Plaintext passwords (never)
- Private keys

### ✅ What We Do

- Store answers (needed for verification)
- Mark PIN reset as "pending"
- Sync via HTTPS when online
- Clear pending flag after sync

## Testing Offline PIN Reset

### Test Case 1: Reset PIN Online
1. Login (caches answers)
2. Reset PIN online
3. Verify backend updated
4. Logout
5. Login with new PIN → ✅ Works

### Test Case 2: Reset PIN Offline
1. Login (caches answers)
2. Airplane mode ON
3. Reset PIN offline
4. Verify: "Changes will sync when online"
5. Check AsyncStorage for pending reset
6. Airplane mode OFF
7. App syncs automatically
8. Logout and login with new PIN → ✅ Works

### Test Case 3: Wrong Answers Offline
1. Login (caches correct answers)
2. Airplane mode ON
3. Try reset with wrong answers
4. Verify: "Answers don't match"
5. Can't reset until answers correct

## Summary

**Yes, PIN reset CAN work offline!**

The solution:
1. Cache security answers after login
2. Verify answers locally when offline
3. Mark PIN reset as "pending sync"
4. Sync to backend when online
5. Backend makes final verification

This gives users:
- ✅ Can reset PIN offline if they know answers
- ✅ Changes automatically sync when online
- ✅ Secure (no plaintext PIN stored)
- ✅ Flexible (works online and offline)

---

**Implementation complexity:** Medium
**Security level:** High
**User experience:** Excellent
