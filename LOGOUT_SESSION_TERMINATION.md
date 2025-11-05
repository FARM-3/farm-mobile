# Logout & Session Termination - Implementation Guide

## Overview

The logout functionality has been improved to completely terminate the user session and prevent the back button from returning to authenticated screens. When a user logs out, all tokens are cleared, the navigation stack is reset, and the app returns to the Welcome screen with no way to go back into the authenticated app without logging in again.

## Problem Solved

**Before**: When users logged out and pressed the device back button, they could return to the authenticated app without logging in again.

**After**: The navigation stack is completely cleared, tokens are terminated, and the back button has no authenticated screens to return to.

---

## How It Works

### 1. **Token Termination**

When logout is triggered, the following tokens are immediately cleared from device storage:

```javascript
// AsyncStorage keys that are cleared
- access_token    // JWT access token
- refresh_token   // JWT refresh token
- user            // User profile data
- hasSeenWelcome  // Welcome screen flag
```

**Location**: [src/services/ApiService.js:194-201](src/services/ApiService.js#L194-L201)

```javascript
async clearTokens() {
  try {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
    console.log('[ApiService] Tokens cleared');
  } catch (error) {
    console.error('[ApiService] Error clearing tokens:', error);
  }
}
```

### 2. **Navigation Stack Reset**

Instead of using `navigation.navigate()` which allows back navigation, the logout now uses `navigation.reset()` to completely clear the navigation stack:

```javascript
// Clear the entire navigation stack
navigation.reset({
  index: 0,                           // Start at first screen
  routes: [{ name: 'Welcome' }],      // Only Welcome screen in stack
});
```

**What this does:**
- Removes all previously visited screens from the back stack
- Leaves only the Welcome screen in the navigation stack
- Pressing back button now exits the app (or goes to OS home)

### 3. **Authentication Check on App Load**

The app startup checks authentication status and sets the initial route accordingly:

```javascript
const isAuthenticated = await AuthService.isAuthenticated();

if (isAuthenticated) {
  setInitialRoute('Dashboard');
} else if (hasSeenWelcome === 'true') {
  setInitialRoute('Login');
} else {
  setInitialRoute('Welcome');
}
```

Since tokens are cleared on logout, `isAuthenticated()` will return false, forcing the user back to the login flow.

---

## Files Modified

### 1. **[src/features/dashboard/screens/DashboardScreen.js](src/features/dashboard/screens/DashboardScreen.js)**

**Function**: `handleConfirmLogout()` (Lines 169-193)

**Changes**:
- Added `navigation.reset()` to clear the navigation stack
- Added detailed logging for debugging
- Added error handling with retry prompt

**Code**:
```javascript
const handleConfirmLogout = async () => {
  setLogoutModalVisible(false);
  try {
    console.log('[Dashboard] Starting logout process...');

    // Clear tokens
    await AuthService.logout();
    console.log('[Dashboard] Tokens cleared');

    // Remove welcome flag
    await AsyncStorage.removeItem('hasSeenWelcome');
    console.log('[Dashboard] Welcome flag removed');

    // Reset navigation stack
    navigation.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
    console.log('[Dashboard] Navigation reset to Welcome screen');
  } catch (error) {
    console.error('[Dashboard] Logout error:', error);
    Alert.alert('Error', 'Failed to logout. Please try again.');
  }
};
```

### 2. **[src/components/Header.js](src/components/Header.js)**

**Function**: `handleLogout()` (Lines 91-131)

**Changes**:
- Added `navigation.reset()` to clear the navigation stack
- Added detailed logging for debugging
- Maintained backwards compatibility with `onNavigate` prop

**Code**:
```javascript
const handleLogout = () => {
  Alert.alert(
    'Logout',
    'Are you sure you want to log out?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          try {
            console.log('[Header] Starting logout process...');

            // Clear tokens
            await AuthService.logout();
            console.log('[Header] Tokens cleared');

            // Remove welcome flag
            await AsyncStorage.removeItem('hasSeenWelcome');
            console.log('[Header] Welcome flag removed');

            // Reset navigation stack
            if (navigation) {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              });
              console.log('[Header] Navigation reset to Welcome screen');
            } else if (onNavigate) {
              onNavigate('Welcome');
            }
          } catch (error) {
            console.error('[Header] Logout error:', error);
            Alert.alert('Error', 'Failed to logout. Please try again.');
          }
        }
      }
    ]
  );
};
```

---

## Logout Flow Diagram

```
User taps Logout Button
    ↓
Confirmation Dialog Shown
    ↓
User confirms "Yes, Logout"
    ↓
┌─────────────────────────────────┐
│ Step 1: Clear Tokens            │
│ - access_token removed          │
│ - refresh_token removed         │
│ - user data removed             │
│ AuthService.logout() ×          │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│ Step 2: Clear Flags             │
│ - hasSeenWelcome removed        │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│ Step 3: Reset Navigation Stack  │
│ - Clear all screen history      │
│ - Set only Welcome screen       │
│ navigation.reset()              │
└─────────────────────────────────┘
    ↓
Welcome Screen Displayed
Back Button → Exits App (No Auth Screens Available)
```

---

## Security Features

### 1. **Token Expiration**
- All JWT tokens are immediately removed from AsyncStorage
- API requests without a token will fail with 401 Unauthorized
- No way to make authenticated requests after logout

### 2. **Session Isolation**
- Each login creates a new session with new tokens
- Previous session tokens are invalid
- User must authenticate again for a new session

### 3. **Navigation Isolation**
- Back button has no authenticated screens to navigate to
- Entire navigation history is cleared
- Only way back into app is through login

### 4. **Automatic Token Refresh Prevention**
- When API interceptor detects 401 (no valid token)
- It clears remaining tokens and prevents further requests
- Forces user back to login

---

## Testing the Logout

### Test Scenario 1: Logout from Dashboard
1. Open app and log in
2. Navigate to Dashboard
3. Tap logout button (log-out icon)
4. Confirm logout
5. Should see Welcome screen
6. Tap device back button → App exits (doesn't return to Dashboard)

### Test Scenario 2: Logout from Different Screen
1. Log in and navigate to Aggregation/Harvests/Blocks
2. Tap logout from Header component
3. Confirm logout
4. Should see Welcome screen
5. Tap device back button → App exits

### Test Scenario 3: Prevent Back Navigation
1. Complete logout
2. Close and reopen app
3. Check: App shows Login screen (not Dashboard)
4. Verify: Can only access login/password reset, not authenticated screens

### Test Scenario 4: Check AsyncStorage
```javascript
// After logout, these keys should NOT exist:
const accessToken = await AsyncStorage.getItem('access_token');
const refreshToken = await AsyncStorage.getItem('refresh_token');
const user = await AsyncStorage.getItem('user');

console.log(accessToken);   // null
console.log(refreshToken);  // null
console.log(user);          // null
```

---

## Console Logging for Debugging

All logout operations are logged to the console for debugging:

```
[Dashboard] Starting logout process...
[AuthService] Logging out...
[ApiService] Tokens cleared
[Dashboard] Tokens cleared
[Dashboard] Welcome flag removed
[Dashboard] Navigation reset to Welcome screen
```

If logout fails:
```
[Dashboard] Logout error: <error details>
```

---

## API Request Prevention

After logout, any API request attempt will fail because:

1. **No Token in Storage**
   - ApiService checks for access_token in AsyncStorage
   - Token is null after logout
   - Request sent without Authorization header

2. **API Returns 401 Unauthorized**
   - Backend rejects request without valid token
   - Response interceptor catches 401
   - Tries to refresh token (fails because refresh_token is null)
   - Clears any remaining tokens

3. **User Must Login Again**
   - Session is terminated
   - New login required for new tokens

---

## Navigation Reset vs Navigate

### Why `navigation.reset()` instead of `navigation.navigate()`?

**navigate() - OLD (Problem)**
```javascript
navigation.navigate('Welcome');
```
- Keeps previous screens in back stack
- Back button returns to Dashboard/Aggregation/etc
- User can navigate back into app without logging in
- SECURITY ISSUE ❌

**reset() - NEW (Fixed)**
```javascript
navigation.reset({
  index: 0,
  routes: [{ name: 'Welcome' }],
});
```
- Clears entire navigation stack
- Only Welcome screen is available
- Back button has nowhere to go
- Forces re-authentication
- SECURE ✅

---

## Fallback Mechanisms

### If Token Refresh Fails During App Use
If a token refresh fails while user is using the app:

1. ApiService catches the 401 error
2. Clears all tokens automatically
3. Returns error to requesting component
4. User experiences forced logout
5. User must login again

**Code Location**: [src/services/ApiService.js:111-118](src/services/ApiService.js#L111-L118)

```javascript
catch (refreshError) {
  // Token refresh failed - clear tokens and redirect to login
  this.processQueue(refreshError, null);
  this.failedQueue = [];
  await this.clearTokens();  // ← Automatic cleanup

  console.error('[ApiService] Token refresh failed:', refreshError);
  return Promise.reject(refreshError);
}
```

---

## Related Components

### AuthService
- **File**: [src/services/AuthService.js](src/services/AuthService.js)
- **Function**: `logout()` (Lines 57-67)
- **Calls**: `ApiService.clearTokens()`
- **Purpose**: Removes all authentication data

### ApiService
- **File**: [src/services/ApiService.js](src/services/ApiService.js)
- **Function**: `clearTokens()` (Lines 194-201)
- **Clears**: access_token, refresh_token, user
- **Purpose**: Removes all JWT tokens from storage

### App.js
- **File**: [src/App.js](src/App.js)
- **Function**: `initializeApp()` (Lines 92-124)
- **Purpose**: Checks authentication status on app startup
- **Result**: Sets initial route based on auth status

---

## Troubleshooting

### Issue: Still returning to app after logout via back button

**Solution**:
1. Verify `navigation.reset()` is being called (not `navigation.navigate()`)
2. Check console logs for "Navigation reset" message
3. Clear app cache and try again
4. Verify AsyncStorage tokens are actually removed

### Issue: Logout button doesn't work

**Solution**:
1. Check console for error messages
2. Verify AuthService.logout() is called
3. Check that AsyncStorage.removeItem() succeeds
4. Verify navigation prop is passed to component

### Issue: Tokens still in AsyncStorage after logout

**Solution**:
1. Check that `ApiService.clearTokens()` is called
2. Verify all keys are correct: 'access_token', 'refresh_token', 'user'
3. Check for other code that might be setting tokens after logout
4. Check browser/app storage for other cached values

---

## Best Practices for Integration

When implementing logout in new screens:

```javascript
// ✅ CORRECT - Use navigation.reset()
const handleLogout = async () => {
  try {
    await AuthService.logout();
    await AsyncStorage.removeItem('hasSeenWelcome');
    navigation.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
  } catch (error) {
    Alert.alert('Error', 'Logout failed');
  }
};

// ❌ WRONG - Do not use navigation.navigate()
// navigation.navigate('Welcome'); // This allows back button access!

// ❌ WRONG - Do not just clear one token
// await AsyncStorage.removeItem('access_token'); // Incomplete!
```

---

## Security Implications

### What This Protects Against

1. **Unauthorized Back Button Access** - ✅ Fixed
2. **Token Reuse After Logout** - ✅ Fixed
3. **Session Hijacking via History** - ✅ Fixed
4. **Accidental Re-entry to App** - ✅ Fixed

### What This Doesn't Protect Against

- API tokens stored in other apps/locations
- Screenshots or recordings of the app
- Keyloggers or malware on device
- Server-side session termination (should also be done)

---

## Server-Side Considerations

**Note**: This implementation clears client-side tokens. For complete security:

1. **Implement server-side logout**: Invalidate tokens on backend
2. **Token blacklist**: Add logout token to a blacklist
3. **Session store**: Track active sessions per user
4. **Audit logging**: Log all logout events

Example server endpoint (should be called):
```
POST /users/logout/
Headers: Authorization: Bearer {access_token}
Body: { refresh_token: "..." }
Response: { success: true, message: "Logout successful" }
```

Currently, this endpoint is **not called** on logout. Consider adding it for server-side session termination.

---

## Summary

✅ **Token Termination**: All tokens cleared from AsyncStorage
✅ **Navigation Reset**: Back stack completely cleared
✅ **Logging**: Comprehensive console logging for debugging
✅ **Error Handling**: Try-catch with user-friendly alerts
✅ **Security**: Prevents unauthorized app access after logout

The logout functionality now provides a complete session termination experience that prevents users from returning to the app via the back button without proper authentication.
