/**
 * NeuronGPT Configuration File
 * 
 * Update these settings to match your external server configuration
 */

window.NEURONGPT_CONFIG = {
    // External server URL - Update this with your actual Digital Ocean app URL
    serverUrl: 'https://neuron-gpt-cp9am.ondigitalocean.app',
    
    // API endpoints
    apiEndpoint: '/api/chat',
    healthEndpoint: '/health',
    authEndpoint: '/api/forward/auth',
    callbackEndpoint: '/api/auth/callback',
    
    // Authentication settings
    authTimeout: 60 * 60 * 1000, // 1 hour in milliseconds
    
    // UI settings
    widgetWidth: '380px',
    widgetHeight: 'calc(100vh - 48px)',
    
    // Flow synchronization settings
    enableFlowSync: true,
    flowSyncInterval: 10000, // 10 seconds
    
    // Chat settings
    maxChatHistory: 50,
    typingIndicatorDelay: 1000, // 1 second
    
    // Debug mode
    debug: false
};

// Helper function to get config values
window.getNeuronGPTConfig = function(key) {
    return window.NEURONGPT_CONFIG[key];
};

// Helper function to update config values
window.updateNeuronGPTConfig = function(key, value) {
    window.NEURONGPT_CONFIG[key] = value;
    console.log(`🔧 [CONFIG] Updated ${key} to:`, value);
};

// Log configuration on load
console.log('🔧 [CONFIG] NeuronGPT configuration loaded:', window.NEURONGPT_CONFIG);
