/**
 * NeuronGPT Chat Widget - Modular Version
 * Main entry point that imports all services and initializes the widget
 */

// Import all services
import { ConfigService, configService } from './services/ConfigService.js';
import { LogService, logService } from './services/LogService.js';
import { EventService, eventService } from './services/EventService.js';
import { AuthService, authService } from './services/AuthService.js';
import { ChatHistoryService, chatHistoryService } from './services/ChatHistoryService.js';
import { FlowSyncService, flowSyncService } from './services/FlowSyncService.js';

// Import the widget controller
import { WidgetController } from './components/WidgetController.js';

// Create the main widget instance
const widgetController = new WidgetController();

// Initialize services
configService.loadConfiguration();
logService.setLevel('info');

// Set up global API
window.NeuronGPTWidget = {
    // Services
    ConfigService: configService,
    LogService: logService,
    EventService: eventService,
    AuthService: authService,
    ChatHistoryService: chatHistoryService,
    FlowSyncService: flowSyncService,
    
    // Controller
    WidgetController: widgetController,
    
    // Test functions
    testFlowExport() {
        console.log('🧪 [TEST] Testing flow export...');
        if (this.FlowSyncService) {
            this.FlowSyncService.manualSync();
        }
    },
    
    testFlowSync() {
        console.log('🧪 [TEST] Testing flow sync...');
        if (this.FlowSyncService) {
            console.log('Flow sync status:', this.FlowSyncService.getFlowExportStatus());
        }
    },
    
    testChatHistory() {
        console.log('🧪 [TEST] Testing chat history...');
        if (this.ChatHistoryService) {
            console.log('Chat history stats:', this.ChatHistoryService.getStorageStats());
        }
    },
    
    testAuth() {
        console.log('🧪 [TEST] Testing authentication...');
        if (this.AuthService) {
            console.log('Auth state:', this.AuthService.getAuthState());
        }
    },
    
    testConfig() {
        console.log('🧪 [TEST] Testing configuration...');
        if (this.ConfigService) {
            console.log('Config:', this.ConfigService.getAll());
        }
    }
};

// Initialize the widget when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🧠 [NEURONGPT] DOM ready, initializing modular widget...');
        widgetController.initialize();
    });
} else {
    console.log('🧠 [NEURONGPT] DOM already ready, initializing modular widget...');
    widgetController.initialize();
}

// Export for module usage
export {
    ConfigService,
    LogService,
    EventService,
    AuthService,
    ChatHistoryService,
    FlowSyncService,
    WidgetController,
    widgetController,
    window.NeuronGPTWidget
};

/**
 * Authentication Service for NeuronGPT Widget
 * Manages user authentication state and token handling
 */

class AuthService {
    constructor() {
        this.state = {
            isAuthenticated: false,
            accessToken: null,
            user: null,
            tokenExpiry: null
        };
        
        this.storageKeys = {
            token: 'neuron-auth-token',
            user: 'neuron-user-info',
            expiry: 'neuron-token-expiry'
        };
        
        // Load saved state on initialization
        this.loadAuthState();
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} Authentication status
     */
    isUserAuthenticated() {
        if (!this.state.accessToken) return false;
        
        if (this.state.tokenExpiry && Date.now() > this.state.tokenExpiry) {
            // Token expired, clear auth state
            this.clearAuthState();
            return false;
        }
        
        return true;
    }

    /**
     * Get current authentication state
     * @returns {Object} Current auth state
     */
    getAuthState() {
        return { ...this.state };
    }

    /**
     * Get current user information
     * @returns {Object|null} User object or null
     */
    getUser() {
        return this.state.user;
    }

    /**
     * Get current access token
     * @returns {string|null} Access token or null
     */
    getToken() {
        return this.state.accessToken;
    }

    /**
     * Check if token is expired
     * @returns {boolean} Whether token is expired
     */
    isTokenExpired() {
        if (!this.state.tokenExpiry) return true;
        return Date.now() > this.state.tokenExpiry;
    }

    /**
     * Get token expiry time
     * @returns {Date|null} Token expiry date or null
     */
    getTokenExpiry() {
        return this.state.tokenExpiry ? new Date(this.state.tokenExpiry) : null;
    }

    /**
     * Save authentication state
     * @param {string} token - Access token
     * @param {Object} user - User information
     * @param {number} expiryHours - Token expiry in hours (default: 1)
     */
    saveAuthState(token, user, expiryHours = 1) {
        this.state.accessToken = token;
        this.state.user = user;
        this.state.isAuthenticated = true;
        this.state.tokenExpiry = Date.now() + (expiryHours * 60 * 60 * 1000);
        
        // Save to localStorage
        try {
            localStorage.setItem(this.storageKeys.token, token);
            localStorage.setItem(this.storageKeys.user, JSON.stringify(user));
            localStorage.setItem(this.storageKeys.expiry, this.state.tokenExpiry.toString());
        } catch (error) {
            console.error('❌ [AUTH] Failed to save to localStorage:', error);
        }
    }

    /**
     * Load authentication state from localStorage
     * @returns {boolean} Whether state was loaded successfully
     */
    loadAuthState() {
        try {
            const token = localStorage.getItem(this.storageKeys.token);
            const userInfo = localStorage.getItem(this.storageKeys.user);
            const expiry = localStorage.getItem(this.storageKeys.expiry);
            
            if (token && userInfo && expiry) {
                const expiryTime = parseInt(expiry);
                if (Date.now() < expiryTime) {
                    this.state.accessToken = token;
                    this.state.user = JSON.parse(userInfo);
                    this.state.isAuthenticated = true;
                    this.state.tokenExpiry = expiryTime;
                    return true;
                } else {
                    // Token expired, clean up
                    this.clearAuthState();
                }
            }
        } catch (error) {
            console.error('❌ [AUTH] Failed to load from localStorage:', error);
            this.clearAuthState();
        }
        
        return false;
    }

    /**
     * Clear authentication state
     */
    clearAuthState() {
        this.state = {
            isAuthenticated: false,
            accessToken: null,
            user: null,
            tokenExpiry: null
        };
        
        // Clear from localStorage
        try {
            localStorage.removeItem(this.storageKeys.token);
            localStorage.removeItem(this.storageKeys.user);
            localStorage.removeItem(this.storageKeys.expiry);
        } catch (error) {
            console.error('❌ [AUTH] Failed to clear localStorage:', error);
        }
    }

    /**
     * Refresh authentication state
     * @returns {boolean} Whether refresh was successful
     */
    refreshAuthState() {
        return this.loadAuthState();
    }

    /**
     * Update user information
     * @param {Object} user - Updated user information
     */
    updateUser(user) {
        if (this.state.user) {
            this.state.user = { ...this.state.user, ...user };
            
            // Update localStorage
            try {
                localStorage.setItem(this.storageKeys.user, JSON.stringify(this.state.user));
            } catch (error) {
                console.error('❌ [AUTH] Failed to update user in localStorage:', error);
            }
        }
    }

    /**
     * Extend token expiry
     * @param {number} additionalHours - Additional hours to add
     */
    extendToken(additionalHours = 1) {
        if (this.state.tokenExpiry) {
            this.state.tokenExpiry += (additionalHours * 60 * 60 * 1000);
            
            // Update localStorage
            try {
                localStorage.setItem(this.storageKeys.expiry, this.state.tokenExpiry.toString());
            } catch (error) {
                console.error('❌ [AUTH] Failed to update expiry in localStorage:', error);
            }
        }
    }

    /**
     * Get authentication headers for API requests
     * @returns {Object} Headers object
     */
    getAuthHeaders() {
        if (!this.isUserAuthenticated()) {
            return {};
        }
        
        return {
            'Authorization': `Bearer ${this.state.accessToken}`
        };
    }

    /**
     * Validate token format
     * @param {string} token - Token to validate
     * @returns {boolean} Whether token format is valid
     */
    validateTokenFormat(token) {
        // Basic JWT format validation
        if (!token || typeof token !== 'string') return false;
        
        const parts = token.split('.');
        return parts.length === 3;
    }
}

// Create singleton instance
const authService = new AuthService();

// Export both the class and the instance
export { AuthService, authService as default };

/**
 * Chat History Service for NeuronGPT Widget
 * Manages chat message persistence and retrieval
 */

class ChatHistoryService {
    constructor() {
        this.storageKey = 'neuron-chat-widget-data';
        this.maxMessages = 100;
        this.maxStorageSize = 5 * 1024 * 1024; // 5MB limit
    }

    /**
     * Save a message to chat history
     * @param {string} message - Message text
     * @param {string} role - Message role ('user' or 'assistant')
     * @param {Object} metadata - Additional message metadata
     */
    saveMessage(message, role, metadata = {}) {
        try {
            const chatData = this.loadChatData();
            
            const newMessage = {
                id: this.generateMessageId(),
                text: message,
                sender: role,
                timestamp: new Date().toISOString(),
                ...metadata
            };
            
            chatData.messages.push(newMessage);
            
            // Keep only the last maxMessages
            if (chatData.messages.length > this.maxMessages) {
                chatData.messages = chatData.messages.slice(-this.maxMessages);
            }
            
            // Check storage size
            if (this.getStorageSize() > this.maxStorageSize) {
                this.cleanupOldMessages();
            }
            
            this.saveChatData(chatData);
            
            // Emit message saved event if EventService is available
            if (window.NeuronGPTWidget && window.NeuronGPTWidget.EventService) {
                window.NeuronGPTWidget.EventService.emit('chatHistory:messageSaved', newMessage);
            }
            
        } catch (error) {
            console.error('❌ [CHAT HISTORY] Error saving message:', error);
        }
    }

    /**
     * Load chat data from storage
     * @returns {Object} Chat data structure
     */
    loadChatData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const parsed = JSON.parse(data);
                
                // Validate and migrate data if needed
                if (this.validateChatData(parsed)) {
                    return parsed;
                }
            }
        } catch (error) {
            console.error('❌ [CHAT HISTORY] Error loading chat data:', error);
        }
        
        // Return default structure
        return this.getDefaultChatData();
    }

    /**
     * Save chat data to storage
     * @param {Object} chatData - Chat data to save
     */
    saveChatData(chatData) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(chatData));
        } catch (error) {
            console.error('❌ [CHAT HISTORY] Error saving chat data:', error);
            
            // Try to save with reduced data if storage is full
            if (error.name === 'QuotaExceededError') {
                this.handleStorageQuotaExceeded();
            }
        }
    }

    /**
     * Get messages with optional filtering
     * @param {Object} options - Filter options
     * @param {number} options.limit - Maximum number of messages
     * @param {string} options.role - Filter by role
     * @param {Date} options.since - Get messages since this date
     * @returns {Array} Filtered messages
     */
    getMessages(options = {}) {
        const chatData = this.loadChatData();
        let messages = [...chatData.messages];
        
        // Filter by role
        if (options.role) {
            messages = messages.filter(msg => msg.sender === options.role);
        }
        
        // Filter by date
        if (options.since) {
            const sinceTime = new Date(options.since).getTime();
            messages = messages.filter(msg => new Date(msg.timestamp).getTime() >= sinceTime);
        }
        
        // Apply limit
        if (options.limit) {
            messages = messages.slice(-options.limit);
        }
        
        return messages;
    }

    /**
     * Get message count
     * @returns {number} Total message count
     */
    getMessageCount() {
        const chatData = this.loadChatData();
        return chatData.messages.length;
    }

    /**
     * Clear chat history
     */
    clearChatHistory() {
        try {
            localStorage.removeItem(this.storageKey);
            
            // Emit clear event if EventService is available
            if (window.NeuronGPTWidget && window.NeuronGPTWidget.EventService) {
                window.NeuronGPTWidget.EventService.emit('chatHistory:cleared');
            }
            
        } catch (error) {
            console.error('❌ [CHAT HISTORY] Error clearing chat history:', error);
        }
    }

    /**
     * Delete specific message
     * @param {string} messageId - ID of message to delete
     */
    deleteMessage(messageId) {
        try {
            const chatData = this.loadChatData();
            chatData.messages = chatData.messages.filter(msg => msg.id !== messageId);
            this.saveChatData(chatData);
        } catch (error) {
            console.error('❌ [CHAT HISTORY] Error deleting message:', error);
        }
    }

    /**
     * Search messages by text
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Array} Matching messages
     */
    searchMessages(query, options = {}) {
        const chatData = this.loadChatData();
        const searchQuery = query.toLowerCase();
        
        return chatData.messages.filter(msg => {
            const text = msg.text.toLowerCase();
            return text.includes(searchQuery);
        });
    }

    /**
     * Export chat history
     * @param {string} format - Export format ('json', 'txt', 'csv')
     * @returns {string} Exported data
     */
    exportChatHistory(format = 'json') {
        const chatData = this.loadChatData();
        
        switch (format) {
            case 'json':
                return JSON.stringify(chatData, null, 2);
            case 'txt':
                return this.exportAsText(chatData);
            case 'csv':
                return this.exportAsCSV(chatData);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Import chat history
     * @param {string} data - Data to import
     * @param {string} format - Import format
     */
    importChatHistory(data, format = 'json') {
        try {
            let chatData;
            
            switch (format) {
                case 'json':
                    chatData = JSON.parse(data);
                    break;
                default:
                    throw new Error(`Unsupported import format: ${format}`);
            }
            
            if (this.validateChatData(chatData)) {
                this.saveChatData(chatData);
            }
        } catch (error) {
            console.error('❌ [CHAT HISTORY] Error importing chat history:', error);
            throw error;
        }
    }

    /**
     * Get storage statistics
     * @returns {Object} Storage statistics
     */
    getStorageStats() {
        const chatData = this.loadChatData();
        const storageSize = this.getStorageSize();
        
        return {
            messageCount: chatData.messages.length,
            storageSize: storageSize,
            storageSizeFormatted: this.formatBytes(storageSize),
            maxMessages: this.maxMessages,
            maxStorageSize: this.maxStorageSize
        };
    }

    // Private helper methods

    /**
     * Generate unique message ID
     * @returns {string} Unique message ID
     */
    generateMessageId() {
        return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get default chat data structure
     * @returns {Object} Default chat data
     */
    getDefaultChatData() {
        return {
            messages: [],
            settings: {
                maxMessages: this.maxMessages,
                maxStorageSize: this.maxStorageSize
            },
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0'
            }
        };
    }

    /**
     * Validate chat data structure
     * @param {Object} data - Data to validate
     * @returns {boolean} Whether data is valid
     */
    validateChatData(data) {
        return data && 
               Array.isArray(data.messages) && 
               typeof data.settings === 'object';
    }

    /**
     * Get current storage size
     * @returns {number} Storage size in bytes
     */
    getStorageSize() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? new Blob([data]).size : 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Clean up old messages to reduce storage size
     */
    cleanupOldMessages() {
        const chatData = this.loadChatData();
        
        // Remove oldest messages until we're under the limit
        while (this.getStorageSize() > this.maxStorageSize && chatData.messages.length > 10) {
            chatData.messages.shift();
        }
        
        this.saveChatData(chatData);
    }

    /**
     * Handle storage quota exceeded error
     */
    handleStorageQuotaExceeded() {
        console.warn('⚠️ [CHAT HISTORY] Storage quota exceeded, cleaning up old messages');
        this.cleanupOldMessages();
    }

    /**
     * Export chat as text
     * @param {Object} chatData - Chat data to export
     * @returns {string} Text representation
     */
    exportAsText(chatData) {
        return chatData.messages.map(msg => {
            const date = new Date(msg.timestamp).toLocaleString();
            return `[${date}] ${msg.sender}: ${msg.text}`;
        }).join('\n');
    }

    /**
     * Export chat as CSV
     * @param {Object} chatData - Chat data to export
     * @returns {string} CSV representation
     */
    exportAsCSV(chatData) {
        const headers = ['Timestamp', 'Sender', 'Message'];
        const rows = chatData.messages.map(msg => [
            msg.timestamp,
            msg.sender,
            msg.text.replace(/"/g, '""') // Escape quotes
        ]);
        
        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }

    /**
     * Format bytes to human readable format
     * @param {number} bytes - Bytes to format
     * @returns {string} Formatted string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Create singleton instance
const chatHistoryService = new ChatHistoryService();

// Export both the class and the instance
export { ChatHistoryService, chatHistoryService as default };

/**
 * Configuration Service for NeuronGPT Widget
 * Manages all configuration settings and external config loading
 */

class ConfigService {
    constructor() {
        this.config = {
            serverUrl: 'https://neuron-gpt-cp9am.ondigitalocean.app',
            apiEndpoint: '/api/chat',
            healthEndpoint: '/health',
            authEndpoint: '/api/forward/auth'
        };
    }

    /**
     * Get a configuration value
     * @param {string} key - Configuration key
     * @returns {*} Configuration value
     */
    get(key) {
        return this.config[key];
    }

    /**
     * Set a configuration value
     * @param {string} key - Configuration key
     * @param {*} value - Configuration value
     */
    set(key, value) {
        this.config[key] = value;
    }

    /**
     * Load external configuration if available
     */
    loadConfiguration() {
        // Load external config if available
        if (window.NEURONGPT_CONFIG) {
            Object.assign(this.config, window.NEURONGPT_CONFIG);
            console.log('🧠 [CONFIG] External configuration loaded');
        } else {
            console.log('🧠 [CONFIG] Using default configuration');
        }
    }

    /**
     * Get all configuration
     * @returns {Object} Complete configuration object
     */
    getAll() {
        return { ...this.config };
    }

    /**
     * Reset configuration to defaults
     */
    reset() {
        this.config = {
            serverUrl: 'https://neuron-gpt-cp9am.ondigitalocean.app',
            apiEndpoint: '/api/chat',
            healthEndpoint: '/health',
            authEndpoint: '/api/forward/auth'
        };
    }
}

// Create singleton instance
const configService = new ConfigService();

// Export both the class and the instance
export { ConfigService, configService as default };

/**
 * Event Service for NeuronGPT Widget
 * Implements pub/sub pattern for inter-module communication
 */

class EventService {
    constructor() {
        this.events = {};
        this.middleware = [];
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler function
     * @param {Object} options - Subscription options
     * @returns {Function} Unsubscribe function
     */
    on(event, callback, options = {}) {
        if (!this.events[event]) {
            this.events[event] = [];
        }

        const subscription = {
            id: Date.now() + Math.random(),
            callback,
            options,
            timestamp: Date.now()
        };

        this.events[event].push(subscription);

        // Return unsubscribe function
        return () => this.off(event, subscription.id);
    }

    /**
     * Subscribe to an event once (auto-unsubscribe after first call)
     * @param {string} event - Event name
     * @param {Function} callback - Event handler function
     * @returns {Function} Unsubscribe function
     */
    once(event, callback) {
        const wrappedCallback = (...args) => {
            callback(...args);
            this.off(event, wrappedCallback);
        };
        return this.on(event, wrappedCallback);
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     * @returns {Promise} Promise that resolves when all handlers complete
     */
    async emit(event, data) {
        if (!this.events[event]) {
            return Promise.resolve();
        }

        // Apply middleware
        let processedData = data;
        for (const middleware of this.middleware) {
            try {
                processedData = await middleware(event, processedData);
            } catch (error) {
                console.error(`❌ [EVENT] Middleware error for ${event}:`, error);
            }
        }

        // Execute all handlers
        const promises = this.events[event].map(async (subscription) => {
            try {
                if (subscription.options.async) {
                    await subscription.callback(processedData);
                } else {
                    subscription.callback(processedData);
                }
            } catch (error) {
                console.error(`❌ [EVENT] Error in event handler for ${event}:`, error);
                
                // Emit error event
                this.emit('event:error', {
                    event,
                    error: error.message,
                    subscription: subscription.id,
                    timestamp: Date.now()
                });
            }
        });

        return Promise.all(promises);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function|string} callbackOrId - Callback function or subscription ID
     */
    off(event, callbackOrId) {
        if (!this.events[event]) return;

        if (typeof callbackOrId === 'function') {
            // Remove by callback function
            this.events[event] = this.events[event].filter(
                sub => sub.callback !== callbackOrId
            );
        } else {
            // Remove by subscription ID
            this.events[event] = this.events[event].filter(
                sub => sub.id !== callbackOrId
            );
        }

        // Clean up empty event arrays
        if (this.events[event].length === 0) {
            delete this.events[event];
        }
    }

    /**
     * Remove all listeners for an event
     * @param {string} event - Event name
     */
    removeAllListeners(event) {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
    }

    /**
     * Get all event names
     * @returns {string[]} Array of event names
     */
    getEventNames() {
        return Object.keys(this.events);
    }

    /**
     * Get listener count for an event
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    getListenerCount(event) {
        return this.events[event] ? this.events[event].length : 0;
    }

    /**
     * Add middleware function
     * @param {Function} middleware - Middleware function
     */
    use(middleware) {
        this.middleware.push(middleware);
    }

    /**
     * Remove middleware function
     * @param {Function} middleware - Middleware function to remove
     */
    removeMiddleware(middleware) {
        const index = this.middleware.indexOf(middleware);
        if (index > -1) {
            this.middleware.splice(index, 1);
        }
    }

    /**
     * Clear all middleware
     */
    clearMiddleware() {
        this.middleware = [];
    }
}

// Create singleton instance
const eventService = new EventService();

// Export both the class and the instance
export { EventService, eventService as default };

/**
 * Flow Synchronization Service for NeuronGPT Widget
 * Manages real-time synchronization of Node-RED flows with external server
 */

class FlowSyncService {
    constructor() {
        this.isInitialized = false;
        this.syncInProgress = false;
        this.lastFlowHash = null;
        this.syncInterval = null;
        this.changeDebounceTimer = null;
        this.lastSyncTime = null;
        
        // Flow export strategies
        this.exportStrategies = [
            'createCompleteNodeSet',
            'eachNode',
            'directFlows'
        ];
    }

    /**
     * Initialize the flow synchronization service
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('🔍 [FLOW SYNC] Already initialized');
            return;
        }
        
        try {
            console.log('🔍 [FLOW SYNC] Initializing flow synchronization service...');
            
            // Check if flows are available
            if (this.checkFlowsAvailable()) {
                this.setupFlowSync();
                this.isInitialized = true;
                console.log('🔍 [FLOW SYNC] Flow synchronization service initialized successfully');
                
                // Emit ready event if EventService is available
                if (window.NeuronGPTWidget && window.NeuronGPTWidget.EventService) {
                    window.NeuronGPTWidget.EventService.emit('flowSync:ready');
                }
            } else {
                console.warn('🔍 [FLOW SYNC] Flows not available yet, will initialize when ready');
                // Set up a watcher for when flows become available
                this.watchForFlowsAvailability();
            }
        } catch (error) {
            console.error('❌ [FLOW SYNC] Failed to initialize flow synchronization service:', error);
        }
    }

    /**
     * Check if Node-RED flows are available
     * @returns {boolean} Whether flows are available
     */
    checkFlowsAvailable() {
        try {
            if (typeof RED === 'undefined') return false;
            if (!RED.nodes) return false;
            
            // Check if we have the basic flow export methods
            const hasCreateCompleteNodeSet = typeof RED.nodes.createCompleteNodeSet === 'function';
            const hasEachNode = typeof RED.nodes.eachNode === 'function';
            const hasFlows = typeof RED.flows !== 'undefined';
            
            console.debug('🔍 [FLOW SYNC] Flow availability check:', {
                hasCreateCompleteNodeSet,
                hasEachNode,
                hasFlows
            });
            
            return hasCreateCompleteNodeSet || hasEachNode || hasFlows;
        } catch (error) {
            console.error('❌ [FLOW SYNC] Error checking flow availability:', error);
            return false;
        }
    }

    /**
     * Watch for flows to become available
     */
    watchForFlowsAvailability() {
        const checkInterval = setInterval(() => {
            if (this.checkFlowsAvailable()) {
                clearInterval(checkInterval);
                this.initialize();
            }
        }, 1000);
        
        // Stop watching after 30 seconds to avoid infinite checking
        setTimeout(() => {
            clearInterval(checkInterval);
            console.warn('🔍 [FLOW SYNC] Stopped watching for flows availability after timeout');
        }, 30000);
    }

    /**
     * Set up flow synchronization
     */
    setupFlowSync() {
        // Set up periodic flow sync
        this.syncInterval = setInterval(() => {
            this.performFlowSync('periodic');
        }, 30000); // Sync every 30 seconds
        
        // Set up flow change detection
        this.setupFlowChangeDetection();
        
        // Perform initial sync
        this.performFlowSync('initial');
    }

    /**
     * Set up flow change detection
     */
    setupFlowChangeDetection() {
        try {
            // Listen for Node-RED flow changes
            if (typeof RED !== 'undefined' && RED.events) {
                RED.events.on('nodes:add', () => this.handleFlowChange('node_added'));
                RED.events.on('nodes:remove', () => this.handleFlowChange('node_removed'));
                RED.events.on('nodes:change', () => this.handleFlowChange('node_changed'));
                RED.events.on('flows:change', () => this.handleFlowChange('flows_changed'));
                
                console.log('🔍 [FLOW SYNC] Flow change detection listeners set up');
            }
        } catch (error) {
            console.warn('⚠️ [FLOW SYNC] Could not set up flow change detection:', error.message);
        }
    }

    /**
     * Handle flow changes
     * @param {string} reason - Reason for the change
     */
    handleFlowChange(reason) {
        console.log(`🔍 [FLOW SYNC] Flow change detected: ${reason}`);
        
        // Debounce rapid changes
        clearTimeout(this.changeDebounceTimer);
        this.changeDebounceTimer = setTimeout(() => {
            this.performFlowSync(`change_${reason}`);
        }, 1000);
    }

    /**
     * Perform flow synchronization
     * @param {string} reason - Reason for the sync
     */
    async performFlowSync(reason) {
        if (this.syncInProgress) {
            console.debug('🔍 [FLOW SYNC] Sync already in progress, skipping...');
            return;
        }
        
        // Check authentication if EventService is available
        if (window.NeuronGPTWidget && window.NeuronGPTWidget.AuthService) {
            if (!window.NeuronGPTWidget.AuthService.isUserAuthenticated()) {
                console.debug('🔍 [FLOW SYNC] Authentication required for flow sync');
                return;
            }
        }
        
        try {
            this.syncInProgress = true;
            console.log(`🔍 [FLOW SYNC] Starting flow sync (reason: ${reason})...`);
            
            // Update flow export status if EventService is available
            if (window.NeuronGPTWidget && window.NeuronGPTWidget.EventService) {
                window.NeuronGPTWidget.EventService.emit('flowSync:status', {
                    message: 'Flow state syncing...',
                    status: 'syncing'
                });
            }
            
            // Get current flow context
            const flowContext = this.getCurrentFlowContext();
            if (!flowContext) {
                console.warn('🔍 [FLOW SYNC] No flow context available, skipping sync');
                if (window.NeuronGPTWidget && window.NeuronGPTWidget.EventService) {
                    window.NeuronGPTWidget.EventService.emit('flowSync:status', {
                        message: 'Flow state unknown',
                        status: 'unknown'
                    });
                }
                return;
            }
            
            // Calculate flow hash for change detection
            const flowHash = this.calculateFlowHash(flowContext);
            
            if (this.lastFlowHash === flowHash && reason !== 'initial') {
                console.debug('🔍 [FLOW SYNC] Flow hash unchanged, no material change detected');
                if (window.NeuronGPTWidget && window.NeuronGPTWidget.EventService) {
                    window.NeuronGPTWidget.EventService.emit('flowSync:status', {
                        message: 'Flow state unchanged',
                        status: 'success'
                    });
                }
                return;
            }
            
            // Send flow context to server
            await this.sendFlowContextToServer(flowContext, reason);
            
            // Update last flow hash
            this.lastFlowHash = flowHash;
            this.lastSyncTime = Date.now();
            
            // Update status
            if (window.NeuronGPTWidget && window.NeuronGPTWidget.EventService) {
                window.NeuronGPTWidget.EventService.emit('flowSync:status', {
                    message: 'Flow state synced',
                    status: 'success'
                });
            }
            
            console.log(`🔍 [FLOW SYNC] Flow sync completed successfully (${reason})`);
            
            // Emit sync success event
            if (window.NeuronGPTWidget && window.NeuronGPTWidget.EventService) {
                window.NeuronGPTWidget.EventService.emit('flowSync:success', { reason, flowContext });
            }
            
        } catch (error) {
            console.error('❌ [FLOW SYNC] Flow sync failed:', error);
            
            if (window.NeuronGPTWidget && window.NeuronGPTWidget.EventService) {
                window.NeuronGPTWidget.EventService.emit('flowSync:status', {
                    message: 'Sync failed',
                    status: 'error'
                });
                
                // Emit sync error event
                window.NeuronGPTWidget.EventService.emit('flowSync:error', { reason, error: error.message });
            }
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Get current flow context from Node-RED
     * @returns {Object|null} Flow context or null
     */
    getCurrentFlowContext() {
        try {
            // Check if Node-RED is available
            if (typeof RED === 'undefined') {
                return null;
            }
            
            // Try each export strategy
            for (const strategy of this.exportStrategies) {
                try {
                    const result = this.executeExportStrategy(strategy);
                    if (result) {
                        return {
                            ...result,
                            strategy,
                            timestamp: new Date().toISOString()
                        };
                    }
                } catch (error) {
                    console.debug(`🔍 [FLOW SYNC] Strategy ${strategy} failed:`, error.message);
                }
            }
            
            return null;
        } catch (error) {
            console.error('❌ [FLOW SYNC] Error getting flow context:', error);
            return null;
        }
    }

    /**
     * Execute a specific export strategy
     * @param {string} strategy - Strategy name
     * @returns {Object|null} Flow data or null
     */
    executeExportStrategy(strategy) {
        switch (strategy) {
            case 'createCompleteNodeSet':
                if (RED.nodes && typeof RED.nodes.createCompleteNodeSet === 'function') {
                    const completeFlow = RED.nodes.createCompleteNodeSet({ credentials: false, dimensions: false });
                    return {
                        flowCount: completeFlow.length,
                        flowData: completeFlow
                    };
                }
                break;
                
            case 'eachNode':
                if (RED.nodes && typeof RED.nodes.eachNode === 'function') {
                    const flowData = [];
                    RED.nodes.eachNode((node) => {
                        if (node.type !== 'tab') {
                            flowData.push({
                                id: node.id,
                                type: node.type,
                                name: node.name,
                                position: node.position
                            });
                        }
                    });
                    return {
                        flowCount: flowData.length,
                        flowData: flowData
                    };
                }
                break;
                
            case 'directFlows':
                if (RED.flows && Array.isArray(RED.flows.flows)) {
                    const flowData = RED.flows.flows;
                    return {
                        flowCount: flowData.length,
                        flowData: flowData
                    };
                }
                break;
        }
        
        return null;
    }

    /**
     * Calculate flow hash for change detection
     * @param {Object} flowContext - Flow context object
     * @returns {string} Flow hash
     */
    calculateFlowHash(flowContext) {
        try {
            const flowString = JSON.stringify(flowContext.flowData);
            let hash = 0;
            for (let i = 0; i < flowString.length; i++) {
                const char = flowString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return hash.toString();
        } catch (error) {
            console.error('❌ [FLOW SYNC] Error calculating flow hash:', error);
            return Date.now().toString(); // Fallback to timestamp
        }
    }

    /**
     * Send flow context to server
     * @param {Object} flowContext - Flow context to send
     * @param {string} reason - Reason for the sync
     * @returns {Object} Server response
     */
    async sendFlowContextToServer(flowContext, reason) {
        try {
            console.debug('🔍 [FLOW SYNC] Attempting to send flow context to server...');
            
            // Get configuration and auth if available
            let serverUrl = 'https://neuron-gpt-cp9am.ondigitalocean.app';
            let authToken = null;
            
            if (window.NeuronGPTWidget && window.NeuronGPTWidget.ConfigService) {
                serverUrl = window.NeuronGPTWidget.ConfigService.get('serverUrl');
            }
            
            if (window.NeuronGPTWidget && window.NeuronGPTWidget.AuthService) {
                authToken = window.NeuronGPTWidget.AuthService.getToken();
            }
            
            const requestBody = {
                flowContext: flowContext,
                reason: reason,
                timestamp: new Date().toISOString()
            };
            
            // Add user info if available
            if (window.NeuronGPTWidget && window.NeuronGPTWidget.AuthService) {
                requestBody.user = window.NeuronGPTWidget.AuthService.getUser();
            }
            
            console.debug('🔍 [FLOW SYNC] Request body prepared:', {
                flowCount: flowContext.flowCount,
                strategy: flowContext.strategy,
                reason: reason
            });
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }
            
            const response = await fetch(`${serverUrl}/api/flow-sync`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const responseData = await response.json();
            console.debug('🔍 [FLOW SYNC] Server response:', responseData);
            
            return responseData;
            
        } catch (error) {
            console.error('❌ [FLOW SYNC] Error sending flow context:', error);
            throw error;
        }
    }

    /**
     * Get current flow JSON
     * @returns {Array|null} Flow JSON or null
     */
    getCurrentFlowJson() {
        try {
            if (typeof RED === 'undefined') {
                return null;
            }
            
            if (RED.nodes && typeof RED.nodes.createCompleteNodeSet === 'function') {
                return RED.nodes.createCompleteNodeSet({ credentials: false, dimensions: false });
            }
            
            return null;
        } catch (error) {
            console.error('❌ [FLOW SYNC] Error getting flow JSON:', error);
            return null;
        }
    }

    /**
     * Manual sync trigger
     */
    async manualSync() {
        await this.performFlowSync('manual');
    }

    /**
     * Get flow export status
     * @returns {Object} Status information
     */
    getFlowExportStatus() {
        return {
            isInitialized: this.isInitialized,
            syncInProgress: this.syncInProgress,
            lastFlowHash: this.lastFlowHash,
            lastSyncTime: this.lastSyncTime
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        
        if (this.changeDebounceTimer) {
            clearTimeout(this.changeDebounceTimer);
            this.changeDebounceTimer = null;
        }
        
        this.isInitialized = false;
    }
}

// Create singleton instance
const flowSyncService = new FlowSyncService();

// Export both the class and the instance
export { FlowSyncService, flowSyncService as default };

/**
 * Logging Service for NeuronGPT Widget
 * Provides structured logging with configurable levels
 */

class LogService {
    constructor() {
        this.level = 'info'; // 'debug', 'info', 'warn', 'error'
        this.levels = {
            'debug': 0,
            'info': 1,
            'warn': 2,
            'error': 3
        };
    }

    /**
     * Set the logging level
     * @param {string} level - Log level ('debug', 'info', 'warn', 'error')
     */
    setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.level = level;
            console.log(`🧠 [LOG] Log level set to: ${level}`);
        } else {
            console.warn(`⚠️ [LOG] Invalid log level: ${level}`);
        }
    }

    /**
     * Get current log level
     * @returns {string} Current log level
     */
    getLevel() {
        return this.level;
    }

    /**
     * Check if a level should be logged
     * @param {string} level - Level to check
     * @returns {boolean} Whether to log this level
     */
    shouldLog(level) {
        return this.levels[level] >= this.levels[this.level];
    }

    /**
     * Log debug message
     * @param {string} message - Message to log
     * @param {...*} args - Additional arguments
     */
    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            console.log(`🔍 [DEBUG] ${message}`, ...args);
        }
    }

    /**
     * Log info message
     * @param {string} message - Message to log
     * @param {...*} args - Additional arguments
     */
    info(message, ...args) {
        if (this.shouldLog('info')) {
            console.log(`🧠 [INFO] ${message}`, ...args);
        }
    }

    /**
     * Log warning message
     * @param {string} message - Message to log
     * @param {...*} args - Additional arguments
     */
    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            console.warn(`⚠️ [WARN] ${message}`, ...args);
        }
    }

    /**
     * Log error message
     * @param {string} message - Message to log
     * @param {...*} args - Additional arguments
     */
    error(message, ...args) {
        if (this.shouldLog('error')) {
            console.error(`❌ [ERROR] ${message}`, ...args);
        }
    }

    /**
     * Log with custom prefix
     * @param {string} prefix - Custom prefix
     * @param {string} message - Message to log
     * @param {...*} args - Additional arguments
     */
    custom(prefix, message, ...args) {
        if (this.shouldLog('info')) {
            console.log(`${prefix} ${message}`, ...args);
        }
    }

    /**
     * Group related log messages
     * @param {string} label - Group label
     * @param {Function} callback - Function containing grouped logs
     */
    group(label, callback) {
        if (this.shouldLog('info')) {
            console.group(label);
            try {
                callback();
            } finally {
                console.groupEnd();
            }
        }
    }
}

// Create singleton instance
const logService = new LogService();

// Export both the class and the instance
export { LogService, logService as default };

/**
 * Widget Controller for NeuronGPT Widget
 * Main controller class that manages the widget lifecycle and UI
 */

class WidgetController {
    constructor() {
        this.widget = null;
        this.isInitialized = false;
        this.flowStatusElement = null;
        
        // Bind methods to preserve context
        this.initialize = this.initialize.bind(this);
        this.waitForNodeRED = this.waitForNodeRED.bind(this);
        this.createWidget = this.createWidget.bind(this);
        this.applyWidgetStyles = this.applyWidgetStyles.bind(this);
        this.setupEventListeners = this.setupEventListeners.bind(this);
        this.showLoginScreen = this.showLoginScreen.bind(this);
        this.setupLoginEventListeners = this.setupLoginEventListeners.bind(this);
        this.handleDirectLogin = this.handleDirectLogin.bind(this);
        this.showChatInterface = this.showChatInterface.bind(this);
        this.getChatInterfaceHTML = this.getChatInterfaceHTML.bind(this);
        this.initializeChatFunctionality = this.initializeChatFunctionality.bind(this);
        this.initializeFlowSync = this.initializeFlowSync.bind(this);
        this.setupFlowSyncEventListeners = this.setupFlowSyncEventListeners.bind(this);
        this.addFlowExportStatusIndicator = this.addFlowExportStatusIndicator.bind(this);
        this.updateFlowExportStatus = this.updateFlowExportStatus.bind(this);
        this.loadChatHistory = this.loadChatHistory.bind(this);
        this.addMessage = this.addMessage.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
        this.sendToExternalServer = this.sendToExternalServer.bind(this);
        this.addTypingIndicator = this.addTypingIndicator.bind(this);
        this.getCurrentFlowContext = this.getCurrentFlowContext.bind(this);
        this.getCurrentFlowJson = this.getCurrentFlowJson.bind(this);
        this.openDedicatedChatWindow = this.openDedicatedChatWindow.bind(this);
    }

    /**
     * Initialize the widget
     */
    async initialize() {
        try {
            console.log('🧠 [WIDGET] Starting enhanced widget initialization...');
            
            // Load configuration first if available
            if (window.NeuronGPTWidget && window.NeuronGPTWidget.ConfigService) {
                window.NeuronGPTWidget.ConfigService.loadConfiguration();
            }
            
            // Wait for Node-RED to be ready
            await this.waitForNodeRED();
            
            // Create the widget
            this.createWidget();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize flow synchronization
            await this.initializeFlowSync();
            
            this.isInitialized = true;
            console.log('🧠 [WIDGET] Enhanced widget initialization completed successfully');
            
            // Emit ready event if EventService is available
            if (window.NeuronGPTWidget && window.NeuronGPTWidget.EventService) {
                window.NeuronGPTWidget.EventService.emit('widget:ready');
            }
            
        } catch (error) {
            console.error('❌ [WIDGET] Enhanced widget initialization failed:', error);
        }
    }

    /**
     * Wait for Node-RED to be ready
     * @returns {Promise} Promise that resolves when Node-RED is ready
     */
    async waitForNodeRED() {
        return new Promise((resolve) => {
            const checkRED = () => {
                if (typeof RED !== 'undefined' && RED.nodes) {
                    resolve();
                } else {
                    setTimeout(checkRED, 200);
                }
            };
            checkRED();
        });
    }

    /**
     * Create the widget DOM element
     */
    createWidget() {
        // Check if widget already exists
        if (document.getElementById('neuron-chat-widget')) {
            console.log('🧠 [WIDGET] Widget already exists');
            this.widget = document.getElementById('neuron-chat-widget');
            return;
        }

        this.widget = document.createElement('div');
        this.widget.id = 'neuron-chat-widget';
        this.widget.innerHTML = `
            <div class="chat-header">
                <div class="chat-header-title">
                    <svg width="20" height="20" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px;">
                        <path d="M116.736 373.991C116.736 373.991 117.296 250.322 188.729 231.521C289.649 204.96 297.03 397.603 398.286 371.564C482.834 349.821 483.029 229 483.029 229" stroke="white" stroke-width="40.6992" stroke-linecap="square"/>
                    </svg>
                    <span>NeuronGPT</span>
                </div>
                <div class="chat-header-buttons">
                    <button class="chat-logout" title="Logout" style="display: none;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="chat-minimize" title="Minimize">−</button>
                    <button class="chat-expand" title="Open Full Chat">⤢</button>
                </div>
            </div>
            <div class="chat-body">
                <!-- Content will be populated by showLoginScreen() or showChatInterface() -->
            </div>
        `;
        
        // Apply styles
        this.applyWidgetStyles();
        
        // Add to page
        document.body.appendChild(this.widget);
        console.log('🧠 [WIDGET] Widget created successfully');
    }

    /**
     * Apply widget styles
     */
    applyWidgetStyles() {
        if (!this.widget) return;
        
        // Main widget styles
        this.widget.style.cssText = `
            position: fixed;
            top: 48px;
            right: 0;
            width: 380px;
            height: calc(100vh - 48px);
            background: #1D1D1D;
            border: 1px solid #333;
            border-radius: 0;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            transition: all 0.3s ease;
            overflow: hidden;
            resize: none;
        `;
        
        // Header styles
        const header = this.widget.querySelector('.chat-header');
        if (header) {
            header.style.cssText = `
                background: #1D1D1D;
                color: white;
                padding: 4px 12px;
                border-radius: 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-weight: 600;
                font-size: 14px;
                flex-shrink: 0;
                min-height: 32px;
                position: relative;
                border-bottom: 1px solid #333;
            `;
        }
        
        // Header title styles
        const headerTitle = this.widget.querySelector('.chat-header-title');
        if (headerTitle) {
            headerTitle.style.cssText = `
                display: flex;
                align-items: center;
                font-size: 14px;
            `;
        }
        
        // Button styles
        const buttons = this.widget.querySelectorAll('.chat-header-buttons button');
        buttons.forEach(btn => {
            btn.style.cssText = `
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.3s ease;
                margin-left: 8px;
            `;
        });
        
        // Chat body styles
        const chatBody = this.widget.querySelector('.chat-body');
        if (chatBody) {
            chatBody.style.cssText = `
                flex: 1;
                display: flex;
                flex-direction: column;
                background: #1D1D1D;
            `;
        }
    }

    /**
     * Set up event listeners for the widget
     */
    setupEventListeners() {
        if (!this.widget) return;
        
        // Minimize button
        const minimizeBtn = this.widget.querySelector('.chat-minimize');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                const body = this.widget.querySelector('.chat-body');
                const isMinimized = body.style.display === 'none';
                
                if (isMinimized) {
                    body.style.display = 'flex';
                    minimizeBtn.textContent = '−';
                    minimizeBtn.title = 'Minimize';
                } else {
                    body.style.display = 'none';
                    minimizeBtn.textContent = '+';
                    minimizeBtn.title = 'Expand';
                }
            });
        }
        
        // Logout button
        const logoutBtn = this.widget.querySelector('.chat-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (window.NeuronGPTWidget && window.NeuronGPTWidget.AuthService) {
                    window.NeuronGPTWidget.AuthService.clearAuthState();
                }
                this.showLoginScreen();
                logoutBtn.style.display = 'none';
            });
        }
        
        // Expand button (dedicated chat window)
        const expandBtn = this.widget.querySelector('.chat-expand');
        if (expandBtn) {
            expandBtn.addEventListener('click', () => {
                this.openDedicatedChatWindow();
            });
        }
    }

    /**
     * Show login screen
     */
    showLoginScreen() {
        if (!this.widget) return;
        
        const chatBody = this.widget.querySelector('.chat-body');
        if (chatBody) {
            chatBody.innerHTML = `
                <div class="login-container" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    padding: 20px;
                    text-align: center;
                ">
                    <div style="margin-bottom: 20px;">
                        <svg width="48" height="48" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
                            <path d="M116.736 373.991C116.736 373.991 117.296 250.322 188.729 231.521C289.649 204.96 297.03 397.603 398.286 371.564C482.834 349.821 483.029 229 483.029 229" stroke="white" stroke-width="40.6992" stroke-linecap="square"/>
                        </svg>
                    </div>
                    <h3 style="color: white; margin-bottom: 16px; font-size: 18px;">Welcome to NeuronGPT</h3>
                    <p style="color: #a0aec0; margin-bottom: 24px; font-size: 14px; line-height: 1.5;">
                        Please authenticate to access AI assistance for your Neuron flows
                    </p>
                    <div style="margin-bottom: 20px; width: 100%; max-width: 300px;">
                        <input type="text" id="username-input" placeholder="Username" style="
                            width: 100%;
                            padding: 12px 16px;
                            border: 1px solid #ddd;
                            border-radius: 6px;
                            font-size: 14px;
                            outline: none;
                            background: #2D2D2D;
                            color: white;
                            margin-bottom: 12px;
                            box-sizing: border-box;
                        ">
                        <input type="password" id="password-input" placeholder="Password" style="
                            width: 100%;
                            padding: 12px 16px;
                            border: 1px solid #ddd;
                            border-radius: 6px;
                            font-size: 14px;
                            outline: none;
                            background: #2D2D2D;
                            color: white;
                            margin-bottom: 20px;
                            box-sizing: border-box;
                        ">
                    </div>
                    <button id="login-button" style="
                        background: #3182ce;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 6px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: background 0.2s;
                        margin-bottom: 16px;
                    ">Login</button>
                    <div id="login-status" style="
                        font-size: 12px;
                        color: #a0aec0;
                        min-height: 20px;
                    "></div>
                </div>
            `;
            
            this.setupLoginEventListeners();
        }
    }

    /**
     * Set up login event listeners
     */
    setupLoginEventListeners() {
        // Login button
        const loginBtn = document.getElementById('login-button');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleDirectLogin());
        }
        
        // Enter key support
        const usernameInput = document.getElementById('username-input');
        const passwordInput = document.getElementById('password-input');
        
        if (usernameInput && passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleDirectLogin();
                }
            });
            
            usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    passwordInput.focus();
                }
            });
        }
    }

    /**
     * Handle direct login with username/password
     */
    async handleDirectLogin() {
        const usernameInput = document.getElementById('username-input');
        const passwordInput = document.getElementById('password-input');
        const loginBtn = document.getElementById('login-button');
        const statusDiv = document.getElementById('login-status');
        
        if (!usernameInput || !passwordInput || !loginBtn || !statusDiv) return;
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!username || !password) {
            statusDiv.textContent = 'Please enter both username and password';
            statusDiv.style.color = '#fc8181';
            return;
        }
        
        // Disable inputs and show loading
        usernameInput.disabled = true;
        passwordInput.disabled = true;
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        statusDiv.textContent = 'Authenticating...';
        statusDiv.style.color = '#68d391';
        
        try {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // For testing purposes, accept any login
            const mockUser = {
                id: 'test-user',
                username: username,
                email: username + '@example.com',
                name: username
            };
            
            const mockToken = 'mock-jwt-token-' + Date.now();
            
            // Save authentication state
            if (window.NeuronGPTWidget && window.NeuronGPTWidget.AuthService) {
                window.NeuronGPTWidget.AuthService.saveAuthState(mockToken, mockUser);
            }
            
            // Show success and transition to chat
            statusDiv.textContent = 'Login successful!';
            statusDiv.style.color = '#68d391';
            
            // Show logout button
            const logoutBtn = this.widget.querySelector('.chat-logout');
            if (logoutBtn) {
                logoutBtn.style.display = 'flex';
            }
            
            // Transition to chat interface after a short delay
            setTimeout(() => {
                this.showChatInterface();
            }, 1000);
            
        } catch (error) {
            console.error('❌ [LOGIN] Login failed:', error);
            statusDiv.textContent = 'Login failed: ' + error.message;
            statusDiv.style.color = '#fc8181';
            
            // Re-enable inputs
            usernameInput.disabled = false;
            passwordInput.disabled = false;
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    }

    /**
     * Show chat interface
     */
    showChatInterface() {
        if (!this.widget) return;
        
        const chatBody = this.widget.querySelector('.chat-body');
        if (chatBody) {
            chatBody.innerHTML = this.getChatInterfaceHTML();
            this.initializeChatFunctionality();
            this.addFlowExportStatusIndicator();
        }
    }

    /**
     * Get chat interface HTML
     * @returns {string} HTML string for chat interface
     */
    getChatInterfaceHTML() {
        return `
            <div class="chat-messages" style="
                flex: 1;
                padding: 16px;
                overflow-y: auto;
                background: #1D1D1D;
            ">
            </div>
            <div class="chat-input-area" style="
                padding: 16px;
                border-top: 1px solid #333;
                background: #1D1D1D;
                display: flex;
                gap: 12px;
                flex-shrink: 0;
            ">
                <input type="text" placeholder="Ask about Neuron software..." class="chat-input" style="
                    flex: 1;
                    padding: 12px 16px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 14px;
                    outline: none;
                    background: #1D1D1D;
                    color: white;
                ">
                <button class="chat-send" style="
                    padding: 12px 24px;
                    background: #3182ce;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.2s;
                ">Send</button>
            </div>
            <div class="chat-status" style="
                padding: 8px 16px;
                border-top: 1px solid #333;
                background: #1D1D1D;
                flex-shrink: 0;
            ">
                <small style="color: #a0aec0; font-size: 12px;">Connected to external server</small>
            </div>
        `;
    }

    /**
     * Initialize chat functionality
     */
    initializeChatFunctionality() {
        const input = this.widget.querySelector('.chat-input');
        const sendBtn = this.widget.querySelector('.chat-send');
        const messages = this.widget.querySelector('.chat-messages');
        
        if (!input || !sendBtn || !messages) return;
        
        // Event listeners
        sendBtn.addEventListener('click', () => this.sendMessage());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        // Load chat history
        this.loadChatHistory();
        
        // Add welcome message
        this.addMessage('Hello! I\'m NeuronGPT, your AI assistant for Neuron software. How can I help you today?', 'assistant');
    }

    /**
     * Initialize flow synchronization
     */
    async initializeFlowSync() {
        try {
            console.log('🧠 [WIDGET] Initializing flow synchronization...');
            
            // Initialize flow sync service if available
            if (window.NeuronGPTWidget && window.NeuronGPTWidget.FlowSyncService) {
                await window.NeuronGPTWidget.FlowSyncService.initialize();
            }
            
            // Set up flow sync event listeners
            this.setupFlowSyncEventListeners();
            
            console.log('🧠 [WIDGET] Flow synchronization initialized successfully');
            
        } catch (error) {
            console.error('❌ [WIDGET] Failed to initialize flow synchronization:', error);
        }
    }

    /**
     * Set up flow sync event listeners
     */
    setupFlowSyncEventListeners() {
        if (!window.NeuronGPTWidget || !window.NeuronGPTWidget.EventService) return;
        
        // Listen for flow sync events
        window.NeuronGPTWidget.EventService.on('flowSync:ready', () => {
            console.log('🧠 [WIDGET] Flow sync service is ready');
            this.addFlowExportStatusIndicator();
        });
        
        window.NeuronGPTWidget.EventService.on('flowSync:success', (data) => {
            console.log('🧠 [WIDGET] Flow sync successful:', data.reason);
            this.updateFlowExportStatus('Flow state synced', 'success');
        });
        
        window.NeuronGPTWidget.EventService.on('flowSync:error', (data) => {
            console.error('🧠 [WIDGET] Flow sync error:', data.error);
            this.updateFlowExportStatus('Sync failed', 'error');
        });
        
        window.NeuronGPTWidget.EventService.on('flowSync:status', (data) => {
            this.updateFlowExportStatus(data.message, data.status);
        });
    }

    /**
     * Add flow export status indicator
     */
    addFlowExportStatusIndicator() {
        // Add flow export status indicator to the chat status area
        const chatStatus = this.widget.querySelector('.chat-status');
        if (chatStatus) {
            const flowStatus = document.createElement('div');
            flowStatus.id = 'flow-export-status';
            flowStatus.style.cssText = `
                margin-top: 8px;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                background: #2D2D2D;
                border: 1px solid #444;
                color: #a0aec0;
            `;
            flowStatus.textContent = 'Flow state unknown';
            flowStatus.className = 'flow-status flow-status-unknown';
            
            chatStatus.appendChild(flowStatus);
            this.flowStatusElement = flowStatus;
            
            console.log('🧠 [WIDGET] Flow export status indicator added');
        }
    }

    /**
     * Update flow export status
     * @param {string} message - Status message
     * @param {string} status - Status type
     */
    updateFlowExportStatus(message, status) {
        if (this.flowStatusElement) {
            this.flowStatusElement.textContent = message;
            this.flowStatusElement.className = `flow-status flow-status-${status}`;
            
            // Update colors based on status
            const statusColors = {
                'success': '#68d391',
                'error': '#fc8181',
                'syncing': '#f6ad55',
                'unknown': '#a0aec0'
            };
            
            this.flowStatusElement.style.color = statusColors[status] || '#a0aec0';
        }
    }

    /**
     * Load chat history
     */
    loadChatHistory() {
        try {
            if (!window.NeuronGPTWidget || !window.NeuronGPTWidget.ChatHistoryService) return;
            
            const chatHistory = window.NeuronGPTWidget.ChatHistoryService.getMessages({ limit: 10 });
            if (chatHistory.length > 0) {
                console.log('💬 [CHAT] Loading chat history:', chatHistory.length, 'messages');
                
                chatHistory.forEach(msg => {
                    this.addMessage(msg.text, msg.sender, false); // false = don't save to history
                });
                
                // Scroll to bottom
                const messages = this.widget.querySelector('.chat-messages');
                if (messages) {
                    messages.scrollTop = messages.scrollHeight;
                }
            }
        } catch (error) {
            console.error('❌ [CHAT] Error loading chat history:', error);
        }
    }

    /**
     * Add message to chat
     * @param {string} content - Message content
     * @param {string} role - Message role
     * @param {boolean} saveToHistory - Whether to save to history
     */
    addMessage(content, role, saveToHistory = true) {
        const messages = this.widget.querySelector('.chat-messages');
        if (!messages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message chat-${role}`;
        messageDiv.style.cssText = `
            margin-bottom: 12px;
            padding: 8px 12px;
            border-radius: 8px;
            max-width: 80%;
            background: ${role === 'user' ? '#3182ce' : 'rgba(255, 255, 255, 0.1)'};
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: white;
            align-self: ${role === 'user' ? 'flex-end' : 'flex-start'};
            margin-left: ${role === 'user' ? 'auto' : '0'};
        `;
        
        messageDiv.innerHTML = `
            <div class="message-content">${content}</div>
            <div class="message-time" style="
                font-size: 11px;
                opacity: 0.7;
                margin-top: 6px;
                text-align: ${role === 'user' ? 'right' : 'left'};
            ">${new Date().toLocaleTimeString()}</div>
        `;
        
        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
        
        // Save to chat history if requested
        if (saveToHistory && window.NeuronGPTWidget && window.NeuronGPTWidget.ChatHistoryService) {
            window.NeuronGPTWidget.ChatHistoryService.saveMessage(content, role);
        }
    }

    /**
     * Send message
     */
    async sendMessage() {
        const input = this.widget.querySelector('.chat-input');
        const messages = this.widget.querySelector('.chat-messages');
        
        if (!input || !messages) return;
        
        const text = input.value.trim();
        if (!text) return;
        
        // Add user message
        this.addMessage(text, 'user');
        input.value = '';
        
        // Check authentication
        if (window.NeuronGPTWidget && window.NeuronGPTWidget.AuthService) {
            if (!window.NeuronGPTWidget.AuthService.isUserAuthenticated()) {
                this.addMessage('Please log in to continue using NeuronGPT.', 'assistant');
                this.showLoginScreen();
                return;
            }
        }
        
        // Check if flow sync is needed before sending
        if (window.NeuronGPTWidget && window.NeuronGPTWidget.FlowSyncService) {
            const flowSyncService = window.NeuronGPTWidget.FlowSyncService;
            if (flowSyncService.isInitialized && !flowSyncService.syncInProgress) {
                console.debug('🔍 [MESSAGE DEBUG] Checking if flow sync is needed...');
                
                const flowContext = flowSyncService.getCurrentFlowContext();
                if (flowContext) {
                    const currentHash = flowSyncService.calculateFlowHash(flowContext);
                    if (currentHash !== flowSyncService.lastFlowHash) {
                        console.log('🔍 [MESSAGE DEBUG] Flow changes detected, syncing before message...');
                        
                        try {
                            this.updateFlowExportStatus('Flow state syncing...', 'syncing');
                            await flowSyncService.performFlowSync('pre_message');
                            this.updateFlowExportStatus('Flow state synced', 'success');
                        } catch (error) {
                            console.error('🔍 [MESSAGE DEBUG] Flow sync failed before message:', error);
                            this.updateFlowExportStatus('Sync failed', 'error');
                        }
                    }
                }
            }
        }
        
        // Show typing indicator
        const typing = this.addTypingIndicator();
        
        try {
            // Send to external server with authentication
            const response = await this.sendToExternalServer(text);
            typing.remove();
            this.addMessage(response.content, 'assistant');
        } catch (error) {
            console.error('❌ [CHAT] Error sending message:', error);
            typing.remove();
            this.addMessage("Sorry, I'm having trouble connecting to the server. Please try again.", 'assistant');
        }
    }

    /**
     * Send message to external server
     * @param {string} message - Message to send
     * @returns {Object} Server response
     */
    async sendToExternalServer(message) {
        if (window.NeuronGPTWidget && window.NeuronGPTWidget.AuthService) {
            if (!window.NeuronGPTWidget.AuthService.isUserAuthenticated()) {
                throw new Error('User not authenticated');
            }
        }
        
        // Get configuration
        let serverUrl = 'https://neuron-gpt-cp9am.ondigitalocean.app';
        let apiEndpoint = '/api/chat';
        
        if (window.NeuronGPTWidget && window.NeuronGPTWidget.ConfigService) {
            serverUrl = window.NeuronGPTWidget.ConfigService.get('serverUrl');
            apiEndpoint = window.NeuronGPTWidget.ConfigService.get('apiEndpoint');
        }
        
        const requestBody = {
            message: message,
            context: 'Neuron software context',
            flowContext: this.getCurrentFlowContext(),
            rawFlowJson: this.getCurrentFlowJson()
        };
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add auth header if available
        if (window.NeuronGPTWidget && window.NeuronGPTWidget.AuthService) {
            const authHeaders = window.NeuronGPTWidget.AuthService.getAuthHeaders();
            Object.assign(headers, authHeaders);
        }
        
        const response = await fetch(`${serverUrl}${apiEndpoint}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                // Token expired or invalid
                if (window.NeuronGPTWidget && window.NeuronGPTWidget.AuthService) {
                    window.NeuronGPTWidget.AuthService.clearAuthState();
                }
                this.showLoginScreen();
                throw new Error('Authentication expired. Please log in again.');
            }
            throw new Error(`Server error: ${response.status}`);
        }
        
        return await response.json();
    }

    /**
     * Add typing indicator
     * @returns {HTMLElement} Typing indicator element
     */
    addTypingIndicator() {
        const typing = document.createElement('div');
        typing.className = 'chat-message chat-assistant typing';
        typing.style.cssText = `
            margin-bottom: 12px;
            padding: 8px 12px;
            border-radius: 8px;
            max-width: 80%;
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: white;
        `;
        
        typing.innerHTML = `
            <div class="message-content">
                <span style="margin-right: 8px; font-style: italic; font-weight: normal; font-size: 13px;">Thinking</span>
                <span class="typing-dots">
                    <span style="animation: dot1 1.4s infinite;">.</span>
                    <span style="animation: dot2 1.4s infinite;">.</span>
                    <span style="animation: dot3 1.4s infinite;">.</span>
                </span>
            </div>
        `;
        
        // Add typing animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes dot1 { 0%, 20% { opacity: 0; } 40% { opacity: 1; } 100% { opacity: 0; } }
            @keyframes dot2 { 0%, 40% { opacity: 0; } 60% { opacity: 1; } 100% { opacity: 0; } }
            @keyframes dot3 { 0%, 60% { opacity: 0; } 80% { opacity: 1; } 100% { opacity: 0; } }
        `;
        document.head.appendChild(style);
        
        const messages = this.widget.querySelector('.chat-messages');
        if (messages) {
            messages.appendChild(typing);
            messages.scrollTop = messages.scrollHeight;
        }
        return typing;
    }

    /**
     * Get current flow context
     * @returns {Object|null} Flow context
     */
    getCurrentFlowContext() {
        if (window.NeuronGPTWidget && window.NeuronGPTWidget.FlowSyncService) {
            return window.NeuronGPTWidget.FlowSyncService.getCurrentFlowContext();
        }
        return null;
    }

    /**
     * Get current flow JSON
     * @returns {Array|null} Flow JSON
     */
    getCurrentFlowJson() {
        if (window.NeuronGPTWidget && window.NeuronGPTWidget.FlowSyncService) {
            return window.NeuronGPTWidget.FlowSyncService.getCurrentFlowJson();
        }
        return null;
    }

    /**
     * Open dedicated chat window
     */
    openDedicatedChatWindow() {
        // Open the dedicated chat window
        const chatWindow = window.open(
            '/neuron/theme/dedicated-chat-window.html',
            'neuron-chat-window',
            'width=800,height=600,scrollbars=yes,resizable=yes'
        );
        
        if (chatWindow) {
            console.log('🧠 [WIDGET] Dedicated chat window opened');
        }
    }
}

// Export the class
export { WidgetController };
