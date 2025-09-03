/**
 * Template Browser Service
 * Handles API communication and data management
 */
window.TemplateBrowserService = (function() {
    const API_BASE = '/api/templates';
    
    let templatesCache = null;
    let cacheTimestamp = null;
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    
    async function fetchTemplates() {
        // Check cache
        const now = Date.now();
        if (templatesCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
            return templatesCache;
        }
        
        try {
            const response = await fetch(`${API_BASE}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const templates = await response.json();
            
            // Update cache
            templatesCache = templates;
            cacheTimestamp = now;
            
            return templates;
        } catch (error) {
            console.error('Failed to fetch templates:', error);
            throw error;
        }
    }
    
    async function fetchTemplateReadme(templateName) {
        try {
            const response = await fetch(`${API_BASE}/${templateName}/readme`);
            if (!response.ok) {
                throw new Error(`README not found for ${templateName}`);
            }
            return await response.text();
        } catch (error) {
            console.error('Failed to fetch README:', error);
            throw error;
        }
    }
    
    async function fetchTemplateFiles(templateName) {
        try {
            const response = await fetch(`${API_BASE}/${templateName}/files`);
            if (!response.ok) {
                throw new Error(`Files not found for ${templateName}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch files:', error);
            throw error;
        }
    }
    
    async function fetchTemplateFlow(templateName, fileName = null) {
        try {
            const url = fileName ? 
                `${API_BASE}/${templateName}/flow/${fileName}` : 
                `${API_BASE}/${templateName}/flow`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Flow not found for ${templateName}${fileName ? `/${fileName}` : ''}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch flow:', error);
            throw error;
        }
    }
    
    return {
        fetchTemplates,
        fetchTemplateReadme,
        fetchTemplateFiles,
        fetchTemplateFlow
    };
})();
