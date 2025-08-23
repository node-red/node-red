// Custom Menu Item Injector for Node-RED
(function() {
    'use strict';

    function injectCustomMenuItem() {
        console.log('🎯 Injecting custom menu item...');
        
        // Wait for the menu to be fully loaded
        setTimeout(() => {
            // Find the keyboard shortcuts menu item
            const keyboardShortcutsItem = document.querySelector('#menu-item-keyboard-shortcuts');
            
            if (keyboardShortcutsItem) {
                // Create the new menu item with completely custom structure
                const newMenuItem = document.createElement('li');
                newMenuItem.id = 'menu-item-neuron-docs';
                newMenuItem.className = 'neuron-docs-item custom-menu-item'; // Add custom classes
                newMenuItem.style.cssText = 'margin: 0; padding: 0;';
                
                newMenuItem.innerHTML = `
                    <a href="https://docs.neuron.world" target="_blank" rel="noopener noreferrer">
                        <i class="fa fa-external-link"></i>
                        <span class="red-ui-menu-label">Neuron AI Node Builder</span>
                    </a>
                `;
                
                // Add custom event handlers to prevent interference
                const link = newMenuItem.querySelector('a');
                link.addEventListener('mouseenter', function(e) {
                    e.stopPropagation();
                    this.style.backgroundColor = '#2a2a2a';
                    this.style.color = '#ffffff';
                });
                
                link.addEventListener('mouseleave', function(e) {
                    e.stopPropagation();
                    this.style.backgroundColor = 'transparent';
                    this.style.color = 'inherit';
                });
                
                // Create a separator first
                const separator = document.createElement('li');
                separator.className = 'red-ui-menu-divider';
                
                // Insert separator and menu item after the version number
                const versionItem = document.querySelector('#menu-item-node-red-version');
                if (versionItem) {
                    // Insert separator after the version item
                    versionItem.parentNode.insertBefore(separator, versionItem.nextSibling);
                    // Then insert our menu item after the separator
                    versionItem.parentNode.insertBefore(newMenuItem, separator.nextSibling);
                    
                    // Debug: Log the DOM structure
                    console.log('🔍 DOM Structure after insertion:');
                    console.log('Version item:', versionItem);
                    console.log('Separator:', separator);
                    console.log('Our menu item:', newMenuItem);
                    console.log('Version item next sibling:', versionItem.nextSibling);
                    
                    // Force the version item to maintain its styling with maximum specificity
                    setTimeout(() => {
                        const versionLink = versionItem.querySelector('a');
                        if (versionLink) {
                            // Apply our custom styling directly
                            versionLink.setAttribute('style', versionLink.getAttribute('style') + '; background-color: transparent !important; color: #999 !important; transition: all 0.15s ease !important;');
                            
                            // Add custom hover event handlers for v4.0.9
                            versionLink.addEventListener('mouseenter', function(e) {
                                e.stopPropagation();
                                this.style.backgroundColor = '#1a1a1a';
                                this.style.color = '#ccc';
                            });
                            
                            versionLink.addEventListener('mouseleave', function(e) {
                                e.stopPropagation();
                                this.style.backgroundColor = 'transparent';
                                this.style.color = '#999';
                            });
                            
                            // Also add a data attribute to help with CSS targeting
                            versionItem.setAttribute('data-never-hover', 'true');
                        }
                    }, 100);
                } else {
                    // Fallback: insert at the end of the menu
                    const menuContainer = document.querySelector('.red-ui-menu-dropdown');
                    if (menuContainer) {
                        menuContainer.appendChild(separator);
                        menuContainer.appendChild(newMenuItem);
                    }
                }
                
                console.log('✅ Custom menu item injected successfully!');
            } else {
                console.log('⚠️ Keyboard shortcuts menu item not found, retrying...');
                // Retry after a short delay
                setTimeout(injectCustomMenuItem, 500);
            }
        }, 1000); // Wait 1 second for menu to load
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectCustomMenuItem);
    } else {
        injectCustomMenuItem();
    }

    // Also try to inject when the menu is dynamically updated
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                // Check if our custom item exists
                const existingItem = document.querySelector('#menu-item-neuron-docs');
                if (!existingItem) {
                    injectCustomMenuItem();
                }
            }
        });
    });

    // Start observing when the page is ready
    setTimeout(() => {
        const menuContainer = document.querySelector('.red-ui-menu-dropdown');
        if (menuContainer) {
            observer.observe(menuContainer, { childList: true, subtree: true });
        }
    }, 2000);

    console.log('🚀 Neuron Menu Customizer initialized');
})();
