const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

// Resolve caminhos reais para evitar problemas com acentos e atalhos DOS
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Desabilita o symlinks para evitar problemas com caminhos curtos
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
