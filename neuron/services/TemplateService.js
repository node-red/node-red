const https = require('https');
const url = require('url');

const GITHUB_API_BASE = 'https://api.github.com/repos/NeuronInnovations/neuron-node-builder/contents/templates';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/NeuronInnovations/neuron-node-builder/master/templates';

// Cache for template data (5 minutes)
let templatesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch directory contents from GitHub API
 */
async function fetchDirectoryContents(templateName) {
    return new Promise((resolve, reject) => {
        const encodedTemplateName = encodeURIComponent(templateName);
        const options = {
            hostname: 'api.github.com',
            path: `/repos/NeuronInnovations/neuron-node-builder/contents/templates/${encodedTemplateName}`,
            method: 'GET',
            headers: {
                'User-Agent': 'Neuron-Node-Builder'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed)) {
                        resolve(parsed);
                    } else {
                        reject(new Error('Invalid response format'));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

/**
 * Fetch templates list from GitHub API
 */
async function fetchTemplatesFromGitHub() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: '/repos/NeuronInnovations/neuron-node-builder/contents/templates',
            method: 'GET',
            headers: {
                'User-Agent': 'Neuron-Node-Builder'
            }
        };

        const req = https.request(options, async (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', async () => {
                try {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed)) {
                        const templates = [];
                        
                        for (const item of parsed.filter(item => item.type === 'dir')) {
                            let nodeCount = 'Unknown';
                            let jsonFiles = [];
                            let flowDetails = [];
                            
                            // Get directory contents to find JSON files
                            try {
                                const dirContents = await fetchDirectoryContents(item.name);
                                jsonFiles = dirContents
                                    .filter(file => file.type === 'file' && file.name.endsWith('.json'))
                                    .map(file => file.name);
                                
                                // Analyze each JSON file
                                if (jsonFiles.length === 1) {
                                    // Single flow - show node count
                                    try {
                                        const flowData = await fetchFileFromGitHub(item.name, jsonFiles[0]);
                                        const flowJson = JSON.parse(flowData);
                                        if (Array.isArray(flowJson)) {
                                            nodeCount = flowJson.filter(node => 
                                                node.type && 
                                                !node.type.startsWith('tab') && 
                                                !node.type.startsWith('subflow')
                                            ).length;
                                            
                                            flowDetails.push({
                                                fileName: jsonFiles[0],
                                                nodeCount: nodeCount,
                                                size: dirContents.find(f => f.name === jsonFiles[0])?.size || 0
                                            });
                                        }
                                    } catch (error) {
                                        console.log(`Could not parse flow data for ${item.name}/${jsonFiles[0]}:`, error.message);
                                    }
                                } else if (jsonFiles.length > 1) {
                                    // Multiple flows - analyze each one
                                    nodeCount = `${jsonFiles.length} flows`;
                                    
                                    for (const fileName of jsonFiles) {
                                        try {
                                            const flowData = await fetchFileFromGitHub(item.name, fileName);
                                            const flowJson = JSON.parse(flowData);
                                            let fileNodeCount = 'Unknown';
                                            
                                            if (Array.isArray(flowJson)) {
                                                fileNodeCount = flowJson.filter(node => 
                                                    node.type && 
                                                    !node.type.startsWith('tab') && 
                                                    !node.type.startsWith('subflow')
                                                ).length;
                                            }
                                            
                                            flowDetails.push({
                                                fileName: fileName,
                                                nodeCount: fileNodeCount,
                                                size: dirContents.find(f => f.name === fileName)?.size || 0
                                            });
                                        } catch (error) {
                                            console.log(`Could not parse flow data for ${item.name}/${fileName}:`, error.message);
                                            flowDetails.push({
                                                fileName: fileName,
                                                nodeCount: 'Error',
                                                size: dirContents.find(f => f.name === fileName)?.size || 0
                                            });
                                        }
                                    }
                                }
                            } catch (error) {
                                console.log(`Could not fetch directory contents for ${item.name}:`, error.message);
                            }
                            
                            templates.push({
                                name: item.name,
                                path: item.path,
                                description: `Template: ${item.name}`,
                                category: 'General',
                                nodeCount: nodeCount,
                                hasReadme: true,
                                jsonFiles: jsonFiles,
                                flowDetails: flowDetails,
                                defaultFlowFile: jsonFiles.length > 0 ? jsonFiles[0] : null
                            });
                        }
                        resolve(templates);
                    } else {
                        reject(new Error('Invalid response format'));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

/**
 * Fetch file content from GitHub
 */
async function fetchFileFromGitHub(templateName, fileName) {
    return new Promise((resolve, reject) => {
        const url = `${GITHUB_RAW_BASE}/${templateName}/${fileName}`;
        const options = new URL(url);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(data);
                } else {
                    reject(new Error(`File not found: ${fileName}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

/**
 * Template Service Middleware Function
 * Handles all template-related API requests
 */
async function handleTemplateRequest(req, res, next) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    try {
        // GET /api/templates - List all templates
        if (pathname === '/api/templates' && req.method === 'GET') {
            // Check cache
            const now = Date.now();
            if (templatesCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
                return res.json(templatesCache);
            }

            // Fetch fresh data
            const templates = await fetchTemplatesFromGitHub();
            
            // Update cache
            templatesCache = templates;
            cacheTimestamp = now;
            
            return res.json(templates);
        }
        
        // GET /api/templates/:templateName/readme - Get template README
        const readmeMatch = pathname.match(/^\/api\/templates\/([^\/]+)\/readme$/);
        if (readmeMatch && req.method === 'GET') {
            const templateName = decodeURIComponent(readmeMatch[1]);
            const readme = await fetchFileFromGitHub(templateName, 'README.md');
            res.type('text/markdown');
            return res.send(readme);
        }
        
        // GET /api/templates/:templateName/files - Get list of JSON files in template
        const filesMatch = pathname.match(/^\/api\/templates\/([^\/]+)\/files$/);
        if (filesMatch && req.method === 'GET') {
            const templateName = decodeURIComponent(filesMatch[1]);
            const dirContents = await fetchDirectoryContents(templateName);
            const jsonFiles = dirContents
                .filter(file => file.type === 'file' && file.name.endsWith('.json'))
                .map(file => ({
                    name: file.name,
                    size: file.size,
                    download_url: file.download_url
                }));
            return res.json(jsonFiles);
        }
        
        // GET /api/templates/:templateName/flow/:filename - Get specific template flow JSON
        const flowFileMatch = pathname.match(/^\/api\/templates\/([^\/]+)\/flow\/([^\/]+)$/);
        if (flowFileMatch && req.method === 'GET') {
            const templateName = decodeURIComponent(flowFileMatch[1]);
            const fileName = decodeURIComponent(flowFileMatch[2]);
            const flowJson = await fetchFileFromGitHub(templateName, fileName);
            return res.json(JSON.parse(flowJson));
        }
        
        // GET /api/templates/:templateName/flow - Get default template flow JSON
        const flowMatch = pathname.match(/^\/api\/templates\/([^\/]+)\/flow$/);
        if (flowMatch && req.method === 'GET') {
            const templateName = decodeURIComponent(flowMatch[1]);
            
            // Get the template info to find available JSON files
            const dirContents = await fetchDirectoryContents(templateName);
            const jsonFiles = dirContents
                .filter(file => file.type === 'file' && file.name.endsWith('.json'))
                .map(file => file.name);
                
            if (jsonFiles.length === 0) {
                throw new Error('No flow files found for this template');
            }
            
            // Use the first JSON file found
            const flowJson = await fetchFileFromGitHub(templateName, jsonFiles[0]);
            return res.json(JSON.parse(flowJson));
        }
        
        // If no template route matched, pass to next middleware
        next();
        
    } catch (error) {
        console.error('Error in template service:', error);
        res.status(error.message.includes('not found') ? 404 : 500);
        return res.json({ error: error.message });
    }
}

module.exports = handleTemplateRequest;
