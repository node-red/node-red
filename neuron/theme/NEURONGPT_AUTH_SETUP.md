# NeuronGPT Authentication Setup Guide

This guide explains how to set up and use the integrated authentication system for NeuronGPT.

## 🔧 Configuration

### 1. Update Server URL
Edit `neuron/theme/neuron-chpt-config.js` and update the `serverUrl` to point to your Digital Ocean hosted server:

```javascript
serverUrl: 'https://your-actual-app.ondigitalocean.app',
```

### 2. Keycloak Configuration
Ensure your external server has the correct Keycloak configuration in the `.env` file:

```env
KEYCLOAK_AUTH_SERVER_URL=https://your-keycloak-server/auth
KEYCLOAK_REALM=neuron
KEYCLOAK_CLIENT_ID=neuron-ui
KEYCLOAK_CLIENT_SECRET=your-client-secret
```

## 🚀 How It Works

### Authentication Flow
1. **User clicks "Login with Neuron"** in the chat widget
2. **Popup window opens** with Keycloak authentication
3. **User authenticates** through Keycloak
4. **Token is exchanged** and stored in localStorage
5. **Chat interface appears** with full functionality
6. **All API calls** include the authentication token

### Security Features
- **JWT Token Management**: Automatic token storage and refresh
- **Secure API Calls**: All requests include Bearer tokens
- **Token Expiry**: Automatic logout when tokens expire
- **User Isolation**: Each user has separate chat history and flow context

## 📱 User Experience

### Login Screen
- Appears automatically when widget loads without authentication
- Clean, professional design matching Neuron theme
- Clear instructions for users

### Chat Interface
- Full AI chat functionality after authentication
- Flow context synchronization
- Persistent chat history
- Logout button in header

### Dedicated Chat Window
- Full-screen chat experience
- Requires authentication from main widget
- Shares authentication state via localStorage

## 🔄 API Integration

### Authenticated Endpoints
All protected endpoints now require authentication:

- `POST /api/chat` - Send chat messages
- `POST /api/flow-sync` - Synchronize flow context
- `GET /api/chat-history` - Get chat history
- `GET /api/flow-status` - Get flow status

### Request Headers
```javascript
headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authState.accessToken}`
}
```

## 🛠️ Troubleshooting

### Common Issues

1. **"Authentication required" error**
   - User needs to log in through the main widget
   - Check if token has expired

2. **"Server error: 401"**
   - Token is invalid or expired
   - User will be redirected to login

3. **Popup authentication fails**
   - Check Keycloak server configuration
   - Verify redirect URIs are correct

### Debug Mode
Enable debug mode in the config file:

```javascript
debug: true
```

This will show detailed console logs for authentication flow.

## 🔐 Security Considerations

### Token Storage
- Tokens are stored in localStorage (browser storage)
- Tokens have a 1-hour expiry
- Automatic cleanup on expiry

### CORS Configuration
Ensure your external server allows requests from your Neuron installation domain.

### Keycloak Security
- Use HTTPS for all authentication endpoints
- Configure proper client scopes and roles
- Regular token rotation

## 📋 Files Modified

### New Files Created
- `neuron/theme/neuron-chpt-config.js` - Configuration management
- `neuron/theme/auth-callback.html` - Authentication callback page
- `neuron/theme/NEURONGPT_AUTH_SETUP.md` - This setup guide

### Files Updated
- `neuron/theme/neuron-chat-widget.js` - Main chat widget with authentication
- `neuron/theme/dedicated-chat-window.html` - Dedicated chat window
- `external/keycloakAuth.js` - Server-side authentication handling

## 🎯 Next Steps

1. **Update the server URL** in the config file
2. **Test authentication** with your Keycloak server
3. **Verify API calls** include authentication headers
4. **Customize the UI** if needed
5. **Deploy to production** with proper SSL certificates

## 🆘 Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify Keycloak server configuration
3. Ensure all URLs are correctly configured
4. Check network requests in browser dev tools

---

**Built with ❤️ by the Neuron Team**
