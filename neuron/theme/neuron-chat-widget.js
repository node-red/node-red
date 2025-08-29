(function() {
    'use strict';
    
    console.log('🧠 [NEURONGPT] Enhanced widget loading...');
    
    // Configuration
    const CONFIG = {
        serverUrl: 'https://neuron-gpt-cp9am.ondigitalocean.app',
        apiEndpoint: '/api/chat',
        healthEndpoint: '/health',
        authEndpoint: '/api/forward/auth'
    };
    
    // Authentication state
    let authState = {
        isAuthenticated: false,
        accessToken: null,
        user: null,
        tokenExpiry: null
    };
    
    // Wait for Node-RED to be fully loaded
    function waitForNodeRED() {
        console.log('🧠 [NEURONGPT] Waiting for Node-RED...');
        
        // Check if RED object exists and has basic structure
        if (typeof RED === 'undefined') {
            console.log('🧠 [NEURONGPT] RED not ready, waiting...');
            setTimeout(waitForNodeRED, 200);
            return;
        }
        
        // Check if RED object has the basic structure we need
        if (!RED || typeof RED !== 'object') {
            console.log('🧠 [NEURONGPT] RED object invalid, waiting...');
            setTimeout(waitForNodeRED, 200);
            return;
        }
        
        console.log('🧠 [NEURONGPT] RED ready, creating widget...');
        createChatWidget();
    }
    
    // Create floating chat widget
    function createChatWidget() {
        console.log('🧠 [NEURONGPT] Creating chat widget...');
        
        // Check if widget already exists
        if (document.getElementById('neuron-chat-widget')) {
            console.log('🧠 [NEURONGPT] Widget already exists');
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
                margin-right: 8px;
            `;
            
            // Add logout functionality
            logoutBtn.addEventListener('click', () => {
                clearAuthState();
                showLoginScreen();
                logoutBtn.style.display = 'none';
            });
        }
        
        const chatBody = widget.querySelector('.chat-body');
        chatBody.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
            background: #1D1D1D;
        `;
        
        // Add to page
        document.body.appendChild(widget);
        console.log('🧠 [NEURONGPT] Widget added to page');
        
        // Add event listeners
        minimizeBtn.addEventListener('click', () => {
            const body = widget.querySelector('.chat-body');
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
        
        // Check authentication status and show appropriate interface
        if (loadAuthState()) {
            showChatInterface();
        } else {
            showLoginScreen();
        }
        
        console.log('🧠 [NEURONGPT] Widget created successfully');
    }
    
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

            // Add login button event listener
            const loginBtn = document.getElementById('login-button');
            if (loginBtn) {
                loginBtn.addEventListener('click', handleDirectLogin);
            }
            
            // Add enter key support
            const usernameInput = document.getElementById('username-input');
            const passwordInput = document.getElementById('password-input');
            
            if (usernameInput && passwordInput) {
                passwordInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        handleDirectLogin();
                    }
                });
                
                usernameInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        passwordInput.focus();
                    }
                });
            }
        }
    }
    
    // Handle direct login with username/password
    async function handleDirectLogin() {
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
            // For now, we'll simulate a successful login
            // In a real implementation, you'd call your authentication API here
            console.log('🧠 [NEURONGPT] Attempting login for user:', username);
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // For testing purposes, accept any login
            // In production, replace this with actual authentication
            const mockUser = {
                id: 'test-user',
                username: username,
                email: username + '@example.com',
                name: username
            };
            
            const mockToken = 'mock-jwt-token-' + Date.now();
            
            // Save authentication state
            saveAuthState(mockToken, mockUser);
            
            // Show success and transition to chat
            statusDiv.textContent = 'Login successful!';
            statusDiv.style.color = '#68d391';
            
            // Transition to chat interface after a short delay
            setTimeout(() => {
                showChatInterface();
            }, 1000);
            
        } catch (error) {
            console.error('🧠 [NEURONGPT] Login failed:', error);
            statusDiv.textContent = 'Login failed: ' + error.message;
            statusDiv.style.color = '#fc8181';
            
            // Re-enable inputs
            usernameInput.disabled = false;
            passwordInput.disabled = false;
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    }
    
    // Initiate login process (kept for reference, not used in direct login)
    function initiateLogin() {
        const statusDiv = document.getElementById('login-status');
        if (statusDiv) {
            statusDiv.textContent = 'Redirecting to authentication...';
            statusDiv.style.color = '#68d391';
        }

        // Open login in new window/tab
        const loginWindow = window.open(
            `${CONFIG.serverUrl}${CONFIG.authEndpoint}?redirect_uri=${encodeURIComponent(window.location.origin + '/neuron/theme/auth-callback.html')}`,
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
    
    // Add typing indicator
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
        
        const messages = document.querySelector('.chat-messages');
        if (messages) {
            messages.appendChild(typing);
            messages.scrollTop = messages.scrollHeight;
        }
        return typing;
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
                    return {
                        flowCount: completeFlow.length,
                        flowData: completeFlow,
                        timestamp: new Date().toISOString()
                    };
                } catch (error) {
                    console.log('🔍 [FLOW SYNC] Strategy 1 failed:', error.message);
                }
            }
            
            // Strategy 2: Use RED.nodes.eachNode() to collect flow data
            if (RED.nodes && typeof RED.nodes.eachNode === 'function') {
                try {
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
                        flowData: flowData,
                        timestamp: new Date().toISOString()
                    };
                } catch (error) {
                    console.log('🔍 [FLOW SYNC] Strategy 2 failed:', error.message);
                }
            }
            
            return null;
        } catch (error) {
            console.error('🔍 [FLOW SYNC] Error getting flow context:', error);
            return null;
        }
    }
    
    // Get current flow JSON
    function getCurrentFlowJson() {
        try {
            if (typeof RED === 'undefined') {
                return null;
            }
            
            if (RED.nodes && typeof RED.nodes.createCompleteNodeSet === 'function') {
                return RED.nodes.createCompleteNodeSet({ credentials: false, dimensions: false });
            }
            
            return null;
        } catch (error) {
            console.error('🔍 [FLOW SYNC] Error getting flow JSON:', error);
            return null;
        }
    }
    
    // Start the widget
    console.log('🧠 [NEURONGPT] Starting enhanced widget initialization...');
    waitForNodeRED();
    
})();

