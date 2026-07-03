const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.disableHierarchicalLookup = true;

// Habilita require.context (necessário para expo-router)
config.transformer.unstable_allowRequireContext = true;

module.exports = config;
