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
            leftRight: 17,
            leftLeft: 25,
            leftBottom: 8,
        },
        "small": {
            top: 5,
            leftRight: 17,
            leftLeft: 16,
            leftBottom: 3,
        }
    }
    function createPopover(options) {
        var target = options.target;
        var direction = options.direction || "right";
        var trigger = options.trigger;
        var content = options.content;
        var delay = options.delay;
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
                div = $('<div class="red-ui-popover red-ui-popover-'+direction+'"></div>');
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
                if (direction === 'right') {
                    div.css({top: targetPos.top+targetHeight/2-divHeight/2-deltaSizes[size].top,left:targetPos.left+targetWidth+deltaSizes[size].leftRight});
                } else if (direction === 'left') {
                    div.css({top: targetPos.top+targetHeight/2-divHeight/2-deltaSizes[size].top,left:targetPos.left-deltaSizes[size].leftLeft-divWidth});
                } else if (direction === 'bottom') {
                    div.css({top: targetPos.top+targetHeight+deltaSizes[size].top,left:targetPos.left+targetWidth/2-divWidth/2 - deltaSizes[size].leftBottom});
                }
                if (instant) {
                    div.show();
                } else {
                    div.fadeIn("fast");
                }
            }
        }
        var closePopup = function(instant) {
            if (!active) {
                if (div) {
                    if (instant) {
                        $(this).remove();
                    } else {
                        div.fadeOut("fast",function() {
                            $(this).remove();
                        });
                    }
                    div = null;
                }
            }
        }

        if (trigger === 'hover') {
            target.on('mouseenter',function(e) {
                clearTimeout(timer);
                active = true;
                timer = setTimeout(openPopup,delay.show);
            });
            target.on('mouseleave', function(e) {
                if (timer) {
                    clearTimeout(timer);
                }
                active = false;
                setTimeout(closePopup,delay.hide);
            });
        } else if (trigger === 'click') {
            target.click(function(e) {
                e.preventDefault();
                e.stopPropagation();
                active = !active;
                if (!active) {
                    closePopup();
                } else {
                    openPopup();
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
        tooltip: function(target,content) {
            RED.popover.create({
                target:target,
                trigger: "hover",
                size: "small",
                direction: "bottom",
                content: content,
                delay: { show: 550, hide: 10 }
            });
        }
    }

})();
