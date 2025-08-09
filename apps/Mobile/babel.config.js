
const path = require('path');

module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
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
          '@shared': path.resolve(__dirname, '../../packages/shared/src'),
          '@server': path.resolve(__dirname, '../../packages/server/src'),
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
