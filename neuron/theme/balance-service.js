// Balance Service for Node-RED Header
(function() {
    'use strict';

    let balanceUpdateInterval = null;
    let currentBalance = '0';
    let isUpdating = false;

    // Configuration
    const CONFIG = {
        updateInterval: 30000, // Update every 30 seconds
        retryInterval: 5000,   // Retry failed requests after 5 seconds
        maxRetries: 3,
        balanceEndpoint: '/neuron/balance'
    };

    function convertTinybarsToHbar(tinybars) {
        // 1 HBAR = 100,000,000 tinybars
        const hbarValue = parseFloat(tinybars) / 100000000;
        return hbarValue.toFixed(2); // Show 2 decimal places
    }

    function updateBalanceDisplay(balance) {
        const balanceElements = document.querySelectorAll('[data-balance-display]');
        balanceElements.forEach(element => {
            element.textContent = `Balance: ${balance} USDC`;
        });

        // Update CSS custom property for pseudo-element content
        document.documentElement.style.setProperty('--balance-text', `"Balance: ${balance} USDC"`);
        
        currentBalance = balance;
        console.log(`✅ Balance updated: ${balance} USDC`);
    }

    function showBalanceError(message) {
        console.error('❌ Balance Error:', message);
        updateBalanceDisplay('Error');
    }

    async function fetchBalance() {
        if (isUpdating) return;
        
        isUpdating = true;
        let retries = 0;

        while (retries < CONFIG.maxRetries) {
            try {
                console.log(`🔄 Fetching balance... (attempt ${retries + 1})`);
                
                const response = await fetch(CONFIG.balanceEndpoint, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                
                if (data.success && data.balance !== undefined) {
                    const hbarBalance = convertTinybarsToHbar(data.balance);
                    updateBalanceDisplay(hbarBalance);
                    isUpdating = false;
                    return;
                } else {
                    throw new Error(data.error || 'Invalid response format');
                }

            } catch (error) {
                retries++;
                console.warn(`⚠️ Balance fetch attempt ${retries} failed:`, error.message);
                
                if (retries >= CONFIG.maxRetries) {
                    showBalanceError('Failed to fetch');
                    break;
                }
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, CONFIG.retryInterval));
            }
        }
        
        isUpdating = false;
    }

    function startBalanceUpdates() {
        // Clear any existing interval
        if (balanceUpdateInterval) {
            clearInterval(balanceUpdateInterval);
        }

        // Initial fetch
        fetchBalance();

        // Set up periodic updates
        balanceUpdateInterval = setInterval(fetchBalance, CONFIG.updateInterval);
        console.log(`🔄 Balance auto-update started (every ${CONFIG.updateInterval/1000}s)`);
    }

    function stopBalanceUpdates() {
        if (balanceUpdateInterval) {
            clearInterval(balanceUpdateInterval);
            balanceUpdateInterval = null;
            console.log('⏹️ Balance auto-update stopped');
        }
    }

    // Expose global functions for manual control
    window.NeuronBalance = {
        start: startBalanceUpdates,
        stop: stopBalanceUpdates,
        fetch: fetchBalance,
        getCurrentBalance: () => currentBalance,
        updateInterval: (newInterval) => {
            CONFIG.updateInterval = newInterval;
            if (balanceUpdateInterval) {
                stopBalanceUpdates();
                startBalanceUpdates();
            }
        }
    };

    // Auto-start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startBalanceUpdates);
    } else {
        startBalanceUpdates();
    }

    // Stop updates when page unloads
    window.addEventListener('beforeunload', stopBalanceUpdates);

    console.log('🚀 Neuron Balance Service initialized');
})(); 