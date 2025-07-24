#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../src-ui/src/App.tsx');
const appDemoPath = path.join(__dirname, '../src-ui/src/App.demo.tsx');
const appBackupPath = path.join(__dirname, '../src-ui/src/App.production.tsx');

function switchToDemo() {
  try {
    // Backup current App.tsx as production version
    if (fs.existsSync(appPath)) {
      fs.copyFileSync(appPath, appBackupPath);
      console.log('✅ Backed up production App.tsx');
    }
    
    // Copy demo version to App.tsx
    if (fs.existsSync(appDemoPath)) {
      fs.copyFileSync(appDemoPath, appPath);
      console.log('✅ Switched to demo mode');
      console.log('🌐 Demo routes are now available at /demo');
      console.log('📝 Use "npm run demo:dev" to start development server with demos');
    } else {
      console.error('❌ App.demo.tsx not found');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error switching to demo mode:', error.message);
    process.exit(1);
  }
}

function switchToProduction() {
  try {
    // Restore production App.tsx
    if (fs.existsSync(appBackupPath)) {
      fs.copyFileSync(appBackupPath, appPath);
      console.log('✅ Switched to production mode');
      console.log('🚀 Demo routes removed from production build');
      console.log('📝 Use "npm run dev" to start clean production development server');
    } else {
      console.error('❌ Production backup not found');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error switching to production mode:', error.message);
    process.exit(1);
  }
}

function showStatus() {
  try {
    if (fs.existsSync(appBackupPath)) {
      console.log('📊 Current Status: Demo mode enabled');
      console.log('🌐 Demo routes are available');
      console.log('📁 Production backup exists');
    } else {
      console.log('📊 Current Status: Production mode');
      console.log('🚀 Clean production build');
      console.log('📁 No demo routes available');
    }
  } catch (error) {
    console.error('❌ Error checking status:', error.message);
    process.exit(1);
  }
}

const command = process.argv[2];

switch (command) {
  case 'demo':
    switchToDemo();
    break;
  case 'production':
    switchToProduction();
    break;
  case 'status':
    showStatus();
    break;
  default:
    console.log('🎯 Barqly Vault Demo System');
    console.log('');
    console.log('Usage: node scripts/switch-to-demo.js [demo|production|status]');
    console.log('');
    console.log('Commands:');
    console.log('  demo       - Switch to demo mode (includes demo routes)');
    console.log('  production - Switch to production mode (clean, no demo routes)');
    console.log('  status     - Show current mode status');
    console.log('');
    console.log('Quick Commands:');
    console.log('  npm run demo:enable  - Enable demo mode');
    console.log('  npm run demo:disable - Disable demo mode');
    console.log('  npm run demo:dev     - Enable demo mode and start dev server');
    console.log('');
    console.log('📖 See src-ui/DEMO_SYSTEM.md for detailed documentation');
    process.exit(1);
} 