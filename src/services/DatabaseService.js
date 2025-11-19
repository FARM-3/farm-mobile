import * as SQLite from 'expo-sqlite';

/**
 * Database Service
 * Manages local SQLite database for offline-first data storage
 * Includes sync status tracking for cloud synchronization
 */
class DatabaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initialize database and create tables
   */
  async init() {
    if (this.isInitialized) {
      console.log('[DatabaseService] Already initialized');
      return;
    }

    try {
      console.log('[DatabaseService] Initializing database...');
      this.db = await SQLite.openDatabaseAsync('fmis_offline.db');

      await this.createTables();

      this.isInitialized = true;
      console.log('[DatabaseService] Database initialized successfully');
    } catch (error) {
      console.error('[DatabaseService] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Create all database tables
   */
  async createTables() {
    try {
      // Harvests table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS harvests (
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
        );
      `);
      console.log('[DatabaseService] Harvests table created');

      // Farmers table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS farmers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          server_id INTEGER,
          name TEXT NOT NULL,
          phone TEXT,
          location TEXT,
          plot_size REAL,
          synced INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('[DatabaseService] Farmers table created');

      // Processing table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS processing (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          server_id INTEGER,
          batch_id TEXT,
          stage TEXT,
          start_date TEXT,
          end_date TEXT,
          weight_in REAL,
          weight_out REAL,
          notes TEXT,
          synced INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('[DatabaseService] Processing table created');

      // Ripeness Score table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS ripeness_scores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          harvest_id TEXT NOT NULL,
          date TEXT NOT NULL,
          sample_size INTEGER NOT NULL,
          no_of_red_cherry INTEGER NOT NULL,
          ripeness_score REAL NOT NULL,
          synced INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('[DatabaseService] Ripeness scores table created');

      // Floating records table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS floating_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          harvest_id TEXT NOT NULL,
          grade TEXT NOT NULL,
          weight REAL NOT NULL,
          date TEXT NOT NULL,
          ripeness_score REAL NOT NULL,
          grade_id TEXT NOT NULL,
          synced INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('[DatabaseService] Floating records table created');

      // Sync queue table - tracks records that need to be synced
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT NOT NULL,
          record_id INTEGER NOT NULL,
          operation TEXT NOT NULL,
          data TEXT,
          retry_count INTEGER DEFAULT 0,
          error_message TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('[DatabaseService] Sync queue table created');

      console.log('[DatabaseService] All tables created successfully');
    } catch (error) {
      console.error('[DatabaseService] Create tables error:', error);
      throw error;
    }
  }

  /**
   * Execute a SQL query
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} - Query results
   */
  async query(sql, params = []) {
    try {
      const result = await this.db.runAsync(sql, params);
      return result;
    } catch (error) {
      console.error('[DatabaseService] Query error:', error);
      throw error;
    }
  }

  /**
   * Execute a SELECT query and return all rows
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} - Query results
   */
  async getAll(sql, params = []) {
    try {
      const rows = await this.db.getAllAsync(sql, params);
      return rows;
    } catch (error) {
      console.error('[DatabaseService] GetAll error:', error);
      throw error;
    }
  }

  /**
   * Execute a SELECT query and return first row
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object|null>} - Query result or null
   */
  async getFirst(sql, params = []) {
    try {
      const row = await this.db.getFirstAsync(sql, params);
      return row;
    } catch (error) {
      console.error('[DatabaseService] GetFirst error:', error);
      throw error;
    }
  }

  /**
   * Insert a record and add to sync queue
   * @param {string} table - Table name
   * @param {Object} data - Record data
   * @returns {Promise<number>} - Inserted record ID
   */
  async insert(table, data) {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;

    try {
      const result = await this.query(sql, values);
      const insertId = result.lastInsertRowId;

      console.log(`[DatabaseService] Inserted into ${table}, ID: ${insertId}`);

      // Add to sync queue
      await this.addToSyncQueue(table, insertId, 'INSERT', data);

      return insertId;
    } catch (error) {
      console.error(`[DatabaseService] Insert error in ${table}:`, error);
      throw error;
    }
  }

  /**
   * Update a record and add to sync queue
   * @param {string} table - Table name
   * @param {number} id - Record ID
   * @param {Object} data - Updated data
   * @returns {Promise<void>}
   */
  async update(table, id, data) {
    const updates = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(data), id];

    const sql = `UPDATE ${table} SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

    try {
      await this.query(sql, values);

      console.log(`[DatabaseService] Updated ${table}, ID: ${id}`);

      // Add to sync queue
      await this.addToSyncQueue(table, id, 'UPDATE', data);
    } catch (error) {
      console.error(`[DatabaseService] Update error in ${table}:`, error);
      throw error;
    }
  }

  /**
   * Delete a record and add to sync queue
   * @param {string} table - Table name
   * @param {number} id - Record ID
   * @returns {Promise<void>}
   */
  async delete(table, id) {
    const sql = `DELETE FROM ${table} WHERE id = ?`;

    try {
      await this.query(sql, [id]);

      console.log(`[DatabaseService] Deleted from ${table}, ID: ${id}`);

      // Add to sync queue
      await this.addToSyncQueue(table, id, 'DELETE');
    } catch (error) {
      console.error(`[DatabaseService] Delete error in ${table}:`, error);
      throw error;
    }
  }

  /**
   * Get all records from a table
   * @param {string} table - Table name
   * @param {string} where - WHERE clause (optional)
   * @param {Array} params - Parameters for WHERE clause
   * @returns {Promise<Array>} - Records
   */
  async getAllRecords(table, where = '', params = []) {
    const sql = `SELECT * FROM ${table}${where ? ` WHERE ${where}` : ''} ORDER BY created_at DESC`;

    try {
      const rows = await this.getAll(sql, params);
      return rows;
    } catch (error) {
      console.error(`[DatabaseService] GetAllRecords error in ${table}:`, error);
      throw error;
    }
  }

  /**
   * Get a single record by ID
   * @param {string} table - Table name
   * @param {number} id - Record ID
   * @returns {Promise<Object|null>} - Record or null
   */
  async getById(table, id) {
    const sql = `SELECT * FROM ${table} WHERE id = ?`;

    try {
      const row = await this.getFirst(sql, [id]);
      return row;
    } catch (error) {
      console.error(`[DatabaseService] GetById error in ${table}:`, error);
      throw error;
    }
  }

  /**
   * Add a record to the sync queue
   * @param {string} table - Table name
   * @param {number} recordId - Record ID
   * @param {string} operation - Operation type (INSERT, UPDATE, DELETE)
   * @param {Object} data - Record data
   * @returns {Promise<void>}
   */
  async addToSyncQueue(table, recordId, operation, data = null) {
    const sql = `INSERT INTO sync_queue (table_name, record_id, operation, data) VALUES (?, ?, ?, ?)`;

    try {
      await this.query(sql, [table, recordId, operation, data ? JSON.stringify(data) : null]);
      console.log(`[DatabaseService] Added to sync queue: ${table} ID ${recordId} - ${operation}`);
    } catch (error) {
      console.error('[DatabaseService] Add to sync queue error:', error);
      // Don't throw - sync queue errors shouldn't block the main operation
    }
  }

  /**
   * Get all unsynced records
   * @returns {Promise<Array>} - Unsynced records from sync queue
   */
  async getUnsyncedRecords() {
    const sql = `SELECT * FROM sync_queue ORDER BY created_at ASC`;

    try {
      const rows = await this.getAll(sql);
      return rows.map(row => ({
        ...row,
        data: row.data ? JSON.parse(row.data) : null,
      }));
    } catch (error) {
      console.error('[DatabaseService] Get unsynced records error:', error);
      throw error;
    }
  }

  /**
   * Mark a record as synced
   * @param {string} table - Table name
   * @param {number} id - Record ID
   * @param {number} serverId - Server-assigned ID
   * @returns {Promise<void>}
   */
  async markAsSynced(table, id, serverId = null) {
    const sql = serverId
      ? `UPDATE ${table} SET synced = 1, server_id = ? WHERE id = ?`
      : `UPDATE ${table} SET synced = 1 WHERE id = ?`;

    const params = serverId ? [serverId, id] : [id];

    try {
      await this.query(sql, params);
      console.log(`[DatabaseService] Marked as synced: ${table} ID ${id}`);
    } catch (error) {
      console.error('[DatabaseService] Mark as synced error:', error);
      throw error;
    }
  }

  /**
   * Remove a record from sync queue
   * @param {number} syncQueueId - Sync queue record ID
   * @returns {Promise<void>}
   */
  async removeFromSyncQueue(syncQueueId) {
    const sql = `DELETE FROM sync_queue WHERE id = ?`;

    try {
      await this.query(sql, [syncQueueId]);
      console.log(`[DatabaseService] Removed from sync queue: ${syncQueueId}`);
    } catch (error) {
      console.error('[DatabaseService] Remove from sync queue error:', error);
      throw error;
    }
  }

  /**
   * Update sync queue error
   * @param {number} syncQueueId - Sync queue record ID
   * @param {string} errorMessage - Error message
   * @returns {Promise<void>}
   */
  async updateSyncQueueError(syncQueueId, errorMessage) {
    const sql = `UPDATE sync_queue SET retry_count = retry_count + 1, error_message = ? WHERE id = ?`;

    try {
      await this.query(sql, [errorMessage, syncQueueId]);
    } catch (error) {
      console.error('[DatabaseService] Update sync queue error:', error);
    }
  }

  /**
   * Get sync statistics
   * @returns {Promise<Object>} - Sync stats
   */
  async getSyncStats() {
    // Check if database is initialized
    if (!this.db || !this.isInitialized) {
      console.warn('[DatabaseService] Database not initialized, returning zero stats');
      return { pending: 0, hasPending: false };
    }

    try {
      const result = await this.getFirst(`SELECT COUNT(*) as count FROM sync_queue`);
      const pending = result?.count || 0;

      return {
        pending,
        hasPending: pending > 0,
      };
    } catch (error) {
      console.error('[DatabaseService] Get sync stats error:', error);
      return { pending: 0, hasPending: false };
    }
  }

  /**
   * Clear all data (use with caution)
   */
  async clearAllData() {
    try {
      await this.db.execAsync(`
        DELETE FROM harvests;
        DELETE FROM farmers;
        DELETE FROM processing;
        DELETE FROM ripeness_scores;
        DELETE FROM floating_records;
        DELETE FROM sync_queue;
      `);
      console.log('[DatabaseService] All data cleared');
    } catch (error) {
      console.error('[DatabaseService] Clear all data error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new DatabaseService();
