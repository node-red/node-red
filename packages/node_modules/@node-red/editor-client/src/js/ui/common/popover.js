/**
 * Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
/*
 * RED.popover.create(options) - create a popover callout box
 * RED.popover.tooltip(target,content, action) - add a tooltip to an element
 * RED.popover.menu(options) - create a dropdown menu
 * RED.popover.panel(content) - create a dropdown container element
 */


/*
 * RED.popover.create(options)
 *
 *  options
 *    - target : DOM element - the element to target with the popover
 *    - direction : string - position of the popover relative to target
 *                  'top', 'right'(default), 'bottom', 'left', 'inset-[top,right,bottom,left]'
 *    - trigger : string - what triggers the popover to be displayed
 *                  'hover' - display when hovering the target
 *                  'click' - display when target is clicked
 *                  'modal' - hmm not sure, need to find where we use that mode
 *    - content : string|function - contents of the popover. If a string, handled
 *                                  as raw HTML, so take care.
 *                                  If a function, can return a String to be added
 *                                  as text (not HTML), or a DOM element to append
 *    - delay : object - sets show/hide delays after mouseover/out events
 *                  { show: 750, hide: 50 }
 *    - autoClose : number - delay before closing the popover in some cases
 *                     if trigger is click - delay after mouseout
 *                     else if trigger not hover/modal - delay after showing
 *    - width : number - width of popover, default 'auto'
 *    - maxWidth : number - max width of popover, default 'auto'
 *    - size : string - scale of popover. 'default', 'small'
 *    - offset : number - px offset from target
 *    - tooltip : boolean - if true, clicking on popover closes it
 *    - class : string - optional css class to apply to popover
 *    - interactive : if trigger is 'hover' and this is set to true, allow the mouse
 *                    to move over the popover without hiding it.
 *
 * Returns the popover object with the following properties/functions:
 *   properties:
 *    - element : DOM element - the popover dom element
 *   functions:
 *    - setContent(content) - change the popover content. This only works if the
 *                            popover is not currently displayed. It does not
 *                            change the content of a visible popover.
 *    - open(instant) - show the popover. If 'instant' is true, don't fade in
 *    - close(instant) - hide the popover. If 'instant' is true, don't fade out
 *    - move(options) - move the popover. The options parameter can take many
 *                      of the options detailed above including:
 *                       target,direction,content,width,offset
 *                      Other settings probably won't work because we haven't needed to change them
 */

/*
 * RED.popover.tooltip(target,content, action)
 *
 *  - target : DOM element - the element to apply the tooltip to
 *  - content : string - the text of the tooltip
 *  - action : string - *optional* the name of an Action this tooltip is tied to
 *                      For example, it 'target' is a button that triggers a particular action.
 *                      The tooltip will include the keyboard shortcut for the action
 *                      if one is defined
 *
 */

/*
 * RED.popover.menu(options)
 *
 *  options
 *    - options : array - list of menu options - see below for format
 *    - width : number - width of the menu. Default: 'auto'
 *    - class : string - class to apply to the menu container
 *    - maxHeight : number - maximum height of menu before scrolling items. Default: none
 *    - onselect : function(item) - called when a menu item is selected, if that item doesn't
 *                                  have its own onselect function
 *    - onclose : function(cancelled) - called when the menu is closed
 *    - disposeOnClose : boolean - by default, the menu is discarded when it closes
 *                                 and mustbe rebuilt to redisplay. Setting this to 'false'
 *                                 keeps the menu on the DOM so it can be shown again.
 *
 *  Menu Options array:
 *  [
 *      label : string|DOM element - the label of the item. Can be custom DOM element
 *      onselect : function - called when the item is selected
 *  ]
 *
 * Returns the menu object with the following functions:
 *
 *  - options([menuItems]) - if menuItems is undefined, returns the current items.
 *                           otherwise, sets the current menu items
 *  - show(opts) - shows the menu. `opts` is an object of options. See  RED.popover.panel.show(opts)
 *                 for the full list of options. In most scenarios, this just needs:
 *                  - target : DOM element - the element to display the menu below
 *  - hide(cancelled) - hide the menu
 */

/*
 * RED.popover.panel(content)
 *  Create a UI panel that can be displayed relative to any target element.
 *  Handles auto-closing when mouse clicks outside the panel
 *
 *  - 'content' - DOM element to display in the panel
 *
 * Returns the panel object with the following functions:
 *
 *  properties:
 *    - container : DOM element - the panel element
 *
 *  functions:
 *    - show(opts) - show the panel.
 *       opts:
 *          - onclose : function - called when the panel closes
 *          - closeButton : DOM element - if the panel is closeable by a click of a button,
 *                                        by providing a reference to it here, we can
 *                                        handle the events properly to hide the panel
 *          - target : DOM element - the element to display the panel relative to
 *          - align : string - should the panel align to the left or right edge of target
 *                             default: 'right'
 *          - offset : Array - px offset to apply from the target. [width, height]
 *          - dispose : boolean - whether the panel should be removed from DOM when hidden
 *                                default: true
 *    - hide(dispose) - hide the panel.
 */

RED.popover = (function() {
    var deltaSizes = {
        "default": {
            x: 12,
            y: 12
        },
        "small": {
            x:8,
            y:8
        }
    }
    function createPopover(options) {
        var target = options.target;
        var direction = options.direction || "right";
        var trigger = options.trigger;
        var content = options.content;
        var delay = options.delay ||  { show: 750, hide: 50 };
        var autoClose = options.autoClose;
        var width = options.width||"auto";
        var maxWidth = options.maxWidth;
        var size = options.size||"default";
        var popupOffset = options.offset || 0;
        if (!deltaSizes[size]) {
            throw new Error("Invalid RED.popover size value:",size);
        }

        var timer = null;
        var active;
        var div;
        var contentDiv;
        var currentStyle;

        var openPopup = function(instant) {
            if (active) {
                var existingPopover = target.data("red-ui-popover");
                if (options.tooltip && existingPopover) {
                    active = false;
                    return;
                }
                div = $('<div class="red-ui-popover"></div>');
                if (options.class) {
                    div.addClass(options.class);
                }
                contentDiv = $('<div class="red-ui-popover-content">').appendTo(div);
                if (size !== "default") {
                    div.addClass("red-ui-popover-size-"+size);
                }
                if (typeof content === 'function') {
                    var result = content.call(res);
                    if (result === null) {
                        return;
                    }
                    if (typeof result === 'string') {
                        contentDiv.text(result);
                    } else {
                        contentDiv.append(result);
                    }
                } else {
                    contentDiv.html(content);
                }
                div.appendTo("body");

                movePopup({target,direction,width,maxWidth});

                if (existingPopover) {
                    existingPopover.close(true);
                }
                if (options.trigger !== 'manual') {
                    target.data("red-ui-popover",res)
                }
                if (options.tooltip) {
                    div.on("mousedown", function(evt) {
                        closePopup(true);
                    });
                }
                if (/*trigger === 'hover' && */options.interactive) {
                    div.on('mouseenter', function(e) {
                        clearTimeout(timer);
                        active = true;
                    })
                    div.on('mouseleave', function(e) {
                        if (timer) {
                            clearTimeout(timer);
                        }
                        if (active) {
                            timer = setTimeout(function() {
                                active = false;
                                closePopup();
                            },delay.hide);
                        }
                    })
                }
                if (instant) {
                    div.show();
                } else {
                    div.fadeIn("fast");
                }
            }
        }
        var movePopup = function(options) {
            target = options.target || target;
            direction = options.direction || direction || "right";
            popupOffset = options.offset || popupOffset;
            var transition = options.transition;

            var width = options.width||"auto";
            div.width(width);
            if (options.maxWidth) {
                div.css("max-width",options.maxWidth)
            } else {
                div.css("max-width", 'auto');
            }

            var targetPos = target[0].getBoundingClientRect();
            var targetHeight = targetPos.height;
            var targetWidth = targetPos.width;

            var divHeight = div.outerHeight();
            var divWidth = div.outerWidth();
            var paddingRight = 10;

            var viewportTop = $(window).scrollTop();
            var viewportLeft = $(window).scrollLeft();
            var viewportBottom = viewportTop + $(window).height();
            var viewportRight = viewportLeft + $(window).width();
            var top = 0;
            var left = 0;
            if (direction === 'right') {
                top = targetPos.top+targetHeight/2-divHeight/2;
                left = targetPos.left+targetWidth+deltaSizes[size].x+popupOffset;
            } else if (direction === 'left') {
                top = targetPos.top+targetHeight/2-divHeight/2;
                left = targetPos.left-deltaSizes[size].x-divWidth-popupOffset;
            } else if (direction === 'bottom') {
                top = targetPos.top+targetHeight+deltaSizes[size].y+popupOffset;
                left = targetPos.left+targetWidth/2-divWidth/2;
                if (left < 0) {
                    direction = "right";
                    top = targetPos.top+targetHeight/2-divHeight/2;
                    left = targetPos.left+targetWidth+deltaSizes[size].x+popupOffset;
                } else if (left+divWidth+paddingRight > viewportRight) {
                    direction = "left";
                    top = targetPos.top+targetHeight/2-divHeight/2;
                    left = targetPos.left-deltaSizes[size].x-divWidth-popupOffset;
                    if (top+divHeight+targetHeight/2 + 5 > viewportBottom) {
                        top -= (top+divHeight+targetHeight/2 - viewportBottom + 5)
                    }
                } else if (top+divHeight > viewportBottom) {
                    direction = 'top';
                    top = targetPos.top-deltaSizes[size].y-divHeight-popupOffset;
                    left = targetPos.left+targetWidth/2-divWidth/2;
                }
            } else if (direction === 'top') {
                top = targetPos.top-deltaSizes[size].y-divHeight-popupOffset;
                left = targetPos.left+targetWidth/2-divWidth/2;
                if (top < 0) {
                    direction = 'bottom';
                    top = targetPos.top+targetHeight+deltaSizes[size].y+popupOffset;
                    left = targetPos.left+targetWidth/2-divWidth/2;
                }
            } else if (/inset/.test(direction)) {
                top = targetPos.top + targetHeight/2 - divHeight/2;
                left = targetPos.left + targetWidth/2 - divWidth/2;

                if (/bottom/.test(direction)) {
                    top = targetPos.top + targetHeight - divHeight-popupOffset;
                }
                if (/top/.test(direction)) {
                    top = targetPos.top+popupOffset;
                }
                if (/left/.test(direction)) {
                    left = targetPos.left+popupOffset;
                }
                if (/right/.test(direction)) {
                    left = targetPos.left + targetWidth - divWidth-popupOffset;
                }
            }
            if (currentStyle) {
                div.removeClass(currentStyle);
            }
            if (transition) {
                div.css({
                    "transition": "0.6s ease",
                    "transition-property": "top,left,right,bottom"
                })
            }
            currentStyle = 'red-ui-popover-'+direction;
            div.addClass(currentStyle).css({top: top, left: left});
            if (transition) {
                setTimeout(function() {
                    div.css({
                        "transition": "none"
                    });
                },600);
            }

        }
        var closePopup = function(instant) {
            $(document).off('mousedown.red-ui-popover');
            if (!active) {
                if (div) {
                    if (instant) {
                        div.remove();
                    } else {
                        div.fadeOut("fast",function() {
                            $(this).remove();
                        });
                    }
                    div = null;
                    target.removeData("red-ui-popover",res)
                }
            }
        }

        target.on("remove", function (ev) {
            if (timer) {
                clearTimeout(timer);
            }
            if (active) {
                active = false;
                setTimeout(closePopup,delay.hide);
            }
        });

        if (trigger === 'hover') {
            target.on('mouseenter',function(e) {
                clearTimeout(timer);
                if (!active) {
                    active = true;
                    timer = setTimeout(openPopup,delay.show);
                }
            });
            target.on('mouseleave disabled', function(e) {
                if (timer) {
                    clearTimeout(timer);
                }
                if (active) {
                    active = false;
                    setTimeout(closePopup,delay.hide);
                }
            });
        } else if (trigger === 'click') {
            target.on("click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                active = !active;
                if (!active) {
                    closePopup();
                } else {
                    openPopup();
                }
            });
            if (autoClose) {
                target.on('mouseleave disabled', function(e) {
                    if (timer) {
                        clearTimeout(timer);
                    }
                    if (active) {
                        active = false;
                        setTimeout(closePopup,autoClose);
                    }
                });
            }

        } else if (trigger === 'modal') {
            $(document).on('mousedown.red-ui-popover', function (event) {
                var target = event.target;
                while (target.nodeName !== 'BODY' && target !== div[0]) {
                    target = target.parentElement;
                }
                if (target.nodeName === 'BODY') {
                    active = false;
                    closePopup();
                }
            });
        } else if (autoClose) {
            setTimeout(function() {
                active = false;
                closePopup();
            },autoClose);
        }
        var res = {
            get element() { return div },
            setContent: function(_content) {
                content = _content;

                return res;
            },
            open: function (instant) {
                active = true;
                openPopup(instant);
                return res;
            },
            close: function (instant) {
                active = false;
                closePopup(instant);
                return res;
            },
            move: function(options) {
                movePopup(options);
                return
            }
        }
        return res;

    }

    return {
        create: createPopover,
        tooltip: function(target,content, action, interactive) {
            var label = function() {
                var label = content;
                if (typeof content === 'function') {
                    label = content()
                }
                if (action) {
                    var shortcut = RED.keyboard.getShortcut(action);
                    if (shortcut && shortcut.key) {
                        label = $('<span>'+content+' <span class="red-ui-popover-key">'+RED.keyboard.formatKey(shortcut.key, true)+'</span></span>');
                    }
                }
                return label;
            }
            var popover = RED.popover.create({
                tooltip: true,
                target:target,
                trigger: "hover",
                size: "small",
                direction: "bottom",
                content: label,
                interactive,
                delay: { show: 750, hide: 50 }
            });
            popover.setContent = function(newContent) {
                content = newContent;
            }
            popover.setAction = function(newAction) {
                action = newAction;
            }
            popover.delete = function() {
                popover.close(true)
                target.off("mouseenter");
                target.off("mouseleave");
            };
            return popover;

        },
        menu: function(options) {
            var list = $('<ul class="red-ui-menu"></ul>');
            if (options.style === 'compact') {
                list.addClass("red-ui-menu-compact");
            }
            var menuOptions = options.options || [];
            var first;

            var container = RED.popover.panel(list);
            if (options.width) {
                container.container.width(options.width);
            }
            if (options.class) {
                container.container.addClass(options.class);
            }
            if (options.maxHeight) {
                container.container.css({
                    "max-height": options.maxHeight,
                    "overflow-y": 'auto'
                })
            }
            var menu = {
                options: function(opts) {
                    if (opts === undefined) {
                        return menuOptions
                    }
                    menuOptions = opts || [];
                    list.empty();
                    menuOptions.forEach(function(opt) {
                        var item = $('<li>').appendTo(list);
                        var link = $('<a href="#"></a>').appendTo(item);
                        if (typeof opt.label == "string") {
                            link.text(opt.label)
                        } else if (opt.label){
                            opt.label.appendTo(link);
                        }
                        link.on("click", function(evt) {
                            evt.preventDefault();
                            if (opt.onselect) {
                                opt.onselect();
                            } else if (options.onselect) {
                                options.onselect(opt);
                            }
                            menu.hide();
                        })
                        if (!first) { first = link}
                    })
                },
                show: function(opts) {
                    $(document).on("keydown.red-ui-menu", function(evt) {
                        var currentItem = list.find(":focus").parent();
                        if (evt.keyCode === 40) {
                            evt.preventDefault();
                            // DOWN
                            if (currentItem.length > 0) {
                                if (currentItem.index() === menuOptions.length-1) {
                                    // Wrap to top of list
                                    list.children().first().children().first().focus();
                                } else {
                                    currentItem.next().children().first().focus();
                                }
                            } else {
                                list.children().first().children().first().focus();
                            }
                        } else if (evt.keyCode === 38) {
                            evt.preventDefault();
                            // UP
                            if (currentItem.length > 0) {
                                if (currentItem.index() === 0) {
                                    // Wrap to bottom of list
                                    list.children().last().children().first().focus();
                                } else {
                                    currentItem.prev().children().first().focus();
                                }
                            } else {
                                list.children().last().children().first().focus();
                            }
                        } else if (evt.keyCode === 27) {
                            // ESCAPE
                            evt.preventDefault();
                            menu.hide(true);
                        } else if (evt.keyCode === 9 && options.tabSelect) {
                            // TAB - with tabSelect enabled
                            evt.preventDefault();
                            currentItem.find("a").trigger("click");

                        }
                        evt.stopPropagation();
                    })
                    opts.onclose = function() {
                        $(document).off("keydown.red-ui-menu");
                        if (options.onclose) {
                            options.onclose(true);
                        }
                    }
                    container.show(opts);
                },
                hide: function(cancelled) {
                    $(document).off("keydown.red-ui-menu");
                    container.hide(options.disposeOnClose);
                    if (options.onclose) {
                        options.onclose(cancelled);
                    }
                }
            }
            menu.options(menuOptions);
            return menu;
        },
        panel: function(content) {
            var panel = $('<div class="red-ui-editor-dialog red-ui-popover-panel"></div>');
            panel.css({ display: "none" });
            panel.appendTo(document.body);
            content.appendTo(panel);

            function hide(dispose) {
                $(document).off("mousedown.red-ui-popover-panel-close");
                $(document).off("keydown.red-ui-popover-panel-close");
                panel.hide();
                panel.css({
                    height: "auto"
                });
                if (dispose !== false) {
                    panel.remove();
                }
            }
            function show(options) {
                var closeCallback = options.onclose;
                var closeButton = options.closeButton;
                var target = options.target;
                var align = options.align || "right";
                var offset = options.offset || [0,0];
                var xPos = options.x;
                var yPos = options.y;
                var isAbsolutePosition = (xPos !== undefined && yPos !== undefined)

                var pos = isAbsolutePosition?{left:xPos, top: yPos}:target.offset();
                var targetWidth = isAbsolutePosition?0:target.width();
                var targetHeight = isAbsolutePosition?0:target.outerHeight();
                var panelHeight = panel.height();
                var panelWidth = panel.width();

                var top = (targetHeight+pos.top) + offset[1];
                if (top+panelHeight-$(document).scrollTop() > $(window).height()) {
                    top -= (top+panelHeight)-$(window).height() + 5;
                }
                if (top < 0) {
                    panel.height(panelHeight+top)
                    top = 0;
                }
                if (align === "right") {
                    panel.css({
                        top: top+"px",
                        left: (pos.left+offset[0])+"px",
                    });
                } else if (align === "left") {
                    panel.css({
                        top: top+"px",
                        left: (pos.left-panelWidth+offset[0])+"px",
                    });
                }
                panel.slideDown(100);

                $(document).on("keydown.red-ui-popover-panel-close", function(event) {
                    if (event.keyCode === 27) {
                        // ESCAPE
                        if (closeCallback) {
                            closeCallback();
                        }
                        hide(options.dispose);
                    }
                });

                $(document).on("mousedown.red-ui-popover-panel-close", function(event) {
                    var hitCloseButton = closeButton && $(event.target).closest(closeButton).length;
                    if(!hitCloseButton && !$(event.target).closest(panel).length && !$(event.target).closest(".red-ui-editor-dialog").length) {
                        if (closeCallback) {
                            closeCallback();
                        }
                        hide(options.dispose);
                    }
                    // if ($(event.target).closest(target).length) {
                    //     event.preventDefault();
                    // }
                })
            }
            return  {
                container: panel,
                show:show,
                hide:hide
            }
        }
    }

})();
