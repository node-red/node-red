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


    function createPopover(options) {
        var target = options.target;

        var content = options.content;
        var delay = options.delay;
        var timer = null;
        var active;
        var div;

        var openPopup = function() {
            if (active) {
                div = $('<div class="red-ui-popover"></div>').html(content).appendTo("body");
                var targetPos = target.offset();
                var targetWidth = target.width();
                var targetHeight = target.height();

                var divHeight = div.height();
                div.css({top: targetPos.top+targetHeight/2-divHeight/2-10,left:targetPos.left+targetWidth+17});

                div.fadeIn("fast");
            }
        }
        var closePopup = function() {
            if (!active) {
                if (div) {
                    div.fadeOut("fast",function() {
                        $(this).remove();
                    });
                    div = null;
                }
            }
        }

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
        var res = {
            setContent: function(_content) {
                content = _content;
            }
        }
        target.data('popover',res);
        return res;

    }

    return {
        create: createPopover
    }

})();
