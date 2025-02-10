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
RED.user = (function() {

    function login(opts,done) {
        if (typeof opts == 'function') {
            done = opts;
            opts = {};
        }

        var dialog = $('<div id="node-dialog-login" class="hide" style="display: flex; align-items: flex-end;">'+
                       '<div style="width: 250px; flex-grow: 0;"><img id="node-dialog-login-image" src=""/></div>'+
                       '<div style="flex-grow: 1;">'+
                            '<form id="node-dialog-login-fields" class="form-horizontal" style="margin-bottom: 0px; margin-left:20px;"></form>'+
                       '</div>'+
                       '</div>');

        dialog.dialog({
            autoOpen: false,
            classes: {
                "ui-dialog": "red-ui-editor-dialog",
                "ui-dialog-titlebar-close": "hide",
                "ui-widget-overlay": "red-ui-editor-dialog"
            },
            modal: true,
            closeOnEscape: !!opts.cancelable,
            width: 600,
            resizable: false,
            draggable: false,
            close: function( event, ui ) {
                $("#node-dialog-login").dialog('destroy').remove();
                RED.keyboard.enable()
            }
        });

        $("#node-dialog-login-fields").empty();
        $.ajax({
            dataType: "json",
            url: "auth/login",
            success: function(data) {
                var i=0;

                if (data.type == "credentials") {

                    for (;i<data.prompts.length;i++) {
                        var field = data.prompts[i];
                        var row = $("<div/>",{class:"form-row"});
                        $('<label for="node-dialog-login-'+field.id+'">'+RED._(field.label)+':</label><br/>').appendTo(row);
                        var input = $('<input style="width: 100%" id="node-dialog-login-'+field.id+'" type="'+field.type+'" tabIndex="'+(i+1)+'"/>').appendTo(row);

                        if (i<data.prompts.length-1) {
                            input.keypress(
                                (function() {
                                    var r = row;
                                    return function(event) {
                                        if (event.keyCode == 13) {
                                            r.next("div").find("input").trigger("focus");
                                            event.preventDefault();
                                        }
                                    }
                                })()
                            );
                        }
                        row.appendTo("#node-dialog-login-fields");
                    }
                    $('<div class="form-row" style="text-align: right; margin-top: 10px;"><span id="node-dialog-login-failed" style="line-height: 2em;float:left;color:var(--red-ui-text-color-error);" class="hide">'+RED._("user.loginFailed")+'</span><img src="red/images/spin.svg" style="height: 30px; margin-right: 10px; " class="login-spinner hide"/>'+
                        (opts.cancelable?'<a href="#" id="node-dialog-login-cancel" class="red-ui-button" style="margin-right: 20px;" tabIndex="'+(i+1)+'">'+RED._("common.label.cancel")+'</a>':'')+
                        '<input type="submit" id="node-dialog-login-submit" class="red-ui-button" style="width: auto;" tabIndex="'+(i+2)+'" value="'+RED._("user.login")+'"></div>').appendTo("#node-dialog-login-fields");


                    $("#node-dialog-login-submit").button();
                    $("#node-dialog-login-fields").on("submit", function(event) {
                        $("#node-dialog-login-submit").button("option","disabled",true);
                        $("#node-dialog-login-failed").hide();
                        $(".login-spinner").show();

                        var body = {
                            client_id: "node-red-editor",
                            grant_type: "password",
                            scope:""
                        }
                        for (var i=0;i<data.prompts.length;i++) {
                            var field = data.prompts[i];
                            body[field.id] = $("#node-dialog-login-"+field.id).val();
                        }
                        $.ajax({
                            url:"auth/token",
                            type: "POST",
                            data: body
                        }).done(function(data,textStatus,xhr) {
                            RED.settings.set("auth-tokens",data);
                            if (opts.updateMenu) {
                                updateUserMenu();
                            }
                            $("#node-dialog-login").dialog("close");
                            done();
                        }).fail(function(jqXHR,textStatus,errorThrown) {
                            RED.settings.remove("auth-tokens");
                            $("#node-dialog-login-failed").show();
                        }).always(function() {
                            $("#node-dialog-login-submit").button("option","disabled",false);
                            $(".login-spinner").hide();
                        });
                        event.preventDefault();
                    });

                } else if (data.type == "strategy") {
                    var sessionMessage = /[?&]session_message=(.*?)(?:$|&)/.exec(window.location.search);
                    RED.sessionMessages = RED.sessionMessages || [];
                    if (sessionMessage) {
                        RED.sessionMessages.push(decodeURIComponent(sessionMessage[1]));
                        if (history.pushState) {
                            var newurl = window.location.protocol+"//"+window.location.host+window.location.pathname
                            window.history.replaceState({ path: newurl }, "", newurl);
                        } else {
                            window.location.search = "";
                        }
                    }

                    if (RED.sessionMessages.length === 0 && data.autoLogin) {
                        document.location = data.loginRedirect
                        return
                    }

                    i = 0;
                    for (;i<data.prompts.length;i++) {
                        var field = data.prompts[i];
                        if (RED.sessionMessages) {
                            var sessionMessages = $("<div/>",{class:"form-row",style:"text-align: center"}).appendTo("#node-dialog-login-fields");
                            RED.sessionMessages.forEach(function (msg) {
                                $('<div>').css("color","var(--red-ui-text-color-error)").text(msg).appendTo(sessionMessages);
                            });
                            delete RED.sessionMessages;
                        }
                        var row = $("<div/>",{class:"form-row",style:"text-align: center"}).appendTo("#node-dialog-login-fields");

                        var loginButton = $('<a href="#" class="red-ui-button"></a>',{style: "padding: 10px"}).appendTo(row).on("click", function() {
                            document.location = field.url;
                        });
                        if (field.image) {
                            $("<img>",{src:field.image}).appendTo(loginButton);
                        } else if (field.label) {
                            var label = $('<span></span>').text(field.label);
                            if (field.icon) {
                                $('<i></i>',{class: "fa fa-2x "+field.icon, style:"vertical-align: middle"}).appendTo(loginButton);
                                label.css({
                                    "verticalAlign":"middle",
                                    "marginLeft":"8px"
                                });

                            }
                            label.appendTo(loginButton);
                        }
                        loginButton.button();
                    }


                } else {
                    if (data.prompts) {
                        if (data.loginMessage) {
                            const sessionMessages = $("<div/>",{class:"form-row",style:"text-align: center"}).appendTo("#node-dialog-login-fields");
                            $('<div>').text(data.loginMessage).appendTo(sessionMessages);
                        }

                        i = 0;
                        for (;i<data.prompts.length;i++) {
                            var field = data.prompts[i];
                            var row = $("<div/>",{class:"form-row",style:"text-align: center"}).appendTo("#node-dialog-login-fields");
                            var loginButton = $('<a href="#" class="red-ui-button"></a>',{style: "padding: 10px"}).appendTo(row).on("click", function() {
                                document.location = field.url;
                            });
                            if (field.image) {
                                $("<img>",{src:field.image}).appendTo(loginButton);
                            } else if (field.label) {
                                var label = $('<span></span>').text(field.label);
                                if (field.icon) {
                                    $('<i></i>',{class: "fa fa-2x "+field.icon, style:"vertical-align: middle"}).appendTo(loginButton);
                                    label.css({
                                        "verticalAlign":"middle",
                                        "marginLeft":"8px"
                                    });

                                }
                                label.appendTo(loginButton);
                            }
                            loginButton.button();
                        }
                    }
                }
                if (opts.cancelable) {
                    $("#node-dialog-login-cancel").button().on("click", function( event ) {
                        $("#node-dialog-login").dialog('close');

                    });
                }

                var loginImageSrc = data.image || "red/images/node-red-256.svg";

                $("#node-dialog-login-image").load(function() {
                    dialog.dialog("open");
                }).attr("src",loginImageSrc);
                RED.keyboard.disable();
            }
        });
    }

    function logout() {
        RED.events.emit('logout')
        var tokens = RED.settings.get("auth-tokens");
        var token = tokens?tokens.access_token:"";
        $.ajax({
            url: "auth/revoke",
            type: "POST",
            data: {token:token}
        }).done(function(data,textStatus,xhr) {
            RED.settings.remove("auth-tokens");
            if (data && data.redirect) {
                document.location.href = data.redirect;
            } else {
                document.location.reload(true);
            }
        }).fail(function(jqXHR,textStatus,errorThrown) {
            if (jqXHR.status === 401) {
                document.location.reload(true);
            } else {
                console.log(textStatus);
            }
        })
    }

    function updateUserMenu() {
        $("#red-ui-header-button-user-submenu li").remove();
        const userMenu = $("#red-ui-header-button-user")
        userMenu.empty()
        if (RED.settings.user.anonymous) {
            RED.menu.addItem("red-ui-header-button-user",{
                id:"usermenu-item-login",
                label:RED._("menu.label.login"),
                onselect: function() {
                    RED.user.login({cancelable:true},function() {
                        RED.settings.load(function() {
                            RED.notify(RED._("user.loggedInAs",{name:RED.settings.user.username}),"success");
                            updateUserMenu();
                            RED.events.emit("login",RED.settings.user.username);
                        });
                    });
                }
            });
        } else {
            RED.menu.addItem("red-ui-header-button-user",{
                id:"usermenu-item-username",
                label:"<b>"+RED.settings.user.username+"</b>"
            });
            RED.menu.addItem("red-ui-header-button-user",{
                id:"usermenu-item-logout",
                label:RED._("menu.label.logout"),
                onselect: function() {
                    RED.user.logout();
                }
            });
        }
        const userIcon = generateUserIcon(RED.settings.user)
        userIcon.appendTo(userMenu);
    }

    function init() {
        if (RED.settings.user) {
            if (!RED.settings.editorTheme || !RED.settings.editorTheme.hasOwnProperty("userMenu") || RED.settings.editorTheme.userMenu) {

                var userMenu = $('<li><a id="red-ui-header-button-user" class="button hide" href="#"></a></li>')
                    .prependTo(".red-ui-header-toolbar");
                RED.menu.init({id:"red-ui-header-button-user",
                    options: []
                });
                updateUserMenu();
            }
        }

    }

    var readRE = /^((.+)\.)?read$/
    var writeRE = /^((.+)\.)?write$/

    function hasPermission(permission) {
        if (permission === "") {
            return true;
        }
        if (!RED.settings.user) {
            return true;
        }
        return checkPermission(RED.settings.user.permissions||"",permission);
    }
    function checkPermission(userScope,permission) {
        if (permission === "") {
            return true;
        }
        var i;

        if (Array.isArray(permission)) {
            // Multiple permissions requested - check each one
            for (i=0;i<permission.length;i++) {
                if (!checkPermission(userScope,permission[i])) {
                    return false;
                }
            }
            // All permissions check out
            return true;
        }

        if (Array.isArray(userScope)) {
            if (userScope.length === 0) {
                return false;
            }
            for (i=0;i<userScope.length;i++) {
                if (checkPermission(userScope[i],permission)) {
                    return true;
                }
            }
            return false;
        }

        if (userScope === "*" || userScope === permission) {
            return true;
        }

        if (userScope === "read" || userScope === "*.read") {
            return readRE.test(permission);
        } else if (userScope === "write" || userScope === "*.write") {
            return writeRE.test(permission);
        }
        return false;
    }

    function generateUserIcon(user) {
        const userIcon = $('<span class="red-ui-user-profile"></span>')
        if (user.image) {
            userIcon.addClass('has_profile_image')
            userIcon.css({
                backgroundImage: "url("+user.image+")",
            })
        } else if (user.anonymous || (!user.username && !user.email)) {
            $('<i class="fa fa-user"></i>').appendTo(userIcon);
        } else {
            $('<span>').text((user.username || user.email).substring(0,2)).appendTo(userIcon);
        }
        if (user.profileColor !== undefined) {
            userIcon.addClass('red-ui-user-profile-color-' + user.profileColor)
        }
        return userIcon
    }

    return {
        init: init,
        login: login,
        logout: logout,
        hasPermission: hasPermission,
        generateUserIcon
    }

})();
