const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force Metro to use the mobile package's own React installation
// This prevents React version conflicts in the monorepo
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    'react': path.resolve(__dirname, 'node_modules/react'),
    'react-native': path.resolve(__dirname, 'node_modules/react-native'),
  },
};

// Prevent duplicate React modules
config.resolver.blockList = [
  ...(config.resolver.blockList || []),
  // Block React from parent node_modules
  /\.\.\/.+\/node_modules\/react\//,
  /\.\.\/.+\/node_modules\/react-native\//,
];

module.exports = withNativeWind(config, { input: './global.css' })
