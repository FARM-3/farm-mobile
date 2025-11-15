# APK Network Error Fix - HTTP/HTTPS Issue

## Problem Identified

Your APK fails to login with "Network Error" because:

1. **Android 9+ (API 28+) blocks plain HTTP by default**
2. Your DigitalOcean backend runs on HTTP (`http://142.93.94.236:8000`)
3. Expo Go development app bypasses this restriction
4. Built APK enforces strict security policies

## Solution Applied

### What I've Done

1. **Created Android Network Security Config** (`android-network-security-config.xml`)
   - Allows HTTP only to your backend IP (142.93.94.236)
   - Allows HTTP to localhost and local network IPs
   - All other traffic requires HTTPS (secure default)

2. **Updated app.json** to reference the security config
   - Added `networkSecurityConfig` to android settings
   - Added INTERNET permission

## Build and Test

### Step 1: Commit Changes
```bash
cd c:\Users\USER\Desktop\Rugyeyo_mobile\fmis-mobile
git add .env app.json android-network-security-config.xml
git commit -m "Add HTTP security exception for development backend"
git push origin main
```

### Step 2: Build New APK
```bash
# Make sure you're logged in with refactoryacademy account
eas whoami  # Should show refactoryacademy

# Build the APK
eas build --platform android --profile preview
```

### Step 3: Install and Test
1. Download the APK from EAS
2. Install on Android device
3. Try to login with: `0770999999` / `0000`
4. Should now work! 🎉

## If Still Not Working

### Check 1: Verify Backend is Running
```bash
# SSH into your DigitalOcean droplet
ssh root@142.93.94.236

# Check if Django is running
ps aux | grep gunicorn
# or
docker ps  # if using Docker
```

### Check 2: Test from ADB (if you have it)
```bash
# Connect Android device via USB
adb shell

# Test connection
curl -X POST "http://142.93.94.236:8000/api/users/login/" \
  -H "Content-Type: application/json" \
  -d '{"phone":"0770999999","pin":"0000"}'
```

### Check 3: Check Device Network
1. Open device Settings
2. Go to WiFi settings
3. Verify you're connected to internet
4. Try accessing any website in browser

### Check 4: Test HTTP Response
From your development machine:
```bash
curl -v "http://142.93.94.236:8000/api/schema/" --connect-timeout 5
# Should get 200 OK
```

## Production Solution (HTTPS)

⚠️ **Important**: The HTTP exception is for development only!

For production, you should:

1. **Get HTTPS certificate** (free with Let's Encrypt)
   ```bash
   # On your DigitalOcean droplet
   sudo apt install certbot
   sudo certbot certonly --standalone -d yourdomain.com
   ```

2. **Configure Django for HTTPS**
   ```python
   # In settings.py
   SECURE_SSL_REDIRECT = True
   SESSION_COOKIE_SECURE = True
   CSRF_COOKIE_SECURE = True
   ```

3. **Update app to use HTTPS**
   ```bash
   # In .env
   EXPO_PUBLIC_API_BASE_URL=https://yourdomain.com/api
   ```

4. **Remove HTTP exception** from android-network-security-config.xml

5. **Remove this guide** before submitting to app store

## Backend Setup on DigitalOcean

Your current setup:
- ✅ Backend at: `http://142.93.94.236:8000`
- ✅ Database: PostgreSQL on same droplet
- ✅ Django running with Gunicorn
- ❌ No HTTPS (needs fixing for production)

### Recommended Production Setup

1. Use Let's Encrypt for free HTTPS
2. Reverse proxy with Nginx (handles SSL)
3. Configure Django behind Nginx

Example Nginx config:
```nginx
server {
    listen 443 ssl http2;
    server_name 142.93.94.236;  # or use a domain

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name 142.93.94.236;
    return 301 https://$server_name$request_uri;
}
```

## Files Modified

- `app.json` - Added networkSecurityConfig reference
- `android-network-security-config.xml` - Created (NEW)

## Next Steps

1. Push to GitHub
2. Build new APK
3. Test on device
4. If working, celebrate! 🎉
5. Start planning HTTPS migration for production

## References

- [Android Network Security Configuration](https://developer.android.com/training/articles/security-config)
- [Cleartext Traffic Security in Android 9](https://android-developers.googleblog.com/2018/04/introducing-android-9-pie.html)
- [Let's Encrypt Free SSL](https://letsencrypt.org/)
