RED.view.annotations = (function() {

    var annotations = {};

    function init() {
        RED.hooks.add("viewRedrawNode.annotations", function(evt) {
            try {
                if (evt.node.__pendingAnnotation__) {
                    addAnnotation(evt.node.__pendingAnnotation__,evt);
                    delete evt.node.__pendingAnnotation__;
                }
                var badgeDX = 0;
                var controlDX = 0;
                for (var i=0,l=evt.el.__annotations__.length;i<l;i++) {
                    var annotation = evt.el.__annotations__[i];
                    if (annotations.hasOwnProperty(annotation.id)) {
                        var opts = annotations[annotation.id];
                        var showAnnotation = true;
                        var isBadge = opts.type === 'badge';
                        if (opts.show !== undefined) {
                            if (typeof opts.show === "string") {
                                showAnnotation = !!evt.node[opts.show]
                            } else if (typeof opts.show === "function"){
                                showAnnotation = opts.show(evt.node)
                            } else {
                                showAnnotation = !!opts.show;
                            }
                            annotation.element.classList.toggle("hide", !showAnnotation);
                        }
                        if (isBadge) {
                            if (showAnnotation) {
                                var rect = annotation.element.getBoundingClientRect();
                                badgeDX += rect.width;
                                annotation.element.setAttribute("transform", "translate("+(evt.node.w-3-badgeDX)+", -8)");
                                badgeDX += 4;
                            }
                        } else {
                            if (showAnnotation) {
                                var rect = annotation.element.getBoundingClientRect();
                                annotation.element.setAttribute("transform", "translate("+(3+controlDX)+", -12)");
                                controlDX += rect.width + 4;
                            }
                        }
                    } else {
                        annotation.element.parentNode.removeChild(annotation.element);
                        evt.el.__annotations__.splice(i,1);
                        i--;
                        l--;
                    }
                }
        }catch(err) {
            console.log(err)
        }
        });
    }


    /**
     * Register a new node annotation
     * @param {string} id - unique identifier
     * @param {type} opts - annotations options
     *
     * opts: {
     *   type: "badge"
     *   class: "",
     *   element: function(node),
     *   show: string|function(node),
     *   filter: function(node) -> boolean
     * }
     */
    function register(id, opts) {
        if (opts.type !== 'badge') {
            throw new Error("Unsupported annotation type: "+opts.type);
        }
        annotations[id] = opts
        RED.hooks.add("viewAddNode.annotation-"+id, function(evt) {
            if (opts.filter && !opts.filter(evt.node)) {
                return;
            }
            addAnnotation(id,evt);
        });

        var nodes = RED.view.getActiveNodes();
        nodes.forEach(function(n) {
            n.__pendingAnnotation__ = id;
        })
        RED.view.redraw();

    }

    function addAnnotation(id,evt) {
        var opts = annotations[id];
        evt.el.__annotations__ = evt.el.__annotations__ || [];
        var annotationGroup = document.createElementNS("http://www.w3.org/2000/svg","g");
        annotationGroup.setAttribute("class",opts.class || "");
        evt.el.__annotations__.push({
            id:id,
            element: annotationGroup
        });
        var annotation = opts.element(evt.node);
        if (opts.tooltip) {
            annotation.addEventListener("mouseenter", getAnnotationMouseEnter(annotation,evt.node,opts.tooltip));
            annotation.addEventListener("mouseleave", annotationMouseLeave);
        }
        annotationGroup.appendChild(annotation);
        evt.el.appendChild(annotationGroup);
    }


    function unregister(id) {
        delete annotations[id]
        RED.hooks.remove("*.annotation-"+id);
        RED.view.redraw();
    }

    var badgeHoverTimeout;
    var badgeHover;
    function getAnnotationMouseEnter(annotation,node,tooltip) {
        return function() {
            var text = typeof tooltip === "function"?tooltip(node):tooltip;
            if (text) {
                clearTimeout(badgeHoverTimeout);
                badgeHoverTimeout = setTimeout(function() {
                    var pos = RED.view.getElementPosition(annotation);
                    var rect = annotation.getBoundingClientRect();
                    badgeHoverTimeout = null;
                    badgeHover = RED.view.showTooltip(
                        (pos[0]+rect.width/2),
                        (pos[1]),
                        text,
                        "top"
                    );
                },500);
            }
        }
    }
    function annotationMouseLeave() {
        clearTimeout(badgeHoverTimeout);
        if (badgeHover) {
            badgeHover.remove();
            badgeHover = null;
        }
    }

    return {
        init: init,
        register:register,
        unregister:unregister
    }

})();
