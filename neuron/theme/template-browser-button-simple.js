/**
 * Simple Template Browser Header Button
 * A simplified approach to add the template button
 */
(function() {
    console.log('🔧 Template Browser Button Script Loading...');
    
    function addTemplateButton() {
        console.log('🔧 Attempting to add template button...');
        
        // Simple check for dependencies
        if (typeof $ === 'undefined') {
            console.log('❌ jQuery not available, retrying...');
            setTimeout(addTemplateButton, 500);
            return;
        }
        
        // Check if button already exists
        if (document.getElementById('red-ui-header-button-templates')) {
            console.log('✅ Template button already exists');
            return;
        }
        
        // Find the header toolbar
        const toolbar = document.querySelector('.red-ui-header-toolbar');
        if (!toolbar) {
            console.log('❌ Header toolbar not found, retrying...');
            setTimeout(addTemplateButton, 500);
            return;
        }
        
        console.log('✅ Found header toolbar:', toolbar);
        
        // Create the button element
        const buttonHtml = `
            <li>
                <a id="red-ui-header-button-templates" class="button" href="#" title="Browse Templates" 
                   style="display: flex !important; align-items: center; gap: 6px; padding: 8px 12px; color: inherit; text-decoration: none;">
                    <i class="fa fa-folder-open"></i>
                    <span>Templates</span>
                </a>
            </li>
        `;
        
        // Insert the button at the beginning of the toolbar (after balance via CSS order)
        toolbar.insertAdjacentHTML('afterbegin', buttonHtml);
        
        // Verify insertion
        const button = document.getElementById('red-ui-header-button-templates');
        if (button) {
            console.log('✅ Template button added successfully!');
            
            // Add click handler
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎯 Template button clicked!');
                
                // Check if TemplateBrowser is available
                if (window.TemplateBrowser && typeof window.TemplateBrowser.show === 'function') {
                    try {
                        console.log('🚀 Opening Template Browser...');
                        window.TemplateBrowser.show();
                    } catch (error) {
                        console.error('❌ Error opening Template Browser:', error);
                        alert('Error opening Template Browser: ' + error.message);
                    }
                } else {
                    console.error('❌ TemplateBrowser not available');
                    alert('Template Browser not available. Please refresh the page.');
                }
            });
            
        } else {
            console.error('❌ Failed to add template button');
            // Retry once more
            setTimeout(addTemplateButton, 1000);
        }
    }
    
    // Multiple initialization strategies
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(addTemplateButton, 1000);
        });
    } else {
        setTimeout(addTemplateButton, 1000);
    }
    
    // Also try after a longer delay as fallback
    setTimeout(addTemplateButton, 3000);
    
    console.log('🔧 Template Browser Button Script Loaded');
})();
