# FMIS Mobile - API Architecture & Services

## Overview

This document describes the API service architecture implementing JWT authentication, offline-first data storage, and cloud synchronization.

## Architecture Components

### 1. ApiService (`src/services/ApiService.js`)

**Core API service with JWT token management**

#### Features:
- Automatic JWT token attachment to all requests
- Automatic token refresh on 401 responses
- Request/response interceptors for logging
- Token storage using AsyncStorage
- Request queue during token refresh
- Singleton pattern for app-wide usage

#### Key Methods:
```javascript
// HTTP Methods
ApiService.get(url, config)
ApiService.post(url, data, config)
ApiService.put(url, data, config)
ApiService.patch(url, data, config)
ApiService.delete(url, config)

// Token Management
await ApiService.setTokens(accessToken, refreshToken)
await ApiService.getAccessToken()
await ApiService.getRefreshToken()
await ApiService.clearTokens()

// User Management
await ApiService.setUser(user)
await ApiService.getUser()

// Health Check
await ApiService.ping()
```

#### Token Refresh Flow:
1. Request fails with 401 status
2. ApiService automatically attempts to refresh token using refresh token
3. If successful, retry original request with new access token
4. If refresh fails, clear tokens and require re-login
5. Queue concurrent requests during refresh to avoid duplicate refresh calls

---

### 2. AuthService (`src/services/AuthService.js`)

**Authentication and user management service**

#### Features:
- User login with phone and PIN
- Logout and session management
- Security question retrieval
- PIN reset via security question
- Current user information retrieval
- Authentication status checking

#### API Endpoints Used:
```
POST /api/users/login/
POST /api/users/security-question/
POST /api/users/reset-pin/
POST /api/users/token/refresh/
GET  /api/users/me/
```

#### Key Methods:
```javascript
// Login
const response = await AuthService.login(phone, pin)
// Returns: { success, user, message }

// Logout
await AuthService.logout()

// Get Security Question (for PIN reset)
const response = await AuthService.getSecurityQuestion(phone)
// Returns: { success, phone, securityQuestion }

// Reset PIN
const response = await AuthService.resetPin(phone, securityAnswer, newPin)
// Returns: { success, message }

// Get Current User
const response = await AuthService.getCurrentUser()
// Returns: { success, user }

// Check Authentication
const isAuth = await AuthService.isAuthenticated()
// Returns: boolean

// Get Stored User (from local storage)
const user = await AuthService.getStoredUser()
// Returns: user object or null
```

---

### 3. DatabaseService (`src/services/DatabaseService.js`)

**Local SQLite database for offline-first data storage**

#### Features:
- SQLite database initialization
- CRUD operations with automatic sync queue tracking
- Multiple tables (harvests, farmers, processing)
- Sync queue for tracking unsynced changes
- Sync status tracking per record

#### Database Tables:

**Harvests Table:**
```sql
CREATE TABLE harvests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER,
  farmer_id INTEGER,
  farmer_name TEXT,
  harvest_date TEXT,
  weight REAL,
  quality TEXT,
  notes TEXT,
  synced INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

**Farmers Table:**
```sql
CREATE TABLE farmers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER,
  name TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  plot_size REAL,
  synced INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

**Sync Queue Table:**
```sql
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id INTEGER NOT NULL,
  operation TEXT NOT NULL,  -- INSERT, UPDATE, DELETE
  data TEXT,  -- JSON stringified data
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

#### Key Methods:
```javascript
// Initialize database
await DatabaseService.init()

// Insert record (auto-adds to sync queue)
const id = await DatabaseService.insert('harvests', data)

// Update record (auto-adds to sync queue)
await DatabaseService.update('harvests', id, data)

// Delete record (auto-adds to sync queue)
await DatabaseService.delete('harvests', id)

// Get all records
const records = await DatabaseService.getAll('harvests')

// Get record by ID
const record = await DatabaseService.getById('harvests', id)

// Get unsynced records
const unsynced = await DatabaseService.getUnsyncedRecords()

// Mark as synced
await DatabaseService.markAsSynced('harvests', id, serverId)

// Get sync stats
const stats = await DatabaseService.getSyncStats()
// Returns: { pending, hasPending }
```

---

### 4. SyncService (`src/services/SyncService.js`)

**Synchronization service for offline-first data management**

#### Features:
- Background sync of local data to cloud
- Retry mechanism for failed syncs
- Sync progress tracking
- Event listeners for sync status updates
- Immediate sync attempt after local save
- Fallback to queue if immediate sync fails

#### Sync Flow:
1. **Local Save**: User creates/updates data
   - Save to local SQLite database
   - Add to sync queue automatically
   - Attempt immediate sync to cloud

2. **Immediate Sync** (if online):
   - Try to sync immediately
   - If successful: Remove from queue
   - If failed: Keep in queue for later

3. **Manual Sync** (user-triggered):
   - Process all records in sync queue
   - Send to appropriate API endpoints
   - Update local records with server IDs
   - Remove successfully synced records from queue
   - Track failed syncs with error messages

4. **Sync Queue Processing**:
   - INSERT operations → POST to API
   - UPDATE operations → PUT to API
   - DELETE operations → DELETE from API

#### Key Methods:
```javascript
// Sync all unsynced records
const result = await SyncService.syncAll()
// Returns: { success, message, results: { success, failed, errors } }

// Immediate sync after save
const synced = await SyncService.syncImmediately('harvests', recordId)
// Returns: boolean

// Get sync status
const status = await SyncService.getSyncStatus()
// Returns: { isSyncing, pendingRecords, hasPending }

// Add sync listener
SyncService.addListener((event, data) => {
  // Events: 'sync_start', 'sync_progress', 'sync_complete', 'sync_error'
})

// Check if online
const online = await SyncService.isOnline()
```

#### Sync Event Listeners:
```javascript
SyncService.addListener((event, data) => {
  switch (event) {
    case 'sync_start':
      // Sync started
      break;
    case 'sync_progress':
      // Progress update: { current, total, record }
      break;
    case 'sync_complete':
      // Sync finished: { success, failed, errors, message }
      break;
    case 'sync_error':
      // Sync error: { error }
      break;
  }
});
```

---

## Usage Examples

### 1. Login Flow

```javascript
import AuthService from './services/AuthService';

const handleLogin = async (phone, pin) => {
  try {
    const response = await AuthService.login(phone, pin);
    console.log('Logged in:', response.user);
    // Navigate to dashboard
  } catch (error) {
    console.error('Login failed:', error.message);
  }
};
```

### 2. Reset PIN Flow

```javascript
import AuthService from './services/AuthService';

// Step 1: Get security question
const getQuestion = async (phone) => {
  const response = await AuthService.getSecurityQuestion(phone);
  console.log('Question:', response.securityQuestion);
};

// Step 2: Reset PIN with answer
const resetPin = async (phone, answer, newPin) => {
  const response = await AuthService.resetPin(phone, answer, newPin);
  console.log('PIN reset:', response.message);
};
```

### 3. Offline-First Data Save

```javascript
import DatabaseService from './services/DatabaseService';
import SyncService from './services/SyncService';

const saveHarvest = async (harvestData) => {
  // Save to local database
  const id = await DatabaseService.insert('harvests', harvestData);

  // Try to sync immediately
  const synced = await SyncService.syncImmediately('harvests', id);

  if (synced) {
    console.log('Saved and synced to cloud');
  } else {
    console.log('Saved locally, will sync later');
  }
};
```

### 4. Manual Sync

```javascript
import SyncService from './services/SyncService';

const handleSync = async () => {
  // Add listener for progress updates
  SyncService.addListener((event, data) => {
    if (event === 'sync_progress') {
      console.log(`Syncing ${data.current} of ${data.total}`);
    } else if (event === 'sync_complete') {
      console.log(data.message);
    }
  });

  // Trigger sync
  const result = await SyncService.syncAll();
  console.log('Sync result:', result);
};
```

### 5. Check Sync Status

```javascript
import DatabaseService from './services/DatabaseService';
import SyncService from './services/SyncService';

const checkStatus = async () => {
  const status = await SyncService.getSyncStatus();
  console.log('Pending records:', status.pendingRecords);
  console.log('Currently syncing:', status.isSyncing);
};
```

---

## App Initialization

In your main App component:

```javascript
import React, { useEffect } from 'react';
import DatabaseService from './services/DatabaseService';

export default function App() {
  useEffect(() => {
    // Initialize database on app start
    DatabaseService.init().catch(error => {
      console.error('Database initialization failed:', error);
    });
  }, []);

  return (
    // Your app components
  );
}
```

---

## API Configuration

Edit `src/utils/apiConfig.js` to set your API base URL:

```javascript
export const API_BASE_URL = 'https://your-api-url.com/api';
```

---

## Security Best Practices

1. **Token Storage**: Tokens are stored in AsyncStorage (secure on both iOS and Android)
2. **Automatic Refresh**: Access tokens are automatically refreshed before expiration
3. **Token Cleanup**: Tokens are cleared on logout or failed refresh
4. **HTTPS Only**: All API calls use HTTPS
5. **No Token in URL**: Tokens are sent via Authorization header, never in URL

---

## Error Handling

All services throw errors that should be caught and handled:

```javascript
try {
  await AuthService.login(phone, pin);
} catch (error) {
  // error.message contains user-friendly error message
  console.error(error.message);
}
```

---

## Next Steps

1. **Initialize database** in App.js on app start
2. **Add sync button** to header/navbar for manual sync
3. **Show sync status** indicator (pending records count)
4. **Handle offline state** gracefully with user feedback
5. **Test offline scenarios** thoroughly
6. **Implement auto-sync** on app resume/network reconnect

---

## Testing

### Test Login:
- Use any 10-digit phone number
- Use any 4-digit PIN
- Mock API accepts all credentials for testing

### Test Offline Mode:
1. Turn off network
2. Create/update records
3. Check sync queue
4. Turn on network
5. Trigger manual sync
6. Verify records synced to server

---

## Troubleshooting

### Tokens not persisting:
- Check AsyncStorage permissions
- Verify AsyncStorage package is installed

### Sync failing:
- Check API endpoint URLs in SyncService
- Verify server_id is being set correctly
- Check network connectivity

### Database errors:
- Call `DatabaseService.init()` on app start
- Check SQLite permissions
- Verify expo-sqlite package is installed

---

For more details, see individual service files with inline documentation.
