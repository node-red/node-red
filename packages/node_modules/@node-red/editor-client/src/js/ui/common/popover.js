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

RED.popover = (function() {
    var deltaSizes = {
        "default": {
            top: 10,
            topTop: 30,
            leftRight: 17,
            leftLeft: 25,
            leftBottom: 8,
            leftTop: 11
        },
        "small": {
            top: 6,
            topTop: 20,
            leftRight: 8,
            leftLeft: 26,
            leftBottom: 8,
            leftTop: 9
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
        var size = options.size||"default";
        if (!deltaSizes[size]) {
            throw new Error("Invalid RED.popover size value:",size);
        }

        var timer = null;
        var active;
        var div;

        var openPopup = function(instant) {
            if (active) {
                var existingPopover = target.data("red-ui-popover");
                if (options.tooltip && existingPopover) {
                    active = false;
                    return;
                }
                div = $('<div class="red-ui-popover"></div>');
                if (size !== "default") {
                    div.addClass("red-ui-popover-size-"+size);
                }
                if (typeof content === 'function') {
                    var result = content.call(res);
                    if (result === null) {
                        return;
                    }
                    if (typeof result === 'string') {
                        div.text(result);
                    } else {
                        div.append(result);
                    }
                } else {
                    div.html(content);
                }
                if (width !== "auto") {
                    div.width(width);
                }
                div.appendTo("body");

                var targetPos = target.offset();
                var targetWidth = target.outerWidth();
                var targetHeight = target.outerHeight();
                var divHeight = div.height();
                var divWidth = div.width();
                var paddingRight = 10;

                var viewportTop = $(window).scrollTop();
                var viewportLeft = $(window).scrollLeft();
                var viewportBottom = viewportTop + $(window).height();
                var viewportRight = viewportLeft + $(window).width();
                var top = 0;
                var left = 0;
                var d = direction;
                if (d === 'right') {
                    top = targetPos.top+targetHeight/2-divHeight/2-deltaSizes[size].top;
                    left = targetPos.left+targetWidth+deltaSizes[size].leftRight;
                } else if (d === 'left') {
                    top = targetPos.top+targetHeight/2-divHeight/2-deltaSizes[size].top;
                    left = targetPos.left-deltaSizes[size].leftLeft-divWidth;
                } else if (d === 'bottom') {
                    top = targetPos.top+targetHeight+deltaSizes[size].top;
                    left = targetPos.left+targetWidth/2-divWidth/2 - deltaSizes[size].leftBottom;
                    if (left < 0) {
                        d = "right";
                        top = targetPos.top+targetHeight/2-divHeight/2-deltaSizes[size].top;
                        left = targetPos.left+targetWidth+deltaSizes[size].leftRight;
                    } else if (left+divWidth+paddingRight > viewportRight) {
                        d = "left";
                        top = targetPos.top+targetHeight/2-divHeight/2-deltaSizes[size].top;
                        left = targetPos.left-deltaSizes[size].leftLeft-divWidth;
                        if (top+divHeight+targetHeight/2 + 5 > viewportBottom) {
                            top -= (top+divHeight+targetHeight/2 - viewportBottom + 5)
                        }
                    } else if (top+divHeight > viewportBottom) {
                        d = 'top';
                        top = targetPos.top-deltaSizes[size].topTop-divHeight;
                        left = targetPos.left+targetWidth/2-divWidth/2 - deltaSizes[size].leftTop;
                    }
                } else if (d === 'top') {
                    top = targetPos.top-deltaSizes[size].topTop-divHeight;
                    left = targetPos.left+targetWidth/2-divWidth/2 - deltaSizes[size].leftTop;
                    if (top < 0) {
                        d = 'bottom';
                        top = targetPos.top+targetHeight+deltaSizes[size].top;
                        left = targetPos.left+targetWidth/2-divWidth/2 - deltaSizes[size].leftBottom;
                    }
                }
                div.addClass('red-ui-popover-'+d).css({top: top, left: left});
                if (existingPopover) {
                    existingPopover.close(true);
                }
                target.data("red-ui-popover",res)
                if (options.tooltip) {
                    div.on("mousedown", function(evt) {
                        closePopup(true);
                    });
                }
                if (trigger === 'hover' && options.interactive) {
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
            }
        }
        return res;

    }

    return {
        create: createPopover,
        tooltip: function(target,content, action) {
            var label = content;
            if (action) {
                label = function() {
                    var label = content;
                    var shortcut = RED.keyboard.getShortcut(action);
                    if (shortcut && shortcut.key) {
                        label = $('<span>'+content+' <span class="red-ui-popover-key">'+RED.keyboard.formatKey(shortcut.key, true)+'</span></span>');
                    }
                    return label;
                }
            }
            return RED.popover.create({
                tooltip: true,
                target:target,
                trigger: "hover",
                size: "small",
                direction: "bottom",
                content: label,
                delay: { show: 750, hide: 50 }
            });
        },
        menu: function(options) {
            var list = $('<ul class="red-ui-menu"></ul>');
            if (options.style === 'compact') {
                list.addClass("red-ui-menu-compact");
            }
            var menuOptions = options.options || [];
            var first;
            menuOptions.forEach(function(opt) {
                var item = $('<li>').appendTo(list);
                var link = $('<a href="#"></a>').text(opt.label).appendTo(item);
                link.on("click", function(evt) {
                    evt.preventDefault();
                    if (opt.onselect) {
                        opt.onselect();
                    }
                    menu.hide();
                })
                if (!first) { first = link}
            })
            var container = RED.popover.panel(list);
            var menu = {
                show: function(opts) {
                    $(document).on("keydown.red-ui-menu", function(evt) {
                        var currentItem = list.find(":focus").parent();
                        if (evt.keyCode === 40) {
                            evt.preventDefault();
                            // DOWN
                            if (currentItem.length > 0) {
                                if (currentItem.index() === menuOptions.length-1) {
                                    console.log("WARP TO TOP")
                                    // Wrap to top of list
                                    list.children().first().children().first().focus();
                                } else {
                                    console.log("GO DOWN ONE")
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
                                    console.log("WARP TO BOTTOM")
                                    // Wrap to bottom of list
                                    list.children().last().children().first().focus();
                                } else {
                                    console.log("GO UP ONE")
                                    currentItem.prev().children().first().focus();
                                }
                            } else {
                                list.children().last().children().first().focus();
                            }
                        } else if (evt.keyCode === 27) {
                            // ESCAPE
                            evt.preventDefault();
                            menu.hide(true);
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
            return menu;
        },
        panel: function(content) {
            var panel = $('<div class="red-ui-editor-dialog red-ui-popover-panel"></div>');
            panel.css({ display: "none" });
            panel.appendTo(document.body);
            content.appendTo(panel);
            var closeCallback;

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
                var target = options.target;
                var align = options.align || "right";
                var offset = options.offset || [0,0];

                var pos = target.offset();
                var targetWidth = target.width();
                var targetHeight = target.height();
                var panelHeight = panel.height();
                var panelWidth = panel.width();

                var top = (targetHeight+pos.top) + offset[1];
                if (top+panelHeight > $(window).height()) {
                    top -= (top+panelHeight)-$(window).height() + 5;
                }
                if (top < 0) {
                    panelHeight.height(panelHeight+top)
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
                    if(!$(event.target).closest(panel).length && !$(event.target).closest(".red-ui-editor-dialog").length) {
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
