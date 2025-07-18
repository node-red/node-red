const fs = require('fs');
const path = require('path');

/**
 * ProcessRegistry - Manages persistent storage of Go process information
 * Ensures processes can be rediscovered after Node-RED redeploys
 */
class ProcessRegistry {
    constructor(registryPath = null) {
        this.registryPath = registryPath || path.join(__dirname, 'process-registry.json');
        this.registry = new Map();
        this.lockFile = this.registryPath + '.lock';
        this.loadRegistry();
    }

    /**
     * Load registry from persistent storage
     */
    loadRegistry() {
        try {
            if (fs.existsSync(this.registryPath)) {
                const data = fs.readFileSync(this.registryPath, 'utf-8');
                const parsed = JSON.parse(data);
                
                // Convert object back to Map and validate entries
                for (const [nodeId, entry] of Object.entries(parsed)) {
                    if (this.isValidEntry(entry)) {
                        this.registry.set(nodeId, entry);
                    } else {
                        console.warn(`Removing invalid registry entry for node ${nodeId}`);
                    }
                }
                
                console.log(`Loaded ${this.registry.size} process entries from registry`);
            }
        } catch (error) {
            console.error('Error loading process registry:', error.message);
            this.registry = new Map(); // Start fresh on error
        }
    }

    /**
     * Save registry to persistent storage with atomic write
     */
    saveRegistry() {
        try {
            // Create backup if file exists
            if (fs.existsSync(this.registryPath)) {
                const backupPath = this.registryPath + '.backup';
                fs.copyFileSync(this.registryPath, backupPath);
            }

            // Convert Map to object for JSON serialization
            const registryObj = Object.fromEntries(this.registry);
            
            // Atomic write using temporary file
            const tempPath = this.registryPath + '.tmp';
            fs.writeFileSync(tempPath, JSON.stringify(registryObj, null, 2), 'utf-8');
            fs.renameSync(tempPath, this.registryPath);
            
            console.log(`Saved ${this.registry.size} process entries to registry`);
        } catch (error) {
            console.error('Error saving process registry:', error.message);
        }
    }

    /**
     * Register a new process
     */
    registerProcess(nodeId, pid, port, deviceInfo, nodeType = 'buyer') {
        const entry = {
            pid: pid,
            port: port,
            nodeType: nodeType,
            startTime: new Date().toISOString(),
            deviceInfo: deviceInfo,
            status: 'running',
            lastSeen: new Date().toISOString()
        };

        this.registry.set(nodeId, entry);
        this.saveRegistry();
        console.log(`Registered ${nodeType} process for node ${nodeId}: PID ${pid}, Port ${port}`);
        return entry;
    }

    /**
     * Get process information for a node
     */
    getProcess(nodeId) {
        return this.registry.get(nodeId);
    }

    /**
     * Update process status
     */
    updateProcessStatus(nodeId, status, additionalInfo = {}) {
        const entry = this.registry.get(nodeId);
        if (entry) {
            entry.status = status;
            entry.lastSeen = new Date().toISOString();
            Object.assign(entry, additionalInfo);
            this.saveRegistry();
            console.log(`Updated process status for node ${nodeId}: ${status}`);
        }
    }

    /**
     * Mark process as stopped
     */
    markProcessStopped(nodeId) {
        this.updateProcessStatus(nodeId, 'stopped');
    }

    /**
     * Remove process from registry
     */
    removeProcess(nodeId) {
        if (this.registry.delete(nodeId)) {
            this.saveRegistry();
            console.log(`Removed process entry for node ${nodeId}`);
            return true;
        }
        return false;
    }

    /**
     * Get all processes
     */
    getAllProcesses() {
        return new Map(this.registry);
    }

    /**
     * Get processes by status
     */
    getProcessesByStatus(status) {
        const filtered = new Map();
        for (const [nodeId, entry] of this.registry) {
            if (entry.status === status) {
                filtered.set(nodeId, entry);
            }
        }
        return filtered;
    }

    /**
     * Clean up stale entries older than TTL
     */
    cleanupStaleEntries(ttlHours = 24) {
        const cutoffTime = new Date(Date.now() - (ttlHours * 60 * 60 * 1000));
        let removedCount = 0;

        for (const [nodeId, entry] of this.registry) {
            const lastSeen = new Date(entry.lastSeen);
            if (lastSeen < cutoffTime && entry.status !== 'running') {
                this.registry.delete(nodeId);
                removedCount++;
            }
        }

        if (removedCount > 0) {
            this.saveRegistry();
            console.log(`Cleaned up ${removedCount} stale process entries`);
        }
    }

    /**
     * Validate registry entry structure
     */
    isValidEntry(entry) {
        return entry && 
               typeof entry.pid === 'number' &&
               typeof entry.port === 'number' &&
               typeof entry.startTime === 'string' &&
               typeof entry.status === 'string';
    }

    /**
     * Get registry statistics
     */
    getStats() {
        const stats = {
            total: this.registry.size,
            running: 0,
            stopped: 0,
            unknown: 0
        };

        for (const entry of this.registry.values()) {
            stats[entry.status] = (stats[entry.status] || 0) + 1;
        }

        return stats;
    }
}

module.exports = ProcessRegistry; 