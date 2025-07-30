# Demo System - Barqly Vault

## 🎯 **Overview**

The Barqly Vault Demo System provides an automated development environment with interactive component demos, eliminating the need for manual mode switching and ensuring production safety through intelligent guardrails.

## 🚀 **Quick Start**

### **Primary Development Command**
```bash
# Your go-to development command
npm run demo

# Or via Makefile
make demo
```

**What happens automatically:**
- ✅ Detects development environment
- ✅ Enables demo mode if needed
- ✅ Starts development server
- ✅ Provides access to all demo routes

### **Access Demo Routes**
Once the server starts, visit:
- **Main Demo Hub**: `http://localhost:1420/demo`
- **Component Demos**: Available through the demo hub

## 🎨 **Available Demos**

### **Component Demos**
- **File Selection Demo** - Interactive file picker with drag & drop
- **Success Message Demo** - Various success states and animations
- **Progress Bar Demo** - Different progress indicators and states
- **Error Message Demo** - Error handling and display patterns

### **Page Demos**
- **Demo Landing Page** - Overview and navigation to all demos
- **File Selection Demo Page** - Complete file selection workflow

## 🛠️ **Development Commands**

### **Automated Commands (Recommended)**
```bash
npm run demo          # Smart development (auto-enables demo mode)
make demo             # Same via Makefile
```

### **Manual Control (Advanced)**
```bash
# Enable/Disable demo mode
npm run demo:enable   # Enable demo mode
npm run demo:disable  # Disable demo mode
make demo-enable      # Same via Makefile
make demo-disable     # Same via Makefile

# Manual demo development
npm run demo:dev      # Enable demo mode + start server
make demo-dev         # Same via Makefile
```

### **Traditional Development**
```bash
npm run dev           # Basic dev server (no demo routes)
make dev              # Same via Makefile
```

## 🤖 **Smart Pipeline Features**

### **Environment Detection**
The system automatically detects:
- **Development Machine**: macOS/Linux with user account
- **CI/Production Environment**: GitHub Actions, Docker, etc.

### **Intelligent Decision Making**
```
🔍 Context Analysis:
   Development Machine: true
   Demo Mode Enabled: true

✅ Development + Demo Mode: Perfect for development workflow
💡 Keeping demo mode enabled for continued development
```

### **Pre-commit Safety**
The pre-commit hook automatically:
- **Development + Demo Mode** = ✅ Keep demo mode enabled
- **Development + Production Mode** = 🔄 Auto-enable demo mode
- **CI + Demo Mode** = 🚨 CRITICAL - Auto-switch to production
- **CI + Production Mode** = ✅ Perfect for deployment

## 📁 **File Structure**

```
barqly-vault/
├── scripts/
│   ├── automated-dev.sh      # Smart development script
│   ├── switch-to-demo.js     # Demo mode switcher
│   └── pre-commit           # Safety guardrails
├── src-ui/
│   ├── src/
│   │   ├── App.tsx          # Production app
│   │   ├── App.demo.tsx     # Demo-enabled app
│   │   ├── App.production.tsx # Production backup
│   │   ├── components/
│   │   │   └── forms/
│   │   │       ├── FileSelectionDemo.tsx
│   │   │       ├── SuccessMessageDemo.tsx
│   │   │       ├── ProgressBarDemo.tsx
│   │   │       └── ErrorMessageDemo.tsx
│   │   └── pages/
│   │       ├── DemoLandingPage.tsx
│   │       └── FileSelectionDemo.tsx
│   └── DEMO_SYSTEM.md       # Detailed demo documentation
└── package.json             # Root commands
```

## 🔧 **How It Works**

### **Demo Mode Switching**
1. **Backup Production**: `App.tsx` → `App.production.tsx`
2. **Enable Demo Mode**: `App.demo.tsx` → `App.tsx`
3. **Restore Production**: `App.production.tsx` → `App.tsx`

### **Smart Development Script**
```bash
# Environment detection
IS_DEV_MACHINE=false
if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if [ -n "$USER" ] && [ "$USER" != "runner" ] && [ "$USER" != "ubuntu" ]; then
        IS_DEV_MACHINE=true
    fi
fi

# Smart decision making
if [ "$IS_DEV_MACHINE" = true ] && [ "$DEMO_ENABLED" = false ]; then
    echo "🔄 Enabling demo mode for development..."
    node scripts/switch-to-demo.js demo
fi
```

### **Pre-commit Safety**
```bash
# Smart Demo Mode Pipeline
if [ "$IS_DEV_CONTEXT" = false ] && [ "$DEMO_ENABLED" = true ]; then
    echo "🚨 CI/Production + Demo Mode: CRITICAL - Switching to production mode"
    node scripts/switch-to-demo.js production
fi
```

## 🎯 **Development Workflow**

### **Daily Development**
```bash
# Start your day
npm run demo

# Access demos
# http://localhost:1420/demo

# Make changes (hot reload enabled)
# Edit components in src-ui/src/

# Commit changes (safety guaranteed)
git add .
git commit -m "feat: new feature"
# Pre-commit hook ensures production safety
```

### **Component Development**
1. **Start demo mode**: `npm run demo`
2. **Navigate to component demo**: `http://localhost:1420/demo`
3. **Edit component**: Changes hot-reload automatically
4. **Test interactions**: Use demo interface
5. **Commit safely**: Pre-commit hook handles mode switching

## 🛡️ **Safety Guarantees**

### **Production Safety**
- **Impossible to commit demo mode** to production
- **Automatic detection** of CI/Production environments
- **Pre-commit guardrails** prevent demo mode in production builds

### **Development Efficiency**
- **Zero manual switching** required
- **Automatic demo mode** for development
- **Hot reload** for all changes
- **Interactive demos** for component testing

### **Environment Awareness**
- **Different behavior** for development vs CI
- **Smart decision making** based on context
- **Clear feedback** on what's happening

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Port Already in Use**
```bash
# Kill existing process
pkill -f vite

# Restart demo mode
npm run demo
```

#### **Demo Mode Not Working**
```bash
# Check status
node scripts/switch-to-demo.js status

# Force enable demo mode
npm run demo:enable

# Start development
npm run dev
```

#### **Pre-commit Hook Issues**
```bash
# Reinstall hooks
chmod +x scripts/setup-hooks.sh
./scripts/setup-hooks.sh

# Manual validation
make lint
cargo fmt --check
cargo clippy
```

### **Getting Help**
- Check the [Development Setup Guide](./Development-Setup.md)
- Review [Validation System](./Validation-System.md)
- Open a [GitHub Issue](https://github.com/inauman/barqly-vault/issues)

## 🎉 **Benefits**

### **For Developers**
- **Simple commands**: Just `npm run demo`
- **No manual switching**: Everything automated
- **Interactive testing**: Real component demos
- **Hot reload**: Instant feedback

### **For Teams**
- **Consistent workflow**: Everyone uses same commands
- **Production safety**: Impossible to break production
- **Quality assurance**: Pre-commit validation
- **Documentation**: Live component examples

### **For Projects**
- **Reduced errors**: Automated guardrails
- **Faster development**: No context switching
- **Better testing**: Interactive demos
- **Cleaner code**: Separated demo and production

---

*This demo system provides a seamless development experience while ensuring production safety through intelligent automation.* 