# RUGYEYO FARM MANAGEMENT MOBILE APP

## Technical Manual
### Complete Technical Implementation Guide

---

**Version:** 1.0
**Date:** 3rd February 2026
**Organisation:** Rugyeyo Farm
**Document Type:** Internal Technical Documentation

---

## Table of Contents

1. [Introduction](#1-introduction)
   - 1.1 Purpose of the Technical Manual
   - 1.2 Scope of the System
   - 1.3 Intended Audience
   - 1.4 Definitions, Acronyms, and Abbreviations
   - 1.5 About the Mobile App
   - 1.6 Document Structure Overview

2. [System Overview](#2-system-overview)
   - 2.1 System Description
   - 2.2 Business Objectives
   - 2.3 Key Functional Requirements
   - 2.4 Non-Functional Requirements
   - 2.5 Supported User Roles
   - 2.6 High-Level System Capabilities

3. [User Journeys & Workflows](#3-user-journeys--workflows)
   - 3.1 Authentication User Journey
   - 3.2 Dashboard User Journey
   - 3.3 Task Management Workflow
   - 3.4 Aggregation Workflow
   - 3.5 Harvest Recording Workflow
   - 3.6 Coffee Processing Workflow

4. [System Architecture & Design](#4-system-architecture--design)
   - 4.1 Architectural Overview
   - 4.2 High-Level System Architecture
   - 4.3 Mobile App Architecture (React Native + Expo)
   - 4.4 Offline-First Architecture
   - 4.5 Navigation Structure

5. [Technology Stack](#5-technology-stack)
   - 5.1 Core Technologies
   - 5.2 Expo SDK & Libraries
   - 5.3 Third-Party Dependencies
   - 5.4 Development & Testing Tools

6. [Core Functional Modules](#6-core-functional-modules)
   - 6.1 Dashboard Module
   - 6.2 Task Management Module
   - 6.3 Aggregation Module
   - 6.4 Harvest Module
   - 6.5 Processing Module
   - 6.6 Block Management Module

7. [Services & API Integration](#7-services--api-integration)
   - 7.1 API Service Architecture
   - 7.2 Authentication Service
   - 7.3 Task Service
   - 7.4 Aggregation Service
   - 7.5 Processing Services
   - 7.6 Sync Service

8. [Security & Data Management](#8-security--data-management)
   - 8.1 Authentication & Authorization
   - 8.2 Token Management
   - 8.3 Offline Data Storage
   - 8.4 Data Synchronization

9. [Deployment & Maintenance](#9-deployment--maintenance)
   - 9.1 Environment Configuration
   - 9.2 Build & Deployment
   - 9.3 APK Generation
   - 9.4 Maintenance Guidelines

10. [Appendices](#10-appendices)
    - 10.1 File Structure
    - 10.2 Color Theme Reference
    - 10.3 Troubleshooting Guide

---

## 1. Introduction

### 1.1 Purpose of the Technical Manual

This technical manual provides comprehensive documentation of the Rugyeyo Farm Management Mobile Application. It covers the app's architecture, functionality, user workflows, and operational procedures, serving as a reference for developers, system administrators, and technical stakeholders.

### 1.2 Scope of the System

This manual covers the technical and functional aspects of the mobile application, including:

- System overview and architecture
- User journeys for field staff and supervisors
- Core features for coffee farm operations
- API integration with the backend system
- Offline-first data management
- Task assignment and completion workflows
- Coffee processing pipeline on mobile
- System maintenance and deployment procedures

### 1.3 Intended Audience

This document is intended for:

- **Mobile Developers** involved in app development and enhancement
- **System Administrators** managing the deployment and updates
- **Technical Support Personnel** providing troubleshooting support
- **Farm Management** requiring technical oversight
- **Project Stakeholders** needing technical understanding

Basic knowledge of React Native, Expo, and mobile development is assumed.

### 1.4 Definitions, Acronyms, and Abbreviations

| Term/Acronym | Description |
|--------------|-------------|
| Expo | A framework and platform for universal React applications |
| React Native | Framework for building native mobile apps using React |
| AsyncStorage | Persistent key-value storage for React Native |
| SQLite | Embedded relational database for local data storage |
| JWT | JSON Web Token for authentication |
| API | Application Programming Interface |
| APK | Android Package Kit (Android installation file) |
| PIN | Personal Identification Number (4-digit) |
| QC | Quality Control |
| GPS | Global Positioning System |
| UGX | Ugandan Shillings (currency) |

### 1.5 About the Mobile App

The Rugyeyo Farm Management Mobile App is a companion application to the web-based management system. It is designed for field staff, supervisors, and workers to:

- View and complete assigned tasks
- Record harvest data with photo evidence
- Track coffee through processing stages
- Register farmers and record harvest deliveries
- Work offline with automatic data synchronization

### 1.6 Document Structure Overview

This document is organized into logical sections:

- **Section 1-2:** Introduction and system overview
- **Section 3:** User journeys and workflows
- **Section 4-5:** Technical architecture and technology stack
- **Section 6:** Detailed module documentation
- **Section 7:** Services and API integration
- **Section 8:** Security and data management
- **Section 9:** Deployment and maintenance
- **Section 10:** Appendices and reference materials

---

## 2. System Overview

### 2.1 System Description

The Rugyeyo Farm Management Mobile App is a React Native application built with Expo, designed to extend farm management capabilities to field operations. The app provides:

- **Task Management:** View assigned tasks, accept/reject, start, and complete with photo evidence
- **Harvest Recording:** Record coffee harvests from farm workers with weight and quality data
- **Farmer Aggregation:** Register external farmers and record their harvest deliveries
- **Processing Pipeline:** Track coffee through quality control, fermentation, drying, and bagging
- **Offline Capability:** Full functionality without internet, with automatic sync when connected

### 2.2 Business Objectives

The mobile app supports these business objectives:

**Field Operations Digitization**
- Enable paperless task tracking and completion
- Capture photo evidence of completed work
- GPS-enabled location tracking for harvest records

**Real-Time Data Collection**
- Immediate recording of harvest weights and quality
- Instant task status updates visible to management
- Reduced data entry errors through mobile forms

**Operational Continuity**
- Offline-first design for areas with poor connectivity
- Automatic background synchronization
- Local data persistence for reliability

**Worker Accountability**
- Task acceptance and completion tracking
- Photo evidence requirements
- Timestamped activity logs

### 2.3 Key Functional Requirements

#### 1. Authentication
- Secure login using phone number and 4-digit PIN
- Security questions for PIN recovery
- Automatic session management with token refresh
- Persistent login across app restarts

#### 2. Task Management
- View tasks assigned from web application
- Accept, reject, start, and complete tasks
- Capture completion photos
- Add completion comments
- Calendar view of scheduled tasks
- Status badges (Accepted, In Progress, Completed)

#### 3. Harvest Recording
- Record production harvests from farm workers
- Capture weight, grade, and worker assignment
- Generate payment vouchers
- Track harvest history

#### 4. Aggregation
- Register external farmer suppliers
- Record farmer harvest deliveries
- Track pricing and payments
- GPS location capture
- Photo evidence of deliveries

#### 5. Coffee Processing
- **Quality Control:** Ripeness scoring, floating tests
- **Processing Types:** Fermentation, natural sundrying, washing
- **Drying:** Monitor drying progress
- **Bagging:** Record final bagging weights

#### 6. Offline Capability
- Local SQLite database for data persistence
- AsyncStorage for authentication tokens
- Background sync when connectivity restored
- Conflict resolution for data updates

### 2.4 Non-Functional Requirements

#### 1. Performance Requirements
- App launch time under 3 seconds
- Smooth navigation transitions (60 FPS)
- Efficient memory usage for low-end devices
- Background sync without UI blocking

#### 2. Security Requirements
- PIN-based authentication with JWT tokens
- Automatic token refresh
- Secure local storage of credentials
- Session timeout handling

#### 3. Reliability Requirements
- Offline-first architecture
- Graceful error handling
- Automatic retry for failed syncs
- Data integrity preservation

#### 4. Usability Requirements
- Consistent coffee-themed UI
- Large touch targets for field use
- Clear visual feedback for actions
- Simple navigation patterns

#### 5. Compatibility Requirements
- Android 8.0+ support
- Various screen sizes and densities
- Low-end device optimization
- Expo Go and standalone builds

### 2.5 Supported User Roles

#### 1. Field Staff (Farm Workers)
**Description:** Workers who perform daily farm operations.

**Responsibilities:**
- View and accept assigned tasks
- Complete tasks with photo evidence
- Record harvest activities
- Report issues or exceptions

**Access:**
- Task management screens
- Harvest recording
- Limited processing access

#### 2. Supervisor
**Description:** Staff overseeing field operations and quality control.

**Responsibilities:**
- Monitor task completion
- Perform quality control assessments
- Manage processing stages
- Register farmers for aggregation

**Access:**
- Full task management
- All processing screens
- Aggregation management
- Harvest approval

### 2.6 High-Level System Capabilities

**Task Execution**
- Mobile-first task workflow
- Photo evidence capture
- Real-time status updates
- Calendar scheduling view

**Data Collection**
- Harvest weight recording
- Quality grading
- GPS location capture
- Barcode/QR scanning support

**Processing Tracking**
- Stage-by-stage monitoring
- Batch management
- Quality metrics at each stage
- Duration tracking

**Offline Operations**
- Full functionality without internet
- Local data storage
- Automatic synchronization
- Conflict resolution

---

## 3. User Journeys & Workflows

### 3.1 Authentication User Journey

**Step 1: Welcome Screen**
- First-time users see welcome screen with farm branding
- "Get Started" button initiates login flow
- Welcome screen only shown once (stored in AsyncStorage)

**Step 2: Login**
- User enters 10-digit phone number
- User enters 4-digit PIN
- System validates credentials against backend API
- On success, JWT tokens stored locally

**Step 3: Security Questions (First-time Setup)**
- If user hasn't set up security questions
- System redirects to security questions screen
- User selects and answers 3 security questions
- Answers stored for future PIN recovery

**Step 4: Dashboard Access**
- Upon successful authentication
- User redirected to main dashboard
- Background sync initiated

**PIN Reset Flow:**
1. User taps "Forgot PIN" on login screen
2. Enters phone number for verification
3. Answers 3 security questions
4. Sets new 4-digit PIN
5. Returns to login with new PIN

### 3.2 Dashboard User Journey

**Access Dashboard:**
- Authenticated users land on dashboard after login
- Dashboard displays key statistics and quick actions

**Dashboard Elements:**
- Welcome message with user name
- Weather information display
- Task count badge on Tasks button
- Quick action buttons:
  - Tasks (with unaccepted count badge)
  - Aggregation
  - Harvests
  - Processing

**Navigation:**
- Tap any button to access respective module
- Bottom navigation for main sections
- Profile access via header

### 3.3 Task Management Workflow

**Step 1: View Assigned Tasks**
- Navigate to Tasks from dashboard
- Calendar view shows task dates with indicators
- Dots on calendar indicate days with tasks
- List view shows tasks for selected date

**Step 2: Accept Task**
- Tap on task to view details
- Review task description and requirements
- Tap "Accept Task" to confirm
- Status changes to "Accepted"
- Modal stays open to show "Start Task" button

**Step 3: Start Task**
- Tap "Start Task" when ready to begin
- Status changes to "In Progress"
- Start time recorded

**Step 4: Complete Task**
- Capture required photos using camera
- Add completion comments
- Tap "Complete Task"
- Photos and data synced to backend

**Step 5: Sync & Confirmation**
- Automatic sync uploads submission
- Task status updated in web app
- Photos uploaded to server storage

### 3.4 Aggregation Workflow

**Farmer Registration:**
1. Navigate to Aggregation module
2. Tap "Register Farmer" tab
3. Fill farmer details:
   - Personal information
   - Location (with GPS capture)
   - Coffee variety grown
   - Number of trees
   - Land ownership status
4. Submit registration

**Harvest Recording:**
1. Select "Farmer Harvests" tab
2. Tap "New Harvest"
3. Select registered farmer
4. Enter harvest details:
   - Weight on delivery
   - Coffee type
   - Price per kg
   - Amount paid
   - Payment status
5. Capture delivery photo
6. Submit harvest record

### 3.5 Harvest Recording Workflow

**Step 1: Create New Harvest**
- Navigate to Harvests from dashboard
- Tap "+" to add new harvest
- Select worker/staff member
- Enter weight and grade

**Step 2: Record Details**
- Select coffee variety
- Enter quality notes
- Capture optional photos
- Set payment status

**Step 3: Generate Voucher**
- System calculates payment
- View payment voucher
- Share/print voucher if needed

### 3.6 Coffee Processing Workflow

**Quality Control:**
1. Navigate to Processing → Quality Control
2. Select harvest batch
3. Record ripeness score (1-5 scale)
4. Perform floating test
5. Determine processing route

**Fermentation/Washing:**
1. Create processing batch
2. Record fermentation start
3. Monitor duration
4. Record completion

**Drying:**
1. Transfer batch to drying
2. Record drying bed/table
3. Monitor moisture levels
4. Mark drying complete

**Bagging:**
1. Move to bagging stage
2. Record bag weights
3. Generate batch record
4. Mark processing complete

---

## 4. System Architecture & Design

### 4.1 Architectural Overview

The mobile app follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                      MOBILE APP LAYER                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            React Native (Expo SDK 54)               │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐    │    │
│  │  │ Screens  │ │Components│ │    Services      │    │    │
│  │  └──────────┘ └──────────┘ └──────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (REST API)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   LOCAL STORAGE LAYER                        │
│  ┌───────────────────┐  ┌───────────────────────────────┐   │
│  │   AsyncStorage    │  │       SQLite Database         │   │
│  │  (Auth Tokens)    │  │    (Offline Data Cache)       │   │
│  └───────────────────┘  └───────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Background Sync
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND API LAYER                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Django REST Framework Backend               │    │
│  │        http://142.93.94.236:8000/api                │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 High-Level System Architecture

The system consists of three primary layers:

**1. Presentation Layer (Screens & Components)**
- React Native screens with navigation
- Reusable UI components
- Theme-consistent styling

**2. Business Logic Layer (Services)**
- API communication services
- Data transformation and validation
- Offline sync management

**3. Data Layer (Storage)**
- AsyncStorage for key-value data (tokens, settings)
- SQLite for structured offline data
- Local file storage for photos

### 4.3 Mobile App Architecture (React Native + Expo)

**Build System:**
- Expo SDK 54 for development and builds
- React Native 0.81.5 as core framework
- Expo managed workflow for easier development

**Application Structure:**
```
src/
├── App.js                  # Main app with navigation
├── index.js                # Entry point
├── components/             # Reusable UI components
│   ├── Header.js           # App header component
│   ├── BottomNav.js        # Bottom navigation
│   ├── SimpleHeader.js     # Simple back header
│   ├── CustomAlert.js      # Alert modal component
│   ├── CustomPicker.js     # Dropdown picker
│   └── ...
├── features/               # Feature-based modules
│   ├── dashboard/          # Dashboard screens
│   │   ├── screens/
│   │   │   ├── DashboardScreen.js
│   │   │   ├── LoginScreen.js
│   │   │   ├── TaskCalendarScreen.js
│   │   │   └── ...
│   │   └── components/
│   │       └── TaskDetailModal.js
│   ├── Aggregation/        # Aggregation module
│   ├── harvest/            # Harvest module
│   ├── ProcessingScreen/   # Processing module
│   └── blocks/             # Block management
├── services/               # API and business logic
│   ├── ApiService.js       # Core API client
│   ├── AuthService.js      # Authentication
│   ├── taskService.js      # Task management
│   ├── aggregationService.js
│   ├── DatabaseService.js  # SQLite operations
│   ├── SyncService.js      # Data synchronization
│   └── ...
├── theme/                  # Styling and theming
│   ├── colors.js           # Color definitions
│   ├── fonts.js            # Font configuration
│   └── typography.js       # Text styles
├── utils/                  # Utility functions
│   ├── apiConfig.js        # API configuration
│   ├── constants.js        # App constants
│   └── numberFormatter.js  # Number formatting
└── assets/                 # Static assets
    ├── fonts/              # Custom fonts
    └── images/             # App images
```

### 4.4 Offline-First Architecture

The app implements an offline-first approach:

**Data Flow:**
1. User performs action (e.g., complete task)
2. Data saved to local storage immediately
3. Sync service checks connectivity
4. When online, data uploaded to backend
5. Local data marked as synced

**Sync Strategy:**
```javascript
// Automatic sync on action completion
const handleComplete = async () => {
    // 1. Save locally first
    await saveSubmissionLocally(submission);

    // 2. Attempt immediate sync
    const syncResult = await syncTaskSubmissions();

    // 3. Update UI based on result
    if (syncResult.success) {
        // Data synced successfully
    } else {
        // Will retry on next connectivity
    }
};
```

**Conflict Resolution:**
- Last-write-wins for most data
- Server data takes precedence on conflicts
- Local changes preserved until successfully synced

### 4.5 Navigation Structure

The app uses React Navigation with a stack navigator:

```javascript
// Navigation Hierarchy
NavigationContainer
└── Stack.Navigator
    ├── Welcome           (Public - First launch)
    ├── Login             (Public)
    ├── SecurityQuestions (Auth setup)
    ├── Dashboard         (Protected - Main screen)
    ├── TaskCalendar      (Protected)
    ├── Aggregation       (Protected)
    │   ├── FarmerDetailScreen
    │   └── FarmerHarvestDetailScreen
    ├── Harvests          (Protected)
    │   ├── HarvestDetails
    │   ├── HarvestForm
    │   └── PaymentVoucher
    ├── Processing        (Protected)
    │   ├── QualityControl
    │   ├── ProcessingType
    │   ├── Fermenting*
    │   ├── Washing*
    │   ├── NaturalSundrying*
    │   ├── Drying*
    │   └── Bagging*
    └── BlockSummary      (Protected)
```

---

## 5. Technology Stack

### 5.1 Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.81.5 | Mobile UI framework |
| React | 19.1.0 | Component library |
| Expo | 54.0.20 | Development platform |
| JavaScript | ES6+ | Programming language |

### 5.2 Expo SDK & Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| expo-camera | 17.0.10 | Camera access for photos |
| expo-image-picker | 17.0.10 | Photo selection/capture |
| expo-file-system | 19.0.17 | File operations |
| expo-location | 19.0.7 | GPS location services |
| expo-sqlite | 16.0.8 | Local SQLite database |
| expo-font | 14.0.8 | Custom font loading |
| expo-linear-gradient | 15.0.7 | Gradient backgrounds |
| expo-blur | 15.0.7 | Blur effects |
| expo-print | 15.0.7 | Document printing |
| expo-sharing | 14.0.7 | Content sharing |
| expo-status-bar | 3.0.8 | Status bar control |

### 5.3 Third-Party Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| @react-navigation/native | 7.1.17 | Navigation container |
| @react-navigation/native-stack | 7.3.28 | Stack navigator |
| @react-native-async-storage/async-storage | 2.2.0 | Key-value storage |
| @react-native-community/datetimepicker | 8.4.4 | Date/time selection |
| @react-native-community/netinfo | 11.4.1 | Network status |
| @react-native-picker/picker | 2.11.4 | Dropdown picker |
| @expo/vector-icons | 15.0.3 | Icon library |
| axios | 1.12.2 | HTTP client |

### 5.4 Development & Testing Tools

| Tool | Version | Purpose |
|------|---------|---------|
| ESLint | 9.39.0 | Code linting |
| Jest | 30.2.0 | Testing framework |
| jest-expo | 54.0.13 | Expo test utilities |
| @testing-library/react-native | 13.3.3 | Component testing |
| TypeScript | 5.9.3 | Type definitions |

---

## 6. Core Functional Modules

### 6.1 Dashboard Module

**Files:**
- `src/features/dashboard/screens/DashboardScreen.js`

**Purpose:** Central hub for app navigation and quick statistics.

**Features:**
- Welcome message with user name
- Weather information display
- Task count with unaccepted badge
- Quick action buttons:
  - Tasks (My Tasks)
  - Aggregation
  - Harvests
  - Processing

**Key Components:**
- Stat cards showing task counts
- Navigation buttons to main modules
- Profile access in header

**Data Flow:**
1. Component mounts and checks authentication
2. Fetches task counts via `fetchAssignedTasks()`
3. Displays statistics and enables navigation

### 6.2 Task Management Module

**Files:**
- `src/features/dashboard/screens/TaskCalendarScreen.js`
- `src/features/dashboard/components/TaskDetailModal.js`
- `src/services/taskService.js`

**Purpose:** View and complete tasks assigned from web application.

**Features:**
- **Calendar View:**
  - Weekly calendar strip
  - Dot indicators for days with tasks
  - Date selection and navigation

- **Task List:**
  - Tasks filtered by selected date
  - Status badges (Accepted, In Progress, Completed)
  - Priority indicators
  - Activity icons

- **Task Detail Modal:**
  - Task description and requirements
  - Accept/Reject workflow
  - Start task functionality
  - Photo capture for completion
  - Completion comments
  - Auto-sync on completion

**Task Statuses:**
- `assigned` - Newly assigned, awaiting response
- `accepted` - User accepted the task
- `rejected` - User rejected the task
- `in_progress` - User started working
- `completed` - Task finished with evidence

**Workflow:**
```
Assigned → Accept → In Progress → Complete (with photos) → Synced
                ↘ Reject
```

### 6.3 Aggregation Module

**Files:**
- `src/features/Aggregation/screens/AggregationScreen.js`
- `src/features/Aggregation/screens/FarmerDetailScreen.js`
- `src/features/Aggregation/screens/FarmerHarvestDetailScreen.js`
- `src/features/Aggregation/components/FormComponents.js`
- `src/services/aggregationService.js`

**Purpose:** Manage external farmer relationships and harvest collections.

**Features:**
- **Farmer Registry:**
  - Register new farmers
  - Personal information capture
  - GPS location recording
  - Coffee variety tracking
  - Land ownership details

- **Farmer Harvests:**
  - Record harvest deliveries
  - Weight and pricing
  - Payment tracking
  - Photo evidence
  - Delivery location

- **Data Display:**
  - Searchable farmer list
  - Expandable harvest details
  - Summary statistics

### 6.4 Harvest Module

**Files:**
- `src/features/harvest/screens/ProductionHarvestsScreen.js`
- `src/features/harvest/screens/HarvestFormScreen.js`
- `src/features/harvest/screens/HarvestDetailsScreen.js`
- `src/features/harvest/screens/PaymentVoucherScreen.js`
- `src/services/productionHarvestService.js`

**Purpose:** Record and manage coffee harvests from farm workers.

**Features:**
- Harvest entry form
- Worker selection
- Weight recording
- Quality grading
- Payment voucher generation
- Harvest history view

### 6.5 Processing Module

**Files:**
- `src/features/dashboard/screens/ProcessingScreen.js`
- `src/features/ProcessingScreen/screens/QualityControlScreen.js`
- `src/features/ProcessingScreen/screens/RipenessScreen.js`
- `src/features/ProcessingScreen/screens/FloatingScreen.js`
- `src/features/ProcessingScreen/screens/ProcessingTypeScreen.js`
- `src/features/ProcessingScreen/screens/FermentingFormScreen.js`
- `src/features/ProcessingScreen/screens/WashingFormScreen.js`
- `src/features/ProcessingScreen/screens/NaturalSundryingFormScreen.js`
- `src/features/ProcessingScreen/screens/DryingFormScreen.js`
- `src/features/ProcessingScreen/screens/BaggingFormScreen.js`

**Purpose:** Track coffee through all processing stages.

**Processing Stages:**

1. **Quality Control**
   - Ripeness scoring (1-5 scale)
   - Floating test results
   - Grade assignment
   - Processing route determination

2. **Processing Types**
   - Washed process
   - Natural sundrying
   - Honey process

3. **Fermentation** (Washed)
   - Fermentation start recording
   - Duration monitoring
   - Completion tracking

4. **Washing**
   - Washing operation recording
   - Quality checks

5. **Natural Sundrying**
   - Drying start recording
   - Progress monitoring

6. **Drying**
   - Drying bed assignment
   - Moisture monitoring
   - Completion marking

7. **Bagging**
   - Final bagging operations
   - Bag weight recording
   - Batch completion

### 6.6 Block Management Module

**Files:**
- `src/features/blocks/BlockSummary.js`
- `src/features/blocks/BlockDetailsScreen.js`
- `src/features/blocks/BlockDetailsForm.js`
- `src/services/blockService.js`

**Purpose:** Manage farm blocks and their details.

**Features:**
- View block list
- Block detail viewing
- Block registration
- Block information editing

---

## 7. Services & API Integration

### 7.1 API Service Architecture

**File:** `src/services/ApiService.js`

The ApiService is a singleton class managing all HTTP communication:

```javascript
class ApiService {
    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.setupInterceptors();
    }
}
```

**Key Features:**
- Automatic JWT token attachment
- Token refresh on 401 responses
- Request/response logging
- Network error diagnosis
- Request queue during token refresh

**Interceptors:**
- **Request:** Attaches Bearer token, normalizes URLs
- **Response:** Handles 401 for token refresh, logs errors

### 7.2 Authentication Service

**File:** `src/services/AuthService.js`

Handles user authentication and session management:

**Methods:**
- `login(phone, pin)` - Authenticate user
- `logout()` - Clear session and tokens
- `isAuthenticated()` - Check auth status
- `getRandomSecurityQuestions()` - Fetch security questions
- `setupSecurityAnswers()` - Save security answers
- `resetPin()` - Reset user PIN

**Token Storage:**
```javascript
// Tokens stored in AsyncStorage
await AsyncStorage.setItem('access_token', token);
await AsyncStorage.setItem('refresh_token', refreshToken);
await AsyncStorage.setItem('user', JSON.stringify(userData));
```

### 7.3 Task Service

**File:** `src/services/taskService.js`

Manages task assignment and completion workflow:

**Methods:**
- `fetchAssignedTasks()` - Get tasks from backend
- `saveSubmissionLocally()` - Store submission offline
- `syncTaskSubmissions()` - Upload to backend
- `getUnsyncedSubmissions()` - Get pending syncs
- `getAllLocalSubmissions()` - Get all local data

**Sync Flow:**
```javascript
// 1. Save locally with sync status
const submission = {
    ...data,
    localId: Date.now().toString(),
    isSynced: false,
    created_at: new Date().toISOString()
};
await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));

// 2. Sync to backend
const formData = new FormData();
// Add fields and photos...
await ApiService.post('/tasks/submissions/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});

// 3. Mark as synced
submission.isSynced = true;
submission.synced_at = new Date().toISOString();
```

### 7.4 Aggregation Service

**File:** `src/services/aggregationService.js`

Manages farmer and harvest data:

**Methods:**
- `fetchFarmers()` - Get registered farmers
- `registerFarmer()` - Add new farmer
- `fetchFarmerHarvests()` - Get harvest records
- `recordHarvest()` - Add harvest delivery

### 7.5 Processing Services

Multiple services for processing stages:

| Service | File | Purpose |
|---------|------|---------|
| qualityControl | `qualityControl.js` | QC operations |
| fermentingService | `fermentingService.js` | Fermentation |
| washingService | `washingService.js` | Washing stage |
| sundryingService | `sundryingService.js` | Natural drying |
| dryingService | `dryingService.js` | Drying stage |
| batchService | `batchService.js` | Batch management |

### 7.6 Sync Service

**File:** `src/services/SyncService.js`

Manages background data synchronization:

**Features:**
- Network connectivity monitoring
- Queued sync operations
- Retry logic for failed syncs
- Conflict resolution

---

## 8. Security & Data Management

### 8.1 Authentication & Authorization

**Authentication Method:**
Phone number + 4-digit PIN authentication:

```javascript
// Login request
POST /api/users/login/
{
    "phone": "0700000000",
    "pin": "1234"
}

// Response
{
    "access": "jwt_access_token",
    "refresh": "jwt_refresh_token",
    "user": {
        "id": 1,
        "phone": "0700000000",
        "name": "John Doe",
        "security_answers_set": true
    }
}
```

**Authorization Header:**
```javascript
headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
}
```

### 8.2 Token Management

**Token Storage:**
```javascript
// Stored in AsyncStorage
access_token  - JWT access token (short-lived)
refresh_token - JWT refresh token (longer-lived)
user          - User profile data (JSON)
```

**Automatic Token Refresh:**
```javascript
// On 401 response (token expired)
1. Queue the failed request
2. Attempt token refresh with refresh_token
3. On success, retry queued requests
4. On failure, clear tokens and redirect to login
```

### 8.3 Offline Data Storage

**AsyncStorage (Key-Value):**
- Authentication tokens
- User session data
- Task submissions (pending sync)
- App settings

**SQLite Database:**
- Cached farmers data
- Cached harvest records
- Processing batch data
- Sync queue

### 8.4 Data Synchronization

**Sync Strategy:**

1. **Immediate Sync:**
   - On task completion
   - On harvest recording
   - When connectivity restored

2. **Background Sync:**
   - Periodic sync check
   - Retry failed uploads
   - Queue management

3. **Conflict Resolution:**
   - Server data takes precedence
   - Local changes preserved until synced
   - Timestamped for ordering

---

## 9. Deployment & Maintenance

### 9.1 Environment Configuration

**Development Setup:**

1. Clone repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` file:
   ```
   EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api
   EXPO_PUBLIC_ENABLE_DEBUG_LOGS=true
   ```
4. Start development server:
   ```bash
   npm start
   ```

**Production Configuration:**

Create `.env` for production:
```
EXPO_PUBLIC_API_BASE_URL=http://142.93.94.236:8000/api
EXPO_PUBLIC_ENABLE_DEBUG_LOGS=false
```

### 9.2 Build & Deployment

**Development Build:**
```bash
# Start Expo development server
npm start

# Run on Android emulator/device
npm run android

# Run on iOS simulator (macOS only)
npm run ios
```

**Clear Cache:**
```bash
npm run start:clear
# or
npm run clear-cache
```

### 9.3 APK Generation

**Using EAS Build (Recommended):**

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS (first time)
eas build:configure

# Build preview APK
eas build --profile preview --platform android
```

**EAS Configuration (eas.json):**
```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

**Local Build (Alternative):**
```bash
# Run on device for development
npx expo run:android

# Or generate local APK (requires Android Studio)
cd android
./gradlew assembleRelease
```

### 9.4 Maintenance Guidelines

**Regular Tasks:**
- Monitor API connectivity
- Review sync failure logs
- Update dependencies periodically
- Test on various device sizes

**Troubleshooting:**

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| Login fails | API unreachable | Check network, verify API URL |
| Sync fails | Token expired | Re-login to refresh tokens |
| Photos not uploading | Network timeout | Check connection, retry |
| App crashes | Memory issue | Clear cache, restart app |

---

## 10. Appendices

### 10.1 File Structure

```
fmis-mobile/
├── src/
│   ├── App.js                    # Main application
│   ├── index.js                  # Entry point
│   ├── components/               # Shared components
│   │   ├── Header.js
│   │   ├── BottomNav.js
│   │   ├── SimpleHeader.js
│   │   ├── CustomAlert.js
│   │   ├── CustomPicker.js
│   │   ├── SearchableStaffPicker.js
│   │   └── ...
│   ├── features/                 # Feature modules
│   │   ├── dashboard/
│   │   │   ├── screens/
│   │   │   │   ├── DashboardScreen.js
│   │   │   │   ├── LoginScreen.js
│   │   │   │   ├── WelcomeScreen.js
│   │   │   │   ├── SecurityQuestionsScreen.js
│   │   │   │   ├── TaskCalendarScreen.js
│   │   │   │   └── ProcessingScreen.js
│   │   │   └── components/
│   │   │       └── TaskDetailModal.js
│   │   ├── Aggregation/
│   │   │   ├── screens/
│   │   │   │   ├── AggregationScreen.js
│   │   │   │   ├── FarmerDetailScreen.js
│   │   │   │   └── FarmerHarvestDetailScreen.js
│   │   │   ├── components/
│   │   │   ├── styles/
│   │   │   └── utils/
│   │   ├── harvest/
│   │   │   └── screens/
│   │   │       ├── ProductionHarvestsScreen.js
│   │   │       ├── HarvestFormScreen.js
│   │   │       ├── HarvestDetailsScreen.js
│   │   │       └── PaymentVoucherScreen.js
│   │   ├── ProcessingScreen/
│   │   │   └── screens/
│   │   │       ├── QualityControlScreen.js
│   │   │       ├── RipenessScreen.js
│   │   │       ├── FloatingScreen.js
│   │   │       ├── ProcessingTypeScreen.js
│   │   │       ├── CreateBatchScreen.js
│   │   │       ├── ViewBatchesScreen.js
│   │   │       ├── FermentingFormScreen.js
│   │   │       ├── WashingFormScreen.js
│   │   │       ├── NaturalSundryingFormScreen.js
│   │   │       ├── DryingFormScreen.js
│   │   │       ├── BaggingFormScreen.js
│   │   │       └── *SummaryScreen.js
│   │   └── blocks/
│   │       ├── BlockSummary.js
│   │       ├── BlockDetailsScreen.js
│   │       └── BlockDetailsForm.js
│   ├── services/                 # Business logic
│   │   ├── ApiService.js
│   │   ├── AuthService.js
│   │   ├── taskService.js
│   │   ├── aggregationService.js
│   │   ├── productionHarvestService.js
│   │   ├── qualityControl.js
│   │   ├── fermentingService.js
│   │   ├── washingService.js
│   │   ├── sundryingService.js
│   │   ├── dryingService.js
│   │   ├── batchService.js
│   │   ├── blockService.js
│   │   ├── staffService.js
│   │   ├── DatabaseService.js
│   │   ├── SyncService.js
│   │   └── WeatherService.js
│   ├── theme/                    # Styling
│   │   ├── colors.js
│   │   ├── fonts.js
│   │   └── typography.js
│   ├── utils/                    # Utilities
│   │   ├── apiConfig.js
│   │   ├── constants.js
│   │   ├── numberFormatter.js
│   │   └── networkDiagnostics.js
│   └── assets/                   # Static assets
│       ├── fonts/
│       └── images/
├── .env                          # Environment config
├── .env.example                  # Example config
├── app.json                      # Expo configuration
├── package.json                  # Dependencies
├── babel.config.js               # Babel configuration
└── eas.json                      # EAS Build config
```

### 10.2 Color Theme Reference

The app uses a consistent coffee-themed color palette:

```javascript
// src/theme/colors.js
const CoffeeColors = {
    // Primary Colors
    DARK_BROWN: '#4A3423',       // Primary dark (headers, buttons)
    MEDIUM_BROWN: '#6B4F3A',     // Secondary brown
    LIGHT_BROWN: '#8B7355',      // Accent brown

    // Backgrounds
    SCREEN_BG: '#FFF8F0',        // Screen background
    CARD_BG: '#FFFFFF',          // Card background

    // Accents
    GOLD: '#C4A052',             // Accent gold
    CREAM: '#F5E6D3',            // Light cream

    // Text
    TEXT_PRIMARY: '#2D2D2D',     // Primary text
    TEXT_SECONDARY: '#666666',   // Secondary text
    WHITE: '#FFFFFF',            // White text

    // Status Colors
    SUCCESS: '#4CAF50',          // Success green
    ERROR: '#D32F2F',            // Error red
    WARNING: '#FFA000',          // Warning orange
    INFO: '#2196F3',             // Info blue

    // Borders
    BORDER: '#E0E0E0',           // Border color
    BORDER_LIGHT: '#F0F0F0',     // Light border
};
```

### 10.3 Troubleshooting Guide

**Authentication Issues:**

| Symptom | Diagnosis | Resolution |
|---------|-----------|------------|
| "Network Error" on login | API unreachable | Check network, verify API URL in .env |
| "Invalid credentials" | Wrong phone/PIN | Verify credentials, use PIN reset |
| Session expires quickly | Token not refreshing | Check refresh token logic |
| Can't reset PIN | Security questions wrong | Answers are case-insensitive |

**Sync Issues:**

| Symptom | Diagnosis | Resolution |
|---------|-----------|------------|
| Tasks not appearing | API fetch failed | Check network, pull to refresh |
| Photos not uploading | Timeout or size | Compress images, check connection |
| Submissions not syncing | Offline mode | Connect to internet, retry |
| Duplicate entries | Multiple syncs | Check isSynced flag logic |

**Performance Issues:**

| Symptom | Diagnosis | Resolution |
|---------|-----------|------------|
| App slow to start | Large cache | Clear AsyncStorage |
| List scrolling laggy | Too many items | Implement pagination |
| Camera slow | High resolution | Lower image quality setting |
| Battery drain | Background sync | Optimize sync frequency |

**Build Issues:**

| Symptom | Diagnosis | Resolution |
|---------|-----------|------------|
| Build fails | Dependencies | Run `npm install`, clear cache |
| APK crashes | Missing config | Check app.json, eas.json |
| Icons missing | Asset not bundled | Check asset paths |

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 3 Feb 2026 | Technical Team | Initial documentation |

---

*This document is confidential and intended for internal use only.*

*Rugyeyo Farm Management Mobile App - Technical Manual v1.0*
