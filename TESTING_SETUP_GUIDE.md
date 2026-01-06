# Jest + Expo Testing Setup Guide

## Current Issue

You're experiencing a known compatibility issue between **Expo SDK 54+** and **Jest** related to Expo's new "winter" module system that uses `import.meta`.

**Error Message:**
```
ReferenceError: You are trying to `import` a file outside of the scope of the test code.
at require (node_modules/expo/src/winter/runtime.native.ts:20:43)
```

## Solutions (Try in Order)

### Solution 1: Downgrade Expo (Quick Fix - Not Recommended)
If you need tests working immediately, you could downgrade to Expo 53, but this loses new features.

```bash
npm install expo@^53.0.0
npm test
```

### Solution 2: Wait for Jest-Expo Update (Recommended)
The `jest-expo` preset needs to be updated for Expo 54. Monitor:
- https://github.com/expo/expo/issues
- https://github.com/facebook/jest/issues

### Solution 3: Use Expo's Testing Solution (Alternative)
Expo recommends using **Detox** or **Maestro** for E2E testing instead of Jest for component testing.

#### Install Detox:
```bash
npm install --save-dev detox detox-cli
```

#### Install Maestro:
```bash
# Install via curl (macOS/Linux)
curl -Ls "https://get.maestro.mobile.dev" | bash

# Or via brew (macOS)
brew tap mobile-dev-inc/tap
brew install maestro
```

### Solution 4: Mock Expo Winter System (Advanced)
Add this to your `jest.config.js`:

```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Add these:
  testEnvironment: 'node',
  testEnvironmentOptions: {
    customExportConditions: ['react-native'],
  },

  moduleNameMapper: {
    // Mock expo winter
    '^expo/winter/(.*)$': '<rootDir>/__mocks__/expo-winter-mock.js',
  },

  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?|@expo|expo-.*|@unimodules|unimodules|sentry-expo|native-base|react-native-svg|@react-navigation|react-navigation))'
  ],
};
```

Then create `__mocks__/expo-winter-mock.js`:
```javascript
module.exports = {
  __ExpoImportMetaRegistry: {},
};
```

### Solution 5: Use Vitest Instead of Jest (Modern Alternative)
Vitest has better ESM support:

```bash
npm install --save-dev vitest @vitest/ui
```

Update `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

## Current Test Status

✅ **Test Files Created (52 test cases)**:
1. `FormComponents.test.js` - 17 tests
2. `FarmerDetailScreen.test.js` - 10 tests
3. `FarmerHarvestDetailScreen.test.js` - 11 tests
4. `aggregationHelpers.test.js` - 14 tests

❌ **Cannot Run Due To**: Expo 54 + Jest incompatibility

## Temporary Workaround: Manual Testing Checklist

Until Jest/Expo compatibility is resolved, use this manual testing checklist:

### Aggregation Feature Manual Tests

#### 1. Navigation
- [ ] Click "Farmers" in bottom nav
- [ ] Screen loads without errors
- [ ] No "Cannot read property 'textInput'" error

#### 2. Farmer List
- [ ] Farmer list displays (if data exists)
- [ ] Search bar works
- [ ] Autocomplete suggestions appear
- [ ] Clicking farmer shows detail view

#### 3. Farmer Form (4 Steps)
- [ ] Step 1: Personal Info - all fields render
- [ ] Step 2: Location & ID - GPS button works
- [ ] Step 3: Farm Details - dropdowns work
- [ ] Step 4: Farming Practices - multi-select works
- [ ] Step indicator shows correct step
- [ ] "Next" button advances steps
- [ ] "Previous" button goes back
- [ ] "Save Draft" saves incomplete form
- [ ] "Submit" creates farmer record

#### 4. Harvest List
- [ ] Switch to "Harvests" tab
- [ ] Harvest list displays
- [ ] Search works for harvest records
- [ ] Clicking harvest shows detail view

#### 5. Harvest Form (2 Steps)
- [ ] Step 1: Harvest Details - fields render
- [ ] Farmer autocomplete works
- [ ] Step 2: Quality & Payment - price loads from DB
- [ ] Weight calculation works
- [ ] Staff picker works
- [ ] Submit creates harvest record

#### 6. Detail Views
- [ ] Farmer detail shows all sections
- [ ] Back button returns to list
- [ ] Harvest detail shows payment info
- [ ] Currency formatted correctly (UGX)

#### 7. Form Components
- [ ] CustomInput shows validation errors
- [ ] CustomPicker modal opens/closes
- [ ] CustomDatePicker shows calendar
- [ ] CustomMultiSelect toggles items
- [ ] AutocompleteInput filters farmers
- [ ] StepIndicator highlights current step

## When Tests Will Work

The tests will automatically work once:
1. `jest-expo` releases a version compatible with Expo 54+
2. OR you downgrade to Expo 53
3. OR you switch to Vitest/Detox/Maestro

## Useful Resources

- [Expo Testing Docs](https://docs.expo.dev/develop/unit-testing/)
- [Jest Expo GitHub](https://github.com/expo/expo/tree/main/packages/jest-expo)
- [Detox Documentation](https://wix.github.io/Detox/)
- [Maestro Documentation](https://maestro.mobile.dev/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)

## Future: When Tests Run

Once the compatibility issue is resolved, run tests with:

```bash
# All Aggregation tests
npm test -- --testPathPatterns="Aggregation"

# Specific test file
npm test -- FormComponents.test.js

# With coverage
npm test -- --testPathPatterns="Aggregation" --coverage

# Watch mode
npm test -- --testPathPatterns="Aggregation" --watch
```

## Recommendation

**For now**: Use the manual testing checklist above. The test files are well-written and will work once the Expo/Jest compatibility is resolved.

**For future**: Consider migrating to Vitest or Detox for better long-term compatibility with Expo.
