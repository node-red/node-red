RED.editor.mermaid = (function () {
    let initializing = false
    let loaded = false
    let pendingEvals = []
    let diagramIds = 0

    function render(selector = '.mermaid') {
        // $(selector).hide()
        if (!loaded) {
            pendingEvals.push(selector)
            
            if (!initializing) {
                initializing = true
                // Find the cache-buster:
                let cacheBuster
                $('script').each(function (i, el) { 
                    if (!cacheBuster) {
                        const src = el.getAttribute('src')
                        const m = /\?v=(.+)$/.exec(src)
                        if (m) {
                            cacheBuster = m[1]
                        }
                    }
                })
                $.ajax({
                    url: `vendor/mermaid/mermaid.min.js?v=${cacheBuster}`,
                    dataType: "script",
                    cache: true,
                    success: function (data, stat, jqxhr) {
                        mermaid.initialize({
                            startOnLoad: false,
                            theme: RED.settings.get('mermaid', {}).theme
                        })
                        loaded = true
                        while(pendingEvals.length > 0) {
                            const pending = pendingEvals.shift()
                            render(pending)
                        }
                    }
                });
            }
        } else {
            const nodes = document.querySelectorAll(selector)

            nodes.forEach(async node => {
                if (!node.getAttribute('mermaid-processed')) {
                    const mermaidContent = node.innerText
                    node.setAttribute('mermaid-processed', true)
                    try {
                        const { svg } = await mermaid.render('mermaid-render-'+Date.now()+'-'+(diagramIds++), mermaidContent);
                        node.innerHTML = svg
                    } catch (err) {
                        $('<div>').css({
                            fontSize: '0.8em',
                            border: '1px solid var(--red-ui-border-color-error)',
                            padding: '5px',
                            marginBottom: '10px',
                        }).text(err.toString()).prependTo(node)
                    }
                }
            })
        }
    }  
    return {
        render: render,
    };
})();
