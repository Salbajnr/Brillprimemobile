
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 */
const config = {
  resolver: {
    alias: {
      '@shared': '../shared',
      '@web': '../client/src',
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
