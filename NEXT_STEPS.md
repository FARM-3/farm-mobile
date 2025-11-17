# APK Login Fix - Next Steps

## What Was Done

### 1. **Root Cause Identified**
- ✅ API is working fine (tested with curl)
- ✅ Backend returns correct response
- ✅ Issue is with Android APK network handling
- ✅ Android 9+ blocks HTTP by default

### 2. **Two Fixes Applied**

#### Fix #1: Android Network Security Config
- Allows HTTP to your backend IP (142.93.94.236)
- File: `android-network-security-config.xml`
- Referenced in: `app.json`

#### Fix #2: Offline Login & Better Errors
- Users can login with cached credentials if backend unavailable
- Improved error messages (no more generic "Network Error")
- Better logging for debugging
- File: `src/services/AuthService.js`

## Immediate Actions

### Step 1: Push to GitHub (Right Now)

```bash
cd c:\Users\USER\Desktop\Rugyeyo_mobile\fmis-mobile

# Check what changed
git status

# Add all changes
git add .

# Commit
git commit -m "Fix: Add HTTP security config and offline login support

- Add Android network security config to allow HTTP for backend
- Implement offline login with AsyncStorage caching
- Improve error messages for better debugging
- Add detailed logging to AuthService"

# Push to GitHub
git push origin main
```

**Files being committed:**
- `android-network-security-config.xml` (NEW)
- `app.json` (MODIFIED)
- `src/services/AuthService.js` (MODIFIED)

### Step 2: Build APK

```bash
# Verify you're logged in as refactoryacademy
eas whoami
# Should show: refactoryacademy

# Build APK
eas build --platform android --profile preview

# Wait for it to complete (5-10 minutes)
# You'll get a link to download the APK
```

### Step 3: Test on Device

1. Download APK from EAS link
2. Install on Android device
3. Try to login with:
   - Phone: `0770999999`
   - PIN: `0000`
4. **IMPORTANT**: First login must be with network ON
   - This caches your credentials for offline use

### Step 4: Check Results

**If login works:**
- ✅ You're done! The fix worked.
- ✅ Future logins will work even if temporarily offline
- ✅ Each login re-caches the user data

**If login still fails:**
- Check error message (should be more specific now)
- Run diagnostic: `curl http://142.93.94.236:8000/api/users/login/`
- Check if backend is actually running on DigitalOcean
- Check device has internet connection

## Understanding the Changes

### Android Network Security Config
```xml
<!-- Allows HTTP only to 142.93.94.236 -->
<!-- Everything else requires HTTPS -->
```

This is a **development exception**. For production, you'll need HTTPS (Let's Encrypt free SSL).

### Offline Login
First successful login is cached automatically:
- User data saved to AsyncStorage
- Tokens saved to AsyncStorage
- If next login fails due to network, cached data is used
- User sees warning: "Logged in offline using cached credentials"

**Security Note:**
- Only accepts login for same phone number
- Tokens still expire (security not compromised)
- Network login always preferred

## Troubleshooting

### "Network error. Please check your internet connection."
- Device has no internet
- Firewall blocking port 8000
- Backend is down

**Check:**
```bash
curl http://142.93.94.236:8000/api/schema/
```
Should return JSON. If not, backend is down or unreachable.

### "User not found. Please check your phone number."
- Phone number doesn't exist in database
- Wrong phone format

**Check:**
- Phone must be exactly 10 digits
- Must be `0770999999` for the test user

### "Invalid phone number or PIN. Please try again."
- Wrong PIN entered
- User account deactivated

**Check:**
- PIN is exactly 4 digits
- Test user PIN is `0000`
- User account is active in backend

### No error, but app doesn't load
- Login succeeded but security questions not set
- Need to navigate to security questions screen

**Expected behavior:**
- First login → Security questions setup screen
- Second login → Dashboard

## Testing Timeline

1. **Now**: Commit changes (`5 min`)
2. **Next**: Build APK (`10 min`)
3. **Then**: Download and install (`2 min`)
4. **Finally**: Test on device (`2 min`)

**Total: ~20 minutes**

## If You Get Stuck

### Check Backend Status
```bash
# SSH into DigitalOcean droplet
ssh root@142.93.94.236

# Check if Django is running
ps aux | grep gunicorn

# If not running, start it:
cd /home/rugyeyo/backend/api
source venv/bin/activate
gunicorn api.wsgi:application --bind 0.0.0.0:8000
```

### Check Network From Device (ADB)
```bash
# Connect device via USB
adb shell

# Test backend from device
curl -v http://142.93.94.236:8000/api/schema/

# Test login
curl -X POST http://142.93.94.236:8000/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{"phone":"0770999999","pin":"0000"}'
```

### Check APK Logs
```bash
# Real-time logs
adb logcat | grep -E "AuthService|ApiService|Network"

# Save to file
adb logcat > apk_logs.txt
```

## Success Indicators

✅ **Login works in APK**
- You can successfully login
- You're taken to security questions or dashboard
- No "Network error" message

✅ **Offline cache works**
- On first login, check AsyncStorage (database)
- Credentials are cached
- Next login attempt will use cache if network unavailable

✅ **Error messages are helpful**
- Instead of "Network Error"
- Shows: "Cannot connect to server. Please check your internet."
- More specific based on actual error

## Next Phase: HTTPS

Once APK login works, plan HTTPS setup:

1. Get SSL certificate (Let's Encrypt - free)
2. Configure Nginx reverse proxy
3. Update app to use HTTPS URL
4. Remove this HTTP security exception

See `APK_HTTP_FIX.md` for details.

---

**You're ready to go! Push to GitHub and rebuild.** 🚀
