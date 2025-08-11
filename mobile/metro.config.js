
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration for React Native
 * https://facebook.github.io/metro/docs/configuration
 */
const config = {
  watchFolders: [
    // Include the root directory for shared code
    path.resolve(__dirname, '../'),
  ],
  resolver: {
    alias: {
      // Alias for shared types and schema
      '@shared': path.resolve(__dirname, '../shared'),
      '@web': path.resolve(__dirname, '../client/src'),
      '@server': path.resolve(__dirname, '../server'),
    },
    // Include node_modules from root and mobile directory
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../node_modules'),
    ],
  },
  transformer: {
    // Enable TypeScript support
    babelTransformerPath: require.resolve('react-native-typescript-transformer'),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
