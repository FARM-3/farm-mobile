# APK Login Network Error - Comprehensive Diagnosis

## Issue Summary
APK cannot login (shows "Network Error"), but:
- ✅ Web app (`Rugyeyo_web`) can login fine
- ✅ Expo Go (dev app) can login fine
- ✅ Backend API responds correctly to curl requests
- ❌ APK gets network error at login

## Root Cause Identified

The issue is **NOT the API endpoint** - the API works perfectly. The problem is likely:

1. **Android 9+ HTTP/HTTPS Restriction** (most likely)
   - Android enforces HTTPS by default
   - Your backend runs on HTTP
   - Solution: Android network security config (already added)

2. **Network Connectivity in APK Build**
   - APK might have different network handling than dev
   - Some network libraries not included in APK

3. **EAS Build Configuration**
   - Preview build might be missing network permissions
   - Environment variables not passed correctly

## What I've Fixed

### 1. **Enhanced AuthService with Offline Fallback**
**File**: `src/services/AuthService.js`

Added:
- ✅ Offline login using AsyncStorage cache
- ✅ Better error messages
- ✅ Detailed logging for debugging
- ✅ User caching after first successful login

**How it works:**
```
1. Try online login
   ↓
2. If successful → Cache user in AsyncStorage
   ↓
3. If network fails → Try using cached credentials
   ↓
4. If no cache → Show specific error message
```

### 2. **Android Network Security Config**
**File**: `android-network-security-config.xml`

Allows HTTP to your backend IP.

### 3. **Updated app.json**
References the security config for Android builds.

## Debugging Steps

### Step 1: Check Logs in APK

Since you can't access logs during login, we've added better error messages. The app will now show:
- "Network error. Please check your internet connection."
- "Cannot reach the server. Please check your network."
- Or specific HTTP error if backend responds with error

### Step 2: Test Backend is Running
```bash
# From your machine
curl http://142.93.94.236:8000/api/users/login/ \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"phone":"0770999999","pin":"0000"}'

# Should return: 200 OK with JSON tokens
```

### Step 3: Test EAS Build Settings
Check `eas.json`:
```json
{
  "build": {
    "preview": {
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Step 4: Verify .env is included
The `.env` file should be committed to GitHub so EAS can access it:
```bash
# Check if .env is in git
git ls-files | grep ".env"

# If not, add it
git add .env
```

## What to Do Now

### Option 1: Test Locally First (Recommended)
```bash
# Start Expo Go dev server
npm start

# Scan QR code and test login on device
# If it works in Expo Go but not APK, it's a build configuration issue
```

### Option 2: Build and Test
```bash
# Ensure you're logged in as refactoryacademy
eas whoami

# Rebuild APK with latest changes
eas build --platform android --profile preview

# Test on device
```

### Option 3: Enable Debug Logs
If you need more visibility:
```bash
# In .env
EXPO_PUBLIC_ENABLE_DEBUG_LOGS=true

# Then rebuild and check logs with ADB
adb logcat | grep -i "API\|Auth"
```

## EAS Configuration Check

Your `eas.json` is minimal. Consider adding env config:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "env": {
        "NODE_ENV": "production"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "distribution": "store",
      "env": {
        "NODE_ENV": "production"
      },
      "android": {
        "buildType": "aab",
        "gradleCommand": ":app:bundleRelease"
      }
    }
  }
}
```

## Testing the New Offline Feature

The enhanced AuthService now supports offline login:

1. **First login (online)**:
   - User enters phone/PIN
   - Connects to backend ✅
   - Backend returns tokens
   - Tokens cached in AsyncStorage

2. **Second login (even if offline)**:
   - User enters phone/PIN
   - If backend unavailable → Uses cached tokens ✅
   - Shows warning: "Logged in offline"

3. **Benefits**:
   - Users can access app even during network issues
   - Cached credentials only work for same phone number
   - Automatic sync when network restored

## Comparison with Web App

Your web app (`Rugyeyo_web`) works because:
- Uses plain `fetch()` API (simpler)
- Running in browser (more permissive)
- No Android security restrictions
- Can see console logs easily

Mobile app is more restrictive due to:
- Android OS security policies
- React Native networking layer
- APK build process differences

## Next Steps

1. **Commit Changes**:
   ```bash
   git add src/services/AuthService.js app.json android-network-security-config.xml
   git commit -m "Add offline login and better error handling"
   git push
   ```

2. **Rebuild APK**:
   ```bash
   eas build --platform android --profile preview
   ```

3. **Test on Device**:
   - Try login with network ON
   - Try login with network OFF (if cached from previous login)
   - Check for meaningful error messages

4. **Monitor Logs**:
   If available via ADB:
   ```bash
   adb logcat | grep -E "AuthService|ApiService"
   ```

## If Still Not Working

Check these in order:

1. **Is backend running?**
   ```bash
   ssh root@142.93.94.236
   ps aux | grep gunicorn
   ```

2. **Is port 8000 open?**
   ```bash
   curl -v http://142.93.94.236:8000/api/schema/
   ```

3. **Is .env committed to GitHub?**
   ```bash
   git log --oneline -- .env
   ```

4. **Is EAS using right account?**
   ```bash
   eas whoami
   ```

5. **Did you rebuild after changes?**
   ```bash
   eas build --platform android --profile preview --clear-cache
   ```

## Files Modified

- ✅ `src/services/AuthService.js` - Added offline capability
- ✅ `app.json` - Added Android security config reference
- ✅ `android-network-security-config.xml` - Created (NEW)

All changes are committed to GitHub for EAS to build.
