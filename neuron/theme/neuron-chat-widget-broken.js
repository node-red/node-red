(function() {
    'use strict';
    
    /**
     * NeuronGPT Chat Widget - Simple Loading System
     * 
     * This widget uses a simple, reliable loading strategy:
     * 
     * PHASE 1: Wait for Basic Components
     * - Wait for RED object to be available
     * - Wait for RED.nodes to be available
     * - Create widget immediately when ready
     * 
     * FLOW EXPORT STRATEGIES:
     * - Strategy 1: Direct RED.flows access (most reliable)
     * - Strategy 2: Editor-based access (fallback)
     * - Strategy 3: Dynamic availability checking (post-creation)
     * 
     * BENEFITS:
     * - Fast widget creation (doesn't wait for everything)
     * - Reliable initialization (simple checks)
     * - Graceful degradation (works in various Node-RED states)
     * - Future-proof (adapts to different initialization orders)
     */
    
    // Configuration for external server - will be loaded from config file
    let CONFIG = {
        serverUrl: 'https://neuron-gpt-cp9am.ondigitalocean.app/', // Will be overridden by config file
        apiEndpoint: '/api/chat',
        healthEndpoint: '/health',
        authEndpoint: '/api/forward/auth',
        callbackEndpoint: '/api/auth/callback'
    };

            // Load configuration from external file
        function loadConfiguration() {
            if (window.NEURONGPT_CONFIG) {
                CONFIG = { ...CONFIG, ...window.NEURONGPT_CONFIG };
                console.log('🔧 [CONFIG] Configuration loaded from external file:', CONFIG);
            } else {
                console.warn('⚠️ [CONFIG] External configuration not found, using defaults');
                // Set default server URL if config not found
                CONFIG.serverUrl = 'https://neuron-gpt-cp9am.ondigitalocean.app';
            }
        }
    
    // Authentication state
    let authState = {
        isAuthenticated: false,
        accessToken: null,
        user: null,
        tokenExpiry: null
    };
    
    // Check if user is authenticated
    function isUserAuthenticated() {
        if (!authState.accessToken) return false;
        if (authState.tokenExpiry && Date.now() > authState.tokenExpiry) {
            // Token expired, clear auth state
            clearAuthState();
            return false;
        }
        return true;
    }
    
    // Clear authentication state
    function clearAuthState() {
        authState = {
            isAuthenticated: false,
            accessToken: null,
            user: null,
            tokenExpiry: null
        };
        localStorage.removeItem('neuron-auth-token');
        localStorage.removeItem('neuron-user-info');
        localStorage.removeItem('neuron-token-expiry');
    }
    
    // Save authentication state to localStorage
    function saveAuthState(token, user) {
        authState.accessToken = token;
        authState.user = user;
        authState.isAuthenticated = true;
        authState.tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour from now
        
        localStorage.setItem('neuron-auth-token', token);
        localStorage.setItem('neuron-user-info', JSON.stringify(user));
        localStorage.setItem('neuron-token-expiry', authState.tokenExpiry.toString());
    }
    
    // Load authentication state from localStorage
    function loadAuthState() {
        const token = localStorage.getItem('neuron-auth-token');
        const userInfo = localStorage.getItem('neuron-user-info');
        const expiry = localStorage.getItem('neuron-token-expiry');
        
        if (token && userInfo && expiry) {
            const expiryTime = parseInt(expiry);
            if (Date.now() < expiryTime) {
                authState.accessToken = token;
                authState.user = JSON.parse(userInfo);
                authState.isAuthenticated = true;
                authState.tokenExpiry = expiryTime;
                return true;
            }
        }
        return false;
    }
    
    // Show login screen
    function showLoginScreen() {
        const widget = document.getElementById('neuron-chat-widget');
        if (!widget) return;

        const chatBody = widget.querySelector('.chat-body');
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
                    ">Login with Neuron</button>
                    <div id="login-status" style="
                        margin-top: 16px;
                        font-size: 12px;
                        color: #a0aec0;
                    "></div>
                </div>
            `;

            // Add login button event listener
            const loginBtn = document.getElementById('login-button');
            if (loginBtn) {
                loginBtn.addEventListener('click', initiateLogin);
            }
        }
    }
    
    // Initiate login process
    function initiateLogin() {
        const statusDiv = document.getElementById('login-status');
        if (statusDiv) {
            statusDiv.textContent = 'Redirecting to authentication...';
            statusDiv.style.color = '#68d391';
        }

        // Open login in new window/tab
        const loginWindow = window.open(
            `${CONFIG.serverUrl}${CONFIG.authEndpoint}?redirect_uri=${encodeURIComponent(window.location.origin + '/neuron/theme/dedicated-chat-window.html')}`,
            'neuron-auth',
            'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        // Check for authentication completion
        const checkAuth = setInterval(() => {
            if (loginWindow.closed) {
                clearInterval(checkAuth);
                checkAuthResult();
            }
        }, 1000);
    }
    
            // Check authentication result
        function checkAuthResult() {
            // Check if we have a token in localStorage
            if (loadAuthState()) {
                showChatInterface();
            } else {
                const statusDiv = document.getElementById('login-status');
                if (statusDiv) {
                    statusDiv.textContent = 'Authentication failed or cancelled';
                    statusDiv.style.color = '#fc8181';
                }
            }
        }

        // Listen for authentication messages from popup
        window.addEventListener('message', function(event) {
            if (event.origin !== CONFIG.serverUrl) return;
            
            if (event.data.type === 'AUTH_SUCCESS') {
                const { token, user } = event.data;
                saveAuthState(token, user);
                showChatInterface();
                
                // Show logout button
                const logoutBtn = document.querySelector('.chat-logout');
                if (logoutBtn) {
                    logoutBtn.style.display = 'flex';
                }
            } else if (event.data.type === 'AUTH_ERROR') {
                const statusDiv = document.getElementById('login-status');
                if (statusDiv) {
                    statusDiv.textContent = 'Authentication failed: ' + event.data.error;
                    statusDiv.style.color = '#fc8181';
                }
            }
        });
    
    // Show chat interface after authentication
    function showChatInterface() {
        const widget = document.getElementById('neuron-chat-widget');
        if (!widget) return;

        // Show logout button
        const logoutBtn = widget.querySelector('.chat-logout');
        if (logoutBtn) {
            logoutBtn.style.display = 'flex';
        }

        const chatBody = widget.querySelector('.chat-body');
        if (chatBody) {
            chatBody.innerHTML = `
                <div class="chat-messages">
                </div>
                <div class="chat-input-area">
                    <input type="text" placeholder="Ask about Neuron software..." class="chat-input">
                    <button class="chat-send">Send</button>
                </div>
                <div class="chat-status">
                    <small>Connected to external server</small>
                </div>
            `;

            // Initialize chat functionality
            initializeChatFunctionality();
        }
    }

    // Initialize chat functionality
    function initializeChatFunctionality() {
        const widget = document.getElementById('neuron-chat-widget');
        if (!widget) return;

        const input = widget.querySelector('.chat-input');
        const sendBtn = widget.querySelector('.chat-send');
        const messages = widget.querySelector('.chat-messages');

        if (!input || !sendBtn || !messages) return;

        // Event listeners
        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        // Add welcome message
        addMessage('Hello! I\'m NeuronGPT, your AI assistant for Neuron software. How can I help you today?', 'assistant');
    }

    // Add message to chat
    function addMessage(content, role) {
        const widget = document.getElementById('neuron-chat-widget');
        if (!widget) return;

        const messages = widget.querySelector('.chat-messages');
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

        messageDiv.innerHTML = `<div class="message-content">${content}</div>`;
        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
    }

    // Send message function
    async function sendMessage() {
        const widget = document.getElementById('neuron-chat-widget');
        if (!widget) return;

        const input = widget.querySelector('.chat-input');
        const messages = widget.querySelector('.chat-messages');
        
        if (!input || !messages) return;

        const text = input.value.trim();
        if (!text) return;

        // Add user message
        addMessage(text, 'user');
        input.value = '';

        // Check authentication
        if (!isUserAuthenticated()) {
            addMessage('Please log in to continue using NeuronGPT.', 'assistant');
            showLoginScreen();
            return;
        }

        // Show typing indicator
        const typing = addTypingIndicator();

        try {
            // Send to external server with authentication
            const response = await sendToExternalServer(text);
            typing.remove();
            addMessage(response.content, 'assistant');
        } catch (error) {
            console.error('Error sending message:', error);
            typing.remove();
            addMessage("Sorry, I'm having trouble connecting to the server. Please try again.", 'assistant');
        }
    }

    // Send message to external server with authentication
    async function sendToExternalServer(message) {
        if (!isUserAuthenticated()) {
            throw new Error('User not authenticated');
        }

        const requestBody = {
            message: message,
            context: 'Neuron software context',
            flowContext: getCurrentFlowContext(),
            rawFlowJson: getCurrentFlowJson()
        };

        const response = await fetch(`${CONFIG.serverUrl}${CONFIG.apiEndpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authState.accessToken}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired or invalid
                clearAuthState();
                showLoginScreen();
                throw new Error('Authentication expired. Please log in again.');
            }
            throw new Error(`Server error: ${response.status}`);
        }

        return await response.json();
    }
    
    // Wait for Node-RED to be fully loaded
    function waitForNodeRED() {
        // Check if RED object exists and has basic structure
        if (typeof RED === 'undefined') {
            setTimeout(waitForNodeRED, 200);
            return;
        }
        
        // Check if RED object has the basic structure we need
        if (!RED || typeof RED !== 'object') {
            setTimeout(waitForNodeRED, 200);
            return;
        }
        
        // Check if RED.nodes is available and has methods
        if (!RED.nodes || typeof RED.nodes !== 'object') {
            setTimeout(waitForNodeRED, 200);
            return;
        }
        
        // Check if RED.nodes has the basic methods we need for flow export
        if (!RED.nodes.createCompleteNodeSet && !RED.nodes.eachNode) {
            setTimeout(waitForNodeRED, 200);
            return;
        }
        
        // Load configuration first
        loadConfiguration();
        
        // If we have RED and RED.nodes with flow export methods, we're good to go!
        createChatWidget();
        
        // Check authentication status and show appropriate interface
        if (loadAuthState()) {
            showChatInterface();
        } else {
            showLoginScreen();
        }
        
        // Check if this is a new window and restore chat data
        checkForNewWindowChat();
    }
    
            // Create floating chat widget
        function createChatWidget() {
            // Check if widget already exists
            if (document.getElementById('neuron-chat-widget')) {
                return;
            }

            const widget = document.createElement('div');
            widget.id = 'neuron-chat-widget';
            widget.innerHTML = `
                <div class="chat-header">
                    <div class="chat-header-title">
                        <svg width="20" height="20" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px;">
                            <path d="M116.736 373.991C116.736 373.991 117.296 250.322 188.729 231.521C289.649 204.96 297.03 397.603 398.286 371.564C482.834 349.821 483.029 229 483.029 229" stroke="white" stroke-width="40.6992" stroke-linecap="square"/>
                        </svg>
                        <span>NeuronGPT</span>
                    </div>
                    <div class="chat-header-buttons">
                        <button class="chat-new-window" title="Open in New Window">
                            <svg width="16" height="16" viewBox="0 0 1706.66 1706.66" xmlns="http://www.w3.org/2000/svg">
                                <g>
                                    <path d="m1035.54 759.44c-73.04 0-108.75-88.41-57.76-139.41l425.65-425.65-158.76-14.44c-110.61-10.04-99.57-163.29 2.37-163.29.55 0 1.07.02 1.62.04l398.44 24.72c13.17.82 23.65 11.31 24.48 24.46l25.07 398.77c2.77 41.58-34.15 83.35-81.64 83.35-42.42 0-77.49-34.11-81.59-79.34l-14.44-158.75-425.65 425.67c-15.38 15.36-35.9 23.85-57.78 23.85z" fill="white"/>
                                    <path d="m123.51 310.48v1295.16h1295.18v-1043.13c0-77.48 117.71-77.48 117.71 0v1047.27c0 62.63-50.94 113.55-113.57 113.55h-1303.48c-62.63 0-113.55-50.92-113.55-113.55v-1303.46c0-62.63 50.92-113.55 113.55-113.55h1047.26c77.48 0 77.48 117.71 0 117.71h-1043.1z" fill="white"/>
                                </g>
                            </svg>
                        </button>
                        <button class="chat-logout" title="Logout" style="display: none;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    <button class="chat-minimize" title="Minimize">−</button>
                    </div>
                </div>
                <div class="chat-body">
                    <!-- Content will be populated by showLoginScreen() or showChatInterface() -->
                </div>
            `;
        
        // Add comprehensive inline styles for complete self-containment
        widget.style.cssText = `
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
        
        // Add styles for all child elements
        const header = widget.querySelector('.chat-header');
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

        // Style the logout button
        const logoutBtn = widget.querySelector('.chat-logout');
        if (logoutBtn) {
            logoutBtn.style.cssText = `
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.3s ease;
            `;
            
            // Add logout functionality
            logoutBtn.addEventListener('click', () => {
                clearAuthState();
                showLoginScreen();
                logoutBtn.style.display = 'none';
            });
        }
        
        const headerTitle = widget.querySelector('.chat-header-title');
        headerTitle.style.cssText = `
            display: flex;
            align-items: center;
            font-size: 14px;
        `;
        
        const minimizeBtn = widget.querySelector('.chat-minimize');
        minimizeBtn.style.cssText = `
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
        `;
        
        const newWindowBtn = widget.querySelector('.chat-new-window');
        newWindowBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: all 0.3s ease;
        `;
        
        // Style the SVG icon inside the button
        const svgIcon = newWindowBtn.querySelector('svg');
        if (svgIcon) {
            svgIcon.style.cssText = `
                width: 16px;
                height: 16px;
                fill: white;
            `;
        }
        
        const headerButtons = widget.querySelector('.chat-header-buttons');
        headerButtons.style.cssText = `
            display: flex;
            align-items: center;
            gap: 4px;
        `;
        
        // Add hover effects for buttons
        minimizeBtn.addEventListener('mouseenter', () => {
            minimizeBtn.style.backgroundColor = 'rgba(255,255,255,0.1)';
        });
        minimizeBtn.addEventListener('mouseleave', () => {
            minimizeBtn.style.backgroundColor = 'transparent';
        });
        
        newWindowBtn.addEventListener('mouseenter', () => {
            newWindowBtn.style.backgroundColor = 'rgba(255,255,255,0.1)';
        });
        newWindowBtn.addEventListener('mouseleave', () => {
            newWindowBtn.style.backgroundColor = 'transparent';
        });
        
        const body = widget.querySelector('.chat-body');
        body.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
            background: #1D1D1D;
            border-radius: 0;
            overflow: hidden;
            min-height: 0;
            position: relative;
        `;
        
        const messages = widget.querySelector('.chat-messages');
        if (messages) {
            messages.style.cssText = `
                flex: 1;
                padding: 2px;
                overflow-y: auto;
                background: #1D1D1D;
                max-height: none;
                scrollbar-width: thin;
                scrollbar-color: #c1c1c1 #1D1D1D;
                margin-bottom: 60px;
            `;
        }
        
        // Add custom scrollbar styles for webkit browsers
        const scrollbarStyle = document.createElement('style');
        scrollbarStyle.textContent = `
            #neuron-chat-widget .chat-messages::-webkit-scrollbar {
                width: 8px;
            }
            #neuron-chat-widget .chat-messages::-webkit-scrollbar-track {
            background: #f8f9fa;
                border-radius: 4px;
            }
            #neuron-chat-widget .chat-messages::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 4px;
            }
            #neuron-chat-widget .chat-messages::-webkit-scrollbar-thumb:hover {
                background: #a8a8a8;
            }
        `;
        document.head.appendChild(scrollbarStyle);
        

        
        const inputArea = widget.querySelector('.chat-input-area');
        if (inputArea) {
            inputArea.style.cssText = `
                padding: 4px;
                border-top: 1px solid #333;
                background: #1D1D1D;
                display: flex;
                gap: 8px;
                flex-shrink: 0;
                min-height: 40px;
                width: 100%;
                box-sizing: border-box;
                position: absolute;
                bottom: 32px;
                left: 0;
                right: 0;
            `;
        }
        
        const input = widget.querySelector('.chat-input');
        if (input) {
            input.style.cssText = `
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                outline: none;
                min-width: 0;
                background: #1D1D1D;
                color: white;
            `;
        }
        
        const sendBtn = widget.querySelector('.chat-send');
        if (sendBtn) {
            sendBtn.style.cssText = `
                padding: 8px 12px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.2s;
                flex-shrink: 0;
                white-space: nowrap;
            `;
        }
        
        const status = widget.querySelector('.chat-status');
        if (status) {
            status.style.cssText = `
                text-align: center;
                padding: 4px 3px;
                border-top: 1px solid #333;
                background: #1D1D1D;
                flex-shrink: 0;
                min-height: 16px;
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
            `;
            
            const statusText = status.querySelector('small');
            if (statusText) {
                statusText.style.cssText = `
                    font-size: 11px;
                    color: #666;
                `;
            }
        }
        `;
        
        // Add flow export status indicator
        const flowStatus = document.createElement('div');
        flowStatus.id = 'flow-export-status';
        flowStatus.style.cssText = `
            font-size: 10px;
            color: #007bff;
            margin-top: 4px;
            padding: 2px 6px;
            background: transparent;
            border-radius: 3px;
            display: inline-block;
        `;
        flowStatus.textContent = 'Flow state unknown';
        status.appendChild(flowStatus);
        
        // Add hover effects
        minimizeBtn.addEventListener('mouseenter', () => {
            minimizeBtn.style.backgroundColor = 'rgba(255,255,255,0.1)';
        });
        minimizeBtn.addEventListener('mouseleave', () => {
            minimizeBtn.style.backgroundColor = 'transparent';
        });
        
        newWindowBtn.addEventListener('mouseenter', () => {
            newWindowBtn.style.backgroundColor = 'rgba(255,255,255,0.1)';
        });
        newWindowBtn.addEventListener('mouseleave', () => {
            newWindowBtn.style.backgroundColor = 'transparent';
        });
        
        sendBtn.addEventListener('mouseenter', () => {
            sendBtn.style.backgroundColor = '#0056b3';
        });
        sendBtn.addEventListener('mouseleave', () => {
            sendBtn.style.backgroundColor = '#007bff';
        });
        
        document.body.appendChild(widget);
        
        // Add event listeners
        setupChatEvents(widget);
        
        // Debug RED object
        debugREDObject();
        
        // Start server connection monitoring (checks every 5 seconds)
        startServerConnectionMonitoring();
        
        // Add welcome message
        setTimeout(() => {
            addMessage("Welcome to NeuronGPT! Let me help you build a flow. Ask me any question you like, and I will guide you.", 'assistant');
        }, 500);
        
        // Start periodic checking for flows availability
        startFlowsAvailabilityCheck();
        
        // Add notification indicator for minimized state
        addNotificationIndicator(widget);
        
        return widget;
    }
    
    // Server connection state management
    let serverConnectionState = 'unknown';
    let connectionRetryCount = 0;
    let connectionRetryTimeout = null;
    
    // Check if external server is available with comprehensive error handling
    async function checkServerConnection() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await fetch(`${CONFIG.serverUrl}${CONFIG.healthEndpoint}`, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                if (serverConnectionState !== 'connected') {
                    serverConnectionState = 'connected';
                    connectionRetryCount = 0;
                updateStatus('Connected to external server', 'success');
                    
                    // If flows are available, we can now check flow state
                    if (window.flowsAvailable) {
                        checkFlowStateWithServer();
                    }
                }
                return true;
            } else {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
                updateStatus('Server connection timeout', 'error');
            } else if (error.message.includes('fetch')) {
                updateStatus('Network error - cannot reach server', 'error');
            } else {
                updateStatus('Server error - please try again', 'error');
            }
            
            serverConnectionState = 'disconnected';
            updateFlowStateUnknown();
            
            // Schedule retry with exponential backoff
            scheduleConnectionRetry();
            return false;
        }
    }
    
    // Update flow state to unknown when server is disconnected
    function updateFlowStateUnknown() {
            const flowStatusEl = document.getElementById('flow-export-status');
            if (flowStatusEl) {
            flowStatusEl.textContent = 'Flow state unknown';
            flowStatusEl.style.background = 'transparent';
            flowStatusEl.style.color = '#6c757d'; // Gray color for unknown state
        }
    }
    
    // Schedule connection retry with exponential backoff
    function scheduleConnectionRetry() {
        if (connectionRetryTimeout) {
            clearTimeout(connectionRetryTimeout);
        }
        
        const baseDelay = 10000; // 10 seconds base
        const maxDelay = 60000; // 1 minute max
        const delay = Math.min(baseDelay * Math.pow(2, connectionRetryCount), maxDelay);
        
        connectionRetryTimeout = setTimeout(() => {
            connectionRetryCount++;
            checkServerConnection();
        }, delay);
    }
    
    // Check flow state only when server is confirmed connected
    async function checkFlowStateWithServer() {
        if (serverConnectionState !== 'connected') {
            return;
        }
        
        try {
            // Attempt a simple flow sync to verify server can handle flow operations
            const testFlow = getCurrentFlowContext();
            if (testFlow) {
                // Only attempt flow sync if authenticated
                if (!isUserAuthenticated()) {
                    updateFlowExportStatus('Authentication required', 'unknown');
                    return;
                }

                const response = await fetch(`${CONFIG.serverUrl}/api/flow-sync`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authState.accessToken}`
                    },
                    body: JSON.stringify({
                        action: 'sync_flow_context',
                        reason: 'test',
                        flowContext: testFlow,
                        timestamp: new Date().toISOString()
                    })
                });
                
                if (response.ok) {
                    updateFlowExportStatus('Flow state synced', 'success');
                } else {
                    throw new Error(`Flow sync test failed: ${response.status}`);
                }
            }
        } catch (error) {
            updateFlowExportStatus('Flow state unknown', 'unknown');
        }
    }
    
    // Handle server reconnection and flow state updates
    function handleServerReconnection() {
        // If flows are available, initialize flow sync
        if (window.flowsAvailable && !window.flowSyncInitialized) {
            // Don't set the flag here - let initializeFlowSync() do it after setting up listeners
            initializeFlowSync();
        }
        
        // Update flow state to show we can now sync
        if (window.flowsAvailable) {
            updateFlowExportStatus('Flow state ready', 'success');
        }
    }
    
    // Monitor for server state changes and trigger appropriate actions
    function monitorServerStateChanges() {
        let previousState = serverConnectionState;
        
        // Check for state changes every second
        setInterval(() => {
            if (serverConnectionState !== previousState) {
                if (serverConnectionState === 'connected' && previousState !== 'connected') {
                    // Server just connected
                    handleServerReconnection();
                } else if (serverConnectionState === 'disconnected' && previousState === 'connected') {
                    // Server just disconnected
                    updateFlowStateUnknown();
                }
                
                previousState = serverConnectionState;
            }
        }, 1000);
    }
    

    
    // Start periodic server connection monitoring
    function startServerConnectionMonitoring() {
        // Set initial status
        updateStatus('Checking server connection...', 'info');
        updateFlowStateUnknown();
        
        // Start monitoring for state changes
        monitorServerStateChanges();
        
        // Check immediately
        checkServerConnection();
        
        // Then check every 10 seconds (less aggressive)
        setInterval(checkServerConnection, 10000);
        

    }
    
    // Check if flows become available after widget creation
    function checkForFlowsAvailability() {
        if (typeof RED !== 'undefined' && RED.nodes && 
            (RED.nodes.createCompleteNodeSet || RED.nodes.eachNode) && !window.flowsAvailable) {
            window.flowsAvailable = true;
            
            // Only initialize flow sync if server is connected
            if (serverConnectionState === 'connected') {
                initializeFlowSync();
            }
            // Flow sync will be initialized when server connects
        }
    }
    
    // Start periodic checking for flows availability
    function startFlowsAvailabilityCheck() {
        // Check immediately
        checkForFlowsAvailability();
        
        // Then check every 2 seconds
        setInterval(checkForFlowsAvailability, 2000);
    }
    
    // Flow synchronization system
    let lastFlowHash = null;
    let flowSyncInProgress = false;
    let flowHasChanged = false;
    let lastSyncTime = null;
    
    // Initialize flow synchronization when flows become available
    function initializeFlowSync() {
        if (window.flowSyncInitialized) {
            return; // Already initialized
        }
        
        if (flowSyncInProgress) {
            // Schedule retry in 2 seconds
            setTimeout(() => initializeFlowSync(), 2000);
            return;
        }
        
        // Set up event listeners for flow changes
        if (RED.events && typeof RED.events.on === 'function') {
            // Listen for flow changes
            RED.events.on('flows:change', handleFlowChange);
            
            // Listen for workspace changes (indicates flow modifications)
            RED.events.on('workspace:dirty', handleFlowChange);
            
            // Listen for node additions/deletions
            RED.events.on('nodes:add', handleFlowChange);
            
            RED.events.on('nodes:remove', handleFlowChange);
            
            // Listen for node property changes
            RED.events.on('nodes:change', handleFlowChange);
            
            // Listen for connection changes
            RED.events.on('connections:add', handleFlowChange);
            
            RED.events.on('connections:remove', handleFlowChange);
            
            // Listen for flow deployment
            RED.events.on('flows:deploy', handleFlowChange);
            
            // Mark as initialized AFTER event listeners are set up
            window.flowSyncInitialized = true;
        } else {
            // Mark as initialized even if events aren't available
            window.flowSyncInitialized = true;
        }
        
        // Do initial flow sync
        setTimeout(() => {
            syncFlowContext('initial');
        }, 1000); // Wait 1 second for flows to be fully loaded
    }
    
    // Handle flow changes and trigger synchronization
    function handleFlowChange(eventData) {
        // Mark that flow has changed
        flowHasChanged = true;
        
        // Debounce rapid changes
        if (flowSyncInProgress) {
            return;
        }
        
        // Wait a bit to avoid multiple rapid syncs
        setTimeout(() => {
            syncFlowContext('change');
        }, 500);
    }
    
    // Synchronize flow context with the server
    async function syncFlowContext(reason) {
        if (flowSyncInProgress) {
            console.log('🔍 [FLOW SYNC] Sync already in progress, skipping...');
            return;
        }
        
        // Check server connection state before attempting sync
        if (serverConnectionState !== 'connected') {
            console.log('🔍 [FLOW SYNC] Server not connected, cannot sync');
            updateFlowStateUnknown();
            return;
        }
        
        flowSyncInProgress = true;
        console.log(`🔍 [FLOW SYNC] Starting flow sync (reason: ${reason})...`);
        
        // Update flow export status
        const flowStatusEl = document.getElementById('flow-export-status');
        if (flowStatusEl) {
            flowStatusEl.textContent = 'Flow state syncing...';
            flowStatusEl.style.background = 'transparent';
            flowStatusEl.style.color = '#007bff';
        }
        
        try {
            // Get current flow context
            const flowContext = getCurrentFlowContext();
            console.log('🔍 [FLOW SYNC] Flow context retrieved:', {
                exists: !!flowContext,
                flowName: flowContext?.flowName,
                nodeCount: flowContext?.nodeCount,
                connectionCount: flowContext?.connectionCount
            });
            
            if (!flowContext) {
                console.log('🔍 [FLOW SYNC] No flow context available, skipping sync');
                
                // Update status to show error
                if (flowStatusEl) {
                    flowStatusEl.textContent = 'No data available';
                    flowStatusEl.style.background = 'transparent';
                    flowStatusEl.style.color = '#dc3545';
                }
                
                flowSyncInProgress = false;
                return;
            }
            
            // Create a hash of the flow to detect material changes
            const flowHash = createFlowHash(flowContext);
            
            if (reason === 'change' && flowHash === lastFlowHash) {
                console.log('🔍 [FLOW SYNC] Flow hash unchanged, no material change detected');
                
                // Update status to show no change
                if (flowStatusEl) {
                    flowStatusEl.textContent = 'Flow state synced';
                    flowStatusEl.style.background = 'transparent';
                    flowStatusEl.style.color = '#28a745';
                }
                
                flowSyncInProgress = false;
                return;
            }
            
            // Send flow context to server
            const response = await sendFlowContextToServer(flowContext, reason);
            
            if (response.success) {
                // Update last flow hash
                lastFlowHash = flowHash;
                
                // Reset change flag for all successful syncs
                flowHasChanged = false;
                
                // Show appropriate status message
                if (reason === 'initial') {
                    updateStatus('Flow context loaded', 'success');
                } else if (reason === 'change') {
                    updateStatus('Flow context updated', 'success');
                } else if (reason === 'pre-message') {
                    updateStatus('Flow context synced before message', 'success');
                }
                
                // Update flow export status to show success
                if (flowStatusEl) {
                    flowStatusEl.textContent = 'Flow state synced';
                    flowStatusEl.style.background = 'transparent';
                    flowStatusEl.style.color = '#28a745';
                }
                
                console.log(`🔍 [FLOW SYNC] Flow sync completed successfully (${reason})`);
            } else {
                console.error('🔍 [FLOW SYNC] Server returned error:', response.error);
                updateStatus('Flow sync failed', 'error');
                
                // Update flow export status to show error
                if (flowStatusEl) {
                    flowStatusEl.textContent = 'Server error';
                    flowStatusEl.style.background = 'transparent';
                    flowStatusEl.style.color = '#dc3545';
                }
            }
            
        } catch (error) {
            console.error('🔍 [FLOW SYNC] Flow sync failed:', error);
            updateStatus('Flow sync error', 'error');
            
            // Update flow export status to show error
            if (flowStatusEl) {
                flowStatusEl.textContent = 'Error occurred';
                flowStatusEl.style.background = 'transparent';
                flowStatusEl.style.color = '#dc3545';
            }
        } finally {
            flowSyncInProgress = false;
        }
    }
    
    // Create a hash of the flow context to detect material changes
    function createFlowHash(flowContext) {
        const flowString = JSON.stringify({
            flowName: flowContext.flowName,
            nodeCount: flowContext.nodeCount,
            connectionCount: flowContext.connectionCount,
            nodeTypes: flowContext.nodeTypes,
            neuronNodes: flowContext.neuronNodes,
            connections: flowContext.connections,
            subflows: flowContext.subflows,
            flowAnalysis: flowContext.flowAnalysis
        });
        
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < flowString.length; i++) {
            const char = flowString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }
    
    // Send flow context to server for synchronization
    async function sendFlowContextToServer(flowContext, reason) {
        // Get the raw Node-RED JSON for detailed analysis
        let rawFlowJson = null;
        console.log('🔍 [FLOW SYNC] Attempting to get raw flow JSON...');
        console.log('🔍 [FLOW SYNC] RED available:', typeof RED !== 'undefined');
        console.log('🔍 [FLOW SYNC] RED.nodes available:', !!RED?.nodes);
        console.log('🔍 [FLOW SYNC] createCompleteNodeSet available:', !!RED?.nodes?.createCompleteNodeSet);
        
        try {
            if (RED && RED.nodes && typeof RED.nodes.createCompleteNodeSet === 'function') {
                rawFlowJson = RED.nodes.createCompleteNodeSet();
                console.log('🔍 [FLOW SYNC] Raw JSON retrieved successfully:', {
                    type: typeof rawFlowJson,
                    isArray: Array.isArray(rawFlowJson),
                    length: rawFlowJson?.length,
                    firstNode: rawFlowJson?.[0]?.type
                });
            } else {
                console.warn('🔍 [FLOW SYNC] RED.nodes.createCompleteNodeSet not available');
            }
        } catch (error) {
            console.error('🔍 [FLOW SYNC] Error getting raw flow JSON:', error);
        }
        
        const requestBody = {
            action: 'sync_flow_context',
            reason: reason,
            flowContext: flowContext,
            rawFlowJson: rawFlowJson,  // Include raw JSON for server storage
            timestamp: new Date().toISOString()
        };
        
        console.log('🔍 [FLOW SYNC] Request body prepared:', {
            reason: reason,
            flowContextExists: !!flowContext,
            rawJsonExists: !!rawFlowJson,
            rawJsonLength: rawFlowJson?.length
        });
        

        
        try {
            // Only attempt flow sync if authenticated
            if (!isUserAuthenticated()) {
                console.log('🔍 [FLOW SYNC] Authentication required for flow sync');
                throw new Error('Authentication required');
            }

            const response = await fetch(`${CONFIG.serverUrl}/api/flow-sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authState.accessToken}`
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            const responseData = await response.json();
            console.log('🔍 [FLOW SYNC] Server response:', responseData);
            
            return responseData;
            
        } catch (error) {
            console.error('🔍 [FLOW SYNC] Error sending flow context:', error);
            throw error;
        }
    }
    
    // Debug function to inspect RED object
    function debugREDObject() {
        console.log('🔍 [RED DEBUG] ===== RED OBJECT INSPECTION =====');
        
        if (typeof RED === 'undefined') {
            console.log('🔍 [RED DEBUG] RED object is NOT defined');
            return;
        }
        
        console.log('🔍 [RED DEBUG] RED object exists');
        console.log('🔍 [RED DEBUG] RED object type:', typeof RED);
        console.log('🔍 [RED DEBUG] RED object keys:', Object.keys(RED));
        
        // Check each major component
        const components = ['nodes', 'flows', 'editor', 'view', 'menu', 'events', 'user', 'settings'];
        components.forEach(comp => {
            if (RED[comp]) {
                console.log(`🔍 [RED DEBUG] RED.${comp} exists:`, typeof RED[comp]);
                if (typeof RED[comp] === 'object') {
                    console.log(`🔍 [RED DEBUG] RED.${comp} keys:`, Object.keys(RED[comp]));
                }
            } else {
                console.log(`🔍 [RED DEBUG] RED.${comp} is NOT available`);
            }
        });
        
        // Special check for flows
        if (RED.flows) {
            console.log('🔍 [RED DEBUG] RED.flows methods:', Object.getOwnPropertyNames(RED.flows));
            console.log('🔍 [RED DEBUG] RED.flows prototype:', Object.getPrototypeOf(RED.flows));
        }
        
        console.log('🔍 [RED DEBUG] ===== END INSPECTION =====');
    }
    
    // Update status message with inline styling
    function updateStatus(message, type) {
        const statusEl = document.querySelector('.chat-status small');
        if (statusEl) {
            statusEl.textContent = message;
            // Apply status-specific colors inline
            if (type === 'success') {
                statusEl.style.color = '#28a745';
            } else if (type === 'error') {
                statusEl.style.color = '#dc3545';
            } else if (type === 'connecting') {
                statusEl.style.color = '#ffc107';
            } else if (type === 'info') {
                statusEl.style.color = '#007bff';
            } else {
                statusEl.style.color = '#666';
            }
        }
    }
    
    // Get current flow context from Node-RED
    function getCurrentFlowContext() {
        try {
            // Check if Node-RED is available
            if (typeof RED === 'undefined') {
                return null;
            }
            
            // Strategy 1: Use RED.nodes.createCompleteNodeSet() - this is the OFFICIAL way to export flows
            if (RED.nodes && typeof RED.nodes.createCompleteNodeSet === 'function') {
                try {
                    const completeFlow = RED.nodes.createCompleteNodeSet({ credentials: false, dimensions: false });
                    if (completeFlow && Array.isArray(completeFlow)) {
                        return extractFlowContextFromCompleteFlow(completeFlow);
                    }
                } catch (error) {
                    // Fall through to next strategy
                }
            }
            
            // Strategy 2: Use RED.nodes.eachNode to manually collect flow data
            if (RED.nodes && typeof RED.nodes.eachNode === 'function') {
                return extractFlowContextFromEachNode();
            }
            
            // Strategy 3: Try to access workspaces and subflows directly
            if (RED.nodes && RED.nodes.workspaces) {
                return extractFlowContextFromWorkspaces();
            }
            
            return null;
            
        } catch (error) {
            return null;
        }
    }
    
    // Extract flow context from the complete node set (official method)
    function extractFlowContextFromCompleteFlow(completeFlow) {
        
        const flowContext = {
            flowName: 'Unknown Flow',
            flowId: 'complete',
            nodeCount: 0,
            connectionCount: 0,
            nodeTypes: [],
            neuronNodes: [],
            hasConnections: false,
            workspaces: [],
            subflows: [],
            groups: [],
            junctions: [],
            connections: [],
            flowAnalysis: ''
        };
        
        // Count and categorize nodes using the same logic as the AI
        const nodeTypes = new Set();
        const neuronNodes = [];
        const connections = [];
        let activeWorkspace = null;
        let tabIds = new Set();
        
        // First pass: identify all tab IDs and find the currently active flow
        let activeTabId = null;
        let activeTab = null;
        
        completeFlow.forEach(item => {
            if (item.type === 'tab') {
                tabIds.add(item.id);
                
                // Try to identify the currently active flow
                // Check if this tab is selected/active (Node-RED sets selected: true on the active tab)
                if (item.selected === true || (!activeTab && !item.disabled)) {
                    activeTabId = item.id;
                    activeTab = item;
                }
            }
        });
        
        // If no active tab found, use the first non-disabled tab
        if (!activeTab) {
            const firstTab = completeFlow.find(item => item.type === 'tab' && !item.disabled);
            if (firstTab) {
                activeTabId = firstTab.id;
                activeTab = firstTab;
            }
        }
        
        // Set the active flow context
        if (activeTab) {
            flowContext.flowName = activeTab.label || 'Unnamed Flow';
            flowContext.flowId = activeTab.id;
            activeWorkspace = activeTab;
            
            console.log('🔍 [FLOW SELECTION] Active flow identified:', {
                id: activeTab.id,
                name: activeTab.label,
                selected: activeTab.selected,
                disabled: activeTab.disabled
            });
        } else {
            console.warn('⚠️ [FLOW SELECTION] No active flow found!');
        }
        
        console.log('🔍 [FLOW SELECTION] All tabs found:', Array.from(tabIds));
        console.log('🔍 [FLOW SELECTION] Active tab ID:', activeTabId);
        
        completeFlow.forEach(item => {
            if (item.type === 'tab') {
                flowContext.workspaces.push({
                    id: item.id,
                    label: item.label || 'Unnamed Tab',
                    disabled: item.disabled || false,
                    isActive: item.id === activeTabId
                });
            } else if (item.type === 'subflow') {
                // Only count subflows that belong to the active flow
                if (item.z === activeTabId) {
                    // Count internal nodes for this subflow
                    const internalNodes = completeFlow.filter(subItem => 
                        subItem.z === item.id && 
                        subItem.hasOwnProperty('x') && 
                        subItem.hasOwnProperty('y')
                    );
                    
                flowContext.subflows.push({
                    id: item.id,
                    name: item.name || 'Unnamed Subflow',
                    inputs: item.in?.length || 0,
                        outputs: item.out?.length || 0,
                        internalNodeCount: internalNodes.length
                });
                }
            } else if (item.type === 'group') {
                flowContext.groups.push({
                    id: item.id,
                    label: item.label || 'Unnamed Group'
                });
            } else if (item.type === 'junction') {
                flowContext.junctions.push({
                    id: item.id
                });
            } else if (item.hasOwnProperty('x') && item.hasOwnProperty('y')) {
                // Only count nodes that are descendants of the ACTIVE tab (top-level nodes)
                if (item.z && item.z === activeTabId) {
                    // This is a top-level node in the currently active flow
                flowContext.nodeCount++;
                nodeTypes.add(item.type);
                
                // Check if it's a Neuron-related node
                if (item.type.includes('neuron') || 
                    item.type.includes('buyer') || 
                    item.type.includes('seller') ||
                    item.type.includes('p2p') ||
                    item.type.includes('contract')) {
                    neuronNodes.push({
                        type: item.type,
                        name: item.name || item.type, // Use type if no name
                        id: item.id
                    });
                }
                }
                // Note: Internal subflow nodes are not counted in the total
            }
        });
        
        // Extract connections from the flow data using the correct Node-RED algorithm
        console.log('🔍 [FLOW DEBUG] Starting connection extraction from', completeFlow.length, 'items');
        
        completeFlow.forEach((item, index) => {
            if (item.wires && Array.isArray(item.wires)) {
                console.log(`🔍 [FLOW DEBUG] Item ${index}: ${item.type} (${item.id}) has ${item.wires.length} output ports`);
                console.log(`🔍 [FLOW DEBUG] Wires array:`, JSON.stringify(item.wires));
                
                // This item has output connections
                item.wires.forEach((targetNodes, outputPortIndex) => {
                    if (Array.isArray(targetNodes)) {
                        console.log(`🔍 [FLOW DEBUG] Port ${outputPortIndex} has ${targetNodes.length} targets:`, targetNodes);
                        targetNodes.forEach(targetNodeId => {
                            // Find the target node
                            const targetNode = completeFlow.find(n => n.id === targetNodeId);
                            if (targetNode) {
                                    connections.push({
                                        from: {
                                            nodeId: item.id,
                                            nodeName: item.name || item.type,
                                            nodeType: item.type,
                                        port: outputPortIndex
                                        },
                                        to: {
                                            nodeId: targetNode.id,
                                            nodeName: targetNode.name || targetNode.type,
                                            nodeType: targetNode.type,
                                        port: 0  // Node-RED doesn't expose input port info in JSON
                                        }
                                    });
                                console.log(`🔍 [FLOW DEBUG] Added connection: ${item.type} → ${targetNode.type}`);
                            } else {
                                console.log(`🔍 [FLOW DEBUG] Target node ${targetNodeId} not found in flow`);
                            }
                        });
                    } else {
                        console.log(`🔍 [FLOW DEBUG] Port ${outputPortIndex} has non-array targets:`, targetNodes);
                    }
                });
            } else {
                if (index < 5) { // Only log first few items to avoid spam
                    console.log(`🔍 [FLOW DEBUG] Item ${index}: ${item.type} (${item.id}) - no wires or invalid wires:`, item.wires);
                }
            }
        });
        
        flowContext.connections = connections;
        flowContext.connectionCount = connections.length;
        flowContext.hasConnections = connections.length > 0;
        flowContext.nodeTypes = Array.from(nodeTypes);
        flowContext.neuronNodes = neuronNodes;
        
        // Generate flow analysis
        flowContext.flowAnalysis = generateFlowAnalysis(flowContext);
        
        // Log connection details for debugging
        console.log('🔍 [FLOW DEBUG] Connection analysis:');
        console.log('  - Total connections found:', connections.length);
        if (connections.length > 0) {
            console.log('  - Sample connections:');
            connections.slice(0, 3).forEach((conn, i) => {
                console.log(`    ${i + 1}. ${conn.from.nodeType} (${conn.from.nodeName}) [port ${conn.from.port}] → ${conn.to.nodeType} (${conn.to.nodeName})`);
            });
        }
        console.log('🔍 [FLOW DEBUG] Complete flow context extracted for ACTIVE flow:', flowContext);
        return flowContext;
    }
    
    // Generate intelligent analysis of what the flow does
    function generateFlowAnalysis(flowContext) {
        const analysis = [];
        
        // Analyze node types to understand the flow purpose
        const hasInject = flowContext.nodeTypes.includes('inject');
        const hasHTTP = flowContext.nodeTypes.includes('http request');
        const hasFunction = flowContext.nodeTypes.includes('function');
        const hasDelay = flowContext.nodeTypes.includes('delay');
        const hasNeuronNodes = flowContext.neuronNodes.length > 0;
        const hasSubflows = flowContext.subflows.length > 0;
        
        // Basic flow structure analysis
        if (hasInject && hasHTTP) {
            analysis.push("This appears to be a data processing flow that starts with an inject trigger and makes HTTP requests");
        }
        
        if (hasFunction) {
            analysis.push("Includes custom logic processing via Function nodes");
        }
        
        if (hasDelay) {
            analysis.push("Implements timing controls or rate limiting");
        }
        
        // Neuron-specific analysis
        if (hasNeuronNodes) {
            const neuronNodeTypes = flowContext.neuronNodes.map(n => n.type);
            
            if (neuronNodeTypes.some(t => t.includes('seller'))) {
                analysis.push("Configured for Neuron selling operations");
            }
            
            if (neuronNodeTypes.some(t => t.includes('p2p'))) {
                analysis.push("Implements peer-to-peer functionality");
            }
            
            if (neuronNodeTypes.some(t => t.includes('buyer'))) {
                analysis.push("Configured for Neuron buying operations");
            }
        }
        
        // Connection analysis
        if (flowContext.hasConnections) {
            analysis.push(`Has ${flowContext.connectionCount} connections between nodes, indicating active data flow`);
        } else {
            analysis.push("No connections detected - nodes are not yet wired together");
        }
        
        // Subflow analysis
        if (hasSubflows) {
            const subflowDetails = flowContext.subflows.map(subflow => 
                `${subflow.name} (${subflow.inputs} inputs, ${subflow.outputs} outputs, ${subflow.internalNodeCount} internal nodes)`
            );
            analysis.push(`Uses ${flowContext.subflows.length} subflow(s) for modular functionality: ${subflowDetails.join(', ')}`);
        }
        
        // Overall assessment
        if (analysis.length === 0) {
            analysis.push("This appears to be a basic Node-RED flow setup");
        }
        
        return analysis.join('. ') + '.';
    }
    
    // Extract flow context by manually iterating through nodes
    function extractFlowContextFromEachNode() {
        console.log('🔍 [FLOW DEBUG] Manually collecting flow data...');
        
        const flowContext = {
            flowName: 'Unknown Flow',
            flowId: 'manual',
            nodeCount: 0,
            connectionCount: 0,
            nodeTypes: [],
            neuronNodes: [],
            hasConnections: false,
            workspaces: [],
            subflows: [],
            groups: [],
            junctions: [],
            connections: [],
            flowAnalysis: ''
        };
        
        const nodeTypes = new Set();
        const neuronNodes = [];
        const connections = [];
        let activeWorkspace = null;
        
        // Collect regular nodes
        RED.nodes.eachNode(function(node) {
            flowContext.nodeCount++;
            nodeTypes.add(node.type);
            
            // Check if it's a Neuron-related node
            if (node.type.includes('neuron') || 
                node.type.includes('buyer') || 
                node.type.includes('seller') ||
                node.type.includes('p2p') ||
                node.type.includes('contract')) {
                neuronNodes.push({
                    type: node.type,
                    name: node.name || node.type, // Use type if no name
                    id: node.id
                });
            }
        });
        
        // Collect config nodes
        RED.nodes.eachConfig(function(configNode) {
            nodeTypes.add(configNode.type);
        });
        
        // Collect subflows
        RED.nodes.eachSubflow(function(subflow) {
            flowContext.subflows.push({
                id: subflow.id,
                name: subflow.name || 'Unnamed Subflow',
                inputs: subflow.in?.length || 0,
                outputs: subflow.out?.length || 0
            });
        });
        
        // Collect groups
        RED.nodes.eachGroup(function(group) {
            flowContext.groups.push({
                id: group.id,
                label: group.label || 'Unnamed Group'
            });
        });
        
        // Collect junctions
        RED.nodes.eachJunction(function(junction) {
            flowContext.junctions.push({
                id: junction.id
            });
        });
        
        // Collect workspaces and get the active one
        RED.nodes.eachWorkspace(function(workspace) {
            if (workspace.type === 'tab') {
                if (!activeWorkspace) {
                    activeWorkspace = workspace;
                    flowContext.flowName = workspace.label || 'Unnamed Flow';
                    flowContext.flowId = workspace.id;
                }
                
                flowContext.workspaces.push({
                    id: workspace.id,
                    label: workspace.label || 'Unnamed Tab',
                    disabled: workspace.disabled || false
                });
            }
        });
        
        // Try to extract connections if possible
        try {
            // Use the complete node set to get connection information
            if (RED.nodes.createCompleteNodeSet) {
                const completeFlow = RED.nodes.createCompleteNodeSet({ credentials: false, dimensions: false });
                if (completeFlow && Array.isArray(completeFlow)) {
                    // Extract connections from complete flow
                    completeFlow.forEach(item => {
                        if (item.wires) {
                            Object.keys(item.wires).forEach(portIndex => {
                                const port = parseInt(portIndex);
                                const targetNodes = item.wires[portIndex];
                                
                                if (Array.isArray(targetNodes)) {
                                    targetNodes.forEach(targetNodeId => {
                                        const targetNode = completeFlow.find(n => n.id === targetNodeId);
                                        if (targetNode && targetNode.inputs) {
                                            const inputPort = targetNode.inputs.findIndex(input => 
                                                input.links && input.links.includes(item.id)
                                            );
                                            
                                            if (inputPort !== -1) {
                                                connections.push({
                                                    from: {
                                                        nodeId: item.id,
                                                        nodeName: item.name || item.type,
                                                        nodeType: item.type,
                                                        port: port
                                                    },
                                                    to: {
                                                        nodeId: targetNode.id,
                                                        nodeName: targetNode.name || targetNode.type,
                                                        nodeType: targetNode.type,
                                                        port: inputPort
                                                    }
                                                });
                                            }
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            }
        } catch (error) {
            console.log('🔍 [FLOW DEBUG] Could not extract connections manually:', error);
        }
        
        flowContext.connections = connections;
        flowContext.connectionCount = connections.length;
        flowContext.hasConnections = connections.length > 0;
        flowContext.nodeTypes = Array.from(nodeTypes);
        flowContext.neuronNodes = neuronNodes;
        
        // Generate flow analysis
        flowContext.flowAnalysis = generateFlowAnalysis(flowContext);
        
        console.log('🔍 [FLOW DEBUG] Manual flow context extracted:', flowContext);
        return flowContext;
    }
    
    // Extract flow context from workspaces directly
    function extractFlowContextFromWorkspaces() {
        console.log('🔍 [FLOW DEBUG] Accessing workspaces directly...');
        
        const flowContext = {
            flowName: 'Unknown Flow',
            flowId: 'workspace',
            nodeCount: 0,
            connectionCount: 0,
            nodeTypes: [],
            neuronNodes: [],
            hasConnections: false,
            workspaces: [],
            subflows: [],
            groups: [],
            junctions: [],
            connections: [],
            flowAnalysis: ''
        };
        
        let activeWorkspace = null;
        
        try {
            // Access workspaces directly
            if (RED.nodes.workspaces && typeof RED.nodes.workspaces === 'function') {
                const workspaces = RED.nodes.workspaces();
                console.log('🔍 [FLOW DEBUG] Workspaces result:', workspaces);
                
                if (Array.isArray(workspaces)) {
                    workspaces.forEach(workspace => {
                        if (workspace.type === 'tab') {
                            if (!activeWorkspace) {
                                activeWorkspace = workspace;
                                flowContext.flowName = workspace.label || 'Unnamed Flow';
                                flowContext.flowId = workspace.id;
                            }
                            
                            flowContext.workspaces.push({
                                id: workspace.id,
                                label: workspace.label || 'Unnamed Tab',
                                disabled: workspace.disabled || false
                            });
                        }
                    });
                }
            }
            
            // Try to access other collections
            if (RED.nodes.subflows && typeof RED.nodes.subflows === 'function') {
                const subflows = RED.nodes.subflows();
                if (Array.isArray(subflows)) {
                    subflows.forEach(subflow => {
                        flowContext.subflows.push({
                            id: subflow.id,
                            name: subflow.name || 'Unnamed Subflow',
                            inputs: subflow.in?.length || 0,
                            outputs: subflow.out?.length || 0
                        });
                    });
                }
            }
            
            if (RED.nodes.groups && typeof RED.nodes.groups === 'function') {
                const groups = RED.nodes.groups();
                if (Array.isArray(groups)) {
                    groups.forEach(group => {
                        flowContext.groups.push({
                            id: group.id,
                            label: group.label || 'Unnamed Group'
                        });
                    });
                }
            }
            
            if (RED.nodes.junctions && typeof RED.nodes.junctions === 'function') {
                const junctions = RED.nodes.junctions();
                if (Array.isArray(junctions)) {
                    junctions.forEach(junction => {
                        flowContext.junctions.push({
                            id: junction.id
                        });
                    });
                }
            }
            
            // Try to get complete flow data for connections and node analysis
            if (RED.nodes.createCompleteNodeSet) {
                const completeFlow = RED.nodes.createCompleteNodeSet({ credentials: false, dimensions: false });
                if (completeFlow && Array.isArray(completeFlow)) {
                    // Count nodes and extract connections
                    const nodeTypes = new Set();
                    const neuronNodes = [];
                    const connections = [];
                    
                    completeFlow.forEach(item => {
                        if (item.hasOwnProperty('x') && item.hasOwnProperty('y')) {
                            // This is a regular node
                            flowContext.nodeCount++;
                            nodeTypes.add(item.type);
                            
                            // Check if it's a Neuron-related node
                            if (item.type.includes('neuron') || 
                                item.type.includes('buyer') || 
                                item.type.includes('seller') ||
                                item.type.includes('p2p') ||
                                item.type.includes('contract')) {
                                neuronNodes.push({
                                    type: item.type,
                                    name: item.name || item.type, // Use type if no name
                                    id: item.id
                                });
                            }
                        }
                        
                        // Extract connections
                        if (item.wires) {
                            Object.keys(item.wires).forEach(portIndex => {
                                const port = parseInt(portIndex);
                                const targetNodes = item.wires[portIndex];
                                
                                if (Array.isArray(targetNodes)) {
                                    targetNodes.forEach(targetNodeId => {
                                        const targetNode = completeFlow.find(n => n.id === targetNodeId);
                                        if (targetNode && targetNode.inputs) {
                                            const inputPort = targetNode.inputs.findIndex(input => 
                                                input.links && input.links.includes(item.id)
                                            );
                                            
                                            if (inputPort !== -1) {
                                                connections.push({
                                                    from: {
                                                        nodeId: item.id,
                                                        nodeName: item.name || item.type,
                                                        nodeType: item.type,
                                                        port: port
                                                    },
                                                    to: {
                                                        nodeId: targetNode.id,
                                                        nodeName: targetNode.name || targetNode.type,
                                                        nodeType: targetNode.type,
                                                        port: inputPort
                                                    }
                                                });
                                            }
                                        }
                                    });
                                }
                            });
                        }
                    });
                    
                    flowContext.nodeTypes = Array.from(nodeTypes);
                    flowContext.neuronNodes = neuronNodes;
                    flowContext.connections = connections;
                    flowContext.connectionCount = connections.length;
                    flowContext.hasConnections = connections.length > 0;
                }
            }
            
        } catch (error) {
            console.error('🔍 [FLOW DEBUG] Error accessing workspaces directly:', error);
        }
        
        // Generate flow analysis
        flowContext.flowAnalysis = generateFlowAnalysis(flowContext);
        
        console.log('🔍 [FLOW DEBUG] Workspace flow context extracted:', flowContext);
        return flowContext;
    }
    
    // Setup chat functionality
    function setupChatEvents(widget) {
        const input = widget.querySelector('.chat-input');
        const sendBtn = widget.querySelector('.chat-send');
        const messages = widget.querySelector('.chat-messages');
        const minimizeBtn = widget.querySelector('.chat-minimize');
        
        // Send message
        async function sendMessage() {
            const text = input.value.trim();
            if (!text) return;
            
            console.log('🔍 [MESSAGE DEBUG] Starting message send process...');
            console.log('🔍 [MESSAGE DEBUG] Message text:', text);
            
            // Check if flow sync is needed before sending
            console.log('🔍 [MESSAGE DEBUG] Checking if flow sync is needed...');
            console.log('🔍 [MESSAGE DEBUG] flowHasChanged:', flowHasChanged);
            
            if (flowHasChanged) {
                console.log('🔍 [MESSAGE DEBUG] Flow changes detected, syncing before message...');
                
                // Check server connection state before attempting sync
                if (serverConnectionState !== 'connected') {
                    console.log('🔍 [MESSAGE DEBUG] Server not connected, cannot sync');
                    updateFlowExportStatus('Flow state unknown', 'unknown');
                    // Continue with message anyway, but mark flow state as unknown
                } else {
                    // Show sync status
                    updateFlowExportStatus('Flow state syncing...', 'syncing');
                    
                    try {
                        // Sync flow context
                        await syncFlowContext('pre-message');
                        flowHasChanged = false; // Reset change flag
                        lastSyncTime = Date.now();
                        
                        console.log('🔍 [MESSAGE DEBUG] Pre-message sync completed successfully');
                        updateFlowExportStatus('Flow state synced', 'success');
                    } catch (error) {
                        console.error('🔍 [MESSAGE DEBUG] Pre-message sync failed:', error);
                        updateFlowExportStatus('Sync failed', 'error');
                        // Continue with message anyway, but log the issue
                    }
                }
            } else {
                console.log('🔍 [MESSAGE DEBUG] No flow changes detected, proceeding with message...');
            }
            

            
            // Get current flow context
            console.log('🔍 [MESSAGE DEBUG] Getting flow context...');
            const flowContext = getCurrentFlowContext();
            console.log('🔍 [MESSAGE DEBUG] Flow context result:', flowContext);
            
            // Add user message
            addMessage(text, 'user');
            input.value = '';
            
            // Show typing indicator
            const typing = addTypingIndicator();
            
            try {
                // Send to external server with flow context
                console.log('🔍 [MESSAGE DEBUG] Sending to external server...');
                const response = await sendToExternalServer(text, flowContext);
                console.log('🔍 [MESSAGE DEBUG] Server response received:', response);
                
                typing.remove();
                addMessage(response.content, 'assistant');
                updateStatus('Connected to external server', 'success');
            } catch (error) {
                console.error('🔍 [MESSAGE DEBUG] Error sending message:', error);
                typing.remove();
                addMessage("Sorry, I'm having trouble connecting to the external server. Please check if the server is running.", 'assistant');
                updateStatus('Connection error', 'error');
            }
        }
        
        // Send message to external server with flow context
        async function sendToExternalServer(message, flowContext) {
            // Get the raw Node-RED JSON for detailed analysis
            let rawFlowJson = null;
            try {
                if (RED && RED.nodes && typeof RED.nodes.createCompleteNodeSet === 'function') {
                    rawFlowJson = RED.nodes.createCompleteNodeSet();
                }
            } catch (error) {
                console.warn('🔍 [SERVER DEBUG] Could not get raw flow JSON:', error);
            }
            
            const requestBody = {
                message: message,
                context: 'Neuron software context',
                flowContext: flowContext,  // Processed summary for quick overview
                rawFlowJson: rawFlowJson   // Raw JSON for detailed analysis
            };
            
            console.log('🔍 [SERVER DEBUG] Preparing request body...');
            console.log('🔍 [SERVER DEBUG] Full request body:', JSON.stringify(requestBody, null, 2));
            console.log('🔍 [SERVER DEBUG] Flow context in request:', requestBody.flowContext);
            if (requestBody.flowContext) {
                console.log('🔍 [SERVER DEBUG] Flow name:', requestBody.flowContext.flowName);
                console.log('🔍 [SERVER DEBUG] Node count:', requestBody.flowContext.nodeCount);
                console.log('🔍 [SERVER DEBUG] Connection count:', requestBody.flowContext.connectionCount);
                console.log('🔍 [SERVER DEBUG] Flow analysis:', requestBody.flowContext.flowAnalysis);
            }
            console.log('🔍 [SERVER DEBUG] Raw JSON available:', requestBody.rawFlowJson ? 'Yes' : 'No');
            if (requestBody.rawFlowJson) {
                console.log('🔍 [SERVER DEBUG] Raw JSON node count:', requestBody.rawFlowJson.length);
            }
            console.log('🔍 [SERVER DEBUG] Server URL:', `${CONFIG.serverUrl}${CONFIG.apiEndpoint}`);
            
            const response = await fetch(`${CONFIG.serverUrl}${CONFIG.apiEndpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            console.log('🔍 [SERVER DEBUG] Response status:', response.status);
            console.log('🔍 [SERVER DEBUG] Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            const responseData = await response.json();
            console.log('🔍 [SERVER DEBUG] Response data:', responseData);
            
            return responseData;
        }
        
        
        // Add typing indicator with inline styling
        function addTypingIndicator() {
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
            
            // Use the messages variable from the parent scope
            const messages = widget.querySelector('.chat-messages');
            if (messages) {
            messages.appendChild(typing);
            messages.scrollTop = messages.scrollHeight;
            }
            return typing;
        }
        
        // Event listeners
        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        
        minimizeBtn.addEventListener('click', () => {
            const body = widget.querySelector('.chat-body');
            const isMinimized = body.style.display === 'none';
            
            if (isMinimized) {
                // Expand the widget
                body.style.display = 'flex';
                minimizeBtn.textContent = '−';
                minimizeBtn.title = 'Minimize';
                widget.style.width = '380px';
                widget.style.height = 'calc(100vh - 48px)';
                widget.style.top = '48px';
                widget.style.bottom = 'auto';
                widget.style.right = '0';
                widget.style.borderRadius = '0';
                widget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                widget.style.background = 'white';
                hideNotificationIndicator();
                
                // Show header text
                const headerText = widget.querySelector('.chat-header span');
                if (headerText) headerText.style.display = 'block';
                
                // Restore header background
                const header = widget.querySelector('.chat-header');
                if (header) header.style.background = '#2c3e50';
                
                // Restore button size
                minimizeBtn.style.fontSize = '18px';
                minimizeBtn.style.width = '24px';
                minimizeBtn.style.height = '24px';
                
                // Remove chat bubble
                const chatBubble = document.getElementById('neuron-chat-bubble');
                if (chatBubble) {
                    chatBubble.remove();
                }
            } else {
                // Hide the main widget
                widget.style.display = 'none';
                
                // Create new chat bubble element
                createChatBubble();
            }
        });
        
        // New window button click handler
        const newWindowBtn = widget.querySelector('.chat-new-window');
        newWindowBtn.addEventListener('click', () => {
            openChatInNewWindow();
        });
        
        // Focus input when clicking on widget
        widget.addEventListener('click', (e) => {
            if (e.target === widget || e.target.classList.contains('chat-body')) {
                input.focus();
            }
        });
    }
    
    // Simple test function to check flow export - run this from browser console
    window.testFlowExport = function() {
        console.log('🧪 [FLOW TEST] Testing flow export...');
        
        if (typeof RED === 'undefined') {
            console.log('❌ RED object not available');
            return;
        }
        
        console.log('✅ RED object available');
        console.log('🔍 RED.nodes available:', !!RED.nodes);
        
        // Test the OFFICIAL Node-RED flow export method
        if (RED.nodes && typeof RED.nodes.createCompleteNodeSet === 'function') {
            console.log('🔍 Testing RED.nodes.createCompleteNodeSet() - OFFICIAL METHOD');
            try {
                const completeFlow = RED.nodes.createCompleteNodeSet({ credentials: false, dimensions: false });
                console.log('🔍 createCompleteNodeSet result:', completeFlow);
                console.log('🔍 Flow is array:', Array.isArray(completeFlow));
                console.log('🔍 Flow length:', completeFlow ? completeFlow.length : 'null');
                
                if (completeFlow && Array.isArray(completeFlow)) {
                    console.log('🔍 First few items:', completeFlow.slice(0, 3));
                    console.log('🔍 Item types found:', [...new Set(completeFlow.map(item => item.type))]);
                }
            } catch (error) {
                console.error('❌ Error with createCompleteNodeSet:', error);
            }
        } else {
            console.log('❌ RED.nodes.createCompleteNodeSet not available');
        }
        
        // Test the manual collection methods
        if (RED.nodes && typeof RED.nodes.eachNode === 'function') {
            console.log('🔍 Testing RED.nodes.eachNode() - MANUAL METHOD');
            try {
                let nodeCount = 0;
                let nodeTypes = new Set();
                
                RED.nodes.eachNode(function(node) {
                    nodeCount++;
                    nodeTypes.add(node.type);
                });
                
                console.log('🔍 Total nodes found:', nodeCount);
                console.log('🔍 Node types found:', Array.from(nodeTypes));
            } catch (error) {
                console.error('❌ Error with eachNode:', error);
            }
        } else {
            console.log('❌ RED.nodes.eachNode not available');
        }
        
        // Test workspace access
        if (RED.nodes && typeof RED.nodes.eachWorkspace === 'function') {
            console.log('🔍 Testing RED.nodes.eachWorkspace()');
            try {
                let workspaceCount = 0;
                RED.nodes.eachWorkspace(function(workspace) {
                    workspaceCount++;
                    console.log('🔍 Workspace:', workspace.id, workspace.type, workspace.label);
                });
                console.log('🔍 Total workspaces:', workspaceCount);
            } catch (error) {
                console.error('❌ Error with eachWorkspace:', error);
            }
        } else {
            console.log('❌ RED.nodes.eachWorkspace not available');
        }
        
        // Test our flow context function
        console.log('🔍 Testing getCurrentFlowContext()...');
        const flowContext = getCurrentFlowContext();
        console.log('🔍 Flow context result:', flowContext);
        
        if (flowContext) {
            console.log('🔍 Flow name:', flowContext.flowName);
            console.log('🔍 Node count:', flowContext.nodeCount);
            console.log('🔍 Connection count:', flowContext.connectionCount);
            console.log('🔍 Has connections:', flowContext.hasConnections);
            console.log('🔍 Node types:', flowContext.nodeTypes);
            console.log('🔍 Neuron nodes:', flowContext.neuronNodes);
            console.log('🔍 Connections:', flowContext.connections);
            console.log('🔍 Flow analysis:', flowContext.flowAnalysis);
        }
        
        console.log('🧪 [FLOW TEST] Test completed - check results above');
    };
    
    // Test flow synchronization manually
    window.testFlowSync = function() {
        console.log('🧪 [FLOW SYNC TEST] Manual flow sync test started');
        
        if (typeof RED === 'undefined') {
            console.log('🧪 [FLOW SYNC TEST] ERROR: RED object not available');
            return;
        }
        
        if (!RED.nodes || (!RED.nodes.createCompleteNodeSet && !RED.nodes.eachNode)) {
            console.log('🧪 [FLOW SYNC TEST] ERROR: RED.nodes flow export methods not available');
            return;
        }
        
        console.log('🧪 [FLOW SYNC TEST] Testing flow synchronization...');
        
        // Test initial sync
        console.log('🧪 [FLOW SYNC TEST] Testing initial sync...');
        syncFlowContext('initial');
        
        // Test change sync after a delay
        setTimeout(() => {
            console.log('🧪 [FLOW SYNC TEST] Testing change sync...');
            syncFlowContext('change');
        }, 2000);
        
        console.log('🧪 [FLOW SYNC TEST] Manual test completed - check console for results');
    };
    
    // Comprehensive flow export debug test
    window.debugFlowExport = function() {
        console.log('🔍 [FLOW DEBUG TEST] Starting comprehensive flow export debug...');
        
        // Check RED object availability
        console.log('🔍 [FLOW DEBUG TEST] RED object available:', typeof RED !== 'undefined');
        if (typeof RED !== 'undefined') {
            console.log('🔍 [FLOW DEBUG TEST] RED.nodes.createCompleteNodeSet available:', !!RED.nodes?.createCompleteNodeSet);
            console.log('🔍 [FLOW DEBUG TEST] RED.nodes.eachNode available:', !!RED.nodes?.eachNode);
            console.log('🔍 [FLOW DEBUG TEST] RED.events available:', !!RED.events);
        }
        
        // Test getCurrentFlowContext function
        console.log('🔍 [FLOW DEBUG TEST] Testing getCurrentFlowContext()...');
        const flowContext = getCurrentFlowContext();
        console.log('🔍 [FLOW DEBUG TEST] getCurrentFlowContext result:', flowContext);
        
        if (flowContext) {
            console.log('🔍 [FLOW DEBUG TEST] Flow name:', flowContext.flowName);
            console.log('🔍 [FLOW DEBUG TEST] Node count:', flowContext.nodeCount);
            console.log('🔍 [FLOW DEBUG TEST] Connection count:', flowContext.connectionCount);
            console.log('🔍 [FLOW DEBUG TEST] Has connections:', flowContext.hasConnections);
            console.log('🔍 [FLOW DEBUG TEST] Node types:', flowContext.nodeTypes);
            console.log('🔍 [FLOW DEBUG TEST] Neuron nodes:', flowContext.neuronNodes);
            console.log('🔍 [FLOW DEBUG TEST] Connections:', flowContext.connections);
            console.log('🔍 [FLOW DEBUG TEST] Flow analysis:', flowContext.flowAnalysis);
        }
        
        // Test individual strategies
        if (RED?.nodes?.createCompleteNodeSet) {
            console.log('🔍 [FLOW DEBUG TEST] Testing createCompleteNodeSet strategy...');
            try {
                const completeFlow = RED.nodes.createCompleteNodeSet({ credentials: false, dimensions: false });
                console.log('🔍 [FLOW DEBUG TEST] createCompleteNodeSet strategy result:', completeFlow);
            } catch (error) {
                console.error('🔍 [FLOW DEBUG TEST] createCompleteNodeSet strategy error:', error);
            }
        }
        
        if (RED?.nodes?.eachNode) {
            console.log('🔍 [FLOW DEBUG TEST] Testing eachNode strategy...');
            try {
                let nodeCount = 0;
                RED.nodes.eachNode(function(node) {
                    nodeCount++;
                });
                console.log('🔍 [FLOW DEBUG TEST] eachNode strategy result: found', nodeCount, 'nodes');
            } catch (error) {
                console.error('🔍 [FLOW DEBUG TEST] eachNode strategy error:', error);
            }
        }
        
        // Test direct flow access methods
        if (RED?.nodes) {
            console.log('🔍 [FLOW DEBUG TEST] Testing direct RED.nodes methods...');
            console.log('🔍 [FLOW DEBUG TEST] RED.nodes methods:', Object.getOwnPropertyNames(RED.nodes));
            
            try {
                if (RED.nodes.createCompleteNodeSet) {
                    const completeFlow = RED.nodes.createCompleteNodeSet({ credentials: false, dimensions: false });
                    console.log('🔍 [FLOW DEBUG TEST] createCompleteNodeSet result:', completeFlow);
                }
                
                if (RED.nodes.eachNode) {
                    let nodeCount = 0;
                    RED.nodes.eachNode(function(node) {
                        nodeCount++;
                    });
                    console.log('🔍 [FLOW DEBUG TEST] eachNode result: found', nodeCount, 'nodes');
                }
                
                if (RED.nodes.eachWorkspace) {
                    let workspaceCount = 0;
                    RED.nodes.eachWorkspace(function(workspace) {
                        workspaceCount++;
                    });
                    console.log('🔍 [FLOW DEBUG TEST] eachWorkspace result: found', workspaceCount, 'workspaces');
                }
            } catch (error) {
                console.error('🔍 [FLOW DEBUG TEST] Direct nodes access error:', error);
            }
        }
        
        console.log('🔍 [FLOW DEBUG TEST] Comprehensive debug completed');
    };
    
    // Test the loading logic
    window.testLoadingLogic = function() {
        console.log('🧪 [LOADING TEST] Testing Node-RED loading logic...');
        console.log('🧪 [LOADING TEST] Current state:');
        console.log('🧪 [LOADING TEST] - RED available:', typeof RED !== 'undefined');
        console.log('🧪 [LOADING TEST] - RED.nodes available:', !!RED?.nodes);
        console.log('🧪 [LOADING TEST] - RED.nodes.createCompleteNodeSet available:', !!RED?.nodes?.createCompleteNodeSet);
        console.log('🧪 [LOADING TEST] - RED.nodes.eachNode available:', !!RED?.nodes?.eachNode);
        console.log('🧪 [LOADING TEST] - RED.events available:', !!RED?.events);
        
        if (RED?.events && typeof RED.events.on === 'function') {
            console.log('🧪 [LOADING TEST] Event system is available');
            console.log('🧪 [LOADING TEST] Available events:', Object.getOwnPropertyNames(RED.events));
        }
        
        console.log('🧪 [LOADING TEST] Loading test completed');
    };
    
    // Monitor what events Node-RED actually emits
    window.monitorEvents = function() {
        console.log('🔍 [EVENT MONITOR] Starting event monitoring...');
        
        if (!RED.events || typeof RED.events.on !== 'function') {
            console.log('🔍 [EVENT MONITOR] No event system available');
            return;
        }
        
        // Store original emit function to intercept events
        const originalEmit = RED.events.emit;
        const originalOn = RED.events.on;
        
        // Monitor all events being emitted
        RED.events.emit = function(eventName, ...args) {
            console.log('🔍 [EVENT MONITOR] Event emitted:', eventName, args);
            return originalEmit.apply(this, arguments);
        };
        
        // Monitor all event listeners being added
        RED.events.on = function(eventName, listener) {
            console.log('🔍 [EVENT MONITOR] Event listener added:', eventName);
            return originalOn.apply(this, arguments);
        };
        
        console.log('🔍 [EVENT MONITOR] Event monitoring active - watch for events being emitted');
        console.log('🔍 [EVENT MONITOR] Try interacting with Node-RED (open flows, etc.) to see events');
    };
    
    // Manual check function to see current Node-RED state
    window.checkNodeREDState = function() {
        console.log('🔍 [STATE CHECK] Current Node-RED state:');
        console.log('🔍 [STATE CHECK] RED object:', typeof RED !== 'undefined' ? 'Available' : 'NOT AVAILABLE');
        
        if (typeof RED !== 'undefined') {
            console.log('🔍 [STATE CHECK] RED type:', typeof RED);
            console.log('🔍 [STATE CHECK] RED keys:', Object.keys(RED));
            
            if (RED.nodes) {
                console.log('🔍 [STATE CHECK] RED.nodes: Available');
                console.log('🔍 [STATE CHECK] RED.nodes keys:', Object.keys(RED.nodes));
                console.log('🔍 [STATE CHECK] RED.nodes.createCompleteNodeSet:', !!RED.nodes.createCompleteNodeSet);
                console.log('🔍 [STATE CHECK] RED.nodes.eachNode:', !!RED.nodes.eachNode);
            } else {
                console.log('🔍 [STATE CHECK] RED.nodes: NOT AVAILABLE');
            }
            
            if (RED.events) {
                console.log('🔍 [STATE CHECK] RED.events: Available');
                console.log('🔍 [STATE CHECK] RED.events keys:', Object.keys(RED.events));
            } else {
                console.log('🔍 [STATE CHECK] RED.events: NOT AVAILABLE');
            }
        }
        
        console.log('🔍 [STATE CHECK] Widget element:', document.getElementById('neuron-chat-widget') ? 'Exists' : 'NOT CREATED');
        console.log('🔍 [STATE CHECK] Flows available flag:', window.flowsAvailable);
    };
    
    // Manual trigger to create widget (if automatic initialization fails)
    window.forceCreateWidget = function() {
        console.log('🔧 [FORCE CREATE] Manually creating chat widget...');
        
        if (document.getElementById('neuron-chat-widget')) {
            console.log('🔧 [FORCE CREATE] Widget already exists, removing old one...');
            document.getElementById('neuron-chat-widget').remove();
        }
        
        createChatWidget();
    };
    
    // Create chat bubble element
    function createChatBubble() {
        // Remove existing bubble if it exists
        const existingBubble = document.getElementById('neuron-chat-bubble');
        if (existingBubble) {
            existingBubble.remove();
        }
        
        const chatBubble = document.createElement('div');
        chatBubble.id = 'neuron-chat-bubble';
        chatBubble.style.cssText = `
            position: fixed;
            bottom: 36px;
            right: 24px;
            width: 60px;
            height: 60px;
            background: white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        `;
        
        // Add logo image
        const logoImage = document.createElement('img');
        logoImage.src = './neuron/theme/chatbotIcon.png';
        logoImage.style.cssText = `
            width: 38px;
            height: 38px;
            user-select: none;
            object-fit: contain;
        `;
        
        // Add error handling for logo
        logoImage.onerror = function() {
            // Fallback to text if image fails to load
            this.style.display = 'none';
            const fallbackText = document.createElement('div');
            fallbackText.textContent = 'N';
            fallbackText.style.cssText = `
                font-size: 24px;
                font-weight: bold;
                color: #2c3e50;
                user-select: none;
            `;
            chatBubble.appendChild(fallbackText);
        };
        
        chatBubble.appendChild(logoImage);
        
        // Add click event to expand chat
        chatBubble.addEventListener('click', () => {
            // Show the main widget
            const mainWidget = document.getElementById('neuron-chat-widget');
            if (mainWidget) {
                mainWidget.style.display = 'flex';
            }
            
            // Remove the bubble
            chatBubble.remove();
        });
        
        // Add hover effect
        chatBubble.addEventListener('mouseenter', () => {
            chatBubble.style.transform = 'scale(1.1)';
            chatBubble.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        });
        
        chatBubble.addEventListener('mouseleave', () => {
            chatBubble.style.transform = 'scale(1)';
            chatBubble.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        });
        
        document.body.appendChild(chatBubble);
    }
    
    // Open chat in new window
    async function openChatInNewWindow() {
        try {
            // Get current chat data
            const messages = document.querySelectorAll('.chat-message');
            const chatData = {
                messages: Array.from(messages).map(msg => ({
                    text: msg.querySelector('.message-content').textContent,
                    sender: msg.classList.contains('chat-user') ? 'user' : 
                            msg.classList.contains('chat-system') ? 'system' : 'assistant',
                    time: msg.querySelector('.message-time')?.textContent || ''
                })),
                flowContext: getCurrentFlowContext(),
                timestamp: Date.now()
            };
            
            // Store chat data in localStorage for the new window
            localStorage.setItem('neuron-chat-widget-data', JSON.stringify(chatData));
            
            // Create a dedicated chat HTML page (await the Promise)
            const chatHTML = await createDedicatedChatHTML();
            
            // Open new window with dedicated chat interface
            const newWindow = window.open('', 'neuron-chat-window', 'width=800,height=900,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no');
            
            if (newWindow) {
                newWindow.document.write(chatHTML);
                newWindow.document.close();
                
                // Hide the original chat widget completely
                const originalWidget = document.getElementById('neuron-chat-widget');
                if (originalWidget) {
                    originalWidget.style.display = 'none';
                }
                
                // Hide chat bubble as well
                const chatBubble = document.getElementById('neuron-chat-bubble');
                if (chatBubble) {
                    chatBubble.style.display = 'none';
                }
                
                // Listen for new window close event
                const checkClosed = setInterval(() => {
                    if (newWindow.closed) {
                        clearInterval(checkClosed);
                        // Show original widget and chat bubble again when new window closes
                        if (originalWidget) {
                            originalWidget.style.display = 'flex';
                        }
                        if (chatBubble) {
                            chatBubble.style.display = 'flex';
                        }
                        
                        // Load updated chat history from localStorage
                        loadChatHistoryFromLocalStorage();
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('Error opening chat in new window:', error);
        }
    }
    
    // Create dedicated chat HTML for new window
    async function createDedicatedChatHTML() {
        try {
            // Fetch the dedicated chat window HTML from external file
            const response = await fetch('./neuron/theme/dedicated-chat-window.html');
            if (!response.ok) {
                throw new Error('Failed to load dedicated chat window HTML');
            }
            return await response.text();
        } catch (error) {
            console.error('Error loading dedicated chat window HTML:', error);
            // Fallback to a simple HTML if the external file can't be loaded
            return createFallbackHTML();
        }
    }
    
    // Fallback HTML in case external file can't be loaded
    function createFallbackHTML() {
        return '<!DOCTYPE html>' +
            '<html lang="en">' +
            '<head>' +
            '    <meta charset="UTF-8">' +
            '    <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
            '    <title>NeuronGPT Chat</title>' +
            '    <style>' +
            '        * { margin: 0; padding: 0; box-sizing: border-box; }' +
            '        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #1D1D1D; color: white; height: 100vh; overflow: hidden; }' +
            '        .chat-container { display: flex; flex-direction: column; height: 100vh; background: #1D1D1D; }' +
            '        .chat-header { background: #2c3e50; color: white; padding: 16px 24px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 18px; flex-shrink: 0; }' +
            '        .chat-messages { flex: 1; padding: 16px; overflow-y: auto; background: #1D1D1D; }' +
            '        .chat-input-area { padding: 16px 24px; border-top: 1px solid #333; background: #1D1D1D; display: flex; gap: 12px; flex-shrink: 0; }' +
            '        .chat-input { flex: 1; padding: 12px 16px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; outline: none; background: #2d3748; color: white; }' +
            '        .chat-send { padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; }' +
            '        .chat-message { margin-bottom: 16px; padding: 12px 16px; border-radius: 8px; max-width: 80%; word-wrap: break-word; font-size: 14px; line-height: 1.5; }' +
            '        .chat-user { background: #007bff; color: white; margin-left: auto; text-align: right; }' +
            '        .chat-assistant { background: #2d3748; color: white; border: 1px solid #4a5568; }' +
            '        .message-time { font-size: 11px; opacity: 0.7; margin-top: 6px; }' +
            '        .chat-status { padding: 8px 24px; background: #2d3748; color: #a0aec0; font-size: 12px; border-top: 1px solid #4a5568; }' +
            '    </style>' +
            '</head>' +
            '<body>' +
            '    <div class="chat-container">' +
            '        <div class="chat-header">' +
            '            <span>🤖 NeuronGPT Chat (Fallback)</span>' +
            '            <button onclick="window.close()" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; padding: 8px;">✕</button>' +
            '        </div>' +
            '        <div class="chat-messages" id="chat-messages"></div>' +
            '        <div class="chat-input-area">' +
            '            <input type="text" placeholder="Ask about Neuron software..." class="chat-input" id="chat-input">' +
            '            <button class="chat-send" id="chat-send">Send</button>' +
            '        </div>' +
            '        <div class="chat-status">' +
            '            <small>Chat window - Original window will be restored when you close this</small>' +
            '        </div>' +
            '    </div>' +
            '    <script>' +
            '        function loadChatData() {' +
            '            try {' +
            '                const chatData = localStorage.getItem("neuron-chat-widget-data");' +
            '                if (chatData) {' +
            '                    const parsedData = JSON.parse(chatData);' +
            '                    if (parsedData.messages && parsedData.messages.length > 0) {' +
            '                        const messagesContainer = document.getElementById("chat-messages");' +
            '                        if (messagesContainer) {' +
            '                            messagesContainer.innerHTML = "";' +
            '                            parsedData.messages.forEach(msg => { addMessage(msg.text, msg.sender); });' +
            '                        }' +
            '                    }' +
            '                }' +
            '            } catch (error) {' +
            '                console.error("Error loading chat data:", error);' +
            '                }' +
            '        }' +
            '        function addMessage(text, sender) {' +
            '            const messages = document.getElementById("chat-messages");' +
            '            if (!messages) return;' +
            '            const msgDiv = document.createElement("div");' +
            '            msgDiv.className = "chat-message chat-" + sender;' +
            '            msgDiv.innerHTML = "<div class=\\"message-content\\">" + text + "</div><div class=\\"message-time\\">" + new Date().toLocaleTimeString() + "</div>";' +
            '            messages.appendChild(msgDiv);' +
            '            messages.scrollTop = messages.scrollHeight;' +
            '        }' +
            '        async function sendMessage() {' +
            '            const input = document.getElementById("chat-input");' +
            '            const text = input.value.trim();' +
            '            if (!text) return;' +
            '            addMessage(text, "user");' +
            '            input.value = "";' +
            '            try {' +
            '                const response = await sendToExternalServer(text);' +
            '                addMessage(response.content, "assistant");' +
            '            } catch (error) {' +
            '                console.error("Error sending message:", error);' +
            '                addMessage("Sorry, I\'m having trouble connecting to the external server. Please check if the server is running.", "assistant");' +
            '            }' +
            '        }' +
            '        async function sendToExternalServer(message) {' +
            '            const requestBody = { message: message, context: "Neuron software context", flowContext: null, rawFlowJson: null };' +
            '            try {' +
            '                const chatData = localStorage.getItem("neuron-chat-widget-data");' +
            '                if (chatData) {' +
            '                    const parsedData = JSON.parse(chatData);' +
            '                    if (parsedData.flowContext) requestBody.flowContext = parsedData.flowContext;' +
            '                    if (parsedData.rawFlowJson) requestBody.rawFlowJson = parsedData.rawFlowJson;' +
            '                }' +
            '            } catch (error) {' +
            '                console.warn("Could not get flow context from localStorage:", error);' +
            '            }' +
            '            const response = await fetch("http://localhost:3001/api/chat", {' +
            '                method: "POST",' +
            '                headers: { "Content-Type": "application/json" },' +
            '                body: JSON.stringify(requestBody)' +
            '            });' +
            '            if (!response.ok) {' +
            '                throw new Error("Server error: " + response.status + " " + response.statusText);' +
            '            }' +
            '            return await response.json();' +
            '        }' +
            '        document.getElementById("chat-send").addEventListener("click", sendMessage);' +
            '        document.getElementById("chat-input").addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });' +
            '        window.addEventListener("load", loadChatData);' +
            '    </script>' +
            '</body>' +
            '</html>';
    }
    
    // Load chat history from localStorage when main widget becomes visible again
    function loadChatHistoryFromLocalStorage() {
        try {
            const chatData = localStorage.getItem('neuron-chat-widget-data');
            if (chatData) {
                const parsedData = JSON.parse(chatData);
                console.log('🔄 [CHAT SYNC] Loading chat history from localStorage:', parsedData);
                
                // Load chat history from new format
                if (parsedData.chatHistory && Array.isArray(parsedData.chatHistory)) {
                    console.log('🔄 [CHAT SYNC] Loading', parsedData.chatHistory.length, 'messages from chatHistory');
                    const messagesContainer = document.querySelector('.chat-messages');
                    if (messagesContainer) {
                        messagesContainer.innerHTML = '';
                        parsedData.chatHistory.forEach(message => {
                            addMessage(message.content, message.role);
                        });
                    }
                }
                // Fallback to old format
                else if (parsedData.messages && parsedData.messages.length > 0) {
                    console.log('🔄 [CHAT SYNC] Loading', parsedData.messages.length, 'messages from old format');
                    const messagesContainer = document.querySelector('.chat-messages');
                    if (messagesContainer) {
                        messagesContainer.innerHTML = '';
                        parsedData.messages.forEach(msg => {
                            addMessage(msg.text, msg.sender);
                        });
                    }
                }
            }
        } catch (error) {
            console.error('🔄 [CHAT SYNC] Error loading chat history from localStorage:', error);
        }
    }
    
    // Check if this is a new window and restore chat data
    function checkForNewWindowChat() {
        // Check if this window was opened for chat
        if (window.location.hash === '#neuron-chat-window') {
            // This is a new chat window
            console.log('🔍 [NEW WINDOW] Detected new chat window, restoring data...');
            
            // Hide the chat bubble in this window
            const chatBubble = document.getElementById('neuron-chat-bubble');
            if (chatBubble) {
                chatBubble.style.display = 'none';
            }
            
            // Try to restore chat data from localStorage
            try {
                const chatData = localStorage.getItem('neuron-chat-widget-data');
                if (chatData) {
                    const parsedData = JSON.parse(chatData);
                    console.log('🔍 [NEW WINDOW] Restored chat data:', parsedData);
                    
                    // Restore messages from new chatHistory format
                    if (parsedData.chatHistory && Array.isArray(parsedData.chatHistory)) {
                        console.log('🔍 [NEW WINDOW] Restoring', parsedData.chatHistory.length, 'messages from chatHistory');
                        const messagesContainer = document.querySelector('.chat-messages');
                        if (messagesContainer) {
                            messagesContainer.innerHTML = '';
                            parsedData.chatHistory.forEach(message => {
                                addMessage(message.content, message.role);
                            });
                        }
                    }
                    // Fallback to old format
                    else if (parsedData.messages && parsedData.messages.length > 0) {
                        console.log('🔍 [NEW WINDOW] Restoring', parsedData.messages.length, 'messages from old format');
                        const messagesContainer = document.querySelector('.chat-messages');
                        if (messagesContainer) {
                            messagesContainer.innerHTML = '';
                            parsedData.messages.forEach(msg => {
                                addMessage(msg.text, msg.sender);
                            });
                        }
                    }
                    
                    // Update window title
                    document.title = 'NeuronGPT Chat - ' + document.title;
                }
            } catch (error) {
                console.error('🔍 [NEW WINDOW] Error restoring chat data:', error);
            }
        }
    }
    
    // Add notification indicator for minimized state
    function addNotificationIndicator(widget) {
        const notification = document.createElement('div');
        notification.id = 'neuron-chat-notification';
        notification.style.cssText = `
            position: absolute;
            top: -5px;
            right: -5px;
            width: 20px;
            height: 20px;
            background: #e74c3c;
            color: white;
            border-radius: 50%;
            display: none;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            font-weight: bold;
            z-index: 10001;
            animation: pulse 2s infinite;
        `;
        
        // Add pulse animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
        
        widget.appendChild(notification);
    }
    
    // Show notification indicator
    function showNotificationIndicator() {
        const notification = document.getElementById('neuron-chat-notification');
        if (notification) {
            notification.style.display = 'flex';
            notification.textContent = '!';
        }
    }
    
    // Hide notification indicator
    function hideNotificationIndicator() {
        const notification = document.getElementById('neuron-chat-notification');
        if (notification) {
            notification.style.display = 'none';
        }
    }
    
            // Update flow export status with visual feedback
        function updateFlowExportStatus(message, status) {
            const flowStatusEl = document.getElementById('flow-export-status');
            if (!flowStatusEl) return;
            
            flowStatusEl.textContent = message;
            
            // Apply status-specific styling
            switch (status) {
                case 'syncing':
                    flowStatusEl.style.background = 'transparent';
                    flowStatusEl.style.color = '#007bff';
                    break;
                case 'success':
                    flowStatusEl.style.background = 'transparent';
                    flowStatusEl.style.color = '#28a745';
                    break;
                case 'error':
                    flowStatusEl.style.background = 'transparent';
                    flowStatusEl.style.color = '#dc3545';
                    break;
                case 'unknown':
                    flowStatusEl.style.background = 'transparent';
                    flowStatusEl.style.color = '#6c757d';
                    break;
                default:
                    flowStatusEl.style.background = 'transparent';
                    flowStatusEl.style.color = '#6c757d';
            }
        }
    
    // Professional markdown parser with proper list formatting and spacing
    function parseMarkdown(text) {
        if (!text || typeof text !== 'string') {
            return text;
        }
        
        let formatted = text;
        
        // Step 1: Handle code blocks first (before line processing)
        formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre style="background: #2d3748; color: #e2e8f0; padding: 12px; border-radius: 6px; margin: 12px 0; overflow-x: auto; font-family: monospace; font-size: 12px;">$2</pre>');
        
        // Step 2: Handle headings
        formatted = formatted.replace(/^##\s+(.+)$/gm, '<h3 style="margin: 20px 0 12px 0; font-size: 16px; font-weight: bold; color: inherit; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">$1</h3>');
        formatted = formatted.replace(/^###\s+(.+)$/gm, '<h4 style="margin: 16px 0 8px 0; font-size: 14px; font-weight: bold; color: inherit;">$1</h4>');
        
        // Step 3: Handle inline formatting
        formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: bold;">$1</strong>');
        formatted = formatted.replace(/\*(.+?)\*/g, '<em style="font-style: italic;">$1</em>');
        formatted = formatted.replace(/`([^`]+)`/g, '<code style="background: #2d3748; color: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px;">$1</code>');
        
        // Step 4: Process line by line to handle lists properly
        const lines = formatted.split('\n');
        const processedLines = [];
        let inList = false;
        let listType = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (!line) {
                // Empty line - end current list if we're in one
                if (inList) {
                    processedLines.push('</div>');
                    inList = false;
                    listType = null;
                }
                processedLines.push('<br>');
                continue;
            }
            
            // Check for numbered list (1. item: description)
            const numberedMatch = line.match(/^(\d+)\.\s*(.+?):\s*(.+)$/);
            if (numberedMatch) {
                if (!inList || listType !== 'numbered') {
                    if (inList) processedLines.push('</div>');
                    processedLines.push('<div style="margin: 8px 0;">');
                    inList = true;
                    listType = 'numbered';
                }
                processedLines.push(`<div style="margin: 6px 0; padding-left: 20px; position: relative;">
                    <span style="position: absolute; left: 0; font-weight: bold; color: white;">${numberedMatch[1]}.</span>
                    <span style="font-weight: normal; color: white;">${numberedMatch[2]}:</span> ${numberedMatch[3]}
                </div>`);
                continue;
            }
            
            // Check for numbered list with just title (1. item:)
            const numberedTitleMatch = line.match(/^(\d+)\.\s*(.+?):\s*$/);
            if (numberedTitleMatch) {
                if (!inList || listType !== 'numbered') {
                    if (inList) processedLines.push('</div>');
                    processedLines.push('<div style="margin: 8px 0;">');
                    inList = true;
                    listType = 'numbered';
                }
                processedLines.push(`<div style="margin: 6px 0; padding-left: 20px; position: relative;">
                    <span style="position: absolute; left: 0; font-weight: bold; color: white;">${numberedTitleMatch[1]}.</span>
                    <span style="font-weight: normal; color: white;">${numberedTitleMatch[2]}:</span>
                </div>`);
                continue;
            }
            
            // Check for bullet points (- item: description)
            const bulletMatch = line.match(/^-\s*(.+?):\s*(.+)$/);
            if (bulletMatch) {
                if (!inList || listType !== 'bullet') {
                    if (inList) processedLines.push('</div>');
                    processedLines.push('<div style="margin: 8px 0;">');
                    inList = true;
                    listType = 'bullet';
                }
                processedLines.push(`<div style="margin: 6px 0; padding-left: 20px; position: relative;">
                    <span style="position: absolute; left: 0; color: #718096;">•</span>
                    <span style="font-weight: normal; color: white;">${bulletMatch[1]}:</span> ${bulletMatch[2]}
                </div>`);
                continue;
            }
            
            // Check for bullet points with just title (- item:)
            const bulletTitleMatch = line.match(/^-\s*(.+?):\s*$/);
            if (bulletTitleMatch) {
                if (!inList || listType !== 'bullet') {
                    if (inList) processedLines.push('</div>');
                    processedLines.push('<div style="margin: 8px 0;">');
                    inList = true;
                    listType = 'bullet';
                }
                processedLines.push(`<div style="margin: 6px 0; padding-left: 20px; position: relative;">
                    <span style="position: absolute; left: 0; color: #718096;">•</span>
                    <span style="font-weight: normal; color: white;">${bulletTitleMatch[1]}:</span>
                </div>`);
                continue;
            }
            
            // Check for simple numbered list (1. item)
            const simpleNumberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
            if (simpleNumberedMatch) {
                if (!inList || listType !== 'numbered') {
                    if (inList) processedLines.push('</div>');
                    processedLines.push('<div style="margin: 8px 0;">');
                    inList = true;
                    listType = 'numbered';
                }
                processedLines.push(`<div style="margin: 6px 0; padding-left: 20px; position: relative;">
                    <span style="position: absolute; left: 0; font-weight: bold; color: white;">${simpleNumberedMatch[1]}.</span>
                    ${simpleNumberedMatch[2]}
                </div>`);
                continue;
            }
            
            // Check for simple bullet point (- item)
            const simpleBulletMatch = line.match(/^-\s+(.+)$/);
            if (simpleBulletMatch) {
                if (!inList || listType !== 'bullet') {
                    if (inList) processedLines.push('</div>');
                    processedLines.push('<div style="margin: 8px 0;">');
                    inList = true;
                    listType = 'bullet';
                }
                processedLines.push(`<div style="margin: 6px 0; padding-left: 20px; position: relative;">
                    <span style="position: absolute; left: 0; color: #718096;">•</span>
                    ${simpleBulletMatch[1]}
                </div>`);
                continue;
            }
            
            // Regular text line - end list if we were in one
            if (inList) {
                processedLines.push('</div>');
                inList = false;
                listType = null;
            }
            
            // Add regular paragraph
            processedLines.push(`<p style="margin: 8px 0; line-height: 1.5;">${line}</p>`);
        }
        
        // Close any open list
        if (inList) {
            processedLines.push('</div>');
        }
        
        // Join lines and clean up
        formatted = processedLines.join('');
        
        // Clean up consecutive <br> tags and <p> tags
        formatted = formatted.replace(/(<br>){2,}/g, '<br>');
        formatted = formatted.replace(/(<p[^>]*>.*?<\/p>){2,}/g, (match) => {
            return match.replace(/<\/p>\s*<p[^>]*>/g, '</p><p style="margin: 8px 0; line-height: 1.5;">');
        });
        
        return formatted;
    }
    
    // Add message to chat with inline styling - moved to global scope
    function addMessage(text, sender) {
        const messages = document.querySelector('.chat-messages');
        if (!messages) {
            return;
        }
        
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message chat-${sender}`;
        
        // Apply message styling inline
        msgDiv.style.cssText = `
            margin-bottom: 12px;
            padding: 8px 12px;
            border-radius: 8px;
            max-width: 80%;
            word-wrap: break-word;
            font-size: 13px;
            line-height: 1.4;
        `;
        
        if (sender === 'user') {
            msgDiv.style.cssText += `
                background: #007bff;
                color: white;
                margin-left: auto;
                text-align: right;
            `;
        } else if (sender === 'system') {
            msgDiv.style.cssText += `
                background: #e8f5e8;
                color: #2d5a2d;
                border: 1px solid rgba(195, 230, 195, 0.3);
                text-align: center;
                font-style: italic;
                margin: 0 auto;
            `;
        } else {
            msgDiv.style.cssText += `
                background: transparent;
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.1);
            `;
        }
        
        // Parse markdown for AI responses (assistant/system messages)
        let formattedText = text;
        if (sender === 'assistant' || sender === 'system') {
            formattedText = parseMarkdown(text);
        }
        
        msgDiv.innerHTML = `
            <div class="message-content">${formattedText}</div>
            <div class="message-time" style="font-size: 10px; opacity: 0.7; margin-top: 4px;">
                ${new Date().toLocaleTimeString()}
            </div>
        `;
        
        messages.appendChild(msgDiv);
        messages.scrollTop = messages.scrollHeight;
        
        // Show notification if widget is minimized
        const widget = document.getElementById('neuron-chat-widget');
        if (widget && widget.querySelector('.chat-body').style.display === 'none') {
            // Note: showNotificationIndicator function needs to be moved to global scope too
        }
    }
    
    // Initialize when ready
    waitForNodeRED();
})();

