/**
 * Template Browser Dialog
 * Main UI component for the template browser
 */
(function() {
    let dialog = null;
    let currentTemplates = [];
    
    /**
     * Set the flow name to match the template name
     * @param {Array} flowData - The flow data array
     * @param {string} templateName - The template name to use as flow name
     * @returns {Array} Modified flow data with updated flow name
     */
    function setFlowName(flowData, templateName) {
        if (!Array.isArray(flowData)) {
            return flowData;
        }
        
        // Create a deep copy to avoid modifying the original
        const modifiedFlowData = JSON.parse(JSON.stringify(flowData));
        
        // Find and update tab nodes (which represent flows)
        modifiedFlowData.forEach(node => {
            if (node.type === 'tab') {
                // Set the label to the template name
                node.label = templateName;
                // Also update the id to be more descriptive if needed
                // Keep the original id for compatibility
            }
        });
        
        return modifiedFlowData;
    }
    
    function createDialog() {
        // Create dialog HTML
        const dialogHtml = `
            <div id="template-browser-dialog" title="Template Browser">
                <div class="template-browser-content">
                    <div class="template-search-bar">
                        <input type="text" id="template-search-input" placeholder="Search templates..." />
                        <button id="template-refresh-btn" title="Refresh Templates">
                            <i class="fa fa-refresh"></i>
                        </button>
                    </div>
                    <div class="template-loading" id="template-loading">
                        <i class="fa fa-spinner fa-spin"></i> Loading templates...
                    </div>
                    <div class="template-list" id="template-list">
                        <!-- Templates will be loaded here -->
                    </div>
                    <div class="template-error" id="template-error" style="display: none;">
                        <i class="fa fa-exclamation-triangle"></i>
                        <span id="template-error-message">Failed to load templates</span>
                        <button id="template-retry-btn">Retry</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add to page
        $('body').append(dialogHtml);
        
        // Initialize dialog
        dialog = $('#template-browser-dialog').dialog({
            width: 800,
            height: 600,
            modal: true,
            autoOpen: false,
            resizable: true,
            close: function() {
                // Cleanup if needed
            }
        });
        
        // Bind events
        bindEvents();
    }
    
    function bindEvents() {
        // Search functionality
        $('#template-search-input').on('input', function() {
            const searchTerm = $(this).val().toLowerCase();
            filterTemplates(searchTerm);
        });
        
        // Refresh button
        $('#template-refresh-btn').on('click', function() {
            loadTemplates(true); // Force refresh
        });
        
        // Retry button
        $('#template-retry-btn').on('click', function() {
            loadTemplates();
        });
    }
    
    function filterTemplates(searchTerm) {
        $('.template-item').each(function() {
            const templateName = $(this).data('template-name').toLowerCase();
            const templateDesc = $(this).find('.template-description').text().toLowerCase();
            
            if (templateName.includes(searchTerm) || templateDesc.includes(searchTerm)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    }
    
    function createTemplateItem(template) {
        return `
            <div class="template-item" data-template-name="${template.name}">
                <div class="template-header">
                    <h3 class="template-name">${template.name}</h3>
                    <div class="template-actions">
                        <button class="template-info-btn" data-template="${template.name}" title="View Information">
                            <i class="fa fa-info-circle"></i> Info
                        </button>
                        <button class="template-import-btn" data-template="${template.name}" title="Import Template">
                            <i class="fa fa-download"></i> Import
                        </button>
                    </div>
                </div>
                <div class="template-description">${template.description}</div>
                <div class="template-meta">
                    <span class="template-category">
                        <i class="fa fa-tag"></i> ${template.category}
                    </span>
                    <span class="template-nodes">
                        <i class="fa fa-cube"></i> ${template.nodeCount} nodes
                    </span>
                </div>
            </div>
        `;
    }
    
    async function loadTemplates(forceRefresh = false) {
        const loadingEl = $('#template-loading');
        const listEl = $('#template-list');
        const errorEl = $('#template-error');
        
        // Show loading state
        loadingEl.show();
        listEl.empty();
        errorEl.hide();
        
        try {
            const templates = await TemplateBrowserService.fetchTemplates();
            currentTemplates = templates;
            
            // Hide loading
            loadingEl.hide();
            
            if (templates.length === 0) {
                listEl.html('<div class="no-templates">No templates found.</div>');
                return;
            }
            
            // Render templates
            templates.forEach(template => {
                const templateHtml = createTemplateItem(template);
                listEl.append(templateHtml);
            });
            
            // Bind template-specific events
            bindTemplateEvents();
            
        } catch (error) {
            console.error('Failed to load templates:', error);
            loadingEl.hide();
            errorEl.show();
            $('#template-error-message').text(error.message || 'Failed to load templates');
        }
    }
    
    function bindTemplateEvents() {
        // Info button clicks
        $('.template-info-btn').off('click').on('click', function() {
            const templateName = $(this).data('template');
            showTemplateInfo(templateName);
        });
        
        // Import button clicks
        $('.template-import-btn').off('click').on('click', function() {
            const templateName = $(this).data('template');
            importTemplate(templateName);
        });
    }
    
    async function showTemplateInfo(templateName) {
        try {
            // Get template data and README
            const [readme, templates] = await Promise.all([
                TemplateBrowserService.fetchTemplateReadme(templateName),
                TemplateBrowserService.fetchTemplates()
            ]);
            
            // Find the specific template to get flow details
            const template = templates.find(t => t.name === templateName);
            
            // Build flow details section
            let flowDetailsHtml = '';
            if (template && template.flowDetails && template.flowDetails.length > 0) {
                if (template.flowDetails.length === 1) {
                    const flow = template.flowDetails[0];
                    flowDetailsHtml = `
                        <div class="flow-details-section">
                            <h3>Flow Information</h3>
                            <div class="flow-item">
                                <div class="flow-info">
                                    <strong>${flow.fileName}</strong> - ${flow.nodeCount} nodes (${Math.round(flow.size/1024)}KB)
                                </div>
                                <button class="flow-import-btn" data-template="${templateName}" data-flow="${flow.fileName}" title="Import this flow">
                                    <i class="fa fa-download"></i> Import
                                </button>
                            </div>
                        </div>
                    `;
                } else {
                    const flowItems = template.flowDetails.map(flow => `
                        <div class="flow-item">
                            <div class="flow-info">
                                <strong>${flow.fileName}</strong> - ${flow.nodeCount} nodes (${Math.round(flow.size/1024)}KB)
                            </div>
                            <button class="flow-import-btn" data-template="${templateName}" data-flow="${flow.fileName}" title="Import this flow">
                                <i class="fa fa-download"></i> Import
                            </button>
                        </div>
                    `).join('');
                    
                    flowDetailsHtml = `
                        <div class="flow-details-section">
                            <h3>Available Flows (${template.flowDetails.length})</h3>
                            ${flowItems}
                        </div>
                    `;
                }
            }
            
            // Create info dialog with tabs
            const infoDialog = $(`
                <div title="Template Info: ${templateName}">
                    <div class="template-info-tabs">
                        <div class="tab-buttons">
                            <button class="tab-btn active" data-tab="readme">README</button>
                            ${flowDetailsHtml ? '<button class="tab-btn" data-tab="flows">Flows</button>' : ''}
                        </div>
                        <div class="tab-content">
                            <div id="readme-tab" class="tab-panel active">
                                <div class="template-readme-content">
                                    <pre>${readme}</pre>
                                </div>
                            </div>
                            ${flowDetailsHtml ? `
                                <div id="flows-tab" class="tab-panel">
                                    ${flowDetailsHtml}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `);
            
            infoDialog.dialog({
                width: 700,
                height: 600,
                modal: true,
                close: function() {
                    infoDialog.remove();
                }
            });
            
            // Handle tab switching
            infoDialog.find('.tab-btn').on('click', function() {
                const tab = $(this).data('tab');
                infoDialog.find('.tab-btn').removeClass('active');
                infoDialog.find('.tab-panel').removeClass('active');
                $(this).addClass('active');
                infoDialog.find(`#${tab}-tab`).addClass('active');
            });
            
            // Handle flow import buttons in the info dialog
            infoDialog.find('.flow-import-btn').on('click', function() {
                const templateName = $(this).data('template');
                const flowFileName = $(this).data('flow');
                
                // Close the info dialog first
                infoDialog.dialog('close');
                
                // Import the specific flow
                importSpecificFlow(templateName, flowFileName);
            });
            
        } catch (error) {
            alert(`Failed to load template information: ${error.message}`);
        }
    }
    
    async function importSpecificFlow(templateName, flowFileName) {
        try {
            console.log(`Importing specific flow: ${templateName}/${flowFileName}`);
            
            // Fetch the specific flow file
            const flowData = await TemplateBrowserService.fetchTemplateFlow(templateName, flowFileName);
            
            // Import using Node-RED's import function
            if (typeof RED !== 'undefined' && RED.view && RED.view.importNodes) {
                // Set flow name to match template name
                const modifiedFlowData = setFlowName(flowData, templateName);
                
                RED.view.importNodes(modifiedFlowData, {
                    generateIds: true,
                    addFlow: true
                });
                
                // Close main dialog and show success
                if (dialog) {
                    dialog.dialog('close');
                }
                
                const message = `Flow "${flowFileName}" from template "${templateName}" imported successfully`;
                if (RED.notify) {
                    RED.notify(message, "success");
                } else {
                    alert(message);
                }
            } else {
                throw new Error('Node-RED import function not available');
            }
            
        } catch (error) {
            console.error('Specific flow import failed:', error);
            const message = `Failed to import flow "${flowFileName}": ${error.message}`;
            if (RED.notify) {
                RED.notify(message, "error");
            } else {
                alert(message);
            }
        }
    }
    
    async function importTemplate(templateName) {
        const importBtn = $(`.template-import-btn[data-template="${templateName}"]`);
        const originalText = importBtn.html();
        
        try {
            // Show loading state
            importBtn.html('<i class="fa fa-spinner fa-spin"></i> Checking...');
            importBtn.prop('disabled', true);
            
            // First, get available JSON files
            const jsonFiles = await TemplateBrowserService.fetchTemplateFiles(templateName);
            
            let selectedFile = null;
            
            if (jsonFiles.length === 0) {
                throw new Error('No flow files found for this template');
            } else if (jsonFiles.length === 1) {
                // Only one file, use it directly
                selectedFile = jsonFiles[0].name;
            } else {
                // Multiple files, let user choose
                const fileOptions = jsonFiles.map(file => 
                    `<option value="${file.name}">${file.name} (${Math.round(file.size/1024)}KB)</option>`
                ).join('');
                
                const selectionDialog = $(`
                    <div title="Select Flow File">
                        <p>This template has multiple flow files. Please select which one to import:</p>
                        <select id="flow-file-selector" style="width: 100%; padding: 8px; margin: 10px 0;">
                            ${fileOptions}
                        </select>
                        <div style="margin-top: 15px;">
                            <button id="import-selected-btn" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                                <i class="fa fa-download"></i> Import Selected
                            </button>
                            <button id="cancel-import-btn" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-left: 10px;">
                                Cancel
                            </button>
                        </div>
                    </div>
                `);
                
                const result = await new Promise((resolve) => {
                    selectionDialog.dialog({
                        width: 400,
                        height: 250,
                        modal: true,
                        close: function() {
                            resolve(null);
                            selectionDialog.remove();
                        }
                    });
                    
                    selectionDialog.find('#import-selected-btn').on('click', function() {
                        const selected = selectionDialog.find('#flow-file-selector').val();
                        selectionDialog.dialog('close');
                        resolve(selected);
                    });
                    
                    selectionDialog.find('#cancel-import-btn').on('click', function() {
                        selectionDialog.dialog('close');
                        resolve(null);
                    });
                });
                
                if (!result) {
                    // User cancelled
                    return;
                }
                
                selectedFile = result;
            }
            
            // Show importing state
            importBtn.html('<i class="fa fa-spinner fa-spin"></i> Importing...');
            
            // Fetch the selected template flow
            const flowData = await TemplateBrowserService.fetchTemplateFlow(templateName, selectedFile);
            
            // Import using Node-RED's import function
            if (typeof RED !== 'undefined' && RED.view && RED.view.importNodes) {
                // Set flow name to match template name
                const modifiedFlowData = setFlowName(flowData, templateName);
                
                RED.view.importNodes(modifiedFlowData, {
                    generateIds: true,
                    addFlow: true
                });
                
                // Close dialog and show success
                dialog.dialog('close');
                
                const message = `Template "${templateName}" (${selectedFile}) imported successfully`;
                if (RED.notify) {
                    RED.notify(message, "success");
                } else {
                    alert(message);
                }
            } else {
                throw new Error('Node-RED import function not available');
            }
            
        } catch (error) {
            console.error('Import failed:', error);
            if (RED.notify) {
                RED.notify(`Failed to import template: ${error.message}`, "error");
            } else {
                alert(`Failed to import template: ${error.message}`);
            }
        } finally {
            // Restore button state
            importBtn.html(originalText);
            importBtn.prop('disabled', false);
        }
    }
    
    // Public API
    window.TemplateBrowser = {
        show: function() {
            if (!dialog) {
                createDialog();
            }
            dialog.dialog('open');
            loadTemplates();
        }
    };
})();
