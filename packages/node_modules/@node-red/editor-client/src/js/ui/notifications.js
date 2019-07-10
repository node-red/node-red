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
RED.notifications = (function() {

    /*
    If RED.notifications.hide is set to true, all notifications will be hidden.
    This is to help with UI testing in certain cases and not intended for the
    end-user.

    // Example usage for a modal dialog with buttons
    var myNotification = RED.notify("This is the message to display",{
        modal: true,
        fixed: true,
        type: 'warning', // 'compact', 'success', 'warning', 'error'
        buttons: [
            {
                text: "cancel",
                click: function(e) {
                    myNotification.close();
                }
            },
            {
                text: "okay",
                class:"primary",
                click: function(e) {
                    myNotification.close();
                }
            }
        ]
    });
    */

    var persistentNotifications = {};

    var currentNotifications = [];
    var c = 0;
    function notify(msg,type,fixed,timeout) {
        var options = {};
        if (type !== null && typeof type === 'object') {
            options = type;
            fixed = options.fixed;
            timeout = options.timeout;
            type = options.type;
        }

        if (options.id && persistentNotifications.hasOwnProperty(options.id)) {
            persistentNotifications[options.id].update(msg,options);
            return persistentNotifications[options.id];
        }

        if (options.modal) {
            $("#red-ui-full-shade").show();
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
        n.id="red-ui-notification-"+c;
        n.className = "red-ui-notification";
        n.fixed = fixed;
        if (type) {
            n.className = "red-ui-notification red-ui-notification-"+type;
        }
        if (options.width) {
            var parentWidth = $("#red-ui-notifications").width();
            if (options.width > parentWidth) {
                var margin = -(options.width-parentWidth)/2;
                $(n).css({
                    width: options.width+"px",
                    marginLeft: margin+"px"
                })
            }
        }
        n.style.display = "none";
        if (typeof msg === "string") {
            if (!/<p>/i.test(msg)) {
                msg = "<p>"+msg+"</p>";
            }
            n.innerHTML = msg;
        } else {
            $(n).append(msg);
        }
        if (options.buttons) {
            var buttonSet = $('<div class="ui-dialog-buttonset"></div>').appendTo(n)
            options.buttons.forEach(function(buttonDef) {
                var b = $('<button>').html(buttonDef.text).on("click", buttonDef.click).appendTo(buttonSet);
                if (buttonDef.id) {
                    b.attr('id',buttonDef.id);
                }
                if (buttonDef.class) {
                    b.addClass(buttonDef.class);
                }
            })
        }


        $("#red-ui-notifications").append(n);
        if (!RED.notifications.hide) {
            $(n).slideDown(300);
        }
        n.close = (function() {
            var nn = n;
            return function() {
                if (nn.closed) {
                    return;
                }
                nn.closed = true;
                currentNotifications.splice(currentNotifications.indexOf(nn),1);
                if (options.id) {
                    delete persistentNotifications[options.id];
                    if (Object.keys(persistentNotifications).length === 0) {
                        notificationButtonWrapper.hide();
                    }
                }
                if (!RED.notifications.hide) {
                    $(nn).slideUp(300, function() {
                        nn.parentNode.removeChild(nn);
                    });
                } else {
                    nn.parentNode.removeChild(nn);
                }
                if (options.modal) {
                    $("#red-ui-full-shade").hide();
                }
            };
        })();
        n.hideNotification = (function() {
            var nn = n;
            return function() {
                if (nn.closed) {
                    return
                }
                nn.hidden = true;
                if (!RED.notifications.hide) {
                    $(nn).slideUp(300);
                }
            }
        })();
        n.showNotification = (function() {
            var nn = n;
            return function() {
                if (nn.closed || !nn.hidden) {
                    return
                }
                nn.hidden = false;
                if (!RED.notifications.hide) {
                    $(nn).slideDown(300);
                }
            }
        })();

        n.update = (function() {
            var nn = n;
            return function(msg,options) {
                if (typeof msg === "string") {
                    if (!/<p>/i.test(msg)) {
                        msg = "<p>"+msg+"</p>";
                    }
                    nn.innerHTML = msg;
                } else {
                    $(nn).empty().append(msg);
                }
                var timeout;
                if (typeof options === 'number') {
                    timeout = options;
                } else if (options !== undefined) {
                    if (!options.fixed) {
                        timeout = options.timeout || 5000;
                    }
                    if (options.buttons) {
                        var buttonSet = $('<div style="margin-top: 20px;" class="ui-dialog-buttonset"></div>').appendTo(nn)
                        options.buttons.forEach(function(buttonDef) {
                            var b = $('<button>').text(buttonDef.text).on("click", buttonDef.click).appendTo(buttonSet);
                            if (buttonDef.id) {
                                b.attr('id',buttonDef.id);
                            }
                            if (buttonDef.class) {
                                b.addClass(buttonDef.class);
                            }
                        })
                    }
                }
                if (timeout !== undefined && timeout > 0) {
                    window.clearTimeout(nn.timeoutid);
                    nn.timeoutid = window.setTimeout(nn.close,timeout);
                } else {
                    window.clearTimeout(nn.timeoutid);
                }
                if (nn.hidden) {
                    nn.showNotification();
                } else if (!options || !options.silent){
                    $(nn).addClass("red-ui-notification-shake-horizontal");
                    setTimeout(function() {
                        $(nn).removeClass("red-ui-notification-shake-horizontal");
                    },300);
                }

            }
        })();

        if (!fixed) {
            $(n).on("click", (function() {
                var nn = n;
                return function() {
                    nn.close();
                    window.clearTimeout(nn.timeoutid);
                };
            })());
            n.timeoutid = window.setTimeout(n.close,timeout||5000);
        }
        currentNotifications.push(n);
        if (options.id) {
            persistentNotifications[options.id] = n;
            if (options.fixed) {
                notificationButtonWrapper.show();
            }
        }
        c+=1;
        return n;
    }

    RED.notify = notify;


    function hidePersistent() {
        for(var i in persistentNotifications) {
            if (persistentNotifications.hasOwnProperty(i)) {
                persistentNotifications[i].hideNotification();
            }
        }
    }
    function showPersistent() {
        for(var i in persistentNotifications) {
            if (persistentNotifications.hasOwnProperty(i)) {
                persistentNotifications[i].showNotification();
            }
        }
    }

    var notificationButtonWrapper;

    return {
        init: function() {
            $('<div id="red-ui-notifications"></div>').appendTo("#red-ui-editor");

            notificationButtonWrapper = $('<li></li>').prependTo(".red-ui-header-toolbar").hide();
            $('<a class="button" href="#"><i class="fa fa-warning"></i></a>')
                .appendTo(notificationButtonWrapper)
                .on("click", function() {
                    showPersistent();
                })
        },
        notify: notify
    }
})();
