# Node-RED Sandbox Mode Documentation

## Overview
This configuration provides a safe sandbox environment for Node-RED where users can explore the full editor UI, build flows, and experiment with the interface - all without any risk. Changes exist only in the browser session and no workflows actually execute.

## Quick Start

```bash
# Just run the startup script - no configuration needed!
./start-demo.sh
```

Then open http://localhost:1880 in your browser.

## What Users Can Do

### ✅ Full Editor Experience
- **Drag and drop nodes** from the palette
- **Connect nodes** to build flows
- **Configure node properties** with full UI
- **Use the Deploy button** (it works in the UI but doesn't save)
- **Import/Export flows** for learning
- **Search** for nodes and flows
- **View debug messages** (from UI interactions only)
- **Create subflows** and groups
- **Use all editor features** without restrictions

### 🛡️ What's Protected
- **No persistence** - Flows exist only in browser memory
- **No execution** - Workflows don't actually run
- **No file access** - File operations go to `/tmp` only
- **No network access** - HTTP endpoints return 403
- **No external modules** - Can't install new nodes
- **No system access** - Exec nodes disabled
- **No WebSockets** - Real-time connections blocked

## How It Works

### 1. **Client-Side Freedom**
The editor UI is fully functional. Users can:
- Build complex flows
- Configure every type of node
- See immediate visual feedback
- Experience the complete Node-RED interface

### 2. **Server-Side Safety**
Behind the scenes:
- Deploy sends to `/dev/null` instead of saving
- Flow file points to non-existent location
- HTTP endpoints are blocked at middleware level
- Function nodes have 5-second timeout
- Context storage is memory-only

### 3. **Ephemeral Nature**
- Refreshing the page = fresh start
- No flows are saved to disk
- No credentials are stored
- Perfect for demos and training

## Architecture

```
┌─────────────────┐
│   Browser       │
│                 │
│  Full Editor    │ ← Users interact here freely
│  Experience     │
└────────┬────────┘
         │ Deploy/Save attempts
         ↓
┌─────────────────┐
│  Middleware     │
│                 │
│  Returns OK     │ ← But doesn't actually save
│  Blocks Danger  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Storage       │
│                 │
│  /dev/null      │ ← Nothing persisted
│  Memory only    │
└─────────────────┘
```

## Configuration Details

### Key Settings in `user-settings.js`:

```javascript
// Flows not saved to disk
flowFile: '/dev/null'

// Temporary user directory
userDir: '/tmp/node-red-sandbox/'

// Full editor UI available
editorTheme: {
    header: {
        title: "Node-RED Sandbox - Try it out! (Changes are temporary)"
    }
    // No menu restrictions
}

// Smart middleware
httpAdminMiddleware: function(req, res, next) {
    // Allow Deploy to work in UI
    if (req.path === '/flows' && req.method === 'POST') {
        return res.json({ rev: "sandbox-" + Date.now() });
    }
    // Block dangerous operations
    // ...
}
```

## Use Cases

### 🎓 Training & Education
- Students can learn without breaking anything
- Instructors can let everyone experiment freely
- No cleanup needed between sessions

### 🎪 Public Demos
- Conference booths
- Website embeds
- Product demonstrations
- No login required

### 🧪 Testing & Exploration
- Try new node configurations
- Test flow logic visually
- Experiment with UI features
- Safe environment for beginners

## Security Features

| Layer | Protection | Purpose |
|-------|------------|---------|
| **UI** | Full access | Learning experience |
| **API** | Selective blocking | Prevent harmful operations |
| **Storage** | /dev/null | No persistence |
| **Execution** | Disabled | No code runs |
| **Network** | Blocked | No external connections |
| **Files** | Restricted to /tmp | No system access |
| **Modules** | Install disabled | No new dependencies |

## Customization

### Change the Header Message
Edit `editorTheme.header.title` in `user-settings.js`:
```javascript
header: {
    title: "Your Custom Sandbox Message"
}
```

### Adjust Temporary Directory
Change `userDir` and `fileWorkingDirectory`:
```javascript
userDir: '/custom/tmp/path/'
fileWorkingDirectory: '/custom/tmp/path/'
```

### Modify Port
```bash
PORT=3000 ./start-demo.sh
```

## FAQ

### Q: Can users actually run the flows they create?
**A:** No. The Deploy button works in the UI for the full experience, but flows are not executed. The runtime is effectively disabled.

### Q: What happens when users refresh the page?
**A:** They get a fresh, empty workspace. Nothing is saved between sessions.

### Q: Can users harm the server?
**A:** No. Multiple layers of protection prevent any harmful actions:
- Flows don't execute
- File access is restricted
- Network connections are blocked
- External commands are disabled

### Q: Can users install new nodes?
**A:** No. The palette manager is available in the UI but installation requests are blocked at the server level.

### Q: Is this suitable for embedding in an iframe?
**A:** Yes! The `X-Frame-Options` is set to `SAMEORIGIN` to allow embedding while maintaining security.

## Troubleshooting

### "Permission denied" when running start-demo.sh
```bash
chmod +x start-demo.sh
```

### Port already in use
```bash
PORT=3000 ./start-demo.sh
```

### Want to see what's being blocked?
Check browser DevTools Network tab - blocked operations return 403.

## Comparison with Production

| Feature | Sandbox Mode | Production |
|---------|-------------|------------|
| **UI Access** | ✅ Full | ✅ Full |
| **Deploy Works** | ✅ UI only | ✅ Full |
| **Flows Execute** | ❌ No | ✅ Yes |
| **Save to Disk** | ❌ No | ✅ Yes |
| **HTTP Endpoints** | ❌ Blocked | ✅ Work |
| **Install Nodes** | ❌ Blocked | ✅ Yes |
| **Authentication** | ❌ None | ✅ Optional |
| **File Access** | ❌ Limited | ✅ Full |

## Support

For issues or enhancements to sandbox mode:
1. Check the browser console for client-side errors
2. Check the terminal for server-side messages
3. Verify `/tmp` directories exist and are writable
4. Ensure Node-RED dependencies are installed

## License

This sandbox configuration is provided as-is for educational and demonstration purposes.