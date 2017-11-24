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
RED.notify = (function() {
    var currentNotifications = [];
    var c = 0;
    return function(msg,type,fixed,timeout) {
        var options = {};
        if (type !== null && typeof type === 'object') {
            options = type;
            fixed = options.fixed;
            timeout = options.timeout;
            type = options.type;
        }

        if (options.modal) {
            $("#header-shade").show();
            $("#editor-shade").show();
            $("#palette-shade").show();
            $(".sidebar-shade").show();
        }

        if (currentNotifications.length > 4) {
            var ll = currentNotifications.length;
            for (var i = 0;ll > 4 && i<currentNotifications.length;i+=1) {
                var notifiction = currentNotifications[i];
                if (!notifiction.fixed) {
                    window.clearTimeout(notifiction.timeoutid);
                    notifiction.close();
                    ll -= 1;
                }
            }
        }
        var n = document.createElement("div");
        n.id="red-notification-"+c;
        n.className = "notification";
        n.fixed = fixed;
        if (type) {
            n.className = "notification notification-"+type;
        }
        n.style.display = "none";
        if (typeof msg === "string") {
            n.innerHTML = msg;
        } else {
            $(n).append(msg);
        }
        if (options.buttons) {
            var buttonSet = $('<div style="margin-top: 20px;" class="ui-dialog-buttonset"></div>').appendTo(n)
            options.buttons.forEach(function(buttonDef) {
                var b = $('<button>').html(buttonDef.text).click(buttonDef.click).appendTo(buttonSet);
                if (buttonDef.class) {
                    b.addClass(buttonDef.class);
                }
            })
        }


        $("#notifications").append(n);
        $(n).slideDown(300);
        n.close = (function() {
            var nn = n;
            return function() {
                currentNotifications.splice(currentNotifications.indexOf(nn),1);
                $(nn).slideUp(300, function() {
                    nn.parentNode.removeChild(nn);
                });
                if (options.modal) {
                    $("#header-shade").hide();
                    $("#editor-shade").hide();
                    $("#palette-shade").hide();
                    $(".sidebar-shade").hide();
                }
            };
        })();

        n.update = (function() {
            var nn = n;
            return function(msg,timeout) {
                if (typeof msg === "string") {
                    nn.innerHTML = msg;
                } else {
                    $(nn).empty().append(msg);
                }
                if (timeout !== undefined && timeout > 0) {
                    window.clearTimeout(nn.timeoutid);
                    nn.timeoutid = window.setTimeout(nn.close,timeout);
                } else {
                    window.clearTimeout(nn.timeoutid);
                }
            }
        })();

        if (!fixed) {
            $(n).click((function() {
                var nn = n;
                return function() {
                    nn.close();
                    window.clearTimeout(nn.timeoutid);
                };
            })());
            n.timeoutid = window.setTimeout(n.close,timeout||5000);
        }
        currentNotifications.push(n);
        c+=1;
        return n;
    }
})();
