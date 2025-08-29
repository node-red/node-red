# 🚀 NeuronGPT Setup Guide

This guide explains how to set up and use the NeuronGPT AI assistant in your Neuron Node-RED application.

## 📁 File Organization

### **Software Installation Files (included in main app)**
```
neuron/
├── theme/
│   ├── neuron-chat-widget.js  # Floating chat interface
│   └── header-balance.css     # Chat widget styling
└── neuron-settings.js         # Updated to load chat widget
```

### **External Components (NOT included in main app)**
```
external/
├── server/                    # Standalone ChatGPT server
├── development/               # Testing and development tools
└── deployment/                # Deployment scripts
```

## 🎯 What We've Built

### **1. Chat Widget (In-App)**
- **Location:** `neuron/theme/neuron-chat-widget.js`
- **Purpose:** Floating chat interface in Node-RED editor
- **Features:** Real-time chat, minimize/expand, responsive design
- **Connection:** Connects to external server for AI responses

### **2. External Server (Separate Service)**
- **Location:** `external/server/neuron-gpt-server.js`
- **Purpose:** Handles ChatGPT API calls and provides smart responses
- **Features:** Context-aware responses, rate limiting, security
- **Status:** NOT part of main software installation

## 🚀 Quick Start

### **Step 1: Test the Chat Widget**
1. **Restart Node-RED** with your `neuron-settings.js`
2. **Look for floating chat widget** in bottom-right corner
3. **Try typing a message** - you'll see demo responses

### **Step 2: Start External Server**
1. **Navigate to external server folder:**
   ```bash
   cd external/server
   npm install
   npm start
   ```
2. **Server will run on port 3001** (configurable)
3. **Chat widget will connect automatically**

### **Step 3: Test AI Integration**
1. **Type questions** in the chat widget
2. **Get smart responses** about Neuron software
3. **See connection status** at bottom of chat

## ⚙️ Configuration

### **Chat Widget Configuration**
- **Server URL:** Configure in `neuron/theme/neuron-chat-widget.js`
- **Default:** `http://localhost:3001`
- **Change:** Update `CONFIG.serverUrl` in the file

### **External Server Configuration**
```bash
# Environment variables (external/server/.env)
PORT=3001
ALLOWED_ORIGINS=http://localhost:1880,http://localhost:3000
```

## 🔧 Development & Testing

### **Using External Server**
```bash
# Install external dependencies
cd external/server
npm install

# Start external server
npm start

# Test endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/chat -X POST -H "Content-Type: application/json" -d '{"message":"How do I create a flow?","context":"Neuron software"}'
```

### **Test Flow**
- **Location:** `external/development/test-flows/neuron-gpt-test.json`
- **Purpose:** Test external server functionality
- **Usage:** Import into Node-RED for testing

## 🎨 Customization

### **Chat Widget Styling**
- **File:** `neuron/theme/header-balance.css`
- **Sections:** Look for "NeuronGPT Chat Widget Styles"
- **Customize:** Colors, sizes, positioning, animations

### **Server Configuration**
- **File:** `external/server/neuron-gpt-server.js`
- **Section:** `generateSmartResponse` function
- **Modify:** Response logic, context handling, API integration

### **AI Behavior**
- **File:** `external/server/neuron-gpt-server.js`
- **Section:** `generateSmartResponse` function
- **Customize:** Response patterns, context injection, topic filtering

## 🚨 Troubleshooting

### **Chat Widget Not Appearing**
1. **Check browser console** for JavaScript errors
2. **Verify script loading** in `neuron-settings.js`
3. **Restart Node-RED** after changes

### **Cannot Connect to External Server**
1. **Check if server is running** on port 3001
2. **Verify CORS settings** in external server
3. **Check firewall/network** settings

### **Styling Issues**
1. **Clear browser cache** and refresh
2. **Check CSS conflicts** with other themes
3. **Verify CSS file** is being loaded

## 📊 Usage Examples

### **Ask About Node-RED**
- "How do I create a flow for machine-to-machine trading?"
- "What nodes are available in Neuron?"
- "How do I configure the buyer node?"

### **Ask About Neuron SDK**
- "What does the Neuron SDK do?"
- "How does blockchain integration work?"
- "Explain smart contract automation"

### **Ask About Your Software**
- "What makes Neuron different from regular Node-RED?"
- "How do I set up automated trading?"
- "What are the custom nodes for?"

## 🔒 Security Considerations

### **External Server Security**
- **Rate limiting** implemented (100 requests per 15 minutes)
- **CORS protection** for cross-origin requests
- **Helmet middleware** for security headers
- **Input validation** for all requests

### **API Key Protection**
- **Server handles API keys** (not exposed to frontend)
- **Environment variables** for sensitive configuration
- **Separate deployment** from main application

## 🚀 Next Steps

### **Immediate (Today)**
1. ✅ **Test chat widget** appearance
2. ✅ **Start external server**
3. ✅ **Test AI responses**

### **Short Term (This Week)**
1. 🔄 **Customize responses** for your specific use cases
2. 🔄 **Add more context** about your software
3. 🔄 **Test with real questions**

### **Long Term (Next Month)**
1. 📈 **Integrate with OpenAI API** for real AI responses
2. 📈 **Add web search capability** for current information
3. 📈 **Implement response caching** for performance
4. 📈 **Add analytics** for usage patterns

## 📞 Support

### **Issues & Questions**
- **Check Node-RED logs** for frontend errors
- **Check external server logs** for backend errors
- **Verify network connectivity** between app and server

### **Customization Help**
- **Modify CSS** for styling changes
- **Edit JavaScript** for widget behavior
- **Update server logic** for response customization

---

**🎉 Congratulations!** You now have a floating AI chat widget in your Neuron Node-RED application that connects to an external server. The widget provides immediate access to AI help about your software, while keeping the AI processing separate from your main application.
