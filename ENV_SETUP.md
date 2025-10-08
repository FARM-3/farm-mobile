# Environment Configuration Guide

## Overview

The app uses environment variables for API configuration, allowing easy switching between development, staging, and production environments without code changes.

## Setup Instructions

### 1. Create .env file

Copy the example file:
```bash
cp .env.example .env
```

Or manually create `.env` in the project root with:
```
EXPO_PUBLIC_API_BASE_URL=https://api-3181.onrender.com/api
```

### 2. Configure API URL

Edit `.env` file and set your desired API URL:

**Production:**
```
EXPO_PUBLIC_API_BASE_URL=https://api-3181.onrender.com/api
```

**Local Development (Backend running on localhost):**
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

**Local Network (Backend running on your machine, access from phone):**
```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:8000/api
```
*Replace `192.168.1.100` with your machine's local IP address*

**Staging:**
```
EXPO_PUBLIC_API_BASE_URL=https://staging-api.yourapp.com/api
```

### 3. Restart Expo Dev Server

**Important:** After changing `.env`, you MUST restart the Expo dev server:

```bash
# Stop current server (Ctrl+C)
# Then restart:
npm start
```

Changes to `.env` are only loaded when the dev server starts.

## Getting Your Local IP Address

### Windows:
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter

### Mac/Linux:
```bash
ifconfig
```
Look for "inet" address under your active network interface (usually en0 or wlan0)

### Quick way (any OS):
The Expo dev server shows your IP in the terminal when you run `npm start`

## Environment Variables

### Available Variables:

- `EXPO_PUBLIC_API_BASE_URL` - Base URL for the API (required)

### Adding New Variables:

1. Add to `.env` file with `EXPO_PUBLIC_` prefix:
   ```
   EXPO_PUBLIC_MY_VAR=value
   ```

2. Access in code:
   ```javascript
   const myVar = process.env.EXPO_PUBLIC_MY_VAR;
   ```

**Note:** Expo requires the `EXPO_PUBLIC_` prefix for environment variables to be exposed to the app.

## How It Works

1. **Environment File**: `.env` file stores environment-specific values
2. **API Config**: `src/utils/apiConfig.js` reads from environment variables
3. **Services**: All services use `API_BASE_URL` from apiConfig.js
4. **Build Time**: Environment variables are loaded at build/start time
5. **Fallback**: If no .env exists, defaults to production URL

## Troubleshooting

### Changes not taking effect?
- Restart Expo dev server (`npm start`)
- Clear Metro bundler cache: `npm start -- --clear`
- Check console for "Using API URL:" log message

### Can't connect to local API?
- Ensure backend server is running
- Check firewall allows connections on port
- Use local IP (not localhost) when testing on physical device
- Verify you're on the same network as your development machine

### .env file not found?
- Create it in project root (same level as package.json)
- Copy from .env.example
- Ensure it's named exactly `.env` (with the dot)

### Environment variable is undefined?
- Check you used `EXPO_PUBLIC_` prefix
- Restart Expo dev server
- Check spelling matches exactly

## Best Practices

1. **Never commit .env to git** - Contains environment-specific values
2. **Keep .env.example updated** - Template for other developers
3. **Restart after changes** - Environment variables are loaded at start
4. **Use descriptive names** - Make variable purpose clear
5. **Document new variables** - Add to this guide when adding new ones

## Security Notes

- ⚠️ **Client-side exposure**: All `EXPO_PUBLIC_*` variables are exposed in the app bundle
- ⚠️ **Never put secrets in .env**: API keys, passwords, etc. should NOT be in client-side env vars
- ✅ **Safe to use for**: URLs, feature flags, public configuration
- ✅ **Authentication**: Use backend authentication (JWT tokens) for security

## Quick Reference

### Switching to Local Development:
1. Edit `.env`: `EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api`
2. Run: `npm start`

### Switching to Production:
1. Edit `.env`: `EXPO_PUBLIC_API_BASE_URL=https://api-3181.onrender.com/api`
2. Run: `npm start`

### Check Current API URL:
Look for console log when app starts:
```
[API Config] Using API URL: https://api-3181.onrender.com/api
```

---

For more information on Expo environment variables:
https://docs.expo.dev/guides/environment-variables/
