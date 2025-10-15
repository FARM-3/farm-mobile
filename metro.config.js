const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = {
  ...config,
  resolver: {
    ...config.resolver,
    sourceExts: [...config.resolver.sourceExts, 'cjs'],
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
  maxWorkers: 2, // Limit parallel workers to reduce memory usage
  resetCache: true,
};
