# Aggregation Feature Tests

This directory contains automated tests for the Aggregation feature components and utilities.

## Test Files

### 1. FormComponents.test.js
Tests all reusable form components used in the Aggregation feature:
- **CustomInput**: Text input with validation and error handling
- **CustomPicker**: Dropdown selection with modal interface
- **CustomMultiSelect**: Multi-select component with checkboxes
- **CustomDatePicker**: Date selection component
- **AutocompleteInput**: Farmer search with autocomplete suggestions
- **StepIndicator**: Multi-step form progress indicator

**Coverage**: 17 test cases

### 2. FarmerDetailScreen.test.js
Tests the farmer detail view screen:
- Renders all farmer information sections
- Handles missing data gracefully
- Displays boolean values correctly (Yes/No)
- Shows array values as comma-separated strings
- Navigation works correctly

**Coverage**: 10 test cases

### 3. FarmerHarvestDetailScreen.test.js
Tests the harvest detail view screen:
- Displays harvest information with correct formatting
- Shows payment details (UGX currency)
- Looks up farmer names from farmersList
- Handles edge cases and missing data
- Navigation functionality

**Coverage**: 11 test cases

### 4. aggregationHelpers.test.js
Tests utility functions:
- **capitalizeFirstLetter()**: String formatting with edge cases
- **getCurrentGPSLocation()**: GPS location retrieval with mocked permissions

**Coverage**: 14 test cases

## Running Tests

### Run all Aggregation tests
```bash
npm test -- --testPathPatterns="Aggregation"
```

### Run specific test file
```bash
npm test -- FormComponents.test.js
npm test -- FarmerDetailScreen.test.js
npm test -- FarmerHarvestDetailScreen.test.js
npm test -- aggregationHelpers.test.js
```

### Run with coverage report
```bash
npm test -- --testPathPatterns="Aggregation" --coverage
```

### Run in watch mode (re-runs on file changes)
```bash
npm test -- --testPathPatterns="Aggregation" --watch
```

### Run a specific test case
```bash
npm test -- --testPathPatterns="Aggregation" -t "renders correctly with label and value"
```

## Test Structure

All tests follow this pattern:
1. **Arrange**: Set up test data and mocks
2. **Act**: Render component or call function
3. **Assert**: Verify expected behavior

Example:
```javascript
it('displays farmer name', () => {
    // Arrange: Create mock data
    const mockRoute = { params: { farmer: { first_name: 'John', last_name: 'Doe' } } };

    // Act: Render component
    const { getByText } = render(<FarmerDetailScreen route={mockRoute} />);

    // Assert: Verify name is displayed
    expect(getByText('John Doe')).toBeTruthy();
});
```

## Mocked Dependencies

The following modules are mocked in `jest.setup.js`:
- `expo-location`: GPS location services
- `expo-font`: Font loading
- `expo-asset`: Asset loading
- `@react-native-async-storage/async-storage`: Local storage
- React Native animations

## Adding New Tests

When adding new components or features:

1. Create a new test file in this directory: `ComponentName.test.js`
2. Import the component and testing utilities
3. Write test cases covering:
   - Happy path (normal usage)
   - Edge cases (empty data, null values)
   - Error cases (validation, API failures)
   - User interactions (button clicks, text input)
4. Run tests to ensure they pass
5. Add to this README if needed

## Best Practices

- **Test behavior, not implementation**: Focus on what users see and do
- **Keep tests simple**: One concept per test
- **Use descriptive test names**: Clearly state what is being tested
- **Mock external dependencies**: Keep tests fast and isolated
- **Test edge cases**: Empty strings, null values, arrays, etc.

## Troubleshooting

### Tests won't run
- Check that all dependencies are installed: `npm install`
- Clear Jest cache: `npm test -- --clearCache`
- Verify Jest configuration in `jest.config.js`

### Import errors
- Ensure `transformIgnorePatterns` in `jest.config.js` includes the problematic module
- Check that the module is properly mocked in `jest.setup.js`

### Tests failing unexpectedly
- Check that mocks match the actual API
- Verify test data structure matches component expectations
- Use `console.log()` in tests for debugging

## Continuous Integration

These tests can be integrated into CI/CD pipelines:
- Run on every commit/pull request
- Block merges if tests fail
- Generate coverage reports

Example GitHub Actions workflow:
```yaml
- name: Run tests
  run: npm test -- --testPathPatterns="Aggregation" --coverage
```

## Coverage Goals

Current coverage (run `npm test -- --coverage` to see):
- **Statements**: Aim for >80%
- **Branches**: Aim for >75%
- **Functions**: Aim for >80%
- **Lines**: Aim for >80%

## Related Documentation

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
