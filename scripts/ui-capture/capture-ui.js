#!/usr/bin/env node

/**
 * Barqly Vault UI Capture Tool
 * 
 * Simple on-demand desktop screenshot capture for design consistency analysis.
 * 
 * Usage:
 *   node capture-ui.js           # Start interactive capture session
 *   node capture-ui.js --help    # Show help
 *   node capture-ui.js --analyze-only  # Generate analysis for latest session
 * 
 * Interactive Commands:
 *   c [Enter] - Capture current desktop screenshot
 *   q [Enter] - Quit and optionally generate analysis
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');
const os = require('os');

class UICaptureTool {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.capturesDir = path.join(this.projectRoot, 'docs', 'ui-captures');
    this.sessionId = this.generateSessionId();
    this.sessionDir = path.join(this.capturesDir, 'sessions', this.sessionId);
    this.analysisDir = path.join(this.capturesDir, 'analysis', this.sessionId);
    this.screenshots = [];
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Dynamic import for screenshot-desktop (ESM module)
    this.screenshot = null;
  }

  generateSessionId() {
    const now = new Date();
    return now.toISOString()
      .replace(/[:.]/g, '')
      .replace('T', '_')
      .split('Z')[0];
  }

  async initialize() {
    try {
      // Dynamic import for screenshot-desktop
      const screenshotModule = await import('screenshot-desktop');
      this.screenshot = screenshotModule.default;
      
      // Create session directories
      await fs.mkdir(path.join(this.sessionDir, 'screenshots'), { recursive: true });
      await fs.mkdir(this.analysisDir, { recursive: true });
      
      console.log(`✅ Initialized capture session: ${this.sessionId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize capture tool:', error.message);
      console.error('💡 Try running: cd scripts/ui-capture && npm install');
      return false;
    }
  }

  async startCaptureSession() {
    console.log('\n📸 UI Capture Mode Active');
    console.log('==========================================\n');
    console.log('Instructions:');
    console.log('- Navigate your Barqly Vault app to any state you want to capture');
    console.log('- Press \'c\' + Enter for active window capture with 3-second delay');
    console.log('- Press \'f\' + Enter for fast capture (no delay)');
    console.log('- Press \'5\' + Enter for capture with 5-second delay');
    console.log('- Press \'q\' + Enter to quit and optionally generate analysis');
    console.log('- Press \'h\' + Enter to show help\n');
    console.log('🍎 macOS Mode: Captures ONLY the active window (clean screenshots!)');
    console.log('💡 Tip: After pressing Enter, quickly click on your Barqly Vault app');
    console.log('Ready to capture. Press \'c\' when you see something to screenshot...\n');

    while (true) {
      try {
        const command = await this.waitForCommand();
        
        if (command === 'c') {
          await this.captureCurrentScreen(3); // 3-second delay
        } else if (command === 'f') {
          await this.captureCurrentScreen(0); // Fast capture, no delay
        } else if (command === '5') {
          await this.captureCurrentScreen(5); // 5-second delay
        } else if (command === 'q') {
          break;
        } else if (command === 'h') {
          this.showHelp();
        } else if (command === 'l') {
          this.listCaptures();
        } else if (command === 't') {
          await this.testScreenshot();
        } else {
          console.log('❓ Unknown command. Press \'c\' (3s delay), \'f\' (fast), \'5\' (5s delay), \'q\' to quit, \'h\' for help');
        }
      } catch (error) {
        console.error('❌ Error during capture session:', error.message);
        console.log('Continue? Press \'c\' to capture, \'q\' to quit...');
      }
    }

    await this.finalizeCaptureSession();
  }

  async waitForCommand() {
    return new Promise((resolve) => {
      this.rl.question('> ', (answer) => {
        resolve(answer.toLowerCase().trim());
      });
    });
  }

  async askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async captureCurrentScreen(delaySeconds = 3) {
    const captureNumber = this.screenshots.length + 1;
    console.log(`\n📸 Capturing screenshot ${captureNumber}...`);

    try {
      // Add capture delay to allow window switching
      if (delaySeconds > 0) {
        console.log(`⏰ ${delaySeconds}-second delay to switch to your app...`);
        console.log('💡 Switch to Barqly Vault app now!');
        
        for (let i = delaySeconds; i > 0; i--) {
          console.log(`📱 Capturing in ${i}...`);
          await this.sleep(1000);
        }
        
        console.log('📸 Taking screenshot now!');
      } else {
        console.log('⚡ Taking immediate screenshot...');
      }
      
      // Add diagnostic info
      console.log('🔍 Attempting to capture active window...');
      
      // Try platform-specific active window capture
      let screenshotBuffer = await this.captureActiveWindow();
      
      console.log(`📊 Screenshot captured: ${screenshotBuffer.length} bytes`);
      
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '').replace('T', '_').split('Z')[0];
      const filename = `capture-${captureNumber}-${timestamp}.png`;
      const filepath = path.join(this.sessionDir, 'screenshots', filename);
      
      console.log(`💾 Saving to: ${filepath}`);
      
      // Save screenshot
      await fs.writeFile(filepath, screenshotBuffer);
      
      console.log('✅ File saved successfully');
      
      // Get optional description
      const description = await this.askQuestion('📝 Enter description (optional): ');
      
      // Store metadata
      const captureData = {
        number: captureNumber,
        filename,
        description: description || `Screenshot ${captureNumber}`,
        timestamp: new Date().toISOString(),
        filepath: path.relative(this.projectRoot, filepath),
        fileSize: screenshotBuffer.length
      };
      
      this.screenshots.push(captureData);
      
      console.log(`✅ Screenshot ${captureNumber} captured: ${description || filename}`);
      console.log('Continue? Press \'c\' to capture more, \'q\' to finish, \'l\' to list captures...\n');
      
    } catch (error) {
      console.error('❌ Failed to capture screenshot:', error.message);
      console.error('📋 Error details:', error);
      
      // Specific error guidance
      if (error.message.includes('permission') || error.message.includes('denied')) {
        console.log('🔐 This appears to be a permission issue.');
        console.log('💡 Try:');
        console.log('   1. System Preferences → Security & Privacy → Privacy → Screen Recording');
        console.log('   2. Add Terminal (or your terminal app) to allowed apps');
        console.log('   3. Restart terminal and try again');
      } else if (error.message.includes('display') || error.message.includes('screen')) {
        console.log('🖥️  This appears to be a display issue.');
        console.log('💡 Try:');
        console.log('   1. Make sure you have an active display');
        console.log('   2. Try disconnecting external displays temporarily');
        console.log('   3. Check if screen mirroring is enabled');
      } else {
        console.log('💡 This might be a module compatibility issue.');
        console.log('   Try running: cd scripts/ui-capture && npm install --force');
      }
      
      console.log('Continue? Press \'c\' to retry, \'q\' to quit...\n');
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async captureActiveWindow() {
    const platform = os.platform();
    
    if (platform === 'darwin') {
      // macOS: Use native screencapture with window selection
      console.log('🍎 Using macOS native window capture...');
      return await this.macOSActiveWindowCapture();
    } else if (platform === 'win32') {
      // Windows: Use screenshot-desktop fallback
      console.log('🪟 Using Windows screenshot fallback...');
      return await this.screenshot({ format: 'png' });
    } else {
      // Linux: Use screenshot-desktop fallback
      console.log('🐧 Using Linux screenshot fallback...');
      return await this.screenshot({ format: 'png' });
    }
  }

  async macOSActiveWindowCapture() {
    const captureNumber = this.screenshots.length + 1;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '').replace('T', '_').split('Z')[0];
    const tempFilename = `temp-capture-${captureNumber}-${timestamp}.png`;
    const tempPath = path.join(this.sessionDir, 'screenshots', tempFilename);

    try {
      // Use macOS screencapture command to capture active window
      // -w flag captures only the window, -o flag excludes window shadow for cleaner look
      console.log('📱 Using macOS screencapture for active window...');
      execSync(`screencapture -w -o "${tempPath}"`, { stdio: 'pipe' });
      
      console.log('✅ Active window captured using macOS native tool');
      
      // Read the file back into a buffer
      const buffer = await fs.readFile(tempPath);
      
      // Clean up temp file
      await fs.unlink(tempPath);
      
      return buffer;
    } catch (error) {
      console.log('ℹ️  Native window capture failed, using desktop capture fallback...');
      console.log(`   Error: ${error.message}`);
      
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch (cleanupError) {
        // Ignore cleanup error
      }
      
      // Fallback to full desktop capture
      return await this.screenshot({ format: 'png' });
    }
  }

  showHelp() {
    console.log('\n📋 Available Commands:');
    console.log('  c - Capture active window (3-second delay, recommended)');
    console.log('  f - Fast capture (immediate, no delay)');
    console.log('  5 - Capture with 5-second delay');
    console.log('  q - Quit and finalize session');
    console.log('  l - List current captures in this session');
    console.log('  t - Test screenshot capability (diagnostic)');
    console.log('  h - Show this help message\n');
    console.log('💡 On macOS: Captures only the active window (cleaner screenshots)');
    console.log('💡 On Windows/Linux: Captures full desktop (fallback mode)\n');
  }

  async testScreenshot() {
    console.log('\n🧪 Testing screenshot capability...');
    
    try {
      console.log('1️⃣  Testing module import...');
      if (!this.screenshot) {
        throw new Error('Screenshot module not initialized');
      }
      console.log('✅ Module loaded successfully');
      
      console.log('2️⃣  Testing screenshot capture...');
      const buffer = await this.screenshot({ format: 'png' });
      console.log(`✅ Screenshot captured: ${buffer.length} bytes`);
      
      console.log('3️⃣  Testing file system write...');
      const testPath = path.join(this.sessionDir, 'screenshots', 'test-capture.png');
      await fs.writeFile(testPath, buffer);
      console.log(`✅ Test file written to: ${testPath}`);
      
      console.log('4️⃣  Verifying file exists...');
      const stats = await fs.stat(testPath);
      console.log(`✅ File verified: ${stats.size} bytes`);
      
      console.log('\n🎉 Screenshot capability test PASSED!');
      console.log('The tool should work correctly. Try capturing with \'c\' command.');
      
      // Clean up test file
      await fs.unlink(testPath);
      console.log('🧹 Test file cleaned up\n');
      
    } catch (error) {
      console.error('\n❌ Screenshot capability test FAILED:');
      console.error('Error:', error.message);
      
      if (error.message.includes('permission') || error.code === 'EACCES') {
        console.log('\n🔐 Permission Issue Detected:');
        console.log('  1. Open System Preferences → Security & Privacy → Privacy');
        console.log('  2. Select "Screen Recording" from the left sidebar');
        console.log('  3. Click the lock to make changes (enter password)');
        console.log('  4. Add your Terminal app (Terminal.app, iTerm2, etc.)');
        console.log('  5. Restart your terminal completely');
        console.log('  6. Try the tool again');
      } else {
        console.log('\n💡 Possible solutions:');
        console.log('  - Try running: cd scripts/ui-capture && npm install --force');
        console.log('  - Restart your terminal');
        console.log('  - Check if you have multiple displays causing issues');
        console.log('  - Try running with: sudo node capture-ui.js (not recommended)');
      }
      console.log('');
    }
  }

  listCaptures() {
    if (this.screenshots.length === 0) {
      console.log('\n📷 No screenshots captured yet.\n');
      return;
    }

    console.log(`\n📷 Current Session Captures (${this.screenshots.length}):`);
    console.log('==========================================');
    this.screenshots.forEach((capture, index) => {
      console.log(`${index + 1}. ${capture.description}`);
      console.log(`   File: ${capture.filename}`);
      console.log(`   Time: ${new Date(capture.timestamp).toLocaleString()}\n`);
    });
  }

  async finalizeCaptureSession() {
    console.log(`\n🎉 Capture session complete! Captured ${this.screenshots.length} screenshots`);
    
    if (this.screenshots.length === 0) {
      console.log('No screenshots to process. Session ended.');
      this.rl.close();
      return;
    }

    // Generate session manifest
    await this.generateSessionManifest();
    
    // Create latest symlink
    await this.createLatestSymlink();
    
    // Ask about analysis
    const generateAnalysis = await this.askYesNo('\n🤖 Generate AI analysis prompt? (y/n): ');
    
    if (generateAnalysis) {
      await this.generateAnalysisPrompt();
    }
    
    console.log(`\n📁 Session files saved to: docs/ui-captures/sessions/${this.sessionId}`);
    if (generateAnalysis) {
      console.log(`📄 Analysis files saved to: docs/ui-captures/analysis/${this.sessionId}`);
      console.log('\n💡 Next steps:');
      console.log('   1. Review the analysis prompt in docs/ui-captures/analysis/');
      console.log('   2. Use the prompt with Claude Code for design analysis');
      console.log('   3. Save results back to the analysis directory');
    }
    
    this.rl.close();
  }

  async askYesNo(question) {
    while (true) {
      const answer = await this.askQuestion(question);
      const normalized = answer.toLowerCase();
      if (normalized.startsWith('y') || normalized === '1') return true;
      if (normalized.startsWith('n') || normalized === '0') return false;
      console.log('Please answer y/n');
    }
  }

  async generateSessionManifest() {
    const manifest = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      captureCount: this.screenshots.length,
      appVersion: await this.getAppVersion(),
      screenshots: this.screenshots,
      generatedBy: 'UI Capture Tool v1.0.0',
      projectPath: this.projectRoot
    };

    const manifestPath = path.join(this.sessionDir, 'session-manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    
    console.log('✅ Session manifest generated');
  }

  async getAppVersion() {
    try {
      const packagePath = path.join(this.projectRoot, 'package.json');
      const packageData = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageData);
      return packageJson.version || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  async createLatestSymlink() {
    try {
      const latestPath = path.join(this.capturesDir, 'latest');
      
      // Remove existing symlink if it exists
      try {
        await fs.unlink(latestPath);
      } catch (error) {
        // Ignore error if symlink doesn't exist
      }
      
      // Create new symlink (relative to avoid absolute path issues)
      await fs.symlink(`sessions/${this.sessionId}`, latestPath);
      console.log('✅ Latest session symlink updated');
    } catch (error) {
      console.log('⚠️  Could not create latest symlink (not critical):', error.message);
    }
  }

  async generateAnalysisPrompt() {
    const analysisPrompt = this.createAnalysisPrompt();
    const promptPath = path.join(this.analysisDir, 'analysis-prompt.md');
    
    await fs.writeFile(promptPath, analysisPrompt);
    
    // Create placeholder for results
    const resultsTemplate = `# UI Analysis Results

*Session: ${this.sessionId}*  
*Date: ${new Date().toLocaleDateString()}*

## Analysis Summary

[AI analysis results will be added here]

## Priority Recommendations

### High Priority
- [Critical consistency issues]

### Medium Priority  
- [Usability improvements]

### Low Priority
- [Polish items]

## Implementation Notes

[Implementation guidance and examples]

---

*Generated by UI Capture Tool - Add your analysis results above*
`;

    const resultsPath = path.join(this.analysisDir, 'analysis-results.md');
    await fs.writeFile(resultsPath, resultsTemplate);
    
    console.log('✅ Analysis prompt and template generated');
  }

  createAnalysisPrompt() {
    return `# UI Consistency Analysis Request

*Session ID: ${this.sessionId}*  
*Capture Date: ${new Date().toISOString()}*  
*App Version: Barqly Vault v${this.getAppVersion()}*  
*Total Screenshots: ${this.screenshots.length}*

## Context

This is a desktop application built with Tauri (Rust + React/TypeScript) for secure Bitcoin file encryption. The app has evolved organically and needs design consistency analysis to identify visual inconsistencies and UX improvements.

## Screenshots Captured

${this.screenshots.map((capture, index) => `
### Screenshot ${index + 1}: ${capture.description}
- **File**: \`docs/ui-captures/sessions/${this.sessionId}/screenshots/${capture.filename}\`
- **Description**: ${capture.description}
- **Captured**: ${new Date(capture.timestamp).toLocaleString()}
`).join('\n')}

## Analysis Request

Please analyze these ${this.screenshots.length} screenshots for design consistency and provide actionable recommendations. Focus on:

### 1. Visual Consistency Issues
- **Color scheme variations** across screens and states
- **Typography inconsistencies** (font sizes, weights, families)
- **Button styling differences** (sizes, colors, borders, spacing)
- **Input field styling** variations and states
- **Layout alignment problems** and spacing inconsistencies
- **Icon style variations** and visual treatments

### 2. User Experience Analysis
- **Navigation clarity** and consistency between screens
- **Information hierarchy** and visual importance
- **Visual feedback** for user actions and states
- **Loading states** and progress indicators
- **Error state presentations** and messaging
- **Accessibility concerns** (contrast, sizing, keyboard navigation)

### 3. Design System Opportunities
- **Components that should be standardized** across screens
- **Color palette consolidation** recommendations
- **Typography scale** suggestions for consistent hierarchy
- **Spacing/grid system** opportunities
- **Reusable component** identification

### 4. Screen-Specific Analysis
Please provide specific feedback for each captured screenshot:

${this.screenshots.map((capture, index) => `
#### ${capture.description}
- What works well in this screen?
- What specific inconsistencies need attention?
- How does this screen compare to others in the set?
`).join('\n')}

## Deliverables Requested

### 1. Executive Summary
Brief overview of main consistency issues and their impact on user experience.

### 2. Prioritized Recommendations
Organize findings by priority:

- **🔴 High Priority**: Critical consistency issues affecting core user experience
- **🟡 Medium Priority**: Improvements that enhance usability and professional appearance  
- **🟢 Low Priority**: Polish items for future consideration

### 3. Implementation Guidance
For each recommendation, provide:
- Specific examples of the issue
- Proposed solution with implementation details
- CSS/styling suggestions where applicable
- Component consolidation opportunities

### 4. Before/After Examples
Where possible, suggest specific improvements with examples like:
- "Change button-primary from #007AFF to #1D4ED8 for consistency"
- "Standardize input field padding to 12px vertical, 16px horizontal"
- "Use consistent border-radius of 8px across all cards and modals"

## Expected Outcome

Actionable design consistency improvements that will:
- Reduce visual inconsistencies across the application
- Improve user experience through predictable UI patterns
- Create foundation for a scalable design system
- Enhance professional appearance for Bitcoin custody use case

---

*Note: Screenshots are located in docs/ui-captures/sessions/${this.sessionId}/screenshots/ and should be accessible for analysis. Please reference specific screenshots by their description when providing recommendations.*
`;
  }

  async analyzeOnly() {
    // Find latest session
    const sessionsDir = path.join(this.capturesDir, 'sessions');
    
    try {
      const sessions = await fs.readdir(sessionsDir);
      if (sessions.length === 0) {
        console.log('❌ No capture sessions found. Run a capture session first.');
        return;
      }
      
      // Get most recent session
      const latestSession = sessions.sort().reverse()[0];
      console.log(`🤖 Generating analysis for session: ${latestSession}`);
      
      // Load session manifest
      const manifestPath = path.join(sessionsDir, latestSession, 'session-manifest.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      
      // Set up for analysis generation
      this.sessionId = latestSession;
      this.screenshots = manifest.screenshots;
      this.analysisDir = path.join(this.capturesDir, 'analysis', latestSession);
      
      await fs.mkdir(this.analysisDir, { recursive: true });
      await this.generateAnalysisPrompt();
      
      console.log(`📄 Analysis prompt generated for ${manifest.captureCount} screenshots`);
      console.log(`📁 Files saved to: docs/ui-captures/analysis/${latestSession}/`);
      
    } catch (error) {
      console.error('❌ Failed to generate analysis:', error.message);
    }
  }

  showUsage() {
    console.log(`
📸 Barqly Vault UI Capture Tool

USAGE:
  node capture-ui.js [options]

OPTIONS:
  --help          Show this help message
  --analyze-only  Generate analysis prompt for latest capture session

INTERACTIVE COMMANDS (during capture session):
  c - Capture current desktop screenshot  
  q - Quit and finalize session
  l - List current captures
  h - Show help

EXAMPLES:
  node capture-ui.js              # Start interactive capture session
  node capture-ui.js --analyze-only  # Generate analysis for latest session
  
WORKFLOW:
  1. Start your Barqly Vault desktop app
  2. Run this tool to start capture session
  3. Navigate app to states you want to analyze
  4. Press 'c' to capture each interesting state
  5. Press 'q' when done to generate analysis prompt
  6. Use the generated prompt with Claude Code for analysis

OUTPUT:
  Screenshots: docs/ui-captures/sessions/[timestamp]/
  Analysis:    docs/ui-captures/analysis/[timestamp]/
`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    new UICaptureTool().showUsage();
    return;
  }
  
  const tool = new UICaptureTool();
  
  if (args.includes('--analyze-only')) {
    await tool.analyzeOnly();
    return;
  }
  
  // Initialize and start capture session
  const initialized = await tool.initialize();
  if (!initialized) {
    process.exit(1);
  }
  
  await tool.startCaptureSession();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Capture session interrupted. Goodbye!');
  process.exit(0);
});

// Run the tool
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = UICaptureTool;