#!/usr/bin/env node

/**
 * Chrome Extension Manifest Builder
 * Generates environment-specific manifest files for dev/prod builds
 * 
 * Usage:
 *   pnpm run build:extension:dev   # Generates manifest with localhost:3000
 *   pnpm run build:extension:prod  # Generates manifest with only production hosts
 *   node scripts/build-extension-manifest.js [dev|prod]
 */

const fs = require('fs');
const path = require('path');

const extensionDir = path.join(__dirname, '..', 'public', 'chrome-extension');
const manifestPath = path.join(extensionDir, 'manifest.json');
const devManifestPath = path.join(extensionDir, 'manifest.dev.json');
const prodManifestPath = path.join(extensionDir, 'manifest.prod.json');

/**
 * Load and parse a manifest file
 */
function loadManifest(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Failed to read manifest from ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Write manifest to file with proper formatting
 */
function writeManifest(filePath, manifest) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
    console.log(`✅ Manifest written to ${path.relative(process.cwd(), filePath)}`);
  } catch (error) {
    console.error(`❌ Failed to write manifest to ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Build extension manifest for specified environment
 */
function buildManifest(environment = 'prod') {
  environment = environment.toLowerCase();
  
  if (environment !== 'dev' && environment !== 'prod') {
    console.error(`❌ Invalid environment: ${environment}`);
    console.error('Valid options: dev, prod');
    process.exit(1);
  }

  console.log(`🔨 Building Chrome Extension manifest for ${environment.toUpperCase()}...`);

  let sourceManifest;
  
  if (environment === 'dev') {
    sourceManifest = loadManifest(devManifestPath);
    console.log('📋 Using manifest.dev.json as source');
  } else {
    sourceManifest = loadManifest(prodManifestPath);
    console.log('📋 Using manifest.prod.json as source');
  }

  writeManifest(manifestPath, sourceManifest);
  
  console.log(`\n✨ Successfully built ${environment} manifest!`);
  console.log(`📍 Host permissions in manifest.json:`);
  if (Array.isArray(sourceManifest.host_permissions)) {
    sourceManifest.host_permissions.forEach(perm => {
      console.log(`   - ${perm}`);
    });
  } else {
    console.log('   (none)');
  }
  console.log(`\n💡 Tip: Add build scripts to package.json:`);
  console.log(`   "build:extension:dev": "node scripts/build-extension-manifest.js dev"`);
  console.log(`   "build:extension:prod": "node scripts/build-extension-manifest.js prod"`);
}

// Run build with environment from CLI arg or default to prod
const env = process.argv[2] || 'prod';
buildManifest(env);
