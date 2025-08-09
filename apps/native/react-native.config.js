module.exports = {
  dependencies: {
    'react-native-vector-icons': {
      platforms: {
        ios: {
          sourceDir: '../node_modules/react-native-vector-icons/Fonts',
          project: 'RNVectorIcons.xcodeproj',
        },
      },
    },
  },
  assets: ['./src/assets/fonts/'],
};