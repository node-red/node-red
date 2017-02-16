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
    var editorStack = $("#editor-stack");
    var openingTray = false;

    function resize() {

    }
    function showTray(options) {
        var el = $('<div class="editor-tray"></div>');
        var header = $('<div class="editor-tray-header"></div>').appendTo(el);
        var bodyWrapper = $('<div class="editor-tray-body-wrapper"></div>').appendTo(el);
        var body = $('<div class="editor-tray-body"></div>').appendTo(bodyWrapper);
        var footer = $('<div class="editor-tray-footer"></div>').appendTo(el);
        var resizer = $('<div class="editor-tray-resize-handle"></div>').appendTo(el);
        // var growButton = $('<a class="editor-tray-resize-button" style="cursor: w-resize;"><i class="fa fa-angle-left"></i></a>').appendTo(resizer);
        // var shrinkButton = $('<a class="editor-tray-resize-button" style="cursor: e-resize;"><i style="margin-left: 1px;" class="fa fa-angle-right"></i></a>').appendTo(resizer);
        if (options.title) {
            $('<div class="editor-tray-titlebar">'+options.title+'</div>').appendTo(header);
        }
        var buttonBar = $('<div class="editor-tray-toolbar"></div>').appendTo(header);
        var primaryButton;
        if (options.buttons) {
            for (var i=0;i<options.buttons.length;i++) {
                var button = options.buttons[i];
                var b = $('<button>').button().appendTo(buttonBar);
                if (button.id) {
                    b.attr('id',button.id);
                }
                if (button.text) {
                    b.html(button.text);
                }
                if (button.click) {
                    b.click((function(action) {
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

        function finishBuild() {
            $("#header-shade").show();
            $("#editor-shade").show();
            $("#palette-shade").show();
            $(".sidebar-shade").show();

            tray.preferredWidth = Math.max(el.width(),500);
            body.css({"minWidth":tray.preferredWidth-40});

            if (options.width) {
                if (options.width > $("#editor-stack").position().left-8) {
                    options.width = $("#editor-stack").position().left-8;
                }
                el.width(options.width);
            } else {
                el.width(tray.preferredWidth);
            }

            tray.width = el.width();
            if (tray.width > $("#editor-stack").position().left-8) {
                tray.width = Math.max(0/*tray.preferredWidth*/,$("#editor-stack").position().left-8);
                el.width(tray.width);
            }

            // tray.body.parent().width(Math.min($("#editor-stack").position().left-8,tray.width));

            el.css({
                right: -(el.width()+10)+"px",
                transition: "right 0.25s ease"
            });
            $("#workspace").scrollLeft(0);
            handleWindowResize();
            openingTray = true;
            setTimeout(function() {
                setTimeout(function() {
                    if (!options.width) {
                        el.width(Math.min(tray.preferredWidth,$("#editor-stack").position().left-8));
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
                    body.find(":focusable:first").focus();

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
            var trayHeight = tray.tray.height()-tray.header.outerHeight()-tray.footer.outerHeight();
            tray.body.height(trayHeight-40);
            if (tray.width > $("#editor-stack").position().left-8) {
                tray.width = $("#editor-stack").position().left-8;
                tray.tray.width(tray.width);
                // tray.body.parent().width(tray.width);
            } else if (tray.width < tray.preferredWidth) {
                tray.width = Math.min($("#editor-stack").position().left-8,tray.preferredWidth);
                tray.tray.width(tray.width);
                // tray.body.parent().width(tray.width);
            }
            if (tray.options.resize) {
                tray.options.resize({width:tray.width});
            }
        }
    }

    return {
        init: function init() {
            $(window).resize(handleWindowResize);
            RED.events.on("sidebar:resize",handleWindowResize);
            $("#editor-shade").click(function() {
                if (!openingTray) {
                    var tray = stack[stack.length-1];
                    if (tray && tray.primaryButton) {
                        tray.primaryButton.click();
                    }
                }
            });
        },
        show: function show(options) {
            if (stack.length > 0) {
                var oldTray = stack[stack.length-1];
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
                        oldTray.tray.appendTo("#editor-stack");
                        setTimeout(function() {
                            handleWindowResize();
                            oldTray.tray.css({right:0});
                            if (oldTray.options.show) {
                                oldTray.options.show();
                            }
                        },0);
                    }
                    if (done) {
                        done();
                    }
                    if (stack.length === 0) {
                        $("#header-shade").hide();
                        $("#editor-shade").hide();
                        $("#palette-shade").hide();
                        $(".sidebar-shade").hide();
                        RED.events.emit("editor:close");
                        RED.view.focus();
                    }
                },250)
            }
        }
    }
})();
