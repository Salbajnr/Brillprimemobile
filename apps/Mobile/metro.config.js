
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration for monorepo
 * https://facebook.github.io/metro/docs/configuration
 */
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = {
  projectRoot,
  watchFolders: [
    monorepoRoot,
  ],
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
      '@shared': path.resolve(monorepoRoot, 'packages/shared/src'),
      '@server': path.resolve(monorepoRoot, 'packages/server/src'),
    },
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    disableHierarchicalLookup: false,
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
