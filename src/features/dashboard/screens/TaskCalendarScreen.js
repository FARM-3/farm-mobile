import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
// Conditionally import BarCodeScanner - it may not be available in Expo Go
let BarCodeScanner;
try {
  BarCodeScanner = require('expo-barcode-scanner').BarCodeScanner;
} catch (e) {
  console.log('[TaskCalendar] BarCodeScanner not available - using manual input only');
  BarCodeScanner = null;
}
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import CustomAlert from '../../../components/CustomAlert';
import { fetchBlocks } from '../../../services/blockService';
import { fetchAllStaff } from '../../../services/staffService';
import { fetchAssignedTasks } from '../../../services/taskService';
import TaskDetailModal from '../components/TaskDetailModal';

const TASKS_STORAGE_KEY = 'daily_tasks';

const activityOptions = [
  { id: 'harvest', label: 'Harvest Recording', icon: 'leaf' },
  { id: 'aggregation', label: 'Farmer Aggregation', icon: 'people' },
  { id: 'processing', label: 'Processing', icon: 'settings' },
  { id: 'quality', label: 'Quality Control', icon: 'checkmark-circle' },
  { id: 'ripeness', label: 'Ripeness Testing', icon: 'water' },
  { id: 'floating', label: 'Floating Test', icon: 'flask' },
  { id: 'drying', label: 'Drying', icon: 'sunny' },
  { id: 'fermentation', label: 'Fermentation', icon: 'time' },
  { id: 'packaging', label: 'Packaging', icon: 'cube' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

export default function TaskCalendarScreen({ navigation }) {
  const [tasks, setTasks] = useState([]); // Tasks for selected date
  const [allTasks, setAllTasks] = useState([]); // All tasks (for calendar highlighting)
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    buttons: [],
  });

  // Task detail modal state
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);

  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    activity: [], // Changed to array for multiple selection
    customActivity: '',
    block: '',
    description: '',
    time: '',
    assignedTo: [], // Array for multiple staff members
    priority: 'medium',
    date: selectedDate,
  });

  // Blocks state
  const [blocks, setBlocks] = useState([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [showBlockDropdown, setShowBlockDropdown] = useState(false);

  // Staff state
  const [staff, setStaff] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);

  // Activity state
  const [showActivityDropdown, setShowActivityDropdown] = useState(false);

  // QR Scanner state
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    loadTasks();
  }, [selectedDate]);

  useEffect(() => {
    loadBlocksFromAPI();
    loadStaffFromAPI();
    requestCameraPermission();
  }, []);

  const loadBlocksFromAPI = async () => {
    try {
      setLoadingBlocks(true);
      const blocksData = await fetchBlocks();
      setBlocks(blocksData);
      console.log('[TaskCalendar] Blocks loaded:', blocksData.length);
    } catch (error) {
      console.error('[TaskCalendar] Error loading blocks:', error);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Failed to load blocks from server',
        type: 'error',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }],
      });
    } finally {
      setLoadingBlocks(false);
    }
  };

  const loadStaffFromAPI = async () => {
    try {
      setLoadingStaff(true);
      const response = await fetchAllStaff(true);
      if (response.success && response.staff) {
        setStaff(response.staff);
        console.log('[TaskCalendar] Staff loaded:', response.staff.length);
      }
    } catch (error) {
      console.error('[TaskCalendar] Error loading staff:', error);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Failed to load staff from server',
        type: 'error',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }],
      });
    } finally {
      setLoadingStaff(false);
    }
  };

  const requestCameraPermission = async () => {
    if (!BarCodeScanner) {
      setHasPermission(false);
      return;
    }
    try {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.error('[TaskCalendar] Error requesting camera permission:', error);
      setHasPermission(false);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);

      // Load locally created tasks from AsyncStorage
      const tasksJson = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
      const localTasks = tasksJson ? JSON.parse(tasksJson) : [];

      // Fetch assigned tasks from API (web app)
      console.log('[TaskCalendar] Fetching assigned tasks from API...');
      const { success, tasks: assignedTasks, error } = await fetchAssignedTasks();
      const apiTasks = success ? assignedTasks : [];

      console.log('[TaskCalendar] API fetch result:', { success, tasksCount: apiTasks.length, error });

      // DEBUG: Log all assigned tasks
      if (apiTasks.length > 0) {
        console.log('[TaskCalendar] Assigned tasks:', JSON.stringify(apiTasks, null, 2));
      }

      // Combine local and assigned tasks
      const combinedTasks = [...localTasks, ...apiTasks];

      // Store all tasks for calendar highlighting
      setAllTasks(combinedTasks);

      // Filter tasks for selected date
      const filteredTasks = combinedTasks.filter(task => task.date === selectedDate);

      console.log('[TaskCalendar] Selected date:', selectedDate);
      console.log('[TaskCalendar] Loaded', localTasks.length, 'local tasks and', apiTasks.length, 'assigned tasks');
      console.log('[TaskCalendar] Filtered to', filteredTasks.length, 'tasks for selected date');

      // Log all task dates to help debug filtering
      if (combinedTasks.length > 0) {
        console.log('[TaskCalendar] All task dates:', combinedTasks.map(t => ({ title: t.title, date: t.date })));
      }

      setTasks(filteredTasks);
    } catch (error) {
      console.error('[TaskCalendar] Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    // Validation
    if (!newTask.title.trim()) {
      setAlertConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Please enter a task title',
        type: 'error',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }],
      });
      return;
    }

    if (!newTask.activity) {
      setAlertConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Please select an activity',
        type: 'error',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }],
      });
      return;
    }

    if (!newTask.date.trim()) {
      setAlertConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Please enter a date',
        type: 'error',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }],
      });
      return;
    }

    // Basic date validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newTask.date)) {
      setAlertConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Please enter date in YYYY-MM-DD format',
        type: 'error',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }],
      });
      return;
    }

    try {
      const task = {
        id: Date.now().toString(),
        ...newTask,
        completed: false,
        createdAt: new Date().toISOString(),
      };

      // Load existing tasks
      const tasksJson = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
      const allTasks = tasksJson ? JSON.parse(tasksJson) : [];

      // Add new task
      allTasks.push(task);
      await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(allTasks));

      // Reset form
      setNewTask({
        title: '',
        activity: '',
        customActivity: '',
        block: '',
        description: '',
        time: '',
        priority: 'medium',
        date: selectedDate,
      });

      setShowAddModal(false);
      loadTasks();

      setAlertConfig({
        visible: true,
        title: 'Success',
        message: 'Task added successfully',
        type: 'success',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }],
      });
    } catch (error) {
      console.error('[TaskCalendar] Error adding task:', error);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Failed to add task',
        type: 'error',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }],
      });
    }
  };

  const handleToggleComplete = async (taskId) => {
    try {
      const tasksJson = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
      const allTasks = tasksJson ? JSON.parse(tasksJson) : [];

      const updatedTasks = allTasks.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      );

      await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updatedTasks));
      loadTasks();
    } catch (error) {
      console.error('[TaskCalendar] Error toggling task:', error);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setNewTask({ ...newTask, date: formattedDate });
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const tasksJson = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
      const allTasks = tasksJson ? JSON.parse(tasksJson) : [];

      const updatedTasks = allTasks.filter(task => task.id !== taskId);
      await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updatedTasks));
      loadTasks();
    } catch (error) {
      console.error('[TaskCalendar] Error deleting task:', error);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return CoffeeColors.DARK_BROWN;
      case 'medium':
        return CoffeeColors.MEDIUM_BROWN;
      case 'low':
        return CoffeeColors.LIGHT_BROWN;
      default:
        return CoffeeColors.MEDIUM_BROWN;
    }
  };

  const getActivityIcon = (activityId) => {
    const activity = activityOptions.find(a => a.id === activityId);
    return activity ? activity.icon : 'ellipsis-horizontal';
  };

  const getActivityLabel = (activityId) => {
    const activity = activityOptions.find(a => a.id === activityId);
    return activity ? activity.label : activityId;
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'accepted':
        return { backgroundColor: '#4CAF50' };
      case 'in_progress':
        return { backgroundColor: '#2196F3' };
      case 'completed':
        return { backgroundColor: '#4CAF50' };
      case 'rejected':
        return { backgroundColor: '#F44336' };
      default:
        return { backgroundColor: CoffeeColors.GRAY_TEXT };
    }
  };

  const handleBarCodeScanned = ({ type, data }) => {
    setShowQRScanner(false);
    console.log('[TaskCalendar] QR Code scanned:', data);

    // Try to find the block by ID or name from scanned data
    const foundBlock = blocks.find(block =>
      block.id?.toString() === data ||
      block.block_id?.toString() === data ||
      block.name === data
    );

    if (foundBlock) {
      setNewTask({ ...newTask, block: foundBlock.id || foundBlock.block_id });
      setAlertConfig({
        visible: true,
        title: 'Success',
        message: `Block selected: ${foundBlock.name || foundBlock.block_id}`,
        type: 'success',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }],
      });
    } else {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Block not found. Please select manually.',
        type: 'error',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }],
      });
    }
  };

  const renderTaskItem = ({ item }) => (
    <View style={[styles.taskCard, item.completed && styles.taskCardCompleted]}>
      <TouchableOpacity
        style={styles.taskCheckbox}
        onPress={() => handleToggleComplete(item.id)}
      >
        <Ionicons
          name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={28}
          color={item.completed ? CoffeeColors.MEDIUM_BROWN : CoffeeColors.LIGHT_BROWN}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.taskContent}
        onPress={() => {
          setSelectedTask(item);
          setShowTaskDetail(true);
        }}
      >
        <View style={styles.taskHeader}>
          <Text style={[styles.taskTitle, item.completed && styles.taskTitleCompleted]}>
            {item.title}
          </Text>
          {item.priority && (
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
              <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
            </View>
          )}
        </View>

        <View style={styles.taskMeta}>
          <View style={styles.activityTag}>
            <Ionicons name={getActivityIcon(item.activity)} size={14} color={CoffeeColors.DARK_BROWN} />
            <Text style={styles.activityText}>{getActivityLabel(item.activity)}</Text>
          </View>
          {item.time && (
            <View style={styles.timeTag}>
              <Ionicons name="time-outline" size={14} color={CoffeeColors.MEDIUM_BROWN} />
              <Text style={styles.timeText}>{item.time}</Text>
            </View>
          )}
        </View>

        {/* Status Badge */}
        {item.submission_status && (
          <View style={[styles.statusBadge, getStatusBadgeStyle(item.submission_status)]}>
            <Text style={styles.statusBadgeText}>
              {item.submission_status === 'in_progress' ? 'In Progress' :
               item.submission_status.charAt(0).toUpperCase() + item.submission_status.slice(1)}
            </Text>
          </View>
        )}

        {item.description && (
          <Text style={[styles.taskDescription, item.completed && styles.taskDescriptionCompleted]}>
            {item.description}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteTask(item.id)}
      >
        <Ionicons name="trash-outline" size={20} color={CoffeeColors.DARK_BROWN} />
      </TouchableOpacity>
    </View>
  );

  const renderAddTaskModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Start New Task</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={28} color={CoffeeColors.DARK_BROWN} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Title Input */}
            <Text style={styles.inputLabel}>Task Title *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter task title"
              value={newTask.title}
              onChangeText={(text) => setNewTask({ ...newTask, title: text })}
              placeholderTextColor={CoffeeColors.GRAY_TEXT}
            />

            {/* Activity Selection */}
            <Text style={styles.inputLabel}>Activity *</Text>
            <View style={styles.activityGrid}>
              {activityOptions.map((activity) => (
                <TouchableOpacity
                  key={activity.id}
                  style={[
                    styles.activityOption,
                    newTask.activity === activity.id && styles.activityOptionSelected,
                  ]}
                  onPress={() => setNewTask({ ...newTask, activity: activity.id })}
                >
                  <Ionicons
                    name={activity.icon}
                    size={24}
                    color={
                      newTask.activity === activity.id
                        ? CoffeeColors.WHITE
                        : CoffeeColors.MEDIUM_BROWN
                    }
                  />
                  <Text
                    style={[
                      styles.activityOptionText,
                      newTask.activity === activity.id && styles.activityOptionTextSelected,
                    ]}
                  >
                    {activity.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Time Input */}
            <Text style={styles.inputLabel}>Time (Optional)</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.dateText}>
                {newTask.time || 'Select Time'}
              </Text>
              <Ionicons name="time-outline" size={20} color={CoffeeColors.MEDIUM_BROWN} />
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={newTask.time ? new Date(`2000-01-01T${newTask.time}`) : new Date()}
                mode="time"
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, selectedTime) => {
                  setShowTimePicker(Platform.OS === 'ios');
                  if (selectedTime) {
                    const hours = selectedTime.getHours();
                    const minutes = selectedTime.getMinutes();
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    const displayHours = hours % 12 || 12;
                    const formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
                    setNewTask({ ...newTask, time: formattedTime });
                  }
                }}
              />
            )}

            {/* Priority Selection */}
            <Text style={styles.inputLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {['low', 'medium', 'high'].map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.priorityOption,
                    newTask.priority === priority && styles.priorityOptionSelected,
                    { borderColor: getPriorityColor(priority) },
                  ]}
                  onPress={() => setNewTask({ ...newTask, priority })}
                >
                  <Text
                    style={[
                      styles.priorityOptionText,
                      newTask.priority === priority && { color: CoffeeColors.WHITE },
                    ]}
                  >
                    {priority.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Description Input */}
            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textAreaInput]}
              placeholder="Add notes or details..."
              value={newTask.description}
              onChangeText={(text) => setNewTask({ ...newTask, description: text })}
              multiline
              numberOfLines={4}
              placeholderTextColor={CoffeeColors.GRAY_TEXT}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={handleAddTask}>
                <Text style={styles.modalButtonText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const completedCount = tasks.filter(t => t.completed).length;
  const pendingCount = tasks.filter(t => !t.completed).length;

  // Generate dates for the calendar (2 weeks back, 4 weeks forward)
  const generateCalendarDates = () => {
    const dates = [];
    const today = new Date();
    // Start from 14 days ago
    for (let i = -14; i <= 28; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const calendarDates = generateCalendarDates();

  const navigateWeek = (direction) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + (direction * 7));
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const isToday = (dateStr) => {
    return dateStr === new Date().toISOString().split('T')[0];
  };

  const renderCalendarDay = (dateStr) => {
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = date.getDate();
    const isSelected = dateStr === selectedDate;
    const today = isToday(dateStr);
    const hasTasks = allTasks.some(task => task.date === dateStr);

    return (
      <TouchableOpacity
        key={dateStr}
        style={[
          styles.calendarDay,
          isSelected && styles.calendarDaySelected,
          today && !isSelected && styles.calendarDayToday,
        ]}
        onPress={() => setSelectedDate(dateStr)}
      >
        <Text style={[
          styles.calendarDayName,
          isSelected && styles.calendarDayNameSelected,
        ]}>
          {dayName}
        </Text>
        <Text style={[
          styles.calendarDayNum,
          isSelected && styles.calendarDayNumSelected,
          today && !isSelected && styles.calendarDayNumToday,
        ]}>
          {dayNum}
        </Text>
        {/* Dot indicator for days with tasks */}
        {hasTasks && (
          <View style={[
            styles.taskIndicatorDot,
            isSelected && styles.taskIndicatorDotSelected
          ]} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SimpleHeader title="My Tasks" onBackPress={() => navigation.goBack()} />

      <View style={styles.content}>
        {/* Month/Year Header with Navigation */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => navigateWeek(-1)} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={CoffeeColors.DARK_BROWN} />
          </TouchableOpacity>
          <View style={styles.monthYearContainer}>
            <Text style={styles.monthYearText}>
              {new Date(selectedDate).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              style={styles.todayButton}
            >
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => navigateWeek(1)} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color={CoffeeColors.DARK_BROWN} />
          </TouchableOpacity>
        </View>

        {/* Calendar Strip */}
        <View style={styles.calendarStrip}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.calendarScrollContent}
          >
            {calendarDates.map(renderCalendarDay)}
          </ScrollView>
        </View>

        {/* Selected Date Display */}
        <View style={styles.selectedDateHeader}>
          <Ionicons name="calendar" size={20} color={CoffeeColors.MEDIUM_BROWN} />
          <Text style={styles.selectedDateText}>
            {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
            })}
          </Text>
        </View>

        {/* Stats Summary */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{tasks.length}</Text>
            <Text style={styles.statLabel}>Total Tasks</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: CoffeeColors.MEDIUM_BROWN }]}>
              {completedCount}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: CoffeeColors.LIGHT_BROWN }]}>
              {pendingCount}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Task List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={CoffeeColors.DARK_BROWN} />
            <Text style={styles.loadingText}>Loading tasks...</Text>
          </View>
        ) : tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={CoffeeColors.MEDIUM_BROWN} />
            <Text style={styles.emptyText}>No tasks for today</Text>
            <Text style={styles.emptySubtext}>Tap the + button to add a new task</Text>
          </View>
        ) : (
          <FlatList
            data={tasks}
            renderItem={renderTaskItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.taskList}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Add Task Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={CoffeeColors.WHITE} />
        </TouchableOpacity>
      </View>

      {/* Add Task Modal */}
      {showAddModal && (
        <Modal
          visible={showAddModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Start New Task</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={28} color={CoffeeColors.DARK_BROWN} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Custom Activity Input - shown when "Other" is selected - AT TOP */}
                {newTask.activity.includes('other') && (
                  <>
                    <Text style={styles.inputLabel}>Specify Activity *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter the custom activity"
                      value={newTask.customActivity}
                      onChangeText={(text) => setNewTask({ ...newTask, customActivity: text })}
                      placeholderTextColor={CoffeeColors.GRAY_TEXT}
                    />
                  </>
                )}

                {/* Date Input */}
                <Text style={styles.inputLabel}>Date *</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {newTask.date ? new Date(newTask.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }) : 'Select Date'}
                  </Text>
                  <Ionicons name="calendar" size={20} color={CoffeeColors.MEDIUM_BROWN} />
                </TouchableOpacity>

                {/* Block Selection */}
                <Text style={styles.inputLabel}>Block *</Text>
                <View style={styles.blockInputRow}>
                  <View style={styles.blockPickerContainer}>
                    <TouchableOpacity
                      style={styles.blockPicker}
                      onPress={() => {
                        console.log('[TaskCalendar] Block picker pressed, current state:', showBlockDropdown);
                        console.log('[TaskCalendar] Blocks available:', blocks.length);
                        setShowBlockDropdown(!showBlockDropdown);
                      }}
                    >
                      {loadingBlocks ? (
                        <ActivityIndicator size="small" color={CoffeeColors.MEDIUM_BROWN} />
                      ) : (
                        <>
                          <Text style={newTask.block ? styles.blockSelectedText : styles.blockPlaceholderText}>
                            {newTask.block
                              ? blocks.find(b => (b.id || b.block_id) === newTask.block)?.name ||
                                blocks.find(b => (b.id || b.block_id) === newTask.block)?.block_id ||
                                'Select Block'
                              : 'Select Block'}
                          </Text>
                          <Ionicons name="chevron-down" size={20} color={CoffeeColors.MEDIUM_BROWN} />
                        </>
                      )}
                    </TouchableOpacity>
                    {showBlockDropdown && !loadingBlocks && blocks.length > 0 && (
                      <ScrollView style={styles.blockDropdown} nestedScrollEnabled>
                        {blocks.map((block) => (
                          <TouchableOpacity
                            key={block.id || block.block_id}
                            style={styles.blockOption}
                            onPress={() => {
                              console.log('[TaskCalendar] Block selected:', block.name || block.block_id);
                              setNewTask({ ...newTask, block: block.id || block.block_id });
                              setShowBlockDropdown(false);
                            }}
                          >
                            <Text style={styles.blockOptionText}>
                              {block.name || block.block_id}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                    {showBlockDropdown && blocks.length === 0 && !loadingBlocks && (
                      <View style={styles.blockDropdown}>
                        <Text style={[styles.blockOptionText, { padding: 16, color: CoffeeColors.GRAY_TEXT }]}>
                          No blocks available
                        </Text>
                      </View>
                    )}
                  </View>
                  {BarCodeScanner && (
                    <TouchableOpacity
                      style={styles.qrButton}
                      onPress={() => {
                        if (hasPermission) {
                          setShowQRScanner(true);
                        } else {
                          requestCameraPermission();
                        }
                      }}
                    >
                      <MaterialCommunityIcons name="qrcode-scan" size={24} color={CoffeeColors.WHITE} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Activity Selection - Multiple Selection */}
                <Text style={styles.inputLabel}>Activity * (Select one or more)</Text>
                <View style={styles.blockPickerContainer}>
                  <TouchableOpacity
                    style={styles.blockPicker}
                    onPress={() => setShowActivityDropdown(!showActivityDropdown)}
                  >
                    <Text style={newTask.activity.length > 0 ? styles.blockSelectedText : styles.blockPlaceholderText}>
                      {newTask.activity.length > 0
                        ? newTask.activity.map(id => activityOptions.find(a => a.id === id)?.label).join(', ')
                        : 'Select Activities'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={CoffeeColors.MEDIUM_BROWN} />
                  </TouchableOpacity>
                  {showActivityDropdown && (
                    <ScrollView
                      style={styles.activityDropdownScrollable}
                      nestedScrollEnabled={true}
                      scrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                    >
                      {activityOptions.map((activity) => {
                        const isSelected = newTask.activity.includes(activity.id);
                        return (
                          <TouchableOpacity
                            key={activity.id}
                            style={[styles.blockOption, isSelected && styles.selectedActivityOption]}
                            onPress={() => {
                              const newActivities = isSelected
                                ? newTask.activity.filter(id => id !== activity.id)
                                : [...newTask.activity, activity.id];
                              setNewTask({ ...newTask, activity: newActivities });
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                              <Ionicons name={activity.icon} size={20} color={CoffeeColors.MEDIUM_BROWN} />
                              <Text style={[styles.blockOptionText, isSelected && styles.selectedActivityText]}>
                                {activity.label}
                              </Text>
                            </View>
                            {isSelected && (
                              <Ionicons name="checkmark-circle" size={20} color={CoffeeColors.PRIMARY_BROWN} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>

                {/* Time Input */}
                <Text style={styles.inputLabel}>Time (Optional)</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {newTask.time || 'Select Time'}
                  </Text>
                  <Ionicons name="time-outline" size={20} color={CoffeeColors.MEDIUM_BROWN} />
                </TouchableOpacity>

                {showTimePicker && (
                  <DateTimePicker
                    value={newTask.time ? new Date(`2000-01-01T${newTask.time}`) : new Date()}
                    mode="time"
                    is24Hour={false}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_, selectedTime) => {
                      setShowTimePicker(Platform.OS === 'ios');
                      if (selectedTime) {
                        const hours = selectedTime.getHours();
                        const minutes = selectedTime.getMinutes();
                        const ampm = hours >= 12 ? 'PM' : 'AM';
                        const displayHours = hours % 12 || 12;
                        const formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
                        setNewTask({ ...newTask, time: formattedTime });
                      }
                    }}
                  />
                )}

                {/* Assigned To - Multiple Staff Selection */}
                <Text style={styles.inputLabel}>Assigned To (Optional)</Text>
                <View style={styles.blockPickerContainer}>
                  <TouchableOpacity
                    style={styles.blockPicker}
                    onPress={() => setShowStaffDropdown(!showStaffDropdown)}
                  >
                    <Text style={newTask.assignedTo.length > 0 ? styles.blockSelectedText : styles.blockPlaceholderText}>
                      {newTask.assignedTo.length > 0
                        ? newTask.assignedTo.map(id => staff.find(s => s.id === id)?.displayName).filter(Boolean).join(', ')
                        : 'Select Staff Members'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={CoffeeColors.MEDIUM_BROWN} />
                  </TouchableOpacity>
                  {showStaffDropdown && (
                    <ScrollView
                      style={styles.activityDropdownScrollable}
                      nestedScrollEnabled={true}
                      scrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                    >
                      {loadingStaff ? (
                        <View style={{ padding: 16, alignItems: 'center' }}>
                          <ActivityIndicator size="small" color={CoffeeColors.PRIMARY_BROWN} />
                          <Text style={[styles.blockOptionText, { marginTop: 8, color: CoffeeColors.GRAY_TEXT }]}>
                            Loading staff...
                          </Text>
                        </View>
                      ) : staff.length === 0 ? (
                        <View style={styles.blockOption}>
                          <Text style={[styles.blockOptionText, { color: CoffeeColors.GRAY_TEXT }]}>
                            No staff members available
                          </Text>
                        </View>
                      ) : (
                        staff.map((staffMember) => {
                          const isSelected = newTask.assignedTo.includes(staffMember.id);
                          return (
                            <TouchableOpacity
                              key={staffMember.id}
                              style={[styles.blockOption, isSelected && styles.selectedActivityOption]}
                              onPress={() => {
                                const newAssigned = isSelected
                                  ? newTask.assignedTo.filter(id => id !== staffMember.id)
                                  : [...newTask.assignedTo, staffMember.id];
                                setNewTask({ ...newTask, assignedTo: newAssigned });
                              }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                <Ionicons name="person" size={20} color={CoffeeColors.MEDIUM_BROWN} />
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.blockOptionText, isSelected && styles.selectedActivityText]}>
                                    {staffMember.displayName}
                                  </Text>
                                  {staffMember.role && (
                                    <Text style={{ fontSize: 12, color: CoffeeColors.GRAY_TEXT, fontFamily: Fonts.regular }}>
                                      {staffMember.role}
                                    </Text>
                                  )}
                                </View>
                              </View>
                              {isSelected && (
                                <Ionicons name="checkmark-circle" size={20} color={CoffeeColors.PRIMARY_BROWN} />
                              )}
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </ScrollView>
                  )}
                </View>

                {/* Priority Selection */}
                <Text style={styles.inputLabel}>Priority</Text>
                <View style={styles.priorityRow}>
                  {['low', 'medium', 'high'].map((priority) => (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.priorityOption,
                        newTask.priority === priority && styles.priorityOptionSelected,
                        { borderColor: getPriorityColor(priority) },
                      ]}
                      onPress={() => setNewTask({ ...newTask, priority })}
                    >
                      <Text
                        style={[
                          styles.priorityOptionText,
                          newTask.priority === priority && { color: CoffeeColors.WHITE },
                        ]}
                      >
                        {priority.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Description Input */}
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  placeholder="Add notes or details..."
                  value={newTask.description}
                  onChangeText={(text) => setNewTask({ ...newTask, description: text })}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={CoffeeColors.GRAY_TEXT}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowAddModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalButton} onPress={handleAddTask}>
                    <Text style={styles.modalButtonText}>Add Task</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      <TaskDetailModal
        visible={showTaskDetail}
        task={selectedTask}
        onClose={() => {
          setShowTaskDetail(false);
          setSelectedTask(null);
        }}
        onUpdate={() => {
          loadTasks();
        }}
      />

      <BottomNav activeScreen="Dashboard" />

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
      />

      {showDatePicker && (
        <DateTimePicker
          value={new Date(newTask.date || new Date())}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* QR Scanner Modal - Only show if BarCodeScanner is available */}
      {BarCodeScanner && (
        <Modal
          visible={showQRScanner}
          animationType="slide"
          onRequestClose={() => setShowQRScanner(false)}
        >
          <View style={styles.qrScannerContainer}>
            <View style={styles.qrScannerHeader}>
              <Text style={styles.qrScannerTitle}>Scan Block QR Code</Text>
              <TouchableOpacity onPress={() => setShowQRScanner(false)}>
                <Ionicons name="close" size={28} color={CoffeeColors.WHITE} />
              </TouchableOpacity>
            </View>
            {hasPermission ? (
              <BarCodeScanner
                onBarCodeScanned={handleBarCodeScanned}
                style={StyleSheet.absoluteFillObject}
              />
            ) : (
              <View style={styles.qrPermissionContainer}>
                <Ionicons name="camera-outline" size={64} color={CoffeeColors.MEDIUM_BROWN} />
                <Text style={styles.qrPermissionText}>
                  Camera permission is required to scan QR codes
                </Text>
                <TouchableOpacity
                  style={styles.qrPermissionButton}
                  onPress={requestCameraPermission}
                >
                  <Text style={styles.qrPermissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CoffeeColors.LIGHT_GRAY,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // Calendar Header Styles
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CoffeeColors.WHITE,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  navButton: {
    padding: 8,
  },
  monthYearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: CoffeeColors.DARK_BROWN,
  },
  todayButton: {
    backgroundColor: CoffeeColors.VERY_LIGHT_BROWN,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.DARK_BROWN,
  },
  // Calendar Strip Styles
  calendarStrip: {
    backgroundColor: CoffeeColors.WHITE,
    paddingVertical: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarScrollContent: {
    paddingHorizontal: 8,
  },
  calendarDay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    minWidth: 50,
  },
  calendarDaySelected: {
    backgroundColor: CoffeeColors.DARK_BROWN,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: CoffeeColors.MEDIUM_BROWN,
  },
  calendarDayName: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: CoffeeColors.GRAY_TEXT,
    marginBottom: 4,
  },
  calendarDayNameSelected: {
    color: CoffeeColors.WHITE,
  },
  calendarDayNum: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.DARK_BROWN,
  },
  calendarDayNumSelected: {
    color: CoffeeColors.WHITE,
  },
  calendarDayNumToday: {
    color: CoffeeColors.MEDIUM_BROWN,
  },
  taskIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: CoffeeColors.MEDIUM_BROWN,
    marginTop: 2,
  },
  taskIndicatorDotSelected: {
    backgroundColor: CoffeeColors.WHITE,
  },
  // Selected Date Header
  selectedDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  selectedDateText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.MEDIUM_BROWN,
  },
  // Legacy styles kept for compatibility
  dateHeader: {
    backgroundColor: CoffeeColors.WHITE,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 12,
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.DARK_BROWN,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: CoffeeColors.WHITE,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: CoffeeColors.DARK_BROWN,
  },
  statLabel: {
    fontSize: 12,
    color: CoffeeColors.GRAY_TEXT,
    fontFamily: Fonts.regular,
    marginTop: 4,
  },
  taskList: {
    paddingBottom: 80,
  },
  taskCard: {
    backgroundColor: CoffeeColors.WHITE,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskCardCompleted: {
    opacity: 0.6,
    backgroundColor: CoffeeColors.VERY_LIGHT_BROWN,
  },
  taskCheckbox: {
    paddingRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.DARK_BROWN,
    flex: 1,
    marginRight: 8,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: CoffeeColors.GRAY_TEXT,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: CoffeeColors.WHITE,
  },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
  },
  activityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CoffeeColors.VERY_LIGHT_BROWN,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activityText: {
    fontSize: 12,
    color: CoffeeColors.MEDIUM_BROWN,
    fontFamily: Fonts.semiBold,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CoffeeColors.LIGHT_GRAY,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: CoffeeColors.MEDIUM_BROWN,
    fontFamily: Fonts.regular,
  },
  taskDescription: {
    fontSize: 14,
    color: CoffeeColors.MEDIUM_BROWN,
    fontFamily: Fonts.semiBold,
    lineHeight: 20,
  },
  taskDescriptionCompleted: {
    textDecorationLine: 'line-through',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  addButton: {
    position: 'absolute',
    right: 24,
    bottom: 90,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: CoffeeColors.DARK_BROWN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: CoffeeColors.MEDIUM_BROWN,
    fontFamily: Fonts.regular,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.MEDIUM_BROWN,
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: CoffeeColors.GRAY_TEXT,
    fontFamily: Fonts.regular,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: CoffeeColors.WHITE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 12,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: CoffeeColors.LIGHT_GRAY,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: CoffeeColors.DARK_BROWN,
  },
  modalBody: {
    flex: 1,
    padding: 4,
    paddingBottom: 10,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.DARK_BROWN,
    marginTop: 15,
    marginBottom: 8,
  },
  activityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CoffeeColors.LIGHT_GRAY,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CoffeeColors.MEDIUM_BROWN,
    gap: 6,
  },
  activityOptionSelected: {
    backgroundColor: CoffeeColors.MEDIUM_BROWN,
    borderColor: CoffeeColors.DARK_BROWN,
  },
  activityOptionText: {
    fontSize: 13,
    color: CoffeeColors.MEDIUM_BROWN,
    fontFamily: Fonts.regular,
  },
  activityOptionTextSelected: {
    color: CoffeeColors.WHITE,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  priorityOptionSelected: {
    backgroundColor: CoffeeColors.MEDIUM_BROWN,
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.MEDIUM_BROWN,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10, // Add margin at the bottom
  },
  modalButton: {
    flex: 1,
    backgroundColor: CoffeeColors.DARK_BROWN,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: CoffeeColors.WHITE,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
  },
  cancelButton: {
    backgroundColor: CoffeeColors.LIGHT_GRAY,
  },
  cancelButtonText: {
    color: CoffeeColors.DARK_BROWN,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
  },
  dateInput: {
    backgroundColor: CoffeeColors.WHITE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CoffeeColors.LIGHT_BROWN,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 16,
    color: CoffeeColors.DARK_BROWN,
    fontFamily: Fonts.regular,
  },
  // Text Input Styles
  textInput: {
    backgroundColor: CoffeeColors.WHITE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CoffeeColors.LIGHT_BROWN,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
    color: CoffeeColors.DARK_BROWN,
    fontFamily: Fonts.regular,
    marginBottom: 16,
  },
  textAreaInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  // Block Selection Styles
  blockInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  blockPickerContainer: {
    flex: 1,
  },
  blockPicker: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CoffeeColors.VERY_LIGHT_BROWN,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blockSelectedText: {
    fontSize: 16,
    color: CoffeeColors.DARK_BROWN,
    fontFamily: Fonts.regular,
    flex: 1,
  },
  blockPlaceholderText: {
    fontSize: 16,
    color: CoffeeColors.MEDIUM_BROWN,
    fontFamily: Fonts.regular,
    flex: 1,
  },
  blockDropdown: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CoffeeColors.VERY_LIGHT_BROWN,
    marginTop: 8,
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityDropdownScrollable: {
    maxHeight: 250,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CoffeeColors.VERY_LIGHT_BROWN,
    marginTop: 8,
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  blockOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: CoffeeColors.VERY_LIGHT_BROWN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blockOptionText: {
    fontSize: 14,
    color: CoffeeColors.DARK_BROWN,
    fontFamily: Fonts.regular,
  },
  selectedActivityOption: {
    backgroundColor: '#fef5f0',
  },
  selectedActivityText: {
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.PRIMARY_BROWN,
  },
  qrButton: {
    width: 50,
    height: 50,
    backgroundColor: CoffeeColors.DARK_BROWN,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // QR Scanner Styles
  qrScannerContainer: {
    flex: 1,
    backgroundColor: CoffeeColors.DARK_BROWN,
  },
  qrScannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: CoffeeColors.DARK_BROWN,
    zIndex: 1,
  },
  qrScannerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: CoffeeColors.WHITE,
  },
  qrPermissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: CoffeeColors.LIGHT_GRAY,
  },
  qrPermissionText: {
    fontSize: 16,
    color: CoffeeColors.MEDIUM_BROWN,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  qrPermissionButton: {
    backgroundColor: CoffeeColors.DARK_BROWN,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  qrPermissionButtonText: {
    color: CoffeeColors.WHITE,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
  },
});
