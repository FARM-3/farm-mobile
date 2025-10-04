// database.js
import * as SQLite from 'expo-sqlite';

// Open or create the database
const db = SQLite.openDatabase('offline_data.db');

export const initDatabase = () => {
  db.transaction(tx => {
    // Create your table(s). Use a 'synced' flag and 'last_modified' timestamp.
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        data TEXT,
        synced INTEGER DEFAULT 0,
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
      );`
    , [], 
    () => console.log('Database initialized successfully'),
    (_, error) => console.log('DB init error', error)
    );
  });
};

export const getDb = () => db;

// Call this function early in your App.js or a main component
// to ensure the DB and tables are ready.