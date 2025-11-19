# APK Network Error Debugging Guide

## Problem
When you build an APK and run it on a device, you get "Network Error" during login, even though it works fine locally in Expo Go.

## Root Causes

### 1. **Device Cannot Reach Backend IP**
The APK is trying to connect to `142.93.94.236:8000` (from your `.env` file), but:
- The device may be on a different network
- Firewall may be blocking the connection
- The IP may not be routable from your device's network

### 2. **DNS Resolution Issues**
If using a domain instead of IP, DNS resolution may fail on the device.

### 3. **Backend Server is Offline**
The backend at `142.93.94.236:8000` may be temporarily down.

---

## Debugging Steps

### Step 1: Check Backend Status
First, verify the backend is running and accessible:

```bash
# From your development machine
curl -X GET "http://142.93.94.236:8000/api/schema/" --connect-timeout 5

# Expected: Should get OpenAPI schema response (200 OK)
```

### Step 2: Check Device Network Connectivity
On your Android device:
1. Open **Settings → About phone → Status**
2. Verify you have WiFi or mobile data connected
3. Open a browser and try accessing any website to confirm internet works

### Step 3: Test Connectivity from Device
If you have ADB (Android Debug Bridge):
```bash
# Connect device via USB
adb shell

# Inside device shell, test backend
curl -X GET "http://142.93.94.236:8000/api/schema/"
```

### Step 4: Enable Detailed Logging
To see exactly what's happening with network requests:

1. Edit `.env` file:
```bash
EXPO_PUBLIC_ENABLE_DEBUG_LOGS=true
```

2. Rebuild the APK:
```bash
eas build --platform android --profile preview
```

3. After installation, check device logs:
```bash
adb logcat | grep -i "API"
```

This will show you:
- The exact URL being requested
- Network error type (ECONNREFUSED, ENOTFOUND, ETIMEDOUT, etc.)
- Detailed error diagnostics

### Step 5: Network Error Types

When you see a network error, the detailed logs will show one of these:

| Error Code | Meaning | Solution |
|-----------|---------|----------|
| **ECONNREFUSED** | Server refused connection (not listening) | Verify backend is running |
| **ENOTFOUND** | DNS resolution failed | Use IP instead of domain, or check DNS |
| **ETIMEDOUT** | Request timeout (server not responding) | Check network connectivity, increase timeout |
| **ECONNABORTED** | Connection aborted | Check firewall, network interruption |

---

## Solutions

### Solution 1: Use Local Network IP (Recommended for Development)
If your device is on the same local network as your backend:

1. Find your backend server's local IP:
```bash
# On backend server
hostname -I

# Or if using Docker
docker inspect <container_name> | grep IPAddress
```

2. Update `.env`:
```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.X.X:8000/api
```

3. Rebuild APK and test

### Solution 2: Use ngrok for Public Tunnel (Quick Testing)
If you need to test from outside your network:

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com

# Create tunnel to backend
ngrok http 8000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)

# Update .env
EXPO_PUBLIC_API_BASE_URL=https://abc123.ngrok.io/api

# Rebuild and test
```

### Solution 3: Check Firewall Rules
If using external IP `142.93.94.236`:

1. Verify firewall allows port 8000:
```bash
# On backend server
sudo ufw allow 8000
# Or for AWS/cloud provider, check Security Groups
```

2. Verify backend is listening on all interfaces:
```bash
# Backend should listen on 0.0.0.0:8000, not 127.0.0.1:8000
netstat -tulpn | grep 8000
```

### Solution 4: CORS Issues
If backend is accessible but requests are blocked:

1. Check Django CORS settings (in backend `settings.py`):
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # Add your device IP or domain:
    "http://192.168.X.X:8000",
]
```

---

## Production Deployment Checklist

If deploying APK to production:

- [ ] Backend server is on stable hosting (AWS, DigitalOcean, etc.)
- [ ] DNS is configured to point to backend
- [ ] Firewall allows inbound traffic on port 8000 (or 443 for HTTPS)
- [ ] HTTPS is enabled (use Let's Encrypt for free SSL)
- [ ] CORS is configured for your app domain
- [ ] Backend is monitored for uptime
- [ ] Implement automatic error reporting in app

---

## Quick Diagnostic Script

You can use this script to diagnose issues:

```bash
#!/bin/bash

echo "=== Rugyeyo APK Network Diagnostics ==="
echo ""

# Check backend is running
echo "Checking backend at 142.93.94.236:8000..."
if curl -s -o /dev/null -w "%{http_code}" "http://142.93.94.236:8000/api/schema/"; then
    echo "✅ Backend is accessible"
else
    echo "❌ Backend is not accessible"
fi

# Check local network IP
echo ""
echo "Your local IPs:"
hostname -I

echo ""
echo "If device is on same network, use local IP instead of 142.93.94.236"
```

---

## Still Having Issues?

1. Check Android logcat for detailed errors:
```bash
adb logcat | grep -E "(ApiService|Network|Error)"
```

2. Add custom error handling in AuthService to display network errors:
```javascript
// In AuthService.js
console.error('[Network Debug]', {
  url: error.config?.url,
  baseURL: error.config?.baseURL,
  method: error.config?.method,
  errorCode: error.code,
  errorMessage: error.message,
  timeout: error.config?.timeout,
});
```

3. Create an in-app settings screen to change API URL at runtime for testing

---

## Contact
If still stuck, gather this info:
- Device model and Android version
- Network type (WiFi/Mobile)
- Full error message from logcat
- `.env` configuration
- Backend server status
