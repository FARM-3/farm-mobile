# APK Login Fix - Quick Checklist

## Pre-Deployment Checklist

### Backend Verification (Do First!)
- [ ] SSH into DigitalOcean: `ssh root@142.93.94.236`
- [ ] Check Django running: `ps aux | grep gunicorn`
- [ ] Test endpoint works:
  ```bash
  curl -X POST http://142.93.94.236:8000/api/users/login/ \
    -H "Content-Type: application/json" \
    -d '{"phone":"0770999999","pin":"0000"}'
  ```
  Expected: HTTP 200 with JSON tokens

### Code Changes Verification
- [ ] `android-network-security-config.xml` exists
- [ ] `app.json` references the security config
- [ ] `src/services/AuthService.js` has offline login code
- [ ] All files are correctly indented (no syntax errors)

### Git Commands (Execute In Order)
```bash
cd c:\Users\USER\Desktop\Rugyeyo_mobile\fmis-mobile

# Step 1: Check status
git status

# Step 2: Add all changes
git add .

# Step 3: Verify files to commit
git status  # Should show green "staged" files

# Step 4: Commit
git commit -m "Fix: Add HTTP security config and offline login support

- Add Android network security config to allow HTTP for backend
- Implement offline login with AsyncStorage caching
- Improve error messages and logging for better debugging"

# Step 5: Push to GitHub
git push origin main

# Step 6: Verify push succeeded
git log --oneline -5  # Should show your commit
```

### EAS Account Verification
- [ ] Run: `eas whoami`
- [ ] Should show: `refactoryacademy`
- [ ] If wrong account: `eas logout` then `eas login`

### Build APK
```bash
# Clear cache (optional but recommended)
eas build --platform android --profile preview --clear-cache

# Or just build normally
eas build --platform android --profile preview
```

- [ ] Wait for build to complete
- [ ] Get APK download link
- [ ] Download APK file

### Test on Device
- [ ] Install APK on Android device
- [ ] **First login: Network MUST be ON**
- [ ] Phone: `0770999999`
- [ ] PIN: `0000`
- [ ] Click login
- [ ] Wait for response

### Success Validation
- [ ] No "Network Error" message
- [ ] Directed to security questions or dashboard
- [ ] Can see user name in app
- [ ] Data loads properly

### Offline Test (Optional)
- [ ] Logout: Settings → Logout
- [ ] Turn airplane mode ON
- [ ] Try login again with same credentials
- [ ] Should work using cached data (with warning)
- [ ] Turn airplane mode OFF

## Troubleshooting Checklist

If login still fails:

### Check 1: Backend Running
```bash
ssh root@142.93.94.236
ps aux | grep gunicorn
# Should show gunicorn process running
```
- [ ] Backend is running
- [ ] If not, restart it

### Check 2: Network Accessible
```bash
curl http://142.93.94.236:8000/api/schema/
# Should return JSON, not error
```
- [ ] Backend responds to curl
- [ ] Port 8000 is accessible

### Check 3: Device Network
- [ ] Phone/tablet has WiFi or mobile data connected
- [ ] Can open browser and access any website
- [ ] Not using VPN that might block backend

### Check 4: Credentials Correct
- [ ] Phone is exactly `0770999999` (10 digits)
- [ ] PIN is exactly `0000` (4 digits)
- [ ] User exists in database

### Check 5: APK Built Correctly
- [ ] Rebuilt after code changes
- [ ] Didn't use cached build (`--clear-cache` option)
- [ ] Downloaded latest build from EAS

### Check 6: Android Security Config
- [ ] `android-network-security-config.xml` exists
- [ ] `app.json` references it with `networkSecurityConfig`
- [ ] Both files are in Git

### Check 7: Logs (With ADB)
```bash
# Connect phone via USB
adb devices
# Should show your device

# Watch logs while logging in
adb logcat | grep -E "AuthService|ApiService"
```
- [ ] Look for specific error messages
- [ ] Check if request is being sent
- [ ] Check response from server

## What Each Fix Does

### Android Security Config
- Allows HTTP traffic to `142.93.94.236` (your backend IP)
- Blocks HTTP to everything else (secure default)
- Allows HTTP to localhost and local network (for testing)

### Offline Login
- Caches user data after first login
- Uses cache if network unavailable
- Only works for same phone number (security)
- Automatic sync when network restored

### Better Error Messages
- Instead of "Network Error"
- Shows "Cannot connect to server"
- Shows "Invalid phone or PIN"
- Shows "Server error"
- Much more helpful!

## Expected Timeline

- Pre-check: 5 min
- Git commit: 2 min
- EAS build: 10 min
- Download: 2 min
- Install: 1 min
- Test: 2 min
- **Total: ~22 min**

## Files You're Deploying

```
android-network-security-config.xml  (NEW - tells Android to allow HTTP)
app.json                              (MODIFIED - references config)
src/services/AuthService.js          (MODIFIED - offline + better errors)
```

## After Success

1. Document that APK login works
2. Plan HTTPS migration
3. Start planning next features
4. Remove HTTP exception before production

## Emergency Fallback

If APK login completely broken:

1. Revert changes: `git revert <commit-hash>`
2. Rebuild: `eas build --platform android --profile preview`
3. Document issue
4. Investigate further

But this shouldn't be needed - the fixes are safe!

---

## Ready? Here's The Command Sequence

```bash
# 1. Go to project directory
cd c:\Users\USER\Desktop\Rugyeyo_mobile\fmis-mobile

# 2. Verify backend works
curl http://142.93.94.236:8000/api/users/login/

# 3. Check git status
git status

# 4. Add all changes
git add .

# 5. Commit
git commit -m "Fix: Add HTTP security config and offline login support"

# 6. Push
git push origin main

# 7. Check EAS account
eas whoami

# 8. Build APK
eas build --platform android --profile preview

# 9. Download and install APK

# 10. Test login with: 0770999999 / 0000

# 11. Check results
```

**Estimated time: 25 minutes** ⏱️

**Good luck! 🚀**
