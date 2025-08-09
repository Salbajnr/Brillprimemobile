const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 */
const config = {
  resolver: {
    alias: {
      '@': './src',
      '@assets': './src/assets',
      '@components': './src/components',
      '@screens': './src/screens',
      '@services': './src/services',
      '@hooks': './src/hooks',
      '@store': './src/store',
      '@types': './src/types',
      '@utils': './src/utils',
      '@navigation': './src/navigation',
    },
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);