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
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import CustomAlert from '../../../components/CustomAlert';

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
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    buttons: [],
  });

  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    activity: '',
    description: '',
    time: '',
    priority: 'medium',
    date: selectedDate,
  });

  useEffect(() => {
    loadTasks();
  }, [selectedDate]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const tasksJson = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
      const allTasks = tasksJson ? JSON.parse(tasksJson) : [];

      // Filter tasks for selected date
      const todayTasks = allTasks.filter(task => task.date === selectedDate);
      setTasks(todayTasks);
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

      <View style={styles.taskContent}>
        <View style={styles.taskHeader}>
          <Text style={[styles.taskTitle, item.completed && styles.taskTitleCompleted]}>
            {item.title}
          </Text>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
            <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
          </View>
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

        {item.description && (
          <Text style={[styles.taskDescription, item.completed && styles.taskDescriptionCompleted]}>
            {item.description}
          </Text>
        )}
      </View>

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
            <Text style={styles.modalTitle}>Add New Task</Text>
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
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 9:00 AM"
              value={newTask.time}
              onChangeText={(text) => setNewTask({ ...newTask, time: text })}
              placeholderTextColor={CoffeeColors.GRAY_TEXT}
            />

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

  return (
    <View style={styles.container}>
      <SimpleHeader title="My Tasks" onBackPress={() => navigation.goBack()} />

      <View style={styles.content}>
        {/* Date Header */}
        <View style={styles.dateHeader}>
          <View style={styles.dateInfo}>
            <Ionicons name="calendar" size={24} color={CoffeeColors.DARK_BROWN} />
            <Text style={styles.dateText}>{new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}</Text>
          </View>
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
                <Text style={styles.modalTitle}>Add New Task</Text>
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
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., 9:00 AM"
                  value={newTask.time}
                  onChangeText={(text) => setNewTask({ ...newTask, time: text })}
                  placeholderTextColor={CoffeeColors.GRAY_TEXT}
                />

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
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.DARK_BROWN,
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
    backgroundColor: CoffeeColors.LIGHT_GRAY,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
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
});
