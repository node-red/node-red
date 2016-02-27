/**
 * Copyright 2016 IBM Corp.
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

    function resize() {

    }
    function showTray(options) {
        var el = $('<div class="editor-tray"></div>');
        var header = $('<div class="editor-tray-header">'+(options.title||"")+'</div>').appendTo(el);
        var body = $('<div class="editor-tray-body"></div>').appendTo(el);
        var footer = $('<div class="editor-tray-footer"></div>').appendTo(el);
        if (options.buttons) {
            for (var i=0;i<options.buttons.length;i++) {
                var button = options.buttons[i];

                var b = $('<button>').appendTo(footer);
                if (button.id) {
                    b.attr('id',button.id);
                }
                if (button.text) {
                    b.text(button.text);
                }
                if (button.click) {
                    b.click(button.click);
                }
                if (button.class) {
                    b.addClass(button.class);
                }
            }
        }
        el.appendTo("#editor-stack");
        var tray = {
            tray: el,
            header: header,
            body: body,
            footer: footer,
            options: options
        };
        if (options.open) {
            options.open(el);
        }

        $("#editor-shade").show();
        el.css({
            right: -(el.width()+10)+"px",
            transition: "right 0.2s ease"
        });
        $("#workspace").scrollLeft(0);

        stack.push(tray);

        setTimeout(function() {
            var trayHeight = el.height()-header.outerHeight()-footer.outerHeight();
            body.height(trayHeight-40);

            if (options.resize) {
                options.resize();
            }
            el.css({right:0});
        },0);
    }

    return {
        init: function() {
            $( window ).resize(function() {
                if (stack.length > 0) {
                    var tray = stack[stack.length-1];
                    var trayHeight = tray.tray.height()-tray.header.outerHeight()-tray.footer.outerHeight();
                    tray.body.height(trayHeight-40);

                    if (tray.options.resize) {
                        tray.options.resize();
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
                },200)
            } else {
                showTray(options);
            }

        },
        close: function close() {
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
                            oldTray.tray.css({right:0});
                        },0);
                    }
                },200)
                if (stack.length === 0) {
                    $("#editor-shade").hide();
                }
            }
        }
    }
})();
