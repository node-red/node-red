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
RED.tray = (function() {

    var stack = [];
    var editorStack;
    var openingTray = false;
    var stackHidden = false;

    function resize() {

    }
    function showTray(options) {
        var el = $('<div class="red-ui-tray"></div>');
        // `editor-tray-header` is deprecated - use red-ui-tray-body instead
        var header = $('<div class="red-ui-tray-header editor-tray-header"></div>').appendTo(el);
        var bodyWrapper = $('<div class="red-ui-tray-body-wrapper"></div>').appendTo(el);
        // `editor-tray-body` is deprecated - use red-ui-tray-body instead
        var body = $('<div class="red-ui-tray-body editor-tray-body"></div>').appendTo(bodyWrapper);
        // `editor-tray-footer` is deprecated - use red-ui-tray-footer instead
        var footer = $('<div class="red-ui-tray-footer"></div>').appendTo(el);
        var resizer = $('<div class="red-ui-tray-resize-handle"></div>').appendTo(el);
        // var growButton = $('<a class="red-ui-tray-resize-button" style="cursor: w-resize;"><i class="fa fa-angle-left"></i></a>').appendTo(resizer);
        // var shrinkButton = $('<a class="red-ui-tray-resize-button" style="cursor: e-resize;"><i style="margin-left: 1px;" class="fa fa-angle-right"></i></a>').appendTo(resizer);
        if (options.title) {
            var titles = stack.map(function(e) { return e.options.title });
            titles.push(options.title);
            var title = '<ul class="red-ui-tray-breadcrumbs"><li>'+titles.join("</li><li>")+'</li></ul>';

            $('<div class="red-ui-tray-titlebar">'+title+'</div>').appendTo(header);
        }
        if (options.width === Infinity) {
            options.maximized = true;
            resizer.addClass('red-ui-tray-resize-maximised');
        }
        var buttonBar = $('<div class="red-ui-tray-toolbar"></div>').appendTo(header);
        var primaryButton;
        if (options.buttons) {
            for (var i=0;i<options.buttons.length;i++) {
                var button = options.buttons[i];
                var b = $('<button>').button().appendTo(buttonBar);
                if (button.id) {
                    b.attr('id',button.id);
                }
                if (button.text) {
                    b.text(button.text);
                }
                if (button.click) {
                    b.on("click", (function(action) {
                        return function(evt) {
                            if (!$(this).hasClass('disabled')) {
                                action(evt);
                            }
                        };
                    })(button.click));
                }
                if (button.class) {
                    b.addClass(button.class);
                    if (button.class === "primary") {
                        primaryButton = button;
                    }
                }
            }
        }
        el.appendTo(editorStack);
        var tray = {
            tray: el,
            header: header,
            body: body,
            footer: footer,
            options: options,
            primaryButton: primaryButton
        };
        stack.push(tray);

        if (!options.maximized) {
            el.draggable({
                handle: resizer,
                axis: "x",
                start:function(event,ui) {
                    el.width('auto');
                },
                drag: function(event,ui) {
                    var absolutePosition = editorStack.position().left+ui.position.left
                    if (absolutePosition < 7) {
                        ui.position.left += 7-absolutePosition;
                    } else if (ui.position.left > -tray.preferredWidth-1) {
                        ui.position.left = -Math.min(editorStack.position().left-7,tray.preferredWidth-1);
                    }
                    if (tray.options.resize) {
                        setTimeout(function() {
                            tray.options.resize({width: -ui.position.left});
                        },0);
                    }
                    tray.width = -ui.position.left;
                },
                stop:function(event,ui) {
                    el.width(-ui.position.left);
                    el.css({left:''});
                    if (tray.options.resize) {
                        tray.options.resize({width: -ui.position.left});
                    }
                    tray.width = -ui.position.left;
                }
            });
        }

        function finishBuild() {
            $("#red-ui-header-shade").show();
            $("#red-ui-editor-shade").show();
            $("#red-ui-palette-shade").show();
            $(".red-ui-sidebar-shade").show();
            tray.preferredWidth = Math.max(el.width(),500);
            if (!options.maximized) {
                body.css({"minWidth":tray.preferredWidth-40});
            }
            if (options.width) {
                if (options.width > $("#red-ui-editor-stack").position().left-8) {
                    options.width = $("#red-ui-editor-stack").position().left-8;
                }
                el.width(options.width);
            } else {
                el.width(tray.preferredWidth);
            }

            tray.width = el.width();
            if (tray.width > $("#red-ui-editor-stack").position().left-8) {
                tray.width = Math.max(0/*tray.preferredWidth*/,$("#red-ui-editor-stack").position().left-8);
                el.width(tray.width);
            }

            // tray.body.parent().width(Math.min($("#red-ui-editor-stack").position().left-8,tray.width));


            $("#red-ui-main-container").scrollLeft(0);
            el.css({
                right: -(el.width()+10)+"px",
                transition: "right 0.25s ease"
            });
            handleWindowResize();
            openingTray = true;
            setTimeout(function() {
                setTimeout(function() {
                    if (!options.width) {
                        el.width(Math.min(tray.preferredWidth,$("#red-ui-editor-stack").position().left-8));
                    }
                    if (options.resize) {
                        options.resize({width:el.width()});
                    }
                    if (options.show) {
                        options.show();
                    }
                    setTimeout(function() {
                        // Delay resetting the flag, so we don't close prematurely
                        openingTray = false;
                    },200);
                    body.find(":focusable:first").trigger("focus");

                },150);
                el.css({right:0});
            },0);
        }
        if (options.open) {
            if (options.open.length === 1) {
                options.open(el);
                finishBuild();
            } else {
                options.open(el,finishBuild);
            }
        } else {
            finishBuild();
        }
    }

    function handleWindowResize() {
        if (stack.length > 0) {
            var tray = stack[stack.length-1];
            if (tray.options.maximized || tray.width > $("#red-ui-editor-stack").position().left-8) {
                tray.width = $("#red-ui-editor-stack").position().left-8;
                tray.tray.width(tray.width);
                // tray.body.parent().width(tray.width);
            } else if (tray.width < tray.preferredWidth) {
                tray.width = Math.min($("#red-ui-editor-stack").position().left-8,tray.preferredWidth);
                tray.tray.width(tray.width);
                // tray.body.parent().width(tray.width);
            }
            var trayHeight = tray.tray.height()-tray.header.outerHeight()-tray.footer.outerHeight();
            tray.body.height(trayHeight);
            if (tray.options.resize) {
                tray.options.resize({width:tray.width, height:trayHeight});
            }

        }
    }

    return {
        init: function init() {
            editorStack = $("#red-ui-editor-stack");
            $(window).on("resize", handleWindowResize);
            RED.events.on("sidebar:resize",handleWindowResize);
            $("#red-ui-editor-shade").on("click", function() {
                if (!openingTray) {
                    var tray = stack[stack.length-1];
                    if (tray && tray.primaryButton) {
                        tray.primaryButton.click();
                    }
                }
            });
        },
        show: function show(options) {
            if (!options) {
                if (stack.length > 0) {
                    var tray = stack[stack.length-1];
                    tray.tray.css({right:0});
                    $("#red-ui-header-shade").show();
                    $("#red-ui-editor-shade").show();
                    $("#red-ui-palette-shade").show();
                    $(".red-ui-sidebar-shade").show();
                    stackHidden = false;
                }
            } else if (stackHidden) {
                throw new Error("Cannot add to stack whilst hidden");
            } else if (stack.length > 0 && !options.overlay) {
                var oldTray = stack[stack.length-1];
                if (options.width === "inherit") {
                    options.width = oldTray.tray.width();
                }
                oldTray.tray.css({
                    right: -(oldTray.tray.width()+10)+"px"
                });
                setTimeout(function() {
                    oldTray.tray.detach();
                    showTray(options);
                },250)
            } else {
                RED.events.emit("editor:open");
                showTray(options);
            }

        },
        hide: function hide() {
            if (stack.length > 0) {
                var tray = stack[stack.length-1];
                tray.tray.css({
                    right: -(tray.tray.width()+10)+"px"
                });
                $("#red-ui-header-shade").hide();
                $("#red-ui-editor-shade").hide();
                $("#red-ui-palette-shade").hide();
                $(".red-ui-sidebar-shade").hide();
                stackHidden = true;
            }
        },
        resize: handleWindowResize,
        close: function close(done) {
            if (stack.length > 0) {
                var tray = stack.pop();
                tray.tray.css({
                    right: -(tray.tray.width()+10)+"px"
                });
                setTimeout(function() {
                    if (tray.options.close) {
                        tray.options.close();
                    }
                    tray.tray.remove();
                    if (stack.length > 0) {
                        var oldTray = stack[stack.length-1];
                        if (!oldTray.options.overlay) {
                            oldTray.tray.appendTo("#red-ui-editor-stack");
                            setTimeout(function() {
                                handleWindowResize();
                                oldTray.tray.css({right:0});
                                if (oldTray.options.show) {
                                    oldTray.options.show();
                                }
                            },0);
                        } else {
                            handleWindowResize();
                            if (oldTray.options.show) {
                                oldTray.options.show();
                            }
                        }
                    }
                    if (done) {
                        done();
                    }
                    if (stack.length === 0) {
                        $("#red-ui-header-shade").hide();
                        $("#red-ui-editor-shade").hide();
                        $("#red-ui-palette-shade").hide();
                        $(".red-ui-sidebar-shade").hide();
                        RED.events.emit("editor:close");
                        RED.view.focus();
                    }
                },250)
            }
        }
    }
})();
