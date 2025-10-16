const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = {
  ...config,
  resolver: {
    ...config.resolver,
    sourceExts: [...config.resolver.sourceExts, 'cjs'],
    // Block expo-sqlite from being resolved on web platform
    blockList: [
      ...(config.resolver.blockList || []),
      /expo-sqlite\/build\/ExpoSQLite\.web\.js$/,
    ],
    // Add alias to prevent SQLite import on web
    alias: {
      ...config.resolver.alias,
      'expo-sqlite': false,
    },
  },
  transformer: {
    ...config.transformer,
    minifierConfig: {
      keep_classnames: true,
      keep_fnames: true,
      mangle: {
        keep_classnames: true,
        keep_fnames: true,
      },
    },
  },
  maxWorkers: 1, // Further reduce workers to prevent memory issues
  resetCache: true,
};
