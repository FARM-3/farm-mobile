// DEBUG utility to check task API directly
// Usage: import and call debugTaskAPI() from TaskCalendarScreen

import ApiService from '../services/ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const debugTaskAPI = async () => {
  console.log('======= TASK API DEBUG =======');

  try {
    // Check if user is logged in
    const token = await AsyncStorage.getItem('authToken');
    const userStr = await AsyncStorage.getItem('currentUser');
    const user = userStr ? JSON.parse(userStr) : null;

    console.log('1. Auth Token exists:', !!token);
    console.log('2. Current User:', user ? {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role
    } : 'NOT LOGGED IN');

    // Try fetching assigned tasks
    console.log('3. Calling /tasks/submissions/my-assigned-tasks/...');
    const response = await ApiService.get('/tasks/submissions/my-assigned-tasks/');

    console.log('4. API Response:', {
      success: response.success,
      dataType: typeof response.data,
      dataLength: Array.isArray(response.data) ? response.data.length : 'not array',
      error: response.error
    });

    if (response.success && response.data) {
      console.log('5. Full API Response Data:', JSON.stringify(response.data, null, 2));

      if (response.data.length > 0) {
        console.log('6. First task details:', response.data[0]);
      } else {
        console.log('6. No tasks returned - possible reasons:');
        console.log('   - No tasks assigned to this user');
        console.log('   - User ID mismatch');
        console.log('   - All tasks marked as completed');
        console.log('   - Check assigned_to field contains user ID:', user?.id);
      }
    } else {
      console.log('5. API call failed:', response.error);
    }

  } catch (error) {
    console.error('DEBUG ERROR:', error);
  }

  console.log('======= END DEBUG =======');
};
