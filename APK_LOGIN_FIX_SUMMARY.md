# APK Login Network Error - Complete Fix

## The Real Problem

**Android 9+ requires HTTPS for all network traffic by default** (called "cleartext traffic protection").

Your setup:
- ✅ Backend: HTTP on DigitalOcean (`http://142.93.94.236:8000`)
- ✅ Works in Expo Go (dev app has special permissions)
- ❌ Fails in APK (enforces security policies)

## What Was Fixed

### 1. Created Android Network Security Config
**File**: `android-network-security-config.xml`

This file tells Android to allow HTTP **only** for your backend IP:
```xml
<!-- Allow cleartext (HTTP) to your backend -->
<domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">142.93.94.236</domain>
</domain-config>
```

### 2. Updated app.json
Added reference to the security config:
```json
"android": {
  "networkSecurityConfig": "./android-network-security-config.xml",
  "permissions": [
    ...
    "android.permission.INTERNET"
  ]
}
```

## Build & Deploy Steps

### Quick Version
```bash
# 1. Push changes
git add .
git commit -m "Fix APK HTTP connectivity"
git push

# 2. Build APK
eas build --platform android --profile preview

# 3. Install and test
# Download APK from EAS, install on device
# Login with: 0770999999 / 0000
```

### Detailed Steps

**Step 1: Verify Changes**
```bash
cd c:\Users\USER\Desktop\Rugyeyo_mobile\fmis-mobile

# Check what changed
git status

# You should see:
# - android-network-security-config.xml (new file)
# - app.json (modified)
```

**Step 2: Login to EAS with Correct Account**
```bash
eas logout  # if needed
eas login
# Username: refactoryacademy
# Password: [your password]

eas whoami  # Verify you see "refactoryacademy"
```

**Step 3: Push to GitHub**
```bash
git add android-network-security-config.xml app.json
git commit -m "Fix: Add HTTP security exception for development backend"
git push origin main
```

**Step 4: Build**
```bash
eas build --platform android --profile preview
```
Wait for build to complete (5-10 minutes). You'll get a URL to download the APK.

**Step 5: Test**
1. Download APK from EAS
2. Transfer to Android device or use `adb install`
3. Open app
4. Try to login: **0770999999** / **0000**
5. Should now work! ✅

## Testing Without APK

If you want to test before rebuilding:

### Option 1: Test with Expo Go (Already Works)
```bash
npm start
# Scan QR code with Expo Go
# Login works
```

### Option 2: Test Backend Directly
```bash
curl -X POST "http://142.93.94.236:8000/api/users/login/" \
  -H "Content-Type: application/json" \
  -d '{"phone":"0770999999","pin":"0000"}'

# Should return JWT tokens
```

## Why This Happened

| Environment | HTTP Allowed? | Why |
|---|---|---|
| Expo Go | ✅ Yes | Dev app has special permissions |
| APK Built | ❌ No | Enforces Android security standards |
| Chrome Browser | ❌ No | Requires HTTPS (except localhost) |
| curl/API Testing | ✅ Yes | No restrictions on dev machine |

## Important Notes

⚠️ **For Development/Testing Only**
- The HTTP exception is temporary
- Before releasing to production, enable HTTPS
- See `APK_HTTP_FIX.md` for HTTPS setup

✅ **Files Changed**
1. `android-network-security-config.xml` - NEW
2. `app.json` - MODIFIED (added networkSecurityConfig)

📝 **Keep in Git**
- These files are part of your build configuration
- Commit them to GitHub
- They're needed for every APK build

## If It Still Doesn't Work

### Check 1: Backend Status
```bash
# Check backend is running
curl http://142.93.94.236:8000/api/schema/
# Should return JSON (200 OK)
```

### Check 2: Device Network
- On device: Settings → WiFi → Connected?
- Try opening website in browser

### Check 3: Rebuild from Scratch
```bash
eas build --platform android --profile preview --clear-cache
```

### Check 4: Check Logs on Device
```bash
# If you have ADB installed
adb logcat | grep -i "network\|api\|error"
```

## What You Can Do Now

1. **Test locally first** (Expo Go works)
2. **Push to GitHub** (so EAS can build)
3. **Build APK** (eas build)
4. **Download and test** on real device
5. **Celebrate** when login works! 🎉

## Next Phase: Production HTTPS

Once APK works with HTTP, plan to:
1. Set up Let's Encrypt SSL certificate
2. Configure Nginx reverse proxy
3. Update backend to `https://yourdomain.com/api`
4. Remove this HTTP exception
5. Release to production

See `APK_HTTP_FIX.md` for detailed HTTPS setup guide.

---

**TL;DR**:
- Android blocks HTTP
- Fixed with security config file
- Push + rebuild APK
- Login should work
- Plan HTTPS for production
