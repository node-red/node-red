/**
 * NeuronGPT Chat Widget - Modular Version
 * Main entry point with all services defined inline
 */

(function() {
    'use strict';

/**
 * Authentication Service for NeuronGPT Widget
 * Manages user authentication state and token handling
 */

class AuthService {
    constructor() {
        this.isAuthenticated = false;
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.userInfo = null;
        this.loadAuthState();
    }

    /**
     * Load authentication state from localStorage
     */
    loadAuthState() {
        try {
            const accessToken = localStorage.getItem('chat-token');
            const refreshToken = localStorage.getItem('refresh-token');
            const tokenExpiry = localStorage.getItem('token-expires-at');
            
            if (accessToken) {
                this.accessToken = accessToken;
                this.refreshToken = refreshToken;
                this.tokenExpiry = tokenExpiry;
                this.isAuthenticated = this.checkTokenValidity();
                
                if (this.isAuthenticated) {
                    this.extractUserInfo(accessToken);
                }
            }
            
            console.log('🔍 [AUTH] Auth state loaded:', {
                isAuthenticated: this.isAuthenticated,
                hasToken: !!this.accessToken,
                tokenExpiry: this.tokenExpiry
            });
        } catch (error) {
            console.error('❌ [AUTH] Error loading auth state:', error);
            this.isAuthenticated = false;
        }
    }

    /**
     * Check if the current token is still valid
     */
    checkTokenValidity() {
        if (!this.accessToken || !this.tokenExpiry) {
            return false;
        }
        
        const currentTime = Date.now();
        const expiryTime = parseInt(this.tokenExpiry);
        
        if (isNaN(expiryTime) || currentTime >= expiryTime) {
            console.log('⚠️ [AUTH] Token expired, clearing auth state');
            this.clearAuthState();
            return false;
        }
        
        return true;
    }

    /**
     * Extract user information from JWT token
     */
    extractUserInfo(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            this.userInfo = {
                id: payload.sub,
                username: payload.preferred_username || payload.username,
                email: payload.email,
                name: payload.name
            };
            console.log('✅ [AUTH] User info extracted:', this.userInfo);
        } catch (error) {
            console.error('❌ [AUTH] Error extracting user info:', error);
            this.userInfo = null;
        }
    }

    /**
     * Check if user is authenticated
     */
    isUserAuthenticated() {
        return this.isAuthenticated && this.checkTokenValidity();
    }

    /**
     * Get the current access token
     */
    getAccessToken() {
        return this.isUserAuthenticated() ? this.accessToken : null;
    }

    /**
     * Clear authentication state
     */
    clearAuthState() {
        this.isAuthenticated = false;
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.userInfo = null;
        
        localStorage.removeItem('chat-token');
        localStorage.removeItem('refresh-token');
        localStorage.removeItem('token-expires-at');
        localStorage.removeItem('token-type');
        
        console.log('🧹 [AUTH] Auth state cleared');
    }

            /**
         * Handle successful authentication
         */
        handleSuccessfulAuth(accessToken, refreshToken, expiresIn) {
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.tokenExpiry = Date.now() + (parseInt(expiresIn) * 1000);
            this.isAuthenticated = true;
            
            localStorage.setItem('chat-token', accessToken);
            if (refreshToken) {
                localStorage.setItem('refresh-token', refreshToken);
            }
            localStorage.setItem('token-expires-at', this.tokenExpiry.toString());
            
            this.extractUserInfo(accessToken);
            console.log('✅ [AUTH] Authentication successful, user info:', this.userInfo);
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
                'Authorization': `Bearer ${this.accessToken}`
            };
        }
    }

// Class definition complete

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

// Class definition complete

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

// Class definition complete

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

// Class definition complete


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

// Class definition complete

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

// Class definition complete

/**
 * Widget Controller for NeuronGPT Widget
 * Main controller class that manages the widget lifecycle and UI
 */

class WidgetController {
    constructor() {
        this.widget = null;
        this.isInitialized = false;
        this.flowStatusElement = null;
        
        // Note: Method binding will be handled after all methods are defined
        // to avoid "Cannot read properties of undefined" errors
    }

    /**
     * Check for new authentication tokens in localStorage
     * This method scans for tokens and updates the auth service
     */
    checkForNewTokens() {
        try {
            console.log('🔍 [AUTH] Checking for new tokens in localStorage...');
            
            // Check for tokens in localStorage
            const accessToken = localStorage.getItem('chat-token');
            const refreshToken = localStorage.getItem('refresh-token');
            const expiresIn = localStorage.getItem('token-expires-at');
            
            if (accessToken && window.NeuronGPTWidget && window.NeuronGPTWidget.AuthService) {
                console.log('✅ [AUTH] Found new access token, updating auth service...');
                
                // Update the auth service with the new tokens
                window.NeuronGPTWidget.AuthService.handleSuccessfulAuth(
                    accessToken,
                    refreshToken,
                    expiresIn || '3600' // Default to 1 hour if not specified
                );
                
                // Refresh the widget to show chat interface
                this.refreshWidgetAfterAuth();
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ [AUTH] Error checking for new tokens:', error);
            return false;
        }
    }

    /**
     * Refresh the widget after successful authentication
     */
    refreshWidgetAfterAuth() {
        try {
            console.log('🔄 [AUTH] Refreshing widget after authentication...');
            
            // Check if user is now authenticated
            if (window.NeuronGPTWidget && window.NeuronGPTWidget.AuthService) {
                if (window.NeuronGPTWidget.AuthService.isUserAuthenticated()) {
                    console.log('✅ [AUTH] User authenticated, transitioning to chat interface');
                    
                    // Show chat interface
                    this.showChatInterface();
                    
                    // Update logout button visibility
                    this.updateLogoutButtonVisibility(true);
                    
                    // Show success message
                    setTimeout(() => {
                        this.addMessage("Successfully logged in! You can now start chatting.", 'system');
                    }, 500);
                }
            }
        } catch (error) {
            console.error('❌ [AUTH] Error refreshing widget after auth:', error);
        }
    }

    /**
     * Initialize the widget
     */
    async initialize() {
        try {
            console.log('🧠 [WIDGET] Starting enhanced widget initialization...');
            console.log('🧠 [WIDGET] This context:', this);
            console.log('🧠 [WIDGET] Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this)));
            
            // Load configuration first if available
            if (window.NeuronGPTWidget && window.NeuronGPTWidget.ConfigService) {
                console.log('🧠 [WIDGET] ConfigService found, loading configuration...');
                window.NeuronGPTWidget.ConfigService.loadConfiguration();
            } else {
                console.warn('⚠️ [WIDGET] ConfigService not found');
            }
            
            // Check if user is already authenticated
            if (window.NeuronGPTWidget && window.NeuronGPTWidget.AuthService) {
                console.log('🔍 [WIDGET] Checking existing authentication state...');
                
                // Check for new tokens that might have been set by the auth-success page
                this.checkForNewTokens();
                
                if (window.NeuronGPTWidget.AuthService.isUserAuthenticated()) {
                    console.log('✅ [WIDGET] User already authenticated, showing chat interface');
                } else {
                    console.log('⚠️ [WIDGET] User not authenticated, will show login screen');
                }
            } else {
                console.warn('⚠️ [WIDGET] AuthService not found');
            }
            
            // Wait for Node-RED to be ready
            console.log('🧠 [WIDGET] Waiting for Node-RED to be ready...');
            await this.waitForNodeRED();
            console.log('🧠 [WIDGET] Node-RED is ready');
            
            // Create the widget
            console.log('🧠 [WIDGET] Creating widget...');
            this.createWidget();
            console.log('🧠 [WIDGET] Widget created');
            
            // Set up event listeners
            console.log('🧠 [WIDGET] Setting up event listeners...');
            this.setupEventListeners();
            console.log('🧠 [WIDGET] Event listeners set up');
            
            // Initialize flow synchronization
            console.log('🧠 [WIDGET] Initializing flow synchronization...');
            await this.initializeFlowSync();
            console.log('🧠 [WIDGET] Flow synchronization initialized');
            
            this.isInitialized = true;
            console.log('🧠 [WIDGET] Enhanced widget initialization completed successfully');
            
            // Emit ready event if EventService is available
            if (window.NeuronGPTWidget && window.NeuronGPTWidget.EventService) {
                window.NeuronGPTWidget.EventService.emit('widget:ready');
            }
            
        } catch (error) {
            console.error('❌ [WIDGET] Enhanced widget initialization failed:', error);
            console.error('❌ [WIDGET] Error stack:', error.stack);
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
        console.log('🧠 [WIDGET] createWidget method called');
        console.log('🧠 [WIDGET] Document body:', document.body);
        console.log('🧠 [WIDGET] Document ready state:', document.readyState);
        
        // Check if widget already exists
        if (document.getElementById('neuron-chat-widget')) {
            console.log('🧠 [WIDGET] Widget already exists');
            this.widget = document.getElementById('neuron-chat-widget');
            return;
        }

        console.log('🧠 [WIDGET] Creating new widget element...');
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
        
        // Ensure widget is visible
        this.widget.style.display = 'block';
        this.widget.style.visibility = 'visible';
        this.widget.style.opacity = '1';
        console.log('🧠 [WIDGET] Widget styles applied and visibility ensured');
        
        // Add to page
        console.log('🧠 [WIDGET] Adding widget to document body...');
        document.body.appendChild(this.widget);
        console.log('🧠 [WIDGET] Widget added to DOM');
        console.log('🧠 [WIDGET] Widget element in DOM:', document.getElementById('neuron-chat-widget'));
        console.log('🧠 [WIDGET] Widget created successfully');
        
        // Check if user is already authenticated and show appropriate interface
        if (window.NeuronGPTWidget && window.NeuronGPTWidget.AuthService) {
            if (window.NeuronGPTWidget.AuthService.isUserAuthenticated()) {
                console.log('✅ [WIDGET] User authenticated, showing chat interface');
                this.showChatInterface();
                this.updateLogoutButtonVisibility(true);
            } else {
                console.log('⚠️ [WIDGET] User not authenticated, showing login screen');
                this.showLoginScreen();
                this.updateLogoutButtonVisibility(false);
            }
        } else {
            console.log('⚠️ [WIDGET] AuthService not available, showing login screen');
            this.showLoginScreen();
            this.updateLogoutButtonVisibility(false);
        }
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
            visibility: visible !important;
            opacity: 1 !important;
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
                this.handleKeycloakLogout();
            });
        }
        
        // Expand button (dedicated chat window)
        const expandBtn = this.widget.querySelector('.chat-expand');
        if (expandBtn) {
            expandBtn.addEventListener('click', () => {
                this.openDedicatedChatWindow();
            });
        }
        
        // Set up periodic token checking for authentication completion
        this.setupTokenChecking();
        
        // Listen for messages from the auth-success page
        this.setupMessageListener();
    }

    /**
     * Set up message listener for authentication completion
     */
    setupMessageListener() {
        window.addEventListener('message', (event) => {
            if (event.data === 'authentication-complete') {
                console.log('✅ [AUTH] Received authentication completion message');
                // Check for new tokens immediately
                setTimeout(() => {
                    this.checkForNewTokens();
                }, 500);
            }
        });
        
        console.log('👂 [AUTH] Message listener set up for authentication completion');
    }

    /**
     * Update logout button visibility based on authentication state
     * @param {boolean} isAuthenticated - Whether user is authenticated
     */
    updateLogoutButtonVisibility(isAuthenticated) {
        const logoutBtn = this.widget.querySelector('.chat-logout');
        if (logoutBtn) {
            if (isAuthenticated) {
                logoutBtn.style.display = 'flex';
                console.log('✅ [WIDGET] Logout button shown');
            } else {
                logoutBtn.style.display = 'none';
                console.log('✅ [WIDGET] Logout button hidden');
            }
        }
    }

    /**
     * Set up periodic checking for new authentication tokens
     */
    setupTokenChecking() {
        // Check for new tokens every 2 seconds for the first 30 seconds
        let checkCount = 0;
        const maxChecks = 15; // 15 checks * 2 seconds = 30 seconds
        
        const tokenCheckInterval = setInterval(() => {
            checkCount++;
            
            // Check if we have new tokens
            if (this.checkForNewTokens()) {
                console.log('✅ [AUTH] New tokens detected, stopping periodic checks');
                clearInterval(tokenCheckInterval);
                return;
            }
            
            // Stop checking after max attempts
            if (checkCount >= maxChecks) {
                console.log('⏰ [AUTH] Token check timeout reached, stopping periodic checks');
                clearInterval(tokenCheckInterval);
            }
        }, 2000);
        
        console.log('🔄 [AUTH] Periodic token checking started (every 2s for 30s)');
    }

    /**
     * Show login screen
     */
    showLoginScreen() {
        console.log('🧠 [LOGIN] showLoginScreen called');
        if (!this.widget) {
            console.error('❌ [LOGIN] No widget found');
            return;
        }
        
        const chatBody = this.widget.querySelector('.chat-body');
        if (chatBody) {
            console.log('🧠 [LOGIN] Chat body found, setting innerHTML');
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
                        Please authenticate with Keycloak to access AI assistance for your Neuron flows
                    </p>
                    <div style="margin-bottom: 20px; width: 100%; max-width: 300px;">
                        <button id="login-button" style="
                            background: #3182ce;
                            color: white;
                            border: none;
                            padding: 16px 32px;
                            border-radius: 8px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s;
                            margin-bottom: 16px;
                            width: 100%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 8px;
                        ">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
                            </svg>
                            Login with Keycloak
                        </button>
                    </div>
                    <div id="login-status" style="
                        font-size: 12px;
                        color: #a0aec0;
                        min-height: 20px;
                    "></div>
                    <div style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 6px; font-size: 11px; color: #a0aec0;">
                        <strong>Note:</strong> A popup window will open for authentication. Please allow popups for this site.
                    </div>
                </div>
            `;
            
            this.setupLoginEventListeners();
            
            // Ensure logout button is hidden when showing login screen
            this.updateLogoutButtonVisibility(false);
            
            console.log('🧠 [LOGIN] Login screen HTML set and event listeners configured');
            console.log('✅ [LOGIN] Login screen setup completed successfully');
        } else {
            console.error('❌ [LOGIN] Chat body not found');
        }
    }

    /**
     * Set up login event listeners
     */
    setupLoginEventListeners() {
        console.log('🧠 [LOGIN] Setting up login event listeners...');
        
        // Login button
        const loginBtn = document.getElementById('login-button');
        if (loginBtn) {
            console.log('✅ [LOGIN] Login button found, adding click listener');
            loginBtn.addEventListener('click', () => this.handleKeycloakLogin());
        } else {
            console.error('❌ [LOGIN] Login button not found');
        }
        
        console.log('✅ [LOGIN] Login event listeners setup completed');
    }

    /**
     * Handle Keycloak login with popup
     */
    async handleKeycloakLogin() {
        console.log('🧠 [LOGIN] handleKeycloakLogin called');
        
        const loginBtn = document.getElementById('login-button');
        const statusDiv = document.getElementById('login-status');
        
        if (!loginBtn || !statusDiv) {
            console.error('❌ [LOGIN] Login button or status div not found');
            return;
        }
        
        console.log('✅ [LOGIN] Login elements found, proceeding with authentication');
        
        // Disable button and show loading
        loginBtn.disabled = true;
        loginBtn.textContent = 'Opening login...';
        statusDiv.textContent = 'Opening authentication window...';
        statusDiv.style.color = '#68d391';
        
        try {
            // Get configuration
            let serverUrl = 'https://neuron-gpt-cp9am.ondigitalocean.app';
            if (window.NeuronGPTWidget && window.NeuronGPTWidget.ConfigService) {
                serverUrl = window.NeuronGPTWidget.ConfigService.get('serverUrl');
            }
            
            // Create popup window for Keycloak authentication
            // Redirect to our auth-success page after authentication
            const authUrl = `${serverUrl}/api/forward/auth?redirect_uri=${encodeURIComponent(window.location.origin + '/neuron/theme/auth-success.html')}`;
            console.log('🔍 [LOGIN] Opening authentication popup with URL:', authUrl);
            
            // Try to open popup with more specific features
            const popup = window.open(
                authUrl,
                'keycloak-auth',
                'width=800,height=600,scrollbars=yes,resizable=yes,status=yes,location=yes,menubar=no,toolbar=no'
            );
            
            if (!popup) {
                throw new Error('Popup blocked. Please allow popups for this site.');
            }
            
            // Check if popup was actually opened and loaded
            setTimeout(() => {
                if (popup.closed || popup.location.href === 'about:blank') {
                    console.error('❌ [LOGIN] Popup failed to load properly or was blocked');
                    popup.close();
                    throw new Error('Popup failed to load. Please check your popup blocker settings.');
                }
            }, 1000);
            
            console.log('✅ [LOGIN] Authentication popup opened successfully');
            
            // Monitor popup for authentication completion
            console.log('🔍 [LOGIN] Starting popup monitoring...');
            let popupClosed = false;
            
            const checkAuth = setInterval(async () => {
                try {
                    // Check if popup is closed
                    if (popup.closed && !popupClosed) {
                        popupClosed = true;
                        console.log('🔍 [LOGIN] Popup closed, checking authentication state...');
                        clearInterval(checkAuth);
                        
                        // Check if we have authentication tokens in localStorage
                        if (window.NeuronGPTWidget && window.NeuronGPTWidget.AuthService) {
                            console.log('🔍 [LOGIN] Popup closed, checking authentication state...');
                            
                            // Try to refresh auth state from localStorage
                            window.NeuronGPTWidget.AuthService.refreshAuthState();
                            
                            console.log('🔍 [LOGIN] Auth state after popup close:', window.NeuronGPTWidget.AuthService.getAuthState());
                            
                            if (window.NeuronGPTWidget.AuthService.isUserAuthenticated()) {
                                // Authentication successful
                                console.log('✅ [LOGIN] Authentication successful after popup close, transitioning to chat');
                                statusDiv.textContent = 'Login successful!';
                                statusDiv.style.color = '#68d391';
                                
                                // Show logout button
                                const logoutBtn = this.widget.querySelector('.chat-logout');
                                if (logoutBtn) {
                                    logoutBtn.style.display = 'flex';
                                }
                                
                                // Transition to chat interface
                                setTimeout(() => {
                                    this.showChatInterface();
                                }, 1000);
                                return;
                            } else {
                                // Check if we need to manually extract tokens
                                console.log('⚠️ [LOGIN] Authentication not detected after popup close, checking for manual token extraction');
                                
                                const token = localStorage.getItem('neuron-auth-token');
                                const user = localStorage.getItem('neuron-user-info');
                                const expiry = localStorage.getItem('neuron-token-expiry');
                                
                                console.log('🔍 [LOGIN] Manual token check after popup close:', { token: !!token, user: !!user, expiry: !!expiry });
                                
                                if (token && user && expiry) {
                                    try {
                                        const userData = JSON.parse(user);
                                        const expiryTime = parseInt(expiry);
                                        
                                        if (Date.now() < expiryTime) {
                                            window.NeuronGPTWidget.AuthService.saveAuthState(token, userData, (expiryTime - Date.now()) / (60 * 60 * 1000));
                                            console.log('✅ [LOGIN] Manually set authentication state after popup close');
                                            
                                            statusDiv.textContent = 'Login successful!';
                                            statusDiv.style.color = '#68d391';
                                            
                                            const logoutBtn = this.widget.querySelector('.chat-logout');
                                            if (logoutBtn) {
                                                logoutBtn.style.display = 'flex';
                                            }
                                            
                                            setTimeout(() => {
                                                this.showChatInterface();
                                            }, 1000);
                                            return;
                                        }
                                    } catch (error) {
                                        console.error('❌ [LOGIN] Error parsing manual tokens after popup close:', error);
                                    }
                                }
                            }
                        }
                        
                        // User closed popup without authentication
                        statusDiv.textContent = 'Authentication cancelled';
                        statusDiv.style.color = '#f6ad55';
                        loginBtn.disabled = false;
                        loginBtn.textContent = 'Login with Keycloak';
                        return;
                    }
                    
                    // Check if popup has redirected to callback URL (indicating successful auth)
                    try {
                        const popupUrl = popup.location.href;
                        console.log('🔍 [LOGIN] Popup URL check:', popupUrl);
                        
                        // Check for various authentication completion indicators
                        if (popupUrl.includes('/api/auth/callback') || 
                            popupUrl.includes('/demo') || 
                            popupUrl.includes('/auth/callback') ||
                            popupUrl.includes('success') ||
                            popupUrl.includes('authenticated')) {
                            
                            console.log('✅ [LOGIN] Authentication callback detected, closing popup');
                            // Authentication completed, close popup
                            popup.close();
                            clearInterval(checkAuth);
                            
                            // Wait a moment for tokens to be processed, then check auth state
                            setTimeout(async () => {
                                console.log('🔍 [LOGIN] Checking authentication state after popup close...');
                                
                                if (window.NeuronGPTWidget && window.NeuronGPTWidget.AuthService) {
                                    // Try to refresh auth state from localStorage
                                    window.NeuronGPTWidget.AuthService.refreshAuthState();
                                    
                                    console.log('🔍 [LOGIN] Auth state after refresh:', window.NeuronGPTWidget.AuthService.getAuthState());
                                    
                                    if (window.NeuronGPTWidget.AuthService.isUserAuthenticated()) {
                                        // Authentication successful
                                        console.log('✅ [LOGIN] Authentication successful, transitioning to chat');
                                        statusDiv.textContent = 'Login successful!';
                                        statusDiv.style.color = '#68d391';
                                        
                                        // Show logout button
                                        const logoutBtn = this.widget.querySelector('.chat-logout');
                                        if (logoutBtn) {
                                            logoutBtn.style.display = 'flex';
                                        }
                                        
                                        // Transition to chat interface
                                        setTimeout(() => {
                                            this.showChatInterface();
                                        }, 1000);
                                    } else {
                                        // Authentication failed - check if we need to manually extract tokens
                                        console.log('⚠️ [LOGIN] Authentication not detected, checking for manual token extraction');
                                        
                                        // Try to manually check for tokens in localStorage
                                        const token = localStorage.getItem('neuron-auth-token');
                                        const user = localStorage.getItem('neuron-user-info');
                                        const expiry = localStorage.getItem('neuron-token-expiry');
                                        
                                        console.log('🔍 [LOGIN] Manual token check:', { token: !!token, user: !!user, expiry: !!expiry });
                                        
                                        if (token && user && expiry) {
                                            // We have tokens, manually set them
                                            try {
                                                const userData = JSON.parse(user);
                                                const expiryTime = parseInt(expiry);
                                                
                                                if (Date.now() < expiryTime) {
                                                    window.NeuronGPTWidget.AuthService.saveAuthState(token, userData, (expiryTime - Date.now()) / (60 * 60 * 1000));
                                                    console.log('✅ [LOGIN] Manually set authentication state');
                                                    
                                                    // Now transition to chat
                                                    statusDiv.textContent = 'Login successful!';
                                                    statusDiv.style.color = '#68d391';
                                                    
                                                    const logoutBtn = this.widget.querySelector('.chat-logout');
                                                    if (logoutBtn) {
                                                        logoutBtn.style.display = 'flex';
                                                    }
                                                    
                                                    setTimeout(() => {
                                                        this.showChatInterface();
                                                    }, 1000);
                                                    return;
                                                }
                                            } catch (error) {
                                                console.error('❌ [LOGIN] Error parsing manual tokens:', error);
                                            }
                                        }
                                        
                                        // Still no authentication
                                        statusDiv.textContent = 'Authentication failed';
                                        statusDiv.style.color = '#fc8181';
                                        loginBtn.disabled = false;
                                        loginBtn.textContent = 'Login with Keycloak';
                                    }
                                }
                            }, 1000);
                        }
                    } catch (e) {
                        // Cross-origin error, popup is still on auth page
                        console.log('🔍 [LOGIN] Cross-origin error (expected during auth), popup still on auth page');
                        // Continue monitoring
                    }
                    
                } catch (error) {
                    console.error('❌ [LOGIN] Error checking authentication:', error);
                }
            }, 500); // Check every 500ms
            
            // Set a timeout to stop checking after 5 minutes
            console.log('🔍 [LOGIN] Setting authentication timeout (5 minutes)');
            setTimeout(() => {
                console.log('⚠️ [LOGIN] Authentication timeout reached');
                clearInterval(checkAuth);
                if (!popup.closed) {
                    console.log('🔍 [LOGIN] Closing popup due to timeout');
                    popup.close();
                }
                if (loginBtn.disabled) {
                    statusDiv.textContent = 'Authentication timeout';
                    statusDiv.style.color = '#f6ad55';
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Login with Keycloak';
                }
            }, 300000); // 5 minutes
            
            // Add a fallback: check if user manually navigated to demo page
            console.log('🔍 [LOGIN] Setting up fallback authentication check');
            const fallbackCheck = setInterval(() => {
                // Check if the current page is the demo page (indicating successful auth)
                if (window.location.href.includes('/demo')) {
                    console.log('✅ [LOGIN] Fallback: User is on demo page, authentication successful');
                    clearInterval(fallbackCheck);
                    
                    // Try to extract authentication from the demo page
                    this.handleDemoPageAuthentication(statusDiv, loginBtn);
                }
            }, 2000); // Check every 2 seconds
            
        } catch (error) {
            console.error('❌ [LOGIN] Keycloak login failed:', error);
            statusDiv.textContent = 'Login failed: ' + error.message;
            statusDiv.style.color = '#fc8181';
            
            // Re-enable button
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login with Keycloak';
            
            console.log('🔍 [LOGIN] Login button re-enabled after error');
        }
    }

    /**
     * Show chat interface
     */
    showChatInterface() {
        console.log('🧠 [CHAT] showChatInterface called');
        
        // Check if user is authenticated before showing chat interface
        if (window.NeuronGPTWidget && window.NeuronGPTWidget.AuthService) {
            if (!window.NeuronGPTWidget.AuthService.isUserAuthenticated()) {
                console.log('⚠️ [CHAT] User not authenticated, showing login screen instead');
                this.showLoginScreen();
                return;
            }
        }
        
        if (!this.widget) {
            console.error('❌ [CHAT] No widget found');
            return;
        }
        
        const chatBody = this.widget.querySelector('.chat-body');
        if (chatBody) {
            console.log('🧠 [CHAT] Chat body found, setting innerHTML');
            chatBody.innerHTML = this.getChatInterfaceHTML();
            this.initializeChatFunctionality();
            this.addFlowExportStatusIndicator();
            
            // Ensure logout button is shown when displaying chat interface
            this.updateLogoutButtonVisibility(true);
            
            console.log('✅ [CHAT] Chat interface initialized successfully');
        } else {
            console.error('❌ [CHAT] Chat body not found');
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
            const accessToken = window.NeuronGPTWidget.AuthService.getAccessToken();
            if (accessToken) {
                headers['Authorization'] = `Bearer ${accessToken}`;
            }
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
     * Handle Keycloak logout
     */
    async handleKeycloakLogout() {
        try {
            // Clear local auth state first
            if (window.NeuronGPTWidget && window.NeuronGPTWidget.AuthService) {
                window.NeuronGPTWidget.AuthService.clearAuthState();
            }
            
            // Get configuration
            let serverUrl = 'https://neuron-gpt-cp9am.ondigitalocean.app';
            if (window.NeuronGPTWidget && window.NeuronGPTWidget.ConfigService) {
                serverUrl = window.NeuronGPTWidget.ConfigService.get('serverUrl');
            }
            
            // Open logout popup
            const logoutPopup = window.open(
                `${serverUrl}/api/auth/logout?redirect_uri=${encodeURIComponent(window.location.origin + '/neuron/theme/auth-success.html')}`,
                'keycloak-logout',
                'width=600,height=400,scrollbars=yes,resizable=yes'
            );
            
            if (logoutPopup) {
                // Close popup after a short delay
                setTimeout(() => {
                    logoutPopup.close();
                }, 3000);
            }
            
            // Hide logout button
            const logoutBtn = this.widget.querySelector('.chat-logout');
            if (logoutBtn) {
                logoutBtn.style.display = 'none';
            }
            
            // Show login screen
            this.showLoginScreen();
            
        } catch (error) {
            console.error('❌ [LOGOUT] Keycloak logout failed:', error);
            
            // Fallback: just clear local state and show login
            if (window.NeuronGPTWidget && window.NeuronGPTWidget.AuthService) {
                window.NeuronGPTWidget.AuthService.clearAuthState();
            }
            
            const logoutBtn = this.widget.querySelector('.chat-logout');
            if (logoutBtn) {
                logoutBtn.style.display = 'none';
            }
            
            this.showLoginScreen();
        }
    }

    /**
     * Handle authentication from demo page
     * @param {HTMLElement} statusDiv - Status display element
     * @param {HTMLElement} loginBtn - Login button element
     */
    handleDemoPageAuthentication(statusDiv, loginBtn) {
        try {
            console.log('🧠 [DEMO AUTH] Handling demo page authentication...');
            
            // Check if we have authentication tokens in localStorage
            if (window.NeuronGPTWidget && window.NeuronGPTWidget.AuthService) {
                // Try to refresh auth state from localStorage
                window.NeuronGPTWidget.AuthService.refreshAuthState();
                
                if (window.NeuronGPTWidget.AuthService.isUserAuthenticated()) {
                    console.log('✅ [DEMO AUTH] Authentication successful from demo page');
                    
                    if (statusDiv) {
                        statusDiv.textContent = 'Login successful!';
                        statusDiv.style.color = '#68d391';
                    }
                    
                    // Show logout button
                    const logoutBtn = this.widget.querySelector('.chat-logout');
                    if (logoutBtn) {
                        logoutBtn.style.display = 'flex';
                    }
                    
                    // Transition to chat interface
                    setTimeout(() => {
                        this.showChatInterface();
                    }, 1000);
                    return;
                }
            }
            
            // Authentication failed
            if (statusDiv) {
                statusDiv.textContent = 'Authentication failed';
                statusDiv.style.color = '#fc8181';
            }
            
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Login with Keycloak';
            }
            
        } catch (error) {
            console.error('❌ [DEMO AUTH] Error handling demo page authentication:', error);
            
            if (statusDiv) {
                statusDiv.textContent = 'Authentication error';
                statusDiv.style.color = '#fc8181';
            }
            
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Login with Keycloak';
            }
        }
    }

    /**
     * Bind all methods to preserve context
     * This method is called after all methods are defined
     */
    bindMethods() {
        try {
            console.log('🧠 [WIDGET] Binding methods to preserve context...');
            
            // Bind all methods that need to preserve 'this' context
            const methodsToBind = [
                'initialize', 'waitForNodeRED', 'createWidget', 'applyWidgetStyles',
                'setupEventListeners', 'showLoginScreen', 'setupLoginEventListeners',
                'handleKeycloakLogin', 'showChatInterface', 'getChatInterfaceHTML',
                'initializeChatFunctionality', 'initializeFlowSync', 'setupFlowSyncEventListeners',
                'addFlowExportStatusIndicator', 'updateFlowExportStatus', 'loadChatHistory',
                'addMessage', 'sendMessage', 'sendToExternalServer', 'addTypingIndicator',
                'getCurrentFlowContext', 'getCurrentFlowJson', 'openDedicatedChatWindow',
                'handleKeycloakLogout', 'handleDemoPageAuthentication', 'checkForNewTokens',
                'refreshWidgetAfterAuth', 'setupTokenChecking', 'setupMessageListener', 'updateLogoutButtonVisibility'
            ];
            
            methodsToBind.forEach(methodName => {
                if (typeof this[methodName] === 'function') {
                    this[methodName] = this[methodName].bind(this);
                    console.log(`✅ [WIDGET] Bound method: ${methodName}`);
                } else {
                    console.warn(`⚠️ [WIDGET] Method not found for binding: ${methodName}`);
                }
            });
            
            console.log('🧠 [WIDGET] Method binding completed');
        } catch (error) {
            console.error('❌ [WIDGET] Error binding methods:', error);
        }
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

// Class definition complete

// Create singleton instances
const authService = new AuthService();
const chatHistoryService = new ChatHistoryService();
const configService = new ConfigService();
const eventService = new EventService();
const flowSyncService = new FlowSyncService();
const logService = new LogService();
const widgetController = new WidgetController();

// Bind methods after all classes are defined
widgetController.bindMethods();

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
        console.log('🧠 [NEURONGPT] Widget controller:', widgetController);
        console.log('🧠 [NEURONGPT] Widget controller methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(widgetController)));
        widgetController.initialize();
    });
} else {
    console.log('🧠 [NEURONGPT] DOM already ready, initializing modular widget...');
    console.log('🧠 [NEURONGPT] Widget controller:', widgetController);
    console.log('🧠 [NEURONGPT] Widget controller methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(widgetController)));
    widgetController.initialize();
}

})(); // End of IIFE
