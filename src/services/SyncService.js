import ApiService from './ApiService';
import DatabaseService from './DatabaseService';

/**
 * Sync Service
 * Handles synchronization of local data with the server
 * Implements offline-first approach with background sync
 */
class SyncService {
  constructor() {
    this.isSyncing = false;
    this.syncListeners = [];
  }

  /**
   * Add a listener for sync events
   * @param {Function} listener - Callback function
   */
  addListener(listener) {
    this.syncListeners.push(listener);
  }

  /**
   * Remove a listener
   * @param {Function} listener - Callback function to remove
   */
  removeListener(listener) {
    this.syncListeners = this.syncListeners.filter(l => l !== listener);
  }

  /**
   * Notify all listeners of sync events
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  notifyListeners(event, data = {}) {
    this.syncListeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('[SyncService] Listener error:', error);
      }
    });
  }

  /**
   * Sync all unsynced records with the server
   * @returns {Promise<Object>} - Sync results
   */
  async syncAll() {
    if (this.isSyncing) {
      console.log('[SyncService] Sync already in progress');
      return { success: false, message: 'Sync already in progress' };
    }

    this.isSyncing = true;
    this.notifyListeners('sync_start');

    console.log('[SyncService] Starting sync...');

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Get all unsynced records from the queue
      const unsyncedRecords = await DatabaseService.getUnsyncedRecords();

      if (unsyncedRecords.length === 0) {
        console.log('[SyncService] No records to sync');
        this.notifyListeners('sync_complete', { ...results, message: 'Nothing to sync' });
        return { success: true, message: 'Nothing to sync', results };
      }

      console.log(`[SyncService] Found ${unsyncedRecords.length} records to sync`);

      // Process each record in the sync queue
      for (const queueRecord of unsyncedRecords) {
        try {
          this.notifyListeners('sync_progress', {
            current: results.success + results.failed + 1,
            total: unsyncedRecords.length,
            record: queueRecord,
          });

          await this.syncRecord(queueRecord);
          results.success++;

          // Remove from sync queue on success
          await DatabaseService.removeFromSyncQueue(queueRecord.id);
        } catch (error) {
          console.error(`[SyncService] Failed to sync record:`, error);
          results.failed++;
          results.errors.push({
            table: queueRecord.table_name,
            recordId: queueRecord.record_id,
            error: error.message,
          });

          // Update sync queue with error
          await DatabaseService.updateSyncQueueError(queueRecord.id, error.message);
        }
      }

      const message = `Synced ${results.success} records, ${results.failed} failed`;
      console.log(`[SyncService] Sync complete: ${message}`);

      this.notifyListeners('sync_complete', { ...results, message });

      return {
        success: results.failed === 0,
        message,
        results,
      };
    } catch (error) {
      console.error('[SyncService] Sync error:', error);
      this.notifyListeners('sync_error', { error: error.message });

      return {
        success: false,
        message: 'Sync failed',
        error: error.message,
        results,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a single record
   * @param {Object} queueRecord - Record from sync queue
   * @returns {Promise<void>}
   */
  async syncRecord(queueRecord) {
    const { table_name, record_id, operation, data } = queueRecord;

    console.log(`[SyncService] Syncing ${table_name} ID ${record_id} - ${operation}`);

    // Get the actual record from the table
    const record = await DatabaseService.getById(table_name, record_id);

    if (!record && operation !== 'DELETE') {
      throw new Error('Record not found in local database');
    }

    // Map table names to API endpoints
    const endpointMap = {
      harvests: 'aggregation/farmer-harvest',
      farmers: 'aggregation/farmer',
      processing: 'processing',
    };

    const endpoint = endpointMap[table_name];

    if (!endpoint) {
      throw new Error(`No API endpoint mapped for table: ${table_name}`);
    }

    // Perform the appropriate API call based on operation
    let response;

    switch (operation) {
      case 'INSERT':
        // POST to create new record
        response = await ApiService.post(`${endpoint}/`, this.prepareDataForApi(record, table_name));

        // Update local record with server ID
        if (response.data && response.data.id) {
          await DatabaseService.markAsSynced(table_name, record_id, response.data.id);
        }
        break;

      case 'UPDATE':
        // PUT to update existing record
        if (!record.server_id) {
          throw new Error('Cannot update record without server_id');
        }

        response = await ApiService.put(
          `${endpoint}/${record.server_id}/`,
          this.prepareDataForApi(record, table_name)
        );

        await DatabaseService.markAsSynced(table_name, record_id, record.server_id);
        break;

      case 'DELETE':
        // DELETE to remove record
        if (!record || !record.server_id) {
          // If record doesn't exist or has no server_id, just remove from queue
          console.log(`[SyncService] Skipping DELETE for ${table_name} ID ${record_id} - no server_id`);
          return;
        }

        response = await ApiService.delete(`${endpoint}/${record.server_id}/`);
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    console.log(`[SyncService] Successfully synced ${table_name} ID ${record_id}`);
  }

  /**
   * Prepare data for API by removing local-only fields and transforming to Django format
   * @param {Object} record - Database record
   * @param {string} tableName - Table name
   * @returns {Object} - Cleaned data for API
   */
  prepareDataForApi(record, tableName) {
    // Remove local-only fields
    const { id, synced, created_at, updated_at, server_id, ...apiData } = record;

    // Table-specific transformations to match Django API format
    if (tableName === 'farmers') {
      return {
        farmer_id: record.server_id || record.id || `FD${Date.now()}`,
        first_name: record.name?.split(' ')[0] || '',
        last_name: record.name?.split(' ').slice(1).join(' ') || '',
        gender: 'Other',
        nin: '',
        date_of_birth: null,
        contact: record.phone || '',
        email: '',
        farmer_type: 'individual',
        started_coffee_farming_year: null,
        district: record.location?.split(',')[0] || '',
        other_district: '',
        sub_county: '',
        other_sub_county: '',
        parish: '',
        village: '',
        gps_coordinates: '',
        nearest_landmark: '',
        coffee_variety: 'Other',
        number_of_trees: record.plot_size || 0,
        ownership_of_trees: true,
        planted_date: null,
        land_ownership: 'owned',
        spacing_between_trees: '3 metres by 3 metres',
        defforestation_status: false,
        source_of_seedlings: 'nursery',
        type_of_seedlings: 'Other',
        age_of_seedlings: '',
        standard_practices: false,
        irrigation_source: 'none',
        fertilizers: '',
        pesticide: '',
      };
    }

    if (tableName === 'harvests') {
      return {
        id: record.server_id || record.id,
        name: record.farmer_name || '',
        weight_on_delivery: Math.round(Number(record.weight) || 0),
        weight_after_floating: 0,
        date_of_delivery: record.harvest_date || '',
        grade: record.quality || '',
        cherry_color: 'Red',
        stage: 'fresh_cherry',
        amount_paid: '0',
        paid_by: 'System',
        recorder_id: null,
        timestamp: Date.now(),
      };
    }

    return apiData;
  }

  /**
   * Attempt to sync immediately after a local save
   * If sync fails, record remains in queue for later sync
   * @param {string} table - Table name
   * @param {number} recordId - Record ID
   * @returns {Promise<boolean>} - Whether sync was successful
   */
  async syncImmediately(table, recordId) {
    try {
      // Get the sync queue record for this table/recordId
      const queueRecords = await DatabaseService.query(
        'SELECT * FROM sync_queue WHERE table_name = ? AND record_id = ? ORDER BY created_at DESC LIMIT 1',
        [table, recordId]
      );

      if (queueRecords.rows.length === 0) {
        console.log('[SyncService] No sync queue record found');
        return false;
      }

      const queueRecord = queueRecords.rows.item(0);

      // Attempt to sync
      await this.syncRecord(queueRecord);

      // Remove from queue on success
      await DatabaseService.removeFromSyncQueue(queueRecord.id);

      console.log(`[SyncService] Immediate sync successful for ${table} ID ${recordId}`);
      return true;
    } catch (error) {
      console.error(`[SyncService] Immediate sync failed for ${table} ID ${recordId}:`, error);
      // Don't throw - just log and leave in queue for later
      return false;
    }
  }

  /**
   * Get sync status
   * @returns {Promise<Object>} - Sync status
   */
  async getSyncStatus() {
    try {
      const stats = await DatabaseService.getSyncStats();

      return {
        isSyncing: this.isSyncing,
        pendingRecords: stats.pending,
        hasPending: stats.hasPending,
      };
    } catch (error) {
      console.error('[SyncService] Get sync status error:', error);
      return {
        isSyncing: this.isSyncing,
        pendingRecords: 0,
        hasPending: false,
      };
    }
  }

  /**
   * Check if device is online
   * @returns {Promise<boolean>}
   */
  async isOnline() {
    try {
      await ApiService.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export default new SyncService();
