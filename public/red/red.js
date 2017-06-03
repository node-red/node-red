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
var RED = {};
;/**
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

 RED.events = (function() {
     var handlers = {};

     function on(evt,func) {
         handlers[evt] = handlers[evt]||[];
         handlers[evt].push(func);
     }
     function off(evt,func) {
         var handler = handlers[evt];
         if (handler) {
             for (var i=0;i<handler.length;i++) {
                 if (handler[i] === func) {
                     handler.splice(i,1);
                     return;
                 }
             }
         }
     }
     function emit(evt,arg) {
         if (handlers[evt]) {
             for (var i=0;i<handlers[evt].length;i++) {
                 try {
                     handlers[evt][i](arg);
                 } catch(err) {
                     console.log("RED.events.emit error: ["+evt+"] "+(err.toString()));
                     console.log(err);
                 }
             }

         }
     }
     return {
         on: on,
         off: off,
         emit: emit
     }
 })();
;/**
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

RED.i18n = (function() {

    return {
        init: function(done) {
            i18n.init({
                resGetPath: 'locales/__ns__?lng=__lng__',
                dynamicLoad: false,
                load:'current',
                ns: {
                    namespaces: ["editor","node-red","jsonata","infotips"],
                    defaultNs: "editor"
                },
                fallbackLng: ['en-US'],
                fallbackNS: ['node-red', 'editor'],
                useCookie: false
            },function() {
                done();
            });
            RED["_"] = function() {
                return i18n.t.apply(null,arguments);
            }

        },
        loadCatalog: function(namespace,done) {
            i18n.loadNamespace(namespace,done);
        },

        loadNodeCatalogs: function(done) {
            var languageList = i18n.functions.toLanguages(i18n.detectLanguage());
            var toLoad = languageList.length;

            languageList.forEach(function(lang) {
                $.ajax({
                    headers: {
                        "Accept":"application/json"
                    },
                    cache: false,
                    url: 'locales/nodes?lng='+lang,
                    success: function(data) {
                        var namespaces = Object.keys(data);
                        namespaces.forEach(function(ns) {
                            i18n.addResourceBundle(lang,ns,data[ns]);
                        });
                        toLoad--;
                        if (toLoad === 0) {
                            done();
                        }
                    }
                });
            })
        }
    }
})();
;/**
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


RED.settings = (function () {

    var loadedSettings = {};

    var hasLocalStorage = function () {
        try {
            return 'localStorage' in window && window['localStorage'] !== null;
        } catch (e) {
            return false;
        }
    };

    var set = function (key, value) {
        if (!hasLocalStorage()) {
            return;
        }
        localStorage.setItem(key, JSON.stringify(value));
    };

    /**
     * If the key is not set in the localStorage it returns <i>undefined</i>
     * Else return the JSON parsed value
     * @param key
     * @returns {*}
     */
    var get = function (key) {
        if (!hasLocalStorage()) {
            return undefined;
        }
        return JSON.parse(localStorage.getItem(key));
    };

    var remove = function (key) {
        if (!hasLocalStorage()) {
            return;
        }
        localStorage.removeItem(key);
    };

    var setProperties = function(data) {
        for (var prop in loadedSettings) {
            if (loadedSettings.hasOwnProperty(prop) && RED.settings.hasOwnProperty(prop)) {
                delete RED.settings[prop];
            }
        }
        for (prop in data) {
            if (data.hasOwnProperty(prop)) {
                RED.settings[prop] = data[prop];
            }
        }
        loadedSettings = data;
    };

    var init = function (done) {
        var accessTokenMatch = /[?&]access_token=(.*?)(?:$|&)/.exec(window.location.search);
        if (accessTokenMatch) {
            var accessToken = accessTokenMatch[1];
            RED.settings.set("auth-tokens",{access_token: accessToken});
            window.location.search = "";
        }

        $.ajaxSetup({
            beforeSend: function(jqXHR,settings) {
                // Only attach auth header for requests to relative paths
                if (!/^\s*(https?:|\/|\.)/.test(settings.url)) {
                    var auth_tokens = RED.settings.get("auth-tokens");
                    if (auth_tokens) {
                        jqXHR.setRequestHeader("Authorization","Bearer "+auth_tokens.access_token);
                    }
                    jqXHR.setRequestHeader("Node-RED-API-Version","v2");
                }
            }
        });

        load(done);
    }

    var load = function(done) {
        $.ajax({
            headers: {
                "Accept": "application/json"
            },
            dataType: "json",
            cache: false,
            url: 'settings',
            success: function (data) {
                setProperties(data);
                if (!RED.settings.user || RED.settings.user.anonymous) {
                    RED.settings.remove("auth-tokens");
                }
                console.log("Node-BLUE: " + data.version);
                done();
            },
            error: function(jqXHR,textStatus,errorThrown) {
                if (jqXHR.status === 401) {
                    if (/[?&]access_token=(.*?)(?:$|&)/.test(window.location.search)) {
                        window.location.search = "";
                    }
                    RED.user.login(function() { load(done); });
                } else {
                    console.log("Unexpected error:",jqXHR.status,textStatus);
                }
            }
        });
    };

    function theme(property,defaultValue) {
        if (!RED.settings.editorTheme) {
            return defaultValue;
        }
        var parts = property.split(".");
        var v = RED.settings.editorTheme;
        try {
            for (var i=0;i<parts.length;i++) {
                v = v[parts[i]];
            }
            if (v === undefined) {
                return defaultValue;
            }
            return v;
        } catch(err) {
            return defaultValue;
        }
    }

    return {
        init: init,
        load: load,
        set: set,
        get: get,
        remove: remove,
        theme: theme
    }
})
();
;/**
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

        var dialog = $('<div id="node-dialog-login" class="hide">'+
                       '<div style="display: inline-block;width: 250px; vertical-align: top; margin-right: 10px; margin-bottom: 20px;"><img id="node-dialog-login-image" src=""/></div>'+
                       '<div style="display: inline-block; width: 250px; vertical-align: bottom; margin-left: 10px; margin-bottom: 20px;">'+
                       '<form id="node-dialog-login-fields" class="form-horizontal" style="margin-bottom: 0px;"></form>'+
                       '</div>'+
                       '</div>');

        dialog.dialog({
            autoOpen: false,
            dialogClass: "ui-dialog-no-close",
            modal: true,
            closeOnEscape: !!opts.cancelable,
            width: 600,
            resizable: false,
            draggable: false
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
                        $('<label for="node-dialog-login-'+field.id+'">'+field.label+':</label><br/>').appendTo(row);
                        var input = $('<input style="width: 100%" id="node-dialog-login-'+field.id+'" type="'+field.type+'" tabIndex="'+(i+1)+'"/>').appendTo(row);

                        if (i<data.prompts.length-1) {
                            input.keypress(
                                (function() {
                                    var r = row;
                                    return function(event) {
                                        if (event.keyCode == 13) {
                                            r.next("div").find("input").focus();
                                            event.preventDefault();
                                        }
                                    }
                                })()
                            );
                        }
                        row.appendTo("#node-dialog-login-fields");
                    }
                    $('<div class="form-row" style="text-align: right; margin-top: 10px;"><span id="node-dialog-login-failed" style="line-height: 2em;float:left;" class="hide">'+RED._("user.loginFailed")+'</span><img src="red/images/spin.svg" style="height: 30px; margin-right: 10px; " class="login-spinner hide"/>'+
                        (opts.cancelable?'<a href="#" id="node-dialog-login-cancel" style="margin-right: 20px;" tabIndex="'+(i+1)+'">'+RED._("common.label.cancel")+'</a>':'')+
                        '<input type="submit" id="node-dialog-login-submit" style="width: auto;" tabIndex="'+(i+2)+'" value="'+RED._("user.login")+'"></div>').appendTo("#node-dialog-login-fields");


                    $("#node-dialog-login-submit").button();
                    $("#node-dialog-login-fields").submit(function(event) {
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
                            $("#node-dialog-login").dialog('destroy').remove();
                            if (opts.updateMenu) {
                                updateUserMenu();
                            }
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
                    i = 0;
                    for (;i<data.prompts.length;i++) {
                        var field = data.prompts[i];
                        var row = $("<div/>",{class:"form-row",style:"text-align: center"}).appendTo("#node-dialog-login-fields");

                        var loginButton = $('<a href="#"></a>',{style: "padding: 10px"}).appendTo(row).click(function() {
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
                if (opts.cancelable) {
                    $("#node-dialog-login-cancel").button().click(function( event ) {
                        $("#node-dialog-login").dialog('destroy').remove();
                    });
                }

                var loginImageSrc = data.image || "red/images/node-red-256.png";

                $("#node-dialog-login-image").load(function() {
                    dialog.dialog("open");
                }).attr("src",loginImageSrc);


            }
        });
    }

    function logout() {
        $.ajax({
            url: "auth/revoke",
            type: "POST",
            data: {token:RED.settings.get("auth-tokens").access_token},
            success: function(data) {
                RED.settings.remove("auth-tokens");
                if (data && data.redirect) {
                    document.location.href = data.redirect;
                } else {
                    document.location.reload(true);
                }
            }
        })
    }

    function updateUserMenu() {
        $("#btn-usermenu-submenu li").remove();
        if (RED.settings.user.anonymous) {
            RED.menu.addItem("btn-usermenu",{
                id:"usermenu-item-login",
                label:RED._("menu.label.login"),
                onselect: function() {
                    RED.user.login({cancelable:true},function() {
                        RED.settings.load(function() {
                            RED.notify(RED._("user.loggedInAs",{name:RED.settings.user.username}),"success");
                            updateUserMenu();
                        });
                    });
                }
            });
        } else {
            RED.menu.addItem("btn-usermenu",{
                id:"usermenu-item-username",
                label:"<b>"+RED.settings.user.username+"</b>"
            });
            RED.menu.addItem("btn-usermenu",{
                id:"usermenu-item-logout",
                label:RED._("menu.label.logout"),
                onselect: function() {
                    RED.user.logout();
                }
            });
        }

    }

    function init() {
        if (RED.settings.user) {
            if (!RED.settings.editorTheme || !RED.settings.editorTheme.hasOwnProperty("userMenu")) {

                var userMenu = $('<li><a id="btn-usermenu" class="button hide" data-toggle="dropdown" href="#"></a></li>')
                    .prependTo(".header-toolbar");
                if (RED.settings.user.image) {
                    $('<span class="user-profile"></span>').css({
                        backgroundImage: "url("+RED.settings.user.image+")",
                    }).appendTo(userMenu.find("a"));
                } else {
                    $('<i class="fa fa-user"></i>').appendTo(userMenu.find("a"));
                }

                RED.menu.init({id:"btn-usermenu",
                    options: []
                });
                updateUserMenu();
            }
        }

    }
    return {
        init: init,
        login: login,
        logout: logout
    }

})();
;/** This file was modified by Sathya Laufer */

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

RED.comms = (function() {
    var homegear = null;
    var errornotification = null;
    var subscriptions = {};

    function getHomegear()
    {
        return homegear;
    }

    function readCookie(key) {
        var result;
        return (result = new RegExp('(?:^|; )' + encodeURIComponent(key) + '=([^;]*)').exec(document.cookie)) ? (result[1]) : null;
    }

    function homegearEvent(message) {
        if(message.method == "nodeEvent") {
            if(message.params[2].format && !message.params[2].format.match(/string/g)) message.params[2].msg = JSON.stringify(message.params[2].msg);
            for (var t in subscriptions) {
                if (subscriptions.hasOwnProperty(t)) {
                    var re = new RegExp("^"+t.replace(/([\[\]\?\(\)\\\\$\^\*\.|])/g,"\\$1").replace(/\+/g,"[^/]+").replace(/\/#$/,"(\/.*)?")+"$");
                    if (re.test(message.params[1])) {
                        var subscribers = subscriptions[t];
                        if (subscribers) {
                            for (var i=0;i<subscribers.length;i++) {
                                subscribers[i](message.params[1], message.params[2]);
                            }
                        }
                    }
                }
            }
        }
    }

    function connectWS() {
        var ssl = window.location.protocol == "https:" ? true : false;
        var server = '';
        var port = ssl ? '443' : '80';
        var ipEndIndex = window.location.host.indexOf(']');
        if(ipEndIndex > -1) { //IPv6
            part2 = window.location.host.substring(ipEndIndex);
            if(part2.length > 2 && part2.charAt(1) == ':') port = part2.substring(2);
            server = window.location.host.substring(0, ipEndIndex + 1);
        } else {
            var hostArray = window.location.host.split(':');
            server = hostArray[0];
            if(hostArray.length > 1) port = hostArray[1];
        }
        var sessionId = readCookie('PHPSESSID');
        homegear = new HomegearWS(server, port, 'hgflows', ssl, sessionId);
        homegear.ready(function() {
            if(errornotification) {
                errornotification.close();
                errornotification = null;
            }
        });
        homegear.error(function(message) {
            if(errornotification) errornotification.close();
            errornotification = RED.notify(RED._("notification.error",{message:RED._("notification.errors.lostConnection")}),"error",true);
        });
        homegear.event(homegearEvent);
        homegear.connect();        
    }

    function subscribe(topic,callback) {
        if (subscriptions[topic] == null) {
            subscriptions[topic] = [];
        }
        subscriptions[topic].push(callback);
    }

    function unsubscribe(topic,callback) {
        if (subscriptions[topic]) {
            for (var i=0;i<subscriptions[topic].length;i++) {
                if (subscriptions[topic][i] === callback) {
                    subscriptions[topic].splice(i,1);
                    break;
                }
            }
            if (subscriptions[topic].length === 0) {
                delete subscriptions[topic];
            }
        }
    }

    function getEvents() {
        homegear.invoke("getNodeEvents", function(message) {
            for(var nodeKey in message.result) {
                if (message.result.hasOwnProperty(nodeKey)) {
                    var node = message.result[nodeKey];
                    for(var topicKey in node) {
                        if (node.hasOwnProperty(topicKey)) {
                            var value = node[topicKey];
                            if(value.format && !value.format.match(/string/g)) value.msg = JSON.stringify(value.msg);
                            for (var t in subscriptions) {
                                if (subscriptions.hasOwnProperty(t)) {
                                    var re = new RegExp("^"+t.replace(/([\[\]\?\(\)\\\\$\^\*\.|])/g,"\\$1").replace(/\+/g,"[^/]+").replace(/\/#$/,"(\/.*)?")+"$");
                                    if (re.test(topicKey)) {
                                        var subscribers = subscriptions[t];
                                        if (subscribers) {
                                            for (var i=0;i<subscribers.length;i++) {
                                                subscribers[i](topicKey, value);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    return {
        homegear: getHomegear,
        connect: connectWS,
        subscribe: subscribe,
        unsubscribe: unsubscribe,
        getEvents: getEvents
    }
})();
;/**
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
RED.text = {};
RED.text.bidi = (function() {
    var textDir = "";
    var LRE = "\u202A",
        RLE = "\u202B",
        PDF = "\u202C";

    function isRTLValue(stringValue) {
        var length = stringValue.length;
        for (var i=0;i<length;i++) {
            if (isBidiChar(stringValue.charCodeAt(i))) {
                return true;
            }
            else if(isLatinChar(stringValue.charCodeAt(i))) {
                return false;
            }
         }
         return false;
    }

    function isBidiChar(c)  {
        return (c >= 0x05d0 && c <= 0x05ff)||
               (c >= 0x0600 && c <= 0x065f)||
               (c >= 0x066a && c <= 0x06ef)||
               (c >= 0x06fa && c <= 0x07ff)||
               (c >= 0xfb1d && c <= 0xfdff)||
               (c >= 0xfe70 && c <= 0xfefc);
    }

    function isLatinChar(c){
        return (c > 64 && c < 91)||(c > 96 && c < 123)
    }

    /**
     * Determines the text direction of a given string.
     * @param value - the string
     */
    function resolveBaseTextDir(value) {
        if (textDir == "auto") {
            if (isRTLValue(value)) {
                return "rtl";
            } else {
                return "ltr";
            }
        }
        else {
            return textDir;
        }
    }

    function onInputChange() {
        $(this).attr("dir", resolveBaseTextDir($(this).val()));
    }

    /**
     * Adds event listeners to the Input to ensure its text-direction attribute
     * is properly set based on its content.
     * @param input - the input field
     */
    function prepareInput(input) {
        input.on("keyup",onInputChange).on("paste",onInputChange).on("cut",onInputChange);
        // Set the initial text direction
        onInputChange.call(input);
    }

    /**
     * Enforces the text direction of a given string by adding
     * UCC (Unicode Control Characters)
     * @param value - the string
     */
    function enforceTextDirectionWithUCC(value) {
        if (value) {
            var dir = resolveBaseTextDir(value);
            if (dir == "ltr") {
               return LRE + value + PDF;
            }
            else if (dir == "rtl") {
               return RLE + value + PDF;
            }
        }
        return value;
    }

    /**
     * Enforces the text direction for all the spans with style bidiAware under
     * workspace or sidebar div
     */
    function enforceTextDirectionOnPage() {
        $("#workspace").find('span.bidiAware').each(function() {
            $(this).attr("dir", resolveBaseTextDir($(this).html()));
        });
        $("#sidebar").find('span.bidiAware').each(function() {
            $(this).attr("dir", resolveBaseTextDir($(this).text()));
        });
    }

    /**
     * Sets the text direction preference
     * @param dir - the text direction preference
     */
    function setTextDirection(dir) {
        textDir = dir;
        RED.nodes.eachNode(function(n) { n.dirty = true;});
        RED.view.redraw();
        RED.palette.refresh();
        enforceTextDirectionOnPage();
    }

    return {
        setTextDirection: setTextDirection,
        enforceTextDirectionWithUCC: enforceTextDirectionWithUCC,
        resolveBaseTextDir: resolveBaseTextDir,
        prepareInput: prepareInput
    }
})();
;/**
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
RED.text.format = (function() {

    var TextSegment = (function() {
        var TextSegment = function (obj) {
            this.content = "";
            this.actual = "";
            this.textDirection = "";
            this.localGui = "";
            this.isVisible = true;
            this.isSeparator = false;
            this.isParsed = false;
            this.keep = false;
            this.inBounds = false;
            this.inPoints = false;
            var prop = "";
            for (prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    this[prop] = obj[prop];
                }
            }
        };
        return TextSegment;
    })();

    var tools = (function() {
        function initBounds(bounds) {
            if (!bounds) {
                return false;
            }
            if (typeof(bounds.start) === "undefined") {
                bounds.start = "";
            }
            if (typeof(bounds.end) === "undefined") {
                bounds.end = "";
            }
            if (typeof(bounds.startAfter) !== "undefined") {
                bounds.start = bounds.startAfter;
                bounds.after = true;
            } else {
                bounds.after = false;
            }
            if (typeof(bounds.endBefore) !== "undefined") {
                bounds.end = bounds.endBefore;
                bounds.before = true;
            } else {
                bounds.before = false;
            }
            var startPos = parseInt(bounds.startPos, 10);
            if (!isNaN(startPos)) {
                bounds.usePos = true;
            } else {
                bounds.usePos = false;
            }
            var bLength = parseInt(bounds.length, 10);
            if (!isNaN(bLength)) {
                bounds.useLength = true;
            } else {
                bounds.useLength = false;
            }
            bounds.loops = typeof(bounds.loops) !== "undefined" ? !!bounds.loops : true;
            return true;
        }

        function getBounds(segment, src) {
            var bounds = {};
            for (var prop in src) {
                if (src.hasOwnProperty(prop)) {
                    bounds[prop] = src[prop];
                }
            }
            var content = segment.content;
            var usePos = bounds.usePos && bounds.startPos < content.length;
            if (usePos) {
                bounds.start = "";
                bounds.loops = false;
            }
            bounds.bStart = usePos ? bounds.startPos : bounds.start.length > 0 ? content.indexOf(bounds.start) : 0;
            var useLength = bounds.useLength && bounds.length > 0 && bounds.bStart + bounds.length < content.length;
            if (useLength) {
                bounds.end = "";
            }
            bounds.bEnd = useLength ? bounds.bStart + bounds.length : bounds.end.length > 0 ?
                    content.indexOf(bounds.end, bounds.bStart + bounds.start.length) + 1 : content.length;
            if (!bounds.after) {
                bounds.start = "";
            }
            if (!bounds.before) {
                bounds.end = "";
            }
            return bounds;
        }

        return {
            handleSubcontents: function (segments, args, subs, origContent, locale) { // jshint unused: false
                if (!subs.content || typeof(subs.content) !== "string" || subs.content.length === 0) {
                    return segments;
                }
                var sLoops = true;
                if (typeof(subs.loops) !== "undefined") {
                    sLoops = !!subs.loops;
                }
                for (var j = 0; true; j++) {
                    if (j >= segments.length) {
                        break;
                    }
                    if (segments[j].isParsed || segments.keep || segments[j].isSeparator) {
                        continue;
                    }
                    var content = segments[j].content;
                    var start = content.indexOf(subs.content);
                    if (start < 0) {
                        continue;
                    }
                    var end;
                    var length = 0;
                    if (subs.continued) {
                        do {
                            length++;
                            end = content.indexOf(subs.content, start + length * subs.content.length);
                        } while (end === 0);
                    } else {
                        length = 1;
                    }
                    end = start + length * subs.content.length;
                    segments.splice(j, 1);
                    if (start > 0) {
                        segments.splice(j, 0, new TextSegment({
                            content: content.substring(0, start),
                            localGui: args.dir,
                            keep: true
                        }));
                        j++;
                    }
                    segments.splice(j, 0, new TextSegment({
                        content: content.substring(start, end),
                        textDirection: subs.subDir,
                        localGui: args.dir
                    }));
                    if (end < content.length) {
                        segments.splice(j + 1, 0, new TextSegment({
                            content: content.substring(end, content.length),
                            localGui: args.dir,
                            keep: true
                        }));
                    }
                    if (!sLoops) {
                        break;
                    }
                }
            },

            handleBounds: function (segments, args, aBounds, origContent, locale) {
                for (var i = 0; i < aBounds.length; i++) {
                    if (!initBounds(aBounds[i])) {
                        continue;
                    }
                    for (var j = 0; true; j++) {
                        if (j >= segments.length) {
                            break;
                        }
                        if (segments[j].isParsed || segments[j].inBounds || segments.keep || segments[j].isSeparator) {
                            continue;
                        }
                        var bounds = getBounds(segments[j], aBounds[i]);
                        var start = bounds.bStart;
                        var end = bounds.bEnd;
                        if (start < 0 || end < 0) {
                            continue;
                        }
                        var content = segments[j].content;

                        segments.splice(j, 1);
                        if (start > 0) {
                            segments.splice(j, 0, new TextSegment({
                                content: content.substring(0, start),
                                localGui: args.dir,
                                keep: true
                            }));
                            j++;
                        }
                        if (bounds.start) {
                            segments.splice(j, 0, new TextSegment({
                                content: bounds.start,
                                localGui: args.dir,
                                isSeparator: true
                            }));
                            j++;
                        }
                        segments.splice(j, 0, new TextSegment({
                            content: content.substring(start + bounds.start.length, end - bounds.end.length),
                            textDirection: bounds.subDir,
                            localGui: args.dir,
                            inBounds: true
                        }));
                        if (bounds.end) {
                            j++;
                            segments.splice(j, 0, new TextSegment({
                                content: bounds.end,
                                localGui: args.dir,
                                isSeparator: true
                            }));
                        }
                        if (end + bounds.end.length < content.length) {
                            segments.splice(j + 1, 0, new TextSegment({
                                content: content.substring(end + bounds.end.length, content.length),
                                localGui: args.dir,
                                keep: true
                            }));
                        }
                        if (!bounds.loops) {
                            break;
                        }
                    }
                }
                for (i = 0; i < segments.length; i++) {
                    segments[i].inBounds = false;
                }
                return segments;
            },

            handleCases: function (segments, args, cases, origContent, locale) {
                if (cases.length === 0) {
                    return segments;
                }
                var hArgs = {};
                for (var prop in args) {
                    if (args.hasOwnProperty(prop)) {
                        hArgs[prop] = args[prop];
                    }
                }
                for (var i =  0; i < cases.length; i++) {
                    if (!cases[i].handler || typeof(cases[i].handler.handle) !== "function") {
                        cases[i].handler = args.commonHandler;
                    }
                    if (cases[i].args) {
                        hArgs.cases = cases[i].args.cases;
                        hArgs.points = cases[i].args.points;
                        hArgs.bounds = cases[i].args.bounds;
                        hArgs.subs = cases[i].args.subs;
                    } else {
                        hArgs.cases = [];
                        hArgs.points = [];
                        hArgs.bounds = [];
                        hArgs.subs = {};
                    }
                    cases[i].handler.handle(origContent, segments, hArgs, locale);
                }
                return segments;
            },

            handlePoints: function (segments, args, points, origContent, locale) { //jshint unused: false
                for (var i = 0; i < points.length; i++) {
                    for (var j = 0; true; j++) {
                        if (j >= segments.length) {
                            break;
                        }
                        if (segments[j].isParsed || segments[j].keep || segments[j].isSeparator) {
                            continue;
                        }
                        var content = segments[j].content;
                        var pos = content.indexOf(points[i]);
                        if (pos >= 0) {
                            segments.splice(j, 1);
                            if (pos > 0) {
                                segments.splice(j, 0, new TextSegment({
                                    content: content.substring(0, pos),
                                    textDirection: args.subDir,
                                    localGui: args.dir,
                                    inPoints: true
                                }));
                                j++;
                            }
                            segments.splice(j, 0, new TextSegment({
                                content: points[i],
                                localGui: args.dir,
                                isSeparator: true
                            }));
                            if (pos + points[i].length + 1 <= content.length) {
                                segments.splice(j + 1, 0, new TextSegment({
                                    content: content.substring(pos + points[i].length),
                                    textDirection: args.subDir,
                                    localGui: args.dir,
                                    inPoints: true
                                }));
                            }
                        }
                    }
                }
                for (i = 0; i < segments.length; i++) {
                    if (segments[i].keep) {
                        segments[i].keep = false;
                    } else if(segments[i].inPoints){
                        segments[i].isParsed = true;
                        segments[i].inPoints = false;
                    }
                }
                return segments;
            }
        };
    })();

    var common = (function() {
        return {
            handle: function (content, segments, args, locale) {
                var cases = [];
                if (Array.isArray(args.cases)) {
                    cases = args.cases;
                }
                var points = [];
                if (typeof(args.points) !== "undefined") {
                    if (Array.isArray(args.points)) {
                        points = args.points;
                    } else if (typeof(args.points) === "string") {
                        points = args.points.split("");
                    }
                }
                var subs = {};
                if (typeof(args.subs) === "object") {
                    subs = args.subs;
                }
                var aBounds = [];
                if (Array.isArray(args.bounds)) {
                    aBounds = args.bounds;
                }

                tools.handleBounds(segments, args, aBounds, content, locale);
                tools.handleSubcontents(segments, args, subs, content, locale);
                tools.handleCases(segments, args, cases, content, locale);
                tools.handlePoints(segments, args, points, content, locale);
                return segments;
            }
        };
    })();

    var misc = (function() {
        var isBidiLocale = function (locale) {
            var lang = !locale ? "" : locale.split("-")[0];
            if (!lang || lang.length < 2) {
                return false;
            }
            return ["iw", "he", "ar", "fa", "ur"].some(function (bidiLang) {
                return bidiLang === lang;
            });
        };
        var LRE = "\u202A";
        var RLE = "\u202B";
        var PDF = "\u202C";
        var LRM = "\u200E";
        var RLM = "\u200F";
        var LRO = "\u202D";
        var RLO = "\u202E";

        return {
            LRE: LRE,
            RLE: RLE,
            PDF: PDF,
            LRM: LRM,
            RLM: RLM,
            LRO: LRO,
            RLO: RLO,

            getLocaleDetails: function (locale) {
                if (!locale) {
                    locale = typeof navigator === "undefined" ? "" :
                        (navigator.language ||
                        navigator.userLanguage ||
                        "");
                }
                locale = locale.toLowerCase();
                if (isBidiLocale(locale)) {
                    var full = locale.split("-");
                    return {lang: full[0], country: full[1] ? full[1] : ""};
                }
                return {lang: "not-bidi"};
            },

            removeUcc: function (text) {
                if (text) {
                    return text.replace(/[\u200E\u200F\u202A-\u202E]/g, "");
                }
                return text;
            },

            removeTags: function (text) {
                if (text) {
                    return text.replace(/<[^<]*>/g, "");
                }
                return text;
            },

            getDirection: function (text, dir, guiDir, checkEnd) {
                if (dir !== "auto" && (/^(rtl|ltr)$/i).test(dir)) {
                    return dir;
                }
                guiDir = (/^(rtl|ltr)$/i).test(guiDir) ? guiDir : "ltr";
                var txt = !checkEnd ? text : text.split("").reverse().join("");
                var fdc = /[A-Za-z\u05d0-\u065f\u066a-\u06ef\u06fa-\u07ff\ufb1d-\ufdff\ufe70-\ufefc]/.exec(txt);
                return fdc ? (fdc[0] <= "z" ? "ltr" : "rtl") : guiDir;
            },

            hasArabicChar: function (text) {
                var fdc = /[\u0600-\u065f\u066a-\u06ef\u06fa-\u07ff\ufb1d-\ufdff\ufe70-\ufefc]/.exec(text);
                return !!fdc;
            },

            showMarks: function (text, guiDir) {
                var result = "";
                for (var i = 0; i < text.length; i++) {
                    var c = "" + text.charAt(i);
                    switch (c) {
                    case LRM:
                        result += "<LRM>";
                        break;
                    case RLM:
                        result += "<RLM>";
                        break;
                    case LRE:
                        result += "<LRE>";
                        break;
                    case RLE:
                        result += "<RLE>";
                        break;
                    case LRO:
                        result += "<LRO>";
                        break;
                    case RLO:
                        result += "<RLO>";
                        break;
                    case PDF:
                        result += "<PDF>";
                        break;
                    default:
                        result += c;
                    }
                }
                var mark = typeof(guiDir) === "undefined" || !((/^(rtl|ltr)$/i).test(guiDir)) ? "" :
                    guiDir === "rtl" ? RLO : LRO;
                return mark + result + (mark === "" ? "" : PDF);
            },

            hideMarks: function (text) {
                var txt = text.replace(/<LRM>/g, this.LRM).replace(/<RLM>/g, this.RLM).replace(/<LRE>/g, this.LRE);
                return txt.replace(/<RLE>/g, this.RLE).replace(/<LRO>/g, this.LRO).replace(/<RLO>/g, this.RLO).replace(/<PDF>/g, this.PDF);
            },

            showTags: function (text) {
                return "<xmp>" + text + "</xmp>";
            },

            hideTags: function (text) {
                return text.replace(/<xmp>/g,"").replace(/<\/xmp>/g,"");
            }
        };
    })();

    var stext = (function() {
        var stt = {};

        // args
        //   handler: main handler (default - dbidi/stt/handlers/common)
        //   guiDir: GUI direction (default - "ltr")
        //   dir: main stt direction (default - guiDir)
        //   subDir: direction of subsegments
        //   points: array of delimiters (default - [])
        //   bounds: array of definitions of bounds in which handler works
        //   subs: object defines special handling for some substring if found
        //   cases: array of additional modules with their args for handling special cases (default - [])
        function parseAndDisplayStructure(content, fArgs, isHtml, locale) {
            if (!content || !fArgs) {
                return content;
            }
            return displayStructure(parseStructure(content, fArgs, locale), fArgs, isHtml);
        }

        function checkArguments(fArgs, fullCheck) {
            var args = Array.isArray(fArgs)? fArgs[0] : fArgs;
            if (!args.guiDir) {
                args.guiDir = "ltr";
            }
            if (!args.dir) {
                args.dir = args.guiDir;
            }
            if (!fullCheck) {
                return args;
            }
            if (typeof(args.points) === "undefined") {
                args.points = [];
            }
            if (!args.cases) {
                args.cases = [];
            }
            if (!args.bounds) {
                args.bounds = [];
            }
            args.commonHandler = common;
            return args;
        }

        function parseStructure(content, fArgs, locale) {
            if (!content || !fArgs) {
                return new TextSegment({content: ""});
            }
            var args = checkArguments(fArgs, true);
            var segments = [new TextSegment(
                {
                    content: content,
                    actual: content,
                    localGui: args.dir
                })];
            var parse = common.handle;
            if (args.handler && typeof(args.handler) === "function") {
                parse = args.handler.handle;
            }
            parse(content, segments, args, locale);
            return segments;
        }

        function displayStructure(segments, fArgs, isHtml) {
            var args = checkArguments(fArgs, false);
            if (isHtml) {
                return getResultWithHtml(segments, args);
            }
            else {
                return getResultWithUcc(segments, args);
            }
        }

        function getResultWithUcc(segments, args, isHtml) {
            var result = "";
            var checkedDir = "";
            var prevDir = "";
            var stop = false;
            for (var i = 0; i < segments.length; i++) {
                if (segments[i].isVisible) {
                    var dir = segments[i].textDirection;
                    var lDir = segments[i].localGui;
                    if (lDir !== "" && prevDir === "") {
                        result += (lDir === "rtl" ? misc.RLE : misc.LRE);
                    }
                    else if(prevDir !== "" && (lDir === "" || lDir !== prevDir || stop)) {
                        result += misc.PDF + (i == segments.length - 1 && lDir !== ""? "" : args.dir === "rtl" ? misc.RLM : misc.LRM);
                        if (lDir !== "") {
                            result += (lDir === "rtl" ? misc.RLE : misc.LRE);
                        }
                    }
                    if (dir === "auto") {
                        dir = misc.getDirection(segments[i].content, dir, args.guiDir);
                    }
                    if ((/^(rtl|ltr)$/i).test(dir)) {
                        result += (dir === "rtl" ? misc.RLE : misc.LRE) + segments[i].content + misc.PDF;
                        checkedDir = dir;
                    }
                    else {
                        result += segments[i].content;
                        checkedDir = misc.getDirection(segments[i].content, dir, args.guiDir, true);
                    }
                    if (i < segments.length - 1) {
                        var locDir = lDir && segments[i+1].localGui? lDir : args.dir;
                        result += locDir === "rtl" ? misc.RLM : misc.LRM;
                    }
                    else if(prevDir !== "") {
                        result += misc.PDF;
                    }
                    prevDir = lDir;
                    stop = false;
                }
                else {
                    stop = true;
                }
            }
            var sttDir = args.dir === "auto" ? misc.getDirection(segments[0].actual, args.dir, args.guiDir) : args.dir;
            if (sttDir !== args.guiDir) {
                result = (sttDir === "rtl" ? misc.RLE : misc.LRE) + result + misc.PDF;
            }
            return result;
        }

        function getResultWithHtml(segments, args, isHtml) {
            var result = "";
            var checkedDir = "";
            var prevDir = "";
            for (var i = 0; i < segments.length; i++) {
                if (segments[i].isVisible) {
                    var dir = segments[i].textDirection;
                    var lDir = segments[i].localGui;
                    if (lDir !== "" && prevDir === "") {
                        result += "<bdi dir='" + (lDir === "rtl" ? "rtl" : "ltr") + "'>";
                    }
                    else if(prevDir !== "" && (lDir === "" || lDir !== prevDir || stop)) {
                        result += "</bdi>" + (i == segments.length - 1 && lDir !== ""? "" : "<span style='unicode-bidi: embed; direction: " + (args.dir === "rtl" ? "rtl" : "ltr") + ";'></span>");
                        if (lDir !== "") {
                            result += "<bdi dir='" + (lDir === "rtl" ? "rtl" : "ltr") + "'>";
                        }
                    }

                    if (dir === "auto") {
                        dir = misc.getDirection(segments[i].content, dir, args.guiDir);
                    }
                    if ((/^(rtl|ltr)$/i).test(dir)) {
                        //result += "<span style='unicode-bidi: embed; direction: " + (dir === "rtl" ? "rtl" : "ltr") + ";'>" + segments[i].content + "</span>";
                        result += "<bdi dir='" + (dir === "rtl" ? "rtl" : "ltr") + "'>" + segments[i].content + "</bdi>";
                        checkedDir = dir;
                    }
                    else {
                        result += segments[i].content;
                        checkedDir = misc.getDirection(segments[i].content, dir, args.guiDir, true);
                    }
                    if (i < segments.length - 1) {
                        var locDir = lDir && segments[i+1].localGui? lDir : args.dir;
                        result += "<span style='unicode-bidi: embed; direction: " + (locDir === "rtl" ? "rtl" : "ltr") + ";'></span>";
                    }
                    else if(prevDir !== "") {
                        result += "</bdi>";
                    }
                    prevDir = lDir;
                    stop = false;
                }
                else {
                    stop = true;
                }
            }
            var sttDir = args.dir === "auto" ? misc.getDirection(segments[0].actual, args.dir, args.guiDir) : args.dir;
            if (sttDir !== args.guiDir) {
                result = "<bdi dir='" + (sttDir === "rtl" ? "rtl" : "ltr") + "'>" + result + "</bdi>";
            }
            return result;
        }

        //TBD ?
        function restore(text, isHtml) {
            return text;
        }

        stt.parseAndDisplayStructure = parseAndDisplayStructure;
        stt.parseStructure = parseStructure;
        stt.displayStructure = displayStructure;
        stt.restore = restore;

        return stt;
    })();

    var breadcrumb = (function() {
        return {
            format: function (text, args, isRtl, isHtml, locale, parseOnly) {
                var fArgs =
                {
                        guiDir: isRtl ? "rtl" : "ltr",
                        dir: args.dir ? args.dir : isRtl ? "rtl" : "ltr",
                        subs: {
                            content: ">",
                            continued: true,
                            subDir: isRtl ? "rtl" : "ltr"
                        },
                        cases: [{
                            args: {
                                subs: {
                                    content: "<",
                                    continued: true,
                                    subDir: isRtl ? "ltr" : "rtl"
                                }
                            }
                        }]
                };

                if (!parseOnly) {
                    return stext.parseAndDisplayStructure(text, fArgs, !!isHtml, locale);
                }
                else {
                    return stext.parseStructure(text, fArgs, !!isHtml, locale);
                }
            }
        };
    })();

    var comma = (function() {
        return {
            format: function (text, args, isRtl, isHtml, locale, parseOnly) {
                var fArgs =
                {
                        guiDir: isRtl ? "rtl" : "ltr",
                        dir: "ltr",
                        points: ","
                };
                if (!parseOnly) {
                    return stext.parseAndDisplayStructure(text, fArgs, !!isHtml, locale);
                }
                else {
                    return stext.parseStructure(text, fArgs, !!isHtml, locale);
                }
            }
        };
    })();

    var email = (function() {
        function getDir(text, locale) {
            if (misc.getLocaleDetails(locale).lang !== "ar") {
                return "ltr";
            }
            var ind = text.indexOf("@");
            if (ind > 0 && ind < text.length - 1) {
                return misc.hasArabicChar(text.substring(ind + 1)) ? "rtl" : "ltr";
            }
            return "ltr";
        }

        return {
            format: function (text, args, isRtl, isHtml, locale, parseOnly) {
                var fArgs =
                {
                        guiDir: isRtl ? "rtl" : "ltr",
                        dir: getDir(text, locale),
                        points: "<>.:,;@",
                        cases: [{
                            handler: common,
                            args: {
                                bounds: [{
                                    startAfter: "\"",
                                    endBefore: "\""
                                },
                                {
                                    startAfter: "(",
                                    endBefore: ")"
                                }
                                ],
                                points: ""
                            }
                        }]
                };
                if (!parseOnly) {
                    return stext.parseAndDisplayStructure(text, fArgs, !!isHtml, locale);
                }
                else {
                    return stext.parseStructure(text, fArgs, !!isHtml, locale);
                }
            }
        };
    })();

    var filepath = (function() {
        return {
            format: function (text, args, isRtl, isHtml, locale, parseOnly) {
                var fArgs =
                {
                        guiDir: isRtl ? "rtl" : "ltr",
                        dir: "ltr",
                        points: "/\\:."
                };
                if (!parseOnly) {
                    return stext.parseAndDisplayStructure(text, fArgs, !!isHtml, locale);
                }
                else {
                    return stext.parseStructure(text, fArgs, !!isHtml, locale);
                }
            }
        };
    })();

    var formula = (function() {
        return {
            format: function (text, args, isRtl, isHtml, locale, parseOnly) {
                var fArgs =
                {
                        guiDir: isRtl ? "rtl" : "ltr",
                        dir: "ltr",
                        points: " /%^&[]<>=!?~:.,|()+-*{}",
                };
                if (!parseOnly) {
                    return stext.parseAndDisplayStructure(text, fArgs, !!isHtml, locale);
                }
                else {
                    return stext.parseStructure(text, fArgs, !!isHtml, locale);
                }
            }
        };
    })();


    var sql = (function() {
        return {
            format: function (text, args, isRtl, isHtml, locale, parseOnly) {
                var fArgs =
                {
                        guiDir: isRtl ? "rtl" : "ltr",
                        dir: "ltr",
                        points: "\t!#%&()*+,-./:;<=>?|[]{}",
                        cases: [{
                            handler: common,
                            args: {
                                bounds: [{
                                    startAfter: "/*",
                                    endBefore: "*/"
                                },
                                {
                                    startAfter: "--",
                                    end: "\n"
                                },
                                {
                                    startAfter: "--"
                                }
                                ]
                            }
                        },
                        {
                            handler: common,
                            args: {
                                subs: {
                                    content: " ",
                                    continued: true
                                }
                            }
                        },
                        {
                            handler: common,
                            args: {
                                bounds: [{
                                    startAfter: "'",
                                    endBefore: "'"
                                },
                                {
                                    startAfter: "\"",
                                    endBefore: "\""
                                }
                                ]
                            }
                        }
                        ]
                };
                if (!parseOnly) {
                    return stext.parseAndDisplayStructure(text, fArgs, !!isHtml, locale);
                }
                else {
                    return stext.parseStructure(text, fArgs, !!isHtml, locale);
                }
            }
        };
    })();

    var underscore = (function() {
        return {
            format: function (text, args, isRtl, isHtml, locale, parseOnly) {
                var fArgs =
                {
                        guiDir: isRtl ? "rtl" : "ltr",
                        dir: "ltr",
                        points: "_"
                };
                if (!parseOnly) {
                    return stext.parseAndDisplayStructure(text, fArgs, !!isHtml, locale);
                }
                else {
                    return stext.parseStructure(text, fArgs, !!isHtml, locale);
                }
            }
        };
    })();

    var url = (function() {
        return {
            format: function (text, args, isRtl, isHtml, locale, parseOnly) {
                var fArgs =
                {
                        guiDir: isRtl ? "rtl" : "ltr",
                        dir: "ltr",
                        points: ":?#/@.[]="
                };
                if (!parseOnly) {
                    return stext.parseAndDisplayStructure(text, fArgs, !!isHtml, locale);
                }
                else {
                    return stext.parseStructure(text, fArgs, !!isHtml, locale);
                }
            }
        };
    })();

    var word = (function() {
        return {
            format: function (text, args, isRtl, isHtml, locale, parseOnly) {
                var fArgs =
                {
                        guiDir: isRtl ? "rtl" : "ltr",
                        dir: args.dir ? args.dir : isRtl ? "rtl" : "ltr",
                        points: " ,.!?;:",
                };
                if (!parseOnly) {
                    return stext.parseAndDisplayStructure(text, fArgs, !!isHtml, locale);
                }
                else {
                    return stext.parseStructure(text, fArgs, !!isHtml, locale);
                }
            }
        };
    })();

    var xpath = (function() {
        return {
            format: function (text, args, isRtl, isHtml, locale, parseOnly) {
                var fArgs =
                {
                        guiDir: isRtl ? "rtl" : "ltr",
                        dir: "ltr",
                        points: " /[]<>=!:@.|()+-*",
                        cases: [{
                            handler: common,
                            args: {
                                bounds: [{
                                    startAfter: "\"",
                                    endBefore: "\""
                                },
                                {
                                    startAfter: "'",
                                    endBefore: "'"
                                }
                                ],
                                points: ""
                            }
                        }
                        ]
                };
                if (!parseOnly) {
                    return stext.parseAndDisplayStructure(text, fArgs, !!isHtml, locale);
                }
                else {
                    return stext.parseStructure(text, fArgs, !!isHtml, locale);
                }
            }
        };
    })();

    var custom = (function() {
        return {
            format: function (text, args, isRtl, isHtml, locale, parseOnly) {
                var hArgs = {};
                var prop = "";
                var sArgs = Array.isArray(args)? args[0] : args;
                for (prop in sArgs) {
                    if (sArgs.hasOwnProperty(prop)) {
                        hArgs[prop] = sArgs[prop];
                    }
                }
                hArgs.guiDir = isRtl ? "rtl" : "ltr";
                hArgs.dir = hArgs.dir ? hArgs.dir : hArgs.guiDir;
                if (!parseOnly) {
                    return stext.parseAndDisplayStructure(text, hArgs, !!isHtml, locale);
                }
                else {
                    return stext.parseStructure(text, hArgs, !!isHtml, locale);
                }
            }
        };
    })();

    var message = (function() {
        var params = {msgLang: "en", msgDir: "", phLang: "", phDir: "", phPacking: ["{","}"], phStt: {type: "none", args: {}}, guiDir: ""};
        var parametersChecked = false;

        function getDirectionOfLanguage(lang) {
            if (lang === "he" || lang === "iw" || lang === "ar") {
                return "rtl";
            }
            return "ltr";
        }

        function checkParameters(obj) {
            if (obj.msgDir.length === 0) {
                obj.msgDir = getDirectionOfLanguage(obj.msgLang);
            }
            obj.msgDir = obj.msgDir !== "ltr" && obj.msgDir !== "rtl" && obj.msgDir != "auto"? "ltr" : obj.msgDir;
            if (obj.guiDir.length === 0) {
                obj.guiDir = obj.msgDir;
            }
            obj.guiDir = obj.guiDir !== "rtl"? "ltr" : "rtl";
            if (obj.phDir.length === 0) {
                obj.phDir = obj.phLang.length === 0? obj.msgDir : getDirectionOfLanguage(obj.phLang);
            }
            obj.phDir = obj.phDir !== "ltr" && obj.phDir !== "rtl" && obj.phDir != "auto"? "ltr" : obj.phDir;
            if (typeof (obj.phPacking) === "string") {
                obj.phPacking = obj.phPacking.split("");
            }
            if (obj.phPacking.length < 2) {
                obj.phPacking = ["{","}"];
            }
        }

        return {
            setDefaults: function (args) {
                for (var prop in args) {
                    if (params.hasOwnProperty(prop)) {
                        params[prop] = args[prop];
                    }
                }
                checkParameters(params);
                parametersChecked = true;
            },

            format: function (text) {
                if (!parametersChecked) {
                    checkParameters(params);
                    parametersChecked = true;
                }
                var isHtml = false;
                var hasHtmlArg = false;
                var spLength = params.phPacking[0].length;
                var epLength = params.phPacking[1].length;
                if (arguments.length > 0) {
                    var last = arguments[arguments.length-1];
                    if (typeof (last) === "boolean") {
                        isHtml = last;
                        hasHtmlArg = true;
                    }
                }
                //Message
                var re = new RegExp(params.phPacking[0] + "\\d+" + params.phPacking[1]);
                var m;
                var tSegments = [];
                var offset = 0;
                var txt = text;
                while ((m = re.exec(txt)) != null) {
                    var lastIndex = txt.indexOf(m[0]) + m[0].length;
                    if (lastIndex > m[0].length) {
                        tSegments.push({text: txt.substring(0, lastIndex - m[0].length), ph: false});
                    }
                    tSegments.push({text: m[0], ph: true});
                    offset += lastIndex;
                    txt = txt.substring(lastIndex, txt.length);
                }
                if (offset < text.length) {
                    tSegments.push({text: text.substring(offset, text.length), ph: false});
                }
                //Parameters
                var tArgs = [];
                for (var i = 1; i < arguments.length - (hasHtmlArg? 1 : 0); i++) {
                    var arg = arguments[i];
                    var checkArr = arg;
                    var inLoop = false;
                    var indArr = 0;
                    if (Array.isArray(checkArr)) {
                        arg = checkArr[0];
                        if (typeof(arg) === "undefined") {
                            continue;
                        }
                        inLoop = true;
                    }
                    do {
                        if (typeof (arg) === "string") {
                            tArgs.push({text: arg, dir: params.phDir, stt: params.stt});
                        }
                        else if(typeof (arg) === "boolean") {
                            isHtml = arg;
                        }
                        else if(typeof (arg) === "object") {
                            tArgs.push(arg);
                            if (!arg.hasOwnProperty("text")) {
                                tArgs[tArgs.length-1].text = "{???}";
                            }
                            if (!arg.hasOwnProperty("dir") || arg.dir.length === 0) {
                                tArgs[tArgs.length-1].dir = params.phDir;
                            }
                            if (!arg.hasOwnProperty("stt") || (typeof (arg.stt) === "string" && arg.stt.length === 0) ||
                                (typeof (arg.stt) === "object" && Object.keys(arg.stt).length === 0)) {
                                tArgs[tArgs.length-1].stt = params.phStt;
                            }
                        }
                        else {
                            tArgs.push({text: "" + arg, dir: params.phDir, stt: params.phStt});
                        }
                        if (inLoop) {
                            indArr++;
                            if (indArr == checkArr.length) {
                                inLoop = false;
                            }
                            else {
                                arg = checkArr[indArr];
                            }
                        }
                    } while(inLoop);
                }
                //Indexing
                var segments = [];
                for (i = 0; i < tSegments.length; i++) {
                    var t = tSegments[i];
                    if (!t.ph) {
                        segments.push(new TextSegment({content: t.text, textDirection: params.msgDir}));
                    }
                    else {
                        var ind = parseInt(t.text.substring(spLength, t.text.length - epLength));
                        if (isNaN(ind) || ind >= tArgs.length) {
                            segments.push(new TextSegment({content: t.text, textDirection: params.msgDir}));
                            continue;
                        }
                        var sttType = "none";
                        if (!tArgs[ind].stt) {
                            tArgs[ind].stt = params.phStt;
                        }
                        if (tArgs[ind].stt) {
                            if (typeof (tArgs[ind].stt) === "string") {
                                sttType = tArgs[ind].stt;
                            }
                            else if(tArgs[ind].stt.hasOwnProperty("type")) {
                                sttType = tArgs[ind].stt.type;
                            }
                        }
                        if (sttType.toLowerCase() !== "none") {
                            var sttSegs =  getHandler(sttType).format(tArgs[ind].text, tArgs[ind].stt.args || {},
                                    params.msgDir === "rtl", false, params.msgLang, true);
                            for (var j = 0; j < sttSegs.length; j++) {
                                segments.push(sttSegs[j]);
                            }
                            segments.push(new TextSegment({isVisible: false}));
                        }
                        else {
                            segments.push(new TextSegment({content: tArgs[ind].text, textDirection: (tArgs[ind].dir? tArgs[ind].dir : params.phDir)}));
                        }
                    }
                }
                var result =  stext.displayStructure(segments, {guiDir: params.guiDir, dir: params.msgDir}, isHtml);
                return result;
            }
        };
    })();

    var event = null;

    function getHandler(type) {
        switch (type) {
        case "breadcrumb" :
            return breadcrumb;
        case "comma" :
            return comma;
        case "email" :
            return email;
        case "filepath" :
            return filepath;
        case "formula" :
            return formula;
        case "sql" :
            return sql;
        case "underscore" :
            return underscore;
        case "url" :
            return url;
        case "word" :
            return word;
        case "xpath" :
            return xpath;
        default:
            return custom;
        }
    }

    function isInputEventSupported(element) {
        var agent = window.navigator.userAgent;
        if (agent.indexOf("MSIE") >=0 || agent.indexOf("Trident") >=0 || agent.indexOf("Edge") >=0) {
            return false;
        }
        var checked = document.createElement(element.tagName);
        checked.contentEditable = true;
        var isSupported = ("oninput" in checked);
        if (!isSupported) {
          checked.setAttribute('oninput', 'return;');
          isSupported = typeof checked['oninput'] == 'function';
        }
        checked = null;
        return isSupported;
    }

    function attachElement(element, type, args, isRtl, locale) {
        //if (!element || element.nodeType != 1 || !element.isContentEditable)
        if (!element || element.nodeType != 1) {
            return false;
        }
        if (!event) {
            event = document.createEvent('Event');
            event.initEvent('TF', true, true);
        }
        element.setAttribute("data-tf-type", type);
        var sArgs = args === "undefined"? "{}" : JSON.stringify(Array.isArray(args)? args[0] : args);
        element.setAttribute("data-tf-args", sArgs);
        var dir = "ltr";
        if (isRtl === "undefined") {
            if (element.dir) {
                dir = element.dir;
            }
            else if(element.style && element.style.direction) {
                dir = element.style.direction;
            }
            isRtl = dir.toLowerCase() === "rtl";
        }
        element.setAttribute("data-tf-dir", isRtl);
        element.setAttribute("data-tf-locale", misc.getLocaleDetails(locale).lang);
        if (isInputEventSupported(element)) {
            var ehandler = element.oninput;
            element.oninput = function(event) {
                displayWithStructure(event.target);
            };
        }
        else {
            element.onkeyup = function(e) {
                displayWithStructure(e.target);
                element.dispatchEvent(event);
            };
            element.onmouseup = function(e) {
                displayWithStructure(e.target);
                element.dispatchEvent(event);
            };
        }
        displayWithStructure(element);

        return true;
    }

    function detachElement(element) {
        if (!element || element.nodeType != 1) {
            return;
        }
        element.removeAttribute("data-tf-type");
        element.removeAttribute("data-tf-args");
        element.removeAttribute("data-tf-dir");
        element.removeAttribute("data-tf-locale");
        element.innerHTML = element.textContent || "";
    }

    function displayWithStructure(element) {
        var txt = element.textContent || "";
        var selection = document.getSelection();
        if (txt.length === 0 || !selection || selection.rangeCount <= 0) {
            element.dispatchEvent(event);
            return;
        }
        
        var range = selection.getRangeAt(0);
        var tempRange = range.cloneRange(), startNode, startOffset;
        startNode = range.startContainer;
        startOffset = range.startOffset;
        var textOffset = 0;
        if (startNode.nodeType === 3) {
            textOffset += startOffset;
        }
        tempRange.setStart(element,0);
        tempRange.setEndBefore(startNode);
        var div = document.createElement('div');
        div.appendChild(tempRange.cloneContents());
        textOffset += div.textContent.length;

        element.innerHTML = getHandler(element.getAttribute("data-tf-type")).
            format(txt, JSON.parse(element.getAttribute("data-tf-args")), (element.getAttribute("data-tf-dir") === "true"? true : false),
            true, element.getAttribute("data-tf-locale"));
        var parent = element;
        var node = element;
        var newOffset = 0;
        var inEnd = false;
        selection.removeAllRanges();
        range.setStart(element,0);
        range.setEnd(element,0);
        while (node) {
            if (node.nodeType === 3) {
                if (newOffset + node.nodeValue.length >= textOffset) {
                    range.setStart(node, textOffset - newOffset);
                    break;
                }
                else {
                    newOffset += node.nodeValue.length;
                    node = node.nextSibling;
                }
            }
            else if(node.hasChildNodes()) {
                parent = node;
                node = parent.firstChild;
                continue;
            }
            else {
                node = node.nextSibling;
            }
            while (!node) {
                if (parent === element) {
                    inEnd = true;
                    break;
                }
                node = parent.nextSibling;
                parent = parent.parentNode;
            }
            if (inEnd) {
                break;
            }
        }

        selection.addRange(range);
        element.dispatchEvent(event);
    }

    return {
        /**
        * Returns the HTML representation of a given structured text
        * @param text - the structured text
        * @param type - could be one of filepath, url, email
        * @param args - pass additional arguments to the handler. generally null.
        * @param isRtl - indicates if the GUI is mirrored
        * @param locale - the browser locale
        */
        getHtml: function (text, type, args, isRtl, locale) {
            return getHandler(type).format(text, args, isRtl, true, locale);
        },
        /**
        * Handle Structured text correct display for a given HTML element.
        * @param element - the element  : should be of type div contenteditable=true
        * @param type - could be one of filepath, url, email
        * @param args - pass additional arguments to the handler. generally null.
        * @param isRtl - indicates if the GUI is mirrored
        * @param locale - the browser locale
        */
        attach: function (element, type, args, isRtl, locale) {
            return attachElement(element, type, args, isRtl, locale);
        }
    };
})();
;/**
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
RED.state = {
    DEFAULT: 0,
    MOVING: 1,
    JOINING: 2,
    MOVING_ACTIVE: 3,
    ADDING: 4,
    EDITING: 5,
    EXPORT: 6,
    IMPORT: 7,
    IMPORT_DRAGGING: 8,
    QUICK_JOINING: 9
}
;/** This file was modified by Sathya Laufer */

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
RED.nodes = (function() {

    var node_defs = {};
    var nodes = [];
    var configNodes = {};
    var links = [];
    var defaultWorkspace;
    var workspaces = {};
    var workspacesOrder =[];
    var subflows = {};
    var loadedFlowVersion = null;

    var initialLoad;

    var dirty = false;

    function setDirty(d) {
        dirty = d;
        RED.events.emit("nodes:change",{dirty:dirty});
    }

    var registry = (function() {
        var moduleList = {};
        var nodeList = [];
        var nodeSets = {};
        var typeToId = {};
        var nodeDefinitions = {};

        var exports = {
            setModulePendingUpdated: function(module,version) {
                moduleList[module].pending_version = version;
                RED.events.emit("registry:module-updated",{module:module,version:version});
            },
            getModule: function(module) {
                return moduleList[module];
            },
            getNodeSetForType: function(nodeType) {
                return exports.getNodeSet(typeToId[nodeType]);
            },
            getModuleList: function() {
                return moduleList;
            },
            getNodeList: function() {
                return nodeList;
            },
            getNodeTypes: function() {
                return Object.keys(nodeDefinitions);
            },
            setNodeList: function(list) {
                nodeList = [];
                for(var i=0;i<list.length;i++) {
                    var ns = list[i];
                    exports.addNodeSet(ns);
                }
            },
            addNodeSet: function(ns) {
                ns.added = false;
                nodeSets[ns.id] = ns;
                for (var j=0;j<ns.types.length;j++) {
                    typeToId[ns.types[j]] = ns.id;
                }
                nodeList.push(ns);

                moduleList[ns.module] = moduleList[ns.module] || {
                    name:ns.module,
                    version:ns.version,
                    local:ns.local,
                    sets:{}
                };
                if (ns.pending_version) {
                    moduleList[ns.module].pending_version = ns.pending_version;
                }
                moduleList[ns.module].sets[ns.name] = ns;
                RED.events.emit("registry:node-set-added",ns);
            },
            removeNodeSet: function(id) {
                var ns = nodeSets[id];
                for (var j=0;j<ns.types.length;j++) {
                    delete typeToId[ns.types[j]];
                }
                delete nodeSets[id];
                for (var i=0;i<nodeList.length;i++) {
                    if (nodeList[i].id === id) {
                        nodeList.splice(i,1);
                        break;
                    }
                }
                delete moduleList[ns.module].sets[ns.name];
                if (Object.keys(moduleList[ns.module].sets).length === 0) {
                    delete moduleList[ns.module];
                }
                RED.events.emit("registry:node-set-removed",ns);
                return ns;
            },
            getNodeSet: function(id) {
                return nodeSets[id];
            },
            enableNodeSet: function(id) {
                var ns = nodeSets[id];
                ns.enabled = true;
                RED.events.emit("registry:node-set-enabled",ns);
            },
            disableNodeSet: function(id) {
                var ns = nodeSets[id];
                ns.enabled = false;
                RED.events.emit("registry:node-set-disabled",ns);
            },
            registerNodeType: function(nt,def) {
                nodeDefinitions[nt] = def;
                def.type = nt;
                if (def.category != "subflows") {
                    def.set = nodeSets[typeToId[nt]];
                    nodeSets[typeToId[nt]].added = true;
                    nodeSets[typeToId[nt]].enabled = true;

                    var ns;
                    if (def.set.module === "node-red") {
                        ns = "node-red";
                    } else {
                        ns = def.set.id;
                    }
                    def["_"] = function() {
                        var args = Array.prototype.slice.call(arguments, 0);
                        var original = args[0];
                        if (args[0].indexOf(":") === -1) {
                            args[0] = ns+":"+args[0];
                        }
                        var result = RED._.apply(null,args);
                        if (result === args[0]) {
                            result = original;
                        }
                        return result;
                    }

                    // TODO: too tightly coupled into palette UI
                }
                RED.events.emit("registry:node-type-added",nt);
            },
            removeNodeType: function(nt) {
                if (nt.substring(0,8) != "subflow:") {
                    // NON-NLS - internal debug message
                    throw new Error("this api is subflow only. called with:",nt);
                }
                delete nodeDefinitions[nt];
                RED.events.emit("registry:node-type-removed",nt);
            },
            getNodeType: function(nt) {
                return nodeDefinitions[nt];
            }
        };
        return exports;
    })();

    function getID() {
        return (1+Math.random()*4294967295).toString(16);
    }

    function addNode(n) {
        if (n.type.indexOf("subflow") !== 0) {
            n["_"] = n._def._;
        } else {
            n["_"] = RED._;
        }
        if (n._def.category == "config") {
            configNodes[n.id] = n;
        } else {
            n.inputPorts = [];
            if (n.inputs) {
                for (var i=0;i<n.inputs;i++) {
                    n.inputPorts.push(i);
                }
            }
            n.outputPorts = [];
            if (n.wires && (n.wires.length > n.outputs)) { n.outputs = n.wires.length; }
            if (n.outputs) {
                for (var i=0;i<n.outputs;i++) {
                    n.outputPorts.push(i);
                }
            }
            n.dirty = true;
            updateConfigNodeUsers(n);
            if (n._def.category == "subflows" && typeof n.i === "undefined") {
                var nextId = 0;
                RED.nodes.eachNode(function(node) {
                    nextId = Math.max(nextId,node.i||0);
                });
                n.i = nextId+1;
            }
            nodes.push(n);
        }
        RED.events.emit('nodes:add',n);
    }
    function addLink(l) {
        links.push(l);
    }

    function getNode(id) {
        if (id in configNodes) {
            return configNodes[id];
        } else {
            for (var n in nodes) {
                if (nodes[n].id == id) {
                    return nodes[n];
                }
            }
        }
        return null;
    }

    function removeNode(id) {
        var removedLinks = [];
        var removedNodes = [];
        var node;
        if (id in configNodes) {
            node = configNodes[id];
            delete configNodes[id];
            RED.events.emit('nodes:remove',node);
            RED.workspaces.refresh();
        } else {
            node = getNode(id);
            if (node) {
                nodes.splice(nodes.indexOf(node),1);
                removedLinks = links.filter(function(l) { return (l.source === node) || (l.target === node); });
                removedLinks.forEach(function(l) {links.splice(links.indexOf(l), 1); });
                var updatedConfigNode = false;
                for (var d in node._def.defaults) {
                    if (node._def.defaults.hasOwnProperty(d)) {
                        var property = node._def.defaults[d];
                        if (property.type) {
                            var type = registry.getNodeType(property.type);
                            if (type && type.category == "config") {
                                var configNode = configNodes[node[d]];
                                if (configNode) {
                                    updatedConfigNode = true;
                                    if (configNode._def.exclusive) {
                                        removeNode(node[d]);
                                        removedNodes.push(configNode);
                                    } else {
                                        var users = configNode.users;
                                        users.splice(users.indexOf(node),1);
                                    }
                                }
                            }
                        }
                    }
                }
                if (updatedConfigNode) {
                    RED.workspaces.refresh();
                }
                RED.events.emit('nodes:remove',node);
            }
        }
        if (node && node._def.onremove) {
            node._def.onremove.call(n);
        }
        return {links:removedLinks,nodes:removedNodes};
    }

    function removeLink(l) {
        var index = links.indexOf(l);
        if (index != -1) {
            links.splice(index,1);
        }
    }

    function addWorkspace(ws) {
        workspaces[ws.id] = ws;
        ws._def = {
            defaults: {
                label: {value:""},
                disabled: {value: false},
                info: {value: ""}
            }
        };

        workspacesOrder.push(ws.id);
    }
    function getWorkspace(id) {
        return workspaces[id];
    }
    function removeWorkspace(id) {
        delete workspaces[id];
        workspacesOrder.splice(workspacesOrder.indexOf(id),1);

        var removedNodes = [];
        var removedLinks = [];
        var n;
        var node;
        for (n=0;n<nodes.length;n++) {
            node = nodes[n];
            if (node.z == id) {
                removedNodes.push(node);
            }
        }
        for(n in configNodes) {
            if (configNodes.hasOwnProperty(n)) {
                node = configNodes[n];
                if (node.z == id) {
                    removedNodes.push(node);
                }
            }
        }
        for (n=0;n<removedNodes.length;n++) {
            var result = removeNode(removedNodes[n].id);
            removedLinks = removedLinks.concat(result.links);
        }
        return {nodes:removedNodes,links:removedLinks};
    }

    function addSubflow(sf, createNewIds) {
        if (createNewIds) {
            var subflowNames = Object.keys(subflows).map(function(sfid) {
                return subflows[sfid].name;
            });

            subflowNames.sort();
            var copyNumber = 1;
            var subflowName = sf.name;
            subflowNames.forEach(function(name) {
                if (subflowName == name) {
                    copyNumber++;
                    subflowName = sf.name+" ("+copyNumber+")";
                }
            });
            sf.name = subflowName;
        }
        subflows[sf.id] = sf;
        RED.nodes.registerType("subflow:"+sf.id, {
            defaults:{name:{value:""}},
            info: sf.info,
            icon:"subflow.png",
            category: "subflows",
            inputs: sf.in.length,
            outputs: sf.out.length,
            color: "#da9",
            label: function() { return this.name||RED.nodes.subflow(sf.id).name },
            labelStyle: function() { return this.name?"node_label_italic":""; },
            paletteLabel: function() { return RED.nodes.subflow(sf.id).name },
            inputLabels: function(i) { return sf.inputLabels?sf.inputLabels[i]:null },
            outputLabels: function(i) { return sf.outputLabels?sf.outputLabels[i]:null },
            set:{
                module: "node-red"
            }
        });
        sf._def = RED.nodes.getType("subflow:"+sf.id);
    }
    function getSubflow(id) {
        return subflows[id];
    }
    function removeSubflow(sf) {
        delete subflows[sf.id];
        registry.removeNodeType("subflow:"+sf.id);
    }

    function subflowContains(sfid,nodeid) {
        for (var i=0;i<nodes.length;i++) {
            var node = nodes[i];
            if (node.z === sfid) {
                var m = /^subflow:(.+)$/.exec(node.type);
                if (m) {
                    if (m[1] === nodeid) {
                        return true;
                    } else {
                        var result = subflowContains(m[1],nodeid);
                        if (result) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    function getAllFlowNodes(node) {
        var visited = {};
        visited[node.id] = true;
        var nns = [node];
        var stack = [node];
        while(stack.length !== 0) {
            var n = stack.shift();
            var childLinks = links.filter(function(d) { return (d.source === n) || (d.target === n);});
            for (var i=0;i<childLinks.length;i++) {
                var child = (childLinks[i].source === n)?childLinks[i].target:childLinks[i].source;
                var id = child.id;
                if (!id) {
                    id = child.direction+":"+child.i;
                }
                if (!visited[id]) {
                    visited[id] = true;
                    nns.push(child);
                    stack.push(child);
                }
            }
        }
        return nns;
    }

    function convertWorkspace(n) {
        var node = {};
        node.id = n.id;
        node.type = n.type;
        node.namespace = n.namespace ? n.namespace : n.type;
        for (var d in n._def.defaults) {
            if (n._def.defaults.hasOwnProperty(d)) {
                node[d] = n[d];
            }
        }
        return node;
    }
    /**
     * Converts a node to an exportable JSON Object
     **/
    function convertNode(n, exportCreds) {
        if (n.type === 'tab') {
            return convertWorkspace(n);
        }
        exportCreds = exportCreds || false;
        var node = {};
        node.id = n.id;
        node.type = n.type;
        node.namespace = n._def.namespace ? n._def.namespace : n.type;
        node.z = n.z;

        if (node.type == "unknown") {
            for (var p in n._orig) {
                if (n._orig.hasOwnProperty(p)) {
                    node[p] = n._orig[p];
                }
            }
        } else {
            for (var d in n._def.defaults) {
                if (n._def.defaults.hasOwnProperty(d)) {
                    node[d] = n[d];
                }
            }
            if(exportCreds && n.credentials) {
                var credentialSet = {};
                node.credentials = {};
                for (var cred in n._def.credentials) {
                    if (n._def.credentials.hasOwnProperty(cred)) {
                        if (n._def.credentials[cred].type == 'password') {
                            if (!n.credentials._ ||
                                n.credentials["has_"+cred] != n.credentials._["has_"+cred] ||
                                (n.credentials["has_"+cred] && n.credentials[cred])) {
                                credentialSet[cred] = n.credentials[cred];
                            }
                        } else if (n.credentials[cred] != null && (!n.credentials._ || n.credentials[cred] != n.credentials._[cred])) {
                            credentialSet[cred] = n.credentials[cred];
                        }
                    }
                }
                if (Object.keys(credentialSet).length > 0) {
                    node.credentials = credentialSet;
                }
            }
        }
        if (n._def.category != "config") {
            node.x = n.x;
            node.y = n.y;
            node.wires = [];
            for(var i=0;i<n.outputs;i++) {
                node.wires.push([]);
            }
            var wires = links.filter(function(d){return d.source === n;});
            for (var j=0;j<wires.length;j++) {
                var w = wires[j];
                if (w.target.type != "subflow") {
                    node.wires[w.sourcePort].push({"id":w.target.id,"port":w.targetPort});
                }
            }

            if (n.inputs > 0 && n.inputLabels && !/^\s*$/.test(n.inputLabels.join("")))  {
                node.inputLabels = n.inputLabels.slice();
            }
            if (n.outputs > 0 && n.outputLabels && !/^\s*$/.test(n.outputLabels.join(""))) {
                node.outputLabels = n.outputLabels.slice();
            }
        }
        return node;
    }

    function convertSubflow(n) {
        var node = {};
        node.id = n.id;
        node.type = n.type;
        node.namespace = n.namespace ? n.namespace : n.type;
        node.name = n.name;
        node.info = n.info;
        node.in = [];
        node.out = [];

        n.in.forEach(function(p) {
            var nIn = {x:p.x,y:p.y,wires:[]};
            var wires = links.filter(function(d) { return d.source === p });
            for (var i=0;i<wires.length;i++) {
                var w = wires[i];
                if (w.target.type != "subflow") {
                    nIn.wires.push({id:w.target.id,port:wires[i].targetPort})
                }
            }
            node.in.push(nIn);
        });
        n.out.forEach(function(p,c) {
            var nOut = {x:p.x,y:p.y,wires:[]};
            var wires = links.filter(function(d) { return d.target === p });
            for (i=0;i<wires.length;i++) {
                if (wires[i].source.type != "subflow") {
                    nOut.wires.push({id:wires[i].source.id,port:wires[i].sourcePort})
                } else {
                    nOut.wires.push({id:n.id,port:wires[i].sourcePort})
                }
            }
            node.out.push(nOut);
        });

        if (node.in.length > 0 && n.inputLabels && !/^\s*$/.test(n.inputLabels.join("")))  {
            node.inputLabels = n.inputLabels.slice();
        }
        if (node.out.length > 0 && n.outputLabels && !/^\s*$/.test(n.outputLabels.join(""))) {
            node.outputLabels = n.outputLabels.slice();
        }


        return node;
    }
    /**
     * Converts the current node selection to an exportable JSON Object
     **/
    function createExportableNodeSet(set) {
        var nns = [];
        var exportedConfigNodes = {};
        var exportedSubflows = {};
        for (var n=0;n<set.length;n++) {
            var node = set[n];
            if (node.type.substring(0,8) == "subflow:") {
                var subflowId = node.type.substring(8);
                if (!exportedSubflows[subflowId]) {
                    exportedSubflows[subflowId] = true;
                    var subflow = getSubflow(subflowId);
                    var subflowSet = [subflow];
                    RED.nodes.eachNode(function(n) {
                        if (n.z == subflowId) {
                            subflowSet.push(n);
                        }
                    });
                    var exportableSubflow = createExportableNodeSet(subflowSet);
                    nns = exportableSubflow.concat(nns);
                }
            }
            if (node.type != "subflow") {
                var convertedNode = RED.nodes.convertNode(node);
                for (var d in node._def.defaults) {
                    if (node._def.defaults[d].type && node[d] in configNodes) {
                        var confNode = configNodes[node[d]];
                        var exportable = registry.getNodeType(node._def.defaults[d].type).exportable;
                        if ((exportable == null || exportable)) {
                            if (!(node[d] in exportedConfigNodes)) {
                                exportedConfigNodes[node[d]] = true;
                                set.push(confNode);
                            }
                        } else {
                            convertedNode[d] = "";
                        }
                    }
                }
                nns.push(convertedNode);
            } else {
                var convertedSubflow = convertSubflow(node);
                nns.push(convertedSubflow);
            }
        }
        return nns;
    }

    //TODO: rename this (createCompleteNodeSet)
    function createCompleteNodeSet(exportCredentials) {
        if (exportCredentials === undefined) {
            exportCredentials = true;
        }
        var nns = [];
        var i;
        for (i=0;i<workspacesOrder.length;i++) {
            if (workspaces[workspacesOrder[i]].type == "tab") {
                nns.push(convertWorkspace(workspaces[workspacesOrder[i]]));
            }
        }
        for (i in subflows) {
            if (subflows.hasOwnProperty(i)) {
                nns.push(convertSubflow(subflows[i]));
            }
        }
        for (i in configNodes) {
            if (configNodes.hasOwnProperty(i)) {
                nns.push(convertNode(configNodes[i], exportCredentials));
            }
        }
        for (i=0;i<nodes.length;i++) {
            var node = nodes[i];
            nns.push(convertNode(node, exportCredentials));
        }
        return nns;
    }

    function checkForMatchingSubflow(subflow,subflowNodes) {
        var i;
        var match = null;
        try {
            RED.nodes.eachSubflow(function(sf) {
                if (sf.name != subflow.name ||
                    sf.info != subflow.info ||
                    sf.in.length != subflow.in.length ||
                    sf.out.length != subflow.out.length) {
                        return;
                }
                var sfNodes = RED.nodes.filterNodes({z:sf.id});
                if (sfNodes.length != subflowNodes.length) {
                    return;
                }

                var subflowNodeSet = [subflow].concat(subflowNodes);
                var sfNodeSet = [sf].concat(sfNodes);

                var exportableSubflowNodes = JSON.stringify(subflowNodeSet);
                var exportableSFNodes = JSON.stringify(createExportableNodeSet(sfNodeSet));
                var nodeMap = {};
                for (i=0;i<sfNodes.length;i++) {
                    exportableSubflowNodes = exportableSubflowNodes.replace(new RegExp("\""+subflowNodes[i].id+"\"","g"),'"'+sfNodes[i].id+'"');
                }
                exportableSubflowNodes = exportableSubflowNodes.replace(new RegExp("\""+subflow.id+"\"","g"),'"'+sf.id+'"');

                if (exportableSubflowNodes !== exportableSFNodes) {
                    return;
                }

                match = sf;
                throw new Error();
            });
        } catch(err) {
            console.log(err.stack);
        }
        return match;
    }
    function compareNodes(nodeA,nodeB,idMustMatch) {
        if (idMustMatch && nodeA.id != nodeB.id) {
            return false;
        }
        if (nodeA.type != nodeB.type) {
            return false;
        }
        var def = nodeA._def;
        for (var d in def.defaults) {
            if (def.defaults.hasOwnProperty(d)) {
                var vA = nodeA[d];
                var vB = nodeB[d];
                if (typeof vA !== typeof vB) {
                    return false;
                }
                if (vA === null || typeof vA === "string" || typeof vA === "number") {
                    if (vA !== vB) {
                        return false;
                    }
                } else {
                    if (JSON.stringify(vA) !== JSON.stringify(vB)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    function importNodes(newNodesObj,createNewIds,createMissingWorkspace) {
        var i;
        var n;
        var newNodes;
        var nodeZmap = {};
        if (typeof newNodesObj === "string") {
            if (newNodesObj === "") {
                return;
            }
            try {
                newNodes = JSON.parse(newNodesObj);
            } catch(err) {
                var e = new Error(RED._("clipboard.invalidFlow",{message:err.message}));
                e.code = "NODE_RED";
                throw e;
            }
        } else {
            newNodes = newNodesObj;
        }

        if (!$.isArray(newNodes)) {
            newNodes = [newNodes];
        }
        if (!initialLoad) {
            initialLoad = JSON.parse(JSON.stringify(newNodes));
        }
        var unknownTypes = [];
        for (i=0;i<newNodes.length;i++) {
            n = newNodes[i];
            // TODO: remove workspace in next release+1
            if (n.type != "workspace" &&
                n.type != "tab" &&
                n.type != "subflow" &&
                !registry.getNodeType(n.type) &&
                n.type.substring(0,8) != "subflow:" &&
                unknownTypes.indexOf(n.type)==-1) {
                    unknownTypes.push(n.type);
            }
            if (n.z) {
                nodeZmap[n.z] = nodeZmap[n.z] || [];
                nodeZmap[n.z].push(n);
            }

        }
        if (unknownTypes.length > 0) {
            var typeList = "<ul><li>"+unknownTypes.join("</li><li>")+"</li></ul>";
            var type = "type"+(unknownTypes.length > 1?"s":"");
            RED.notify("<strong>"+RED._("clipboard.importUnrecognised",{count:unknownTypes.length})+"</strong>"+typeList,"error",false,10000);
        }

        var activeWorkspace = RED.workspaces.active();
        //TODO: check the z of the subflow instance and check _that_ if it exists
        var activeSubflow = getSubflow(activeWorkspace);
        for (i=0;i<newNodes.length;i++) {
            var m = /^subflow:(.+)$/.exec(newNodes[i].type);
            if (m) {
                var subflowId = m[1];
                var parent = getSubflow(newNodes[i].z || activeWorkspace);
                if (parent) {
                    var err;
                    if (subflowId === parent.id) {
                        err = new Error(RED._("notification.errors.cannotAddSubflowToItself"));
                    }
                    if (subflowContains(subflowId,parent.id)) {
                        err = new Error(RED._("notification.errors.cannotAddCircularReference"));
                    }
                    if (err) {
                        // TODO: standardise error codes
                        err.code = "NODE_RED";
                        throw err;
                    }
                }
            }
        }

        var new_workspaces = [];
        var workspace_map = {};
        var new_subflows = [];
        var subflow_map = {};
        var subflow_blacklist = {};
        var node_map = {};
        var new_nodes = [];
        var new_links = [];
        var nid;
        var def;
        var configNode;
        var missingWorkspace = null;
        var d;

        // Find all tabs and subflow templates
        for (i=0;i<newNodes.length;i++) {
            n = newNodes[i];
            // TODO: remove workspace in next release+1
            if (n.type === "workspace" || n.type === "tab") {
                if (n.type === "workspace") {
                    n.type = "tab";
                }
                if (defaultWorkspace == null) {
                    defaultWorkspace = n;
                }
                if (createNewIds) {
                    nid = getID();
                    workspace_map[n.id] = nid;
                    n.id = nid;
                }
                addWorkspace(n);
                RED.workspaces.add(n);
                new_workspaces.push(n);
            } else if (n.type === "subflow") {
                var matchingSubflow = checkForMatchingSubflow(n,nodeZmap[n.id]);
                if (matchingSubflow) {
                    subflow_blacklist[n.id] = matchingSubflow;
                } else {
                    subflow_map[n.id] = n;
                    if (createNewIds) {
                        nid = getID();
                        n.id = nid;
                    }
                    // TODO: handle createNewIds - map old to new subflow ids
                    n.in.forEach(function(input,i) {
                        input.type = "subflow";
                        input.direction = "in";
                        input.z = n.id;
                        input.i = i;
                        input.id = getID();
                    });
                    n.out.forEach(function(output,i) {
                        output.type = "subflow";
                        output.direction = "out";
                        output.z = n.id;
                        output.i = i;
                        output.id = getID();
                    });
                    new_subflows.push(n);
                    addSubflow(n,createNewIds);
                }
            }
        }

        // Add a tab if there isn't one there already
        if (defaultWorkspace == null) {
            defaultWorkspace = { type:"tab", id:getID(), label:RED._('workspace.defaultName',{number:1})};
            addWorkspace(defaultWorkspace);
            RED.workspaces.add(defaultWorkspace);
            new_workspaces.push(defaultWorkspace);
            activeWorkspace = RED.workspaces.active();
        }

        // Find all config nodes and add them
        for (i=0;i<newNodes.length;i++) {
            n = newNodes[i];
            def = registry.getNodeType(n.type);
            if (def && def.category == "config") {
                var existingConfigNode = null;
                if (createNewIds) {
                    if (n.z) {
                        if (subflow_blacklist[n.z]) {
                            continue;
                        } else if (subflow_map[n.z]) {
                            n.z = subflow_map[n.z].id;
                        } else {
                            n.z = workspace_map[n.z];
                            if (!workspaces[n.z]) {
                                if (createMissingWorkspace) {
                                    if (missingWorkspace === null) {
                                        missingWorkspace = RED.workspaces.add(null,true);
                                        new_workspaces.push(missingWorkspace);
                                    }
                                    n.z = missingWorkspace.id;
                                } else {
                                    n.z = activeWorkspace;
                                }
                            }
                        }
                    }
                    existingConfigNode = RED.nodes.node(n.id);
                    if (existingConfigNode) {
                        if (n.z && existingConfigNode.z !== n.z) {
                            existingConfigNode = null;
                            // Check the config nodes on n.z
                            for (var cn in configNodes) {
                                if (configNodes.hasOwnProperty(cn)) {
                                    if (configNodes[cn].z === n.z && compareNodes(configNodes[cn],n,false)) {
                                        existingConfigNode = configNodes[cn];
                                        node_map[n.id] = configNodes[cn];
                                        break;
                                    }
                                }
                            }
                        }
                    }

                }

                if (!existingConfigNode) { //} || !compareNodes(existingConfigNode,n,true) || existingConfigNode._def.exclusive || existingConfigNode.z !== n.z) {
                    configNode = {id:n.id, z:n.z, type:n.type, namespace:n.namespace, users:[], _config:{}};
                    for (d in def.defaults) {
                        if (def.defaults.hasOwnProperty(d)) {
                            configNode[d] = n[d];
                            configNode._config[d] = JSON.stringify(n[d]);
                        }
                    }
                    if (def.hasOwnProperty('credentials') && n.hasOwnProperty('credentials')) {
                        configNode.credentials = {};
                        for (d in def.credentials) {
                            if (def.credentials.hasOwnProperty(d) && n.credentials.hasOwnProperty(d)) {
                                configNode.credentials[d] = n.credentials[d];
                            }
                        }
                    }
                    configNode.label = def.label;
                    configNode._def = def;
                    if (createNewIds) {
                        configNode.id = getID();
                    }
                    node_map[n.id] = configNode;
                    new_nodes.push(configNode);
                    RED.nodes.add(configNode);
                }
            }
        }

        // Find regular flow nodes and subflow instances
        for (i=0;i<newNodes.length;i++) {
            n = newNodes[i];
            // TODO: remove workspace in next release+1
            if (n.type !== "workspace" && n.type !== "tab" && n.type !== "subflow") {
                def = registry.getNodeType(n.type);
                if (!def || def.category != "config") {
                    var node = {
                        x:n.x,
                        y:n.y,
                        z:n.z,
                        type:0,
                        wires:n.wires,
                        inputLabels: n.inputLabels,
                        outputLabels: n.outputLabels,
                        changed:false,
                        _config:{}
                    };
                    if (createNewIds) {
                        if (subflow_blacklist[n.z]) {
                            continue;
                        } else if (subflow_map[node.z]) {
                            node.z = subflow_map[node.z].id;
                        } else {
                            node.z = workspace_map[node.z];
                            if (!workspaces[node.z]) {
                                if (createMissingWorkspace) {
                                    if (missingWorkspace === null) {
                                        missingWorkspace = RED.workspaces.add(null,true);
                                        new_workspaces.push(missingWorkspace);
                                    }
                                    node.z = missingWorkspace.id;
                                } else {
                                    node.z = activeWorkspace;
                                }
                            }
                        }
                        node.id = getID();
                    } else {
                        node.id = n.id;
                        if (node.z == null || (!workspaces[node.z] && !subflow_map[node.z])) {
                            if (createMissingWorkspace) {
                                if (missingWorkspace === null) {
                                    missingWorkspace = RED.workspaces.add(null,true);
                                    new_workspaces.push(missingWorkspace);
                                }
                                node.z = missingWorkspace.id;
                            } else {
                                node.z = activeWorkspace;
                            }
                        }
                    }
                    node.type = n.type;
                    node.namespace = n.namespace ? n.namespace : (def.namespace ? def.namespace : n.type);
                    node._def = def;
                    if (n.type.substring(0,7) === "subflow") {
                        var parentId = n.type.split(":")[1];
                        var subflow = subflow_blacklist[parentId]||subflow_map[parentId]||getSubflow(parentId);
                        if (createNewIds) {
                            parentId = subflow.id;
                            node.type = "subflow:"+parentId;
                            node.namespace = node.type;
                            node._def = registry.getNodeType(node.type);
                            delete node.i;
                        }
                        node.name = n.name;
                        node.outputs = subflow.out.length;
                        node.inputs = subflow.in.length;
                    } else {
                        if (!node._def) {
                            if (node.x && node.y) {
                                node._def = {
                                    color:"#fee",
                                    defaults: {},
                                    label: "unknown: "+n.type,
                                    labelStyle: "node_label_italic",
                                    outputs: n.outputs||n.wires.length,
                                    set: registry.getNodeSet("node-red/unknown")
                                }
                            } else {
                                node._def = {
                                    category:"config",
                                    set: registry.getNodeSet("node-red/unknown")
                                };
                                node.users = [];
                            }
                            var orig = {};
                            for (var p in n) {
                                if (n.hasOwnProperty(p) && p!="x" && p!="y" && p!="z" && p!="id" && p!="wires") {
                                    orig[p] = n[p];
                                }
                            }
                            node._orig = orig;
                            node.name = n.type;
                            node.type = "unknown";
                            node.namespace = "unknown";
                        }
                        if (node._def.category != "config") {
                            node.inputs = n.inputs||node._def.inputs;
                            node.outputs = n.outputs||node._def.outputs;
                            for (d in node._def.defaults) {
                                if (node._def.defaults.hasOwnProperty(d)) {
                                    node[d] = n[d];
                                    node._config[d] = JSON.stringify(n[d]);
                                }
                            }
                            node._config.x = node.x;
                            node._config.y = node.y;
                            if (node._def.hasOwnProperty('credentials') && n.hasOwnProperty('credentials')) {
                                node.credentials = {};
                                for (d in node._def.credentials) {
                                    if (node._def.credentials.hasOwnProperty(d) && n.credentials.hasOwnProperty(d)) {
                                        node.credentials[d] = n.credentials[d];
                                    }
                                }
                            }
                        }
                    }
                    addNode(node);
                    RED.editor.validateNode(node);
                    node_map[n.id] = node;
                    if (node._def.category != "config") {
                        new_nodes.push(node);
                    }
                }
            }
        }
        // TODO: make this a part of the node definition so it doesn't have to
        //       be hardcoded here
        var nodeTypeArrayReferences = {
            "catch":"scope",
            "status":"scope",
            "link in":"links",
            "link out":"links"
        }

        // Remap all wires and config node references
        for (i=0;i<new_nodes.length;i++) {
            n = new_nodes[i];
            if (n.wires) {
                for (var w1=0;w1<n.wires.length;w1++) {
                    var wires = (n.wires[w1] instanceof Array)?n.wires[w1]:[n.wires[w1]];
                    for (var w2=0;w2<wires.length;w2++) {
                        if (node_map.hasOwnProperty(wires[w2].id) && wires[w2].port < node_map[wires[w2].id].inputs) {
                            if (n.z === node_map[wires[w2].id].z) {
                                var link = {source:n,sourcePort:w1,target:node_map[wires[w2].id],targetPort:wires[w2].port};
                                addLink(link);
                                new_links.push(link);
                            } else {
                                console.log("Warning: dropping link that crosses tabs:",n.id,"->",node_map[wires[w2]].id);
                            }
                        }
                    }
                }
                delete n.wires;
            }
            for (var d3 in n._def.defaults) {
                if (n._def.defaults.hasOwnProperty(d3)) {
                    if (n._def.defaults[d3].type && node_map[n[d3]]) {
                        n[d3] = node_map[n[d3]].id;
                        configNode = RED.nodes.node(n[d3]);
                        if (configNode && configNode.users.indexOf(n) === -1) {
                            configNode.users.push(n);
                        }
                    } else if (nodeTypeArrayReferences.hasOwnProperty(n.type) && nodeTypeArrayReferences[n.type] === d3 && n[d3] !== undefined && n[d3] !== null) {
                        for (var j = 0;j<n[d3].length;j++) {
                            if (node_map[n[d3][j]]) {
                                n[d3][j] = node_map[n[d3][j]].id;
                            }
                        }

                    }
                }
            }
            // If importing into a subflow, ensure an outbound-link doesn't
            // get added
            if (activeSubflow && /^link /.test(n.type) && n.links) {
                n.links = n.links.filter(function(id) {
                    var otherNode = RED.nodes.node(id);
                    return (otherNode && otherNode.z === activeWorkspace)
                });
            }

            // With all properties now remapped to point at valid nodes,
            // we can validate the node
            RED.editor.validateNode(n);
        }
        for (i=0;i<new_subflows.length;i++) {
            n = new_subflows[i];
            n.in.forEach(function(input) {
                input.wires.forEach(function(wire, index) {
                    var link = {source:input, sourcePort: index, target:node_map[wire.id], targetPort: wire.port};
                    addLink(link);
                    new_links.push(link);
                });
                delete input.wires;
            });
            n.out.forEach(function(output) {
                output.wires.forEach(function(wire) {
                    var link;
                    if (subflow_map[wire.id] && subflow_map[wire.id].id == n.id) {
                        link = {source:n.in[wire.port], sourcePort:wire.port,target:output};
                    } else {
                        link = {source:node_map[wire.id]||subflow_map[wire.id], sourcePort:wire.port,target:output};
                    }
                    addLink(link);
                    new_links.push(link);
                });
                delete output.wires;
            });
        }

        RED.workspaces.refresh();
        return [new_nodes,new_links,new_workspaces,new_subflows,missingWorkspace];
    }

    // TODO: supports filter.z|type
    function filterNodes(filter) {
        var result = [];

        for (var n=0;n<nodes.length;n++) {
            var node = nodes[n];
            if (filter.hasOwnProperty("z") && node.z !== filter.z) {
                continue;
            }
            if (filter.hasOwnProperty("type") && node.type !== filter.type) {
                continue;
            }
            result.push(node);
        }
        return result;
    }
    function filterLinks(filter) {
        var result = [];

        for (var n=0;n<links.length;n++) {
            var link = links[n];
            if (filter.source) {
                if (filter.source.hasOwnProperty("id") && link.source.id !== filter.source.id) {
                    continue;
                }
                if (filter.source.hasOwnProperty("z") && link.source.z !== filter.source.z) {
                    continue;
                }
            }
            if (filter.target) {
                if (filter.target.hasOwnProperty("id") && link.target.id !== filter.target.id) {
                    continue;
                }
                if (filter.target.hasOwnProperty("z") && link.target.z !== filter.target.z) {
                    continue;
                }
            }
            if (filter.hasOwnProperty("sourcePort") && link.sourcePort !== filter.sourcePort) {
                continue;
            }
            if (filter.hasOwnProperty("targetPort") && link.targetPort !== filter.targetPort) {
                continue;
            }
            result.push(link);
        }
        return result;
    }

    // Update any config nodes referenced by the provided node to ensure their 'users' list is correct
    function updateConfigNodeUsers(n) {
        for (var d in n._def.defaults) {
            if (n._def.defaults.hasOwnProperty(d)) {
                var property = n._def.defaults[d];
                if (property.type) {
                    var type = registry.getNodeType(property.type);
                    if (type && type.category == "config") {
                        var configNode = configNodes[n[d]];
                        if (configNode) {
                            if (configNode.users.indexOf(n) === -1) {
                                configNode.users.push(n);
                            }
                        }
                    }
                }
            }
        }
    }

    function flowVersion(version) {
        if (version !== undefined) {
            loadedFlowVersion = version;
        } else {
            return loadedFlowVersion;
        }
    }

    function clear() {
        nodes = [];
        links = [];
        configNodes = {};
        workspacesOrder = [];
        var subflowIds = Object.keys(subflows);
        subflowIds.forEach(function(id) {
            RED.subflow.removeSubflow(id)
        });
        var workspaceIds = Object.keys(workspaces);
        workspaceIds.forEach(function(id) {
            RED.workspaces.remove(workspaces[id]);
        });
        defaultWorkspace = null;

        RED.nodes.dirty(true);
        RED.view.redraw(true);
        RED.palette.refresh();
        RED.workspaces.refresh();
        RED.sidebar.config.refresh();

        // var node_defs = {};
        // var nodes = [];
        // var configNodes = {};
        // var links = [];
        // var defaultWorkspace;
        // var workspaces = {};
        // var workspacesOrder =[];
        // var subflows = {};
        // var loadedFlowVersion = null;
    }

    return {
        registry:registry,
        setNodeList: registry.setNodeList,

        getNodeSet: registry.getNodeSet,
        addNodeSet: registry.addNodeSet,
        removeNodeSet: registry.removeNodeSet,
        enableNodeSet: registry.enableNodeSet,
        disableNodeSet: registry.disableNodeSet,

        registerType: registry.registerNodeType,
        getType: registry.getNodeType,
        convertNode: convertNode,

        add: addNode,
        remove: removeNode,
        clear: clear,

        addLink: addLink,
        removeLink: removeLink,

        addWorkspace: addWorkspace,
        removeWorkspace: removeWorkspace,
        getWorkspaceOrder: function() { return workspacesOrder },
        setWorkspaceOrder: function(order) { workspacesOrder = order; },
        workspace: getWorkspace,

        addSubflow: addSubflow,
        removeSubflow: removeSubflow,
        subflow: getSubflow,
        subflowContains: subflowContains,

        eachNode: function(cb) {
            for (var n=0;n<nodes.length;n++) {
                cb(nodes[n]);
            }
        },
        eachLink: function(cb) {
            for (var l=0;l<links.length;l++) {
                cb(links[l]);
            }
        },
        eachConfig: function(cb) {
            for (var id in configNodes) {
                if (configNodes.hasOwnProperty(id)) {
                    cb(configNodes[id]);
                }
            }
        },
        eachSubflow: function(cb) {
            for (var id in subflows) {
                if (subflows.hasOwnProperty(id)) {
                    cb(subflows[id]);
                }
            }
        },
        eachWorkspace: function(cb) {
            for (var i=0;i<workspacesOrder.length;i++) {
                cb(workspaces[workspacesOrder[i]]);
            }
        },

        node: getNode,

        version: flowVersion,
        originalFlow: function(flow) {
            if (flow === undefined) {
                return initialLoad;
            } else {
                initialLoad = flow;
            }
        },

        filterNodes: filterNodes,
        filterLinks: filterLinks,

        import: importNodes,

        getAllFlowNodes: getAllFlowNodes,
        createExportableNodeSet: createExportableNodeSet,
        createCompleteNodeSet: createCompleteNodeSet,
        updateConfigNodeUsers: updateConfigNodeUsers,
        id: getID,
        dirty: function(d) {
            if (d == null) {
                return dirty;
            } else {
                setDirty(d);
            }
        }
    };
})();
;/** This file was modified by Sathya Laufer */

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
RED.history = (function() {
    var undo_history = [];

    function undoEvent(ev) {
        var i;
        var len;
        var node;
        var subflow;
        var modifiedTabs = {};
        if (ev) {
            if (ev.t == 'multi') {
                len = ev.events.length;
                for (i=len-1;i>=0;i--) {
                    undoEvent(ev.events[i]);
                }
            } else if (ev.t == 'replace') {
                RED.nodes.clear();
                var imported = RED.nodes.import(ev.config);
                imported[0].forEach(function(n) {
                    if (ev.changed[n.id]) {
                        n.changed = true;
                    }
                })

                RED.nodes.version(ev.rev);
            } else if (ev.t == 'add') {
                if (ev.nodes) {
                    for (i=0;i<ev.nodes.length;i++) {
                        node = RED.nodes.node(ev.nodes[i]);
                        if (node.z) {
                            modifiedTabs[node.z] = true;
                        }
                        RED.nodes.remove(ev.nodes[i]);
                    }
                }
                if (ev.links) {
                    for (i=0;i<ev.links.length;i++) {
                        RED.nodes.removeLink(ev.links[i]);
                    }
                }
                if (ev.workspaces) {
                    for (i=0;i<ev.workspaces.length;i++) {
                        RED.nodes.removeWorkspace(ev.workspaces[i].id);
                        RED.workspaces.remove(ev.workspaces[i]);
                    }
                }
                if (ev.subflows) {
                    for (i=0;i<ev.subflows.length;i++) {
                        RED.nodes.removeSubflow(ev.subflows[i]);
                        RED.workspaces.remove(ev.subflows[i]);
                    }
                }
                if (ev.subflow) {
                    if (ev.subflow.instances) {
                        ev.subflow.instances.forEach(function(n) {
                            var node = RED.nodes.node(n.id);
                            if (node) {
                                node.changed = n.changed;
                                node.dirty = true;
                            }
                        });
                    }
                    if (ev.subflow.hasOwnProperty('changed')) {
                        subflow = RED.nodes.subflow(ev.subflow.id);
                        if (subflow) {
                            subflow.changed = ev.subflow.changed;
                        }
                    }
                }
                if (ev.removedLinks) {
                    for (i=0;i<ev.removedLinks.length;i++) {
                        RED.nodes.addLink(ev.removedLinks[i]);
                    }
                }

            } else if (ev.t == "delete") {
                if (ev.workspaces) {
                    for (i=0;i<ev.workspaces.length;i++) {
                        RED.nodes.addWorkspace(ev.workspaces[i]);
                        RED.workspaces.add(ev.workspaces[i]);
                    }
                }
                if (ev.subflow && ev.subflow.subflow) {
                    RED.nodes.addSubflow(ev.subflow.subflow);
                }
                if (ev.subflowInputs && ev.subflowInputs.length > 0) {
                    subflow = RED.nodes.subflow(ev.subflowInputs[0].z);
                    subflow.in.push(ev.subflowInputs[0]);
                    subflow.in[0].dirty = true;
                }
                if (ev.subflowOutputs && ev.subflowOutputs.length > 0) {
                    subflow = RED.nodes.subflow(ev.subflowOutputs[0].z);
                    ev.subflowOutputs.sort(function(a,b) { return a.i-b.i});
                    for (i=0;i<ev.subflowOutputs.length;i++) {
                        var output = ev.subflowOutputs[i];
                        subflow.out.splice(output.i,0,output);
                        for (var j=output.i+1;j<subflow.out.length;j++) {
                            subflow.out[j].i++;
                            subflow.out[j].dirty = true;
                        }
                        RED.nodes.eachLink(function(l) {
                            if (l.source.type == "subflow:"+subflow.id) {
                                if (l.sourcePort >= output.i) {
                                    l.sourcePort++;
                                }
                            }
                        });
                    }
                }
                if (ev.subflow && ev.subflow.hasOwnProperty('instances')) {
                    ev.subflow.instances.forEach(function(n) {
                        var node = RED.nodes.node(n.id);
                        if (node) {
                            node.changed = n.changed;
                            node.dirty = true;
                        }
                    });
                }
                if (subflow) {
                    RED.nodes.filterNodes({type:"subflow:"+subflow.id}).forEach(function(n) {
                        n.inputs = subflow.in.length;
                        while (n.inputs > n.inputPorts.length) {
                            n.inputPorts.push(n.inputPorts.length);
                        }
                        n.outputs = subflow.out.length;
                        while (n.outputs > n.outputPorts.length) {
                            n.outputPorts.push(n.outputPorts.length);
                        }
                        n.resize = true;
                        n.dirty = true;
                    });
                }
                if (ev.nodes) {
                    for (i=0;i<ev.nodes.length;i++) {
                        RED.nodes.add(ev.nodes[i]);
                        modifiedTabs[ev.nodes[i].z] = true;
                    }
                }
                if (ev.links) {
                    for (i=0;i<ev.links.length;i++) {
                        RED.nodes.addLink(ev.links[i]);
                    }
                }
                if (ev.changes) {
                    for (i in ev.changes) {
                        if (ev.changes.hasOwnProperty(i)) {
                            node = RED.nodes.node(i);
                            if (node) {
                                for (var d in ev.changes[i]) {
                                    if (ev.changes[i].hasOwnProperty(d)) {
                                        node[d] = ev.changes[i][d];
                                    }
                                }
                                node.dirty = true;
                            }
                        }
                    }

                }
            } else if (ev.t == "move") {
                for (i=0;i<ev.nodes.length;i++) {
                    var n = ev.nodes[i];
                    n.n.x = n.ox;
                    n.n.y = n.oy;
                    n.n.dirty = true;
                    n.n.moved = n.moved;
                }
                // A move could have caused a link splice
                if (ev.links) {
                    for (i=0;i<ev.links.length;i++) {
                        RED.nodes.removeLink(ev.links[i]);
                    }
                }
                if (ev.removedLinks) {
                    for (i=0;i<ev.removedLinks.length;i++) {
                        RED.nodes.addLink(ev.removedLinks[i]);
                    }
                }
            } else if (ev.t == "edit") {
                for (i in ev.changes) {
                    if (ev.changes.hasOwnProperty(i)) {
                        if (ev.node._def.defaults[i] && ev.node._def.defaults[i].type) {
                            // This is a config node property
                            var currentConfigNode = RED.nodes.node(ev.node[i]);
                            if (currentConfigNode) {
                                currentConfigNode.users.splice(currentConfigNode.users.indexOf(ev.node),1);
                            }
                            var newConfigNode = RED.nodes.node(ev.changes[i]);
                            if (newConfigNode) {
                                newConfigNode.users.push(ev.node);
                            }
                        }
                        ev.node[i] = ev.changes[i];
                    }
                }
                if (ev.subflow) {
                    if (ev.subflow.hasOwnProperty('inputCount')) {
                        if (ev.node.in.length > ev.subflow.inputCount) {
                            ev.node.in.splice(ev.subflow.inputCount);
                        } else if (ev.subflow.inputs.length > 0) {
                            ev.node.in = ev.node.in.concat(ev.subflow.inputs);
                        }
                    }
                    if (ev.subflow.hasOwnProperty('outputCount')) {
                        if (ev.node.out.length > ev.subflow.outputCount) {
                            ev.node.out.splice(ev.subflow.outputCount);
                        } else if (ev.subflow.outputs.length > 0) {
                            ev.node.out = ev.node.out.concat(ev.subflow.outputs);
                        }
                    }
                    if (ev.subflow.hasOwnProperty('instances')) {
                        ev.subflow.instances.forEach(function(n) {
                            var node = RED.nodes.node(n.id);
                            if (node) {
                                node.changed = n.changed;
                                node.dirty = true;
                            }
                        });
                    }
                    RED.nodes.filterNodes({type:"subflow:"+ev.node.id}).forEach(function(n) {
                        n.inputs = ev.node.in.length;
                        n.outputs = ev.node.out.length;
                        RED.editor.updateNodeProperties(n);
                    });
                } else {
                    var outputMap;
                    if (ev.outputMap) {
                        outputMap = {};
                        for (var port in ev.outputMap) {
                            if (ev.outputMap.hasOwnProperty(port) && ev.outputMap[port] !== "-1") {
                                outputMap[ev.outputMap[port]] = port;
                            }
                        }
                    }
                    RED.editor.updateNodeProperties(ev.node,outputMap);
                    RED.editor.validateNode(ev.node);
                }
                if (ev.links) {
                    for (i=0;i<ev.links.length;i++) {
                        RED.nodes.addLink(ev.links[i]);
                    }
                }
                ev.node.dirty = true;
                ev.node.changed = ev.changed;
            } else if (ev.t == "createSubflow") {
                if (ev.nodes) {
                    RED.nodes.filterNodes({z:ev.subflow.subflow.id}).forEach(function(n) {
                        n.z = ev.activeWorkspace;
                        n.dirty = true;
                    });
                    for (i=0;i<ev.nodes.length;i++) {
                        RED.nodes.remove(ev.nodes[i]);
                    }
                }
                if (ev.links) {
                    for (i=0;i<ev.links.length;i++) {
                        RED.nodes.removeLink(ev.links[i]);
                    }
                }

                RED.nodes.removeSubflow(ev.subflow.subflow);
                RED.workspaces.remove(ev.subflow.subflow);

                if (ev.removedLinks) {
                    for (i=0;i<ev.removedLinks.length;i++) {
                        RED.nodes.addLink(ev.removedLinks[i]);
                    }
                }
            } else if (ev.t == "reorder") {
                if (ev.order) {
                    RED.workspaces.order(ev.order);
                }
            }
            Object.keys(modifiedTabs).forEach(function(id) {
                var subflow = RED.nodes.subflow(id);
                if (subflow) {
                    RED.editor.validateNode(subflow);
                }
            });

            RED.nodes.dirty(ev.dirty);
            RED.view.redraw(true);
            RED.palette.refresh();
            RED.workspaces.refresh();
            RED.sidebar.config.refresh();
        }

    }

    return {
        //TODO: this function is a placeholder until there is a 'save' event that can be listened to
        markAllDirty: function() {
            for (var i=0;i<undo_history.length;i++) {
                undo_history[i].dirty = true;
            }
        },
        list: function() {
            return undo_history
        },
        depth: function() {
            return undo_history.length;
        },
        push: function(ev) {
            undo_history.push(ev);
        },
        pop: function() {
            var ev = undo_history.pop();
            undoEvent(ev);
        },
        peek: function() {
            return undo_history[undo_history.length-1];
        }
    }

})();
;/**
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
RED.validators = {
    number: function(blankAllowed){return function(v) { return (blankAllowed&&(v===''||v===undefined)) || (v!=='' && !isNaN(v));}},
    regex: function(re){return function(v) { return re.test(v);}},
    typedInput: function(ptypeName,isConfig) { return function(v) {
        var ptype = $("#node-"+(isConfig?"config-":"")+"input-"+ptypeName).val() || this[ptypeName];
        if (ptype === 'json') {
            try {
                JSON.parse(v);
                return true;
            } catch(err) {
                return false;
            }
        } else if (ptype === 'msg' || ptype === 'flow' || ptype === 'global' ) {
            return RED.utils.validatePropertyExpression(v);
        } else if (ptype === 'num') {
            return /^[+-]?[0-9]*\.?[0-9]*([eE][-+]?[0-9]+)?$/.test(v);
        }
        return true;
    }}
};
;/**
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

RED.utils = (function() {

    function formatString(str) {
        return str.replace(/\r?\n/g,"&crarr;").replace(/\t/g,"&rarr;");
    }
    function sanitize(m) {
        return m.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    }

    function buildMessageSummaryValue(value) {
        var result;
        if (Array.isArray(value)) {
            result = $('<span class="debug-message-object-value debug-message-type-meta"></span>').html('array['+value.length+']');
        } else if (value === null) {
            result = $('<span class="debug-message-object-value debug-message-type-null">null</span>');
        } else if (typeof value === 'object') {
            if (value.hasOwnProperty('type') && value.type === 'Buffer' && value.hasOwnProperty('data')) {
                result = $('<span class="debug-message-object-value debug-message-type-meta"></span>').html('buffer['+value.length+']');
            } else if (value.hasOwnProperty('type') && value.type === 'array' && value.hasOwnProperty('data')) {
                result = $('<span class="debug-message-object-value debug-message-type-meta"></span>').html('array['+value.length+']');
            } else {
                result = $('<span class="debug-message-object-value debug-message-type-meta">object</span>');
            }
        } else if (typeof value === 'string') {
            var subvalue;
            if (value.length > 30) {
                subvalue = sanitize(value.substring(0,30))+"&hellip;";
            } else {
                subvalue = sanitize(value);
            }
            result = $('<span class="debug-message-object-value debug-message-type-string"></span>').html('"'+formatString(subvalue)+'"');
        } else {
            result = $('<span class="debug-message-object-value debug-message-type-other"></span>').text(""+value);
        }
        return result;
    }
    function makeExpandable(el,onexpand,expand) {
        el.addClass("debug-message-expandable");
        el.click(function(e) {
            var parent = $(this).parent();
            if (parent.hasClass('collapsed')) {
                if (onexpand && !parent.hasClass('built')) {
                    onexpand();
                    parent.addClass('built');
                }
                parent.removeClass('collapsed');
            } else {
                parent.addClass('collapsed');
            }
            e.preventDefault();
        });
        if (expand) {
            el.click();
        }
    }

    var pinnedPaths = {};
    var formattedPaths = {};

    function addMessageControls(obj,sourceId,key,msg,rootPath,strippedKey) {
        if (!pinnedPaths.hasOwnProperty(sourceId)) {
            pinnedPaths[sourceId] = {}
        }
        var tools = $('<span class="debug-message-tools"></span>').appendTo(obj);
        var copyTools = $('<span class="debug-message-tools-copy button-group"></span>').appendTo(tools);
        if (!!key) {
            var copyPath = $('<button class="editor-button editor-button-small"><i class="fa fa-terminal"></i></button>').appendTo(copyTools).click(function(e) {
                e.preventDefault();
                e.stopPropagation();
                RED.clipboard.copyText(key,copyPath,"clipboard.copyMessagePath");
            })
        }
        var copyPayload = $('<button class="editor-button editor-button-small"><i class="fa fa-clipboard"></i></button>').appendTo(copyTools).click(function(e) {
            e.preventDefault();
            e.stopPropagation();
            RED.clipboard.copyText(msg,copyPayload,"clipboard.copyMessageValue");
        })
        if (strippedKey !== '') {
            var isPinned = pinnedPaths[sourceId].hasOwnProperty(strippedKey);

            var pinPath = $('<button class="editor-button editor-button-small debug-message-tools-pin"><i class="fa fa-map-pin"></i></button>').appendTo(tools).click(function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (pinnedPaths[sourceId].hasOwnProperty(strippedKey)) {
                    delete pinnedPaths[sourceId][strippedKey];
                    $(this).removeClass("selected");
                    obj.removeClass("debug-message-row-pinned");
                } else {
                    var rootedPath = "$"+(strippedKey[0] === '['?"":".")+strippedKey;
                    pinnedPaths[sourceId][strippedKey] = normalisePropertyExpression(rootedPath);
                    $(this).addClass("selected");
                    obj.addClass("debug-message-row-pinned");
                }
            }).toggleClass("selected",isPinned);
            obj.toggleClass("debug-message-row-pinned",isPinned);
        }
    }
    function checkExpanded(strippedKey,expandPaths,minRange,maxRange) {
        if (expandPaths && expandPaths.length > 0) {
            if (strippedKey === '' && minRange === undefined) {
                return true;
            }
            for (var i=0;i<expandPaths.length;i++) {
                var p = expandPaths[i];
                if (p.indexOf(strippedKey) === 0 && (p[strippedKey.length] === "." ||  p[strippedKey.length] === "[") ) {

                    if (minRange !== undefined && p[strippedKey.length] === "[") {
                        var subkey = p.substring(strippedKey.length);
                        var m = (/\[(\d+)\]/.exec(subkey));
                        if (m) {
                            var index = parseInt(m[1]);
                            return minRange<=index && index<=maxRange;
                        }
                    } else {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function formatNumber(element,obj,sourceId,path,cycle,initialFormat) {
        var format = (formattedPaths[sourceId] && formattedPaths[sourceId][path]) || initialFormat || "dec";
        if (cycle) {
            if (format === 'dec') {
                if ((obj.toString().length===13) && (obj<=2147483647000)) {
                    format = 'dateMS';
                } else if ((obj.toString().length===10) && (obj<=2147483647)) {
                    format = 'dateS';
                } else {
                    format = 'hex'
                }
            } else if (format === 'dateMS' || format == 'dateS') {
                format = 'hex';
            } else {
                format = 'dec';
            }
            formattedPaths[sourceId] = formattedPaths[sourceId]||{};
            formattedPaths[sourceId][path] = format;
        } else if (initialFormat !== undefined){
            formattedPaths[sourceId] = formattedPaths[sourceId]||{};
            formattedPaths[sourceId][path] = format;
        }
        if (format === 'dec') {
            element.text(""+obj);
        } else if (format === 'dateMS') {
            element.text((new Date(obj)).toISOString());
        } else if (format === 'dateS') {
            element.text((new Date(obj*1000)).toISOString());
        } else if (format === 'hex') {
            element.text("0x"+(obj).toString(16));
        }
    }

    function formatBuffer(element,button,sourceId,path,cycle) {
        var format = (formattedPaths[sourceId] && formattedPaths[sourceId][path]) || "raw";
        if (cycle) {
            if (format === 'raw') {
                format = 'string';
            } else {
                format = 'raw';
            }
            formattedPaths[sourceId] = formattedPaths[sourceId]||{};
            formattedPaths[sourceId][path] = format;
        }
        if (format === 'raw') {
            button.text('raw');
            element.removeClass('debug-message-buffer-string').addClass('debug-message-buffer-raw');
        } else if (format === 'string') {
            button.text('string');
            element.addClass('debug-message-buffer-string').removeClass('debug-message-buffer-raw');
        }
    }

    function buildMessageElement(obj,key,typeHint,hideKey,path,sourceId,rootPath,expandPaths) {
        var i;
        var e;
        var entryObj;
        var header;
        var headerHead;
        var value;
        var strippedKey;
        if (path !== undefined && rootPath !== undefined) {
             strippedKey = path.substring(rootPath.length+(path[rootPath.length]==="."?1:0));
        }
        var element = $('<span class="debug-message-element"></span>');
        element.collapse = function() {
            element.find(".debug-message-expandable").parent().addClass("collapsed");
        }
        header = $('<span class="debug-message-row"></span>').appendTo(element);
        if (sourceId) {
            addMessageControls(header,sourceId,path,obj,rootPath,strippedKey);
        }
        if (!key) {
            element.addClass("debug-message-top-level");
            if (sourceId) {
                var pinned = pinnedPaths[sourceId];
                expandPaths = [];
                if (pinned) {
                    for (var pinnedPath in pinned) {
                        if (pinned.hasOwnProperty(pinnedPath)) {
                            try {
                                var res = getMessageProperty({$:obj},pinned[pinnedPath]);
                                if (res !== undefined) {
                                    expandPaths.push(pinnedPath);
                                }
                            } catch(err) {
                            }
                        }
                    }
                    expandPaths.sort();
                }
                element.clearPinned = function() {
                    element.find(".debug-message-row-pinned").removeClass("debug-message-row-pinned");
                    pinnedPaths[sourceId] = {};
                }
            }
        } else {
            if (!hideKey) {
                $('<span class="debug-message-object-key"></span>').text(key).appendTo(header);
                $('<span>: </span>').appendTo(header);
            }
        }
        entryObj = $('<span class="debug-message-object-value"></span>').appendTo(header);

        var isArray = Array.isArray(obj);
        var isArrayObject = false;
        if (obj && typeof obj === 'object' && obj.hasOwnProperty('type') && obj.hasOwnProperty('data') && ((obj.__encoded__ && obj.type === 'array') || obj.type === 'Buffer')) {
            isArray = true;
            isArrayObject = true;
        }

        if (obj === null || obj === undefined) {
            $('<span class="debug-message-type-null">'+obj+'</span>').appendTo(entryObj);
        } else if (typeof obj === 'string') {
            if (/[\t\n\r]/.test(obj)) {
                element.addClass('collapsed');
                $('<i class="fa fa-caret-right debug-message-object-handle"></i> ').prependTo(header);
                makeExpandable(header, function() {
                    $('<span class="debug-message-type-meta debug-message-object-type-header"></span>').html(typeHint||'string').appendTo(header);
                    var row = $('<div class="debug-message-object-entry collapsed"></div>').appendTo(element);
                    $('<pre class="debug-message-type-string"></pre>').text(obj).appendTo(row);
                },checkExpanded(strippedKey,expandPaths));
            }
            e = $('<span class="debug-message-type-string debug-message-object-header"></span>').html('"'+formatString(sanitize(obj))+'"').appendTo(entryObj);
            if (/^#[0-9a-f]{6}$/i.test(obj)) {
                $('<span class="debug-message-type-string-swatch"></span>').css('backgroundColor',obj).appendTo(e);
            }

        } else if (typeof obj === 'number') {
            e = $('<span class="debug-message-type-number"></span>').appendTo(entryObj);

            if (Number.isInteger(obj) && (obj >= 0)) { // if it's a +ve integer
                e.addClass("debug-message-type-number-toggle");
                e.click(function(evt) {
                    evt.preventDefault();
                    formatNumber($(this), obj, sourceId, path, true);
                });
            }
            formatNumber(e,obj,sourceId,path,false,typeHint==='hex'?'hex':undefined);

        } else if (isArray) {
            element.addClass('collapsed');

            var originalLength = obj.length;
            if (typeHint) {
                var m = /\[(\d+)\]/.exec(typeHint);
                if (m) {
                    originalLength = parseInt(m[1]);
                }
            }
            var data = obj;
            var type = 'array';
            if (isArrayObject) {
                data = obj.data;
                if (originalLength === undefined) {
                    originalLength = data.length;
                }
                if (data.__encoded__) {
                    data = data.data;
                }
                type = obj.type.toLowerCase();
            } else if (/buffer/.test(typeHint)) {
                type = 'buffer';
            }
            var fullLength = data.length;

                if (originalLength > 0) {
                $('<i class="fa fa-caret-right debug-message-object-handle"></i> ').prependTo(header);
                var arrayRows = $('<div class="debug-message-array-rows"></div>').appendTo(element);
                element.addClass('debug-message-buffer-raw');
            }
            if (key) {
                headerHead = $('<span class="debug-message-type-meta"></span>').html(typeHint||(type+'['+originalLength+']')).appendTo(entryObj);
            } else {
                headerHead = $('<span class="debug-message-object-header"></span>').appendTo(entryObj);
                $('<span>[ </span>').appendTo(headerHead);
                var arrayLength = Math.min(originalLength,10);
                for (i=0;i<arrayLength;i++) {
                    buildMessageSummaryValue(data[i]).appendTo(headerHead);
                    if (i < arrayLength-1) {
                        $('<span>, </span>').appendTo(headerHead);
                    }
                }
                if (originalLength > arrayLength) {
                    $('<span> &hellip;</span>').appendTo(headerHead);
                }
                if (arrayLength === 0) {
                    $('<span class="debug-message-type-meta">empty</span>').appendTo(headerHead);
                }
                $('<span> ]</span>').appendTo(headerHead);
            }
            if (originalLength > 0) {

                makeExpandable(header,function() {
                    if (!key) {
                        headerHead = $('<span class="debug-message-type-meta debug-message-object-type-header"></span>').html(typeHint||(type+'['+originalLength+']')).appendTo(header);
                    }
                    if (type === 'buffer') {
                        var stringRow = $('<div class="debug-message-string-rows"></div>').appendTo(element);
                        var sr = $('<div class="debug-message-object-entry collapsed"></div>').appendTo(stringRow);
                        var stringEncoding = "";
                        try {
                            stringEncoding = String.fromCharCode.apply(null, new Uint16Array(data))
                        } catch(err) {
                            console.log(err);
                        }
                        $('<pre class="debug-message-type-string"></pre>').text(stringEncoding).appendTo(sr);
                        var bufferOpts = $('<span class="debug-message-buffer-opts"></span>').appendTo(headerHead);
                        var switchFormat = $('<a href="#"></a>').addClass('selected').html('raw').appendTo(bufferOpts).click(function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            formatBuffer(element,$(this),sourceId,path,true);
                        });
                        formatBuffer(element,switchFormat,sourceId,path,false);

                    }
                    var row;
                    if (fullLength <= 10) {
                        for (i=0;i<fullLength;i++) {
                            row = $('<div class="debug-message-object-entry collapsed"></div>').appendTo(arrayRows);
                            buildMessageElement(data[i],""+i,type==='buffer'?'hex':false,false,path+"["+i+"]",sourceId,rootPath,expandPaths).appendTo(row);
                        }
                    } else {
                        for (i=0;i<fullLength;i+=10) {
                            var minRange = i;
                            row = $('<div class="debug-message-object-entry collapsed"></div>').appendTo(arrayRows);
                            header = $('<span></span>').appendTo(row);
                            $('<i class="fa fa-caret-right debug-message-object-handle"></i> ').appendTo(header);
                            makeExpandable(header, (function() {
                                var min = minRange;
                                var max = Math.min(fullLength-1,(minRange+9));
                                var parent = row;
                                return function() {
                                    for (var i=min;i<=max;i++) {
                                        var row = $('<div class="debug-message-object-entry collapsed"></div>').appendTo(parent);
                                        buildMessageElement(data[i],""+i,type==='buffer'?'hex':false,false,path+"["+i+"]",sourceId,rootPath,expandPaths).appendTo(row);
                                    }
                                }
                            })(),checkExpanded(strippedKey,expandPaths,minRange,Math.min(fullLength-1,(minRange+9))));
                            $('<span class="debug-message-object-key"></span>').html("["+minRange+" &hellip; "+Math.min(fullLength-1,(minRange+9))+"]").appendTo(header);
                        }
                        if (fullLength < originalLength) {
                             $('<div class="debug-message-object-entry collapsed"><span class="debug-message-object-key">['+fullLength+' &hellip; '+originalLength+']</span></div>').appendTo(arrayRows);
                        }
                    }
                },checkExpanded(strippedKey,expandPaths));
            }
        } else if (typeof obj === 'object') {
            element.addClass('collapsed');
            var keys = Object.keys(obj);
            if (key || keys.length > 0) {
                $('<i class="fa fa-caret-right debug-message-object-handle"></i> ').prependTo(header);
                makeExpandable(header, function() {
                    if (!key) {
                        $('<span class="debug-message-type-meta debug-message-object-type-header"></span>').html('object').appendTo(header);
                    }
                    for (i=0;i<keys.length;i++) {
                        var row = $('<div class="debug-message-object-entry collapsed"></div>').appendTo(element);
                        var newPath = path;
                        if (/^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(keys[i])) {
                            newPath += (newPath.length > 0?".":"")+keys[i];
                        } else {
                            newPath += "[\""+keys[i].replace(/"/,"\\\"")+"\"]"
                        }
                        buildMessageElement(obj[keys[i]],keys[i],false,false,newPath,sourceId,rootPath,expandPaths).appendTo(row);
                    }
                    if (keys.length === 0) {
                        $('<div class="debug-message-object-entry debug-message-type-meta collapsed"></div>').text("empty").appendTo(element);
                    }
                },checkExpanded(strippedKey,expandPaths));
            }
            if (key) {
                $('<span class="debug-message-type-meta"></span>').html('object').appendTo(entryObj);
            } else {
                headerHead = $('<span class="debug-message-object-header"></span>').appendTo(entryObj);
                $('<span>{ </span>').appendTo(headerHead);
                var keysLength = Math.min(keys.length,5);
                for (i=0;i<keysLength;i++) {
                    $('<span class="debug-message-object-key"></span>').text(keys[i]).appendTo(headerHead);
                    $('<span>: </span>').appendTo(headerHead);
                    buildMessageSummaryValue(obj[keys[i]]).appendTo(headerHead);
                    if (i < keysLength-1) {
                        $('<span>, </span>').appendTo(headerHead);
                    }
                }
                if (keys.length > keysLength) {
                    $('<span> &hellip;</span>').appendTo(headerHead);
                }
                if (keysLength === 0) {
                    $('<span class="debug-message-type-meta">empty</span>').appendTo(headerHead);
                }
                $('<span> }</span>').appendTo(headerHead);
            }
        } else {
            $('<span class="debug-message-type-other"></span>').text(""+obj).appendTo(entryObj);
        }
        return element;
    }

    function normalisePropertyExpression(str) {
        // This must be kept in sync with validatePropertyExpression
        // in editor/js/ui/utils.js

        var length = str.length;
        if (length === 0) {
            throw new Error("Invalid property expression: zero-length");
        }
        var parts = [];
        var start = 0;
        var inString = false;
        var inBox = false;
        var quoteChar;
        var v;
        for (var i=0;i<length;i++) {
            var c = str[i];
            if (!inString) {
                if (c === "'" || c === '"') {
                    if (i != start) {
                        throw new Error("Invalid property expression: unexpected "+c+" at position "+i);
                    }
                    inString = true;
                    quoteChar = c;
                    start = i+1;
                } else if (c === '.') {
                    if (i===0) {
                        throw new Error("Invalid property expression: unexpected . at position 0");
                    }
                    if (start != i) {
                        v = str.substring(start,i);
                        if (/^\d+$/.test(v)) {
                            parts.push(parseInt(v));
                        } else {
                            parts.push(v);
                        }
                    }
                    if (i===length-1) {
                        throw new Error("Invalid property expression: unterminated expression");
                    }
                    // Next char is first char of an identifier: a-z 0-9 $ _
                    if (!/[a-z0-9\$\_]/i.test(str[i+1])) {
                        throw new Error("Invalid property expression: unexpected "+str[i+1]+" at position "+(i+1));
                    }
                    start = i+1;
                } else if (c === '[') {
                    if (i === 0) {
                        throw new Error("Invalid property expression: unexpected "+c+" at position "+i);
                    }
                    if (start != i) {
                        parts.push(str.substring(start,i));
                    }
                    if (i===length-1) {
                        throw new Error("Invalid property expression: unterminated expression");
                    }
                    // Next char is either a quote or a number
                    if (!/["'\d]/.test(str[i+1])) {
                        throw new Error("Invalid property expression: unexpected "+str[i+1]+" at position "+(i+1));
                    }
                    start = i+1;
                    inBox = true;
                } else if (c === ']') {
                    if (!inBox) {
                        throw new Error("Invalid property expression: unexpected "+c+" at position "+i);
                    }
                    if (start != i) {
                        v = str.substring(start,i);
                        if (/^\d+$/.test(v)) {
                            parts.push(parseInt(v));
                        } else {
                            throw new Error("Invalid property expression: unexpected array expression at position "+start);
                        }
                    }
                    start = i+1;
                    inBox = false;
                } else if (c === ' ') {
                    throw new Error("Invalid property expression: unexpected ' ' at position "+i);
                }
            } else {
                if (c === quoteChar) {
                    if (i-start === 0) {
                        throw new Error("Invalid property expression: zero-length string at position "+start);
                    }
                    parts.push(str.substring(start,i));
                    // If inBox, next char must be a ]. Otherwise it may be [ or .
                    if (inBox && !/\]/.test(str[i+1])) {
                        throw new Error("Invalid property expression: unexpected array expression at position "+start);
                    } else if (!inBox && i+1!==length && !/[\[\.]/.test(str[i+1])) {
                        throw new Error("Invalid property expression: unexpected "+str[i+1]+" expression at position "+(i+1));
                    }
                    start = i+1;
                    inString = false;
                }
            }

        }
        if (inBox || inString) {
            throw new Error("Invalid property expression: unterminated expression");
        }
        if (start < length) {
            parts.push(str.substring(start));
        }
        return parts;
    }

    function validatePropertyExpression(str) {
        try {
            var parts = normalisePropertyExpression(str);
            return true;
        } catch(err) {
            return false;
        }
    }

    function getMessageProperty(msg,expr) {
        var result = null;
        var msgPropParts;

        if (typeof expr === 'string') {
            if (expr.indexOf('msg.')===0) {
                expr = expr.substring(4);
            }
            msgPropParts = normalisePropertyExpression(expr);
        } else {
            msgPropParts = expr;
        }
        var m;
        msgPropParts.reduce(function(obj, key) {
            result = (typeof obj[key] !== "undefined" ? obj[key] : undefined);
            if (result === undefined && obj.hasOwnProperty('type') && obj.hasOwnProperty('data')&& obj.hasOwnProperty('length')) {
                result = (typeof obj.data[key] !== "undefined" ? obj.data[key] : undefined);
            }
            return result;
        }, msg);
        return result;
    }

    function getNodeIcon(def,node) {
        if (def.category === 'config') {
            return "icons/node-red/cog.png"
        } else if (node && node.type === 'tab') {
            return "icons/node-red/subflow.png"
        } else if (node && node.type === 'unknown') {
            return "icons/node-red/alert.png"
        }
        var icon_url;
        if (typeof def.icon === "function") {
            try {
                icon_url = def.icon.call(node);
            } catch(err) {
                console.log("Definition error: "+def.type+".icon",err);
                icon_url = "arrow-in.png";
            }
        } else {
            icon_url = def.icon;
        }
        return "icons/"+def.namespace+"/"+icon_url;
    }

    function getNodeLabel(node,defaultLabel) {
        defaultLabel = defaultLabel||"";
        var l;
        if (node.type === 'tab') {
            l = node.label || defaultLabel
        } else {
            l = node._def.label;
            try {
                l = (typeof l === "function" ? l.call(node) : l)||defaultLabel;
            } catch(err) {
                console.log("Definition error: "+node.type+".label",err);
                l = defaultLabel;
            }
        }
        return RED.text.bidi.enforceTextDirectionWithUCC(l);
    }

    return {
        createObjectElement: buildMessageElement,
        getMessageProperty: getMessageProperty,
        normalisePropertyExpression: normalisePropertyExpression,
        validatePropertyExpression: validatePropertyExpression,
        getNodeIcon: getNodeIcon,
        getNodeLabel: getNodeLabel,
    }
})();
;/**
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
(function($) {

/**
 * options:
 *   - addButton : boolean|string - text for add label, default 'add'
 *   - height : number|'auto'
 *   - resize : function - called when list as a whole is resized
 *   - resizeItem : function(item) - called to resize individual item
 *   - sortable : boolean|string - string is the css selector for handle
 *   - sortItems : function(items) - when order of items changes
 *   - connectWith : css selector of other sortables
 *   - removable : boolean - whether to display delete button on items
 *   - addItem : function(row,index,itemData) - when an item is added
 *   - removeItem : function(itemData) - called when an item is removed
 *   - filter : function(itemData) - called for each item to determine if it should be shown
 *   - sort : function(itemDataA,itemDataB) - called to sort items
 *   - scrollOnAdd : boolean - whether to scroll to newly added items
 * methods:
 *   - addItem(itemData)
 *   - removeItem(itemData)
 *   - width(width)
 *   - height(height)
 *   - items()
 *   - empty()
 *   - filter(filter)
 *   - sort(sort)
 *   - length()
 */
    $.widget( "nodered.editableList", {
        _create: function() {
            var that = this;

            this.element.addClass('red-ui-editableList-list');
            this.uiWidth = this.element.width();
            this.uiContainer = this.element
                .wrap( "<div>" )
                .parent();

            if (this.options.header) {
                this.options.header.addClass("red-ui-editableList-header");
                this.borderContainer = this.uiContainer.wrap("<div>").parent();
                this.borderContainer.prepend(this.options.header);
                this.topContainer = this.borderContainer.wrap("<div>").parent();
            } else {
                this.topContainer = this.uiContainer.wrap("<div>").parent();
            }
            this.topContainer.addClass('red-ui-editableList');
            if (this.options.class) {
                this.topContainer.addClass(this.options.class);
            }

            if (this.options.addButton !== false) {
                var addLabel;
                if (typeof this.options.addButton === 'string') {
                    addLabel = this.options.addButton
                } else {
                    if (RED && RED._) {
                        addLabel = RED._("editableList.add");
                    } else {
                        addLabel = 'add';
                    }
                }
                $('<a href="#" class="editor-button editor-button-small" style="margin-top: 4px;"><i class="fa fa-plus"></i> '+addLabel+'</a>')
                    .appendTo(this.topContainer)
                    .click(function(evt) {
                        evt.preventDefault();
                        that.addItem({});
                    });
            }
            if (this.element.css("position") === "absolute") {
                ["top","left","bottom","right"].forEach(function(s) {
                    var v = that.element.css(s);
                    if (s!=="auto" && s!=="") {
                        that.topContainer.css(s,v);
                        that.uiContainer.css(s,"0");
                        that.element.css(s,'auto');
                    }
                })
                this.element.css("position","static");
                this.topContainer.css("position","absolute");
                this.uiContainer.css("position","absolute");

            }
            if (this.options.header) {
                this.borderContainer.addClass("red-ui-editableList-border");
            } else {
                this.uiContainer.addClass("red-ui-editableList-border");
            }
            this.uiContainer.addClass("red-ui-editableList-container");

            this.uiHeight = this.element.height();

            this.activeFilter = this.options.filter||null;
            this.activeSort = this.options.sort||null;
            this.scrollOnAdd = this.options.scrollOnAdd;
            if (this.scrollOnAdd === undefined) {
                this.scrollOnAdd = true;
            }
            var minHeight = this.element.css("minHeight");
            if (minHeight !== '0px') {
                this.uiContainer.css("minHeight",minHeight);
                this.element.css("minHeight",0);
            }
            if (this.options.height !== 'auto') {
                this.uiContainer.css("overflow-y","scroll");
                if (!isNaN(this.options.height)) {
                    this.uiHeight = this.options.height;
                }
            }
            this.element.height('auto');

            var attrStyle = this.element.attr('style');
            var m;
            if ((m = /width\s*:\s*(\d+%)/i.exec(attrStyle)) !== null) {
                this.element.width('100%');
                this.uiContainer.width(m[1]);
            }
            if (this.options.sortable) {
                var handle = (typeof this.options.sortable === 'string')?
                                this.options.sortable :
                                ".red-ui-editableList-item-handle";
                var sortOptions = {
                    axis: "y",
                    update: function( event, ui ) {
                        if (that.options.sortItems) {
                            that.options.sortItems(that.items());
                        }
                    },
                    handle:handle,
                    cursor: "move",
                    tolerance: "pointer",
                    forcePlaceholderSize:true,
                    placeholder: "red-ui-editabelList-item-placeholder",
                    start: function(e, ui){
                        ui.placeholder.height(ui.item.height()-4);
                    }
                };
                if (this.options.connectWith) {
                    sortOptions.connectWith = this.options.connectWith;
                }

                this.element.sortable(sortOptions);
            }

            this._resize();

            // this.menu = this._createMenu(this.types, function(v) { that.type(v) });
            // this.type(this.options.default||this.types[0].value);
        },
        _resize: function() {
            var currentFullHeight = this.topContainer.height();
            var innerHeight = this.uiContainer.height();
            var delta = currentFullHeight - innerHeight;
            if (this.uiHeight !== 0) {
                this.uiContainer.height(this.uiHeight-delta);
            }
            if (this.options.resize) {
                this.options.resize();
            }
            if (this.options.resizeItem) {
                var that = this;
                this.element.children().each(function(i) {
                    that.options.resizeItem($(this).find(".red-ui-editableList-item-content"),i);
                });
            }
        },
        _destroy: function() {
        },
        _refreshFilter: function() {
            var that = this;
            var count = 0;
            if (!this.activeFilter) {
                return this.element.children().show();
            }
            var items = this.items();
            items.each(function (i,el) {
                var data = el.data('data');
                try {
                    if (that.activeFilter(data)) {
                        el.parent().show();
                        count++;
                    } else {
                        el.parent().hide();
                    }
                } catch(err) {
                    console.log(err);
                    el.parent().show();
                    count++;
                }
            });
            return count;
        },
        _refreshSort: function() {
            if (this.activeSort) {
                var items = this.element.children();
                var that = this;
                items.sort(function(A,B) {
                    return that.activeSort($(A).find(".red-ui-editableList-item-content").data('data'),$(B).find(".red-ui-editableList-item-content").data('data'));
                });
                $.each(items,function(idx,li) {
                    that.element.append(li);
                })
            }
        },
        width: function(desiredWidth) {
            this.uiWidth = desiredWidth;
            this._resize();
        },
        height: function(desiredHeight) {
            this.uiHeight = desiredHeight;
            this._resize();
        },
        addItem: function(data) {
            var that = this;
            data = data || {};
            var li = $('<li>');
            var added = false;
            if (this.activeSort) {
                var items = this.items();
                var skip = false;
                items.each(function(i,el) {
                    if (added) { return }
                    var itemData = el.data('data');
                    if (that.activeSort(data,itemData) < 0) {
                         li.insertBefore(el.closest("li"));
                         added = true;
                    }
                });
            }
            if (!added) {
                li.appendTo(this.element);
            }
            var row = $('<div/>').addClass("red-ui-editableList-item-content").appendTo(li);
            row.data('data',data);
            if (this.options.sortable === true) {
                $('<i class="red-ui-editableList-item-handle fa fa-bars"></i>').appendTo(li);
                li.addClass("red-ui-editableList-item-sortable");
            }
            if (this.options.removable) {
                var deleteButton = $('<a/>',{href:"#",class:"red-ui-editableList-item-remove editor-button editor-button-small"}).appendTo(li);
                $('<i/>',{class:"fa fa-remove"}).appendTo(deleteButton);
                li.addClass("red-ui-editableList-item-removable");
                deleteButton.click(function(evt) {
                    evt.preventDefault();
                    var data = row.data('data');
                    li.addClass("red-ui-editableList-item-deleting")
                    li.fadeOut(300, function() {
                        $(this).remove();
                        if (that.options.removeItem) {
                            that.options.removeItem(data);
                        }
                    });
                });
            }
            if (this.options.addItem) {
                var index = that.element.children().length-1;
                setTimeout(function() {
                    that.options.addItem(row,index,data);
                    if (that.activeFilter) {
                        try {
                            if (!that.activeFilter(data)) {
                                li.hide();
                            }
                        } catch(err) {
                        }
                    }

                    if (!that.activeSort && that.scrollOnAdd) {
                        setTimeout(function() {
                            that.uiContainer.scrollTop(that.element.height());
                        },0);
                    }
                },0);
            }
        },
        addItems: function(items) {
            for (var i=0; i<items.length;i++) {
                this.addItem(items[i]);
            }
        },
        removeItem: function(data) {
            var items = this.element.children().filter(function(f) {
                return data === $(this).find(".red-ui-editableList-item-content").data('data');
            });
            items.remove();
            if (this.options.removeItem) {
                this.options.removeItem(data);
            }
        },
        items: function() {
            return this.element.children().map(function(i) { return $(this).find(".red-ui-editableList-item-content"); });
        },
        empty: function() {
            this.element.empty();
        },
        filter: function(filter) {
            if (filter !== undefined) {
                this.activeFilter = filter;
            }
            return this._refreshFilter();
        },
        sort: function(sort) {
            if (sort !== undefined) {
                this.activeSort = sort;
            }
            return this._refreshSort();
        },
        length: function() {
            return this.element.children().length;
        }
    });
})(jQuery);
;/**
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
(function($) {
    $.widget( "nodered.checkboxSet", {
        _create: function() {
            var that = this;
            this.uiElement = this.element.wrap( "<span>" ).parent();
            this.uiElement.addClass("red-ui-checkboxSet");
            if (this.options.parent) {
                this.parent = this.options.parent;
                this.parent.checkboxSet('addChild',this.element);
            }
            this.children = [];
            this.partialFlag = false;
            this.stateValue = 0;
            var initialState = this.element.prop('checked');
            this.options = [
                $('<span class="red-ui-checkboxSet-option hide"><i class="fa fa-square-o"></i></span>').appendTo(this.uiElement),
                $('<span class="red-ui-checkboxSet-option hide"><i class="fa fa-check-square-o"></i></span>').appendTo(this.uiElement),
                $('<span class="red-ui-checkboxSet-option hide"><i class="fa fa-minus-square-o"></i></span>').appendTo(this.uiElement)
            ];
            if (initialState) {
                this.options[1].show();
            } else {
                this.options[0].show();
            }

            this.element.change(function() {
                if (this.checked) {
                    that.options[0].hide();
                    that.options[1].show();
                    that.options[2].hide();
                } else {
                    that.options[1].hide();
                    that.options[0].show();
                    that.options[2].hide();
                }
                var isChecked = this.checked;
                that.children.forEach(function(child) {
                    child.checkboxSet('state',isChecked,false,true);
                })
            })
            this.uiElement.click(function(e) {
                e.stopPropagation();
                // state returns null for a partial state. Clicking on that should
                // result in false.
                that.state((that.state()===false)?true:false);
            })
            if (this.parent) {
                this.parent.checkboxSet('updateChild',this);
            }
        },
        _destroy: function() {
            if (this.parent) {
                this.parent.checkboxSet('removeChild',this.element);
            }
        },
        addChild: function(child) {
            var that = this;
            this.children.push(child);
        },
        removeChild: function(child) {
            var index = this.children.indexOf(child);
            if (index > -1) {
                this.children.splice(index,1);
            }
        },
        updateChild: function(child) {
            var checkedCount = 0;
            this.children.forEach(function(c,i) {
                if (c.checkboxSet('state') === true) {
                    checkedCount++;
                }
            });
            if (checkedCount === 0) {

                this.state(false,true);
            } else if (checkedCount === this.children.length) {
                this.state(true,true);
            } else {
                this.state(null,true);
            }
        },
        disable: function() {
            this.uiElement.addClass('disabled');
        },
        state: function(state,suppressEvent,suppressParentUpdate) {

            if (arguments.length === 0) {
                return this.partialFlag?null:this.element.is(":checked");
            } else {
                this.partialFlag = (state === null);
                var trueState = this.partialFlag||state;
                this.element.prop('checked',trueState);
                if (state === true) {
                    this.options[0].hide();
                    this.options[1].show();
                    this.options[2].hide();
                } else if (state === false) {
                    this.options[2].hide();
                    this.options[1].hide();
                    this.options[0].show();
                } else if (state === null) {
                    this.options[0].hide();
                    this.options[1].hide();
                    this.options[2].show();
                }
                if (!suppressEvent) {
                    this.element.trigger('change',null);
                }
                if (!suppressParentUpdate && this.parent) {
                    this.parent.checkboxSet('updateChild',this);
                }
            }
        }
    })

})(jQuery);
;/**
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
RED.menu = (function() {

    var menuItems = {};

    function createMenuItem(opt) {
        var item;

        if (opt !== null && opt.id) {
            var themeSetting = RED.settings.theme("menu."+opt.id);
            if (themeSetting === false) {
                return null;
            }
        }

        function setInitialState() {
            var savedStateActive = RED.settings.get("menu-" + opt.id);
            if (opt.setting) {
                // May need to migrate pre-0.17 setting

                if (savedStateActive !== null) {
                    RED.settings.set(opt.setting,savedStateActive);
                    RED.settings.remove("menu-" + opt.id);
                } else {
                    savedStateActive = RED.settings.get(opt.setting);
                }
            }
            if (savedStateActive) {
                link.addClass("active");
                triggerAction(opt.id,true);
            } else if (savedStateActive === false) {
                link.removeClass("active");
                triggerAction(opt.id,false);
            } else if (opt.hasOwnProperty("selected")) {
                if (opt.selected) {
                    link.addClass("active");
                } else {
                    link.removeClass("active");
                }
                triggerAction(opt.id,opt.selected);
            }
        }

        if (opt === null) {
            item = $('<li class="divider"></li>');
        } else {
            item = $('<li></li>');

            if (opt.group) {
                item.addClass("menu-group-"+opt.group);

            }
            var linkContent = '<a '+(opt.id?'id="'+opt.id+'" ':'')+'tabindex="-1" href="#">';
            if (opt.toggle) {
                linkContent += '<i class="fa fa-square pull-left"></i>';
                linkContent += '<i class="fa fa-check-square pull-left"></i>';

            }
            if (opt.icon !== undefined) {
                if (/\.png/.test(opt.icon)) {
                    linkContent += '<img src="'+opt.icon+'"/> ';
                } else {
                    linkContent += '<i class="'+(opt.icon?opt.icon:'" style="display: inline-block;"')+'"></i> ';
                }
            }

            if (opt.sublabel) {
                linkContent += '<span class="menu-label-container"><span class="menu-label">'+opt.label+'</span>'+
                               '<span class="menu-sublabel">'+opt.sublabel+'</span></span>'
            } else {
                linkContent += '<span class="menu-label">'+opt.label+'</span>'
            }

            linkContent += '</a>';

            var link = $(linkContent).appendTo(item);

            menuItems[opt.id] = opt;

            if (opt.onselect) {
                link.click(function(e) {
                    e.preventDefault();
                    if ($(this).parent().hasClass("disabled")) {
                        return;
                    }
                    if (opt.toggle) {
                        var selected = isSelected(opt.id);
                        if (typeof opt.toggle === "string") {
                            if (!selected) {
                                for (var m in menuItems) {
                                    if (menuItems.hasOwnProperty(m)) {
                                        var mi = menuItems[m];
                                        if (mi.id != opt.id && opt.toggle == mi.toggle) {
                                            setSelected(mi.id,false);
                                        }
                                    }
                                }
                                setSelected(opt.id,true);
                            }
                        } else {
                            setSelected(opt.id, !selected);
                        }
                    } else {
                        triggerAction(opt.id);
                    }
                });
                if (opt.toggle) {
                    setInitialState();
                }
            } else if (opt.href) {
                link.attr("target","_blank").attr("href",opt.href);
            } else if (!opt.options) {
                item.addClass("disabled");
                link.click(function(event) {
                    event.preventDefault();
                });
            }
            if (opt.options) {
                item.addClass("dropdown-submenu pull-left");
                var submenu = $('<ul id="'+opt.id+'-submenu" class="dropdown-menu"></ul>').appendTo(item);

                for (var i=0;i<opt.options.length;i++) {
                    var li = createMenuItem(opt.options[i]);
                    if (li) {
                        li.appendTo(submenu);
                    }
                }
            }
            if (opt.disabled) {
                item.addClass("disabled");
            }
        }


        return item;

    }
    function createMenu(options) {

        var menuParent = $("#"+options.id);

        var topMenu = $("<ul/>",{id:options.id+"-submenu", class:"dropdown-menu pull-right"});

        if (menuParent.length === 1) {
            topMenu.insertAfter(menuParent);
        }

        var lastAddedSeparator = false;
        for (var i=0;i<options.options.length;i++) {
            var opt = options.options[i];
            if (opt !== null || !lastAddedSeparator) {
                var li = createMenuItem(opt);
                if (li) {
                    li.appendTo(topMenu);
                    lastAddedSeparator = (opt === null);
                }
            }
        }

        return topMenu;
    }

    function triggerAction(id, args) {
        var opt = menuItems[id];
        var callback = opt.onselect;
        if (typeof opt.onselect === 'string') {
            callback = RED.actions.get(opt.onselect);
        }
        if (callback) {
            callback.call(opt,args);
        } else {
            console.log("No callback for",id,opt.onselect);
        }
    }

    function isSelected(id) {
        return $("#" + id).hasClass("active");
    }

    function setSelected(id,state) {
        if (isSelected(id) == state) {
            return;
        }
        var opt = menuItems[id];
        if (state) {
            $("#"+id).addClass("active");
        } else {
            $("#"+id).removeClass("active");
        }
        if (opt && opt.onselect) {
            triggerAction(opt.id,state);
        }
        RED.settings.set(opt.setting||("menu-"+opt.id), state);
    }

    function toggleSelected(id) {
        setSelected(id,!isSelected(id));
    }

    function setDisabled(id,state) {
        if (state) {
            $("#"+id).parent().addClass("disabled");
        } else {
            $("#"+id).parent().removeClass("disabled");
        }
    }

    function addItem(id,opt) {
        var item = createMenuItem(opt);
        if (opt.group) {
            var groupItems = $("#"+id+"-submenu").children(".menu-group-"+opt.group);
            if (groupItems.length === 0) {
                item.appendTo("#"+id+"-submenu");
            } else {
                for (var i=0;i<groupItems.length;i++) {
                    var groupItem = groupItems[i];
                    var label = $(groupItem).find(".menu-label").html();
                    if (opt.label < label) {
                        $(groupItem).before(item);
                        break;
                    }
                }
                if (i === groupItems.length) {
                    item.appendTo("#"+id+"-submenu");
                }
            }
        } else {
            item.appendTo("#"+id+"-submenu");
        }
    }
    function removeItem(id) {
        $("#"+id).parent().remove();
    }

    function setAction(id,action) {
        var opt = menuItems[id];
        if (opt) {
            opt.onselect = action;
        }
    }

    return {
        init: createMenu,
        setSelected: setSelected,
        isSelected: isSelected,
        toggleSelected: toggleSelected,
        setDisabled: setDisabled,
        addItem: addItem,
        removeItem: removeItem,
        setAction: setAction
        //TODO: add an api for replacing a submenu - see library.js:loadFlowLibrary
    }
})();
;/**
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


RED.panels = (function() {

    function createPanel(options) {
        var container = options.container || $("#"+options.id);
        var children = container.children();
        if (children.length !== 2) {
            throw new Error("Container must have exactly two children");
        }

        container.addClass("red-ui-panels");
        var separator = $('<div class="red-ui-panels-separator"></div>').insertAfter(children[0]);
        var startPosition;
        var panelHeights = [];
        var modifiedHeights = false;
        var panelRatio;

        separator.draggable({
                axis: "y",
                containment: container,
                scroll: false,
                start:function(event,ui) {
                    var height = container.height();
                    startPosition = ui.position.top;
                    panelHeights = [$(children[0]).height(),$(children[1]).height()];
                    console.log("START",height,panelHeights,panelHeights[0]+panelHeights[1],height-(panelHeights[0]+panelHeights[1]));
                },
                drag: function(event,ui) {
                    var height = container.height();
                    var delta = ui.position.top-startPosition;
                    var newHeights = [panelHeights[0]+delta,panelHeights[1]-delta];
                    $(children[0]).height(newHeights[0]);
                    $(children[1]).height(newHeights[1]);
                    if (options.resize) {
                        options.resize(newHeights[0],newHeights[1]);
                    }
                    ui.position.top -= delta;
                    panelRatio = newHeights[0]/height;
                },
                stop:function(event,ui) {
                    modifiedHeights = true;
                }
        });

        return {
            resize: function(height) {
                var panelHeights = [$(children[0]).height(),$(children[1]).height()];
                container.height(height);
                if (modifiedHeights) {
                    var topPanelHeight = panelRatio*height;
                    var bottomPanelHeight = height - topPanelHeight - 48;
                    panelHeights = [topPanelHeight,bottomPanelHeight];
                    $(children[0]).height(panelHeights[0]);
                    $(children[1]).height(panelHeights[1]);
                    console.log("SET",height,panelHeights,panelHeights[0]+panelHeights[1],height-(panelHeights[0]+panelHeights[1]));
                }
                if (options.resize) {
                    options.resize(panelHeights[0],panelHeights[1]);
                }
            }
        }
    }

    return {
        create: createPanel
    }
})();
;/**
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
            leftLeft: 25
        },
        "small": {
            top: 5,
            leftRight: 8,
            leftLeft: 16
        }
    }
    function createPopover(options) {
        var target = options.target;
        var direction = options.direction || "right";
        var trigger = options.trigger;
        var content = options.content;
        var delay = options.delay;
        var width = options.width||"auto";
        var size = options.size||"default";
        var offsetX = options.offsetX||0;
        var offsetY = options.offsetY||0;
        if (!deltaSizes[size]) {
            throw new Error("Invalid RED.popover size value:",size);
        }

        var timer = null;
        var active;
        var div;

        var openPopup = function() {
            if (active) {
                div = $('<div class="red-ui-popover red-ui-popover-'+direction+'"></div>').appendTo("body");
                if (size !== "default") {
                    div.addClass("red-ui-popover-size-"+size);
                }
                if (typeof content === 'function') {
                    content.call(res).appendTo(div);
                } else {
                    div.html(content);
                }
                if (width !== "auto") {
                    div.width(width);
                }


                var targetPos = target.offset();
                targetPos.top += offsetY;
                targetPos.left += offsetX;
                var targetWidth = target.width();
                var targetHeight = target.height();

                var divHeight = div.height();
                var divWidth = div.width();
                if (direction === 'right') {
                    div.css({top: targetPos.top+targetHeight/2-divHeight/2-deltaSizes[size].top,left:targetPos.left+targetWidth+deltaSizes[size].leftRight});
                } else if (direction === 'left') {
                    div.css({top: targetPos.top+targetHeight/2-divHeight/2-deltaSizes[size].top,left:targetPos.left-deltaSizes[size].leftLeft-divWidth});
                }

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
        }
        var res = {
            setContent: function(_content) {
                content = _content;
            },
            open: function () {
                active = true;
                openPopup();
            },
            close: function () {
                active = false;
                closePopup();
            }
        }
        return res;

    }

    return {
        create: createPopover
    }

})();
;/**
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
(function($) {

    $.widget( "nodered.searchBox", {
        _create: function() {
            var that = this;

            this.currentTimeout = null;
            this.lastSent = "";
            this.element.val("");
            this.uiContainer = this.element.wrap("<div>").parent();
            this.uiContainer.addClass("red-ui-searchBox-container");

            $('<i class="fa fa-search"></i>').prependTo(this.uiContainer);
            this.clearButton = $('<a href="#"><i class="fa fa-times"></i></a>').appendTo(this.uiContainer);
            this.clearButton.on("click",function(e) {
                e.preventDefault();
                that.element.val("");
                that._change("",true);
                that.element.focus();
            });

            this.resultCount = $('<span>',{class:"red-ui-searchBox-resultCount hide"}).appendTo(this.uiContainer);

            this.element.val("");
            this.element.on("keydown",function(evt) {
                if (evt.keyCode === 27) {
                    that.element.val("");
                }
            })
            this.element.on("keyup",function(evt) {
                that._change($(this).val());
            });

            this.element.on("focus",function() {
                $("body").one("mousedown",function() {
                    that.element.blur();
                });
            });

        },
        _change: function(val,instant) {
            var fireEvent = false;
            if (val === "") {
                this.clearButton.hide();
                fireEvent = true;
            } else {
                this.clearButton.show();
                fireEvent = (val.length >= (this.options.minimumLength||0));
            }
            var current = this.element.val();
            fireEvent = fireEvent && current !== this.lastSent;
            if (fireEvent) {
                if (!instant && this.options.delay > 0) {
                    clearTimeout(this.currentTimeout);
                    var that = this;
                    this.currentTimeout = setTimeout(function() {
                        that.lastSent = that.element.val();
                        that._trigger("change");
                    },this.options.delay);
                } else {
                    this._trigger("change");
                }
            }
        },
        value: function(val) {
            if (val === undefined) {
                return this.element.val();
            } else {
                this.element.val(val);
                this._change(val);
            }
        },
        count: function(val) {
            if (val === undefined || val === null || val === "") {
                this.resultCount.text("").hide();
            } else {
                this.resultCount.text(val).show();
            }
        },
        change: function() {
            this._trigger("change");
        }
    });
})(jQuery);
;/**
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



RED.tabs = (function() {
    function createTabs(options) {
        var tabs = {};
        var currentTabWidth;
        var currentActiveTabWidth = 0;

        var ul = options.element || $("#"+options.id);
        var wrapper = ul.wrap( "<div>" ).parent();
        var scrollContainer = ul.wrap( "<div>" ).parent();
        wrapper.addClass("red-ui-tabs");
        if (options.vertical) {
            wrapper.addClass("red-ui-tabs-vertical");
        }
        if (options.addButton && typeof options.addButton === 'function') {
            wrapper.addClass("red-ui-tabs-add");
            var addButton = $('<div class="red-ui-tab-button"><a href="#"><i class="fa fa-plus"></i></a></div>').appendTo(wrapper);
            addButton.find('a').click(function(evt) {
                evt.preventDefault();
                options.addButton();
            })

        }
        var scrollLeft;
        var scrollRight;

        if (options.scrollable) {
            wrapper.addClass("red-ui-tabs-scrollable");
            scrollContainer.addClass("red-ui-tabs-scroll-container");
            scrollContainer.scroll(updateScroll);
            scrollLeft = $('<div class="red-ui-tab-button red-ui-tab-scroll red-ui-tab-scroll-left"><a href="#" style="display:none;"><i class="fa fa-caret-left"></i></a></div>').appendTo(wrapper).find("a");
            scrollLeft.on('mousedown',function(evt) { scrollEventHandler(evt,'-=150') }).on('click',function(evt){ evt.preventDefault();});
            scrollRight = $('<div class="red-ui-tab-button red-ui-tab-scroll red-ui-tab-scroll-right"><a href="#" style="display:none;"><i class="fa fa-caret-right"></i></a></div>').appendTo(wrapper).find("a");
            scrollRight.on('mousedown',function(evt) { scrollEventHandler(evt,'+=150') }).on('click',function(evt){ evt.preventDefault();});
        }
        function scrollEventHandler(evt,dir) {
            evt.preventDefault();
            if ($(this).hasClass('disabled')) {
                return;
            }
            var currentScrollLeft = scrollContainer.scrollLeft();
            scrollContainer.animate( { scrollLeft: dir }, 100);
            var interval = setInterval(function() {
                var newScrollLeft = scrollContainer.scrollLeft()
                if (newScrollLeft === currentScrollLeft) {
                    clearInterval(interval);
                    return;
                }
                currentScrollLeft = newScrollLeft;
                scrollContainer.animate( { scrollLeft: dir }, 100);
            },100);
            $(this).one('mouseup',function() {
                clearInterval(interval);
            })
        }


        ul.children().first().addClass("active");
        ul.children().addClass("red-ui-tab");

        function onTabClick() {
            if (options.onclick) {
                options.onclick(tabs[$(this).attr('href').slice(1)]);
            }
            activateTab($(this));
            return false;
        }

        function updateScroll() {
            if (ul.children().length !== 0) {
                var sl = scrollContainer.scrollLeft();
                var scWidth = scrollContainer.width();
                var ulWidth = ul.width();
                if (sl === 0) {
                    scrollLeft.hide();
                } else {
                    scrollLeft.show();
                }
                if (sl === ulWidth-scWidth) {
                    scrollRight.hide();
                } else {
                    scrollRight.show();
                }
            }
        }
        function onTabDblClick() {
            if (options.ondblclick) {
                options.ondblclick(tabs[$(this).attr('href').slice(1)]);
            }
            return false;
        }

        function activateTab(link) {
            if (typeof link === "string") {
                link = ul.find("a[href='#"+link+"']");
            }
            if (link.length === 0) {
                return;
            }
            if (!link.parent().hasClass("active")) {
                ul.children().removeClass("active");
                ul.children().css({"transition": "width 100ms"});
                link.parent().addClass("active");
                if (options.scrollable) {
                    var pos = link.parent().position().left;
                    if (pos-21 < 0) {
                        scrollContainer.animate( { scrollLeft: '+='+(pos-50) }, 300);
                    } else if (pos + 120 > scrollContainer.width()) {
                        scrollContainer.animate( { scrollLeft: '+='+(pos + 140-scrollContainer.width()) }, 300);
                    }
                }
                if (options.onchange) {
                    options.onchange(tabs[link.attr('href').slice(1)]);
                }
                updateTabWidths();
                setTimeout(function() {
                    ul.children().css({"transition": ""});
                },100);
            }
        }
        function activatePreviousTab() {
            var previous = ul.find("li.active").prev();
            if (previous.length > 0) {
                activateTab(previous.find("a"));
            }
        }
        function activateNextTab() {
            var next = ul.find("li.active").next();
            if (next.length > 0) {
                activateTab(next.find("a"));
            }
        }

        function updateTabWidths() {
            if (options.vertical) {
                return;
            }
            var tabs = ul.find("li.red-ui-tab");
            var width = wrapper.width();
            var tabCount = tabs.size();
            var tabWidth = (width-12-(tabCount*6))/tabCount;
            currentTabWidth = (100*tabWidth/width)+"%";
            currentActiveTabWidth = currentTabWidth+"%";
            if (options.scrollable) {
                tabWidth = Math.max(tabWidth,140);
                currentTabWidth = tabWidth+"px";
                currentActiveTabWidth = 0;
                var listWidth = Math.max(wrapper.width(),12+(tabWidth+6)*tabCount);
                ul.width(listWidth);
                updateScroll();
            } else if (options.hasOwnProperty("minimumActiveTabWidth")) {
                if (tabWidth < options.minimumActiveTabWidth) {
                    tabCount -= 1;
                    tabWidth = (width-12-options.minimumActiveTabWidth-(tabCount*6))/tabCount;
                    currentTabWidth = (100*tabWidth/width)+"%";
                    currentActiveTabWidth = options.minimumActiveTabWidth+"px";
                } else {
                    currentActiveTabWidth = 0;
                }
            }
            tabs.css({width:currentTabWidth});
            if (tabWidth < 50) {
                ul.find(".red-ui-tab-close").hide();
                ul.find(".red-ui-tab-icon").hide();
                ul.find(".red-ui-tab-label").css({paddingLeft:Math.min(12,Math.max(0,tabWidth-38))+"px"})
            } else {
                ul.find(".red-ui-tab-close").show();
                ul.find(".red-ui-tab-icon").show();
                ul.find(".red-ui-tab-label").css({paddingLeft:""})
            }
            if (currentActiveTabWidth !== 0) {
                ul.find("li.red-ui-tab.active").css({"width":options.minimumActiveTabWidth});
                ul.find("li.red-ui-tab.active .red-ui-tab-close").show();
                ul.find("li.red-ui-tab.active .red-ui-tab-icon").show();
                ul.find("li.red-ui-tab.active .red-ui-tab-label").css({paddingLeft:""})
            }

        }

        ul.find("li.red-ui-tab a").on("click",onTabClick).on("dblclick",onTabDblClick);
        setTimeout(function() {
            updateTabWidths();
        },0);


        function removeTab(id) {
            var li = ul.find("a[href='#"+id+"']").parent();
            if (li.hasClass("active")) {
                var tab = li.prev();
                if (tab.size() === 0) {
                    tab = li.next();
                }
                activateTab(tab.find("a"));
            }
            li.remove();
            if (options.onremove) {
                options.onremove(tabs[id]);
            }
            delete tabs[id];
            updateTabWidths();
        }

        return {
            addTab: function(tab) {
                tabs[tab.id] = tab;
                var li = $("<li/>",{class:"red-ui-tab"}).appendTo(ul);
                li.attr('id',"red-ui-tab-"+(tab.id.replace(".","-")));
                li.data("tabId",tab.id);
                var link = $("<a/>",{href:"#"+tab.id, class:"red-ui-tab-label"}).appendTo(li);
                if (tab.icon) {
                    $('<img src="'+tab.icon+'" class="red-ui-tab-icon"/>').appendTo(link);
                }
                var span = $('<span/>',{class:"bidiAware"}).text(tab.label).appendTo(link);
                span.attr('dir', RED.text.bidi.resolveBaseTextDir(tab.label));

                link.on("click",onTabClick);
                link.on("dblclick",onTabDblClick);
                if (tab.closeable) {
                    var closeLink = $("<a/>",{href:"#",class:"red-ui-tab-close"}).appendTo(li);
                    closeLink.append('<i class="fa fa-times" />');

                    closeLink.on("click",function(event) {
                        event.preventDefault();
                        removeTab(tab.id);
                    });
                }
                updateTabWidths();
                if (options.onadd) {
                    options.onadd(tab);
                }
                link.attr("title",tab.label);
                if (ul.find("li.red-ui-tab").size() == 1) {
                    activateTab(link);
                }
                if (options.onreorder) {
                    var originalTabOrder;
                    var tabDragIndex;
                    var tabElements = [];
                    var startDragIndex;

                    li.draggable({
                        axis:"x",
                        distance: 20,
                        start: function(event,ui) {
                            originalTabOrder = [];
                            tabElements = [];
                            ul.children().each(function(i) {
                                tabElements[i] = {
                                    el:$(this),
                                    text: $(this).text(),
                                    left: $(this).position().left,
                                    width: $(this).width()
                                };
                                if ($(this).is(li)) {
                                    tabDragIndex = i;
                                    startDragIndex = i;
                                }
                                originalTabOrder.push($(this).data("tabId"));
                            });
                            ul.children().each(function(i) {
                                if (i!==tabDragIndex) {
                                    $(this).css({
                                        position: 'absolute',
                                        left: tabElements[i].left+"px",
                                        width: tabElements[i].width+2,
                                        transition: "left 0.3s"
                                    });
                                }

                            })
                            if (!li.hasClass('active')) {
                                li.css({'zIndex':1});
                            }
                        },
                        drag: function(event,ui) {
                            ui.position.left += tabElements[tabDragIndex].left+scrollContainer.scrollLeft();
                            var tabCenter = ui.position.left + tabElements[tabDragIndex].width/2 - scrollContainer.scrollLeft();
                            for (var i=0;i<tabElements.length;i++) {
                                if (i === tabDragIndex) {
                                    continue;
                                }
                                if (tabCenter > tabElements[i].left && tabCenter < tabElements[i].left+tabElements[i].width) {
                                    if (i < tabDragIndex) {
                                        tabElements[i].left += tabElements[tabDragIndex].width+8;
                                        tabElements[tabDragIndex].el.detach().insertBefore(tabElements[i].el);
                                    } else {
                                        tabElements[i].left -= tabElements[tabDragIndex].width+8;
                                        tabElements[tabDragIndex].el.detach().insertAfter(tabElements[i].el);
                                    }
                                    tabElements[i].el.css({left:tabElements[i].left+"px"});

                                    tabElements.splice(i, 0, tabElements.splice(tabDragIndex, 1)[0]);

                                    tabDragIndex = i;
                                    break;
                                }
                            }
                        },
                        stop: function(event,ui) {
                            ul.children().css({position:"relative",left:"",transition:""});
                            if (!li.hasClass('active')) {
                                li.css({zIndex:""});
                            }
                            updateTabWidths();
                            if (startDragIndex !== tabDragIndex) {
                                options.onreorder(originalTabOrder, $.makeArray(ul.children().map(function() { return $(this).data('tabId');})));
                            }
                            activateTab(tabElements[tabDragIndex].el.data('tabId'));
                        }
                    })
                }
            },
            removeTab: removeTab,
            activateTab: activateTab,
            nextTab: activateNextTab,
            previousTab: activatePreviousTab,
            resize: updateTabWidths,
            count: function() {
                return ul.find("li.red-ui-tab").size();
            },
            contains: function(id) {
                return ul.find("a[href='#"+id+"']").length > 0;
            },
            renameTab: function(id,label) {
                tabs[id].label = label;
                var tab = ul.find("a[href='#"+id+"']");
                tab.attr("title",label);
                tab.find("span.bidiAware").text(label).attr('dir', RED.text.bidi.resolveBaseTextDir(label));
                updateTabWidths();
            },
            order: function(order) {
                var existingTabOrder = $.makeArray(ul.children().map(function() { return $(this).data('tabId');}));
                if (existingTabOrder.length !== order.length) {
                    return
                }
                var i;
                var match = true;
                for (i=0;i<order.length;i++) {
                    if (order[i] !== existingTabOrder[i]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    return;
                }
                var existingTabMap = {};
                var existingTabs = ul.children().detach().each(function() {
                    existingTabMap[$(this).data("tabId")] = $(this);
                });
                for (i=0;i<order.length;i++) {
                    existingTabMap[order[i]].appendTo(ul);
                }
            }

        }
    }

    return {
        create: createTabs
    }
})();
;/**
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

RED.stack = (function() {
    function createStack(options) {
        var container = options.container;

        var entries = [];

        var visible = true;

        return {
            add: function(entry) {
                entries.push(entry);
                entry.container = $('<div class="palette-category">').appendTo(container);
                if (!visible) {
                    entry.container.hide();
                }
                var header = $('<div class="palette-header"></div>').appendTo(entry.container);
                entry.content = $('<div></div>').appendTo(entry.container);
                if (entry.collapsible !== false) {
                    header.click(function() {
                        if (options.singleExpanded) {
                            if (!entry.isExpanded()) {
                                for (var i=0;i<entries.length;i++) {
                                    if (entries[i].isExpanded()) {
                                        entries[i].collapse();
                                    }
                                }
                                entry.expand();
                            }
                        } else {
                            entry.toggle();
                        }
                    });
                    var icon = $('<i class="fa fa-angle-down"></i>').appendTo(header);

                    if (entry.expanded) {
                        icon.addClass("expanded");
                    } else {
                        entry.content.hide();
                    }
                } else {
                    header.css("cursor","default");
                }
                entry.title = $('<span></span>').html(entry.title).appendTo(header);



                entry.toggle = function() {
                    if (entry.isExpanded()) {
                        entry.collapse();
                        return false;
                    } else {
                        entry.expand();
                        return true;
                    }
                };
                entry.expand = function() {
                    if (!entry.isExpanded()) {
                        if (entry.onexpand) {
                            entry.onexpand.call(entry);
                        }
                        icon.addClass("expanded");
                        entry.content.slideDown(200);
                        return true;
                    }
                };
                entry.collapse = function() {
                    if (entry.isExpanded()) {
                        icon.removeClass("expanded");
                        entry.content.slideUp(200);
                        return true;
                    }
                };
                entry.isExpanded = function() {
                    return icon.hasClass("expanded");
                };

                return entry;

            },

            hide: function() {
                visible = false;
                entries.forEach(function(entry) {
                    entry.container.hide();
                });
                return this;
            },

            show: function() {
                visible = true;
                entries.forEach(function(entry) {
                    entry.container.show();
                });
                return this;
            }
        }

    }

    return {
        create: createStack
    }
})();
;/**
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
(function($) {
    var allOptions = {
        msg: {value:"msg",label:"msg.",validate:RED.utils.validatePropertyExpression},
        flow: {value:"flow",label:"flow.",validate:RED.utils.validatePropertyExpression},
        global: {value:"global",label:"global.",validate:RED.utils.validatePropertyExpression},
        str: {value:"str",label:"string",icon:"red/images/typedInput/az.png"},
        num: {value:"num",label:"number",icon:"red/images/typedInput/09.png",validate:/^[+-]?[0-9]*\.?[0-9]*([eE][-+]?[0-9]+)?$/},
        bool: {value:"bool",label:"boolean",icon:"red/images/typedInput/bool.png",options:["true","false"]},
        json: {
            value:"json",
            label:"JSON",
            icon:"red/images/typedInput/json.png",
            validate: function(v) { try{JSON.parse(v);return true;}catch(e){return false;}},
            expand: function() {
                var that = this;
                var value = this.value();
                try {
                    value = JSON.stringify(JSON.parse(value),null,4);
                } catch(err) {
                }
                RED.editor.editJSON({
                    value: value,
                    complete: function(v) {
                        var value = v;
                        try {
                            value = JSON.stringify(JSON.parse(v));
                        } catch(err) {
                        }
                        that.value(value);
                    }
                })
            }
        },
        re: {value:"re",label:"regular expression",icon:"red/images/typedInput/re.png"},
        date: {value:"date",label:"timestamp",hasValue:false},
        jsonata: {
            value: "jsonata",
            label: "expression",
            icon: "red/images/typedInput/expr.png",
            validate: function(v) { try{jsonata(v);return true;}catch(e){return false;}},
            expand:function() {
                var that = this;
                RED.editor.editExpression({
                    value: this.value().replace(/\t/g,"\n"),
                    complete: function(v) {
                        that.value(v.replace(/\n/g,"\t"));
                    }
                })
            }
        }
    };
    var nlsd = false;

    $.widget( "nodered.typedInput", {
        _create: function() {
            if (!nlsd && RED && RED._) {
                for (var i in allOptions) {
                    if (allOptions.hasOwnProperty(i)) {
                        allOptions[i].label = RED._("typedInput.type."+i,{defaultValue:allOptions[i].label});
                    }
                }
            }
            nlsd = true;
            var that = this;

            this.disarmClick = false;
            this.element.addClass('red-ui-typedInput');
            this.uiWidth = this.element.outerWidth();
            this.elementDiv = this.element.wrap("<div>").parent().addClass('red-ui-typedInput-input');
            this.uiSelect = this.elementDiv.wrap( "<div>" ).parent();
            var attrStyle = this.element.attr('style');
            var m;
            if ((m = /width\s*:\s*(\d+(%|px))/i.exec(attrStyle)) !== null) {
                this.element.css('width','100%');
                this.uiSelect.width(m[1]);
                this.uiWidth = null;
            } else {
                this.uiSelect.width(this.uiWidth);
            }
            ["Right","Left"].forEach(function(d) {
                var m = that.element.css("margin"+d);
                that.uiSelect.css("margin"+d,m);
                that.element.css("margin"+d,0);
            });
            this.uiSelect.addClass("red-ui-typedInput-container");

            this.options.types = this.options.types||Object.keys(allOptions);

            this.selectTrigger = $('<button tabindex="0"></button>').prependTo(this.uiSelect);
            $('<i class="fa fa-sort-desc"></i>').appendTo(this.selectTrigger);
            this.selectLabel = $('<span></span>').appendTo(this.selectTrigger);

            this.types(this.options.types);

            if (this.options.typeField) {
                this.typeField = $(this.options.typeField).hide();
                var t = this.typeField.val();
                if (t && this.typeMap[t]) {
                    this.options.default = t;
                }
            } else {
                this.typeField = $("<input>",{type:'hidden'}).appendTo(this.uiSelect);
            }

            this.element.on('focus', function() {
                that.uiSelect.addClass('red-ui-typedInput-focus');
            });
            this.element.on('blur', function() {
                that.uiSelect.removeClass('red-ui-typedInput-focus');
            });
            this.element.on('change', function() {
                that.validate();
            })
            this.selectTrigger.click(function(event) {
                event.preventDefault();
                that._showTypeMenu();
            });
            this.selectTrigger.on('keydown',function(evt) {
                if (evt.keyCode === 40) {
                    // Down
                    that._showTypeMenu();
                }
            }).on('focus', function() {
                that.uiSelect.addClass('red-ui-typedInput-focus');
            })

            // explicitly set optionSelectTrigger display to inline-block otherwise jQ sets it to 'inline'
            this.optionSelectTrigger = $('<button tabindex="0" class="red-ui-typedInput-option-trigger" style="display:inline-block"><span class="red-ui-typedInput-option-caret"><i class="fa fa-sort-desc"></i></span></button>').appendTo(this.uiSelect);
            this.optionSelectLabel = $('<span class="red-ui-typedInput-option-label"></span>').prependTo(this.optionSelectTrigger);
            this.optionSelectTrigger.click(function(event) {
                event.preventDefault();
                that._showOptionSelectMenu();
            }).on('keydown', function(evt) {
                if (evt.keyCode === 40) {
                    // Down
                    that._showOptionSelectMenu();
                }
            }).on('blur', function() {
                that.uiSelect.removeClass('red-ui-typedInput-focus');
            }).on('focus', function() {
                that.uiSelect.addClass('red-ui-typedInput-focus');
            });

            this.optionExpandButton = $('<button tabindex="0" class="red-ui-typedInput-option-expand" style="display:inline-block"><i class="fa fa-ellipsis-h"></i></button>').appendTo(this.uiSelect);


            this.type(this.options.default||this.typeList[0].value);
        },
        _showTypeMenu: function() {
            if (this.typeList.length > 1) {
                this._showMenu(this.menu,this.selectTrigger);
                this.menu.find("[value='"+this.propertyType+"']").focus();
            } else {
                this.element.focus();
            }
        },
        _showOptionSelectMenu: function() {
            if (this.optionMenu) {
                this.optionMenu.css({
                    minWidth:this.optionSelectLabel.width()
                });

                this._showMenu(this.optionMenu,this.optionSelectLabel);
                var selectedOption = this.optionMenu.find("[value='"+this.value()+"']");
                if (selectedOption.length === 0) {
                    selectedOption = this.optionMenu.children(":first");
                }
                selectedOption.focus();

            }
        },
        _hideMenu: function(menu) {
            $(document).off("mousedown.close-property-select");
            menu.hide();
            if (this.elementDiv.is(":visible")) {
                this.element.focus();
            } else if (this.optionSelectTrigger.is(":visible")){
                this.optionSelectTrigger.focus();
            } else {
                this.selectTrigger.focus();
            }
        },
        _createMenu: function(opts,callback) {
            var that = this;
            var menu = $("<div>").addClass("red-ui-typedInput-options");
            opts.forEach(function(opt) {
                if (typeof opt === 'string') {
                    opt = {value:opt,label:opt};
                }
                var op = $('<a href="#"></a>').attr("value",opt.value).appendTo(menu);
                if (opt.label) {
                    op.text(opt.label);
                }
                if (opt.icon) {
                    $('<img>',{src:opt.icon,style:"margin-right: 4px; height: 18px;"}).prependTo(op);
                } else {
                    op.css({paddingLeft: "18px"});
                }

                op.click(function(event) {
                    event.preventDefault();
                    callback(opt.value);
                    that._hideMenu(menu);
                });
            });
            menu.css({
                display: "none",
            });
            menu.appendTo(document.body);

            menu.on('keydown', function(evt) {
                if (evt.keyCode === 40) {
                    // DOWN
                    $(this).children(":focus").next().focus();
                } else if (evt.keyCode === 38) {
                    // UP
                    $(this).children(":focus").prev().focus();
                } else if (evt.keyCode === 27) {
                    that._hideMenu(menu);
                }
            })



            return menu;

        },
        _showMenu: function(menu,relativeTo) {
            if (this.disarmClick) {
                this.disarmClick = false;
                return
            }
            var that = this;
            var pos = relativeTo.offset();
            var height = relativeTo.height();
            var menuHeight = menu.height();
            var top = (height+pos.top-3);
            if (top+menuHeight > $(window).height()) {
                top -= (top+menuHeight)-$(window).height()+5;
            }
            menu.css({
                top: top+"px",
                left: (2+pos.left)+"px",
            });
            menu.slideDown(100);
            this._delay(function() {
                that.uiSelect.addClass('red-ui-typedInput-focus');
                $(document).on("mousedown.close-property-select", function(event) {
                    if(!$(event.target).closest(menu).length) {
                        that._hideMenu(menu);
                    }
                    if ($(event.target).closest(relativeTo).length) {
                        that.disarmClick = true;
                        event.preventDefault();
                    }
                })
            });
        },
        _getLabelWidth: function(label) {
            var labelWidth = label.outerWidth();
            if (labelWidth === 0) {
                var container = $('<div class="red-ui-typedInput-container"></div>').css({
                    position:"absolute",
                    top:0,
                    left:-1000
                }).appendTo(document.body);
                var newTrigger = label.clone().appendTo(container);
                labelWidth = newTrigger.outerWidth();
                container.remove();
            }
            return labelWidth;
        },
        _resize: function() {
            if (this.uiWidth !== null) {
                this.uiSelect.width(this.uiWidth);
            }
            if (this.typeMap[this.propertyType] && this.typeMap[this.propertyType].hasValue === false) {
                this.selectTrigger.addClass("red-ui-typedInput-full-width");
            } else {
                this.selectTrigger.removeClass("red-ui-typedInput-full-width");
                var labelWidth = this._getLabelWidth(this.selectTrigger);
                this.elementDiv.css('left',labelWidth+"px");
                if (this.optionExpandButton.is(":visible")) {
                    this.elementDiv.css('right',"22px");
                } else {
                    this.elementDiv.css('right','0');
                }
                if (this.optionSelectTrigger) {
                    this.optionSelectTrigger.css({'left':(labelWidth)+"px",'width':'calc( 100% - '+labelWidth+'px )'});
                }
            }
        },
        _destroy: function() {
            this.menu.remove();
        },
        types: function(types) {
            var that = this;
            var currentType = this.type();
            this.typeMap = {};
            this.typeList = types.map(function(opt) {
                var result;
                if (typeof opt === 'string') {
                    result = allOptions[opt];
                } else {
                    result = opt;
                }
                that.typeMap[result.value] = result;
                return result;
            });
            this.selectTrigger.toggleClass("disabled", this.typeList.length === 1);
            if (this.menu) {
                this.menu.remove();
            }
            this.menu = this._createMenu(this.typeList, function(v) { that.type(v) });
            if (currentType && !this.typeMap.hasOwnProperty(currentType)) {
                this.type(this.typeList[0].value);
            }
        },
        width: function(desiredWidth) {
            this.uiWidth = desiredWidth;
            this._resize();
        },
        value: function(value) {
            if (!arguments.length) {
                return this.element.val();
            } else {
                if (this.typeMap[this.propertyType].options) {
                    if (this.typeMap[this.propertyType].options.indexOf(value) === -1) {
                        value = "";
                    }
                    this.optionSelectLabel.text(value);
                }
                this.element.val(value);
                this.element.trigger('change',this.type(),value);
            }
        },
        type: function(type) {
            if (!arguments.length) {
                return this.propertyType;
            } else {
                var that = this;
                var opt = this.typeMap[type];
                if (opt && this.propertyType !== type) {
                    this.propertyType = type;
                    this.typeField.val(type);
                    this.selectLabel.empty();
                    var image;
                    if (opt.icon) {
                        image = new Image();
                        image.name = opt.icon;
                        image.src = opt.icon;
                        $('<img>',{src:opt.icon,style:"margin-right: 4px;height: 18px;"}).prependTo(this.selectLabel);
                    } else {
                        this.selectLabel.text(opt.label);
                    }
                    if (opt.options) {
                        if (this.optionExpandButton) {
                            this.optionExpandButton.hide();
                        }
                        if (this.optionSelectTrigger) {
                            this.optionSelectTrigger.show();
                            this.elementDiv.hide();
                            this.optionMenu = this._createMenu(opt.options,function(v){
                                that.optionSelectLabel.text(v);
                                that.value(v);
                            });
                            var currentVal = this.element.val();
                            if (opt.options.indexOf(currentVal) !== -1) {
                                this.optionSelectLabel.text(currentVal);
                            } else {
                                this.value(opt.options[0]);
                            }
                        }
                    } else {
                        if (this.optionMenu) {
                            this.optionMenu.remove();
                            this.optionMenu = null;
                        }
                        if (this.optionSelectTrigger) {
                            this.optionSelectTrigger.hide();
                        }
                        if (opt.hasValue === false) {
                            this.oldValue = this.element.val();
                            this.element.val("");
                            this.elementDiv.hide();
                        } else {
                            if (this.oldValue !== undefined) {
                                this.element.val(this.oldValue);
                                delete this.oldValue;
                            }
                            this.elementDiv.show();
                        }
                        if (opt.expand && typeof opt.expand === 'function') {
                            this.optionExpandButton.show();
                            this.optionExpandButton.off('click');
                            this.optionExpandButton.on('click',function(evt) {
                                evt.preventDefault();
                                opt.expand.call(that);
                            })
                        } else {
                            this.optionExpandButton.hide();
                        }
                        this.element.trigger('change',this.propertyType,this.value());
                    }
                    if (image) {
                        image.onload = function() { that._resize(); }
                        image.onerror = function() { that._resize(); }
                    } else {
                        this._resize();
                    }
                }
            }
        },
        validate: function() {
            var result;
            var value = this.value();
            var type = this.type();
            if (this.typeMap[type] && this.typeMap[type].validate) {
                var val = this.typeMap[type].validate;
                if (typeof val === 'function') {
                    result = val(value);
                } else {
                    result = val.test(value);
                }
            } else {
                result = true;
            }
            if (result) {
                this.uiSelect.removeClass('input-error');
            } else {
                this.uiSelect.addClass('input-error');
            }
            return result;
        },
        show: function() {
            this.uiSelect.show();
            this._resize();
        },
        hide: function() {
            this.uiSelect.hide();
        }
    });
})(jQuery);
;RED.actions = (function() {
    var actions = {

    }

    function addAction(name,handler) {
        actions[name] = handler;
    }
    function removeAction(name) {
        delete actions[name];
    }
    function getAction(name) {
        return actions[name];
    }
    function invokeAction(name) {
        if (actions.hasOwnProperty(name)) {
            actions[name]();
        }
    }
    function listActions() {
        var result = [];
        Object.keys(actions).forEach(function(action) {
            var shortcut = RED.keyboard.getShortcut(action);
            result.push({id:action,scope:shortcut?shortcut.scope:undefined,key:shortcut?shortcut.key:undefined,user:shortcut?shortcut.user:undefined})
        })
        return result;
    }
    return {
        add: addAction,
        remove: removeAction,
        get: getAction,
        invoke: invokeAction,
        list: listActions
    }
})();
;/**
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

RED.deploy = (function() {

    var deploymentTypes = {
        "full":{img:"red/images/deploy-full-o.png"},
        "nodes":{img:"red/images/deploy-nodes-o.png"},
        "flows":{img:"red/images/deploy-flows-o.png"}
    }

    var ignoreDeployWarnings = {
        unknown: false,
        unusedConfig: false,
        invalid: false
    }

    var deploymentType = "full";

    var deployInflight = false;

    var currentDiff = null;

    function changeDeploymentType(type) {
        deploymentType = type;
        $("#btn-deploy-icon").attr("src",deploymentTypes[type].img);
    }

    /**
     * options:
     *   type: "default" - Button with drop-down options - no further customisation available
     *   type: "simple"  - Button without dropdown. Customisations:
     *      label: the text to display - default: "Deploy"
     *      icon : the icon to use. Null removes the icon. default: "red/images/deploy-full-o.png"
     */
    function init(options) {
        options = options || {};
        var type = options.type || "default";

        if (type == "default") {
            $('<li><span class="deploy-button-group button-group">'+
              '<a id="btn-deploy" class="deploy-button disabled" href="#">'+
                '<span class="deploy-button-content">'+
                 '<img id="btn-deploy-icon" src="red/images/deploy-full-o.png"> '+
                 '<span>'+RED._("deploy.deploy")+'</span>'+
                '</span>'+
                '<span class="deploy-button-spinner hide">'+
                 '<img src="red/images/spin.svg"/>'+
                '</span>'+
              '</a>'+
              '<a id="btn-deploy-options" data-toggle="dropdown" class="deploy-button" href="#"><i class="fa fa-caret-down"></i></a>'+
              '</span></li>').prependTo(".header-toolbar");
              RED.menu.init({id:"btn-deploy-options",
                  options: [
                      {id:"deploymenu-item-full",toggle:"deploy-type",icon:"red/images/deploy-full.png",label:RED._("deploy.full"),sublabel:RED._("deploy.fullDesc"),selected: true, onselect:function(s) { if(s){changeDeploymentType("full")}}},
                      {id:"deploymenu-item-flow",toggle:"deploy-type",icon:"red/images/deploy-flows.png",label:RED._("deploy.modifiedFlows"),sublabel:RED._("deploy.modifiedFlowsDesc"), onselect:function(s) {if(s){changeDeploymentType("flows")}}},
                      {id:"deploymenu-item-node",toggle:"deploy-type",icon:"red/images/deploy-nodes.png",label:RED._("deploy.modifiedNodes"),sublabel:RED._("deploy.modifiedNodesDesc"),onselect:function(s) { if(s){changeDeploymentType("nodes")}}}
                  ]
              });
        } else if (type == "simple") {
            var label = options.label || RED._("deploy.deploy");
            var icon = 'red/images/deploy-full-o.png';
            if (options.hasOwnProperty('icon')) {
                icon = options.icon;
            }

            $('<li><span class="deploy-button-group button-group">'+
              '<a id="btn-deploy" class="deploy-button disabled" href="#">'+
                '<span class="deploy-button-content">'+
                  (icon?'<img id="btn-deploy-icon" src="'+icon+'"> ':'')+
                  '<span>'+label+'</span>'+
                '</span>'+
                '<span class="deploy-button-spinner hide">'+
                 '<img src="red/images/spin.svg"/>'+
                '</span>'+
              '</a>'+
              '</span></li>').prependTo(".header-toolbar");
        }

        $('#btn-deploy').click(function(event) {
            event.preventDefault();
            save();
        });

        RED.actions.add("core:deploy-flows",save);

        $( "#node-dialog-confirm-deploy" ).dialog({
                title: RED._('deploy.confirm.button.confirm'),
                modal: true,
                autoOpen: false,
                width: 550,
                height: "auto",
                buttons: [
                    {
                        text: RED._("common.label.cancel"),
                        click: function() {
                            $( this ).dialog( "close" );
                        }
                    },
                    {
                        id: "node-dialog-confirm-deploy-review",
                        text: RED._("deploy.confirm.button.review"),
                        class: "primary disabled",
                        click: function() {
                            if (!$("#node-dialog-confirm-deploy-review").hasClass('disabled')) {
                                RED.diff.showRemoteDiff();
                                $( this ).dialog( "close" );
                            }
                        }
                    },
                    {
                        id: "node-dialog-confirm-deploy-merge",
                        text: RED._("deploy.confirm.button.merge"),
                        class: "primary disabled",
                        click: function() {
                            RED.diff.mergeDiff(currentDiff);
                            $( this ).dialog( "close" );
                        }
                    },
                    {
                        id: "node-dialog-confirm-deploy-deploy",
                        text: RED._("deploy.confirm.button.confirm"),
                        class: "primary",
                        click: function() {

                            var ignoreChecked = $( "#node-dialog-confirm-deploy-hide" ).prop("checked");
                            if (ignoreChecked) {
                                ignoreDeployWarnings[$( "#node-dialog-confirm-deploy-type" ).val()] = true;
                            }
                            save(true,/conflict/.test($("#node-dialog-confirm-deploy-type" ).val()));
                            $( this ).dialog( "close" );
                        }
                    },
                    {
                        id: "node-dialog-confirm-deploy-overwrite",
                        text: RED._("deploy.confirm.button.overwrite"),
                        class: "primary",
                        click: function() {
                            save(true,/conflict/.test($("#node-dialog-confirm-deploy-type" ).val()));
                            $( this ).dialog( "close" );
                        }
                    }
                ],
                create: function() {
                    $("#node-dialog-confirm-deploy").parent().find("div.ui-dialog-buttonpane")
                        .prepend('<div style="height:0; vertical-align: middle; display:inline-block; margin-top: 13px; float:left;">'+
                                   '<input style="vertical-align:top;" type="checkbox" id="node-dialog-confirm-deploy-hide">'+
                                   '<label style="display:inline;" for="node-dialog-confirm-deploy-hide"> do not warn about this again</label>'+
                                   '<input type="hidden" id="node-dialog-confirm-deploy-type">'+
                                   '</div>');
                },
                open: function() {
                    var deployType = $("#node-dialog-confirm-deploy-type" ).val();
                    if (/conflict/.test(deployType)) {
                        $( "#node-dialog-confirm-deploy" ).dialog('option','title', RED._('deploy.confirm.button.review'));
                        $("#node-dialog-confirm-deploy-deploy").hide();
                        $("#node-dialog-confirm-deploy-review").addClass('disabled').show();
                        $("#node-dialog-confirm-deploy-merge").addClass('disabled').show();
                        $("#node-dialog-confirm-deploy-overwrite").toggle(deployType === "deploy-conflict");
                        currentDiff = null;
                        $("#node-dialog-confirm-deploy-conflict-checking").show();
                        $("#node-dialog-confirm-deploy-conflict-auto-merge").hide();
                        $("#node-dialog-confirm-deploy-conflict-manual-merge").hide();

                        var now = Date.now();
                        RED.diff.getRemoteDiff(function(diff) {
                            var ellapsed = Math.max(1000 - (Date.now()-now), 0);
                            currentDiff = diff;
                            setTimeout(function() {
                                $("#node-dialog-confirm-deploy-conflict-checking").hide();
                                var d = Object.keys(diff.conflicts);
                                if (d.length === 0) {
                                    $("#node-dialog-confirm-deploy-conflict-auto-merge").show();
                                    $("#node-dialog-confirm-deploy-merge").removeClass('disabled')
                                } else {
                                    $("#node-dialog-confirm-deploy-conflict-manual-merge").show();
                                }
                                $("#node-dialog-confirm-deploy-review").removeClass('disabled')
                            },ellapsed);
                        })


                        $("#node-dialog-confirm-deploy-hide").parent().hide();
                    } else {
                        $( "#node-dialog-confirm-deploy" ).dialog('option','title', RED._('deploy.confirm.button.confirm'));
                        $("#node-dialog-confirm-deploy-deploy").show();
                        $("#node-dialog-confirm-deploy-overwrite").hide();
                        $("#node-dialog-confirm-deploy-review").hide();
                        $("#node-dialog-confirm-deploy-merge").hide();
                        $("#node-dialog-confirm-deploy-hide").parent().show();
                    }
                }
        });

        RED.events.on('nodes:change',function(state) {
            if (state.dirty) {
                window.onbeforeunload = function() {
                    return RED._("deploy.confirm.undeployedChanges");
                }
                $("#btn-deploy").removeClass("disabled");
            } else {
                window.onbeforeunload = null;
                $("#btn-deploy").addClass("disabled");
            }
        });

        var activeNotifyMessage;
        RED.comms.subscribe("notification/runtime-deploy",function(topic,msg) {
            if (!activeNotifyMessage) {
                var currentRev = RED.nodes.version();
                if (currentRev === null || deployInflight || currentRev === msg.revision) {
                    return;
                }
                var message = $('<div>'+RED._('deploy.confirm.backgroundUpdate')+
                    '<br><br><div class="ui-dialog-buttonset">'+
                    '<button>'+RED._('deploy.confirm.button.ignore')+'</button>'+
                    '<button class="primary">'+RED._('deploy.confirm.button.review')+'</button>'+
                    '</div></div>');
                $(message.find('button')[0]).click(function(evt) {
                    evt.preventDefault();
                    activeNotifyMessage.close();
                    activeNotifyMessage = null;
                })
                $(message.find('button')[1]).click(function(evt) {
                    evt.preventDefault();
                    activeNotifyMessage.close();
                    var nns = RED.nodes.createCompleteNodeSet();
                    resolveConflict(nns,false);
                    activeNotifyMessage = null;
                })
                activeNotifyMessage = RED.notify(message,null,true);
            }
        });
    }

    function getNodeInfo(node) {
        var tabLabel = "";
        if (node.z) {
            var tab = RED.nodes.workspace(node.z);
            if (!tab) {
                tab = RED.nodes.subflow(node.z);
                tabLabel = tab.name;
            } else {
                tabLabel = tab.label;
            }
        }
        var label = RED.utils.getNodeLabel(node,node.id);
        return {tab:tabLabel,type:node.type,label:label};
    }
    function sortNodeInfo(A,B) {
        if (A.tab < B.tab) { return -1;}
        if (A.tab > B.tab) { return 1;}
        if (A.type < B.type) { return -1;}
        if (A.type > B.type) { return 1;}
        if (A.name < B.name) { return -1;}
        if (A.name > B.name) { return 1;}
        return 0;
    }

    function resolveConflict(currentNodes, activeDeploy) {
        $( "#node-dialog-confirm-deploy-config" ).hide();
        $( "#node-dialog-confirm-deploy-unknown" ).hide();
        $( "#node-dialog-confirm-deploy-unused" ).hide();
        $( "#node-dialog-confirm-deploy-conflict" ).show();
        $( "#node-dialog-confirm-deploy-type" ).val(activeDeploy?"deploy-conflict":"background-conflict");
        $( "#node-dialog-confirm-deploy" ).dialog( "open" );
    }

    function save(skipValidation,force) {
        if (!$("#btn-deploy").hasClass("disabled")) {
            if (!skipValidation) {
                var hasUnknown = false;
                var hasInvalid = false;
                var hasUnusedConfig = false;

                var unknownNodes = [];
                var invalidNodes = [];

                RED.nodes.eachNode(function(node) {
                    hasInvalid = hasInvalid || !node.valid;
                    if (!node.valid) {
                        invalidNodes.push(getNodeInfo(node));
                    }
                    if (node.type === "unknown") {
                        if (unknownNodes.indexOf(node.name) == -1) {
                            unknownNodes.push(node.name);
                        }
                    }
                });
                hasUnknown = unknownNodes.length > 0;

                var unusedConfigNodes = [];
                RED.nodes.eachConfig(function(node) {
                    if (node.users.length === 0 && (node._def.hasUsers !== false)) {
                        unusedConfigNodes.push(getNodeInfo(node));
                        hasUnusedConfig = true;
                    }
                });

                $( "#node-dialog-confirm-deploy-config" ).hide();
                $( "#node-dialog-confirm-deploy-unknown" ).hide();
                $( "#node-dialog-confirm-deploy-unused" ).hide();
                $( "#node-dialog-confirm-deploy-conflict" ).hide();

                var showWarning = false;

                if (hasUnknown && !ignoreDeployWarnings.unknown) {
                    showWarning = true;
                    $( "#node-dialog-confirm-deploy-type" ).val("unknown");
                    $( "#node-dialog-confirm-deploy-unknown" ).show();
                    $( "#node-dialog-confirm-deploy-unknown-list" )
                        .html("<li>"+unknownNodes.join("</li><li>")+"</li>");
                } else if (hasInvalid && !ignoreDeployWarnings.invalid) {
                    showWarning = true;
                    $( "#node-dialog-confirm-deploy-type" ).val("invalid");
                    $( "#node-dialog-confirm-deploy-config" ).show();
                    invalidNodes.sort(sortNodeInfo);
                    $( "#node-dialog-confirm-deploy-invalid-list" )
                        .html("<li>"+invalidNodes.map(function(A) { return (A.tab?"["+A.tab+"] ":"")+A.label+" ("+A.type+")"}).join("</li><li>")+"</li>");

                } else if (hasUnusedConfig && !ignoreDeployWarnings.unusedConfig) {
                    // showWarning = true;
                    // $( "#node-dialog-confirm-deploy-type" ).val("unusedConfig");
                    // $( "#node-dialog-confirm-deploy-unused" ).show();
                    //
                    // unusedConfigNodes.sort(sortNodeInfo);
                    // $( "#node-dialog-confirm-deploy-unused-list" )
                    //     .html("<li>"+unusedConfigNodes.map(function(A) { return (A.tab?"["+A.tab+"] ":"")+A.label+" ("+A.type+")"}).join("</li><li>")+"</li>");
                }
                if (showWarning) {
                    $( "#node-dialog-confirm-deploy-hide" ).prop("checked",false);
                    $( "#node-dialog-confirm-deploy" ).dialog( "open" );
                    return;
                }
            }

            var nns = RED.nodes.createCompleteNodeSet();

            var startTime = Date.now();
            $(".deploy-button-content").css('opacity',0);
            $(".deploy-button-spinner").show();
            $("#btn-deploy").addClass("disabled");

            var data = {flows:nns};

            if (!force) {
                data.rev = RED.nodes.version();
            }

            deployInflight = true;
            $.ajax({
                url:"flows",
                type: "POST",
                data: JSON.stringify(data),
                contentType: "application/json; charset=utf-8",
                headers: {
                    "Node-RED-Deployment-Type":deploymentType
                }
            }).done(function(data,textStatus,xhr) {
                RED.nodes.dirty(false);
                RED.nodes.version(data.rev);
                RED.nodes.originalFlow(nns);
                if (hasUnusedConfig) {
                    RED.notify(
                    '<p>'+RED._("deploy.successfulDeploy")+'</p>'+
                    '<p>'+RED._("deploy.unusedConfigNodes")+' <a href="#" onclick="RED.sidebar.config.show(true); return false;">'+RED._("deploy.unusedConfigNodesLink")+'</a></p>',"success",false,6000);
                } else {
                    RED.notify(RED._("deploy.successfulDeploy"),"success");
                }
                RED.nodes.eachNode(function(node) {
                    if (node.changed) {
                        node.dirty = true;
                        node.changed = false;
                    }
                    if(node.credentials) {
                        delete node.credentials;
                    }
                });
                RED.nodes.eachConfig(function (confNode) {
                    confNode.changed = false;
                    if (confNode.credentials) {
                        delete confNode.credentials;
                    }
                });
                RED.nodes.eachWorkspace(function(ws) {
                    ws.changed = false;
                })
                // Once deployed, cannot undo back to a clean state
                RED.history.markAllDirty();
                RED.view.redraw();
                RED.events.emit("deploy");
            }).fail(function(xhr,textStatus,err) {
                RED.nodes.dirty(true);
                $("#btn-deploy").removeClass("disabled");
                if (xhr.status === 401) {
                    RED.notify(RED._("deploy.deployFailed",{message:RED._("user.notAuthorized")}),"error");
                } else if (xhr.status === 409) {
                    resolveConflict(nns, true);
                } else if (xhr.responseText) {
                    RED.notify(RED._("deploy.deployFailed",{message:xhr.responseText}),"error");
                } else {
                    RED.notify(RED._("deploy.deployFailed",{message:RED._("deploy.errors.noResponse")}),"error");
                }
            }).always(function() {
                deployInflight = false;
                var delta = Math.max(0,300-(Date.now()-startTime));
                setTimeout(function() {
                    $(".deploy-button-content").css('opacity',1);
                    $(".deploy-button-spinner").hide();
                },delta);
            });
        }
    }
    return {
        init: init
    }
})();
;RED.diff = (function() {

    var currentDiff = {};

    function init() {

        // RED.actions.add("core:show-current-diff",showLocalDiff);
        RED.actions.add("core:show-remote-diff",showRemoteDiff);

        // RED.keyboard.add("*","ctrl-shift-l","core:show-current-diff");
        RED.keyboard.add("*","ctrl-shift-r","core:show-remote-diff");


        var dialog = $('<div id="node-dialog-view-diff" class="hide"><div id="node-dialog-view-diff-headers"></div><ol id="node-dialog-view-diff-diff"></ol></div>').appendTo(document.body);

        var toolbar = $('<div class="node-diff-toolbar">'+
            '<span><span id="node-diff-toolbar-resolved-conflicts"></span></span> '+
            '</div>').prependTo(dialog);

        $("#node-dialog-view-diff").dialog({
            title: RED._('deploy.confirm.button.review'),
            modal: true,
            autoOpen: false,
            buttons: [
                {
                    text: RED._("common.label.cancel"),
                    click: function() {
                        $( this ).dialog( "close" );
                    }
                },
                {
                    id: "node-diff-view-diff-merge",
                    text: RED._("deploy.confirm.button.merge"),
                    class: "primary disabled",
                    click: function() {
                        if (!$("#node-diff-view-diff-merge").hasClass('disabled')) {
                            refreshConflictHeader();
                            mergeDiff(currentDiff);
                            $( this ).dialog( "close" );
                        }
                    }
                }
            ],
            open: function() {
                $(this).dialog({width:Math.min($(window).width(),900),height:Math.min($(window).height(),600)});
            }
        });

        var diffList = $("#node-dialog-view-diff-diff").editableList({
            addButton: false,
            scrollOnAdd: false,
            addItem: function(container,i,object) {
                var localDiff = object.diff;
                var remoteDiff = object.remoteDiff;
                var tab = object.tab.n;
                var def = object.def;
                var conflicts = currentDiff.conflicts;

                var tabDiv = $('<div>',{class:"node-diff-tab"}).appendTo(container);
                tabDiv.addClass('collapsed');
                var titleRow = $('<div>',{class:"node-diff-tab-title"}).appendTo(tabDiv);
                var nodesDiv = $('<div>').appendTo(tabDiv);
                var originalCell = $('<div>',{class:"node-diff-node-entry-cell"}).appendTo(titleRow);
                var localCell = $('<div>',{class:"node-diff-node-entry-cell node-diff-node-local"}).appendTo(titleRow);
                var remoteCell;
                var selectState;

                if (remoteDiff) {
                    remoteCell = $('<div>',{class:"node-diff-node-entry-cell node-diff-node-remote"}).appendTo(titleRow);
                }
                $('<span class="node-diff-chevron"><i class="fa fa-angle-down"></i></span>').appendTo(originalCell);
                createNodeIcon(tab,def).appendTo(originalCell);
                var tabForLabel = (object.newTab || object.tab).n;
                var titleSpan = $('<span>',{class:"node-diff-tab-title-meta"}).appendTo(originalCell);
                if (tabForLabel.type === 'tab') {
                    titleSpan.html(tabForLabel.label||tabForLabel.id);
                } else if (tab.type === 'subflow') {
                    titleSpan.html((tabForLabel.name||tabForLabel.id));
                } else {
                    titleSpan.html("Global nodes");
                }
                var flowStats = {
                    local: {
                        addedCount:0,
                        deletedCount:0,
                        changedCount:0,
                        unchangedCount: 0
                    },
                    remote: {
                        addedCount:0,
                        deletedCount:0,
                        changedCount:0,
                        unchangedCount: 0
                    },
                    conflicts: 0
                }
                if (object.newTab || object.remoteTab) {
                    var localTabNode = {
                        node: localDiff.newConfig.all[tab.id],
                        all: localDiff.newConfig.all,
                        diff: localDiff
                    }
                    var remoteTabNode;
                    if (remoteDiff) {
                        remoteTabNode = {
                            node:remoteDiff.newConfig.all[tab.id]||null,
                            all: remoteDiff.newConfig.all,
                            diff: remoteDiff
                        }
                    }
                    if (tab.type !== undefined) {
                        var div = $("<div>",{class:"node-diff-node-entry node-diff-node-props collapsed"}).appendTo(nodesDiv);
                        var row = $("<div>",{class:"node-diff-node-entry-header"}).appendTo(div);
                        var originalNodeDiv = $("<div>",{class:"node-diff-node-entry-cell"}).appendTo(row);
                        var localNodeDiv = $("<div>",{class:"node-diff-node-entry-cell node-diff-node-local"}).appendTo(row);
                        var localChanged = false;
                        var remoteChanged = false;

                        if (!localDiff.newConfig.all[tab.id]) {
                            localNodeDiv.addClass("node-diff-empty");
                        } else if (localDiff.added[tab.id]) {
                            localNodeDiv.addClass("node-diff-node-added");
                            localChanged = true;
                            $('<span class="node-diff-status"><i class="fa fa-plus-square"></i> <span data-i18n="diff.type.added"></span></span>').appendTo(localNodeDiv);
                        } else if (localDiff.changed[tab.id]) {
                            localNodeDiv.addClass("node-diff-node-changed");
                            localChanged = true;
                            $('<span class="node-diff-status"><i class="fa fa-square"></i> <span data-i18n="diff.type.changed"></span></span>').appendTo(localNodeDiv);
                        } else {
                            localNodeDiv.addClass("node-diff-node-unchanged");
                            $('<span class="node-diff-status"><i class="fa fa-square-o"></i> <span data-i18n="diff.type.unchanged"></span></span>').appendTo(localNodeDiv);
                        }

                        var remoteNodeDiv;
                        if (remoteDiff) {
                            remoteNodeDiv = $("<div>",{class:"node-diff-node-entry-cell node-diff-node-remote"}).appendTo(row);
                            if (!remoteDiff.newConfig.all[tab.id]) {
                                remoteNodeDiv.addClass("node-diff-empty");
                                if (remoteDiff.deleted[tab.id]) {
                                    remoteChanged = true;
                                }
                            } else if (remoteDiff.added[tab.id]) {
                                remoteNodeDiv.addClass("node-diff-node-added");
                                remoteChanged = true;
                                $('<span class="node-diff-status"><i class="fa fa-plus-square"></i> <span data-i18n="diff.type.added"></span></span>').appendTo(remoteNodeDiv);
                            } else if (remoteDiff.changed[tab.id]) {
                                remoteNodeDiv.addClass("node-diff-node-changed");
                                remoteChanged = true;
                                $('<span class="node-diff-status"><i class="fa fa-square"></i> <span data-i18n="diff.type.changed"></span></span>').appendTo(remoteNodeDiv);
                            } else {
                                remoteNodeDiv.addClass("node-diff-node-unchanged");
                                $('<span class="node-diff-status"><i class="fa fa-square-o"></i> <span data-i18n="diff.type.unchanged"></span></span>').appendTo(remoteNodeDiv);
                            }
                        }
                        $('<span class="node-diff-chevron"><i class="fa fa-angle-down"></i></span>').appendTo(originalNodeDiv);
                        $('<span>').html("Flow Properties").appendTo(originalNodeDiv);

                        row.click(function(evt) {
                            evt.preventDefault();
                            $(this).parent().toggleClass('collapsed');
                        });

                        createNodePropertiesTable(def,tab,localTabNode,remoteTabNode,conflicts).appendTo(div);
                        selectState = "";
                        if (conflicts[tab.id]) {
                            flowStats.conflicts++;

                            if (!localNodeDiv.hasClass("node-diff-empty")) {
                                $('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i></span></span>').prependTo(localNodeDiv);
                            }
                            if (!remoteNodeDiv.hasClass("node-diff-empty")) {
                                $('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i></span></span>').prependTo(remoteNodeDiv);
                            }
                            div.addClass("node-diff-node-entry-conflict");
                        } else {
                            selectState = currentDiff.resolutions[tab.id];
                        }
                        // Tab properties row
                        createNodeConflictRadioBoxes(tab,div,localNodeDiv,remoteNodeDiv,true,!conflicts[tab.id],selectState);
                    }
                }
                // var stats = $('<span>',{class:"node-diff-tab-stats"}).appendTo(titleRow);
                var localNodeCount = 0;
                var remoteNodeCount = 0;
                var seen = {};
                object.tab.nodes.forEach(function(node) {
                    seen[node.id] = true;
                    createNodeDiffRow(node,flowStats).appendTo(nodesDiv)
                });
                if (object.newTab) {
                    localNodeCount = object.newTab.nodes.length;
                    object.newTab.nodes.forEach(function(node) {
                        if (!seen[node.id]) {
                            seen[node.id] = true;
                            createNodeDiffRow(node,flowStats).appendTo(nodesDiv)
                        }
                    });
                }
                if (object.remoteTab) {
                    remoteNodeCount = object.remoteTab.nodes.length;
                    object.remoteTab.nodes.forEach(function(node) {
                        if (!seen[node.id]) {
                            createNodeDiffRow(node,flowStats).appendTo(nodesDiv)
                        }
                    });
                }
                titleRow.click(function(evt) {
                    // if (titleRow.parent().find(".node-diff-node-entry:not(.hide)").length > 0) {
                    titleRow.parent().toggleClass('collapsed');
                    if ($(this).parent().hasClass('collapsed')) {
                        $(this).parent().find('.node-diff-node-entry').addClass('collapsed');
                        $(this).parent().find('.debug-message-element').addClass('collapsed');
                    }
                    // }
                })

                if (localDiff.deleted[tab.id]) {
                    $('<span class="node-diff-node-deleted"><span class="node-diff-status"><i class="fa fa-minus-square"></i> <span data-i18n="diff.type.flowDeleted"></span></span></span>').appendTo(localCell);
                } else if (object.newTab) {
                    if (localDiff.added[tab.id]) {
                        $('<span class="node-diff-node-added"><span class="node-diff-status"><i class="fa fa-plus-square"></i> <span data-i18n="diff.type.flowAdded"></span></span></span>').appendTo(localCell);
                    } else {
                        if (tab.id) {
                            if (localDiff.changed[tab.id]) {
                                flowStats.local.changedCount++;
                            } else {
                                flowStats.local.unchangedCount++;
                            }
                        }
                        var localStats = $('<span>',{class:"node-diff-tab-stats"}).appendTo(localCell);
                        $('<span class="node-diff-status"></span>').html(RED._('diff.nodeCount',{count:localNodeCount})).appendTo(localStats);

                        if (flowStats.conflicts + flowStats.local.addedCount + flowStats.local.changedCount + flowStats.local.deletedCount > 0) {
                            $('<span class="node-diff-status"> [ </span>').appendTo(localStats);
                            if (flowStats.conflicts > 0) {
                                $('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i> '+flowStats.conflicts+'</span></span>').appendTo(localStats);
                            }
                            if (flowStats.local.addedCount > 0) {
                                $('<span class="node-diff-node-added"><span class="node-diff-status"><i class="fa fa-plus-square"></i> '+flowStats.local.addedCount+'</span></span>').appendTo(localStats);
                            }
                            if (flowStats.local.changedCount > 0) {
                                $('<span class="node-diff-node-changed"><span class="node-diff-status"><i class="fa fa-square"></i> '+flowStats.local.changedCount+'</span></span>').appendTo(localStats);
                            }
                            if (flowStats.local.deletedCount > 0) {
                                $('<span class="node-diff-node-deleted"><span class="node-diff-status"><i class="fa fa-minus-square"></i> '+flowStats.local.deletedCount+'</span></span>').appendTo(localStats);
                            }
                            $('<span class="node-diff-status"> ] </span>').appendTo(localStats);
                        }

                    }
                } else {
                    localCell.addClass("node-diff-empty");
                }

                if (remoteDiff) {
                    if (remoteDiff.deleted[tab.id]) {
                        $('<span class="node-diff-node-deleted"><span class="node-diff-status"><i class="fa fa-minus-square"></i> <span data-i18n="diff.type.flowDeleted"></span></span></span>').appendTo(remoteCell);
                    } else if (object.remoteTab) {
                        if (remoteDiff.added[tab.id]) {
                            $('<span class="node-diff-node-added"><span class="node-diff-status"><i class="fa fa-plus-square"></i> <span data-i18n="diff.type.flowAdded"></span></span></span>').appendTo(remoteCell);
                        } else {
                            if (tab.id) {
                                if (remoteDiff.changed[tab.id]) {
                                    flowStats.remote.changedCount++;
                                } else {
                                    flowStats.remote.unchangedCount++;
                                }
                            }
                            var remoteStats = $('<span>',{class:"node-diff-tab-stats"}).appendTo(remoteCell);
                            $('<span class="node-diff-status"></span>').html(RED._('diff.nodeCount',{count:remoteNodeCount})).appendTo(remoteStats);
                            if (flowStats.conflicts + flowStats.remote.addedCount + flowStats.remote.changedCount + flowStats.remote.deletedCount > 0) {
                                $('<span class="node-diff-status"> [ </span>').appendTo(remoteStats);
                                if (flowStats.conflicts > 0) {
                                    $('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i> '+flowStats.conflicts+'</span></span>').appendTo(remoteStats);
                                }
                                if (flowStats.remote.addedCount > 0) {
                                    $('<span class="node-diff-node-added"><span class="node-diff-status"><i class="fa fa-plus-square"></i> '+flowStats.remote.addedCount+'</span></span>').appendTo(remoteStats);
                                }
                                if (flowStats.remote.changedCount > 0) {
                                    $('<span class="node-diff-node-changed"><span class="node-diff-status"><i class="fa fa-square"></i> '+flowStats.remote.changedCount+'</span></span>').appendTo(remoteStats);
                                }
                                if (flowStats.remote.deletedCount > 0) {
                                    $('<span class="node-diff-node-deleted"><span class="node-diff-status"><i class="fa fa-minus-square"></i> '+flowStats.remote.deletedCount+'</span></span>').appendTo(remoteStats);
                                }
                                $('<span class="node-diff-status"> ] </span>').appendTo(remoteStats);
                            }
                        }
                    } else {
                        remoteCell.addClass("node-diff-empty");
                    }
                    selectState = "";
                    if (flowStats.conflicts > 0) {
                        titleRow.addClass("node-diff-node-entry-conflict");
                    } else {
                        selectState = currentDiff.resolutions[tab.id];
                    }
                    if (tab.id) {
                        var hide = !(flowStats.conflicts > 0 &&(localDiff.deleted[tab.id] || remoteDiff.deleted[tab.id]));
                        // Tab parent row
                        createNodeConflictRadioBoxes(tab,titleRow,localCell,remoteCell, false, hide, selectState);
                    }
                }

                if (tabDiv.find(".node-diff-node-entry").length === 0) {
                    tabDiv.addClass("node-diff-tab-empty");
                }
                container.i18n();
            }
        });
    }
    function formatWireProperty(wires,allNodes) {
        var result = $("<div>",{class:"node-diff-property-wires"})
        var list = $("<ol></ol>");
        var c = 0;
        wires.forEach(function(p,i) {
            var port = $("<li>").appendTo(list);
            if (p && p.length > 0) {
                $("<span>").html(i+1).appendTo(port);
                var links = $("<ul>").appendTo(port);
                p.forEach(function(d) {
                    c++;
                    var entry = $("<li>").appendTo(links);
                    var node = allNodes[d];
                    if (node) {
                        var def = RED.nodes.getType(node.type)||{};
                        createNode(node,def).appendTo(entry);
                    } else {
                        entry.html(d);
                    }
                })
            } else {
                port.html('none');
            }
        })
        if (c === 0) {
            result.html("none");
        } else {
            list.appendTo(result);
        }
        return result;
    }
    function createNodeIcon(node,def) {
        var nodeDiv = $("<div>",{class:"node-diff-node-entry-node"});
        var colour = def.color;
        var icon_url = RED.utils.getNodeIcon(def,node);
        if (node.type === 'tab') {
            colour = "#C0DEED";
        }
        nodeDiv.css('backgroundColor',colour);

        var iconContainer = $('<div/>',{class:"palette_icon_container"}).appendTo(nodeDiv);
        $('<div/>',{class:"palette_icon",style:"background-image: url("+icon_url+")"}).appendTo(iconContainer);

        return nodeDiv;
    }
    function createNode(node,def) {
        var nodeTitleDiv = $("<div>",{class:"node-diff-node-entry-title"})
        createNodeIcon(node,def).appendTo(nodeTitleDiv);
        var contentDiv = $('<div>',{class:"node-diff-node-description"}).appendTo(nodeTitleDiv);
        var nodeLabel = node.label || node.name || node.id;
        $('<span>',{class:"node-diff-node-label"}).html(nodeLabel).appendTo(contentDiv);
        return nodeTitleDiv;
    }
    function createNodeDiffRow(node,stats) {
        var localDiff = currentDiff.localDiff;
        var remoteDiff = currentDiff.remoteDiff;
        var conflicted = currentDiff.conflicts[node.id];

        var hasChanges = false; // exists in original and local/remote but with changes
        var unChanged = true; // existing in original,local,remote unchanged
        var localChanged = false;

        if (localDiff.added[node.id]) {
            stats.local.addedCount++;
            unChanged = false;
        }
        if (remoteDiff && remoteDiff.added[node.id]) {
            stats.remote.addedCount++;
            unChanged = false;
        }
        if (localDiff.deleted[node.id]) {
            stats.local.deletedCount++;
            unChanged = false;
        }
        if (remoteDiff && remoteDiff.deleted[node.id]) {
            stats.remote.deletedCount++;
            unChanged = false;
        }
        if (localDiff.changed[node.id]) {
            stats.local.changedCount++;
            hasChanges = true;
            unChanged = false;
        }
        if (remoteDiff && remoteDiff.changed[node.id]) {
            stats.remote.changedCount++;
            hasChanges = true;
            unChanged = false;
        }
        // console.log(node.id,localDiff.added[node.id],remoteDiff.added[node.id],localDiff.deleted[node.id],remoteDiff.deleted[node.id],localDiff.changed[node.id],remoteDiff.changed[node.id])
        var def = RED.nodes.getType(node.type);
        if (def === undefined) {
            if (/^subflow:/.test(node.type)) {
                def = {
                    icon:"subflow.png",
                    category: "subflows",
                    color: "#da9",
                    defaults:{name:{value:""}}
                }
            } else {
                def = {};
            }
        }
        var div = $("<div>",{class:"node-diff-node-entry collapsed"});
        var row = $("<div>",{class:"node-diff-node-entry-header"}).appendTo(div);

        var originalNodeDiv = $("<div>",{class:"node-diff-node-entry-cell"}).appendTo(row);
        var localNodeDiv = $("<div>",{class:"node-diff-node-entry-cell node-diff-node-local"}).appendTo(row);
        var remoteNodeDiv;
        var chevron;
        if (remoteDiff) {
            remoteNodeDiv = $("<div>",{class:"node-diff-node-entry-cell node-diff-node-remote"}).appendTo(row);
        }
        $('<span class="node-diff-chevron"><i class="fa fa-angle-down"></i></span>').appendTo(originalNodeDiv);

        if (unChanged) {
            stats.local.unchangedCount++;
            createNode(node,def).appendTo(originalNodeDiv);
            localNodeDiv.addClass("node-diff-node-unchanged");
            $('<span class="node-diff-status"><i class="fa fa-square-o"></i> <span data-i18n="diff.type.unchanged"></span></span>').appendTo(localNodeDiv);
            if (remoteDiff) {
                stats.remote.unchangedCount++;
                remoteNodeDiv.addClass("node-diff-node-unchanged");
                $('<span class="node-diff-status"><i class="fa fa-square-o"></i> <span data-i18n="diff.type.unchanged"></span></span>').appendTo(remoteNodeDiv);
            }
            div.addClass("node-diff-node-unchanged");
        } else if (localDiff.added[node.id]) {
            localNodeDiv.addClass("node-diff-node-added");
            if (remoteNodeDiv) {
                remoteNodeDiv.addClass("node-diff-empty");
            }
            $('<span class="node-diff-status"><i class="fa fa-plus-square"></i> <span data-i18n="diff.type.added"></span></span>').appendTo(localNodeDiv);
            createNode(node,def).appendTo(originalNodeDiv);
        } else if (remoteDiff && remoteDiff.added[node.id]) {
            localNodeDiv.addClass("node-diff-empty");
            remoteNodeDiv.addClass("node-diff-node-added");
            $('<span class="node-diff-status"><i class="fa fa-plus-square"></i> <span data-i18n="diff.type.added"></span></span>').appendTo(remoteNodeDiv);
            createNode(node,def).appendTo(originalNodeDiv);
        } else {
            createNode(node,def).appendTo(originalNodeDiv);
            if (localDiff.moved[node.id]) {
                var localN = localDiff.newConfig.all[node.id];
                if (!localDiff.deleted[node.z] && node.z !== localN.z && node.z !== "" && !localDiff.newConfig.all[node.z]) {
                    localNodeDiv.addClass("node-diff-empty");
                } else {
                    localNodeDiv.addClass("node-diff-node-moved");
                    var localMovedMessage = "";
                    if (node.z === localN.z) {
                        localMovedMessage = RED._("diff.type.movedFrom",{id:(localDiff.currentConfig.all[node.id].z||'global')});
                    } else {
                        localMovedMessage = RED._("diff.type.movedTo",{id:(localN.z||'global')});
                    }
                    $('<span class="node-diff-status"><i class="fa fa-caret-square-o-right"></i> '+localMovedMessage+'</span>').appendTo(localNodeDiv);
                }
                localChanged = true;
            } else if (localDiff.deleted[node.z]) {
                localNodeDiv.addClass("node-diff-empty");
                localChanged = true;
            } else if (localDiff.deleted[node.id]) {
                localNodeDiv.addClass("node-diff-node-deleted");
                $('<span class="node-diff-status"><i class="fa fa-minus-square"></i> <span data-i18n="diff.type.deleted"></span></span>').appendTo(localNodeDiv);
                localChanged = true;
            } else if (localDiff.changed[node.id]) {
                if (localDiff.newConfig.all[node.id].z !== node.z) {
                    localNodeDiv.addClass("node-diff-empty");
                } else {
                    localNodeDiv.addClass("node-diff-node-changed");
                    $('<span class="node-diff-status"><i class="fa fa-square"></i> <span data-i18n="diff.type.changed"></span></span>').appendTo(localNodeDiv);
                    localChanged = true;
                }
            } else {
                if (localDiff.newConfig.all[node.id].z !== node.z) {
                    localNodeDiv.addClass("node-diff-empty");
                } else {
                    stats.local.unchangedCount++;
                    localNodeDiv.addClass("node-diff-node-unchanged");
                    $('<span class="node-diff-status"><i class="fa fa-square-o"></i> <span data-i18n="diff.type.unchanged"></span></span>').appendTo(localNodeDiv);
                }
            }

            if (remoteDiff) {
                if (remoteDiff.moved[node.id]) {
                    var remoteN = remoteDiff.newConfig.all[node.id];
                    if (!remoteDiff.deleted[node.z] && node.z !== remoteN.z && node.z !== "" && !remoteDiff.newConfig.all[node.z]) {
                        remoteNodeDiv.addClass("node-diff-empty");
                    } else {
                        remoteNodeDiv.addClass("node-diff-node-moved");
                        var remoteMovedMessage = "";
                        if (node.z === remoteN.z) {
                            remoteMovedMessage = RED._("diff.type.movedFrom",{id:(remoteDiff.currentConfig.all[node.id].z||'global')});
                        } else {
                            remoteMovedMessage = RED._("diff.type.movedTo",{id:(remoteN.z||'global')});
                        }
                        $('<span class="node-diff-status"><i class="fa fa-caret-square-o-right"></i> '+remoteMovedMessage+'</span>').appendTo(remoteNodeDiv);
                    }
                } else if (remoteDiff.deleted[node.z]) {
                    remoteNodeDiv.addClass("node-diff-empty");
                } else if (remoteDiff.deleted[node.id]) {
                    remoteNodeDiv.addClass("node-diff-node-deleted");
                    $('<span class="node-diff-status"><i class="fa fa-minus-square"></i> <span data-i18n="diff.type.deleted"></span></span>').appendTo(remoteNodeDiv);
                } else if (remoteDiff.changed[node.id]) {
                    if (remoteDiff.newConfig.all[node.id].z !== node.z) {
                        remoteNodeDiv.addClass("node-diff-empty");
                    } else {
                        remoteNodeDiv.addClass("node-diff-node-changed");
                        $('<span class="node-diff-status"><i class="fa fa-square"></i> <span data-i18n="diff.type.changed"></span></span>').appendTo(remoteNodeDiv);
                    }
                } else {
                    if (remoteDiff.newConfig.all[node.id].z !== node.z) {
                        remoteNodeDiv.addClass("node-diff-empty");
                    } else {
                        stats.remote.unchangedCount++;
                        remoteNodeDiv.addClass("node-diff-node-unchanged");
                        $('<span class="node-diff-status"><i class="fa fa-square-o"></i> <span data-i18n="diff.type.unchanged"></span></span>').appendTo(remoteNodeDiv);
                    }
                }
            }
        }
        var localNode = {
            node: localDiff.newConfig.all[node.id],
            all: localDiff.newConfig.all,
            diff: localDiff
        };
        var remoteNode;
        if (remoteDiff) {
            remoteNode = {
                node:remoteDiff.newConfig.all[node.id]||null,
                all: remoteDiff.newConfig.all,
                diff: remoteDiff
            }
        }
        createNodePropertiesTable(def,node,localNode,remoteNode).appendTo(div);

        var selectState = "";

        if (conflicted) {
            stats.conflicts++;
            if (!localNodeDiv.hasClass("node-diff-empty")) {
                $('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i></span></span>').prependTo(localNodeDiv);
            }
            if (!remoteNodeDiv.hasClass("node-diff-empty")) {
                $('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i></span></span>').prependTo(remoteNodeDiv);
            }
            div.addClass("node-diff-node-entry-conflict");
        } else {
            selectState = currentDiff.resolutions[node.id];
        }
        // Node row
        createNodeConflictRadioBoxes(node,div,localNodeDiv,remoteNodeDiv,false,!conflicted,selectState);
        row.click(function(evt) {
            $(this).parent().toggleClass('collapsed');
        });

        return div;
    }
    function createNodePropertiesTable(def,node,localNodeObj,remoteNodeObj) {
        var localNode = localNodeObj.node;
        var remoteNode;
        if (remoteNodeObj) {
            remoteNode = remoteNodeObj.node;
        }

        var nodePropertiesDiv = $("<div>",{class:"node-diff-node-entry-properties"});
        var nodePropertiesTable = $("<table>").appendTo(nodePropertiesDiv);
        var row;
        var localCell, remoteCell;
        var currentValue, localValue, remoteValue;
        var localChanged = false;
        var remoteChanged = false;
        var localChanges = 0;
        var remoteChanges = 0;
        var conflict = false;
        var status;

        row = $("<tr>").appendTo(nodePropertiesTable);
        $("<td>",{class:"node-diff-property-cell-label"}).html("id").appendTo(row);
        localCell = $("<td>",{class:"node-diff-property-cell node-diff-node-local"}).appendTo(row);
        if (localNode) {
            localCell.addClass("node-diff-node-unchanged");
            $('<span class="node-diff-status"></span>').appendTo(localCell);
            RED.utils.createObjectElement(localNode.id).appendTo(localCell);
        } else {
            localCell.addClass("node-diff-empty");
        }
        if (remoteNode !== undefined) {
            remoteCell = $("<td>",{class:"node-diff-property-cell node-diff-node-remote"}).appendTo(row);
            remoteCell.addClass("node-diff-node-unchanged");
            if (remoteNode) {
                $('<span class="node-diff-status"></span>').appendTo(remoteCell);
                RED.utils.createObjectElement(remoteNode.id).appendTo(remoteCell);
            } else {
                remoteCell.addClass("node-diff-empty");
            }
        }


        if (node.hasOwnProperty('x')) {
            if (localNode) {
                if (localNode.x !== node.x || localNode.y !== node.y) {
                    localChanged = true;
                    localChanges++;
                }
            }
            if (remoteNode) {
                if (remoteNode.x !== node.x || remoteNode.y !== node.y) {
                    remoteChanged = true;
                    remoteChanges++;
                }
            }
            if ( (remoteChanged && localChanged && (localNode.x !== remoteNode.x || localNode.y !== remoteNode.y)) ||
                (!localChanged && remoteChanged && localNodeObj.diff.deleted[node.id]) ||
                (localChanged && !remoteChanged && remoteNodeObj.diff.deleted[node.id])
            ) {
                conflict = true;
            }
            row = $("<tr>").appendTo(nodePropertiesTable);
            $("<td>",{class:"node-diff-property-cell-label"}).html("position").appendTo(row);
            localCell = $("<td>",{class:"node-diff-property-cell node-diff-node-local"}).appendTo(row);
            if (localNode) {
                localCell.addClass("node-diff-node-"+(localChanged?"changed":"unchanged"));
                $('<span class="node-diff-status">'+(localChanged?'<i class="fa fa-square"></i>':'')+'</span>').appendTo(localCell);
                RED.utils.createObjectElement({x:localNode.x,y:localNode.y}).appendTo(localCell);
            } else {
                localCell.addClass("node-diff-empty");
            }

            if (remoteNode !== undefined) {
                remoteCell = $("<td>",{class:"node-diff-property-cell node-diff-node-remote"}).appendTo(row);
                remoteCell.addClass("node-diff-node-"+(remoteChanged?"changed":"unchanged"));
                if (remoteNode) {
                    $('<span class="node-diff-status">'+(remoteChanged?'<i class="fa fa-square"></i>':'')+'</span>').appendTo(remoteCell);
                    RED.utils.createObjectElement({x:remoteNode.x,y:remoteNode.y}).appendTo(remoteCell);
                } else {
                    remoteCell.addClass("node-diff-empty");
                }
            }
        }
        //
        localChanged = remoteChanged = conflict = false;
        if (node.hasOwnProperty('wires')) {
            currentValue = JSON.stringify(node.wires);
            if (localNode) {
                localValue = JSON.stringify(localNode.wires);
                if (currentValue !== localValue) {
                    localChanged = true;
                    localChanges++;
                }
            }
            if (remoteNode) {
                remoteValue = JSON.stringify(remoteNode.wires);
                if (currentValue !== remoteValue) {
                    remoteChanged = true;
                    remoteChanges++;
                }
            }
            if ( (remoteChanged && localChanged && (localValue !== remoteValue)) ||
                (!localChanged && remoteChanged && localNodeObj.diff.deleted[node.id]) ||
                (localChanged && !remoteChanged && remoteNodeObj.diff.deleted[node.id])
            ){
                conflict = true;
            }
            row = $("<tr>").appendTo(nodePropertiesTable);
            $("<td>",{class:"node-diff-property-cell-label"}).html("wires").appendTo(row);
            localCell = $("<td>",{class:"node-diff-property-cell node-diff-node-local"}).appendTo(row);
            if (localNode) {
                if (!conflict) {
                    localCell.addClass("node-diff-node-"+(localChanged?"changed":"unchanged"));
                    $('<span class="node-diff-status">'+(localChanged?'<i class="fa fa-square"></i>':'')+'</span>').appendTo(localCell);
                } else {
                    localCell.addClass("node-diff-node-conflict");
                    $('<span class="node-diff-status"><i class="fa fa-exclamation"></i></span>').appendTo(localCell);
                }
                formatWireProperty(localNode.wires,localNodeObj.all).appendTo(localCell);
            } else {
                localCell.addClass("node-diff-empty");
            }

            if (remoteNode !== undefined) {
                remoteCell = $("<td>",{class:"node-diff-property-cell node-diff-node-remote"}).appendTo(row);
                if (remoteNode) {
                    if (!conflict) {
                        remoteCell.addClass("node-diff-node-"+(remoteChanged?"changed":"unchanged"));
                        $('<span class="node-diff-status">'+(remoteChanged?'<i class="fa fa-square"></i>':'')+'</span>').appendTo(remoteCell);
                    } else {
                        remoteCell.addClass("node-diff-node-conflict");
                        $('<span class="node-diff-status"><i class="fa fa-exclamation"></i></span>').appendTo(remoteCell);
                    }
                    formatWireProperty(remoteNode.wires,remoteNodeObj.all).appendTo(remoteCell);
                } else {
                    remoteCell.addClass("node-diff-empty");
                }
            }
        }
        var properties = Object.keys(node).filter(function(p) { return p!='z'&&p!='wires'&&p!=='x'&&p!=='y'&&p!=='id'&&p!=='type'&&(!def.defaults||!def.defaults.hasOwnProperty(p))});
        if (def.defaults) {
            properties = properties.concat(Object.keys(def.defaults));
        }
        properties.forEach(function(d) {
            localChanged = false;
            remoteChanged = false;
            conflict = false;
            currentValue = JSON.stringify(node[d]);
            if (localNode) {
                localValue = JSON.stringify(localNode[d]);
                if (currentValue !== localValue) {
                    localChanged = true;
                    localChanges++;
                }
            }
            if (remoteNode) {
                remoteValue = JSON.stringify(remoteNode[d]);
                if (currentValue !== remoteValue) {
                    remoteChanged = true;
                    remoteChanges++;
                }
            }

            if ( (remoteChanged && localChanged && (localValue !== remoteValue)) ||
                (!localChanged &&  remoteChanged && localNodeObj.diff.deleted[node.id]) ||
                (localChanged && !remoteChanged && remoteNodeObj.diff.deleted[node.id])
            ){
                conflict = true;
            }

            row = $("<tr>").appendTo(nodePropertiesTable);
            $("<td>",{class:"node-diff-property-cell-label"}).html(d).appendTo(row);
            localCell = $("<td>",{class:"node-diff-property-cell node-diff-node-local"}).appendTo(row);
            if (localNode) {
                if (!conflict) {
                    localCell.addClass("node-diff-node-"+(localChanged?"changed":"unchanged"));
                    $('<span class="node-diff-status">'+(localChanged?'<i class="fa fa-square"></i>':'')+'</span>').appendTo(localCell);
                } else {
                    localCell.addClass("node-diff-node-conflict");
                    $('<span class="node-diff-status"><i class="fa fa-exclamation"></i></span>').appendTo(localCell);
                }
                RED.utils.createObjectElement(localNode[d]).appendTo(localCell);
            } else {
                localCell.addClass("node-diff-empty");
            }
            if (remoteNode !== undefined) {
                remoteCell = $("<td>",{class:"node-diff-property-cell node-diff-node-remote"}).appendTo(row);
                if (remoteNode) {
                    if (!conflict) {
                        remoteCell.addClass("node-diff-node-"+(remoteChanged?"changed":"unchanged"));
                        $('<span class="node-diff-status">'+(remoteChanged?'<i class="fa fa-square"></i>':'')+'</span>').appendTo(remoteCell);
                    } else {
                        remoteCell.addClass("node-diff-node-conflict");
                        $('<span class="node-diff-status"><i class="fa fa-exclamation"></i></span>').appendTo(remoteCell);
                    }
                    RED.utils.createObjectElement(remoteNode[d]).appendTo(remoteCell);
                } else {
                    remoteCell.addClass("node-diff-empty");
                }
            }
        });
        return nodePropertiesDiv;
    }
    function createNodeConflictRadioBoxes(node,row,localDiv,remoteDiv,propertiesTable,hide,state) {
        var safeNodeId = "node-diff-selectbox-"+node.id.replace(/\./g,'-')+(propertiesTable?"-props":"");
        var className = "";
        if (node.z||propertiesTable) {
            className = "node-diff-selectbox-tab-"+(propertiesTable?node.id:node.z).replace(/\./g,'-');
        }
        var titleRow = !propertiesTable && (node.type === 'tab' || node.type === 'subflow');
        var changeHandler = function(evt) {
            var className;
            if (node.type === undefined) {
                // TODO: handle globals
            } else if (titleRow) {
                className = "node-diff-selectbox-tab-"+node.id.replace(/\./g,'-');
                $("."+className+"-"+this.value).prop('checked',true);
                if (this.value === 'local') {
                    $("."+className+"-"+this.value).closest(".node-diff-node-entry").addClass("node-diff-select-local");
                    $("."+className+"-"+this.value).closest(".node-diff-node-entry").removeClass("node-diff-select-remote");
                } else {
                    $("."+className+"-"+this.value).closest(".node-diff-node-entry").removeClass("node-diff-select-local");
                    $("."+className+"-"+this.value).closest(".node-diff-node-entry").addClass("node-diff-select-remote");
                }
            } else {
                // Individual node or properties table
                var parentId = "node-diff-selectbox-"+(propertiesTable?node.id:node.z).replace(/\./g,'-');
                $('#'+parentId+"-local").prop('checked',false);
                $('#'+parentId+"-remote").prop('checked',false);
                var titleRowDiv = $('#'+parentId+"-local").closest(".node-diff-tab").find(".node-diff-tab-title");
                titleRowDiv.removeClass("node-diff-select-local");
                titleRowDiv.removeClass("node-diff-select-remote");
            }
            if (this.value === 'local') {
                row.removeClass("node-diff-select-remote");
                row.addClass("node-diff-select-local");
            } else if (this.value === 'remote') {
                row.addClass("node-diff-select-remote");
                row.removeClass("node-diff-select-local");
            }
            refreshConflictHeader();
        }

        var localSelectDiv = $('<label>',{class:"node-diff-selectbox",for:safeNodeId+"-local"}).click(function(e) { e.stopPropagation();}).appendTo(localDiv);
        var localRadio = $('<input>',{id:safeNodeId+"-local",type:'radio',value:"local",name:safeNodeId,class:className+"-local"+(titleRow?"":" node-diff-select-node")}).data('node-id',node.id).change(changeHandler).appendTo(localSelectDiv);
        var remoteSelectDiv = $('<label>',{class:"node-diff-selectbox",for:safeNodeId+"-remote"}).click(function(e) { e.stopPropagation();}).appendTo(remoteDiv);
        var remoteRadio = $('<input>',{id:safeNodeId+"-remote",type:'radio',value:"remote",name:safeNodeId,class:className+"-remote"+(titleRow?"":" node-diff-select-node")}).data('node-id',node.id).change(changeHandler).appendTo(remoteSelectDiv);
        if (state === 'local') {
            localRadio.prop('checked',true);
        } else if (state === 'remote') {
            remoteRadio.prop('checked',true);
        }
        if (hide||localDiv.hasClass("node-diff-empty") || remoteDiv.hasClass("node-diff-empty")) {
            localSelectDiv.hide();
            remoteSelectDiv.hide();
        }

    }
    function refreshConflictHeader() {
        var resolutionCount = 0;
        $(".node-diff-selectbox>input:checked").each(function() {
            if (currentDiff.conflicts[$(this).data('node-id')]) {
                resolutionCount++;
            }
            currentDiff.resolutions[$(this).data('node-id')] = $(this).val();
        })
        var conflictCount = Object.keys(currentDiff.conflicts).length;
        if (conflictCount - resolutionCount === 0) {
            $("#node-diff-toolbar-resolved-conflicts").html('<span class="node-diff-node-added"><span class="node-diff-status"><i class="fa fa-check"></i></span></span> '+RED._("diff.unresolvedCount",{count:conflictCount - resolutionCount}));
        } else {
            $("#node-diff-toolbar-resolved-conflicts").html('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i></span></span> '+RED._("diff.unresolvedCount",{count:conflictCount - resolutionCount}));
        }
        if (conflictCount === resolutionCount) {
            $("#node-diff-view-diff-merge").removeClass('disabled');
        }
    }
    function getRemoteDiff(callback) {
        $.ajax({
            headers: {
                "Accept":"application/json",
            },
            cache: false,
            url: 'flows',
            success: function(nodes) {
                var localFlow = RED.nodes.createCompleteNodeSet();
                var originalFlow = RED.nodes.originalFlow();
                var remoteFlow = nodes.flows;
                var localDiff = generateDiff(originalFlow,localFlow);
                var remoteDiff = generateDiff(originalFlow,remoteFlow);
                remoteDiff.rev = nodes.rev;
                callback(resolveDiffs(localDiff,remoteDiff))
            }
        });

    }
    // function showLocalDiff() {
    //     var nns = RED.nodes.createCompleteNodeSet();
    //     var originalFlow = RED.nodes.originalFlow();
    //     var diff = generateDiff(originalFlow,nns);
    //     showDiff(diff);
    // }
    function showRemoteDiff(diff) {
        if (diff === undefined) {
            getRemoteDiff(showRemoteDiff);
        } else {
            showDiff(diff);
        }
    }
    function parseNodes(nodeList) {
        var tabOrder = [];
        var tabs = {};
        var subflows = {};
        var globals = [];
        var all = {};

        nodeList.forEach(function(node) {
            all[node.id] = node;
            if (node.type === 'tab') {
                tabOrder.push(node.id);
                tabs[node.id] = {n:node,nodes:[]};
            } else if (node.type === 'subflow') {
                subflows[node.id] = {n:node,nodes:[]};
            }
        });

        nodeList.forEach(function(node) {
            if (node.type !== 'tab' && node.type !== 'subflow') {
                if (tabs[node.z]) {
                    tabs[node.z].nodes.push(node);
                } else if (subflows[node.z]) {
                    subflows[node.z].nodes.push(node);
                } else {
                    globals.push(node);
                }
            }
        });

        return {
            all: all,
            tabOrder: tabOrder,
            tabs: tabs,
            subflows: subflows,
            globals: globals
        }
    }
    function generateDiff(currentNodes,newNodes) {
        var currentConfig = parseNodes(currentNodes);
        var newConfig = parseNodes(newNodes);
        var added = {};
        var deleted = {};
        var changed = {};
        var moved = {};

        Object.keys(currentConfig.all).forEach(function(id) {
            var node = RED.nodes.workspace(id)||RED.nodes.subflow(id)||RED.nodes.node(id);
            if (!newConfig.all.hasOwnProperty(id)) {
                deleted[id] = true;
            } else if (JSON.stringify(currentConfig.all[id]) !== JSON.stringify(newConfig.all[id])) {
                changed[id] = true;

                if (currentConfig.all[id].z !== newConfig.all[id].z) {
                    moved[id] = true;
                }
            }
        });
        Object.keys(newConfig.all).forEach(function(id) {
            if (!currentConfig.all.hasOwnProperty(id)) {
                added[id] = true;
            }
        });

        return {
            currentConfig: currentConfig,
            newConfig: newConfig,
            added: added,
            deleted: deleted,
            changed: changed,
            moved: moved
        }
    }
    function resolveDiffs(localDiff,remoteDiff) {
        var conflicted = {};
        var resolutions = {};

        var diff = {
            localDiff: localDiff,
            remoteDiff: remoteDiff,
            conflicts: conflicted,
            resolutions: resolutions
        }
        var seen = {};
        var id,node;
        for (id in localDiff.currentConfig.all) {
            if (localDiff.currentConfig.all.hasOwnProperty(id)) {
                seen[id] = true;
                var localNode = localDiff.newConfig.all[id];
                if (localDiff.changed[id] && remoteDiff.deleted[id]) {
                    conflicted[id] = true;
                } else if (localDiff.deleted[id] && remoteDiff.changed[id]) {
                    conflicted[id] = true;
                } else if (localDiff.changed[id] && remoteDiff.changed[id]) {
                    var remoteNode = remoteDiff.newConfig.all[id];
                    if (JSON.stringify(localNode) !== JSON.stringify(remoteNode)) {
                        conflicted[id] = true;
                    }
                }
                if (!conflicted[id]) {
                    if (remoteDiff.added[id]||remoteDiff.changed[id]||remoteDiff.deleted[id]) {
                        resolutions[id] = 'remote';
                    } else {
                        resolutions[id] = 'local';
                    }
                }
            }
        }
        for (id in localDiff.added) {
            if (localDiff.added.hasOwnProperty(id)) {
                node = localDiff.newConfig.all[id];
                if (remoteDiff.deleted[node.z]) {
                    conflicted[id] = true;
                    // conflicted[node.z] = true;
                } else {
                    resolutions[id] = 'local';
                }
            }
        }
        for (id in remoteDiff.added) {
            if (remoteDiff.added.hasOwnProperty(id)) {
                node = remoteDiff.newConfig.all[id];
                if (localDiff.deleted[node.z]) {
                    conflicted[id] = true;
                    // conflicted[node.z] = true;
                } else {
                    resolutions[id] = 'remote';
                }
            }
        }
        // console.log(diff.resolutions);
        // console.log(conflicted);
        return diff;
    }
    function showDiff(diff) {
        var localDiff = diff.localDiff;
        var remoteDiff = diff.remoteDiff;
        var conflicts = diff.conflicts;
        currentDiff = diff;
        var list = $("#node-dialog-view-diff-diff");
        list.editableList('empty');

        if (remoteDiff) {
            $("#node-diff-view-diff-merge").show();
            if (Object.keys(conflicts).length === 0) {
                $("#node-diff-view-diff-merge").removeClass('disabled');
            } else {
                $("#node-diff-view-diff-merge").addClass('disabled');
            }
        } else {
            $("#node-diff-view-diff-merge").hide();
        }
        refreshConflictHeader();

        $("#node-dialog-view-diff-headers").empty();
        // console.log("--------------");
        // console.log(localDiff);
        // console.log(remoteDiff);
        var currentConfig = localDiff.currentConfig;
        var newConfig = localDiff.newConfig;
        conflicts = conflicts || {};

        var el = {
            diff: localDiff,
            def: {
                category: 'config',
                color: '#f0f0f0'
            },
            tab: {
                n: {},
                nodes: currentConfig.globals
            },
            newTab: {
                n: {},
                nodes: newConfig.globals
            }
        };

        if (remoteDiff !== undefined) {
            $('#node-dialog-view-diff').addClass('node-diff-three-way');

            $('<div class="node-diff-node-entry-cell"></div><div class="node-diff-node-entry-cell" data-i18n="diff.local"></div><div class="node-diff-node-entry-cell" data-i18n="diff.remote"></div>').i18n().appendTo("#node-dialog-view-diff-headers");
            el.remoteTab = {
                n:{},
                nodes:remoteDiff.newConfig.globals
            };
            el.remoteDiff = remoteDiff;
        } else {
            $('#node-dialog-view-diff').removeClass('node-diff-three-way');
        }

        list.editableList('addItem',el);

        var seenTabs = {};

        currentConfig.tabOrder.forEach(function(tabId) {
            var tab = currentConfig.tabs[tabId];
            var el = {
                diff: localDiff,
                def: {},
                tab:tab
            };
            if (newConfig.tabs.hasOwnProperty(tabId)) {
                el.newTab = newConfig.tabs[tabId];
            }
            if (remoteDiff !== undefined) {
                el.remoteTab = remoteDiff.newConfig.tabs[tabId];
                el.remoteDiff = remoteDiff;
            }
            seenTabs[tabId] = true;
            list.editableList('addItem',el)
        });
        newConfig.tabOrder.forEach(function(tabId) {
            if (!seenTabs[tabId]) {
                seenTabs[tabId] = true;
                var tab = newConfig.tabs[tabId];
                var el = {
                    diff: localDiff,
                    def: {},
                    tab:tab,
                    newTab: tab
                };
                if (remoteDiff !== undefined) {
                    el.remoteDiff = remoteDiff;
                }
                list.editableList('addItem',el)
            }
        });
        if (remoteDiff !== undefined) {
            remoteDiff.newConfig.tabOrder.forEach(function(tabId) {
                if (!seenTabs[tabId]) {
                    var tab = remoteDiff.newConfig.tabs[tabId];
                    // TODO how to recognise this is a remotely added flow
                    var el = {
                        diff: localDiff,
                        remoteDiff: remoteDiff,
                        def: {},
                        tab:tab,
                        remoteTab:tab
                    };
                    list.editableList('addItem',el)
                }
            });
        }
        var subflowId;
        for (subflowId in currentConfig.subflows) {
            if (currentConfig.subflows.hasOwnProperty(subflowId)) {
                seenTabs[subflowId] = true;
                el = {
                    diff: localDiff,
                    def: {
                        defaults:{},
                        icon:"subflow.png",
                        category: "subflows",
                        color: "#da9"
                    },
                    tab:currentConfig.subflows[subflowId]
                }
                if (newConfig.subflows.hasOwnProperty(subflowId)) {
                    el.newTab = newConfig.subflows[subflowId];
                }
                if (remoteDiff !== undefined) {
                    el.remoteTab = remoteDiff.newConfig.subflows[subflowId];
                    el.remoteDiff = remoteDiff;
                }
                list.editableList('addItem',el)
            }
        }
        for (subflowId in newConfig.subflows) {
            if (newConfig.subflows.hasOwnProperty(subflowId) && !seenTabs[subflowId]) {
                seenTabs[subflowId] = true;
                el = {
                    diff: localDiff,
                    def: {
                        defaults:{},
                        icon:"subflow.png",
                        category: "subflows",
                        color: "#da9"
                    },
                    tab:newConfig.subflows[subflowId],
                    newTab:newConfig.subflows[subflowId]
                }
                if (remoteDiff !== undefined) {
                    el.remoteDiff = remoteDiff;
                }
                list.editableList('addItem',el)
            }
        }
        if (remoteDiff !== undefined) {
            for (subflowId in remoteDiff.newConfig.subflows) {
                if (remoteDiff.newConfig.subflows.hasOwnProperty(subflowId) && !seenTabs[subflowId]) {
                    el = {
                        diff: localDiff,
                        remoteDiff: remoteDiff,
                        def: {
                            defaults:{},
                            icon:"subflow.png",
                            category: "subflows",
                            color: "#da9"
                        },
                        tab:remoteDiff.newConfig.subflows[subflowId],
                        remoteTab: remoteDiff.newConfig.subflows[subflowId]
                    }
                    list.editableList('addItem',el)
                }
            }
        }


        $("#node-diff-filter-changed").addClass("selected");
        $("#node-diff-filter-all").removeClass("selected");

        $("#node-dialog-view-diff").dialog("open");
    }
    function mergeDiff(diff) {
        var currentConfig = diff.localDiff.currentConfig;
        var localDiff = diff.localDiff;
        var remoteDiff = diff.remoteDiff;
        var conflicts = diff.conflicts;
        var resolutions = diff.resolutions;
        var id;

        for (id in conflicts) {
            if (conflicts.hasOwnProperty(id)) {
                if (!resolutions.hasOwnProperty(id)) {
                    console.log(diff);
                    throw new Error("No resolution for conflict on node",id);
                }
            }
        }

        var newConfig = [];
        var node;
        var nodeChangedStates = {};
        var localChangedStates = {};
        for (id in localDiff.newConfig.all) {
            if (localDiff.newConfig.all.hasOwnProperty(id)) {
                node = RED.nodes.node(id);
                if (resolutions[id] === 'local') {
                    if (node) {
                        nodeChangedStates[id] = node.changed;
                    }
                    newConfig.push(localDiff.newConfig.all[id]);
                } else if (resolutions[id] === 'remote') {
                    if (!remoteDiff.deleted[id] && remoteDiff.newConfig.all.hasOwnProperty(id)) {
                        if (node) {
                            nodeChangedStates[id] = node.changed;
                        }
                        localChangedStates[id] = true;
                        newConfig.push(remoteDiff.newConfig.all[id]);
                    }
                } else {
                    console.log("Unresolved",id)
                }
            }
        }
        for (id in remoteDiff.added) {
            if (remoteDiff.added.hasOwnProperty(id)) {
                node = RED.nodes.node(id);
                if (node) {
                    nodeChangedStates[id] = node.changed;
                }
                if (!localDiff.added.hasOwnProperty(id)) {
                    localChangedStates[id] = true;
                    newConfig.push(remoteDiff.newConfig.all[id]);
                }
            }
        }
        var historyEvent = {
            t:"replace",
            config: RED.nodes.createCompleteNodeSet(),
            changed: nodeChangedStates,
            dirty: RED.nodes.dirty(),
            rev: RED.nodes.version()
        }

        RED.history.push(historyEvent);

        RED.nodes.clear();
        var imported = RED.nodes.import(newConfig);
        imported[0].forEach(function(n) {
            if (nodeChangedStates[n.id] || localChangedStates[n.id]) {
                n.changed = true;
            }
        })

        RED.nodes.version(remoteDiff.rev);

        RED.view.redraw(true);
        RED.palette.refresh();
        RED.workspaces.refresh();
        RED.sidebar.config.refresh();

    }
    return {
        init: init,
        getRemoteDiff: getRemoteDiff,
        showRemoteDiff: showRemoteDiff,
        mergeDiff: mergeDiff
    }
})();
;/**
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
RED.keyboard = (function() {

    var isMac = /Mac/i.test(window.navigator.platform);

    var handlers = {};
    var partialState;

    var keyMap = {
        "left":37,
        "up":38,
        "right":39,
        "down":40,
        "escape":27,
        "enter": 13,
        "backspace": 8,
        "delete": 46,
        "space": 32,
        ";":186,
        "=":187,
        ",":188,
        "-":189,
        ".":190,
        "/":191,
        "\\":220,
        "'":222,
        "?":191 // <- QWERTY specific
    }
    var metaKeyCodes = {
        16:true,
        17:true,
        18: true,
        91:true,
        93: true
    }
    var actionToKeyMap = {}
    var defaultKeyMap = {};

    // FF generates some different keycodes because reasons.
    var firefoxKeyCodeMap = {
        59:186,
        61:187,
        173:189
    }

    function init() {
        var userKeymap = RED.settings.get('keymap') || {};
        $.getJSON("red/keymap.json",function(data) {
            for (var scope in data) {
                if (data.hasOwnProperty(scope)) {
                    var keys = data[scope];
                    for (var key in keys) {
                        if (keys.hasOwnProperty(key)) {
                            if (!userKeymap.hasOwnProperty(keys[key])) {
                                addHandler(scope,key,keys[key],false);
                                defaultKeyMap[keys[key]] = {
                                    scope:scope,
                                    key:key,
                                    user:false
                                };
                            }
                        }
                    }
                }
            }
            for (var action in userKeymap) {
                if (userKeymap.hasOwnProperty(action)) {
                    var obj = userKeymap[action];
                    if (obj.hasOwnProperty('key')) {
                        addHandler(obj.scope, obj.key, action, true);
                    }
                }
            }
        });

        RED.userSettings.add({
            id:'keyboard',
            title: 'Keyboard',
            get: getSettingsPane,
            focus: function() {
                setTimeout(function() {
                    $("#user-settings-tab-keyboard-filter").focus();
                },200);
            }
        })
    }

    function revertToDefault(action) {
        var currentAction = actionToKeyMap[action];
        if (currentAction) {
            removeHandler(currentAction.key);
        }
        if (defaultKeyMap.hasOwnProperty(action)) {
            var obj = defaultKeyMap[action];
            addHandler(obj.scope, obj.key, action, false);
        }
    }
    function parseKeySpecifier(key) {
        var parts = key.toLowerCase().split("-");
        var modifiers = {};
        var keycode;
        var blank = 0;
        for (var i=0;i<parts.length;i++) {
            switch(parts[i]) {
                case "ctrl":
                case "cmd":
                    modifiers.ctrl = true;
                    modifiers.meta = true;
                    break;
                case "alt":
                    modifiers.alt = true;
                    break;
                case "shift":
                    modifiers.shift = true;
                    break;
                case "":
                    blank++;
                    keycode = keyMap["-"];
                    break;
                default:
                    if (keyMap.hasOwnProperty(parts[i])) {
                        keycode = keyMap[parts[i]];
                    } else if (parts[i].length > 1) {
                        return null;
                    } else {
                        keycode = parts[i].toUpperCase().charCodeAt(0);
                    }
                    break;
            }
        }
        return [keycode,modifiers];
    }

    function resolveKeyEvent(evt) {
        var slot = partialState||handlers;
        if (evt.ctrlKey || evt.metaKey) {
            slot = slot.ctrl;
        }
        if (slot && evt.shiftKey) {
            slot = slot.shift;
        }
        if (slot && evt.altKey) {
            slot = slot.alt;
        }
        var keyCode = firefoxKeyCodeMap[evt.keyCode] || evt.keyCode;
        if (slot && slot[keyCode]) {
            var handler = slot[keyCode];
            if (!handler.scope) {
                if (partialState) {
                    partialState = null;
                    return resolveKeyEvent(evt);
                } else if (Object.keys(handler).length > 0) {
                    partialState = handler;
                    evt.preventDefault();
                    return null;
                } else {
                    return null;
                }
            } else if (handler.scope && handler.scope !== "*") {
                var target = evt.target;
                while (target.nodeName !== 'BODY' && target.id !== handler.scope) {
                    target = target.parentElement;
                }
                if (target.nodeName === 'BODY') {
                    handler = null;
                }
            }
            partialState = null;
            return handler;
        } else if (partialState) {
            partialState = null;
            return resolveKeyEvent(evt);
        }
    }
    d3.select(window).on("keydown",function() {
        if (metaKeyCodes[d3.event.keyCode]) {
            return;
        }
        var handler = resolveKeyEvent(d3.event);
        if (handler && handler.ondown) {
            if (typeof handler.ondown === "string") {
                RED.actions.invoke(handler.ondown);
            } else {
                handler.ondown();
            }
            d3.event.preventDefault();
        }
    });

    function addHandler(scope,key,modifiers,ondown) {
        var mod = modifiers;
        var cbdown = ondown;
        if (typeof modifiers == "function" || typeof modifiers === "string") {
            mod = {};
            cbdown = modifiers;
        }
        var keys = [];
        var i=0;
        if (typeof key === 'string') {
            if (typeof cbdown === 'string') {
                actionToKeyMap[cbdown] = {scope:scope,key:key};
                if (typeof ondown === 'boolean') {
                    actionToKeyMap[cbdown].user = ondown;
                }
            }
            var parts = key.split(" ");
            for (i=0;i<parts.length;i++) {
                var parsedKey = parseKeySpecifier(parts[i]);
                if (parsedKey) {
                    keys.push(parsedKey);
                } else {
                    return;
                }
            }
        } else {
            keys.push([key,mod])
        }
        var slot = handlers;
        for (i=0;i<keys.length;i++) {
            key = keys[i][0];
            mod = keys[i][1];
            if (mod.ctrl) {
                slot.ctrl = slot.ctrl||{};
                slot = slot.ctrl;
            }
            if (mod.shift) {
                slot.shift = slot.shift||{};
                slot = slot.shift;
            }
            if (mod.alt) {
                slot.alt = slot.alt||{};
                slot = slot.alt;
            }
            slot[key] = slot[key] || {};
            slot = slot[key];
            //slot[key] = {scope: scope, ondown:cbdown};
        }
        slot.scope = scope;
        slot.ondown = cbdown;
    }

    function removeHandler(key,modifiers) {
        var mod = modifiers || {};
        var keys = [];
        var i=0;
        if (typeof key === 'string') {

            var parts = key.split(" ");
            for (i=0;i<parts.length;i++) {
                var parsedKey = parseKeySpecifier(parts[i]);
                if (parsedKey) {
                    keys.push(parsedKey);
                } else {
                    console.log("Unrecognised key specifier:",key)
                    return;
                }
            }
        } else {
            keys.push([key,mod])
        }
        var slot = handlers;
        for (i=0;i<keys.length;i++) {
            key = keys[i][0];
            mod = keys[i][1];
            if (mod.ctrl) {
                slot = slot.ctrl;
            }
            if (slot && mod.shift) {
                slot = slot.shift;
            }
            if (slot && mod.alt) {
                slot = slot.alt;
            }
            if (!slot[key]) {
                return;
            }
            slot = slot[key];
        }
        if (typeof slot.ondown === "string") {
            if (typeof modifiers === 'boolean' && modifiers) {
                actionToKeyMap[slot.ondown] = {user: modifiers}
            } else {
                delete actionToKeyMap[slot.ondown];
            }
        }
        delete slot.scope;
        delete slot.ondown;
    }

    var cmdCtrlKey = '<span class="help-key">'+(isMac?'&#8984;':'Ctrl')+'</span>';

    function formatKey(key) {
        var formattedKey = isMac?key.replace(/ctrl-?/,"&#8984;"):key;
        formattedKey = isMac?formattedKey.replace(/alt-?/,"&#8997;"):key;
        formattedKey = formattedKey.replace(/shift-?/,"&#8679;")
        formattedKey = formattedKey.replace(/left/,"&#x2190;")
        formattedKey = formattedKey.replace(/up/,"&#x2191;")
        formattedKey = formattedKey.replace(/right/,"&#x2192;")
        formattedKey = formattedKey.replace(/down/,"&#x2193;")
        return '<span class="help-key-block"><span class="help-key">'+formattedKey.split(" ").join('</span> <span class="help-key">')+'</span></span>';
    }

    function validateKey(key) {
        key = key.trim();
        var parts = key.split(" ");
        for (i=0;i<parts.length;i++) {
            var parsedKey = parseKeySpecifier(parts[i]);
            if (!parsedKey) {
                return false;
            }
        }
        return true;
    }

    function editShortcut(e) {
        e.preventDefault();
        var container = $(this);
        var object = container.data('data');


        if (!container.hasClass('keyboard-shortcut-entry-expanded')) {
            endEditShortcut();

            var key = container.find(".keyboard-shortcut-entry-key");
            var scope = container.find(".keyboard-shortcut-entry-scope");
            container.addClass('keyboard-shortcut-entry-expanded');

            var keyInput = $('<input type="text">').attr('placeholder',RED._('keyboard.unassigned')).val(object.key||"").appendTo(key);
            keyInput.on("keyup",function(e) {
                if (e.keyCode === 13) {
                    return endEditShortcut();
                }
                var currentVal = $(this).val();
                currentVal = currentVal.trim();
                var valid = (currentVal === "" || RED.keyboard.validateKey(currentVal));
                $(this).toggleClass("input-error",!valid);
            })

            var scopeSelect = $('<select><option value="*">global</option><option value="workspace">workspace</option></select>').appendTo(scope);
            scopeSelect.val(object.scope||'*');

            var div = $('<div class="keyboard-shortcut-edit button-group-vertical"></div>').appendTo(scope);
            var okButton = $('<button class="editor-button editor-button-small"><i class="fa fa-check"></i></button>').appendTo(div);
            var revertButton = $('<button class="editor-button editor-button-small"><i class="fa fa-reply"></i></button>').appendTo(div);

            okButton.click(function(e) {
                e.stopPropagation();
                endEditShortcut();
            });
            revertButton.click(function(e) {
                e.stopPropagation();
                RED.keyboard.revertToDefault(object.id);
                container.empty();
                container.removeClass('keyboard-shortcut-entry-expanded');
                var shortcut = RED.keyboard.getShortcut(object.id);
                var userKeymap = RED.settings.get('keymap') || {};
                delete userKeymap[object.id];
                RED.settings.set('keymap',userKeymap);

                var obj = {
                    id:object.id,
                    scope:shortcut?shortcut.scope:undefined,
                    key:shortcut?shortcut.key:undefined,
                    user:shortcut?shortcut.user:undefined
                }
                buildShortcutRow(container,obj);
            })

            keyInput.focus();
        }
    }

    function endEditShortcut(cancel) {
        var container = $('.keyboard-shortcut-entry-expanded');
        if (container.length === 1) {
            var object = container.data('data');
            var keyInput = container.find(".keyboard-shortcut-entry-key input");
            var scopeSelect = container.find(".keyboard-shortcut-entry-scope select");
            if (!cancel) {
                var key = keyInput.val().trim();
                var scope = scopeSelect.val();
                var valid = (key === "" || RED.keyboard.validateKey(key));
                if (valid) {
                    var current = RED.keyboard.getShortcut(object.id);
                    if ((!current && key) || (current && (current.scope !== scope || current.key !== key))) {
                        var keyDiv = container.find(".keyboard-shortcut-entry-key");
                        var scopeDiv = container.find(".keyboard-shortcut-entry-scope");
                        keyDiv.empty();
                        scopeDiv.empty();
                        if (object.key) {
                            RED.keyboard.remove(object.key,true);
                        }
                        container.find(".keyboard-shortcut-entry-text i").css("opacity",1);
                        if (key === "") {
                            keyDiv.parent().addClass("keyboard-shortcut-entry-unassigned");
                            keyDiv.append($('<span>').text(RED._('keyboard.unassigned'))  );
                            delete object.key;
                            delete object.scope;
                        } else {
                            keyDiv.parent().removeClass("keyboard-shortcut-entry-unassigned");
                            keyDiv.append(RED.keyboard.formatKey(key))
                            $("<span>").text(scope).appendTo(scopeDiv);
                            object.key = key;
                            object.scope = scope;
                            RED.keyboard.add(object.scope,object.key,object.id,true);
                        }
                        var userKeymap = RED.settings.get('keymap') || {};
                        userKeymap[object.id] = RED.keyboard.getShortcut(object.id);
                        RED.settings.set('keymap',userKeymap);
                    }
                }
            }
            keyInput.remove();
            scopeSelect.remove();
            $('.keyboard-shortcut-edit').remove();
            container.removeClass('keyboard-shortcut-entry-expanded');
        }
    }

    function buildShortcutRow(container,object) {
        var item = $('<div class="keyboard-shortcut-entry">').appendTo(container);
        container.data('data',object);

        var text = object.id.replace(/(^.+:([a-z]))|(-([a-z]))/g,function() {
            if (arguments[5] === 0) {
                return arguments[2].toUpperCase();
            } else {
                return " "+arguments[4].toUpperCase();
            }
        });
        var label = $('<div>').addClass("keyboard-shortcut-entry-text").text(text).appendTo(item);

        var user = $('<i class="fa fa-user"></i>').prependTo(label);

        if (!object.user) {
            user.css("opacity",0);
        }

        var key = $('<div class="keyboard-shortcut-entry-key">').appendTo(item);
        if (object.key) {
            key.append(RED.keyboard.formatKey(object.key));
        } else {
            item.addClass("keyboard-shortcut-entry-unassigned");
            key.append($('<span>').text(RED._('keyboard.unassigned'))  );
        }

        var scope = $('<div class="keyboard-shortcut-entry-scope">').appendTo(item);

        $("<span>").text(object.scope === '*'?'global':object.scope||"").appendTo(scope);
        container.click(editShortcut);
    }

    function getSettingsPane() {
        var pane = $('<div id="user-settings-tab-keyboard"></div>');

        $('<div class="keyboard-shortcut-entry keyboard-shortcut-list-header">'+
        '<div class="keyboard-shortcut-entry-key keyboard-shortcut-entry-text"><input id="user-settings-tab-keyboard-filter" type="text" placeholder="filter actions"></div>'+
        '<div class="keyboard-shortcut-entry-key">shortcut</div>'+
        '<div class="keyboard-shortcut-entry-scope">scope</div>'+
        '</div>').appendTo(pane);

        pane.find("input").searchBox({
            delay: 100,
            change: function() {
                var filterValue = $(this).val().trim();
                if (filterValue === "") {
                    shortcutList.editableList('filter', null);
                } else {
                    filterValue = filterValue.replace(/\s/g,"");
                    shortcutList.editableList('filter', function(data) {
                        return data.id.toLowerCase().replace(/^.*:/,"").replace("-","").indexOf(filterValue) > -1;
                    })
                }
            }
        });

        var shortcutList = $('<ol class="keyboard-shortcut-list"></ol>').css({
            position: "absolute",
            top: "32px",
            bottom: "0",
            left: "0",
            right: "0"
        }).appendTo(pane).editableList({
            addButton: false,
            scrollOnAdd: false,
            addItem: function(container,i,object) {
                buildShortcutRow(container,object);
            },

        });
        var shortcuts = RED.actions.list();
        shortcuts.sort(function(A,B) {
            var Aid = A.id.replace(/^.*:/,"").replace(/[ -]/g,"").toLowerCase();
            var Bid = B.id.replace(/^.*:/,"").replace(/[ -]/g,"").toLowerCase();
            return Aid.localeCompare(Bid);
        });
        shortcuts.forEach(function(s) {
            shortcutList.editableList('addItem',s);
        });
        return pane;
    }

    return {
        init: init,
        add: addHandler,
        remove: removeHandler,
        getShortcut: function(actionName) {
            return actionToKeyMap[actionName];
        },
        revertToDefault: revertToDefault,
        formatKey: formatKey,
        validateKey: validateKey
    }

})();
;/**
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


RED.workspaces = (function() {

    var activeWorkspace = 0;
    var workspaceIndex = 0;

    function addWorkspace(ws,skipHistoryEntry) {
        if (ws) {
            workspace_tabs.addTab(ws);
            workspace_tabs.resize();
        } else {
            var tabId = RED.nodes.id();
            do {
                workspaceIndex += 1;
            } while ($("#workspace-tabs a[title='"+RED._('workspace.defaultName',{number:workspaceIndex})+"']").size() !== 0);

            ws = {type:"tab",id:tabId,label:RED._('workspace.defaultName',{number:workspaceIndex})};
            RED.nodes.addWorkspace(ws);
            workspace_tabs.addTab(ws);
            workspace_tabs.activateTab(tabId);
            if (!skipHistoryEntry) {
                RED.history.push({t:'add',workspaces:[ws],dirty:RED.nodes.dirty()});
                RED.nodes.dirty(true);
            }
        }
        RED.view.focus();
        return ws;
    }
    function deleteWorkspace(ws) {
        if (workspace_tabs.count() == 1) {
            return;
        }
        removeWorkspace(ws);
        var historyEvent = RED.nodes.removeWorkspace(ws.id);
        historyEvent.t = 'delete';
        historyEvent.dirty = RED.nodes.dirty();
        historyEvent.workspaces = [ws];
        RED.history.push(historyEvent);
        RED.nodes.dirty(true);
        RED.sidebar.config.refresh();
    }

    function showRenameWorkspaceDialog(id) {
        var workspace = RED.nodes.workspace(id);
        RED.view.state(RED.state.EDITING);
        var tabflowEditor;
        var trayOptions = {
            title: RED._("workspace.editFlow",{name:workspace.label}),
            buttons: [
                {
                    id: "node-dialog-delete",
                    class: 'leftButton'+((workspace_tabs.count() == 1)?" disabled":""),
                    text: RED._("common.label.delete"), //'<i class="fa fa-trash"></i>',
                    click: function() {
                        deleteWorkspace(workspace);
                        RED.tray.close();
                    }
                },
                {
                    id: "node-dialog-cancel",
                    text: RED._("common.label.cancel"),
                    click: function() {
                        RED.tray.close();
                    }
                },
                {
                    id: "node-dialog-ok",
                    class: "primary",
                    text: RED._("common.label.done"),
                    click: function() {
                        var label = $( "#node-input-name" ).val();
                        var changed = false;
                        var changes = {};
                        if (workspace.label != label) {
                            changes.label = workspace.label;
                            changed = true;
                            workspace.label = label;
                            workspace_tabs.renameTab(workspace.id,label);
                        }
                        var disabled = $("#node-input-disabled").prop("checked");
                        if (workspace.disabled !== disabled) {
                            changes.disabled = workspace.disabled;
                            changed = true;
                            workspace.disabled = disabled;
                        }
                        var info = tabflowEditor.getValue();
                        if (workspace.info !== info) {
                            changes.info = workspace.info;
                            changed = true;
                            workspace.info = info;
                        }
                        $("#red-ui-tab-"+(workspace.id.replace(".","-"))).toggleClass('workspace-disabled',workspace.disabled);
                        // $("#workspace").toggleClass("workspace-disabled",workspace.disabled);

                        if (changed) {
                            var historyEvent = {
                                t: "edit",
                                changes:changes,
                                node: workspace,
                                dirty: RED.nodes.dirty()
                            }
                            workspace.changed = true;
                            RED.history.push(historyEvent);
                            RED.nodes.dirty(true);
                            RED.sidebar.config.refresh();
                            var selection = RED.view.selection();
                            if (!selection.nodes && !selection.links) {
                                RED.sidebar.info.refresh(workspace);
                            }
                        }
                        RED.tray.close();
                    }
                }
            ],
            resize: function(dimensions) {
                var rows = $("#dialog-form>div:not(.node-text-editor-row)");
                var editorRow = $("#dialog-form>div.node-text-editor-row");
                var height = $("#dialog-form").height();
                for (var i=0; i<rows.size(); i++) {
                    height -= $(rows[i]).outerHeight(true);
                }
                height -= (parseInt($("#dialog-form").css("marginTop"))+parseInt($("#dialog-form").css("marginBottom")));
                height -= 28;
                $(".node-text-editor").css("height",height+"px");
                tabflowEditor.resize();
            },
            open: function(tray) {
                var trayBody = tray.find('.editor-tray-body');
                var dialogForm = $('<form id="dialog-form" class="form-horizontal"></form>').appendTo(trayBody);
                $('<div class="form-row">'+
                    '<label for="node-input-name" data-i18n="[append]editor:common.label.name"><i class="fa fa-tag"></i> </label>'+
                    '<input type="text" id="node-input-name">'+
                '</div>').appendTo(dialogForm);

                $('<div class="form-row">'+
                    '<label for="node-input-disabled-btn" data-i18n="editor:workspace.status"></label>'+
                    '<button id="node-input-disabled-btn" class="editor-button"><i class="fa fa-toggle-on"></i> <span id="node-input-disabled-label"></span></button> '+
                    '<input type="checkbox" id="node-input-disabled" style="display: none;"/>'+
                '</div>').appendTo(dialogForm);

                $('<div class="form-row node-text-editor-row">'+
                    '<label for="node-input-info" data-i18n="editor:workspace.info" style="width:300px;"></label>'+
                    '<div style="height:250px;" class="node-text-editor" id="node-input-info"></div>'+
                '</div>').appendTo(dialogForm);
                tabflowEditor = RED.editor.createEditor({
                    id: 'node-input-info',
                    mode: 'ace/mode/markdown',
                    value: ""
                });

                $('<div class="form-tips" data-i18n="editor:workspace.tip"></div>').appendTo(dialogForm);

                dialogForm.find('#node-input-disabled-btn').on("click",function(e) {
                    var i = $(this).find("i");
                    if (i.hasClass('fa-toggle-off')) {
                        i.addClass('fa-toggle-on');
                        i.removeClass('fa-toggle-off');
                        $("#node-input-disabled").prop("checked",false);
                        $("#node-input-disabled-label").html(RED._("editor:workspace.enabled"));
                    } else {
                        i.addClass('fa-toggle-off');
                        i.removeClass('fa-toggle-on');
                        $("#node-input-disabled").prop("checked",true);
                        $("#node-input-disabled-label").html(RED._("editor:workspace.disabled"));
                    }
                })

                if (workspace.hasOwnProperty("disabled")) {
                    $("#node-input-disabled").prop("checked",workspace.disabled);
                    if (workspace.disabled) {
                        dialogForm.find("#node-input-disabled-btn i").removeClass('fa-toggle-on').addClass('fa-toggle-off');
                        $("#node-input-disabled-label").html(RED._("editor:workspace.disabled"));
                    } else {
                        $("#node-input-disabled-label").html(RED._("editor:workspace.enabled"));
                    }
                } else {
                    workspace.disabled = false;
                    $("#node-input-disabled-label").html(RED._("editor:workspace.enabled"));
                }

                $('<input type="text" style="display: none;" />').prependTo(dialogForm);
                dialogForm.submit(function(e) { e.preventDefault();});
                $("#node-input-name").val(workspace.label);
                RED.text.bidi.prepareInput($("#node-input-name"));
                tabflowEditor.getSession().setValue(workspace.info || "", -1);
                dialogForm.i18n();
            },
            close: function() {
                if (RED.view.state() != RED.state.IMPORT_DRAGGING) {
                    RED.view.state(RED.state.DEFAULT);
                }
                RED.sidebar.info.refresh(workspace);
            }
        }
        RED.tray.show(trayOptions);
    }


    var workspace_tabs;
    function createWorkspaceTabs() {
        workspace_tabs = RED.tabs.create({
            id: "workspace-tabs",
            onchange: function(tab) {
                var event = {
                    old: activeWorkspace
                }
                activeWorkspace = tab.id;
                event.workspace = activeWorkspace;
                // $("#workspace").toggleClass("workspace-disabled",tab.disabled);
                RED.events.emit("workspace:change",event);
                window.location.hash = 'flow/'+tab.id;
                RED.sidebar.config.refresh();
                RED.view.focus();
            },
            onclick: function(tab) {
                RED.view.focus();
            },
            ondblclick: function(tab) {
                if (tab.type != "subflow") {
                    showRenameWorkspaceDialog(tab.id);
                } else {
                    RED.editor.editSubflow(RED.nodes.subflow(tab.id));
                }
            },
            onadd: function(tab) {
                $('<span class="workspace-disabled-icon"><i class="fa fa-ban"></i> </span>').prependTo("#red-ui-tab-"+(tab.id.replace(".","-"))+" .red-ui-tab-label");
                if (tab.disabled) {
                    $("#red-ui-tab-"+(tab.id.replace(".","-"))).addClass('workspace-disabled');
                }
                RED.menu.setDisabled("menu-item-workspace-delete",workspace_tabs.count() == 1);
            },
            onremove: function(tab) {
                RED.menu.setDisabled("menu-item-workspace-delete",workspace_tabs.count() == 1);
            },
            onreorder: function(oldOrder, newOrder) {
                RED.history.push({t:'reorder',order:oldOrder,dirty:RED.nodes.dirty()});
                RED.nodes.dirty(true);
                setWorkspaceOrder(newOrder);
            },
            minimumActiveTabWidth: 150,
            scrollable: true,
            addButton: function() {
                addWorkspace();
            }
        });
    }

    function init() {
        createWorkspaceTabs();
        RED.events.on("sidebar:resize",workspace_tabs.resize);

        RED.actions.add("core:show-next-tab",workspace_tabs.nextTab);
        RED.actions.add("core:show-previous-tab",workspace_tabs.previousTab);

        RED.menu.setAction('menu-item-workspace-delete',function() {
            deleteWorkspace(RED.nodes.workspace(activeWorkspace));
        });

        $(window).resize(function() {
            workspace_tabs.resize();
        });

        RED.actions.add("core:add-flow",addWorkspace);
        RED.actions.add("core:edit-flow",editWorkspace);
        RED.actions.add("core:remove-flow",removeWorkspace);
    }

    function editWorkspace(id) {
        showRenameWorkspaceDialog(id||activeWorkspace);
    }

    function removeWorkspace(ws) {
        if (!ws) {
            deleteWorkspace(RED.nodes.workspace(activeWorkspace));
        } else {
            if (workspace_tabs.contains(ws.id)) {
                workspace_tabs.removeTab(ws.id);
            }
        }
    }

    function setWorkspaceOrder(order) {
        RED.nodes.setWorkspaceOrder(order.filter(function(id) {
            return RED.nodes.workspace(id) !== undefined;
        }));
        workspace_tabs.order(order);
    }

    return {
        init: init,
        add: addWorkspace,
        remove: removeWorkspace,
        order: setWorkspaceOrder,
        edit: editWorkspace,
        contains: function(id) {
            return workspace_tabs.contains(id);
        },
        count: function() {
            return workspace_tabs.count();
        },
        active: function() {
            return activeWorkspace
        },
        show: function(id) {
            if (!workspace_tabs.contains(id)) {
                var sf = RED.nodes.subflow(id);
                if (sf) {
                    addWorkspace({type:"subflow",id:id,icon:"red/images/subflow_tab.png",label:sf.name, closeable: true});
                } else {
                    return;
                }
            }
            workspace_tabs.activateTab(id);
        },
        refresh: function() {
            RED.nodes.eachWorkspace(function(ws) {
                workspace_tabs.renameTab(ws.id,ws.label);

            })
            RED.nodes.eachSubflow(function(sf) {
                if (workspace_tabs.contains(sf.id)) {
                    workspace_tabs.renameTab(sf.id,sf.name);
                }
            });
            RED.sidebar.config.refresh();
        },
        resize: function() {
            workspace_tabs.resize();
        }
    }
})();
;/** This file was modified by Sathya Laufer */

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


RED.view = (function() {
    var space_width = 5000,
        space_height = 5000,
        lineCurveScale = 0.75,
        scaleFactor = 1,
        node_width = 100,
        node_height = 30;

    var touchLongPressTimeout = 1000,
        startTouchDistance = 0,
        startTouchCenter = [],
        moveTouchCenter = [],
        touchStartTime = 0;

    var workspaceScrollPositions = {};

    var gridSize = 10;
    var snapGrid = false;

    var activeSpliceLink;
    var spliceActive = false;
    var spliceTimer;

    var activeSubflow = null;
    var activeNodes = [];
    var activeLinks = [];
    var activeFlowLinks = [];

    var selected_link = null,
        mousedown_link = null,
        mousedown_node = null,
        mousedown_port_type = null,
        mousedown_port_index = 0,
        mouseup_node = null,
        mouse_offset = [0,0],
        mouse_position = null,
        mouse_mode = 0,
        moving_set = [],
        lasso = null,
        showStatus = false,
        lastClickNode = null,
        dblClickPrimed = null,
        clickTime = 0,
        clickElapsed = 0;

    var clipboard = "";

    var status_colours = {
        "red":    "#c00",
        "green":  "#5a8",
        "yellow": "#F9DF31",
        "blue":   "#53A3F3",
        "grey":   "#d3d3d3"
    }

    var PORT_TYPE_INPUT = 1;
    var PORT_TYPE_OUTPUT = 0;

    var outer = d3.select("#chart")
        .append("svg:svg")
        .attr("width", space_width)
        .attr("height", space_height)
        .attr("pointer-events", "all")
        .style("cursor","crosshair")
        .on("mousedown", function() {
            focusView();
        });

    var vis = outer
        .append("svg:g")
        .on("dblclick.zoom", null)
        .append("svg:g")
        .attr('class','innerCanvas')
        .on("mousemove", canvasMouseMove)
        .on("mousedown", canvasMouseDown)
        .on("mouseup", canvasMouseUp)
        .on("touchend", function() {
            clearTimeout(touchStartTime);
            touchStartTime = null;
            if  (RED.touch.radialMenu.active()) {
                return;
            }
            if (lasso) {
                outer_background.attr("fill","#fff");
            }
            canvasMouseUp.call(this);
        })
        .on("touchcancel", canvasMouseUp)
        .on("touchstart", function() {
            var touch0;
            if (d3.event.touches.length>1) {
                clearTimeout(touchStartTime);
                touchStartTime = null;
                d3.event.preventDefault();
                touch0 = d3.event.touches.item(0);
                var touch1 = d3.event.touches.item(1);
                var a = touch0["pageY"]-touch1["pageY"];
                var b = touch0["pageX"]-touch1["pageX"];

                var offset = $("#chart").offset();
                var scrollPos = [$("#chart").scrollLeft(),$("#chart").scrollTop()];
                startTouchCenter = [
                    (touch1["pageX"]+(b/2)-offset.left+scrollPos[0])/scaleFactor,
                    (touch1["pageY"]+(a/2)-offset.top+scrollPos[1])/scaleFactor
                ];
                moveTouchCenter = [
                    touch1["pageX"]+(b/2),
                    touch1["pageY"]+(a/2)
                ]
                startTouchDistance = Math.sqrt((a*a)+(b*b));
            } else {
                var obj = d3.select(document.body);
                touch0 = d3.event.touches.item(0);
                var pos = [touch0.pageX,touch0.pageY];
                startTouchCenter = [touch0.pageX,touch0.pageY];
                startTouchDistance = 0;
                var point = d3.touches(this)[0];
                touchStartTime = setTimeout(function() {
                    touchStartTime = null;
                    showTouchMenu(obj,pos);
                    //lasso = vis.append("rect")
                    //    .attr("ox",point[0])
                    //    .attr("oy",point[1])
                    //    .attr("rx",2)
                    //    .attr("ry",2)
                    //    .attr("x",point[0])
                    //    .attr("y",point[1])
                    //    .attr("width",0)
                    //    .attr("height",0)
                    //    .attr("class","lasso");
                    //outer_background.attr("fill","#e3e3f3");
                },touchLongPressTimeout);
            }
        })
        .on("touchmove", function(){
                if  (RED.touch.radialMenu.active()) {
                    d3.event.preventDefault();
                    return;
                }
                var touch0;
                if (d3.event.touches.length<2) {
                    if (touchStartTime) {
                        touch0 = d3.event.touches.item(0);
                        var dx = (touch0.pageX-startTouchCenter[0]);
                        var dy = (touch0.pageY-startTouchCenter[1]);
                        var d = Math.abs(dx*dx+dy*dy);
                        if (d > 64) {
                            clearTimeout(touchStartTime);
                            touchStartTime = null;
                        }
                    } else if (lasso) {
                        d3.event.preventDefault();
                    }
                    canvasMouseMove.call(this);
                } else {
                    touch0 = d3.event.touches.item(0);
                    var touch1 = d3.event.touches.item(1);
                    var a = touch0["pageY"]-touch1["pageY"];
                    var b = touch0["pageX"]-touch1["pageX"];
                    var offset = $("#chart").offset();
                    var scrollPos = [$("#chart").scrollLeft(),$("#chart").scrollTop()];
                    var moveTouchDistance = Math.sqrt((a*a)+(b*b));
                    var touchCenter = [
                        touch1["pageX"]+(b/2),
                        touch1["pageY"]+(a/2)
                    ];

                    if (!isNaN(moveTouchDistance)) {
                        oldScaleFactor = scaleFactor;
                        scaleFactor = Math.min(2,Math.max(0.3, scaleFactor + (Math.floor(((moveTouchDistance*100)-(startTouchDistance*100)))/10000)));

                        var deltaTouchCenter = [                             // Try to pan whilst zooming - not 100%
                            startTouchCenter[0]*(scaleFactor-oldScaleFactor),//-(touchCenter[0]-moveTouchCenter[0]),
                            startTouchCenter[1]*(scaleFactor-oldScaleFactor) //-(touchCenter[1]-moveTouchCenter[1])
                        ];

                        startTouchDistance = moveTouchDistance;
                        moveTouchCenter = touchCenter;

                        $("#chart").scrollLeft(scrollPos[0]+deltaTouchCenter[0]);
                        $("#chart").scrollTop(scrollPos[1]+deltaTouchCenter[1]);
                        redraw();
                    }
                }
        });

    var outer_background = vis.append("svg:rect")
        .attr("width", space_width)
        .attr("height", space_height)
        .attr("fill","#fff");

    var gridScale = d3.scale.linear().range([0,space_width]).domain([0,space_width]);
    var grid = vis.append("g");

    grid.selectAll("line.horizontal").data(gridScale.ticks(space_width/gridSize)).enter()
       .append("line")
           .attr(
           {
               "class":"horizontal",
               "x1" : 0,
               "x2" : space_width,
               "y1" : function(d){ return gridScale(d);},
               "y2" : function(d){ return gridScale(d);},
               "fill" : "none",
               "shape-rendering" : "crispEdges",
               "stroke" : "#eee",
               "stroke-width" : "1px"
           });
    grid.selectAll("line.vertical").data(gridScale.ticks(space_width/gridSize)).enter()
       .append("line")
           .attr(
           {
               "class":"vertical",
               "y1" : 0,
               "y2" : space_width,
               "x1" : function(d){ return gridScale(d);},
               "x2" : function(d){ return gridScale(d);},
               "fill" : "none",
               "shape-rendering" : "crispEdges",
               "stroke" : "#eee",
               "stroke-width" : "1px"
           });
    grid.style("visibility","hidden");

    updateGrid();

    function updateGrid() {
        grid.selectAll("line.horizontal").remove();
        grid.selectAll("line.horizontal").data(gridScale.ticks(space_width/gridSize)).enter()
            .append("line")
            .attr(
                {
                    "class":"horizontal",
                    "x1" : 0,
                    "x2" : space_width,
                    "y1" : function(d){ return gridScale(d);},
                    "y2" : function(d){ return gridScale(d);},
                    "fill" : "none",
                    "shape-rendering" : "crispEdges",
                    "stroke" : "#eee",
                    "stroke-width" : "1px"
                });
        grid.selectAll("line.vertical").remove();
        grid.selectAll("line.vertical").data(gridScale.ticks(space_width/gridSize)).enter()
            .append("line")
            .attr(
                {
                    "class":"vertical",
                    "y1" : 0,
                    "y2" : space_width,
                    "x1" : function(d){ return gridScale(d);},
                    "x2" : function(d){ return gridScale(d);},
                    "fill" : "none",
                    "shape-rendering" : "crispEdges",
                    "stroke" : "#eee",
                    "stroke-width" : "1px"
                });
    }

    var dragGroup = vis.append("g");
    var drag_lines = [];

    function showDragLines(nodes) {
        for (var i=0;i<nodes.length;i++) {
            var node = nodes[i];
            node.el = dragGroup.append("svg:path").attr("class", "drag_line");
            drag_lines.push(node);
        }

    }
    function hideDragLines() {
        while(drag_lines.length) {
            var line = drag_lines.pop();
            if (line.el) {
                line.el.remove();
            }
        }
    }

    function updateActiveNodes() {
        var activeWorkspace = RED.workspaces.active();

        activeNodes = RED.nodes.filterNodes({z:activeWorkspace});

        activeLinks = RED.nodes.filterLinks({
            source:{z:activeWorkspace},
            target:{z:activeWorkspace}
        });
    }

    function init() {

        RED.events.on("workspace:change",function(event) {
            var chart = $("#chart");
            if (event.old !== 0) {
                workspaceScrollPositions[event.old] = {
                    left:chart.scrollLeft(),
                    top:chart.scrollTop()
                };
            }
            var scrollStartLeft = chart.scrollLeft();
            var scrollStartTop = chart.scrollTop();

            activeSubflow = RED.nodes.subflow(event.workspace);

            RED.menu.setDisabled("menu-item-workspace-edit", activeSubflow);
            RED.menu.setDisabled("menu-item-workspace-delete",RED.workspaces.count() == 1 || activeSubflow);

            if (workspaceScrollPositions[event.workspace]) {
                chart.scrollLeft(workspaceScrollPositions[event.workspace].left);
                chart.scrollTop(workspaceScrollPositions[event.workspace].top);
            } else {
                chart.scrollLeft(0);
                chart.scrollTop(0);
            }
            var scrollDeltaLeft = chart.scrollLeft() - scrollStartLeft;
            var scrollDeltaTop = chart.scrollTop() - scrollStartTop;
            if (mouse_position != null) {
                mouse_position[0] += scrollDeltaLeft;
                mouse_position[1] += scrollDeltaTop;
            }
            clearSelection();
            RED.nodes.eachNode(function(n) {
                n.dirty = true;
            });
            updateSelection();
            updateActiveNodes();
            redraw();
        });

        $("#btn-zoom-out").click(function() {zoomOut();});
        $("#btn-zoom-zero").click(function() {zoomZero();});
        $("#btn-zoom-in").click(function() {zoomIn();});
        $("#chart").on("DOMMouseScroll mousewheel", function (evt) {
            if ( evt.altKey ) {
                evt.preventDefault();
                evt.stopPropagation();
                var move = -(evt.originalEvent.detail) || evt.originalEvent.wheelDelta;
                if (move <= 0) { zoomOut(); }
                else { zoomIn(); }
            }
        });

        // Handle nodes dragged from the palette
        $("#chart").droppable({
            accept:".palette_node",
            drop: function( event, ui ) {
                d3.event = event;
                var selected_tool = ui.draggable[0].type;
                var result = addNode(selected_tool);
                if (!result) {
                    return;
                }
                var historyEvent = result.historyEvent;
                var nn = result.node;

                var helperOffset = d3.touches(ui.helper.get(0))[0]||d3.mouse(ui.helper.get(0));
                var mousePos = d3.touches(this)[0]||d3.mouse(this);

                mousePos[1] += this.scrollTop + ((nn.h/2)-helperOffset[1]);
                mousePos[0] += this.scrollLeft + ((nn.w/2)-helperOffset[0]);
                mousePos[1] /= scaleFactor;
                mousePos[0] /= scaleFactor;

                if (snapGrid) {
                    mousePos[0] = gridSize*(Math.ceil(mousePos[0]/gridSize));
                    mousePos[1] = gridSize*(Math.ceil(mousePos[1]/gridSize));
                }
                nn.x = mousePos[0];
                nn.y = mousePos[1];

                var spliceLink = $(ui.helper).data("splice");
                if (spliceLink) {
                    // TODO: DRY - droppable/nodeMouseDown/canvasMouseUp
                    RED.nodes.removeLink(spliceLink);
                    var link1 = {
                        source:spliceLink.source,
                        sourcePort:spliceLink.sourcePort,
                        target: nn
                    };
                    var link2 = {
                        source:nn,
                        sourcePort:0,
                        target: spliceLink.target
                    };
                    RED.nodes.addLink(link1);
                    RED.nodes.addLink(link2);
                    historyEvent.links = [link1,link2];
                    historyEvent.removedLinks = [spliceLink];
                }

                RED.history.push(historyEvent);
                RED.nodes.add(nn);
                RED.editor.validateNode(nn);
                RED.nodes.dirty(true);
                // auto select dropped node - so info shows (if visible)
                clearSelection();
                nn.selected = true;
                moving_set.push({n:nn});
                updateActiveNodes();
                updateSelection();
                redraw();

                if (nn._def.autoedit) {
                    RED.editor.edit(nn);
                }
            }
        });
        $("#chart").focus(function() {
            $("#workspace-tabs").addClass("workspace-focussed")
        });
        $("#chart").blur(function() {
            $("#workspace-tabs").removeClass("workspace-focussed")
        });

        RED.actions.add("core:copy-selection-to-internal-clipboard",copySelection);
        RED.actions.add("core:cut-selection-to-internal-clipboard",function(){copySelection();deleteSelection();});
        RED.actions.add("core:paste-from-internal-clipboard",function(){importNodes(clipboard);});
        RED.actions.add("core:delete-selection",deleteSelection);
        RED.actions.add("core:edit-selected-node",editSelection);
        RED.actions.add("core:undo",RED.history.pop);
        RED.actions.add("core:select-all-nodes",selectAll);
        RED.actions.add("core:zoom-in",zoomIn);
        RED.actions.add("core:zoom-out",zoomOut);
        RED.actions.add("core:zoom-reset",zoomZero);

        RED.actions.add("core:toggle-show-grid",function(state) {
            if (state === undefined) {
                RED.userSettings.toggle("view-show-grid");
            } else {
                toggleShowGrid(state);
            }
        });
        RED.actions.add("core:toggle-snap-grid",function(state) {
            if (state === undefined) {
                RED.userSettings.toggle("view-snap-grid");
            } else {
                toggleSnapGrid(state);
            }
        });
        RED.actions.add("core:toggle-status",function(state) {
            if (state === undefined) {
                RED.userSettings.toggle("view-node-status");
            } else {
                toggleStatus(state);
            }
        });

        RED.actions.add("core:move-selection-up", function() { moveSelection(0,-1);});
        RED.actions.add("core:step-selection-up", function() { moveSelection(0,-20);});
        RED.actions.add("core:move-selection-right", function() { moveSelection(1,0);});
        RED.actions.add("core:step-selection-right", function() { moveSelection(20,0);});
        RED.actions.add("core:move-selection-down", function() { moveSelection(0,1);});
        RED.actions.add("core:step-selection-down", function() { moveSelection(0,20);});
        RED.actions.add("core:move-selection-left", function() { moveSelection(-1,0);});
        RED.actions.add("core:step-selection-left", function() { moveSelection(-20,0);});
    }


    function addNode(type,x,y) {
        var m = /^subflow:(.+)$/.exec(type);

        if (activeSubflow && m) {
            var subflowId = m[1];
            if (subflowId === activeSubflow.id) {
                RED.notify(RED._("notification.error",{message: RED._("notification.errors.cannotAddSubflowToItself")}),"error");
                return;
            }
            if (RED.nodes.subflowContains(m[1],activeSubflow.id)) {
                RED.notify(RED._("notification.error",{message: RED._("notification.errors.cannotAddCircularReference")}),"error");
                return;
            }
        }

        var nn = { id:RED.nodes.id(),z:RED.workspaces.active()};

        nn.type = type;
        nn._def = RED.nodes.getType(nn.type);
        nn.namespace = nn._def.namespace ? nn._def.namespace : nn.type;

        if (!m) {
            nn.inputs = nn._def.inputs || 0;
            nn.outputs = nn._def.outputs;

            for (var d in nn._def.defaults) {
                if (nn._def.defaults.hasOwnProperty(d)) {
                    if (nn._def.defaults[d].value !== undefined) {
                        nn[d] = JSON.parse(JSON.stringify(nn._def.defaults[d].value));
                    }
                }
            }

            if (nn._def.onadd) {
                try {
                    nn._def.onadd.call(nn);
                } catch(err) {
                    console.log("onadd:",err);
                }
            }
        } else {
            var subflow = RED.nodes.subflow(m[1]);
            nn.inputs = subflow.in.length;
            nn.outputs = subflow.out.length;
        }

        nn.changed = true;
        nn.moved = true;

        nn.w = node_width;
        nn.h = Math.max(Math.max(node_height,(nn.outputs||0) * 20),(nn.inputs||0) * 20);

        var historyEvent = {
            t:"add",
            nodes:[nn.id],
            dirty:RED.nodes.dirty()
        }
        if (activeSubflow) {
            var subflowRefresh = RED.subflow.refresh(true);
            if (subflowRefresh) {
                historyEvent.subflow = {
                    id:activeSubflow.id,
                    changed: activeSubflow.changed,
                    instances: subflowRefresh.instances
                }
            }
        }
        return {
            node: nn,
            historyEvent: historyEvent
        }

    }

    function canvasMouseDown() {
        var point;

        if (!mousedown_node && !mousedown_link) {
            selected_link = null;
            updateSelection();
        }
        if (mouse_mode === 0) {
            if (lasso) {
                lasso.remove();
                lasso = null;
            }
        }
        if (mouse_mode === 0 || mouse_mode === RED.state.QUICK_JOINING) {
            if (d3.event.metaKey || d3.event.ctrlKey) {
                point = d3.mouse(this);
                d3.event.stopPropagation();
                var mainPos = $("#main-container").position();

                if (mouse_mode !== RED.state.QUICK_JOINING) {
                    mouse_mode = RED.state.QUICK_JOINING;
                    $(window).on('keyup',disableQuickJoinEventHandler);
                }

                RED.typeSearch.show({
                    x:d3.event.clientX-mainPos.left-node_width/2,
                    y:d3.event.clientY-mainPos.top-node_height/2,
                    add: function(type) {
                        var result = addNode(type);
                        if (!result) {
                            return;
                        }
                        var nn = result.node;
                        var historyEvent = result.historyEvent;
                        nn.x = point[0];
                        nn.y = point[1];
                        if (mouse_mode === RED.state.QUICK_JOINING) {
                            if (drag_lines.length > 0) {
                                var drag_line = drag_lines[0];
                                var src = null,dst,src_port;

                                if (drag_line.portType === PORT_TYPE_OUTPUT && nn.inputs > 0) {
                                    src = drag_line.node;
                                    src_port = drag_line.port;
                                    dst = nn;
                                } else if (drag_line.portType === PORT_TYPE_INPUT && nn.outputs > 0) {
                                    src = nn;
                                    dst = drag_line.node;
                                    src_port = 0;
                                }
                                if (src !== null) {
                                    var link = {source: src, sourcePort:src_port, target: dst};
                                    RED.nodes.addLink(link);
                                    historyEvent.links = [link];
                                    hideDragLines();
                                    if (drag_line.portType === PORT_TYPE_OUTPUT && nn.outputs > 0) {
                                        showDragLines([{node:nn,port:0,portType:PORT_TYPE_OUTPUT}]);
                                    } else if (drag_line.portType === PORT_TYPE_INPUT && nn.inputs > 0) {
                                        showDragLines([{node:nn,port:0,portType:PORT_TYPE_INPUT}]);
                                    } else {
                                        resetMouseVars();
                                    }
                                } else {
                                    hideDragLines();
                                    resetMouseVars();
                                }
                            } else {
                                if (nn.outputs > 0) {
                                    showDragLines([{node:nn,port:0,portType:PORT_TYPE_OUTPUT}]);
                                } else if (nn.inputs > 0) {
                                    showDragLines([{node:nn,port:0,portType:PORT_TYPE_INPUT}]);
                                } else {
                                    resetMouseVars();
                                }
                            }
                        }


                        RED.history.push(historyEvent);
                        RED.nodes.add(nn);
                        RED.editor.validateNode(nn);
                        RED.nodes.dirty(true);
                        // auto select dropped node - so info shows (if visible)
                        clearSelection();
                        nn.selected = true;
                        moving_set.push({n:nn});
                        updateActiveNodes();
                        updateSelection();
                        redraw();
                    }
                });

                updateActiveNodes();
                updateSelection();
                redraw();
            }
        }
        if (mouse_mode === 0 && !(d3.event.metaKey || d3.event.ctrlKey)) {
            if (!touchStartTime) {
                point = d3.mouse(this);
                lasso = vis.append("rect")
                .attr("ox",point[0])
                .attr("oy",point[1])
                .attr("rx",1)
                .attr("ry",1)
                .attr("x",point[0])
                .attr("y",point[1])
                .attr("width",0)
                .attr("height",0)
                .attr("class","lasso");
                d3.event.preventDefault();
            }
        }
    }

    function canvasMouseMove() {
        var i;
        var node;
        mouse_position = d3.touches(this)[0]||d3.mouse(this);
        // Prevent touch scrolling...
        //if (d3.touches(this)[0]) {
        //    d3.event.preventDefault();
        //}

        // TODO: auto scroll the container
        //var point = d3.mouse(this);
        //if (point[0]-container.scrollLeft < 30 && container.scrollLeft > 0) { container.scrollLeft -= 15; }
        //console.log(d3.mouse(this),container.offsetWidth,container.offsetHeight,container.scrollLeft,container.scrollTop);

        if (lasso) {
            var ox = parseInt(lasso.attr("ox"));
            var oy = parseInt(lasso.attr("oy"));
            var x = parseInt(lasso.attr("x"));
            var y = parseInt(lasso.attr("y"));
            var w;
            var h;
            if (mouse_position[0] < ox) {
                x = mouse_position[0];
                w = ox-x;
            } else {
                w = mouse_position[0]-x;
            }
            if (mouse_position[1] < oy) {
                y = mouse_position[1];
                h = oy-y;
            } else {
                h = mouse_position[1]-y;
            }
            lasso
                .attr("x",x)
                .attr("y",y)
                .attr("width",w)
                .attr("height",h)
            ;
            return;
        }

        if (mouse_mode != RED.state.QUICK_JOINING && mouse_mode != RED.state.IMPORT_DRAGGING && !mousedown_node && selected_link == null) {
            return;
        }

        var mousePos;
        if (mouse_mode == RED.state.JOINING || mouse_mode === RED.state.QUICK_JOINING) {
            // update drag line
            if (drag_lines.length === 0) {
                if (d3.event.shiftKey) {
                    // Get all the wires we need to detach.
                    var links = [];
                    var existingLinks = [];
                    if (selected_link &&
                        ((mousedown_port_type === PORT_TYPE_OUTPUT &&
                            selected_link.source === mousedown_node &&
                            selected_link.sourcePort === mousedown_port_index
                        ) ||
                        (mousedown_port_type === PORT_TYPE_INPUT &&
                            selected_link.target === mousedown_node &&
                            selected_link.targetPort === mousedown_port_index
                        ))
                    ) {
                        existingLinks = [selected_link];
                    } else {
                        var filter;
                        if (mousedown_port_type === PORT_TYPE_OUTPUT) {
                            filter = {
                                source:mousedown_node,
                                sourcePort: mousedown_port_index
                            }
                        } else {
                            filter = {
                                target: mousedown_node,
                                targetPort: mousedown_port_index
                            }
                        }
                        existingLinks = RED.nodes.filterLinks(filter);
                    }
                    for (i=0;i<existingLinks.length;i++) {
                        var link = existingLinks[i];
                        RED.nodes.removeLink(link);
                        links.push({
                            link:link,
                            node: (mousedown_port_type===PORT_TYPE_OUTPUT)?link.target:link.source,
                            port: (mousedown_port_type===PORT_TYPE_OUTPUT)?link.targetPort:link.sourcePort,
                            portType: (mousedown_port_type===PORT_TYPE_OUTPUT)?PORT_TYPE_INPUT:PORT_TYPE_OUTPUT
                        })
                    }
                    if (links.length === 0) {
                        resetMouseVars();
                        redraw();
                    } else {
                        showDragLines(links);
                        mouse_mode = 0;
                        updateActiveNodes();
                        redraw();
                        mouse_mode = RED.state.JOINING;
                    }
                } else if (mousedown_node) {
                    showDragLines([{node:mousedown_node,port:mousedown_port_index,portType:mousedown_port_type}]);
                }
                selected_link = null;
            }
            mousePos = mouse_position;
            for (i=0;i<drag_lines.length;i++) {
                var drag_line = drag_lines[i];
                var numOutputs = (drag_line.portType === PORT_TYPE_OUTPUT)?(drag_line.node.outputs || 1):(drag_line.node.inputs || 1);
                var sourcePort = drag_line.port;
                if(drag_line.node.type == "subflow") {
                    numOutputs = 1;
                    sourcePort = 0;
                } 
                var portY = -((numOutputs-1)/2)*18 +18*sourcePort;

                var sc = (drag_line.portType === PORT_TYPE_OUTPUT)?1:-1;

                var dy = mousePos[1]-(drag_line.node.y+portY);
                var dx = mousePos[0]-(drag_line.node.x+sc*drag_line.node.w/2);
                var delta = Math.sqrt(dy*dy+dx*dx);
                var scale = lineCurveScale;
                var scaleY = 0;

                if (delta < node_width) {
                    scale = 0.75-0.75*((node_width-delta)/node_width);
                }
                if (dx*sc < 0) {
                    scale += 2*(Math.min(5*node_width,Math.abs(dx))/(5*node_width));
                    if (Math.abs(dy) < 3*node_height) {
                        scaleY = ((dy>0)?0.5:-0.5)*(((3*node_height)-Math.abs(dy))/(3*node_height))*(Math.min(node_width,Math.abs(dx))/(node_width)) ;
                    }
                }

                drag_line.el.attr("d",
                    "M "+(drag_line.node.x+sc*drag_line.node.w/2)+" "+(drag_line.node.y+portY)+
                    " C "+(drag_line.node.x+sc*(drag_line.node.w/2+node_width*scale))+" "+(drag_line.node.y+portY+scaleY*node_height)+" "+
                    (mousePos[0]-sc*(scale)*node_width)+" "+(mousePos[1]-scaleY*node_height)+" "+
                    mousePos[0]+" "+mousePos[1]
                    );
            }
            d3.event.preventDefault();
        } else if (mouse_mode == RED.state.MOVING) {
            mousePos = d3.mouse(document.body);
            if (isNaN(mousePos[0])) {
                mousePos = d3.touches(document.body)[0];
            }
            var d = (mouse_offset[0]-mousePos[0])*(mouse_offset[0]-mousePos[0]) + (mouse_offset[1]-mousePos[1])*(mouse_offset[1]-mousePos[1]);
            if (d > 3) {
                mouse_mode = RED.state.MOVING_ACTIVE;
                clickElapsed = 0;
                spliceActive = false;
                if (moving_set.length === 1) {
                    node = moving_set[0];
                    spliceActive = node.n.hasOwnProperty("_def") &&
                                   node.n._def.inputs > 0 &&
                                   node.n._def.outputs > 0 &&
                                   RED.nodes.filterLinks({ source: node.n }).length === 0 &&
                                   RED.nodes.filterLinks({ target: node.n }).length === 0;
                }
            }
        } else if (mouse_mode == RED.state.MOVING_ACTIVE || mouse_mode == RED.state.IMPORT_DRAGGING) {
            mousePos = mouse_position;
            var minX = 0;
            var minY = 0;
            var maxX = space_width;
            var maxY = space_height;
            for (var n = 0; n<moving_set.length; n++) {
                node = moving_set[n];
                if (d3.event.shiftKey) {
                    node.n.ox = node.n.x;
                    node.n.oy = node.n.y;
                }
                node.n.x = mousePos[0]+node.dx;
                node.n.y = mousePos[1]+node.dy;
                node.n.dirty = true;
                minX = Math.min(node.n.x-node.n.w/2-5,minX);
                minY = Math.min(node.n.y-node.n.h/2-5,minY);
                maxX = Math.max(node.n.x+node.n.w/2+5,maxX);
                maxY = Math.max(node.n.y+node.n.h/2+5,maxY);
            }
            if (minX !== 0 || minY !== 0) {
                for (i = 0; i<moving_set.length; i++) {
                    node = moving_set[i];
                    node.n.x -= minX;
                    node.n.y -= minY;
                }
            }
            if (maxX !== space_width || maxY !== space_height) {
                for (i = 0; i<moving_set.length; i++) {
                    node = moving_set[i];
                    node.n.x -= (maxX - space_width);
                    node.n.y -= (maxY - space_height);
                }
            }
            if (snapGrid != d3.event.shiftKey && moving_set.length > 0) {
                var gridOffset = [0,0];
                node = moving_set[0];
                gridOffset[0] = node.n.x-(gridSize*Math.floor((node.n.x-node.n.w/2)/gridSize)+node.n.w/2);
                gridOffset[1] = node.n.y-(gridSize*Math.floor(node.n.y/gridSize));
                if (gridOffset[0] !== 0 || gridOffset[1] !== 0) {
                    for (i = 0; i<moving_set.length; i++) {
                        node = moving_set[i];
                        node.n.x -= gridOffset[0];
                        node.n.y -= gridOffset[1];
                        if (node.n.x == node.n.ox && node.n.y == node.n.oy) {
                            node.dirty = false;
                        }
                    }
                }
            }
            if ((mouse_mode == RED.state.MOVING_ACTIVE || mouse_mode == RED.state.IMPORT_DRAGGING) && moving_set.length === 1) {
                node = moving_set[0];
                if (spliceActive) {
                    if (!spliceTimer) {
                        spliceTimer = setTimeout(function() {
                            var nodes = [];
                            var bestDistance = Infinity;
                            var bestLink = null;
                            var mouseX = node.n.x;
                            var mouseY = node.n.y;
                            if (outer[0][0].getIntersectionList) {
                                var svgRect = outer[0][0].createSVGRect();
                                svgRect.x = mouseX;
                                svgRect.y = mouseY;
                                svgRect.width = 1;
                                svgRect.height = 1;
                                nodes = outer[0][0].getIntersectionList(svgRect, outer[0][0]);
                            } else {
                                // Firefox doesn"t do getIntersectionList and that
                                // makes us sad
                                nodes = RED.view.getLinksAtPoint(mouseX,mouseY);
                            }
                            for (var i=0;i<nodes.length;i++) {
                                if (d3.select(nodes[i]).classed("link_background")) {
                                    var length = nodes[i].getTotalLength();
                                    for (var j=0;j<length;j+=10) {
                                        var p = nodes[i].getPointAtLength(j);
                                        var d2 = ((p.x-mouseX)*(p.x-mouseX))+((p.y-mouseY)*(p.y-mouseY));
                                        if (d2 < 200 && d2 < bestDistance) {
                                            bestDistance = d2;
                                            bestLink = nodes[i];
                                        }
                                    }
                                }
                            }
                            if (activeSpliceLink && activeSpliceLink !== bestLink) {
                                d3.select(activeSpliceLink.parentNode).classed("link_splice",false);
                            }
                            if (bestLink) {
                                d3.select(bestLink.parentNode).classed("link_splice",true)
                            } else {
                                d3.select(".link_splice").classed("link_splice",false);
                            }
                            activeSpliceLink = bestLink;
                            spliceTimer = null;
                        },100);
                    }
                }
            }


        }
        if (mouse_mode !== 0) {
            redraw();
        }
    }

    function canvasMouseUp() {
        var i;
        var historyEvent;
        if (mouse_mode === RED.state.QUICK_JOINING) {
            return;
        }
        if (mousedown_node && mouse_mode == RED.state.JOINING) {
            var removedLinks = [];
            for (i=0;i<drag_lines.length;i++) {
                if (drag_lines[i].link) {
                    removedLinks.push(drag_lines[i].link)
                }
            }
            historyEvent = {
                t:"delete",
                links: removedLinks,
                dirty:RED.nodes.dirty()
            };
            RED.history.push(historyEvent);
            hideDragLines();
        }
        if (lasso) {
            var x = parseInt(lasso.attr("x"));
            var y = parseInt(lasso.attr("y"));
            var x2 = x+parseInt(lasso.attr("width"));
            var y2 = y+parseInt(lasso.attr("height"));
            if (!d3.event.ctrlKey) {
                clearSelection();
            }
            RED.nodes.eachNode(function(n) {
                if (n.z == RED.workspaces.active() && !n.selected) {
                    n.selected = (n.x > x && n.x < x2 && n.y > y && n.y < y2);
                    if (n.selected) {
                        n.dirty = true;
                        moving_set.push({n:n});
                    }
                }
            });
            if (activeSubflow) {
                activeSubflow.in.forEach(function(n) {
                    n.selected = (n.x > x && n.x < x2 && n.y > y && n.y < y2);
                    if (n.selected) {
                        n.dirty = true;
                        moving_set.push({n:n});
                    }
                });
                activeSubflow.out.forEach(function(n) {
                    n.selected = (n.x > x && n.x < x2 && n.y > y && n.y < y2);
                    if (n.selected) {
                        n.dirty = true;
                        moving_set.push({n:n});
                    }
                });
            }
            updateSelection();
            lasso.remove();
            lasso = null;
        } else if (mouse_mode == RED.state.DEFAULT && mousedown_link == null && !d3.event.ctrlKey&& !d3.event.metaKey ) {
            clearSelection();
            updateSelection();
        }
        if (mouse_mode == RED.state.MOVING_ACTIVE) {
            if (moving_set.length > 0) {
                var ns = [];
                for (var j=0;j<moving_set.length;j++) {
                    ns.push({n:moving_set[j].n,ox:moving_set[j].ox,oy:moving_set[j].oy,moved:moving_set[j].n.moved});
                    moving_set[j].n.dirty = true;
                    moving_set[j].n.moved = true;
                }
                historyEvent = {t:"move",nodes:ns,dirty:RED.nodes.dirty()};
                if (activeSpliceLink) {
                    // TODO: DRY - droppable/nodeMouseDown/canvasMouseUp
                    var spliceLink = d3.select(activeSpliceLink).data()[0];
                    RED.nodes.removeLink(spliceLink);
                    var link1 = {
                        source:spliceLink.source,
                        sourcePort:spliceLink.sourcePort,
                        target: moving_set[0].n
                    };
                    var link2 = {
                        source:moving_set[0].n,
                        sourcePort:0,
                        target: spliceLink.target
                    };
                    RED.nodes.addLink(link1);
                    RED.nodes.addLink(link2);
                    historyEvent.links = [link1,link2];
                    historyEvent.removedLinks = [spliceLink];
                    updateActiveNodes();
                }
                RED.nodes.dirty(true);
                RED.history.push(historyEvent);
            }
        }
        if (mouse_mode == RED.state.MOVING || mouse_mode == RED.state.MOVING_ACTIVE) {
            for (i=0;i<moving_set.length;i++) {
                delete moving_set[i].ox;
                delete moving_set[i].oy;
            }
        }
        if (mouse_mode == RED.state.IMPORT_DRAGGING) {
            RED.keyboard.remove("escape");
            updateActiveNodes();
            RED.nodes.dirty(true);
        }
        resetMouseVars();
        redraw();
    }

    function zoomIn() {
        if (scaleFactor < 2) {
            scaleFactor += 0.1;
            redraw();
        }
    }
    function zoomOut() {
        if (scaleFactor > 0.3) {
            scaleFactor -= 0.1;
            redraw();
        }
    }
    function zoomZero() {
        scaleFactor = 1;
        redraw();
    }

    function selectAll() {
        RED.nodes.eachNode(function(n) {
            if (n.z == RED.workspaces.active()) {
                if (!n.selected) {
                    n.selected = true;
                    n.dirty = true;
                    moving_set.push({n:n});
                }
            }
        });
        if (activeSubflow) {
            activeSubflow.in.forEach(function(n) {
                if (!n.selected) {
                    n.selected = true;
                    n.dirty = true;
                    moving_set.push({n:n});
                }
            });
            activeSubflow.out.forEach(function(n) {
                if (!n.selected) {
                    n.selected = true;
                    n.dirty = true;
                    moving_set.push({n:n});
                }
            });
        }

        selected_link = null;
        updateSelection();
        redraw();
    }

    function clearSelection() {
        for (var i=0;i<moving_set.length;i++) {
            var n = moving_set[i];
            n.n.dirty = true;
            n.n.selected = false;
        }
        moving_set = [];
        selected_link = null;
    }

    var lastSelection = null;
    function updateSelection() {
        var selection = {};

        if (moving_set.length > 0) {
            selection.nodes = moving_set.map(function(n) { return n.n;});
        }
        if (selected_link != null) {
            selection.link = selected_link;
        }
        var activeWorkspace = RED.workspaces.active();
        activeLinks = RED.nodes.filterLinks({
            source:{z:activeWorkspace},
            target:{z:activeWorkspace}
        });
        var tabOrder = RED.nodes.getWorkspaceOrder();
        var currentLinks = activeLinks;
        var addedLinkLinks = {};
        activeFlowLinks = [];
        for (var i=0;i<moving_set.length;i++) {
            if (moving_set[i].n.type === "link out" || moving_set[i].n.type === "link in") {
                var linkNode = moving_set[i].n;
                var offFlowLinks = {};
                linkNode.links.forEach(function(id) {
                    var target = RED.nodes.node(id);
                    if (target) {
                        if (linkNode.type === "link out") {
                            if (target.z === linkNode.z) {
                                if (!addedLinkLinks[linkNode.id+":"+target.id]) {
                                    activeLinks.push({
                                        source:linkNode,
                                        sourcePort:0,
                                        target: target,
                                        link: true
                                    });
                                    addedLinkLinks[linkNode.id+":"+target.id] = true;
                                }
                            } else {
                                offFlowLinks[target.z] = offFlowLinks[target.z]||[];
                                offFlowLinks[target.z].push(target);
                            }
                        } else {
                            if (target.z === linkNode.z) {
                                if (!addedLinkLinks[target.id+":"+linkNode.id]) {
                                    activeLinks.push({
                                        source:target,
                                        sourcePort:0,
                                        target: linkNode,
                                        link: true
                                    });
                                    addedLinkLinks[target.id+":"+linkNode.id] = true;
                                }
                            } else {
                                offFlowLinks[target.z] = offFlowLinks[target.z]||[];
                                offFlowLinks[target.z].push(target);
                            }
                        }
                    }
                });
                var offFlows = Object.keys(offFlowLinks);
                // offFlows.sort(function(A,B) {
                //     return tabOrder.indexOf(A) - tabOrder.indexOf(B);
                // });
                if (offFlows.length > 0) {
                    activeFlowLinks.push({
                        refresh: Math.floor(Math.random()*10000),
                        node: linkNode,
                        links: offFlowLinks//offFlows.map(function(i) { return {id:i,links:offFlowLinks[i]};})
                    });
                }
            }
        }

        var selectionJSON = JSON.stringify(selection,function(key,value) {
            if (key === 'nodes') {
                return value.map(function(n) { return n.id })
            } else if (key === 'link') {
                return value.source.id+":"+value.sourcePort+":"+value.target.id;
            }
            return value;
        });
        if (selectionJSON !== lastSelection) {
            lastSelection = selectionJSON;
            RED.events.emit("view:selection-changed",selection);
        }
    }

    function endKeyboardMove() {
        endMoveSet = false;
        if (moving_set.length > 0) {
            var ns = [];
            for (var i=0;i<moving_set.length;i++) {
                ns.push({n:moving_set[i].n,ox:moving_set[i].ox,oy:moving_set[i].oy,moved:moving_set[i].n.moved});
                moving_set[i].n.moved = true;
                moving_set[i].n.dirty = true;
                delete moving_set[i].ox;
                delete moving_set[i].oy;
            }
            redraw();
            RED.history.push({t:"move",nodes:ns,dirty:RED.nodes.dirty()});
            RED.nodes.dirty(true);
        }
    }
    var endMoveSet = false;
    function moveSelection(dx,dy) {
        if (moving_set.length > 0) {
            if (!endMoveSet) {
                $(document).one('keyup',endKeyboardMove);
                endMoveSet = true;
            }
            var minX = 0;
            var minY = 0;
            var node;

            for (var i=0;i<moving_set.length;i++) {
                node = moving_set[i];
                node.n.moved = true;
                node.n.dirty = true;
                if (node.ox == null && node.oy == null) {
                    node.ox = node.n.x;
                    node.oy = node.n.y;
                }
                node.n.x += dx;
                node.n.y += dy;
                node.n.dirty = true;
                minX = Math.min(node.n.x-node.n.w/2-5,minX);
                minY = Math.min(node.n.y-node.n.h/2-5,minY);
            }

            if (minX !== 0 || minY !== 0) {
                for (var n = 0; n<moving_set.length; n++) {
                    node = moving_set[n];
                    node.n.x -= minX;
                    node.n.y -= minY;
                }
            }

            redraw();
        }
    }
    function editSelection() {
        if (moving_set.length > 0) {
            var node = moving_set[0].n;
            if (node.type === "subflow") {
                RED.editor.editSubflow(activeSubflow);
            } else {
                RED.editor.edit(node);
            }
        }
    }
    function deleteSelection() {
        if (moving_set.length > 0 || selected_link != null) {
            var result;
            var removedNodes = [];
            var removedLinks = [];
            var removedSubflowOutputs = [];
            var removedSubflowInputs = [];
            var subflowInstances = [];

            var startDirty = RED.nodes.dirty();
            var startChanged = false;
            if (moving_set.length > 0) {
                for (var i=0;i<moving_set.length;i++) {
                    var node = moving_set[i].n;
                    node.selected = false;
                    if (node.type != "subflow") {
                        if (node.x < 0) {
                            node.x = 25
                        }
                        var removedEntities = RED.nodes.remove(node.id);
                        removedNodes.push(node);
                        removedNodes = removedNodes.concat(removedEntities.nodes);
                        removedLinks = removedLinks.concat(removedEntities.links);
                    } else {
                        if (node.direction === "out") {
                            removedSubflowOutputs.push(node);
                        } else if (node.direction === "in") {
                            removedSubflowInputs.push(node);
                        }
                        node.dirty = true;
                    }
                }
                if (removedSubflowOutputs.length > 0) {
                    result = RED.subflow.removeOutput(removedSubflowOutputs);
                    if (result) {
                        removedLinks = removedLinks.concat(result.links);
                    }
                }
                // Assume 0/1 inputs
                if (removedSubflowInputs.length == 1) {
                    result = RED.subflow.removeInput();
                    if (result) {
                        removedLinks = removedLinks.concat(result.links);
                    }
                }
                var instances = RED.subflow.refresh(true);
                if (instances) {
                    subflowInstances = instances.instances;
                }
                moving_set = [];
                if (removedNodes.length > 0 || removedSubflowOutputs.length > 0 || removedSubflowInputs.length > 0) {
                    RED.nodes.dirty(true);
                }
            }
            if (selected_link) {
                RED.nodes.removeLink(selected_link);
                removedLinks.push(selected_link);
                RED.nodes.dirty(true);
            }
            var historyEvent = {
                t:"delete",
                nodes:removedNodes,
                links:removedLinks,
                subflowOutputs:removedSubflowOutputs,
                subflowInputs:removedSubflowInputs,
                subflow: {
                    instances: subflowInstances
                },
                dirty:startDirty
            };
            RED.history.push(historyEvent);

            selected_link = null;
            updateActiveNodes();
            updateSelection();
            redraw();
        }
    }

    function copySelection() {
        if (moving_set.length > 0) {
            var nns = [];
            for (var n=0;n<moving_set.length;n++) {
                var node = moving_set[n].n;
                // The only time a node.type == subflow can be selected is the
                // input/output "proxy" nodes. They cannot be copied.
                if (node.type != "subflow") {
                    for (var d in node._def.defaults) {
                        if (node._def.defaults.hasOwnProperty(d)) {
                            if (node._def.defaults[d].type) {
                                var configNode = RED.nodes.node(node[d]);
                                if (configNode && configNode._def.exclusive) {
                                    nns.push(RED.nodes.convertNode(configNode));
                                }
                            }
                        }
                    }
                    nns.push(RED.nodes.convertNode(node));
                    //TODO: if the node has an exclusive config node, it should also be copied, to ensure it remains exclusive...
                }
            }
            clipboard = JSON.stringify(nns);
            RED.notify(RED._("clipboard.nodeCopied",{count:nns.length}));
        }
    }


    function calculateTextWidth(str, className, offset) {
        return calculateTextDimensions(str,className,offset,0)[0];
    }

    function calculateTextDimensions(str,className,offsetW,offsetH) {
        var sp = document.createElement("span");
        sp.className = className;
        sp.style.position = "absolute";
        sp.style.top = "-1000px";
        sp.textContent = (str||"");
        document.body.appendChild(sp);
        var w = sp.offsetWidth;
        var h = sp.offsetHeight;
        document.body.removeChild(sp);
        return [offsetW+w,offsetH+h];
    }

    function resetMouseVars() {
        mousedown_node = null;
        mouseup_node = null;
        mousedown_link = null;
        mouse_mode = 0;
        mousedown_port_type = PORT_TYPE_OUTPUT;
        activeSpliceLink = null;
        spliceActive = false;
        d3.select(".link_splice").classed("link_splice",false);
        if (spliceTimer) {
            clearTimeout(spliceTimer);
            spliceTimer = null;
        }
    }

    function disableQuickJoinEventHandler(evt) {
        // Check for ctrl (all browsers), "Meta" (Chrome/FF), keyCode 91 (Safari)
        if (evt.keyCode === 17 || evt.key === "Meta" || evt.keyCode === 91) {
            resetMouseVars();
            hideDragLines();
            redraw();
            $(window).off('keyup',disableQuickJoinEventHandler);
        }
    }

    function portMouseDown(d,portType,portIndex) {
        //console.log(d,portType,portIndex);
        // disable zoom
        //vis.call(d3.behavior.zoom().on("zoom"), null);
        mousedown_node = d;
        mousedown_port_type = portType;
        mousedown_port_index = portIndex || 0;
        if (mouse_mode !== RED.state.QUICK_JOINING) {
            mouse_mode = RED.state.JOINING;
            document.body.style.cursor = "crosshair";
            if (d3.event.ctrlKey || d3.event.metaKey) {
                mouse_mode = RED.state.QUICK_JOINING;
                showDragLines([{node:mousedown_node,port:mousedown_port_index,portType:mousedown_port_type}]);
                $(window).on('keyup',disableQuickJoinEventHandler);
            }
        }
        d3.event.stopPropagation();
        d3.event.preventDefault();
    }

    function portMouseUp(d,portType,portIndex) {
        var i;
        if (mouse_mode === RED.state.QUICK_JOINING) {
            if (drag_lines[0].node===d) {
                return
            }
        }
        document.body.style.cursor = "";
        if (mouse_mode == RED.state.JOINING || mouse_mode == RED.state.QUICK_JOINING) {
            if (typeof TouchEvent != "undefined" && d3.event instanceof TouchEvent) {
                RED.nodes.eachNode(function(n) {
                    if (n.z == RED.workspaces.active()) {
                        var hw = n.w/2;
                        var hh = n.h/2;
                        if (n.x-hw<mouse_position[0] && n.x+hw> mouse_position[0] &&
                            n.y-hh<mouse_position[1] && n.y+hh>mouse_position[1]) {
                                mouseup_node = n;
                                portType = mouseup_node.inputs>0?PORT_TYPE_INPUT:PORT_TYPE_OUTPUT;
                                portIndex = 0;
                        }
                    }
                });
            } else {
                mouseup_node = d;
            }
            var addedLinks = [];
            var removedLinks = [];

            for (i=0;i<drag_lines.length;i++) {
                if (drag_lines[i].link) {
                    removedLinks.push(drag_lines[i].link)
                }
            }
            for (i=0;i<drag_lines.length;i++) {
                if (portType != drag_lines[i].portType && mouseup_node !== drag_lines[i].node) {
                    var drag_line = drag_lines[i];
                    var src,dst,src_port;
                    if (drag_line.portType === PORT_TYPE_OUTPUT) {
                        src = drag_line.node;
                        src_port = drag_line.port;
                        dst = mouseup_node;
                        dst_port = portIndex;
                    } else if (drag_line.portType == PORT_TYPE_INPUT) {
                        src = mouseup_node;
                        src_port = portIndex;
                        dst = drag_line.node;
                        dst_port = drag_line.port;
                    }
                    var existingLink = RED.nodes.filterLinks({source:src,target:dst,sourcePort:src_port,targetPort:dst_port}).length !== 0;
                    if (!existingLink) {
                        var link = {source: src, sourcePort: src_port, target: dst, targetPort: dst_port};                        
                        RED.nodes.addLink(link);
                        addedLinks.push(link);
                    }
                }
            }
            if (addedLinks.length > 0 || removedLinks.length > 0) {
                var historyEvent = {
                    t:"add",
                    links:addedLinks,
                    removedLinks: removedLinks,
                    dirty:RED.nodes.dirty()
                };
                if (activeSubflow) {
                    var subflowRefresh = RED.subflow.refresh(true);
                    if (subflowRefresh) {
                        historyEvent.subflow = {
                            id:activeSubflow.id,
                            changed: activeSubflow.changed,
                            instances: subflowRefresh.instances
                        }
                    }
                }
                RED.history.push(historyEvent);
                updateActiveNodes();
                RED.nodes.dirty(true);
            }
            if (mouse_mode === RED.state.QUICK_JOINING) {
                if (addedLinks.length > 0) {
                    hideDragLines();
                    if (portType === PORT_TYPE_INPUT && d.outputs > 0) {
                        showDragLines([{node:d,port:0,portType:PORT_TYPE_OUTPUT}]);
                    } else if (portType === PORT_TYPE_OUTPUT && d.inputs > 0) {
                        showDragLines([{node:d,port:0,portType:PORT_TYPE_INPUT}]);
                    } else {
                        resetMouseVars();
                    }
                }
                redraw();
                return;
            }

            resetMouseVars();
            hideDragLines();
            selected_link = null;
            redraw();
        }
    }

    var portLabelHoverTimeout = null;
    var portLabelHover = null;


    function getElementPosition(node) {
        var d3Node = d3.select(node);
        if (d3Node.attr('class') === 'innerCanvas') {
            return [0,0];
        }
        var result = [];
        var localPos = [0,0];
        if (node.nodeName.toLowerCase() === 'g') {
            var transform = d3Node.attr("transform");
            if (transform) {
                localPos = d3.transform(transform).translate;
            }
        } else {
            localPos = [d3Node.attr("x")||0,d3Node.attr("y")||0];
        }
        var parentPos = getElementPosition(node.parentNode);
        return [localPos[0]+parentPos[0],localPos[1]+parentPos[1]]

    }

    function getPortLabel(node,portType,portIndex) {
        /*var result;
        var nodePortLabels = (portType === PORT_TYPE_INPUT)?node.inputLabels:node.outputLabels;
        if (nodePortLabels && nodePortLabels[portIndex]) {
            return nodePortLabels[portIndex];
        }
        var portLabels = (portType === PORT_TYPE_INPUT)?node._def.inputLabels:node._def.outputLabels;
        if (typeof portLabels === 'string') {
            result = portLabels;
        } else if (typeof portLabels === 'function') {
            try {
                result = portLabels.call(node,portIndex);
            } catch(err) {
                console.log("Definition error: "+node.type+"."+((portType === PORT_TYPE_INPUT)?"inputLabels":"outputLabels"),err);
                result = null;
            }
        } else if ($.isArray(portLabels)) {
            result = portLabels[portIndex];
        }
        return result;*/
    }

    function portMouseOver(port,d,portType,portIndex) {
        var active = (mouse_mode!=RED.state.JOINING || (drag_lines.length > 0 && drag_lines[0].portType !== portType));
        /*clearTimeout(portLabelHoverTimeout);
        var active = (mouse_mode!=RED.state.JOINING || (drag_lines.length > 0 && drag_lines[0].portType !== portType));
        if (active && ((portType === PORT_TYPE_INPUT && ((d._def && d._def.inputLabels)||d.inputLabels)) || (portType === PORT_TYPE_OUTPUT && ((d._def && d._def.outputLabels)||d.outputLabels)))) {
            portLabelHoverTimeout = setTimeout(function() {
                var tooltip = getPortLabel(d,portType,portIndex);
                if (!tooltip) {
                    return;
                }
                var pos = getElementPosition(port.node());
                portLabelHoverTimeout = null;
                portLabelHover = vis.append("g")
                    .attr("transform","translate("+(pos[0]+(portType===PORT_TYPE_INPUT?-2:12))+","+(pos[1]+5)+")")
                    .attr("class","port_tooltip");
                var lines = tooltip.split("\n");
                var labelWidth = 0;
                var labelHeight = 4;
                var labelHeights = [];
                lines.forEach(function(l) {
                    var labelDimensions = calculateTextDimensions(l, "port_tooltip_label", 8,0);
                    labelWidth = Math.max(labelWidth,labelDimensions[0]);
                    labelHeights.push(0.8*labelDimensions[1]);
                    labelHeight += 0.8*labelDimensions[1];
                });

                var labelHeight1 = (labelHeight/2)-5-2;
                var labelHeight2 = labelHeight - 4;
                portLabelHover.append("path").attr("d",
                    portType===PORT_TYPE_INPUT?
                        "M0 0 l -5 -5 v -"+(labelHeight1)+" q 0 -2 -2 -2 h -"+labelWidth+" q -2 0 -2 2 v "+(labelHeight2)+" q 0 2 2 2 h "+labelWidth+" q 2 0 2 -2 v -"+(labelHeight1)+" l 5 -5"
                        :
                        "M0 0 l 5 -5 v -"+(labelHeight1)+" q 0 -2 2 -2 h "+labelWidth+" q 2 0 2 2 v "+(labelHeight2)+" q 0 2 -2 2 h -"+labelWidth+" q -2 0 -2 -2 v -"+(labelHeight1)+" l -5 -5"
                    );
                var y = -labelHeight/2-2;
                lines.forEach(function(l,i) {
                    //y += labelHeights[i];
                    portLabelHover.append("svg:text").attr("class","port_tooltip_label")
                        .attr("x", portType===PORT_TYPE_INPUT?-10:10)
                        .attr("y", y)
                        .attr("text-anchor",portType===PORT_TYPE_INPUT?"end":"start")
                        .text(l)
                });
            },500);
        }*/
        port.classed("port_hovered",active);
    }
    function portMouseOut(port,d,portType,portIndex) {
        /*clearTimeout(portLabelHoverTimeout);
        if (portLabelHover) {
            portLabelHover.remove();
            portLabelHover = null;
        }*/
        port.classed("port_hovered",false);
    }

    function nodeMouseUp(d) {
        if (dblClickPrimed && mousedown_node == d && clickElapsed > 0 && clickElapsed < 750) {
            mouse_mode = RED.state.DEFAULT;
            if (d.type != "subflow") {
                RED.editor.edit(d);
            } else {
                RED.editor.editSubflow(activeSubflow);
            }
            clickElapsed = 0;
            d3.event.stopPropagation();
            return;
        }
        var direction = d._def? (d.inputs > 0 ? 1: 0) : (d.direction == "in" ? 0: 1)
    }

    function nodeMouseDown(d) {
        focusView();
        //var touch0 = d3.event;
        //var pos = [touch0.pageX,touch0.pageY];
        //RED.touch.radialMenu.show(d3.select(this),pos);
        if (mouse_mode == RED.state.IMPORT_DRAGGING) {
            RED.keyboard.remove("escape");

            if (activeSpliceLink) {
                // TODO: DRY - droppable/nodeMouseDown/canvasMouseUp
                var spliceLink = d3.select(activeSpliceLink).data()[0];
                RED.nodes.removeLink(spliceLink);
                var link1 = {
                    source:spliceLink.source,
                    sourcePort:spliceLink.sourcePort,
                    target: moving_set[0].n
                };
                var link2 = {
                    source:moving_set[0].n,
                    sourcePort:0,
                    target: spliceLink.target
                };
                RED.nodes.addLink(link1);
                RED.nodes.addLink(link2);
                var historyEvent = RED.history.peek();
                historyEvent.links = [link1,link2];
                historyEvent.removedLinks = [spliceLink];
                updateActiveNodes();
            }

            updateSelection();
            RED.nodes.dirty(true);
            redraw();
            resetMouseVars();
            d3.event.stopPropagation();
            return;
        } else if (mouse_mode == RED.state.QUICK_JOINING) {
            d3.event.stopPropagation();
            return;
        }
        mousedown_node = d;
        var now = Date.now();
        clickElapsed = now-clickTime;
        clickTime = now;

        dblClickPrimed = (lastClickNode == mousedown_node);
        lastClickNode = mousedown_node;

        var i;

        if (d.selected && (d3.event.ctrlKey||d3.event.metaKey)) {
            mousedown_node.selected = false;
            for (i=0;i<moving_set.length;i+=1) {
                if (moving_set[i].n === mousedown_node) {
                    moving_set.splice(i,1);
                    break;
                }
            }
        } else {
            if (d3.event.shiftKey) {
                clearSelection();
                var cnodes = RED.nodes.getAllFlowNodes(mousedown_node);
                for (var n=0;n<cnodes.length;n++) {
                    cnodes[n].selected = true;
                    cnodes[n].dirty = true;
                    moving_set.push({n:cnodes[n]});
                }
            } else if (!d.selected) {
                if (!d3.event.ctrlKey && !d3.event.metaKey) {
                    clearSelection();
                }
                mousedown_node.selected = true;
                moving_set.push({n:mousedown_node});
            }
            selected_link = null;
            if (d3.event.button != 2) {
                mouse_mode = RED.state.MOVING;
                var mouse = d3.touches(this)[0]||d3.mouse(this);
                mouse[0] += d.x-d.w/2;
                mouse[1] += d.y-d.h/2;
                for (i=0;i<moving_set.length;i++) {
                    moving_set[i].ox = moving_set[i].n.x;
                    moving_set[i].oy = moving_set[i].n.y;
                    moving_set[i].dx = moving_set[i].n.x-mouse[0];
                    moving_set[i].dy = moving_set[i].n.y-mouse[1];
                }
                mouse_offset = d3.mouse(document.body);
                if (isNaN(mouse_offset[0])) {
                    mouse_offset = d3.touches(document.body)[0];
                }
            }
        }
        d.dirty = true;
        updateSelection();
        redraw();
        d3.event.stopPropagation();
    }

    function isButtonEnabled(d) {
        var buttonEnabled = true;
        if (d._def.button.hasOwnProperty('enabled')) {
            if (typeof d._def.button.enabled === "function") {
                buttonEnabled = d._def.button.enabled.call(d);
            } else {
                buttonEnabled = d._def.button.enabled;
            }
        }
        return buttonEnabled;
    }

    function nodeButtonClicked(d) {
        if (!activeSubflow) {
            if (d._def.button.toggle) {
                d[d._def.button.toggle] = !d[d._def.button.toggle];
                d.dirty = true;
            }
            if (d._def.button.onclick) {
                try {
                    d._def.button.onclick.call(d);
                } catch(err) {
                    console.log("Definition error: "+d.type+".onclick",err);
                }
            }
            if (d.dirty) {
                redraw();
            }
        } else {
            RED.notify(RED._("notification.warning", {message:RED._("notification.warnings.nodeActionDisabled")}),"warning");
        }
        d3.event.preventDefault();
    }

    function showTouchMenu(obj,pos) {
        var mdn = mousedown_node;
        var options = [];
        options.push({name:"delete",disabled:(moving_set.length===0 && selected_link === null),onselect:function() {deleteSelection();}});
        options.push({name:"cut",disabled:(moving_set.length===0),onselect:function() {copySelection();deleteSelection();}});
        options.push({name:"copy",disabled:(moving_set.length===0),onselect:function() {copySelection();}});
        options.push({name:"paste",disabled:(clipboard.length===0),onselect:function() {importNodes(clipboard,false,true);}});
        options.push({name:"edit",disabled:(moving_set.length != 1),onselect:function() { RED.editor.edit(mdn);}});
        options.push({name:"select",onselect:function() {selectAll();}});
        options.push({name:"undo",disabled:(RED.history.depth() === 0),onselect:function() {RED.history.pop();}});

        RED.touch.radialMenu.show(obj,pos,options);
        resetMouseVars();
    }

    function redraw() {
        vis.attr("transform","scale("+scaleFactor+")");
        outer.attr("width", space_width*scaleFactor).attr("height", space_height*scaleFactor);

        // Don't bother redrawing nodes if we're drawing links
        if (mouse_mode != RED.state.JOINING) {

            var dirtyNodes = {};

            if (activeSubflow) {
                var subflowOutputs = vis.selectAll(".subflowoutput").data(activeSubflow.out,function(d,i){ return d.id;});
                subflowOutputs.exit().remove();
                var outGroup = subflowOutputs.enter().insert("svg:g").attr("class","node subflowoutput").attr("transform",function(d) { return "translate("+(d.x-20)+","+(d.y-20)+")"});
                outGroup.each(function(d,i) {
                    d.w=40;
                    d.h=40;
                });
                outGroup.append("rect").attr("class","subflowport").attr("rx",8).attr("ry",8).attr("width",40).attr("height",40)
                    // TODO: This is exactly the same set of handlers used for regular nodes - DRY
                    .on("mouseup",nodeMouseUp)
                    .on("mousedown",nodeMouseDown)
                    .on("touchstart",function(d) {
                            var obj = d3.select(this);
                            var touch0 = d3.event.touches.item(0);
                            var pos = [touch0.pageX,touch0.pageY];
                            startTouchCenter = [touch0.pageX,touch0.pageY];
                            startTouchDistance = 0;
                            touchStartTime = setTimeout(function() {
                                    showTouchMenu(obj,pos);
                            },touchLongPressTimeout);
                            nodeMouseDown.call(this,d)
                    })
                    .on("touchend", function(d) {
                            clearTimeout(touchStartTime);
                            touchStartTime = null;
                            if  (RED.touch.radialMenu.active()) {
                                d3.event.stopPropagation();
                                return;
                            }
                            nodeMouseUp.call(this,d);
                    });

                outGroup.append("g").attr('transform','translate(-5,15)').append("rect").attr("class","port").attr("rx",3).attr("ry",3).attr("width",10).attr("height",10)
                    .on("mousedown", function(d,i){portMouseDown(d,PORT_TYPE_INPUT,i);} )
                    .on("touchstart", function(d,i){portMouseDown(d,PORT_TYPE_INPUT,i);} )
                    .on("mouseup", function(d,i){portMouseUp(d,PORT_TYPE_INPUT,i);})
                    .on("touchend",function(d,i){portMouseUp(d,PORT_TYPE_INPUT,i);} )
                    .on("mouseover",function(d){portMouseOver(d3.select(this),d,PORT_TYPE_INPUT,i);})
                    .on("mouseout",function(d){portMouseOut(d3.select(this),d,PORT_TYPE_INPUT,i);});

                outGroup.append("svg:text").attr("class","port_label").attr("x",20).attr("y",8).style("font-size","10px").text("output");
                outGroup.append("svg:text").attr("class","port_label port_index").attr("x",20).attr("y",24).text(function(d,i){ return i+1});

                var subflowInputs = vis.selectAll(".subflowinput").data(activeSubflow.in,function(d,i){ return d.id;});
                subflowInputs.exit().remove();
                var inGroup = subflowInputs.enter().insert("svg:g").attr("class","node subflowinput").attr("transform",function(d) { return "translate("+(d.x-20)+","+(d.y-20)+")"});
                inGroup.each(function(d,i) {
                    d.w=40;
                    d.h=40;
                });
                inGroup.append("rect").attr("class","subflowport").attr("rx",8).attr("ry",8).attr("width",40).attr("height",40)
                    // TODO: This is exactly the same set of handlers used for regular nodes - DRY
                    .on("mouseup",nodeMouseUp)
                    .on("mousedown",nodeMouseDown)
                    .on("touchstart",function(d) {
                            var obj = d3.select(this);
                            var touch0 = d3.event.touches.item(0);
                            var pos = [touch0.pageX,touch0.pageY];
                            startTouchCenter = [touch0.pageX,touch0.pageY];
                            startTouchDistance = 0;
                            touchStartTime = setTimeout(function() {
                                    showTouchMenu(obj,pos);
                            },touchLongPressTimeout);
                            nodeMouseDown.call(this,d)
                    })
                    .on("touchend", function(d) {
                            clearTimeout(touchStartTime);
                            touchStartTime = null;
                            if  (RED.touch.radialMenu.active()) {
                                d3.event.stopPropagation();
                                return;
                            }
                            nodeMouseUp.call(this,d);
                    });

                inGroup.append("g").attr('transform','translate(35,15)').append("rect").attr("class","port").attr("rx",3).attr("ry",3).attr("width",10).attr("height",10)
                    .on("mousedown", function(d,i){portMouseDown(d,PORT_TYPE_OUTPUT,i);} )
                    .on("touchstart", function(d,i){portMouseDown(d,PORT_TYPE_OUTPUT,i);} )
                    .on("mouseup", function(d,i){portMouseUp(d,PORT_TYPE_OUTPUT,i);})
                    .on("touchend",function(d,i){portMouseUp(d,PORT_TYPE_OUTPUT,i);} )
                    .on("mouseover",function(d){portMouseOver(d3.select(this),d,PORT_TYPE_OUTPUT,i);})
                    .on("mouseout",function(d) {portMouseOut(d3.select(this),d,PORT_TYPE_OUTPUT,i);});
                inGroup.append("svg:text").attr("class","port_label").attr("x",18).attr("y",20).style("font-size","10px").text("input");

                subflowOutputs.each(function(d,i) {
                    if (d.dirty) {
                        var output = d3.select(this);
                        output.selectAll(".subflowport").classed("node_selected",function(d) { return d.selected; })
                        output.selectAll(".subflowport").classed("node_working",function(d) { return d.working; })
                        output.selectAll(".port_index").text(function(d){ return d.i+1});
                        output.attr("transform", function(d) { return "translate(" + (d.x-d.w/2) + "," + (d.y-d.h/2) + ")"; });
                        dirtyNodes[d.id] = d;
                        d.dirty = false;
                    }
                });
                subflowInputs.each(function(d,i) {
                    if (d.dirty) {
                        var input = d3.select(this);
                        input.selectAll(".subflowport").classed("node_selected",function(d) { return d.selected; })
                        input.selectAll(".subflowport").classed("node_working",function(d) { return d.working; })
                        input.attr("transform", function(d) { return "translate(" + (d.x-d.w/2) + "," + (d.y-d.h/2) + ")"; });
                        dirtyNodes[d.id] = d;
                        d.dirty = false;
                    }
                });
            } else {
                vis.selectAll(".subflowoutput").remove();
                vis.selectAll(".subflowinput").remove();
            }

            var node = vis.selectAll(".nodegroup").data(activeNodes,function(d){return d.id});
            node.exit().remove();

            var nodeEnter = node.enter().insert("svg:g")
                .attr("class", "node nodegroup")
                .classed("node_subflow",function(d) { return activeSubflow != null; })
                .classed("node_link",function(d) { return d.type === "link in" || d.type === "link out" });

            nodeEnter.each(function(d,i) {
                    var node = d3.select(this);
                    var isLink = d.type === "link in" || d.type === "link out";
                    node.attr("id",d.id);
                    var l = RED.utils.getNodeLabel(d);
                    if (isLink) {
                        d.w = node_height;
                    } else {
                        d.w = Math.max(node_width,gridSize*(Math.ceil((calculateTextWidth(l, "node_label", 50)+(d._def.inputs>0?7:0))/gridSize)) );
                    }
                    d.h = Math.max(Math.max(node_height,(d.outputs||0) * 20),(d.inputs||0) * 20);

                    if (d._def.badge) {
                        var badge = node.append("svg:g").attr("class","node_badge_group");
                        var badgeRect = badge.append("rect").attr("class","node_badge").attr("rx",5).attr("ry",5).attr("width",40).attr("height",15);
                        badge.append("svg:text").attr("class","node_badge_label").attr("x",35).attr("y",11).attr("text-anchor","end").text(d._def.badge());
                        if (d._def.onbadgeclick) {
                            badgeRect.attr("cursor","pointer")
                                .on("click",function(d) { d._def.onbadgeclick.call(d);d3.event.preventDefault();});
                        }
                    }

                    if (d._def.button) {
                        var nodeButtonGroup = node.append("svg:g")
                            .attr("transform",function(d) { return "translate("+((d._def.align == "right") ? 94 : -25)+",2)"; })
                            .attr("class",function(d) { return "node_button "+((d._def.align == "right") ? "node_right_button" : "node_left_button"); });
                        nodeButtonGroup.append("rect")
                            .attr("rx",5)
                            .attr("ry",5)
                            .attr("width",32)
                            .attr("height",node_height-4)
                            .attr("fill","#eee");//function(d) { return d._def.color;})
                        nodeButtonGroup.append("rect")
                            .attr("class","node_button_button")
                            .attr("x",function(d) { return d._def.align == "right"? 11:5})
                            .attr("y",4)
                            .attr("rx",4)
                            .attr("ry",4)
                            .attr("width",16)
                            .attr("height",node_height-12)
                            .attr("fill",function(d) { return d._def.color;})
                            .attr("cursor","pointer")
                            .on("mousedown",function(d) {if (!lasso && isButtonEnabled(d)) {focusView();d3.select(this).attr("fill-opacity",0.2);d3.event.preventDefault(); d3.event.stopPropagation();}})
                            .on("mouseup",function(d) {if (!lasso && isButtonEnabled(d)) { d3.select(this).attr("fill-opacity",0.4);d3.event.preventDefault();d3.event.stopPropagation();}})
                            .on("mouseover",function(d) {if (!lasso && isButtonEnabled(d)) { d3.select(this).attr("fill-opacity",0.4);}})
                            .on("mouseout",function(d) {if (!lasso && isButtonEnabled(d)) {
                                var op = 1;
                                if (d._def.button.toggle) {
                                    op = d[d._def.button.toggle]?1:0.2;
                                }
                                d3.select(this).attr("fill-opacity",op);
                            }})
                            .on("click",nodeButtonClicked)
                            .on("touchstart",nodeButtonClicked)
                    }

                    var mainRect = node.append("rect")
                        .attr("class", "node")
                        .classed("node_unknown",function(d) { return d.type == "unknown"; })
                        .attr("rx", 5)
                        .attr("ry", 5)
                        .attr("fill",function(d) { return d._def.color;})
                        .on("mouseup",nodeMouseUp)
                        .on("mousedown",nodeMouseDown)
                        .on("touchstart",function(d) {
                            var obj = d3.select(this);
                            var touch0 = d3.event.touches.item(0);
                            var pos = [touch0.pageX,touch0.pageY];
                            startTouchCenter = [touch0.pageX,touch0.pageY];
                            startTouchDistance = 0;
                            touchStartTime = setTimeout(function() {
                                showTouchMenu(obj,pos);
                            },touchLongPressTimeout);
                            nodeMouseDown.call(this,d)
                        })
                        .on("touchend", function(d) {
                            clearTimeout(touchStartTime);
                            touchStartTime = null;
                            if  (RED.touch.radialMenu.active()) {
                                d3.event.stopPropagation();
                                return;
                            }
                            nodeMouseUp.call(this,d);
                        })
                        .on("mouseover",function(d) {
                            if (mouse_mode === 0) {
                                var node = d3.select(this);
                                node.classed("node_hovered",true);
                            }
                        })
                        .on("mouseout",function(d) {
                            var node = d3.select(this);
                            node.classed("node_hovered",false);
                        });

                   //node.append("rect").attr("class", "node-gradient-top").attr("rx", 6).attr("ry", 6).attr("height",30).attr("stroke","none").attr("fill","url(#gradient-top)").style("pointer-events","none");
                   //node.append("rect").attr("class", "node-gradient-bottom").attr("rx", 6).attr("ry", 6).attr("height",30).attr("stroke","none").attr("fill","url(#gradient-bottom)").style("pointer-events","none");

                    if (d._def.icon) {
                        var icon_url = RED.utils.getNodeIcon(d._def,d);
                        var icon_group = node.append("g")
                            .attr("class","node_icon_group")
                            .attr("x",0).attr("y",0);

                        var icon_shade = icon_group.append("rect")
                            .attr("x",0).attr("y",0)
                            .attr("class","node_icon_shade")
                            .attr("width","30")
                            .attr("stroke","none")
                            .attr("fill","#000")
                            .attr("fill-opacity","0.05")
                            .attr("height",function(d){return Math.min(50,d.h-4);});

                        var icon = icon_group.append("image")
                            .attr("xlink:href",icon_url)
                            .attr("class","node_icon")
                            .attr("x",0)
                            .attr("width","30")
                            .attr("height","30");

                        var icon_shade_border = icon_group.append("path")
                            .attr("d",function(d) { return "M 30 1 l 0 "+(d.h-2)})
                            .attr("class","node_icon_shade_border")
                            .attr("stroke-opacity","0.1")
                            .attr("stroke","#000")
                            .attr("stroke-width","1");

                        if ("right" == d._def.align) {
                            icon_group.attr("class","node_icon_group node_icon_group_"+d._def.align);
                            icon_shade_border.attr("d",function(d) { return "M 0 1 l 0 "+(d.h-2)})
                            //icon.attr("class","node_icon node_icon_"+d._def.align);
                            //icon.attr("class","node_icon_shade node_icon_shade_"+d._def.align);
                            //icon.attr("class","node_icon_shade_border node_icon_shade_border_"+d._def.align);
                        }

                        //if (d.inputs > 0 && d._def.align == null) {
                        //    icon_shade.attr("width",35);
                        //    icon.attr("transform","translate(5,0)");
                        //    icon_shade_border.attr("transform","translate(5,0)");
                        //}
                        //if (d._def.outputs > 0 && "right" == d._def.align) {
                        //    icon_shade.attr("width",35); //icon.attr("x",5);
                        //}

                        var img = new Image();
                        img.src = icon_url;
                        img.onload = function() {
                            icon.attr("width",Math.min(img.width,30));
                            icon.attr("height",Math.min(img.height,30));
                            icon.attr("x",15-Math.min(img.width,30)/2);
                            //if ("right" == d._def.align) {
                            //    icon.attr("x",function(d){return d.w-img.width-1-(d.outputs>0?5:0);});
                            //    icon_shade.attr("x",function(d){return d.w-30});
                            //    icon_shade_border.attr("d",function(d){return "M "+(d.w-30)+" 1 l 0 "+(d.h-2);});
                            //}
                        }

                        //icon.style("pointer-events","none");
                        icon_group.style("pointer-events","none");
                    }
                    if (!isLink) {
                        var text = node.append("svg:text").attr("class","node_label").attr("x", 38).attr("dy", ".40em").attr("text-anchor","start");
                        if (d._def.align) {
                            text.attr("class","node_label node_label_"+d._def.align);
                            if (d._def.align === "right") {
                                text.attr("text-anchor","end");
                            }
                        }

                        var statusTop = node.append("svg:text").attr("class","node_status_label_top").attr("x",7).attr("y",-3);

                        var statusBottom = node.append("svg:g").attr("class","node_status_group_bottom").style("display","none");

                        var statusBottomRect = statusBottom.append("rect").attr("class","node_status_bottom")
                                            .attr("x",6).attr("y",1).attr("width",9).attr("height",9)
                                            .attr("rx",2).attr("ry",2).attr("stroke-width","3");

                        var statusBottomLabel = statusBottom.append("svg:text")
                            .attr("class","node_status_label_bottom")
                            .attr("x",20).attr("y",9);
                    }
                    //node.append("circle").attr({"class":"centerDot","cx":0,"cy":0,"r":5});

                    //node.append("path").attr("class","node_error").attr("d","M 3,-3 l 10,0 l -5,-8 z");

                    //TODO: these ought to be SVG
                    node.append("image").attr("class","node_error hidden").attr("xlink:href","icons/node-red/node-error.png").attr("x",0).attr("y",-6).attr("width",10).attr("height",9);
                    node.append("image").attr("class","node_changed hidden").attr("xlink:href","icons/node-red/node-changed.png").attr("x",12).attr("y",-6).attr("width",10).attr("height",10);
            });

            node.each(function(d,i) {
                    if (d.dirty) {
                        var isLink = d.type === "link in" || d.type === "link out";
                        dirtyNodes[d.id] = d;
                        //if (d.x < -50) deleteSelection();  // Delete nodes if dragged back to palette
                        if (!isLink && d.resize) {
                            var l = RED.utils.getNodeLabel(d);
                            var ow = d.w;
                            d.w = Math.max(node_width,gridSize*(Math.ceil((calculateTextWidth(l, "node_label", 50)+(d._def.inputs>0?7:0))/gridSize)) );
                            d.h = Math.max(Math.max(node_height,(d.outputs||0) * 20),(d.inputs||0) * 20);
                            d.x += (d.w-ow)/2;
                            d.resize = false;
                        }
                        var thisNode = d3.select(this);
                        //thisNode.selectAll(".centerDot").attr({"cx":function(d) { return d.w/2;},"cy":function(d){return d.h/2}});
                        thisNode.attr("transform", function(d) { return "translate(" + (d.x-d.w/2) + "," + (d.y-d.h/2) + ")"; });

                        if (mouse_mode != RED.state.MOVING_ACTIVE) {
                            thisNode.selectAll(".node")
                                .attr("width",function(d){return d.w})
                                .attr("height",function(d){return d.h})
                                .classed("node_selected",function(d) { return d.selected; })
                                .classed("node_working",function(d) { return d.working; })
                                .classed("node_highlighted",function(d) { return d.highlighted; })
                            ;
                            //thisNode.selectAll(".node-gradient-top").attr("width",function(d){return d.w});
                            //thisNode.selectAll(".node-gradient-bottom").attr("width",function(d){return d.w}).attr("y",function(d){return d.h-30});

                            thisNode.selectAll(".node_icon_group_right").attr("transform", function(d){return "translate("+(d.w-30)+",0)"});
                            thisNode.selectAll(".node_label_right").attr("x", function(d){return d.w-38});
                            //thisNode.selectAll(".node_icon_right").attr("x",function(d){return d.w-d3.select(this).attr("width")-1-(d.outputs>0?5:0);});
                            //thisNode.selectAll(".node_icon_shade_right").attr("x",function(d){return d.w-30;});
                            //thisNode.selectAll(".node_icon_shade_border_right").attr("d",function(d){return "M "+(d.w-30)+" 1 l 0 "+(d.h-2)});

                            var numInputs = d.inputs;
                            var y = (d.h/2)-((numInputs-1)/2)*18;
                            d.inputPorts = d.inputPorts || d3.range(numInputs);
                            d._inputPorts = thisNode.selectAll(".port_input").data(d.inputPorts);
                            var input_group = d._inputPorts.enter().append("g").attr("class","port_input");

                            input_group.append("rect").attr("class","port").attr("rx",3).attr("ry",3).attr("width",10).attr("height",10)
                                .on("mousedown",(function(){var node = d; return function(d,i){portMouseDown(node,PORT_TYPE_INPUT,i);}})() )
                                .on("touchstart",(function(){var node = d; return function(d,i){portMouseDown(node,PORT_TYPE_INPUT,i);}})() )
                                .on("mouseup",(function(){var node = d; return function(d,i){portMouseUp(node,PORT_TYPE_INPUT,i);}})() )
                                .on("touchend",(function(){var node = d; return function(d,i){portMouseUp(node,PORT_TYPE_INPUT,i);}})() )
                                .on("mouseover",(function(){var node = d; return function(d,i){portMouseOver(d3.select(this),node,PORT_TYPE_INPUT,i);}})())
                                .on("mouseout",(function(){var node = d; return function(d,i) {portMouseOut(d3.select(this),node,PORT_TYPE_INPUT,i);}})());

                            input_group.each(function(i){
                                if(d._def && d._def.inputInfo && i < d._def.inputInfo.length) {
                                    var inputInfo = d._def.inputInfo[i];
                                    var infoBody = i18n.t(d.namespace + "/" + d.type + ".hni:" + d.type + ".input" + (i + 1) + "Description");
                                    if(inputInfo.types) {
                                        var content = inputInfo.label ? "<p><b>" + inputInfo.label + "</b></p>" : "";
                                        content += "<p><i>";
                                        for(var i = 0; i < inputInfo.types.length; i++) {
                                            if(i != 0) content += ", ";
                                            content += inputInfo.types[i];
                                        }
                                        content += "</i></p>" + infoBody;

                                        var popover = RED.popover.create({
                                            target:$(this),
                                            trigger: "hover",
                                            width: "250px",
                                            content: content,
                                            direction: "left",
                                            offsetX: -13,
                                            offsetY: 4,
                                            delay: { show: 750, hide: 50 }
                                        });
                                        $(this).data('popover',popover);
                                    }
                                }
                            });

                            d._inputPorts.exit().remove();
                            if (d._inputPorts) {
                                numInputs = d.inputs || 1;
                                y = (d.h/2)-((numInputs-1)/2)*18;
                                var x = -5;
                                d._inputPorts.each(function(d,i) {
                                        var port = d3.select(this);
                                        port.attr("transform", function(d) { return "translate("+x+","+((y+18*i)-5)+")";});
                                });
                            }

                            numInputs = d.inputs;
                            y = (d.h/2)-((numInputs-1)/2)*18;
                            if(d.inputPortLabels && d.inputPortLabels.length != numInputs) d.inputPortLabels = null;
                            d.inputPortLabels = d.inputPortLabels || d3.range(numInputs);
                            d._inputPortLabels = thisNode.selectAll(".port_input_label").data(d.inputPortLabels);
                            var input_labels_group = d._inputPortLabels.enter().append("g").attr("class","port_input_label");

                            input_labels_group.append("svg:text").attr("class","input_label").attr("rx",0).attr("ry",0).attr("width",50).attr("height",10);

                            d._inputPortLabels.exit().remove();
                            if (d._inputPortLabels) {
                                numInputs = d.inputs || 1;
                                y = (d.h/2)-((numInputs-1)/2)*18;
                                var x = -5;
                                var node = d;
                                d._inputPortLabels.each(function(d,i) {
                                        var label = d3.select(this);
                                        label.attr("transform", function(d) { return "translate("+x+","+((y+18*i)-5)+")";});
                                        if(node._def && node._def.inputInfo && i < node._def.inputInfo.length && node._def.inputInfo[i].label) label.selectAll(".input_label").text(node._def.inputInfo[i].label);
                                        else if(numInputs > 1) label.selectAll(".input_label").text(i);
                                        else label.selectAll(".input_label").text("");
                                });
                            }

                            var numOutputs = d.outputs;
                            y = (d.h/2)-((numOutputs-1)/2)*18;
                            d.outputPorts = d.outputPorts || d3.range(numOutputs);
                            d._outputPorts = thisNode.selectAll(".port_output").data(d.outputPorts);
                            var output_group = d._outputPorts.enter().append("g").attr("class","port_output");

                            output_group.append("rect").attr("class","port").attr("rx",3).attr("ry",3).attr("width",10).attr("height",10)
                                .on("mousedown",(function(){var node = d; return function(d,i){portMouseDown(node,PORT_TYPE_OUTPUT,i);}})() )
                                .on("touchstart",(function(){var node = d; return function(d,i){portMouseDown(node,PORT_TYPE_OUTPUT,i);}})() )
                                .on("mouseup",(function(){var node = d; return function(d,i){portMouseUp(node,PORT_TYPE_OUTPUT,i);}})() )
                                .on("touchend",(function(){var node = d; return function(d,i){portMouseUp(node,PORT_TYPE_OUTPUT,i);}})() )
                                .on("mouseover",(function(){var node = d; return function(d,i){portMouseOver(d3.select(this),node,PORT_TYPE_OUTPUT,i);}})())
                                .on("mouseout",(function(){var node = d; return function(d,i) {portMouseOut(d3.select(this),node,PORT_TYPE_OUTPUT,i);}})());

                            output_group.each(function(i){
                                if(d._def && d._def.outputInfo && i < d._def.outputInfo.length) {
                                    var outputInfo = d._def.outputInfo[i];
                                    var infoBody = i18n.t(d.namespace + "/" + d.type + ".hni:" + d.type + ".output" + (i + 1) + "Description");
                                    if(outputInfo.types) {
                                        var content = outputInfo.label ? "<p><b>" + outputInfo.label + "</b></p>" : "";
                                        content += "<p><i>";
                                        for(var i = 0; i < outputInfo.types.length; i++) {
                                            if(i != 0) content += ", ";
                                            content += outputInfo.types[i];
                                        }
                                        content += "</i></p>" + infoBody;

                                        var popover = RED.popover.create({
                                            target:$(this),
                                            trigger: "hover",
                                            width: "250px",
                                            content: content,
                                            offsetX: 10,
                                            offsetY: 4,
                                            delay: { show: 750, hide: 50 }
                                        });
                                        $(this).data('popover',popover);
                                    }
                                }
                            });

                            d._outputPorts.exit().remove();
                            if (d._outputPorts) {
                                numOutputs = d.outputs || 1;
                                y = (d.h/2)-((numOutputs-1)/2)*18;
                                var x = d.w - 5;
                                d._outputPorts.each(function(d,i) {
                                        var port = d3.select(this);
                                        port.attr("transform", function(d) { return "translate("+x+","+((y+18*i)-5)+")";});
                                });
                            }

                            numOutputs = d.outputs;
                            y = (d.h/2)-((numOutputs-1)/2)*18;
                            if(d.outputPortLabels && d.outputPortLabels.length != numOutputs) d.outputPortLabels = null;
                            d.outputPortLabels = d.outputPortLabels || d3.range(numOutputs);
                            d._outputPortLabels = thisNode.selectAll(".port_output_label").data(d.outputPortLabels);
                            var output_labels_group = d._outputPortLabels.enter().append("g").attr("class","port_output_label");

                            output_labels_group.append("svg:text").attr("class","output_label").attr("rx",0).attr("ry",0).attr("width",50).attr("height",10);

                            d._outputPortLabels.exit().remove();
                            if (d._outputPortLabels) {
                                numOutputs = d.outputs || 1;
                                y = (d.h/2)-((numOutputs-1)/2)*18;
                                var x = d.w + 5;
                                var node = d;
                                d._outputPortLabels.each(function(d,i) {
                                        var label = d3.select(this);
                                        label.attr("transform", function(d) { return "translate("+x+","+((y+18*i)-5)+")";});
                                        if(node._def && node._def.outputInfo && i < node._def.outputInfo.length && node._def.outputInfo[i].label) label.selectAll(".input_label").text(node._def.outputInfo[i].label);
                                        else if(numOutputs > 1) label.selectAll(".output_label").text(i);
                                        else label.selectAll(".output_label").text("");
                                });
                            }

                            thisNode.selectAll("text.node_label").text(function(d,i){
                                    var l = "";
                                    if (d._def.label) {
                                        l = d._def.label;
                                        try {
                                            l = (typeof l === "function" ? l.call(d) : l)||"";
                                            l = RED.text.bidi.enforceTextDirectionWithUCC(l);
                                        } catch(err) {
                                            console.log("Definition error: "+d.type+".label",err);
                                            l = d.type;
                                        }
                                    }
                                    return l;
                                })
                                .attr("y", function(d){return (d.h/2)-1;})
                                .attr("class",function(d){
                                    var s = "";
                                    if (d._def.labelStyle) {
                                        s = d._def.labelStyle;
                                        try {
                                            s = (typeof s === "function" ? s.call(d) : s)||"";
                                        } catch(err) {
                                            console.log("Definition error: "+d.type+".labelStyle",err);
                                            s = "";
                                        }
                                        s = " "+s;
                                    }
                                    return "node_label"+
                                    (d._def.align?" node_label_"+d._def.align:"")+s;
                            });

                            if (d._def.icon) {
                                icon = thisNode.select(".node_icon");
                                var current_url = icon.attr("xlink:href");
                                var new_url = RED.utils.getNodeIcon(d._def,d);
                                if (new_url !== current_url) {
                                    icon.attr("xlink:href",new_url);
                                    var img = new Image();
                                    img.src = new_url;
                                    img.onload = function() {
                                        icon.attr("width",Math.min(img.width,30));
                                        icon.attr("height",Math.min(img.height,30));
                                        icon.attr("x",15-Math.min(img.width,30)/2);
                                    }
                                }
                            }


                            thisNode.selectAll(".node_tools").attr("x",function(d){return d.w-35;}).attr("y",function(d){return d.h-20;});

                            thisNode.selectAll(".node_changed")
                                .attr("x",function(d){return d.w-10})
                                .classed("hidden",function(d) { return !d.changed; });

                            thisNode.selectAll(".node_error")
                                .attr("x",function(d){return d.w-10-(d.changed?13:0)})
                                .classed("hidden",function(d) { return d.valid; });

                            /*thisNode.selectAll(".port_input").each(function(d,i) {
                                    var port = d3.select(this);
                                    port.attr("transform",function(d){return "translate(-5,"+((d.h/2)-5)+")";})
                            });*/

                            thisNode.selectAll(".node_icon").attr("y",function(d){return (d.h-d3.select(this).attr("height"))/2;});
                            thisNode.selectAll(".node_icon_shade").attr("height",function(d){return d.h;});
                            thisNode.selectAll(".node_icon_shade_border").attr("d",function(d){ return "M "+(("right" == d._def.align) ?0:30)+" 1 l 0 "+(d.h-2)});

                            thisNode.selectAll(".node_button").attr("opacity",function(d) {
                                return (activeSubflow||!isButtonEnabled(d))?0.4:1
                            });
                            thisNode.selectAll(".node_button_button").attr("cursor",function(d) {
                                return (activeSubflow||!isButtonEnabled(d))?"":"pointer";
                            });
                            thisNode.selectAll(".node_right_button").attr("transform",function(d){
                                    var x = d.w-6;
                                    if (d._def.button.toggle && !d[d._def.button.toggle]) {
                                        x = x - 8;
                                    }
                                    return "translate("+x+",2)";
                            });
                            thisNode.selectAll(".node_right_button rect").attr("fill-opacity",function(d){
                                    if (d._def.button.toggle) {
                                        return d[d._def.button.toggle]?1:0.2;
                                    }
                                    return 1;
                            });

                            //thisNode.selectAll(".node_right_button").attr("transform",function(d){return "translate("+(d.w - d._def.button.width.call(d))+","+0+")";}).attr("fill",function(d) {
                            //         return typeof d._def.button.color  === "function" ? d._def.button.color.call(d):(d._def.button.color != null ? d._def.button.color : d._def.color)
                            //});

                            thisNode.selectAll(".node_badge_group").attr("transform",function(d){return "translate("+(d.w-40)+","+(d.h+3)+")";});
                            thisNode.selectAll("text.node_badge_label").text(function(d,i) {
                                if (d._def.badge) {
                                    if (typeof d._def.badge == "function") {
                                        try {
                                            return d._def.badge.call(d);
                                        } catch(err) {
                                            console.log("Definition error: "+d.type+".badge",err);
                                            return "";
                                        }
                                    } else {
                                        return d._def.badge;
                                    }
                                }
                                return "";
                            });
                        }

                        if (!showStatus || !d.statusTop) {
                            thisNode.selectAll(".node_status_label_top").style("display","none");
                        } else {
                            if (d.statusTop.text) {
                                thisNode.selectAll(".node_status_label_top").style("display","inline").text(d.statusTop.text);
                            }
                        }

                        if (!showStatus || !d.statusBottom) {
                            thisNode.selectAll(".node_status_group_bottom").style("display","none");
                        } else {
                            thisNode.selectAll(".node_status_group_bottom").style("display","inline").attr("transform","translate(3,"+(d.h+3)+")");
                            var fill = status_colours[d.statusBottom.fill]; // Only allow our colours for now
                            if (d.statusBottom.shape == null && fill == null) {
                                thisNode.selectAll(".node_status_bottom").style("display","none");
                            } else {
                                var style;
                                if (d.statusBottom.shape == null || d.statusBottom.shape == "dot") {
                                    style = {
                                        display: "inline",
                                        fill: fill,
                                        stroke: fill
                                    };
                                } else if (d.statusBottom.shape == "ring" ){
                                    style = {
                                        display: "inline",
                                        fill: "#fff",
                                        stroke: fill
                                    }
                                }
                                thisNode.selectAll(".node_status_bottom").style(style);
                            }
                            if (d.statusBottom.text) {
                                thisNode.selectAll(".node_status_label_bottom").text(d.statusBottom.text);
                                if(d.statusBottom.shape == null && fill == null) thisNode.selectAll(".node_status_label_bottom").attr("x",0);
                                else thisNode.selectAll(".node_status_label_bottom").attr("x",20);
                            } else {
                                thisNode.selectAll(".node_status_label_bottom").text("");
                            }
                        }

                        d.dirty = false;
                    }
            });

            var link = vis.selectAll(".link").data(
                activeLinks,
                function(d) {
                    var bla = d.target.id;
                    return d.source.id+":"+d.sourcePort+":"+d.target.id+":"+d.targetPort+":"+d.target.i;
                }
            );
            var linkEnter = link.enter().insert("g",".node").attr("class","link");

            linkEnter.each(function(d,i) {
                var l = d3.select(this);
                d.added = true;
                l.append("svg:path").attr("class","link_background link_path")
                   .on("mousedown",function(d) {
                        mousedown_link = d;
                        clearSelection();
                        selected_link = mousedown_link;
                        updateSelection();
                        redraw();
                        focusView();
                        d3.event.stopPropagation();
                    })
                    .on("touchstart",function(d) {
                        mousedown_link = d;
                        clearSelection();
                        selected_link = mousedown_link;
                        updateSelection();
                        redraw();
                        focusView();
                        d3.event.stopPropagation();

                        var obj = d3.select(document.body);
                        var touch0 = d3.event.touches.item(0);
                        var pos = [touch0.pageX,touch0.pageY];
                        touchStartTime = setTimeout(function() {
                            touchStartTime = null;
                            showTouchMenu(obj,pos);
                        },touchLongPressTimeout);
                    })
                l.append("svg:path").attr("class","link_outline link_path");
                l.append("svg:path").attr("class","link_line link_path")
                    .classed("link_link", function(d) { return d.link })
                    .classed("link_subflow", function(d) { return !d.link && activeSubflow });
            });

            link.exit().remove();
            var links = vis.selectAll(".link_path");
            links.each(function(d) {
                var link = d3.select(this);
                if (d.added || d===selected_link || d.selected || dirtyNodes[d.source.id] || dirtyNodes[d.target.id]) {
                    link.attr("d",function(d){
                        var numOutputs = d.source.outputs || 1;
                        var numInputs = d.target.inputs || 1;
                        var sourcePort = d.sourcePort || 0;
                        var targetPort = d.targetPort || 0;
                        if(d.source.type == "subflow") {
                            numOutputs = 1;
                            sourcePort = 0;
                        }
                        if(d.target.type == "subflow") {
                            numInputs = 1;
                            targetPort = 0;
                        }
                        var y1 = -((numOutputs-1)/2)*18 +18*sourcePort;
                        var y2 = -((numInputs-1)/2)*18 +18*targetPort;

                        var dy = d.target.y-(d.source.y+y1);
                        var dx = (d.target.x-d.target.w/2)-(d.source.x+d.source.w/2);
                        var delta = Math.sqrt(dy*dy+dx*dx);
                        var scale = lineCurveScale;
                        var scaleY = 0;
                        if (delta < node_width) {
                            scale = 0.75-0.75*((node_width-delta)/node_width);
                        }

                        if (dx < 0) {
                            scale += 2*(Math.min(5*node_width,Math.abs(dx))/(5*node_width));
                            if (Math.abs(dy) < 3*node_height) {
                                scaleY = ((dy>0)?0.5:-0.5)*(((3*node_height)-Math.abs(dy))/(3*node_height))*(Math.min(node_width,Math.abs(dx))/(node_width)) ;
                            }
                        }

                        d.x1 = d.source.x+d.source.w/2;
                        d.y1 = d.source.y+y1;
                        d.x2 = d.target.x-d.target.w/2;
                        d.y2 = d.target.y+y2;

                        return "M "+d.x1+" "+d.y1+
                            " C "+(d.x1+scale*node_width)+" "+(d.y1+scaleY*node_height)+" "+
                            (d.x2-scale*node_width)+" "+(d.y2-scaleY*node_height)+" "+
                            d.x2+" "+d.y2;
                    });
                }
            })

            link.classed("link_selected", function(d) { return d === selected_link || d.selected; });
            link.classed("link_working", function(d) { return d.working; });
            link.classed("link_unknown",function(d) {
                delete d.added;
                return d.target.type == "unknown" || d.source.type == "unknown"
            });
            var offLinks = vis.selectAll(".link_flow_link_g").data(
                activeFlowLinks,
                function(d) {
                    return d.node.id+":"+d.refresh
                }
            );

            var offLinksEnter = offLinks.enter().insert("g",".node").attr("class","link_flow_link_g");
            offLinksEnter.each(function(d,i) {
                var g = d3.select(this);
                var s = 1;
                var labelAnchor = "start";
                if (d.node.type === "link in") {
                    s = -1;
                    labelAnchor = "end";
                }
                var stemLength = s*30;
                var branchLength = s*20;
                var l = g.append("svg:path").attr("class","link_flow_link")
                        .attr("class","link_link").attr("d","M 0 0 h "+stemLength);
                var links = d.links;
                var flows = Object.keys(links);
                var tabOrder = RED.nodes.getWorkspaceOrder();
                flows.sort(function(A,B) {
                    return tabOrder.indexOf(A) - tabOrder.indexOf(B);
                });
                var linkWidth = 10;
                var h = node_height;
                var y = -(flows.length-1)*h/2;
                var linkGroups = g.selectAll(".link_group").data(flows);
                var enterLinkGroups = linkGroups.enter().append("g").attr("class","link_group")
                        .on('mouseover', function() { d3.select(this).classed('link_group_active',true)})
                        .on('mouseout', function() { d3.select(this).classed('link_group_active',false)})
                        .on('mousedown', function() { d3.event.preventDefault(); d3.event.stopPropagation(); })
                        .on('mouseup', function(f) {
                            d3.event.stopPropagation();
                            var targets = d.links[f];
                            RED.workspaces.show(f);
                            targets.forEach(function(n) {
                                n.selected = true;
                                n.dirty = true;
                                moving_set.push({n:n});
                            });
                            updateSelection();
                            redraw();
                        });
                enterLinkGroups.each(function(f) {
                    var linkG = d3.select(this);
                    linkG.append("svg:path").attr("class","link_flow_link")
                        .attr("class","link_link")
                        .attr("d",
                            "M "+stemLength+" 0 "+
                            "C "+(stemLength+(1.7*branchLength))+" "+0+
                            " "+(stemLength+(0.1*branchLength))+" "+y+" "+
                            (stemLength+branchLength*1.5)+" "+y+" "
                        );
                    linkG.append("svg:path")
                        .attr("class","link_port")
                        .attr("d",
                            "M "+(stemLength+branchLength*1.5+s*(linkWidth+7))+" "+(y-12)+" "+
                            "h "+(-s*linkWidth)+" "+
                            "a 3 3 45 0 "+(s===1?"0":"1")+" "+(s*-3)+" 3 "+
                            "v 18 "+
                            "a 3 3 45 0 "+(s===1?"0":"1")+" "+(s*3)+" 3 "+
                            "h "+(s*linkWidth)
                        );
                    linkG.append("svg:path")
                        .attr("class","link_port")
                        .attr("d",
                            "M "+(stemLength+branchLength*1.5+s*(linkWidth+10))+" "+(y-12)+" "+
                            "h "+(s*(linkWidth*3))+" "+
                            "M "+(stemLength+branchLength*1.5+s*(linkWidth+10))+" "+(y+12)+" "+
                            "h "+(s*(linkWidth*3))
                        ).style("stroke-dasharray","12 3 8 4 3");
                    linkG.append("rect").attr("class","port link_port")
                        .attr("x",stemLength+branchLength*1.5-4+(s*4))
                        .attr("y",y-4)
                        .attr("rx",2)
                        .attr("ry",2)
                        .attr("width",8)
                        .attr("height",8);
                    linkG.append("rect")
                        .attr("x",stemLength+branchLength*1.5-(s===-1?node_width:0))
                        .attr("y",y-12)
                        .attr("width",node_width)
                        .attr("height",24)
                        .style("stroke","none")
                        .style("fill","transparent")
                    var tab = RED.nodes.workspace(f);
                    var label;
                    if (tab) {
                        label = tab.label || tab.id;
                    }
                    linkG.append("svg:text")
                        .attr("class","port_label")
                        .attr("x",stemLength+branchLength*1.5+(s*15))
                        .attr("y",y+1)
                        .style("font-size","10px")
                        .style("text-anchor",labelAnchor)
                        .text(label);

                    y += h;
                });
                linkGroups.exit().remove();
            });
            offLinks.exit().remove();
            offLinks = vis.selectAll(".link_flow_link_g");
            offLinks.each(function(d) {
                var s = 1;
                if (d.node.type === "link in") {
                    s = -1;
                }
                var link = d3.select(this);
                link.attr("transform", function(d) { return "translate(" + (d.node.x+(s*d.node.w/2)) + "," + (d.node.y) + ")"; });

            })

        } else {
            // JOINING - unselect any selected links
            vis.selectAll(".link_selected").data(
                activeLinks,
                function(d) {
                    return d.source.id+":"+d.sourcePort+":"+d.target.id+":"+d.targetPort+":"+d.target.i;
                }
            ).classed("link_selected", false);
        }

        if (d3.event) {
            d3.event.preventDefault();
        }

    }

    function focusView() {
        try {
            // Workaround for browser unexpectedly scrolling iframe into full
            // view - record the parent scroll position and restore it after
            // setting the focus
            var scrollX = window.parent.window.scrollX;
            var scrollY = window.parent.window.scrollY;
            $("#chart").focus();
            window.parent.window.scrollTo(scrollX,scrollY);
        } catch(err) {
            // In case we're iframed into a page of a different origin, just focus
            // the view following the inevitable DOMException
            $("#chart").focus();
        }
    }

    /**
     * Imports a new collection of nodes from a JSON String.
     *  - all get new IDs assigned
     *  - all "selected"
     *  - attached to mouse for placing - "IMPORT_DRAGGING"
     */
    function importNodes(newNodesStr,addNewFlow,touchImport) {
        try {
            var activeSubflowChanged;
            if (activeSubflow) {
                activeSubflowChanged = activeSubflow.changed;
            }
            var result = RED.nodes.import(newNodesStr,true,addNewFlow);
            if (result) {
                var new_nodes = result[0];
                var new_links = result[1];
                var new_workspaces = result[2];
                var new_subflows = result[3];
                var new_default_workspace = result[4];
                if (addNewFlow && new_default_workspace) {
                    RED.workspaces.show(new_default_workspace.id);
                }
                var new_ms = new_nodes.filter(function(n) { return n.hasOwnProperty("x") && n.hasOwnProperty("y") && n.z == RED.workspaces.active() }).map(function(n) { return {n:n};});
                var new_node_ids = new_nodes.map(function(n){ return n.id; });

                // TODO: pick a more sensible root node
                if (new_ms.length > 0) {
                    var root_node = new_ms[0].n;
                    var dx = root_node.x;
                    var dy = root_node.y;

                    if (mouse_position == null) {
                        mouse_position = [0,0];
                    }

                    var minX = 0;
                    var minY = 0;
                    var i;
                    var node;

                    for (i=0;i<new_ms.length;i++) {
                        node = new_ms[i];
                        node.n.selected = true;
                        node.n.changed = true;
                        node.n.moved = true;
                        node.n.x -= dx - mouse_position[0];
                        node.n.y -= dy - mouse_position[1];
                        node.dx = node.n.x - mouse_position[0];
                        node.dy = node.n.y - mouse_position[1];
                        minX = Math.min(node.n.x-node_width/2-5,minX);
                        minY = Math.min(node.n.y-node_height/2-5,minY);
                    }
                    for (i=0;i<new_ms.length;i++) {
                        node = new_ms[i];
                        node.n.x -= minX;
                        node.n.y -= minY;
                        node.dx -= minX;
                        node.dy -= minY;
                        if (node.n._def.onadd) {
                            try {
                                node.n._def.onadd.call(node.n);
                            } catch(err) {
                                console.log("onadd:",err);
                            }
                        }

                    }
                    if (!touchImport) {
                        mouse_mode = RED.state.IMPORT_DRAGGING;
                        spliceActive = false;
                        if (new_ms.length === 1) {
                            node = new_ms[0];
                            spliceActive = node.n.hasOwnProperty("_def") &&
                                           node.n._def.inputs > 0 &&
                                           node.n._def.outputs > 0;
                        }
                    }
                    RED.keyboard.add("*","escape",function(){
                            RED.keyboard.remove("escape");
                            clearSelection();
                            RED.history.pop();
                            mouse_mode = 0;
                    });
                    clearSelection();
                    moving_set = new_ms;
                }

                var historyEvent = {
                    t:"add",
                    nodes:new_node_ids,
                    links:new_links,
                    workspaces:new_workspaces,
                    subflows:new_subflows,
                    dirty:RED.nodes.dirty()
                };
                if (new_ms.length === 0) {
                    RED.nodes.dirty(true);
                }
                if (activeSubflow) {
                    var subflowRefresh = RED.subflow.refresh(true);
                    if (subflowRefresh) {
                        historyEvent.subflow = {
                            id:activeSubflow.id,
                            changed: activeSubflowChanged,
                            instances: subflowRefresh.instances
                        }
                    }
                }
                RED.history.push(historyEvent);

                updateActiveNodes();
                redraw();
            }
        } catch(error) {
            if (error.code != "NODE_RED") {
                console.log(error.stack);
                RED.notify(RED._("notification.error",{message:error.toString()}),"error");
            } else {
                RED.notify(RED._("notification.error",{message:error.message}),"error");
            }
        }
    }

    function toggleShowGrid(state) {
        if (state) {
            grid.style("visibility","visible");
        } else {
            grid.style("visibility","hidden");
        }
    }
    function toggleSnapGrid(state) {
        snapGrid = state;
        redraw();
    }
    function toggleStatus(s) {
        showStatus = s;
        RED.nodes.eachNode(function(n) { n.dirty = true;});
        //TODO: subscribe/unsubscribe here
        redraw();
    }

    return {
        init: init,
        state:function(state) {
            if (state == null) {
                return mouse_mode
            } else {
                mouse_mode = state;
            }
        },

        redraw: function(updateActive) {
            if (updateActive) {
                updateActiveNodes();
                updateSelection();
            }
            redraw();
        },
        focus: focusView,
        importNodes: importNodes,
        calculateTextWidth: calculateTextWidth,
        select: function(selection) {
            if (typeof selection !== "undefined") {
                clearSelection();
                if (typeof selection == "string") {
                    var selectedNode = RED.nodes.node(selection);
                    if (selectedNode) {
                        selectedNode.selected = true;
                        selectedNode.dirty = true;
                        moving_set = [{n:selectedNode}];
                    }
                }
            }
            updateSelection();
            redraw();
        },
        selection: function() {
            var selection = {};
            if (moving_set.length > 0) {
                selection.nodes = moving_set.map(function(n) { return n.n;});
            }
            if (selected_link != null) {
                selection.link = selected_link;
            }
            return selection;
        },
        scale: function() {
            return scaleFactor;
        },
        getLinksAtPoint: function(x,y) {
            var result = [];
            var links = outer.selectAll(".link_background")[0];
            for (var i=0;i<links.length;i++) {
                var bb = links[i].getBBox();
                if (x >= bb.x && y >= bb.y && x <= bb.x+bb.width && y <= bb.y+bb.height) {
                    result.push(links[i])
                }
            }
            return result;
        },
        reveal: function(id) {
            if (RED.nodes.workspace(id) || RED.nodes.subflow(id)) {
                RED.workspaces.show(id);
            } else {
                var node = RED.nodes.node(id);
                if (node._def.category !== 'config' && node.z) {
                    node.highlighted = true;
                    node.dirty = true;
                    RED.workspaces.show(node.z);

                    var screenSize = [$("#chart").width(),$("#chart").height()];
                    var scrollPos = [$("#chart").scrollLeft(),$("#chart").scrollTop()];

                    if (node.x < scrollPos[0] || node.y < scrollPos[1] || node.x > screenSize[0]+scrollPos[0] || node.y > screenSize[1]+scrollPos[1]) {
                        var deltaX = '-='+((scrollPos[0] - node.x) + screenSize[0]/2);
                        var deltaY = '-='+((scrollPos[1] - node.y) + screenSize[1]/2);
                        $("#chart").animate({
                            scrollLeft: deltaX,
                            scrollTop: deltaY
                        },200);
                    }

                    if (!node._flashing) {
                        node._flashing = true;
                        var flash = 22;
                        var flashFunc = function() {
                            flash--;
                            node.dirty = true;
                            if (flash >= 0) {
                                node.highlighted = !node.highlighted;
                                setTimeout(flashFunc,100);
                            } else {
                                node.highlighted = false;
                                delete node._flashing;
                            }
                            RED.view.redraw();
                        }
                        flashFunc();
                    }
                } else if (node._def.category === 'config') {
                    RED.sidebar.config.show(id);
                }
            }
        },
        gridSize: function(v) {
            if (v === undefined) {
                return gridSize;
            } else {
                gridSize = v;
                updateGrid();
            }
        }

    };
})();
;/**
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
RED.sidebar = (function() {

    //$('#sidebar').tabs();
    var sidebar_tabs = RED.tabs.create({
        id:"sidebar-tabs",
        onchange:function(tab) {
            $("#sidebar-content").children().hide();
            $("#sidebar-footer").children().hide();
            if (tab.onchange) {
                tab.onchange.call(tab);
            }
            $(tab.wrapper).show();
            if (tab.toolbar) {
                $(tab.toolbar).show();
            }
        },
        onremove: function(tab) {
            $(tab.wrapper).hide();
            if (tab.onremove) {
                tab.onremove.call(tab);
            }
        },
        minimumActiveTabWidth: 110
    });

    var knownTabs = {

    };

    function addTab(title,content,closeable,visible) {
        var options;
        if (typeof title === "string") {
            // TODO: legacy support in case anyone uses this...
            options = {
                id: content.id,
                label: title,
                name: title,
                content: content,
                closeable: closeable,
                visible: visible
            }
        } else if (typeof title === "object") {
            options = title;
        }

        options.wrapper = $('<div>',{style:"height:100%"}).appendTo("#sidebar-content")
        options.wrapper.append(options.content);
        options.wrapper.hide();

        if (!options.enableOnEdit) {
            options.shade = $('<div>',{class:"sidebar-shade hide"}).appendTo(options.wrapper);
        }

        if (options.toolbar) {
            $("#sidebar-footer").append(options.toolbar);
            $(options.toolbar).hide();
        }
        var id = options.id;

        RED.menu.addItem("menu-item-view-menu",{
            id:"menu-item-view-menu-"+options.id,
            label:options.name,
            onselect:function() {
                showSidebar(options.id);
            },
            group: "sidebar-tabs"
        });

        knownTabs[options.id] = options;

        if (options.visible !== false) {
            sidebar_tabs.addTab(knownTabs[options.id]);
        }
    }

    function removeTab(id) {
        sidebar_tabs.removeTab(id);
        $(knownTabs[id].wrapper).remove();
        if (knownTabs[id].footer) {
            knownTabs[id].footer.remove();
        }
        delete knownTabs[id];
        RED.menu.removeItem("menu-item-view-menu-"+id);
    }

    var sidebarSeparator =  {};
    $("#sidebar-separator").draggable({
            axis: "x",
            start:function(event,ui) {
                sidebarSeparator.closing = false;
                sidebarSeparator.opening = false;
                var winWidth = $(window).width();
                sidebarSeparator.start = ui.position.left;
                sidebarSeparator.chartWidth = $("#workspace").width();
                sidebarSeparator.chartRight = winWidth-$("#workspace").width()-$("#workspace").offset().left-2;

                if (!RED.menu.isSelected("menu-item-sidebar")) {
                    sidebarSeparator.opening = true;
                    var newChartRight = 7;
                    $("#sidebar").addClass("closing");
                    $("#workspace").css("right",newChartRight);
                    $("#editor-stack").css("right",newChartRight+1);
                    $("#sidebar").width(0);
                    RED.menu.setSelected("menu-item-sidebar",true);
                    RED.events.emit("sidebar:resize");
                }
                sidebarSeparator.width = $("#sidebar").width();
            },
            drag: function(event,ui) {
                var d = ui.position.left-sidebarSeparator.start;
                var newSidebarWidth = sidebarSeparator.width-d;
                if (sidebarSeparator.opening) {
                    newSidebarWidth -= 3;
                }

                if (newSidebarWidth > 150) {
                    if (sidebarSeparator.chartWidth+d < 200) {
                        ui.position.left = 200+sidebarSeparator.start-sidebarSeparator.chartWidth;
                        d = ui.position.left-sidebarSeparator.start;
                        newSidebarWidth = sidebarSeparator.width-d;
                    }
                }

                if (newSidebarWidth < 150) {
                    if (!sidebarSeparator.closing) {
                        $("#sidebar").addClass("closing");
                        sidebarSeparator.closing = true;
                    }
                    if (!sidebarSeparator.opening) {
                        newSidebarWidth = 150;
                        ui.position.left = sidebarSeparator.width-(150 - sidebarSeparator.start);
                        d = ui.position.left-sidebarSeparator.start;
                    }
                } else if (newSidebarWidth > 150 && (sidebarSeparator.closing || sidebarSeparator.opening)) {
                    sidebarSeparator.closing = false;
                    $("#sidebar").removeClass("closing");
                }

                var newChartRight = sidebarSeparator.chartRight-d;
                $("#workspace").css("right",newChartRight);
                $("#editor-stack").css("right",newChartRight+1);
                $("#sidebar").width(newSidebarWidth);

                sidebar_tabs.resize();
                RED.events.emit("sidebar:resize");
            },
            stop:function(event,ui) {
                if (sidebarSeparator.closing) {
                    $("#sidebar").removeClass("closing");
                    RED.menu.setSelected("menu-item-sidebar",false);
                    if ($("#sidebar").width() < 180) {
                        $("#sidebar").width(180);
                        $("#workspace").css("right",187);
                        $("#editor-stack").css("right",188);
                    }
                }
                $("#sidebar-separator").css("left","auto");
                $("#sidebar-separator").css("right",($("#sidebar").width()+2)+"px");
                RED.events.emit("sidebar:resize");
            }
    });

    function toggleSidebar(state) {
        if (!state) {
            $("#main-container").addClass("sidebar-closed");
        } else {
            $("#main-container").removeClass("sidebar-closed");
            sidebar_tabs.resize();
        }
        RED.events.emit("sidebar:resize");
    }

    function showSidebar(id) {
        if (id) {
            if (!containsTab(id)) {
                sidebar_tabs.addTab(knownTabs[id]);
            }
            sidebar_tabs.activateTab(id);
            if (!RED.menu.isSelected("menu-item-sidebar")) {
                RED.menu.setSelected("menu-item-sidebar",true);
            }
        }
    }

    function containsTab(id) {
        return sidebar_tabs.contains(id);
    }

    function init () {
        RED.actions.add("core:toggle-sidebar",function(state){
            if (state === undefined) {
                RED.menu.toggleSelected("menu-item-sidebar");
            } else {
                toggleSidebar(state);
            }
        });
        showSidebar();
        RED.sidebar.info.init();
        RED.sidebar.config.init();
        // hide info bar at start if screen rather narrow...
        if ($(window).width() < 600) { RED.menu.setSelected("menu-item-sidebar",false); }
    }

    return {
        init: init,
        addTab: addTab,
        removeTab: removeTab,
        show: showSidebar,
        containsTab: containsTab,
        toggleSidebar: toggleSidebar,
    }

})();
;/**
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

RED.palette = (function() {

    var exclusion = ['config','unknown','deprecated'];
    var coreCategories = ['subflows', 'input', 'output', 'function', 'social', 'mobile', 'storage', 'analysis', 'advanced'];

    var categoryContainers = {};

    function createCategoryContainer(category, label){
        label = label || category.replace("_", " ");
        var catDiv = $('<div id="palette-container-'+category+'" class="palette-category palette-close hide">'+
            '<div id="palette-header-'+category+'" class="palette-header"><i class="expanded fa fa-angle-down"></i><span>'+label+'</span></div>'+
            '<div class="palette-content" id="palette-base-category-'+category+'">'+
            '<div id="palette-'+category+'-input"></div>'+
            '<div id="palette-'+category+'-output"></div>'+
            '<div id="palette-'+category+'-function"></div>'+
            '</div>'+
            '</div>').appendTo("#palette-container");

        categoryContainers[category] = {
            container: catDiv,
            close: function() {
                catDiv.removeClass("palette-open");
                catDiv.addClass("palette-closed");
                $("#palette-base-category-"+category).slideUp();
                $("#palette-header-"+category+" i").removeClass("expanded");
            },
            open: function() {
                catDiv.addClass("palette-open");
                catDiv.removeClass("palette-closed");
                $("#palette-base-category-"+category).slideDown();
                $("#palette-header-"+category+" i").addClass("expanded");
            },
            toggle: function() {
                if (catDiv.hasClass("palette-open")) {
                    categoryContainers[category].close();
                } else {
                    categoryContainers[category].open();
                }
            }
        };

        $("#palette-header-"+category).on('click', function(e) {
            categoryContainers[category].toggle();
        });
    }

    function setLabel(type, el, label, info, namespace) {
        var nodeWidth = 82;
        var nodeHeight = 25;
        var lineHeight = 20;
        var portHeight = 10;

        var words = label.split(/[ -]/);

        var displayLines = [];

        var currentLine = words[0];
        var currentLineWidth = RED.view.calculateTextWidth(currentLine, "palette_label", 0);

        for (var i=1;i<words.length;i++) {
            var newWidth = RED.view.calculateTextWidth(currentLine+" "+words[i], "palette_label", 0);
            if (newWidth < nodeWidth) {
                currentLine += " "+words[i];
                currentLineWidth = newWidth;
            } else {
                displayLines.push(currentLine);
                currentLine = words[i];
                currentLineWidth = RED.view.calculateTextWidth(currentLine, "palette_label", 0);
            }
        }
        displayLines.push(currentLine);

        var lines = displayLines.join("<br/>");
        var multiLineNodeHeight = 8+(lineHeight*displayLines.length);
        el.css({height:multiLineNodeHeight+"px"});

        var labelElement = el.find(".palette_label");
        labelElement.html(lines).attr('dir', RED.text.bidi.resolveBaseTextDir(lines));

        el.find(".palette_port").css({top:(multiLineNodeHeight/2-5)+"px"});

        var popOverContent;
        try {
            var l = "<p><b>"+RED.text.bidi.enforceTextDirectionWithUCC(label)+"</b></p>";
            if (label != type) {
                l = "<p><b>"+RED.text.bidi.enforceTextDirectionWithUCC(label)+"</b><br/><i>"+type+"</i></p>";
            }
            var helpContent = i18n.t(namespace + "/" + type + ".hni:" + type + ".paletteHelp");
            popOverContent = $(l+(info?info:helpContent||"<p>"+RED._("palette.noInfo")+"</p>").trim());
        } catch(err) {
            // Malformed HTML may cause errors. TODO: need to understand what can break
            // NON-NLS: internal debug
            console.log("Error generating pop-over label for ",type);
            console.log(err.toString());
            popOverContent = "<p><b>"+label+"</b></p><p>"+RED._("palette.noInfo")+"</p>";
        }

        el.data('popover').setContent(popOverContent);
    }

    function escapeNodeType(nt) {
        return nt.replace(" ","_").replace(".","_").replace(":","_");
    }

    function addNodeType(nt,def) {
        var nodeTypeId = escapeNodeType(nt);
        if ($("#palette_node_"+nodeTypeId).length) {
            return;
        }
        if (exclusion.indexOf(def.category)===-1) {

            var category = def.category.replace(" ","_");
            var rootCategory = category.split("-")[0];

            var d = document.createElement("div");
            d.id = "palette_node_"+nodeTypeId;
            d.type = nt;
            d.namespace = def.namespace ? def.namespace : nt;

            var label = /^(.*?)([ -]in|[ -]out)?$/.exec(nt)[1];
            if (typeof def.paletteLabel !== "undefined") {
                try {
                    label = (typeof def.paletteLabel === "function" ? def.paletteLabel.call(def) : def.paletteLabel)||"";
                } catch(err) {
                    console.log("Definition error: "+nt+".paletteLabel",err);
                }
            }

            $('<div/>',{class:"palette_label"+(def.align=="right"?" palette_label_right":"")}).appendTo(d);

            d.className="palette_node";


            if (def.icon) {
                var icon_url = RED.utils.getNodeIcon(def);
                var iconContainer = $('<div/>',{class:"palette_icon_container"+(def.align=="right"?" palette_icon_container_right":"")}).appendTo(d);
                $('<div/>',{class:"palette_icon",style:"background-image: url("+icon_url+")"}).appendTo(iconContainer);
            }

            d.style.backgroundColor = def.color;

            if (def.outputs > 0) {
                var portOut = document.createElement("div");
                portOut.className = "palette_port palette_port_output";
                d.appendChild(portOut);
            }

            if (def.inputs > 0) {
                var portIn = document.createElement("div");
                portIn.className = "palette_port palette_port_input";
                d.appendChild(portIn);
            }

            if ($("#palette-base-category-"+rootCategory).length === 0) {
                if(coreCategories.indexOf(rootCategory) !== -1){
                    createCategoryContainer(rootCategory, RED._("node-red:palette.label."+rootCategory, {defaultValue:rootCategory}));
                } else {
                    var ns = def.set.id;
                    createCategoryContainer(rootCategory, RED._(ns+":palette.label."+rootCategory, {defaultValue:rootCategory}));
                }
            }
            $("#palette-container-"+rootCategory).show();

            if ($("#palette-"+category).length === 0) {
                $("#palette-base-category-"+rootCategory).append('<div id="palette-'+category+'"></div>');
            }

            $("#palette-"+category).append(d);
            d.onmousedown = function(e) { e.preventDefault(); };

            var popover = RED.popover.create({
                target:$(d),
                trigger: "hover",
                width: "300px",
                content: "hi",
                delay: { show: 750, hide: 50 }
            });
            $(d).data('popover',popover);

            // $(d).popover({
            //     title:d.type,
            //     placement:"right",
            //     trigger: "hover",
            //     delay: { show: 750, hide: 50 },
            //     html: true,
            //     container:'body'
            // });
            $(d).click(function() {
                RED.view.focus();
                var helpText;
                if (nt.indexOf("subflow:") === 0) {
                    helpText = marked(RED.nodes.subflow(nt.substring(8)).info||"");
                } else {
                    helpText = i18n.t((def.namespace ? def.namespace : nt) + "/" + nt + ".hni:" + nt + ".help");
                }
                var help = '<div class="node-help">'+helpText+"</div>";
                RED.sidebar.info.set(help);
            });
            var chart = $("#chart");
            var chartOffset = chart.offset();
            var chartSVG = $("#chart>svg").get(0);
            var activeSpliceLink;
            var mouseX;
            var mouseY;
            var spliceTimer;
            $(d).draggable({
                helper: 'clone',
                appendTo: 'body',
                revert: true,
                revertDuration: 50,
                containment:'#main-container',
                start: function() {RED.view.focus();},
                stop: function() { d3.select('.link_splice').classed('link_splice',false); if (spliceTimer) { clearTimeout(spliceTimer); spliceTimer = null;}},
                drag: function(e,ui) {

                    // TODO: this is the margin-left of palette node. Hard coding
                    // it here makes me sad
                    //console.log(ui.helper.position());
                    ui.position.left += 17.5;

                    if (def.inputs > 0 && def.outputs > 0) {
                        mouseX = ui.position.left+(ui.helper.width()/2) - chartOffset.left + chart.scrollLeft();
                        mouseY = ui.position.top+(ui.helper.height()/2) - chartOffset.top + chart.scrollTop();

                        if (!spliceTimer) {
                            spliceTimer = setTimeout(function() {
                                var nodes = [];
                                var bestDistance = Infinity;
                                var bestLink = null;
                                if (chartSVG.getIntersectionList) {
                                    var svgRect = chartSVG.createSVGRect();
                                    svgRect.x = mouseX;
                                    svgRect.y = mouseY;
                                    svgRect.width = 1;
                                    svgRect.height = 1;
                                    nodes = chartSVG.getIntersectionList(svgRect,chartSVG);
                                    mouseX /= RED.view.scale();
                                    mouseY /= RED.view.scale();
                                } else {
                                    // Firefox doesn't do getIntersectionList and that
                                    // makes us sad
                                    mouseX /= RED.view.scale();
                                    mouseY /= RED.view.scale();
                                    nodes = RED.view.getLinksAtPoint(mouseX,mouseY);
                                }
                                for (var i=0;i<nodes.length;i++) {
                                    if (d3.select(nodes[i]).classed('link_background')) {
                                        var length = nodes[i].getTotalLength();
                                        for (var j=0;j<length;j+=10) {
                                            var p = nodes[i].getPointAtLength(j);
                                            var d2 = ((p.x-mouseX)*(p.x-mouseX))+((p.y-mouseY)*(p.y-mouseY));
                                            if (d2 < 200 && d2 < bestDistance) {
                                                bestDistance = d2;
                                                bestLink = nodes[i];
                                            }
                                        }
                                    }
                                }
                                if (activeSpliceLink && activeSpliceLink !== bestLink) {
                                    d3.select(activeSpliceLink.parentNode).classed('link_splice',false);
                                }
                                if (bestLink) {
                                    d3.select(bestLink.parentNode).classed('link_splice',true)
                                } else {
                                    d3.select('.link_splice').classed('link_splice',false);
                                }
                                if (activeSpliceLink !== bestLink) {
                                    if (bestLink) {
                                        $(ui.helper).data('splice',d3.select(bestLink).data()[0]);
                                    } else {
                                        $(ui.helper).removeData('splice');
                                    }
                                }
                                activeSpliceLink = bestLink;
                                spliceTimer = null;
                            },200);
                        }
                    }
                }
            });

            var nodeInfo = null;
            if (def.category == "subflows") {
                $(d).dblclick(function(e) {
                    RED.workspaces.show(nt.substring(8));
                    e.preventDefault();
                });
                nodeInfo = marked(def.info||"");
            }
            setLabel(nt,$(d),label,nodeInfo, def.namespace ? def.namespace : nt);

            var categoryNode = $("#palette-container-"+category);
            if (categoryNode.find(".palette_node").length === 1) {
                categoryContainers[category].open();
            }

        }
    }

    function removeNodeType(nt) {
        var nodeTypeId = escapeNodeType(nt);
        var paletteNode = $("#palette_node_"+nodeTypeId);
        var categoryNode = paletteNode.closest(".palette-category");
        paletteNode.remove();
        if (categoryNode.find(".palette_node").length === 0) {
            if (categoryNode.find("i").hasClass("expanded")) {
                categoryNode.find(".palette-content").slideToggle();
                categoryNode.find("i").toggleClass("expanded");
            }
        }
    }
    function hideNodeType(nt) {
        var nodeTypeId = escapeNodeType(nt);
        $("#palette_node_"+nodeTypeId).hide();
    }

    function showNodeType(nt) {
        var nodeTypeId = escapeNodeType(nt);
        $("#palette_node_"+nodeTypeId).show();
    }

    function refreshNodeTypes() {
        RED.nodes.eachSubflow(function(sf) {
            var paletteNode = $("#palette_node_subflow_"+sf.id.replace(".","_"));
            var portInput = paletteNode.find(".palette_port_input");
            var portOutput = paletteNode.find(".palette_port_output");

            if (portInput.length === 0 && sf.in.length > 0) {
                var portIn = document.createElement("div");
                portIn.className = "palette_port palette_port_input";
                paletteNode.append(portIn);
            } else if (portInput.length !== 0 && sf.in.length === 0) {
                portInput.remove();
            }

            if (portOutput.length === 0 && sf.out.length > 0) {
                var portOut = document.createElement("div");
                portOut.className = "palette_port palette_port_output";
                paletteNode.append(portOut);
            } else if (portOutput.length !== 0 && sf.out.length === 0) {
                portOutput.remove();
            }
            setLabel(sf.type+":"+sf.id,paletteNode,sf.name,marked(sf.info||""),sf.type+":"+sf.id);
        });
    }

    function filterChange(val) {
        var re = new RegExp(val.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'),'i');
        $("#palette-container .palette_node").each(function(i,el) {
            var currentLabel = $(el).find(".palette_label").text();
            if (val === "" || re.test(el.id) || re.test(currentLabel)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });

        for (var category in categoryContainers) {
            if (categoryContainers.hasOwnProperty(category)) {
                if (categoryContainers[category].container
                        .find(".palette_node")
                        .filter(function() { return $(this).css('display') !== 'none'}).length === 0) {
                    categoryContainers[category].close();
                } else {
                    categoryContainers[category].open();
                }
            }
        }
    }

    function init() {

        RED.events.on('registry:node-type-added', function(nodeType) {
            var def = RED.nodes.getType(nodeType);
            addNodeType(nodeType,def);
            if (def.onpaletteadd && typeof def.onpaletteadd === "function") {
                def.onpaletteadd.call(def);
            }
        });
        RED.events.on('registry:node-type-removed', function(nodeType) {
            removeNodeType(nodeType);
        });

        RED.events.on('registry:node-set-enabled', function(nodeSet) {
            for (var j=0;j<nodeSet.types.length;j++) {
                showNodeType(nodeSet.types[j]);
                var def = RED.nodes.getType(nodeSet.types[j]);
                if (def.onpaletteadd && typeof def.onpaletteadd === "function") {
                    def.onpaletteadd.call(def);
                }
            }
        });
        RED.events.on('registry:node-set-disabled', function(nodeSet) {
            for (var j=0;j<nodeSet.types.length;j++) {
                hideNodeType(nodeSet.types[j]);
                var def = RED.nodes.getType(nodeSet.types[j]);
                if (def.onpaletteremove && typeof def.onpaletteremove === "function") {
                    def.onpaletteremove.call(def);
                }
            }
        });
        RED.events.on('registry:node-set-removed', function(nodeSet) {
            if (nodeSet.added) {
                for (var j=0;j<nodeSet.types.length;j++) {
                    removeNodeType(nodeSet.types[j]);
                    var def = RED.nodes.getType(nodeSet.types[j]);
                    if (def.onpaletteremove && typeof def.onpaletteremove === "function") {
                        def.onpaletteremove.call(def);
                    }
                }
            }
        });


        $("#palette > .palette-spinner").show();

        $("#palette-search input").searchBox({
            delay: 100,
            change: function() {
                filterChange($(this).val());
            }
        })

        var categoryList = coreCategories;
        if (RED.settings.paletteCategories) {
            categoryList = RED.settings.paletteCategories;
        } else if (RED.settings.theme('palette.categories')) {
            categoryList = RED.settings.theme('palette.categories');
        }
        if (!Array.isArray(categoryList)) {
            categoryList = coreCategories
        }
        categoryList.forEach(function(category){
            createCategoryContainer(category, RED._("palette.label."+category,{defaultValue:category}));
        });

        $("#palette-collapse-all").on("click", function(e) {
            e.preventDefault();
            for (var cat in categoryContainers) {
                if (categoryContainers.hasOwnProperty(cat)) {
                    categoryContainers[cat].close();
                }
            }
        });
        $("#palette-expand-all").on("click", function(e) {
            e.preventDefault();
            for (var cat in categoryContainers) {
                if (categoryContainers.hasOwnProperty(cat)) {
                    categoryContainers[cat].open();
                }
            }
        });
    }

    return {
        init: init,
        add:addNodeType,
        remove:removeNodeType,
        hide:hideNodeType,
        show:showNodeType,
        refresh:refreshNodeTypes
    };
})();
;/**
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
RED.sidebar.info = (function() {

    marked.setOptions({
        renderer: new marked.Renderer(),
        gfm: true,
        tables: true,
        breaks: false,
        pedantic: false,
        sanitize: true,
        smartLists: true,
        smartypants: false
    });

    var content;
    var sections;
    var nodeSection;
    var infoSection;
    var tipBox;

    var expandedSections = {
        "property": false
    };

    function init() {

        content = document.createElement("div");
        content.className = "sidebar-node-info"

        RED.actions.add("core:show-info-tab",show);

        var stackContainer = $("<div>",{class:"sidebar-node-info-stack"}).appendTo(content);

        sections = RED.stack.create({
            container: stackContainer
        }).hide();

        nodeSection = sections.add({
            title: "Node",
            collapsible: false
        });
        infoSection = sections.add({
            title: "Information",
            collapsible: false
        });
        infoSection.content.css("padding","6px");
        infoSection.container.css("border-bottom","none");

        var tipContainer = $('<div class="node-info-tips"></div>').appendTo(content);
        tipBox = $('<div class="node-info-tip"></div>').appendTo(tipContainer);
        var tipButtons = $('<div class="node-info-tips-buttons"></div>').appendTo(tipContainer);

        var tipRefresh = $('<a href="#" class="workspace-footer-button"><i class="fa fa-refresh"></a>').appendTo(tipButtons);
        tipRefresh.click(function(e) {
            e.preventDefault();
            tips.next();
        })

        var tipClose = $('<a href="#" class="workspace-footer-button"><i class="fa fa-times"></a>').appendTo(tipButtons);
        tipClose.click(function(e) {
            e.preventDefault();
            RED.actions.invoke("core:toggle-show-tips");
            RED.notify(RED._("sidebar.info.showTips"));
        });

        RED.sidebar.addTab({
            id: "info",
            label: RED._("sidebar.info.label"),
            name: RED._("sidebar.info.name"),
            content: content,
            enableOnEdit: true
        });
        if (tips.enabled()) {
            tips.start();
        } else {
            tips.stop();
        }

    }

    function show() {
        RED.sidebar.show("info");
    }

    function jsonFilter(key,value) {
        if (key === "") {
            return value;
        }
        var t = typeof value;
        if ($.isArray(value)) {
            return "[array:"+value.length+"]";
        } else if (t === "object") {
            return "[object]"
        } else if (t === "string") {
            if (value.length > 30) {
                return value.substring(0,30)+" ...";
            }
        }
        return value;
    }

    function addTargetToExternalLinks(el) {
        $(el).find("a").each(function(el) {
            var href = $(this).attr('href');
            if (/^https?:/.test(href)) {
                $(this).attr('target','_blank');
            }
        });
        return el;
    }
    function refresh(node) {
        sections.show();
        $(nodeSection.content).empty();
        $(infoSection.content).empty();

        var table = $('<table class="node-info"></table>');
        var tableBody = $('<tbody>').appendTo(table);
        var propRow;
        var subflowNode;
        if (node.type === "tab") {
            nodeSection.title.html("Flow");
            propRow = $('<tr class="node-info-node-row"><td>Name</td><td></td></tr>').appendTo(tableBody);
            $(propRow.children()[1]).html('&nbsp;'+(node.label||""))
            propRow = $('<tr class="node-info-node-row"><td>'+RED._("sidebar.info.id")+"</td><td></td></tr>").appendTo(tableBody);
            RED.utils.createObjectElement(node.id).appendTo(propRow.children()[1]);
            propRow = $('<tr class="node-info-node-row"><td>Status</td><td></td></tr>').appendTo(tableBody);
            $(propRow.children()[1]).html((!!!node.disabled)?"Enabled":"Disabled")
        } else {
            nodeSection.title.html("Node");
            if (node.type !== "subflow" && node.name) {
                $('<tr class="node-info-node-row"><td>'+RED._("common.label.name")+'</td><td>&nbsp;<span class="bidiAware" dir="'+RED.text.bidi.resolveBaseTextDir(node.name)+'">'+node.name+'</span></td></tr>').appendTo(tableBody);
            }
            $('<tr class="node-info-node-row"><td>'+RED._("sidebar.info.type")+"</td><td>&nbsp;"+node.type+"</td></tr>").appendTo(tableBody);
            propRow = $('<tr class="node-info-node-row"><td>'+RED._("sidebar.info.id")+"</td><td></td></tr>").appendTo(tableBody);
            RED.utils.createObjectElement(node.id).appendTo(propRow.children()[1]);

            var m = /^subflow(:(.+))?$/.exec(node.type);

            if (!m && node.type != "subflow" && node.type != "comment") {
                if (node._def) {
                    var count = 0;
                    var defaults = node._def.defaults;
                    for (var n in defaults) {
                        if (n != "name" && defaults.hasOwnProperty(n)) {
                            var val = node[n];
                            var type = typeof val;
                            count++;
                            propRow = $('<tr class="node-info-property-row'+(expandedSections.property?"":" hide")+'"><td>'+n+"</td><td></td></tr>").appendTo(tableBody);
                            if (defaults[n].type) {
                                var configNode = RED.nodes.node(val);
                                if (!configNode) {
                                    RED.utils.createObjectElement(undefined).appendTo(propRow.children()[1]);
                                } else {
                                    var configLabel = RED.utils.getNodeLabel(configNode,val);
                                    var container = propRow.children()[1];

                                    var div = $('<span>',{class:""}).appendTo(container);
                                    var nodeDiv = $('<div>',{class:"palette_node palette_node_small"}).appendTo(div);
                                    var colour = configNode._def.color;
                                    var icon_url = RED.utils.getNodeIcon(configNode._def);
                                    nodeDiv.css({'backgroundColor':colour, "cursor":"pointer"});
                                    var iconContainer = $('<div/>',{class:"palette_icon_container"}).appendTo(nodeDiv);
                                    $('<div/>',{class:"palette_icon",style:"background-image: url("+icon_url+")"}).appendTo(iconContainer);
                                    var nodeContainer = $('<span></span>').css({"verticalAlign":"top","marginLeft":"6px"}).html(configLabel).appendTo(container);

                                    nodeDiv.on('dblclick',function() {
                                        RED.editor.editConfig("", configNode.type, configNode.id);
                                    })

                                }
                            } else {
                                RED.utils.createObjectElement(val).appendTo(propRow.children()[1]);
                            }
                        }
                    }
                    if (count > 0) {
                        $('<tr class="node-info-property-expand blank"><td colspan="2"><a href="#" class=" node-info-property-header'+(expandedSections.property?" expanded":"")+'"><span class="node-info-property-show-more">show more</span><span class="node-info-property-show-less">show less</span> <i class="fa fa-caret-down"></i></a></td></tr>').appendTo(tableBody);
                    }
                }
            }

            if (m) {
                if (m[2]) {
                    subflowNode = RED.nodes.subflow(m[2]);
                } else {
                    subflowNode = node;
                }

                $('<tr class="blank"><th colspan="2">'+RED._("sidebar.info.subflow")+'</th></tr>').appendTo(tableBody);

                var userCount = 0;
                var subflowType = "subflow:"+subflowNode.id;
                RED.nodes.eachNode(function(n) {
                    if (n.type === subflowType) {
                        userCount++;
                    }
                });
                $('<tr class="node-info-subflow-row"><td>'+RED._("common.label.name")+'</td><td><span class="bidiAware" dir=\"'+RED.text.bidi.resolveBaseTextDir(subflowNode.name)+'">'+subflowNode.name+'</span></td></tr>').appendTo(tableBody);
                $('<tr class="node-info-subflow-row"><td>'+RED._("sidebar.info.instances")+"</td><td>"+userCount+'</td></tr>').appendTo(tableBody);
            }
        }
        $(table).appendTo(nodeSection.content);

        var infoText = "";

        if (!subflowNode && node.type !== "comment" && node.type !== "tab") {
            var helpText = i18n.t((node._def.namespace ? node._def.namespace : node.type) + "/" + node.type + ".hni:" + node.type + ".help");
            infoText = helpText;
        } else if (node.type === "tab") {
            infoText = marked(node.info||"");
        }

        if (subflowNode) {
            infoText = infoText + marked(subflowNode.info||"");
        } else if (node._def && node._def.info) {
            var info = node._def.info;
            var textInfo = (typeof info === "function" ? info.call(node) : info);
            // TODO: help
            infoText = infoText + marked(textInfo);
        }
        if (infoText) {
            var info = addTargetToExternalLinks($('<div class="node-help"><span class="bidiAware" dir=\"'+RED.text.bidi.resolveBaseTextDir(infoText)+'">'+infoText+'</span></div>')).appendTo(infoSection.content);
            info.find(".bidiAware").contents().filter(function() { return this.nodeType === 3 && this.textContent.trim() !== "" }).wrap( "<span></span>" );
            var foldingHeader = "H3";
            info.find(foldingHeader).wrapInner('<a class="node-info-header expanded" href="#"></a>')
                .find("a").prepend('<i class="fa fa-angle-right">').click(function(e) {
                    e.preventDefault();
                    var isExpanded = $(this).hasClass('expanded');
                    var el = $(this).parent().next();
                    while(el.length === 1 && el[0].nodeName !== foldingHeader) {
                        el.toggle(!isExpanded);
                        el = el.next();
                    }
                    $(this).toggleClass('expanded',!isExpanded);
                })
        }


        $(".node-info-property-header").click(function(e) {
            e.preventDefault();
            expandedSections["property"] = !expandedSections["property"];
            $(this).toggleClass("expanded",expandedSections["property"]);
            $(".node-info-property-row").toggle(expandedSections["property"]);
        });
    }


    var tips = (function() {
        var enabled = true;
        var startDelay = 1000;
        var cycleDelay = 15000;
        var startTimeout;
        var refreshTimeout;
        var tipCount = -1;

        RED.actions.add("core:toggle-show-tips",function(state) {
            if (state === undefined) {
                RED.userSettings.toggle("view-show-tips");
            } else {
                enabled = state;
                if (enabled) {
                    startTips();
                } else {
                    stopTips();
                }
            }
        });

        function setTip() {
            var r = Math.floor(Math.random() * tipCount);
            var tip = RED._("infotips:info.tip"+r);

            var m;
            while ((m=/({{(.*?)}})/.exec(tip))) {
                var shortcut = RED.keyboard.getShortcut(m[2]);
                if (shortcut) {
                    tip = tip.replace(m[1],RED.keyboard.formatKey(shortcut.key));
                } else {
                    return;
                }
            }
            while ((m=/(\[(.*?)\])/.exec(tip))) {
                tip = tip.replace(m[1],RED.keyboard.formatKey(m[2]));
            }
            tipBox.html(tip).fadeIn(200);
            if (startTimeout) {
                startTimeout = null;
                refreshTimeout = setInterval(cycleTips,cycleDelay);
            }
        }
        function cycleTips() {
            tipBox.fadeOut(300,function() {
                setTip();
            })
        }
        function startTips() {
            $(".sidebar-node-info").addClass('show-tips');
            if (enabled) {
                if (!startTimeout && !refreshTimeout) {
                    if (tipCount === -1) {
                        do {
                            tipCount++;
                        } while(RED._("infotips:info.tip"+tipCount)!=="infotips:info.tip"+tipCount);
                    }
                    startTimeout = setTimeout(setTip,startDelay);
                }
            }
        }
        function stopTips() {
            $(".sidebar-node-info").removeClass('show-tips');
            clearInterval(refreshTimeout);
            clearTimeout(startTimeout);
            refreshTimeout = null;
            startTimeout = null;
        }
        function nextTip() {
            clearInterval(refreshTimeout);
            startTimeout = true;
            setTip();
        }
        return {
            start: startTips,
            stop: stopTips,
            next: nextTip,
            enabled: function() { return enabled; }
        }
    })();

    function clear() {
        sections.hide();
        //
    }

    function set(html) {
        // tips.stop();
        sections.show();
        nodeSection.container.hide();
        var wrapped = $('<div class="node-help"></div>').html(html);
        $(infoSection.content).empty().append(wrapped);
    }



    RED.events.on("view:selection-changed",function(selection) {
        if (selection.nodes) {
            if (selection.nodes.length == 1) {
                var node = selection.nodes[0];
                if (node.type === "subflow" && node.direction) {
                    refresh(RED.nodes.subflow(node.z));
                } else {
                    refresh(node);
                }
            }
        } else {
            var activeWS = RED.workspaces.active();

            var flow = RED.nodes.workspace(activeWS) || RED.nodes.subflow(activeWS);
            if (flow) {
                refresh(flow);
            } else {
                var workspace = RED.nodes.workspace(RED.workspaces.active());
                if (workspace.info) {
                    refresh(workspace);
                } else {
                    clear();
                }
            }
        }
    });

    return {
        init: init,
        show: show,
        refresh: refresh,
        clear: clear,
        set: set
    }
})();
;/**
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
RED.sidebar.config = (function() {


    var content = document.createElement("div");
    content.className = "sidebar-node-config";

    $('<div class="button-group sidebar-header">'+
      '<a class="sidebar-header-button-toggle selected" id="workspace-config-node-filter-all" href="#"><span data-i18n="sidebar.config.filterAll"></span></a>'+
      '<a class="sidebar-header-button-toggle" id="workspace-config-node-filter-unused" href="#"><span data-i18n="sidebar.config.filterUnused"></span></a> '+
      '</div>'
    ).appendTo(content);


    var toolbar = $('<div>'+
        '<a class="sidebar-footer-button" id="workspace-config-node-collapse-all" href="#"><i class="fa fa-angle-double-up"></i></a> '+
        '<a class="sidebar-footer-button" id="workspace-config-node-expand-all" href="#"><i class="fa fa-angle-double-down"></i></a>'+
        '</div>');

    var globalCategories = $("<div>").appendTo(content);
    var flowCategories = $("<div>").appendTo(content);
    var subflowCategories = $("<div>").appendTo(content);

    var showUnusedOnly = false;

    var categories = {};

    function getOrCreateCategory(name,parent,label) {
        name = name.replace(/\./i,"-");
        if (!categories[name]) {
            var container = $('<div class="palette-category workspace-config-node-category" id="workspace-config-node-category-'+name+'"></div>').appendTo(parent);
            var header = $('<div class="workspace-config-node-tray-header palette-header"><i class="fa fa-angle-down expanded"></i></div>').appendTo(container);
            if (label) {
                $('<span class="config-node-label"/>').text(label).appendTo(header);
            } else {
                $('<span class="config-node-label" data-i18n="sidebar.config.'+name+'">').appendTo(header);
            }
            $('<span class="config-node-filter-info"></span>').appendTo(header);
            category = $('<ul class="palette-content config-node-list"></ul>').appendTo(container);
            container.i18n();
            var icon = header.find("i");
            var result = {
                label: label,
                list: category,
                size: function() {
                    return result.list.find("li:not(.config_node_none)").length
                },
                open: function(snap) {
                    if (!icon.hasClass("expanded")) {
                        icon.addClass("expanded");
                        if (snap) {
                            result.list.show();
                        } else {
                            result.list.slideDown();
                        }
                    }
                },
                close: function(snap) {
                    if (icon.hasClass("expanded")) {
                        icon.removeClass("expanded");
                        if (snap) {
                            result.list.hide();
                        } else {
                            result.list.slideUp();
                        }
                    }
                },
                isOpen: function() {
                    return icon.hasClass("expanded");
                }
            };

            header.on('click', function(e) {
                if (result.isOpen()) {
                    result.close();
                } else {
                    result.open();
                }
            });
            categories[name] = result;
        } else {
            if (categories[name].label !== label) {
                categories[name].list.parent().find('.config-node-label').text(label);
                categories[name].label = label;
            }
        }
        return categories[name];
    }

    function createConfigNodeList(id,nodes) {
        var category = getOrCreateCategory(id.replace(/\./i,"-"))
        var list = category.list;

        nodes.sort(function(A,B) {
            if (A.type < B.type) { return -1;}
            if (A.type > B.type) { return 1;}
            return 0;
        });
        if (showUnusedOnly) {
            var hiddenCount = nodes.length;
            nodes = nodes.filter(function(n) {
                return n._def.hasUsers!==false && n.users.length === 0;
            })
            hiddenCount = hiddenCount - nodes.length;
            if (hiddenCount > 0) {
                list.parent().find('.config-node-filter-info').text(RED._('sidebar.config.filtered',{count:hiddenCount})).show();
            } else {
                list.parent().find('.config-node-filter-info').hide();
            }
        } else {
            list.parent().find('.config-node-filter-info').hide();
        }
        list.empty();
        if (nodes.length === 0) {
            $('<li class="config_node_none" data-i18n="sidebar.config.none">NONE</li>').i18n().appendTo(list);
            category.close(true);
        } else {
            var currentType = "";
            nodes.forEach(function(node) {
                var label = RED.utils.getNodeLabel(node,node.id);
                if (node.type != currentType) {
                    $('<li class="config_node_type">'+node.type+'</li>').appendTo(list);
                    currentType = node.type;
                }

                var entry = $('<li class="palette_node config_node palette_node_id_'+node.id.replace(/\./g,"-")+'"></li>').appendTo(list);
                $('<div class="palette_label"></div>').text(label).appendTo(entry);
                if (node._def.hasUsers !== false) {
                    var iconContainer = $('<div/>',{class:"palette_icon_container  palette_icon_container_right"}).text(node.users.length).appendTo(entry);
                    if (node.users.length === 0) {
                        entry.addClass("config_node_unused");
                    }
                }
                entry.on('click',function(e) {
                    RED.sidebar.info.refresh(node);
                });
                entry.on('dblclick',function(e) {
                    RED.editor.editConfig("", node.type, node.id);
                });
                var userArray = node.users.map(function(n) { return n.id });
                entry.on('mouseover',function(e) {
                    RED.nodes.eachNode(function(node) {
                        if( userArray.indexOf(node.id) != -1) {
                            node.highlighted = true;
                            node.dirty = true;
                        }
                    });
                    RED.view.redraw();
                });

                entry.on('mouseout',function(e) {
                    RED.nodes.eachNode(function(node) {
                        if(node.highlighted) {
                            node.highlighted = false;
                            node.dirty = true;
                        }
                    });
                    RED.view.redraw();
                });
            });
            category.open(true);
        }
    }

    function refreshConfigNodeList() {
        var validList = {"global":true};

        getOrCreateCategory("global",globalCategories);

        RED.nodes.eachWorkspace(function(ws) {
            validList[ws.id.replace(/\./g,"-")] = true;
            getOrCreateCategory(ws.id,flowCategories,ws.label);
        })
        RED.nodes.eachSubflow(function(sf) {
            validList[sf.id.replace(/\./g,"-")] = true;
            getOrCreateCategory(sf.id,subflowCategories,sf.name);
        })
        $(".workspace-config-node-category").each(function() {
            var id = $(this).attr('id').substring("workspace-config-node-category-".length);
            if (!validList[id]) {
                $(this).remove();
                delete categories[id];
            }
        })
        var globalConfigNodes = [];
        var configList = {};
        RED.nodes.eachConfig(function(cn) {
            if (cn.z) {//} == RED.workspaces.active()) {
                configList[cn.z.replace(/\./g,"-")] = configList[cn.z.replace(/\./g,"-")]||[];
                configList[cn.z.replace(/\./g,"-")].push(cn);
            } else if (!cn.z) {
                globalConfigNodes.push(cn);
            }
        });
        for (var id in validList) {
            if (validList.hasOwnProperty(id)) {
                createConfigNodeList(id,configList[id]||[]);
            }
        }
        createConfigNodeList('global',globalConfigNodes);
    }

    function init() {
        RED.sidebar.addTab({
            id: "config",
            label: RED._("sidebar.config.label"),
            name: RED._("sidebar.config.name"),
            content: content,
            toolbar: toolbar,
            closeable: true,
            visible: false,
            onchange: function() { refreshConfigNodeList(); }
        });
        RED.actions.add("core:show-config-tab",function() {RED.sidebar.show('config')});

        $("#workspace-config-node-collapse-all").on("click", function(e) {
            e.preventDefault();
            for (var cat in categories) {
                if (categories.hasOwnProperty(cat)) {
                    categories[cat].close();
                }
            }
        });
        $("#workspace-config-node-expand-all").on("click", function(e) {
            e.preventDefault();
            for (var cat in categories) {
                if (categories.hasOwnProperty(cat)) {
                    if (categories[cat].size() > 0) {
                        categories[cat].open();
                    }
                }
            }
        });
        $('#workspace-config-node-filter-all').on("click",function(e) {
            e.preventDefault();
            if (showUnusedOnly) {
                $(this).addClass('selected');
                $('#workspace-config-node-filter-unused').removeClass('selected');
                showUnusedOnly = !showUnusedOnly;
                refreshConfigNodeList();
            }
        });
        $('#workspace-config-node-filter-unused').on("click",function(e) {
            e.preventDefault();
            if (!showUnusedOnly) {
                $(this).addClass('selected');
                $('#workspace-config-node-filter-all').removeClass('selected');
                showUnusedOnly = !showUnusedOnly;
                refreshConfigNodeList();
            }
        });


    }
    function show(id) {
        if (typeof id === 'boolean') {
            if (id) {
                $('#workspace-config-node-filter-unused').click();
            } else {
                $('#workspace-config-node-filter-all').click();
            }
        }
        refreshConfigNodeList();
        if (typeof id === "string") {
            $('#workspace-config-node-filter-all').click();
            id = id.replace(/\./g,"-");
            setTimeout(function() {
                var node = $(".palette_node_id_"+id);
                var y = node.position().top;
                var h = node.height();
                var scrollWindow = $(".sidebar-node-config");
                var scrollHeight = scrollWindow.height();

                if (y+h > scrollHeight) {
                    scrollWindow.animate({scrollTop: '-='+(scrollHeight-(y+h)-30)},150);
                } else if (y<0) {
                    scrollWindow.animate({scrollTop: '+='+(y-10)},150);
                }
                var flash = 21;
                var flashFunc = function() {
                    if ((flash%2)===0) {
                        node.removeClass('node_highlighted');
                    } else {
                        node.addClass('node_highlighted');
                    }
                    flash--;
                    if (flash >= 0) {
                        setTimeout(flashFunc,100);
                    }
                }
                flashFunc();
            },100);
        }
        RED.sidebar.show("config");
    }
    return {
        init:init,
        show:show,
        refresh:refreshConfigNodeList
    }
})();
;/**
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
RED.palette.editor = (function() {

    var disabled = false;

    var editorTabs;
    var filterInput;
    var searchInput;
    var nodeList;
    var packageList;
    var loadedList = [];
    var filteredList = [];
    var loadedIndex = {};

    var typesInUse = {};
    var nodeEntries = {};
    var eventTimers = {};
    var activeFilter = "";

    function semVerCompare(A,B) {
        var aParts = A.split(".").map(function(m) { return parseInt(m);});
        var bParts = B.split(".").map(function(m) { return parseInt(m);});
        for (var i=0;i<3;i++) {
            var j = aParts[i]-bParts[i];
            if (j<0) { return -1 }
            if (j>0) { return 1 }
        }
        return 0;
    }

    function delayCallback(start,callback) {
        var delta = Date.now() - start;
        if (delta < 300) {
            delta = 300;
        } else {
            delta = 0;
        }
        setTimeout(function() {
            callback();
        },delta);
    }
    function changeNodeState(id,state,shade,callback) {
        shade.show();
        var start = Date.now();
        $.ajax({
            url:"nodes/"+id,
            type: "PUT",
            data: JSON.stringify({
                enabled: state
            }),
            contentType: "application/json; charset=utf-8"
        }).done(function(data,textStatus,xhr) {
            delayCallback(start,function() {
                shade.hide();
                callback();
            });
        }).fail(function(xhr,textStatus,err) {
            delayCallback(start,function() {
                shade.hide();
                callback(xhr);
            });
        })
    }
    function installNodeModule(id,version,shade,callback) {
        var requestBody = {
            module: id
        };
        if (callback === undefined) {
            callback = shade;
            shade = version;
        } else {
            requestBody.version = version;
        }
        shade.show();
        $.ajax({
            url:"nodes",
            type: "POST",
            data: JSON.stringify(requestBody),
            contentType: "application/json; charset=utf-8"
        }).done(function(data,textStatus,xhr) {
            shade.hide();
            callback();
        }).fail(function(xhr,textStatus,err) {
            shade.hide();
            callback(xhr);
        });
    }
    function removeNodeModule(id,callback) {
        $.ajax({
            url:"nodes/"+id,
            type: "DELETE"
        }).done(function(data,textStatus,xhr) {
            callback();
        }).fail(function(xhr,textStatus,err) {
            callback(xhr);
        })
    }

    function refreshNodeModuleList() {
        for (var id in nodeEntries) {
            if (nodeEntries.hasOwnProperty(id)) {
                _refreshNodeModule(id);
            }
        }
    }

    function refreshNodeModule(module) {
        if (!eventTimers.hasOwnProperty(module)) {
            eventTimers[module] = setTimeout(function() {
                delete eventTimers[module];
                _refreshNodeModule(module);
            },100);
        }
    }


    function getContrastingBorder(rgbColor){
        var parts = /^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)[,)]/.exec(rgbColor);
        if (parts) {
            var r = parseInt(parts[1]);
            var g = parseInt(parts[2]);
            var b = parseInt(parts[3]);
            var yiq = ((r*299)+(g*587)+(b*114))/1000;
            if (yiq > 160) {
                r = Math.floor(r*0.8);
                g = Math.floor(g*0.8);
                b = Math.floor(b*0.8);
                return "rgb("+r+","+g+","+b+")";
            }
        }
        return rgbColor;
    }

    function formatUpdatedAt(dateString) {
        var now = new Date();
        var d = new Date(dateString);
        var delta = (Date.now() - new Date(dateString).getTime())/1000;

        if (delta < 60) {
            return RED._('palette.editor.times.seconds');
        }
        delta = Math.floor(delta/60);
        if (delta < 10) {
            return RED._('palette.editor.times.minutes');
        }
        if (delta < 60) {
            return RED._('palette.editor.times.minutesV',{count:delta});
        }

        delta = Math.floor(delta/60);

        if (delta < 24) {
            return RED._('palette.editor.times.hoursV',{count:delta});
        }

        delta = Math.floor(delta/24);

        if (delta < 7) {
            return RED._('palette.editor.times.daysV',{count:delta})
        }
        var weeks = Math.floor(delta/7);
        var days = delta%7;

        if (weeks < 4) {
            return RED._('palette.editor.times.weeksV',{count:weeks})
        }

        var months = Math.floor(weeks/4);
        weeks = weeks%4;

        if (months < 12) {
            return RED._('palette.editor.times.monthsV',{count:months})
        }
        var years = Math.floor(months/12);
        months = months%12;

        if (months === 0) {
            return RED._('palette.editor.times.yearsV',{count:years})
        } else {
            return RED._('palette.editor.times.year'+(years>1?'s':'')+'MonthsV',{y:years,count:months})
        }
    }


    function _refreshNodeModule(module) {
        if (!nodeEntries.hasOwnProperty(module)) {
            nodeEntries[module] = {info:RED.nodes.registry.getModule(module)};
            var index = [module];
            for (var s in nodeEntries[module].info.sets) {
                if (nodeEntries[module].info.sets.hasOwnProperty(s)) {
                    index.push(s);
                    index = index.concat(nodeEntries[module].info.sets[s].types)
                }
            }
            nodeEntries[module].index = index.join(",").toLowerCase();
            nodeList.editableList('addItem', nodeEntries[module]);
        } else {
            var moduleInfo = nodeEntries[module].info;
            var nodeEntry = nodeEntries[module].elements;
            if (nodeEntry) {
                var activeTypeCount = 0;
                var typeCount = 0;
                nodeEntries[module].totalUseCount = 0;
                nodeEntries[module].setUseCount = {};

                for (var setName in moduleInfo.sets) {
                    if (moduleInfo.sets.hasOwnProperty(setName)) {
                        var inUseCount = 0;
                        var set = moduleInfo.sets[setName];
                        var setElements = nodeEntry.sets[setName];

                        if (set.enabled) {
                            activeTypeCount += set.types.length;
                        }
                        typeCount += set.types.length;
                        for (var i=0;i<moduleInfo.sets[setName].types.length;i++) {
                            var t = moduleInfo.sets[setName].types[i];
                            inUseCount += (typesInUse[t]||0);
                            var swatch = setElements.swatches[t];
                            if (set.enabled) {
                                var def = RED.nodes.getType(t);
                                if (def && def.color) {
                                    swatch.css({background:def.color});
                                    swatch.css({border: "1px solid "+getContrastingBorder(swatch.css('backgroundColor'))})

                                } else {
                                    swatch.css({background:"#eee",border:"1px dashed #999"})
                                }
                            } else {
                                swatch.css({background:"#eee",border:"1px dashed #999"})
                            }
                        }
                        nodeEntries[module].setUseCount[setName] = inUseCount;
                        nodeEntries[module].totalUseCount += inUseCount;

                        if (inUseCount > 0) {
                            setElements.enableButton.html(RED._('palette.editor.inuse'));
                            setElements.enableButton.addClass('disabled');
                        } else {
                            setElements.enableButton.removeClass('disabled');
                            if (set.enabled) {
                                setElements.enableButton.html(RED._('palette.editor.disable'));
                            } else {
                                setElements.enableButton.html(RED._('palette.editor.enable'));
                            }
                        }
                        setElements.setRow.toggleClass("palette-module-set-disabled",!set.enabled);
                    }
                }
                var nodeCount = (activeTypeCount === typeCount)?typeCount:activeTypeCount+" / "+typeCount;
                nodeEntry.setCount.html(RED._('palette.editor.nodeCount',{count:typeCount,label:nodeCount}));

                if (nodeEntries[module].totalUseCount > 0) {
                    nodeEntry.enableButton.html(RED._('palette.editor.inuse'));
                    nodeEntry.enableButton.addClass('disabled');
                    nodeEntry.removeButton.hide();
                } else {
                    nodeEntry.enableButton.removeClass('disabled');
                    if (moduleInfo.local) {
                        nodeEntry.removeButton.css('display', 'inline-block');
                    }
                    if (activeTypeCount === 0) {
                        nodeEntry.enableButton.html(RED._('palette.editor.enableall'));
                    } else {
                        nodeEntry.enableButton.html(RED._('palette.editor.disableall'));
                    }
                    nodeEntry.container.toggleClass("disabled",(activeTypeCount === 0));
                }
            }
            if (moduleInfo.pending_version) {
                nodeEntry.versionSpan.html(moduleInfo.version+' <i class="fa fa-long-arrow-right"></i> '+moduleInfo.pending_version).appendTo(nodeEntry.metaRow)
                nodeEntry.updateButton.html(RED._('palette.editor.updated')).addClass('disabled').show();
            } else if (loadedIndex.hasOwnProperty(module)) {
                if (semVerCompare(loadedIndex[module].version,moduleInfo.version) === 1) {
                    nodeEntry.updateButton.show();
                    nodeEntry.updateButton.html(RED._('palette.editor.update',{version:loadedIndex[module].version}));
                } else {
                    nodeEntry.updateButton.hide();
                }
            } else {
                nodeEntry.updateButton.hide();
            }
        }

    }

    function filterChange(val) {
        activeFilter = val.toLowerCase();
        var visible = nodeList.editableList('filter');
        var size = nodeList.editableList('length');
        if (val === "") {
            filterInput.searchBox('count');
        } else {
            filterInput.searchBox('count',visible+" / "+size);
        }
    }


    var catalogueCount;
    var catalogueLoadStatus = [];
    var catalogueLoadStart;
    var catalogueLoadErrors = false;

    var activeSort = sortModulesAZ;

    function handleCatalogResponse(err,catalog,index,v) {
        catalogueLoadStatus.push(err||v);
        if (!err) {
            if (v.modules) {
                v.modules.forEach(function(m) {
                    loadedIndex[m.id] = m;
                    m.index = [m.id];
                    if (m.keywords) {
                        m.index = m.index.concat(m.keywords);
                    }
                    if (m.updated_at) {
                        m.timestamp = new Date(m.updated_at).getTime();
                    } else {
                        m.timestamp = 0;
                    }
                    m.index = m.index.join(",").toLowerCase();
                })
                loadedList = loadedList.concat(v.modules);
            }
            searchInput.searchBox('count',loadedList.length);
        } else {
            catalogueLoadErrors = true;
        }
        if (catalogueCount > 1) {
            $(".palette-module-shade-status").html(RED._('palette.editor.loading')+"<br>"+catalogueLoadStatus.length+"/"+catalogueCount);
        }
        if (catalogueLoadStatus.length === catalogueCount) {
            if (catalogueLoadErrors) {
                RED.notify(RED._('palette.editor.errors.catalogLoadFailed',{url: catalog}),"error",false,8000);
            }
            var delta = 250-(Date.now() - catalogueLoadStart);
            setTimeout(function() {
                $("#palette-module-install-shade").hide();
            },Math.max(delta,0));

        }
    }

    function initInstallTab() {
        if (loadedList.length === 0) {
            loadedList = [];
            loadedIndex = {};
            packageList.editableList('empty');

            $(".palette-module-shade-status").html(RED._('palette.editor.loading'));
            var catalogues = RED.settings.theme('palette.catalogues')||['http://homegear.eu/node-blue/catalog.json'];
            catalogueLoadStatus = [];
            catalogueLoadErrors = false;
            catalogueCount = catalogues.length;
            if (catalogues.length > 1) {
                $(".palette-module-shade-status").html(RED._('palette.editor.loading')+"<br>0/"+catalogues.length);
            }
            $("#palette-module-install-shade").show();
            catalogueLoadStart = Date.now();
            var handled = 0;
            catalogues.forEach(function(catalog,index) {
                $.getJSON(catalog, {_: new Date().getTime()},function(v) {
                    handleCatalogResponse(null,catalog,index,v);
                    refreshNodeModuleList();
                }).fail(function(jqxhr, textStatus, error) {
                    handleCatalogResponse(jqxhr,catalog,index);
                }).always(function() {
                    handled++;
                    if (handled === catalogueCount) {
                        searchInput.searchBox('change');
                    }
                })
            });
        }
    }

    function refreshFilteredItems() {
        packageList.editableList('empty');
        var currentFilter = searchInput.searchBox('value').trim();
        if (currentFilter === ""){
            packageList.editableList('addItem',{count:loadedList.length})
            return;
        }
        filteredList.sort(activeSort);
        for (var i=0;i<Math.min(10,filteredList.length);i++) {
            packageList.editableList('addItem',filteredList[i]);
        }
        if (filteredList.length === 0) {
            packageList.editableList('addItem',{});
        }

        if (filteredList.length > 10) {
            packageList.editableList('addItem',{start:10,more:filteredList.length-10})
        }
    }
    function sortModulesAZ(A,B) {
        return A.info.id.localeCompare(B.info.id);
    }
    function sortModulesRecent(A,B) {
        return -1 * (A.info.timestamp-B.info.timestamp);
    }


    function init() {
        if (RED.settings.theme('palette.editable') === false) {
            return;
        }
        createSettingsPane();

        RED.userSettings.add({
            id:'palette',
            title: 'Palette',
            get: getSettingsPane,
            close: function() {
                settingsPane.detach();
            },
            focus: function() {
                editorTabs.resize();
                setTimeout(function() {
                    filterInput.focus();
                },200);
            }
        })

        RED.actions.add("core:manage-palette",function() {
                RED.userSettings.show('palette');
            });

        RED.events.on('registry:module-updated', function(ns) {
            refreshNodeModule(ns.module);
        });
        RED.events.on('registry:node-set-enabled', function(ns) {
            refreshNodeModule(ns.module);
        });
        RED.events.on('registry:node-set-disabled', function(ns) {
            refreshNodeModule(ns.module);
        });
        RED.events.on('registry:node-type-added', function(nodeType) {
            if (!/^subflow:/.test(nodeType)) {
                var ns = RED.nodes.registry.getNodeSetForType(nodeType);
                refreshNodeModule(ns.module);
            }
        });
        RED.events.on('registry:node-type-removed', function(nodeType) {
            if (!/^subflow:/.test(nodeType)) {
                var ns = RED.nodes.registry.getNodeSetForType(nodeType);
                refreshNodeModule(ns.module);
            }
        });
        RED.events.on('registry:node-set-added', function(ns) {
            refreshNodeModule(ns.module);
            for (var i=0;i<filteredList.length;i++) {
                if (filteredList[i].info.id === ns.module) {
                    var installButton = filteredList[i].elements.installButton;
                    installButton.addClass('disabled');
                    installButton.html(RED._('palette.editor.installed'));
                    break;
                }
            }
        });
        RED.events.on('registry:node-set-removed', function(ns) {
            var module = RED.nodes.registry.getModule(ns.module);
            if (!module) {
                var entry = nodeEntries[ns.module];
                if (entry) {
                    nodeList.editableList('removeItem', entry);
                    delete nodeEntries[ns.module];
                    for (var i=0;i<filteredList.length;i++) {
                        if (filteredList[i].info.id === ns.module) {
                            var installButton = filteredList[i].elements.installButton;
                            installButton.removeClass('disabled');
                            installButton.html(RED._('palette.editor.install'));
                            break;
                        }
                    }
                }
            }
        });
        RED.events.on('nodes:add', function(n) {
            if (!/^subflow:/.test(n.type)) {
                typesInUse[n.type] = (typesInUse[n.type]||0)+1;
                if (typesInUse[n.type] === 1) {
                    var ns = RED.nodes.registry.getNodeSetForType(n.type);
                    refreshNodeModule(ns.module);
                }
            }
        })
        RED.events.on('nodes:remove', function(n) {
            if (typesInUse.hasOwnProperty(n.type)) {
                typesInUse[n.type]--;
                if (typesInUse[n.type] === 0) {
                    delete typesInUse[n.type];
                    var ns = RED.nodes.registry.getNodeSetForType(n.type);
                    refreshNodeModule(ns.module);
                }
            }
        })
    }

    var settingsPane;

    function getSettingsPane() {
        initInstallTab();
        editorTabs.activateTab('nodes');
        return settingsPane;
    }



    function createSettingsPane() {
        settingsPane = $('<div id="user-settings-tab-palette"></div>');
        var content = $('<div id="palette-editor">'+
            '<ul id="palette-editor-tabs"></ul>'+
        '</div>').appendTo(settingsPane);

        editorTabs = RED.tabs.create({
            element: settingsPane.find('#palette-editor-tabs'),
            onchange:function(tab) {
                $("#palette-editor .palette-editor-tab").hide();
                tab.content.show();
                if (filterInput) {
                    filterInput.searchBox('value',"");
                }
                if (searchInput) {
                    searchInput.searchBox('value',"");
                }
                if (tab.id === 'install') {
                    if (searchInput) {
                        searchInput.focus();
                    }
                } else {
                    if (filterInput) {
                        filterInput.focus();
                    }
                }
            },
            minimumActiveTabWidth: 110
        });


        var modulesTab = $('<div>',{class:"palette-editor-tab"}).appendTo(content);

        editorTabs.addTab({
            id: 'nodes',
            label: RED._('palette.editor.tab-nodes'),
            content: modulesTab
        })

        var filterDiv = $('<div>',{class:"palette-search"}).appendTo(modulesTab);
        filterInput = $('<input type="text" data-i18n="[placeholder]palette.filter"></input>')
            .appendTo(filterDiv)
            .searchBox({
                delay: 200,
                change: function() {
                    filterChange($(this).val());
                }
            });


        nodeList = $('<ol>',{id:"palette-module-list", style:"position: absolute;top: 35px;bottom: 0;left: 0;right: 0px;"}).appendTo(modulesTab).editableList({
            addButton: false,
            scrollOnAdd: false,
            sort: function(A,B) {
                return A.info.name.localeCompare(B.info.name);
            },
            filter: function(data) {
                if (activeFilter === "" ) {
                    return true;
                }

                return (activeFilter==="")||(data.index.indexOf(activeFilter) > -1);
            },
            addItem: function(container,i,object) {
                var entry = object.info;
                if (entry) {
                    var headerRow = $('<div>',{class:"palette-module-header"}).appendTo(container);
                    var titleRow = $('<div class="palette-module-meta palette-module-name"><i class="fa fa-cube"></i></div>').appendTo(headerRow);
                    $('<span>').html(entry.name).appendTo(titleRow);
                    var metaRow = $('<div class="palette-module-meta palette-module-version"><i class="fa fa-tag"></i></div>').appendTo(headerRow);
                    var versionSpan = $('<span>').html(entry.version).appendTo(metaRow);
                    var buttonRow = $('<div>',{class:"palette-module-meta"}).appendTo(headerRow);
                    var setButton = $('<a href="#" class="editor-button editor-button-small palette-module-set-button"><i class="fa fa-angle-right palette-module-node-chevron"></i> </a>').appendTo(buttonRow);
                    var setCount = $('<span>').appendTo(setButton);
                    var buttonGroup = $('<div>',{class:"palette-module-button-group"}).appendTo(buttonRow);

                    var updateButton = $('<a href="#" class="editor-button editor-button-small"></a>').html(RED._('palette.editor.update')).appendTo(buttonGroup);
                    updateButton.attr('id','up_'+Math.floor(Math.random()*1000000000));
                    updateButton.click(function(evt) {
                        evt.preventDefault();
                        if ($(this).hasClass('disabled')) {
                            return;
                        }
                        $("#palette-module-install-confirm").data('module',entry.name);
                        $("#palette-module-install-confirm").data('version',loadedIndex[entry.name].version);
                        $("#palette-module-install-confirm").data('shade',shade);

                        $("#palette-module-install-confirm-body").html(entry.local?
                            RED._("palette.editor.confirm.update.body"):
                            RED._("palette.editor.confirm.cannotUpdate.body")
                        );
                        $(".palette-module-install-confirm-button-install").hide();
                        $(".palette-module-install-confirm-button-remove").hide();
                        if (entry.local) {
                            $(".palette-module-install-confirm-button-update").show();
                        } else {
                            $(".palette-module-install-confirm-button-update").hide();
                        }
                        $("#palette-module-install-confirm")
                            .dialog('option', 'title',RED._("palette.editor.confirm.update.title"))
                            .dialog('open');
                    })


                    var removeButton = $('<a href="#" class="editor-button editor-button-small"></a>').html(RED._('palette.editor.remove')).appendTo(buttonGroup);
                    removeButton.attr('id','up_'+Math.floor(Math.random()*1000000000));
                    removeButton.click(function(evt) {
                        evt.preventDefault();

                        $("#palette-module-install-confirm").data('module',entry.name);
                        $("#palette-module-install-confirm").data('shade',shade);
                        $("#palette-module-install-confirm-body").html(RED._("palette.editor.confirm.remove.body"));
                        $(".palette-module-install-confirm-button-install").hide();
                        $(".palette-module-install-confirm-button-remove").show();
                        $(".palette-module-install-confirm-button-update").hide();
                        $("#palette-module-install-confirm")
                            .dialog('option', 'title', RED._("palette.editor.confirm.remove.title"))
                            .dialog('open');
                    })
                    if (!entry.local) {
                        removeButton.hide();
                    }
                    var enableButton = $('<a href="#" class="editor-button editor-button-small"></a>').html(RED._('palette.editor.disableall')).appendTo(buttonGroup);

                    var contentRow = $('<div>',{class:"palette-module-content"}).appendTo(container);
                    var shade = $('<div class="palette-module-shade hide"><img src="red/images/spin.svg" class="palette-spinner"/></div>').appendTo(container);

                    object.elements = {
                        updateButton: updateButton,
                        removeButton: removeButton,
                        enableButton: enableButton,
                        setCount: setCount,
                        container: container,
                        shade: shade,
                        versionSpan: versionSpan,
                        sets: {}
                    }
                    setButton.click(function(evt) {
                        evt.preventDefault();
                        if (container.hasClass('expanded')) {
                            container.removeClass('expanded');
                            contentRow.slideUp();
                        } else {
                            container.addClass('expanded');
                            contentRow.slideDown();
                        }
                    })

                    var setList = Object.keys(entry.sets)
                    setList.sort(function(A,B) {
                        return A.toLowerCase().localeCompare(B.toLowerCase());
                    });
                    setList.forEach(function(setName) {
                        var set = entry.sets[setName];
                        var setRow = $('<div>',{class:"palette-module-set"}).appendTo(contentRow);
                        var buttonGroup = $('<div>',{class:"palette-module-set-button-group"}).appendTo(setRow);
                        var typeSwatches = {};
                        set.types.forEach(function(t) {
                            var typeDiv = $('<div>',{class:"palette-module-type"}).appendTo(setRow);
                            typeSwatches[t] = $('<span>',{class:"palette-module-type-swatch"}).appendTo(typeDiv);
                            $('<span>',{class:"palette-module-type-node"}).html(t).appendTo(typeDiv);
                        })

                        var enableButton = $('<a href="#" class="editor-button editor-button-small"></a>').appendTo(buttonGroup);
                        enableButton.click(function(evt) {
                            evt.preventDefault();
                            if (object.setUseCount[setName] === 0) {
                                var currentSet = RED.nodes.registry.getNodeSet(set.id);
                                shade.show();
                                var newState = !currentSet.enabled
                                changeNodeState(set.id,newState,shade,function(xhr){
                                    if (xhr) {
                                        if (xhr.responseJSON) {
                                            RED.notify(RED._('palette.editor.errors.'+(newState?'enable':'disable')+'Failed',{module: id,message:xhr.responseJSON.message}));
                                        }
                                    }
                                });
                            }
                        })

                        object.elements.sets[set.name] = {
                            setRow: setRow,
                            enableButton: enableButton,
                            swatches: typeSwatches
                        };
                    });
                    enableButton.click(function(evt) {
                        evt.preventDefault();
                        if (object.totalUseCount === 0) {
                            changeNodeState(entry.name,(container.hasClass('disabled')),shade,function(xhr){
                                if (xhr) {
                                    if (xhr.responseJSON) {
                                        RED.notify(RED._('palette.editor.errors.installFailed',{module: id,message:xhr.responseJSON.message}));
                                    }
                                }
                            });
                        }
                    })
                    refreshNodeModule(entry.name);
                } else {
                    $('<div>',{class:"red-ui-search-empty"}).html(RED._('search.empty')).appendTo(container);
                }
            }
        });



        var installTab = $('<div>',{class:"palette-editor-tab hide"}).appendTo(content);

        editorTabs.addTab({
            id: 'install',
            label: RED._('palette.editor.tab-install'),
            content: installTab
        })

        var toolBar = $('<div>',{class:"palette-editor-toolbar"}).appendTo(installTab);

        var searchDiv = $('<div>',{class:"palette-search"}).appendTo(installTab);
        searchInput = $('<input type="text" data-i18n="[placeholder]palette.search"></input>')
            .appendTo(searchDiv)
            .searchBox({
                delay: 300,
                change: function() {
                    var searchTerm = $(this).val().trim().toLowerCase();
                    if (searchTerm.length > 0) {
                        filteredList = loadedList.filter(function(m) {
                            return (m.index.indexOf(searchTerm) > -1);
                        }).map(function(f) { return {info:f}});
                        refreshFilteredItems();
                        searchInput.searchBox('count',filteredList.length+" / "+loadedList.length);
                    } else {
                        searchInput.searchBox('count',loadedList.length);
                        packageList.editableList('empty');
                        packageList.editableList('addItem',{count:loadedList.length});

                    }
                }
            });


        $('<span>').html(RED._("palette.editor.sort")+' ').appendTo(toolBar);
        var sortGroup = $('<span class="button-group"></span>').appendTo(toolBar);
        var sortAZ = $('<a href="#" class="sidebar-header-button-toggle selected" data-i18n="palette.editor.sortAZ"></a>').appendTo(sortGroup);
        var sortRecent = $('<a href="#" class="sidebar-header-button-toggle" data-i18n="palette.editor.sortRecent"></a>').appendTo(sortGroup);

        sortAZ.click(function(e) {
            e.preventDefault();
            if ($(this).hasClass("selected")) {
                return;
            }
            $(this).addClass("selected");
            sortRecent.removeClass("selected");
            activeSort = sortModulesAZ;
            refreshFilteredItems();
        });

        sortRecent.click(function(e) {
            e.preventDefault();
            if ($(this).hasClass("selected")) {
                return;
            }
            $(this).addClass("selected");
            sortAZ.removeClass("selected");
            activeSort = sortModulesRecent;
            refreshFilteredItems();
        });


        var refreshSpan = $('<span>').appendTo(toolBar);
        var refreshButton = $('<a href="#" class="sidebar-header-button"><i class="fa fa-refresh"></i></a>').appendTo(refreshSpan);
        refreshButton.click(function(e) {
            e.preventDefault();
            loadedList = [];
            loadedIndex = {};
            initInstallTab();
        })

        packageList = $('<ol>',{style:"position: absolute;top: 78px;bottom: 0;left: 0;right: 0px;"}).appendTo(installTab).editableList({
            addButton: false,
            scrollOnAdd: false,
            addItem: function(container,i,object) {
                if (object.count) {
                    $('<div>',{class:"red-ui-search-empty"}).html(RED._('palette.editor.moduleCount',{count:object.count})).appendTo(container);
                    return
                }
                if (object.more) {
                    container.addClass('palette-module-more');
                    var moreRow = $('<div>',{class:"palette-module-header palette-module"}).appendTo(container);
                    var moreLink = $('<a href="#"></a>').html(RED._('palette.editor.more',{count:object.more})).appendTo(moreRow);
                    moreLink.click(function(e) {
                        e.preventDefault();
                        packageList.editableList('removeItem',object);
                        for (var i=object.start;i<Math.min(object.start+10,object.start+object.more);i++) {
                            packageList.editableList('addItem',filteredList[i]);
                        }
                        if (object.more > 10) {
                            packageList.editableList('addItem',{start:object.start+10, more:object.more-10})
                        }
                    })
                    return;
                }
                if (object.info) {
                    var entry = object.info;
                    var headerRow = $('<div>',{class:"palette-module-header"}).appendTo(container);
                    var titleRow = $('<div class="palette-module-meta"><i class="fa fa-cube"></i></div>').appendTo(headerRow);
                    $('<span>',{class:"palette-module-name"}).html(entry.name||entry.id).appendTo(titleRow);
                    $('<a target="_blank" class="palette-module-link"><i class="fa fa-external-link"></i></a>').attr('href',entry.url).appendTo(titleRow);
                    var descRow = $('<div class="palette-module-meta"></div>').appendTo(headerRow);
                    $('<div>',{class:"palette-module-description"}).html(entry.description).appendTo(descRow);

                    var metaRow = $('<div class="palette-module-meta"></div>').appendTo(headerRow);
                    $('<span class="palette-module-version"><i class="fa fa-tag"></i> '+entry.version+'</span>').appendTo(metaRow);
                    $('<span class="palette-module-updated"><i class="fa fa-calendar"></i> '+formatUpdatedAt(entry.updated_at)+'</span>').appendTo(metaRow);
                    var buttonRow = $('<div>',{class:"palette-module-meta"}).appendTo(headerRow);
                    var buttonGroup = $('<div>',{class:"palette-module-button-group"}).appendTo(buttonRow);
                    var shade = $('<div class="palette-module-shade hide"><img src="red/images/spin.svg" class="palette-spinner"/></div>').appendTo(container);
                    var installButton = $('<a href="#" class="editor-button editor-button-small"></a>').html(RED._('palette.editor.install')).appendTo(buttonGroup);
                    installButton.click(function(e) {
                        e.preventDefault();
                        if (!$(this).hasClass('disabled')) {
                            $("#palette-module-install-confirm").data('module',entry.id);
                            $("#palette-module-install-confirm").data('version',entry.version);
                            $("#palette-module-install-confirm").data('url',entry.url);
                            $("#palette-module-install-confirm").data('shade',shade);
                            $("#palette-module-install-confirm-body").html(RED._("palette.editor.confirm.install.body"));
                            $(".palette-module-install-confirm-button-install").show();
                            $(".palette-module-install-confirm-button-remove").hide();
                            $(".palette-module-install-confirm-button-update").hide();
                            $("#palette-module-install-confirm")
                                .dialog('option', 'title', RED._("palette.editor.confirm.install.title"))
                                .dialog('open');
                        }
                    })
                    if (nodeEntries.hasOwnProperty(entry.id)) {
                        installButton.addClass('disabled');
                        installButton.html(RED._('palette.editor.installed'));
                    }

                    object.elements = {
                        installButton:installButton
                    }
                } else {
                    $('<div>',{class:"red-ui-search-empty"}).html(RED._('search.empty')).appendTo(container);
                }
            }
        });

        $('<div id="palette-module-install-shade" class="palette-module-shade hide"><div class="palette-module-shade-status"></div><img src="red/images/spin.svg" class="palette-spinner"/></div>').appendTo(installTab);

        $('<div id="palette-module-install-confirm" class="hide"><form class="form-horizontal"><div id="palette-module-install-confirm-body" class="node-dialog-confirm-row"></div></form></div>').appendTo(document.body);
        $("#palette-module-install-confirm").dialog({
            title: RED._('palette.editor.confirm.title'),
            modal: true,
            autoOpen: false,
            width: 550,
            height: "auto",
            buttons: [
                {
                    text: RED._("common.label.cancel"),
                    click: function() {
                        $( this ).dialog( "close" );
                    }
                },
                {
                    text: RED._("palette.editor.confirm.button.review"),
                    class: "primary palette-module-install-confirm-button-install",
                    click: function() {
                        var url = $(this).data('url');
                        window.open(url);
                    }
                },
                {
                    text: RED._("palette.editor.confirm.button.install"),
                    class: "primary palette-module-install-confirm-button-install",
                    click: function() {
                        var id = $(this).data('module');
                        var version = $(this).data('version');
                        var shade = $(this).data('shade');
                        installNodeModule(id,version,shade,function(xhr) {
                             if (xhr) {
                                 if (xhr.responseJSON) {
                                     RED.notify(RED._('palette.editor.errors.installFailed',{module: id,message:xhr.responseJSON.message}));
                                 }
                             }
                        });
                        $( this ).dialog( "close" );
                    }
                },
                {
                    text: RED._("palette.editor.confirm.button.remove"),
                    class: "primary palette-module-install-confirm-button-remove",
                    click: function() {
                        var id = $(this).data('module');
                        var shade = $(this).data('shade');
                        shade.show();
                        removeNodeModule(id, function(xhr) {
                            shade.hide();
                            if (xhr) {
                                if (xhr.responseJSON) {
                                    RED.notify(RED._('palette.editor.errors.removeFailed',{module: id,message:xhr.responseJSON.message}));
                                }
                            }
                        })

                        $( this ).dialog( "close" );
                    }
                },
                {
                    text: RED._("palette.editor.confirm.button.update"),
                    class: "primary palette-module-install-confirm-button-update",
                    click: function() {
                        var id = $(this).data('module');
                        var version = $(this).data('version');
                        var shade = $(this).data('shade');
                        shade.show();
                        installNodeModule(id,version,shade,function(xhr) {
                             if (xhr) {
                                 if (xhr.responseJSON) {
                                     RED.notify(RED._('palette.editor.errors.updateFailed',{module: id,message:xhr.responseJSON.message}));
                                 }
                             }
                        });
                        $( this ).dialog( "close" );
                    }
                }
            ]
        })
    }

    return {
        init: init
    }
})();
;/** This file was modified by Sathya Laufer */

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
RED.editor = (function() {


    var editStack = [];
    var editing_node = null;
    var editing_config_node = null;
    var subflowEditor;

    var editTrayWidthCache = {};

    function getCredentialsURL(nodeType, nodeID) {
        var dashedType = nodeType.replace(/\s+/g, '-');
        return  'credentials/' + dashedType + "/" + nodeID;
    }

    /**
     * Validate a node
     * @param node - the node being validated
     * @returns {boolean} whether the node is valid. Sets node.dirty if needed
     */
    function validateNode(node) {
        var oldValue = node.valid;
        var oldChanged = node.changed;
        node.valid = true;
        var subflow;
        var isValid;
        var hasChanged;
        if (node.type.indexOf("subflow:")===0) {
            subflow = RED.nodes.subflow(node.type.substring(8));
            isValid = subflow.valid;
            hasChanged = subflow.changed;
            if (isValid === undefined) {
                isValid = validateNode(subflow);
                hasChanged = subflow.changed;
            }
            node.valid = isValid;
            node.changed = node.changed || hasChanged;
        } else if (node._def) {
            node.valid = validateNodeProperties(node, node._def.defaults, node);
            if (node._def._creds) {
                node.valid = node.valid && validateNodeProperties(node, node._def.credentials, node._def._creds);
            }
        } else if (node.type == "subflow") {
            var subflowNodes = RED.nodes.filterNodes({z:node.id});
            for (var i=0;i<subflowNodes.length;i++) {
                isValid = subflowNodes[i].valid;
                hasChanged = subflowNodes[i].changed;
                if (isValid === undefined) {
                    isValid = validateNode(subflowNodes[i]);
                    hasChanged = subflowNodes[i].changed;
                }
                node.valid = node.valid && isValid;
                node.changed = node.changed || hasChanged;
            }
            var subflowInstances = RED.nodes.filterNodes({type:"subflow:"+node.id});
            var modifiedTabs = {};
            for (i=0;i<subflowInstances.length;i++) {
                subflowInstances[i].valid = node.valid;
                subflowInstances[i].changed = subflowInstances[i].changed || node.changed;
                subflowInstances[i].dirty = true;
                modifiedTabs[subflowInstances[i].z] = true;
            }
            Object.keys(modifiedTabs).forEach(function(id) {
                var subflow = RED.nodes.subflow(id);
                if (subflow) {
                    validateNode(subflow);
                }
            });
        }
        if (oldValue !== node.valid || oldChanged !== node.changed) {
            node.dirty = true;
            subflow = RED.nodes.subflow(node.z);
            if (subflow) {
                validateNode(subflow);
            }
        }
        return node.valid;
    }

    /**
     * Validate a node's properties for the given set of property definitions
     * @param node - the node being validated
     * @param definition - the node property definitions (either def.defaults or def.creds)
     * @param properties - the node property values to validate
     * @returns {boolean} whether the node's properties are valid
     */
    function validateNodeProperties(node, definition, properties) {
        var isValid = true;
        for (var prop in definition) {
            if (definition.hasOwnProperty(prop)) {
                if (!validateNodeProperty(node, definition, prop, properties[prop])) {
                    isValid = false;
                }
            }
        }
        return isValid;
    }

    /**
     * Validate a individual node property
     * @param node - the node being validated
     * @param definition - the node property definitions (either def.defaults or def.creds)
     * @param property - the property name being validated
     * @param value - the property value being validated
     * @returns {boolean} whether the node proprty is valid
     */
    function validateNodeProperty(node,definition,property,value) {
        var valid = true;
        if (/^\$\([a-zA-Z_][a-zA-Z0-9_]*\)$/.test(value)) {
            return true;
        }
        if ("required" in definition[property] && definition[property].required) {
            valid = value !== "";
        }
        if (valid && "validate" in definition[property]) {
            try {
                valid = definition[property].validate.call(node,value);
            } catch(err) {
                console.log("Validation error:",node.type,node.id,"property: "+property,"value:",value,err);
            }
        }
        if (valid && definition[property].type && RED.nodes.getType(definition[property].type) && !("validate" in definition[property])) {
            if (!value || value == "_ADD_") {
                valid = definition[property].hasOwnProperty("required") && !definition[property].required;
            } else {
                var configNode = RED.nodes.node(value);
                valid = (configNode !== null && (configNode.valid == null || configNode.valid));
            }
        }
        return valid;
    }


    function validateNodeEditor(node,prefix) {
        for (var prop in node._def.defaults) {
            if (node._def.defaults.hasOwnProperty(prop)) {
                validateNodeEditorProperty(node,node._def.defaults,prop,prefix);
            }
        }
        if (node._def.credentials) {
            for (prop in node._def.credentials) {
                if (node._def.credentials.hasOwnProperty(prop)) {
                    validateNodeEditorProperty(node,node._def.credentials,prop,prefix);
                }
            }
        }
    }
    function validateNodeEditorProperty(node,defaults,property,prefix) {
        var input = $("#"+prefix+"-"+property);
        if (input.length > 0) {
            var value = input.val();
            if (defaults[property].hasOwnProperty("format") && defaults[property].format !== "" && input[0].nodeName === "DIV") {
                value = input.text();
            }
            if (!validateNodeProperty(node, defaults, property,value)) {
                input.addClass("input-error");
            } else {
                input.removeClass("input-error");
            }
        }
    }

    /**
     * Called when the node's properties have changed.
     * Marks the node as dirty and needing a size check.
     * Removes any links to non-existant outputs.
     * @param node - the node that has been updated
     * @param outputMap - (optional) a map of old->new port numbers if wires should be moved
     * @returns {array} the links that were removed due to this update
     */
    function updateNodeProperties(node, outputMap) {
        node.resize = true;
        node.dirty = true;
        var removedLinks = [];
        if (node.inputPorts) {
            if (node.inputs < node.inputPorts.length) {
                while (node.inputs < node.inputPorts.length) {
                    node.inputPorts.pop();
                }
                RED.nodes.eachLink(function(l) {
                    if (l.target === node && l.targetPort >= node.inputs && removedLinks.indexOf(l) === -1) {
                        removedLinks.push(l);
                    }
                });
            } else if (node.inputs > node.inputPorts.length) {
                while (node.inputs > node.inputPorts.length) {
                    node.inputPorts.push(node.inputPorts.length);
                }
            }
        }
        if (node.outputPorts) {
            if (outputMap) {
                RED.nodes.eachLink(function(l) {
                    if (l.source === node && outputMap.hasOwnProperty(l.sourcePort)) {
                        if (outputMap[l.sourcePort] === "-1") {
                            removedLinks.push(l);
                        } else {
                            l.sourcePort = outputMap[l.sourcePort];
                        }
                    }
                });
            }
            if (node.outputs < node.outputPorts.length) {
                while (node.outputs < node.outputPorts.length) {
                    node.outputPorts.pop();
                }
                RED.nodes.eachLink(function(l) {
                    if (l.source === node && l.sourcePort >= node.outputs && removedLinks.indexOf(l) === -1) {
                        removedLinks.push(l);
                    }
                });
            } else if (node.outputs > node.outputPorts.length) {
                while (node.outputs > node.outputPorts.length) {
                    node.outputPorts.push(node.outputPorts.length);
                }
            }
        }
        for (var l=0;l<removedLinks.length;l++) {
            RED.nodes.removeLink(removedLinks[l]);
        }
        return removedLinks;
    }

    /**
     * Create a config-node select box for this property
     * @param node - the node being edited
     * @param property - the name of the field
     * @param type - the type of the config-node
     */
    function prepareConfigNodeSelect(node,property,type,prefix) {
        var input = $("#"+prefix+"-"+property);
        if (input.length === 0 ) {
            return;
        }
        var newWidth = input.width();
        var attrStyle = input.attr('style');
        var m;
        if ((m = /width\s*:\s*(\d+(%|[a-z]+))/i.exec(attrStyle)) !== null) {
            newWidth = m[1];
        } else {
            newWidth = "70%";
        }
        var outerWrap = $("<div></div>").css({display:'inline-block',position:'relative'});
        var selectWrap = $("<div></div>").css({position:'absolute',left:0,right:'40px'}).appendTo(outerWrap);
        var select = $('<select id="'+prefix+'-'+property+'"></select>').appendTo(selectWrap);

        outerWrap.width(newWidth).height(input.height());
        if (outerWrap.width() === 0) {
            outerWrap.width("70%");
        }
        input.replaceWith(outerWrap);
        // set the style attr directly - using width() on FF causes a value of 114%...
        select.attr('style',"width:100%");
        updateConfigNodeSelect(property,type,node[property],prefix);
        $('<a id="'+prefix+'-lookup-'+property+'" class="editor-button"><i class="fa fa-pencil"></i></a>')
            .css({position:'absolute',right:0,top:0})
            .appendTo(outerWrap);
        $('#'+prefix+'-lookup-'+property).click(function(e) {
            showEditConfigNodeDialog(property,type,select.find(":selected").val(),prefix);
            e.preventDefault();
        });
        var label = "";
        var configNode = RED.nodes.node(node[property]);
        var node_def = RED.nodes.getType(type);

        if (configNode) {
            label = RED.utils.getNodeLabel(configNode,configNode.id);
        }
        input.val(label);
    }

    /**
     * Create a config-node button for this property
     * @param node - the node being edited
     * @param property - the name of the field
     * @param type - the type of the config-node
     */
    function prepareConfigNodeButton(node,property,type,prefix) {
        var input = $("#"+prefix+"-"+property);
        input.val(node[property]);
        input.attr("type","hidden");

        var button = $("<a>",{id:prefix+"-edit-"+property, class:"editor-button"});
        input.after(button);

        if (node[property]) {
            button.text(RED._("editor.configEdit"));
        } else {
            button.text(RED._("editor.configAdd"));
        }

        button.click(function(e) {
            showEditConfigNodeDialog(property,type,input.val()||"_ADD_",prefix);
            e.preventDefault();
        });
    }

    /**
     * Populate the editor dialog input field for this property
     * @param node - the node being edited
     * @param property - the name of the field
     * @param prefix - the prefix to use in the input element ids (node-input|node-config-input)
     * @param definition - the definition of the field
     */
    function preparePropertyEditor(node,property,prefix,definition) {
        var input = $("#"+prefix+"-"+property);
        if (input.length === 0) {
            return;
        }
        if (input.attr('type') === "checkbox") {
            input.prop('checked',node[property]);
        }
        else {
            var val = node[property];
            if (val == null) {
                val = "";
            }
            if (definition !== undefined && definition[property].hasOwnProperty("format") && definition[property].format !== "" && input[0].nodeName === "DIV") {
                input.html(RED.text.format.getHtml(val, definition[property].format, {}, false, "en"));
                RED.text.format.attach(input[0], definition[property].format, {}, false, "en");
            } else {
                input.val(val);
                if (input[0].nodeName === 'INPUT' || input[0].nodeName === 'TEXTAREA') {
                    RED.text.bidi.prepareInput(input);
                }
            }
        }
    }

    /**
     * Add an on-change handler to revalidate a node field
     * @param node - the node being edited
     * @param definition - the definition of the node
     * @param property - the name of the field
     * @param prefix - the prefix to use in the input element ids (node-input|node-config-input)
     */
    function attachPropertyChangeHandler(node,definition,property,prefix) {
        var input = $("#"+prefix+"-"+property);
        if (definition !== undefined && "format" in definition[property] && definition[property].format !== "" && input[0].nodeName === "DIV") {
            $("#"+prefix+"-"+property).on('change keyup', function(event,skipValidation) {
                if (!skipValidation) {
                    validateNodeEditor(node,prefix);
                }
            });
        } else {
            $("#"+prefix+"-"+property).change(function(event,skipValidation) {
                if (!skipValidation) {
                    validateNodeEditor(node,prefix);
                }
            });
        }
    }

    /**
     * Assign the value to each credential field
     * @param node
     * @param credDef
     * @param credData
     * @param prefix
     */
    function populateCredentialsInputs(node, credDef, credData, prefix) {
        var cred;
        for (cred in credDef) {
            if (credDef.hasOwnProperty(cred)) {
                if (credDef[cred].type == 'password') {
                    if (credData[cred]) {
                        $('#' + prefix + '-' + cred).val(credData[cred]);
                    } else if (credData['has_' + cred]) {
                        $('#' + prefix + '-' + cred).val('__PWRD__');
                    }
                    else {
                        $('#' + prefix + '-' + cred).val('');
                    }
                } else {
                    preparePropertyEditor(credData, cred, prefix, credDef);
                }
                attachPropertyChangeHandler(node, credDef, cred, prefix);
            }
        }
    }

    /**
     * Update the node credentials from the edit form
     * @param node - the node containing the credentials
     * @param credDefinition - definition of the credentials
     * @param prefix - prefix of the input fields
     * @return {boolean} whether anything has changed
     */
    function updateNodeCredentials(node, credDefinition, prefix) {
        var changed = false;
        if(!node.credentials) {
            node.credentials = {_:{}};
        }

        for (var cred in credDefinition) {
            if (credDefinition.hasOwnProperty(cred)) {
                var input = $("#" + prefix + '-' + cred);
                var value = input.val();
                if (credDefinition[cred].type == 'password') {
                    node.credentials['has_' + cred] = (value !== "");
                    if (value == '__PWRD__') {
                        continue;
                    }
                    changed = true;

                }
                node.credentials[cred] = value;
                if (value != node.credentials._[cred]) {
                    changed = true;
                }
            }
        }
        return changed;
    }

    /**
     * Prepare all of the editor dialog fields
     * @param node - the node being edited
     * @param definition - the node definition
     * @param prefix - the prefix to use in the input element ids (node-input|node-config-input)
     */
    function prepareEditDialog(node,definition,prefix,done) {
        for (var d in definition.defaults) {
            if (definition.defaults.hasOwnProperty(d)) {
                if (definition.defaults[d].type) {
                    var configTypeDef = RED.nodes.getType(definition.defaults[d].type);
                    if (configTypeDef) {
                        if (configTypeDef.exclusive) {
                            prepareConfigNodeButton(node,d,definition.defaults[d].type,prefix);
                        } else {
                            prepareConfigNodeSelect(node,d,definition.defaults[d].type,prefix);
                        }
                    } else {
                        console.log("Unknown type:", definition.defaults[d].type);
                        preparePropertyEditor(node,d,prefix,definition.defaults);
                    }
                } else {
                    preparePropertyEditor(node,d,prefix,definition.defaults);
                }
                attachPropertyChangeHandler(node,definition.defaults,d,prefix);
            }
        }
        var completePrepare = function() {
            if (definition.oneditprepare) {
                try {
                    definition.oneditprepare.call(node);
                } catch(err) {
                    console.log("oneditprepare",node.id,node.type,err.toString());
                }
            }
            // Now invoke any change handlers added to the fields - passing true
            // to prevent full node validation from being triggered each time
            for (var d in definition.defaults) {
                if (definition.defaults.hasOwnProperty(d)) {
                    $("#"+prefix+"-"+d).trigger("change",[true]);
                }
            }
            if (definition.credentials) {
                for (d in definition.credentials) {
                    if (definition.credentials.hasOwnProperty(d)) {
                        $("#"+prefix+"-"+d).trigger("change",[true]);
                    }
                }
            }
            validateNodeEditor(node,prefix);
            if (done) {
                done();
            }
        }

        if (definition.credentials) {
            if (node.credentials) {
                populateCredentialsInputs(node, definition.credentials, node.credentials, prefix);
                completePrepare();
            } else {
                $.getJSON(getCredentialsURL(node.type, node.id), function (data) {
                    node.credentials = data;
                    node.credentials._ = $.extend(true,{},data);
                    populateCredentialsInputs(node, definition.credentials, node.credentials, prefix);
                    completePrepare();
                });
            }
        } else {
            completePrepare();
        }
    }

    function getEditStackTitle() {
        var title = '<ul class="editor-tray-breadcrumbs">';
        for (var i=0;i<editStack.length;i++) {
            var node = editStack[i];
            var label = node.type;
            if (node.type === '_expression') {
                label = RED._("expressionEditor.title");
            } else if (node.type === '_json') {
                label = RED._("jsonEditor.title");
            } else if (node.type === 'subflow') {
                label = RED._("subflow.editSubflow",{name:node.name})
            } else if (node.type.indexOf("subflow:")===0) {
                var subflow = RED.nodes.subflow(node.type.substring(8));
                label = RED._("subflow.editSubflow",{name:subflow.name})
            } else {
                if (typeof node._def.paletteLabel !== "undefined") {
                    try {
                        label = (typeof node._def.paletteLabel === "function" ? node._def.paletteLabel.call(node._def) : node._def.paletteLabel)||"";
                    } catch(err) {
                        console.log("Definition error: "+node.type+".paletteLabel",err);
                    }
                }
                if (i === editStack.length-1) {
                    if (RED.nodes.node(node.id)) {
                        label = RED._("editor.editNode",{type:label});
                    } else {
                        label = RED._("editor.addNewConfig",{type:label});
                    }
                }
            }
            title += '<li>'+label+'</li>';
        }
        title += '</ul>';
        return title;
    }

    function buildEditForm(container,formId,type,ns) {
        var dialogForm = $('<form id="'+formId+'" class="form-horizontal" autocomplete="off"></form>').appendTo(container);
        dialogForm.html($("script[data-template-name='"+type+"']").html());
        ns = ns||"node-red";
        dialogForm.find('[data-i18n]').each(function() {
            var current = $(this).attr("data-i18n");
            var keys = current.split(";");
            for (var i=0;i<keys.length;i++) {
                var key = keys[i];
                if (key.indexOf(":") === -1) {
                    var prefix = "";
                    if (key.indexOf("[")===0) {
                        var parts = key.split("]");
                        prefix = parts[0]+"]";
                        key = parts[1];
                    }
                    keys[i] = prefix+ns+":"+key;
                }
            }
            $(this).attr("data-i18n",keys.join(";"));
        });
        // Add dummy fields to prevent 'Enter' submitting the form in some
        // cases, and also prevent browser auto-fill of password
        // Add in reverse order as they are prepended...
        $('<input type="password" style="display: none;" />').prependTo(dialogForm);
        $('<input type="text" style="display: none;" />').prependTo(dialogForm);
        dialogForm.submit(function(e) { e.preventDefault();});
        return dialogForm;
    }

    function refreshLabelForm(container,node) {

        var inputPlaceholder = node._def.inputLabels?RED._("editor.defaultLabel"):RED._("editor.noDefaultLabel");
        var outputPlaceholder = node._def.outputLabels?RED._("editor.defaultLabel"):RED._("editor.noDefaultLabel");

        var inputsDiv = $("#node-label-form-inputs");
        var outputsDiv = $("#node-label-form-outputs");

        var inputCount = node.inputs || node._def.inputs || 0;
        var children = inputsDiv.children();
        var childCount = children.length;
        if (childCount === 1 && $(children[0]).hasClass('node-label-form-none')) {
            childCount--;
        }

        if (childCount < inputCount) {
            if (childCount === 0) {
                // remove the 'none' placeholder
                $(children[0]).remove();
            }
            for (i = childCount;i<inputCount;i++) {
                buildLabelRow("input",i,"",inputPlaceholder).appendTo(inputsDiv);
            }
        } else if (childCount > inputCount) {
            for (i=inputCount;i<childCount;i++) {
                $(children[i]).remove();
            }
            if (outputCount === 0) {
                buildLabelRow().appendTo(inputsDiv);
            }
        }

        var outputCount;
        var i;
        var formOutputs = $("#node-input-outputs").val();

        if (formOutputs === undefined) {
            outputCount = node.outputs || node._def.outputs || 0;
        } else if (isNaN(formOutputs)) {
            var outputMap = JSON.parse(formOutputs);
            var keys = Object.keys(outputMap);
            children = outputsDiv.children();
            childCount = children.length;
            if (childCount === 1 && $(children[0]).hasClass('node-label-form-none')) {
                childCount--;
            }

            outputCount = 0;
            var rows = [];
            keys.forEach(function(p) {
                var row = $("#node-label-form-output-"+p).parent();
                if (row.length === 0 && outputMap[p] !== -1) {
                    if (childCount === 0) {
                        $(children[0]).remove();
                        childCount = -1;
                    }
                    row = buildLabelRow("output",p,"",outputPlaceholder);
                } else {
                    row.detach();
                }
                if (outputMap[p] !== -1) {
                    outputCount++;
                    rows.push({i:parseInt(outputMap[p]),r:row});
                }
            });
            rows.sort(function(A,B) {
                return A.i-B.i;
            })
            rows.forEach(function(r,i) {
                r.r.find("label").html((i+1)+".");
                r.r.appendTo(outputsDiv);
            })
            if (rows.length === 0) {
                buildLabelRow("output",i,"").appendTo(outputsDiv);
            } else {

            }
        } else {
            outputCount = Math.max(0,parseInt(formOutputs));
        }
        children = outputsDiv.children();
        childCount = children.length;
        if (childCount === 1 && $(children[0]).hasClass('node-label-form-none')) {
            childCount--;
        }
        if (childCount < outputCount) {
            if (childCount === 0) {
                // remove the 'none' placeholder
                $(children[0]).remove();
            }
            for (i = childCount;i<outputCount;i++) {
                buildLabelRow("output",i,"").appendTo(outputsDiv);
            }
        } else if (childCount > outputCount) {
            for (i=outputCount;i<childCount;i++) {
                $(children[i]).remove();
            }
            if (outputCount === 0) {
                buildLabelRow().appendTo(outputsDiv);
            }
        }
    }
    function buildLabelRow(type, index, value, placeHolder) {
        var result = $('<div>',{class:"node-label-form-row"});
        if (type === undefined) {
            $('<span>').html("none").appendTo(result);
            result.addClass("node-label-form-none");
        } else {
            result.addClass("");
            var id = "node-label-form-"+type+"-"+index;
            $('<label>',{for:id}).html((index+1)+".").appendTo(result);
            var input = $('<input>',{type:"text",id:id, placeholder: placeHolder}).val(value).appendTo(result);
            var clear = $('<button class="editor-button editor-button-small"><i class="fa fa-times"></i></button>').appendTo(result);
            clear.click(function(evt) {
                evt.preventDefault();
                input.val("");
            })
        }
        return result;
    }
    function buildLabelForm(container,node) {
        var dialogForm = $('<form class="dialog-form form-horizontal" autocomplete="off"></form>').appendTo(container);

        var inputCount = node.inputs || node._def.inputs || 0;
        var outputCount = node.outputs || node._def.outputs || 0;
        if (node.type === 'subflow') {
            inputCount = node.in.length;
            outputCount = node.out.length;
        }

        var inputLabels = node.inputLabels || [];
        var outputLabels = node.outputLabels || [];

        var inputPlaceholder = node._def.inputLabels?RED._("editor.defaultLabel"):RED._("editor.noDefaultLabel");
        var outputPlaceholder = node._def.outputLabels?RED._("editor.defaultLabel"):RED._("editor.noDefaultLabel");

        var i,row;
        $('<div class="form-row"><span data-i18n="editor.labelInputs"></span><div id="node-label-form-inputs"></div></div>').appendTo(dialogForm);
        var inputsDiv = $("#node-label-form-inputs");
        if (inputCount > 0) {
            for (i=0;i<inputCount;i++) {
                buildLabelRow("input",i,inputLabels[i],inputPlaceholder).appendTo(inputsDiv);
            }
        } else {
            buildLabelRow().appendTo(inputsDiv);
        }
        $('<div class="form-row"><span data-i18n="editor.labelOutputs"></span><div id="node-label-form-outputs"></div></div>').appendTo(dialogForm);
        var outputsDiv = $("#node-label-form-outputs");
        if (outputCount > 0) {
            for (i=0;i<outputCount;i++) {
                buildLabelRow("output",i,outputLabels[i],outputPlaceholder).appendTo(outputsDiv);
            }
        } else {
            buildLabelRow().appendTo(outputsDiv);
        }
    }

    function showEditDialog(node) {
        var editing_node = node;
        editStack.push(node);
        RED.view.state(RED.state.EDITING);
        var type = node.type;
        if (node.type.substring(0,8) == "subflow:") {
            type = "subflow";
        }
        var trayOptions = {
            title: getEditStackTitle(),
            buttons: [
                {
                    id: "node-dialog-delete",
                    class: 'leftButton',
                    text: RED._("common.label.delete"),
                    click: function() {
                        var startDirty = RED.nodes.dirty();
                        var removedNodes = [];
                        var removedLinks = [];
                        var removedEntities = RED.nodes.remove(editing_node.id);
                        removedNodes.push(editing_node);
                        removedNodes = removedNodes.concat(removedEntities.nodes);
                        removedLinks = removedLinks.concat(removedEntities.links);

                        var historyEvent = {
                            t:'delete',
                            nodes:removedNodes,
                            links:removedLinks,
                            changes: {},
                            dirty: startDirty
                        }

                        RED.nodes.dirty(true);
                        RED.view.redraw(true);
                        RED.history.push(historyEvent);
                        RED.tray.close();
                    }
                },
                {
                    id: "node-dialog-cancel",
                    text: RED._("common.label.cancel"),
                    click: function() {
                        if (editing_node._def) {
                            if (editing_node._def.oneditcancel) {
                                try {
                                    editing_node._def.oneditcancel.call(editing_node);
                                } catch(err) {
                                    console.log("oneditcancel",editing_node.id,editing_node.type,err.toString());
                                }
                            }

                            for (var d in editing_node._def.defaults) {
                                if (editing_node._def.defaults.hasOwnProperty(d)) {
                                    var def = editing_node._def.defaults[d];
                                    if (def.type) {
                                        var configTypeDef = RED.nodes.getType(def.type);
                                        if (configTypeDef && configTypeDef.exclusive) {
                                            var input = $("#node-input-"+d).val()||"";
                                            if (input !== "" && !editing_node[d]) {
                                                // This node has an exclusive config node that
                                                // has just been added. As the user is cancelling
                                                // the edit, need to delete the just-added config
                                                // node so that it doesn't get orphaned.
                                                RED.nodes.remove(input);
                                            }
                                        }
                                    }
                                }

                            }
                        }
                        RED.tray.close();
                    }
                },
                {
                    id: "node-dialog-ok",
                    text: RED._("common.label.done"),
                    class: "primary",
                    click: function() {
                        var changes = {};
                        var changed = false;
                        var wasDirty = RED.nodes.dirty();
                        var d;
                        var outputMap;

                        if (editing_node._def.oneditsave) {
                            var oldValues = {};
                            for (d in editing_node._def.defaults) {
                                if (editing_node._def.defaults.hasOwnProperty(d)) {
                                    if (typeof editing_node[d] === "string" || typeof editing_node[d] === "number") {
                                        oldValues[d] = editing_node[d];
                                    } else {
                                        oldValues[d] = $.extend(true,{},{v:editing_node[d]}).v;
                                    }
                                }
                            }
                            try {
                                var rc = editing_node._def.oneditsave.call(editing_node);
                                if (rc === true) {
                                    changed = true;
                                }
                            } catch(err) {
                                console.log("oneditsave",editing_node.id,editing_node.type,err.toString());
                            }

                            for (d in editing_node._def.defaults) {
                                if (editing_node._def.defaults.hasOwnProperty(d)) {
                                    if (oldValues[d] === null || typeof oldValues[d] === "string" || typeof oldValues[d] === "number") {
                                        if (oldValues[d] !== editing_node[d]) {
                                            changes[d] = oldValues[d];
                                            changed = true;
                                        }
                                    } else {
                                        if (JSON.stringify(oldValues[d]) !== JSON.stringify(editing_node[d])) {
                                            changes[d] = oldValues[d];
                                            changed = true;
                                        }
                                    }
                                }
                            }
                        }

                        var newValue;
                        if (editing_node._def.defaults) {
                            for (d in editing_node._def.defaults) {
                                if (editing_node._def.defaults.hasOwnProperty(d)) {
                                    var input = $("#node-input-"+d);
                                    if (input.attr('type') === "checkbox") {
                                        newValue = input.prop('checked');
                                    } else if ("format" in editing_node._def.defaults[d] && editing_node._def.defaults[d].format !== "" && input[0].nodeName === "DIV") {
                                        newValue = input.text();
                                    } else {
                                        newValue = input.val();
                                    }
                                    if (newValue != null) {
                                        if (d === "outputs") {
                                            if  (newValue.trim() === "") {
                                                continue;
                                            }
                                            if (isNaN(newValue)) {
                                                outputMap = JSON.parse(newValue);
                                                var outputCount = 0;
                                                var outputsChanged = false;
                                                var keys = Object.keys(outputMap);
                                                keys.forEach(function(p) {
                                                    if (isNaN(p)) {
                                                        // New output;
                                                        outputCount ++;
                                                        delete outputMap[p];
                                                    } else {
                                                        outputMap[p] = outputMap[p]+"";
                                                        if (outputMap[p] !== "-1") {
                                                            outputCount++;
                                                            if (outputMap[p] !== p) {
                                                                // Output moved
                                                                outputsChanged = true;
                                                            } else {
                                                                delete outputMap[p];
                                                            }
                                                        } else {
                                                            // Output removed
                                                            outputsChanged = true;
                                                        }
                                                    }
                                                });

                                                newValue = outputCount;
                                                if (outputsChanged) {
                                                    changed = true;
                                                }
                                            }
                                        }
                                        if (editing_node[d] != newValue) {
                                            if (editing_node._def.defaults[d].type) {
                                                if (newValue == "_ADD_") {
                                                    newValue = "";
                                                }
                                                // Change to a related config node
                                                var configNode = RED.nodes.node(editing_node[d]);
                                                if (configNode) {
                                                    var users = configNode.users;
                                                    users.splice(users.indexOf(editing_node),1);
                                                }
                                                configNode = RED.nodes.node(newValue);
                                                if (configNode) {
                                                    configNode.users.push(editing_node);
                                                }
                                            }
                                            changes[d] = editing_node[d];
                                            editing_node[d] = newValue;
                                            changed = true;
                                        }
                                    }
                                }
                            }
                        }
                        if (editing_node._def.credentials) {
                            var prefix = 'node-input';
                            var credDefinition = editing_node._def.credentials;
                            var credsChanged = updateNodeCredentials(editing_node,credDefinition,prefix);
                            changed = changed || credsChanged;
                        }
                        // if (editing_node.hasOwnProperty("_outputs")) {
                        //     outputMap = editing_node._outputs;
                        //     delete editing_node._outputs;
                        //     if (Object.keys(outputMap).length > 0) {
                        //         changed = true;
                        //     }
                        // }
                        var removedLinks = updateNodeProperties(editing_node,outputMap);

                        var inputLabels = $("#node-label-form-inputs").children().find("input");
                        var outputLabels = $("#node-label-form-outputs").children().find("input");

                        var hasNonBlankLabel = false;
                        newValue = inputLabels.map(function() {
                            var v = $(this).val();
                            hasNonBlankLabel = hasNonBlankLabel || v!== "";
                            return v;
                        }).toArray().slice(0,editing_node.inputs);
                        if ((editing_node.inputLabels === undefined && hasNonBlankLabel) ||
                            (editing_node.inputLabels !== undefined && JSON.stringify(newValue) !== JSON.stringify(editing_node.inputLabels))) {
                            changes.inputLabels = editing_node.inputLabels;
                            editing_node.inputLabels = newValue;
                            changed = true;
                        }
                        hasNonBlankLabel = false;
                        newValue = new Array(editing_node.outputs);
                        outputLabels.each(function() {
                            var index = $(this).attr('id').substring(23); // node-label-form-output-<index>
                            if (outputMap && outputMap.hasOwnProperty(index)) {
                                index = parseInt(outputMap[index]);
                                if (index === -1) {
                                    return;
                                }
                            }
                            var v = $(this).val();
                            hasNonBlankLabel = hasNonBlankLabel || v!== "";
                            newValue[index] = v;
                        })

                        if ((editing_node.outputLabels === undefined && hasNonBlankLabel) ||
                            (editing_node.outputLabels !== undefined && JSON.stringify(newValue) !== JSON.stringify(editing_node.outputLabels))) {
                            changes.outputLabels = editing_node.outputLabels;
                            editing_node.outputLabels = newValue;
                            changed = true;
                        }

                        if (changed) {
                            var wasChanged = editing_node.changed;
                            editing_node.changed = true;
                            RED.nodes.dirty(true);

                            var activeSubflow = RED.nodes.subflow(RED.workspaces.active());
                            var subflowInstances = null;
                            if (activeSubflow) {
                                subflowInstances = [];
                                RED.nodes.eachNode(function(n) {
                                    if (n.type == "subflow:"+RED.workspaces.active()) {
                                        subflowInstances.push({
                                            id:n.id,
                                            changed:n.changed
                                        });
                                        n.changed = true;
                                        n.dirty = true;
                                        updateNodeProperties(n);
                                    }
                                });
                            }
                            var historyEvent = {
                                t:'edit',
                                node:editing_node,
                                changes:changes,
                                links:removedLinks,
                                dirty:wasDirty,
                                changed:wasChanged
                            };
                            if (outputMap) {
                                historyEvent.outputMap = outputMap;
                            }
                            if (subflowInstances) {
                                historyEvent.subflow = {
                                    instances:subflowInstances
                                }
                            }
                            RED.history.push(historyEvent);
                        }
                        editing_node.dirty = true;
                        validateNode(editing_node);
                        RED.events.emit("editor:save",editing_node);
                        RED.tray.close();
                    }
                }
            ],
            resize: function(dimensions) {
                editTrayWidthCache[type] = dimensions.width;
                $(".editor-tray-content").height(dimensions.height - 78);
                var form = $(".editor-tray-content form").height(dimensions.height - 78 - 40);
                if (editing_node && editing_node._def.oneditresize) {
                    try {
                        editing_node._def.oneditresize.call(editing_node,{width:form.width(),height:form.height()});
                    } catch(err) {
                        console.log("oneditresize",editing_node.id,editing_node.type,err.toString());
                    }
                }
            },
            open: function(tray, done) {
                var trayFooter = tray.find(".editor-tray-footer");
                var trayBody = tray.find('.editor-tray-body');
                trayBody.parent().css('overflow','hidden');

                var stack = RED.stack.create({
                    container: trayBody,
                    singleExpanded: true
                });
                var nodeProperties = stack.add({
                    title: RED._("editor.nodeProperties"),
                    expanded: true
                });
                nodeProperties.content.addClass("editor-tray-content");

                /*var portLabels = stack.add({
                    title: RED._("editor.portLabels"),
                    onexpand: function() {
                        refreshLabelForm(this.content,node);
                    }
                });
                portLabels.content.addClass("editor-tray-content");*/


                if (editing_node) {
                    RED.sidebar.info.refresh(editing_node);
                }
                var ns;
                if (node._def.set.module === "node-red") {
                    ns = "node-red";
                } else {
                    ns = node._def.set.id;
                }
                buildEditForm(nodeProperties.content,"dialog-form",type,ns);
                //buildLabelForm(portLabels.content,node);

                prepareEditDialog(node,node._def,"node-input", function() {
                    trayBody.i18n();
                    done();
                });
            },
            close: function() {
                if (RED.view.state() != RED.state.IMPORT_DRAGGING) {
                    RED.view.state(RED.state.DEFAULT);
                }
                if (editing_node) {
                    RED.sidebar.info.refresh(editing_node);
                }
                RED.workspaces.refresh();
                RED.view.redraw(true);
                editStack.pop();
            },
            show: function() {
                if (editing_node) {
                    RED.sidebar.info.refresh(editing_node);
                }
            }
        }
        if (editTrayWidthCache.hasOwnProperty(type)) {
            trayOptions.width = editTrayWidthCache[type];
        }

        if (type === 'subflow') {
            var id = editing_node.type.substring(8);
            trayOptions.buttons.unshift({
                class: 'leftButton',
                text: RED._("subflow.edit"),
                click: function() {
                    RED.workspaces.show(id);
                    $("#node-dialog-ok").click();
                }
            });
        }

        RED.tray.show(trayOptions);
    }
    /**
     * name - name of the property that holds this config node
     * type - type of config node
     * id - id of config node to edit. _ADD_ for a new one
     * prefix - the input prefix of the parent property
     */
    function showEditConfigNodeDialog(name,type,id,prefix) {
        var adding = (id == "_ADD_");
        var node_def = RED.nodes.getType(type);
        var editing_config_node = RED.nodes.node(id);

        var ns;
        if (node_def.set.module === "node-red") {
            ns = "node-red";
        } else {
            ns = node_def.set.id;
        }
        var configNodeScope = ""; // default to global
        var activeSubflow = RED.nodes.subflow(RED.workspaces.active());
        if (activeSubflow) {
            configNodeScope = activeSubflow.id;
        }
        if (editing_config_node == null) {
            editing_config_node = {
                id: RED.nodes.id(),
                _def: node_def,
                type: type,
                z: configNodeScope,
                users: []
            }
            for (var d in node_def.defaults) {
                if (node_def.defaults[d].value) {
                    editing_config_node[d] = JSON.parse(JSON.stringify(node_def.defaults[d].value));
                }
            }
            editing_config_node["_"] = node_def._;
        }
        editStack.push(editing_config_node);

        RED.view.state(RED.state.EDITING);
        var trayOptions = {
            title: getEditStackTitle(), //(adding?RED._("editor.addNewConfig", {type:type}):RED._("editor.editConfig", {type:type})),
            resize: function() {
                if (editing_config_node && editing_config_node._def.oneditresize) {
                    var form = $("#node-config-dialog-edit-form");
                    try {
                        editing_config_node._def.oneditresize.call(editing_config_node,{width:form.width(),height:form.height()});
                    } catch(err) {
                        console.log("oneditresize",editing_config_node.id,editing_config_node.type,err.toString());
                    }
                }
            },
            open: function(tray, done) {
                var trayHeader = tray.find(".editor-tray-header");
                var trayFooter = tray.find(".editor-tray-footer");

                if (node_def.hasUsers !== false) {
                    trayFooter.prepend('<div id="node-config-dialog-user-count"><i class="fa fa-info-circle"></i> <span></span></div>');
                }
                trayFooter.append('<span id="node-config-dialog-scope-container"><span id="node-config-dialog-scope-warning" data-i18n="[title]editor.errors.scopeChange"><i class="fa fa-warning"></i></span><select id="node-config-dialog-scope"></select></span>');

                var dialogForm = buildEditForm(tray.find('.editor-tray-body'),"node-config-dialog-edit-form",type,ns);

                prepareEditDialog(editing_config_node,node_def,"node-config-input", function() {
                    if (editing_config_node._def.exclusive) {
                        $("#node-config-dialog-scope").hide();
                    } else {
                        $("#node-config-dialog-scope").show();
                    }
                    $("#node-config-dialog-scope-warning").hide();

                    var nodeUserFlows = {};
                    editing_config_node.users.forEach(function(n) {
                        nodeUserFlows[n.z] = true;
                    });
                    var flowCount = Object.keys(nodeUserFlows).length;
                    var tabSelect = $("#node-config-dialog-scope").empty();
                    tabSelect.off("change");
                    tabSelect.append('<option value=""'+(!editing_config_node.z?" selected":"")+' data-i18n="sidebar.config.global"></option>');
                    tabSelect.append('<option disabled data-i18n="sidebar.config.flows"></option>');
                    RED.nodes.eachWorkspace(function(ws) {
                        var workspaceLabel = ws.label;
                        if (nodeUserFlows[ws.id]) {
                            workspaceLabel = "* "+workspaceLabel;
                        }
                        tabSelect.append('<option value="'+ws.id+'"'+(ws.id==editing_config_node.z?" selected":"")+'>'+workspaceLabel+'</option>');
                    });
                    tabSelect.append('<option disabled data-i18n="sidebar.config.subflows"></option>');
                    RED.nodes.eachSubflow(function(ws) {
                        var workspaceLabel = ws.name;
                        if (nodeUserFlows[ws.id]) {
                            workspaceLabel = "* "+workspaceLabel;
                        }
                        tabSelect.append('<option value="'+ws.id+'"'+(ws.id==editing_config_node.z?" selected":"")+'>'+workspaceLabel+'</option>');
                    });
                    if (flowCount > 0) {
                        tabSelect.on('change',function() {
                            var newScope = $(this).val();
                            if (newScope === '') {
                                // global scope - everyone can use it
                                $("#node-config-dialog-scope-warning").hide();
                            } else if (!nodeUserFlows[newScope] || flowCount > 1) {
                                // a user will loose access to it
                                $("#node-config-dialog-scope-warning").show();
                            } else {
                                $("#node-config-dialog-scope-warning").hide();
                            }
                        });
                    }
                    tabSelect.i18n();

                    dialogForm.i18n();
                    if (node_def.hasUsers !== false) {
                        $("#node-config-dialog-user-count").find("span").html(RED._("editor.nodesUse", {count:editing_config_node.users.length})).parent().show();
                    }
                    done();
                });
            },
            close: function() {
                RED.workspaces.refresh();
                editStack.pop();
            },
            show: function() {
                if (editing_config_node) {
                    RED.sidebar.info.refresh(editing_config_node);
                }
            }
        }
        trayOptions.buttons = [
            {
                id: "node-config-dialog-cancel",
                text: RED._("common.label.cancel"),
                click: function() {
                    var configType = type;
                    var configId = editing_config_node.id;
                    var configAdding = adding;
                    var configTypeDef = RED.nodes.getType(configType);

                    if (configTypeDef.oneditcancel) {
                        // TODO: what to pass as this to call
                        if (configTypeDef.oneditcancel) {
                            var cn = RED.nodes.node(configId);
                            if (cn) {
                                try {
                                    configTypeDef.oneditcancel.call(cn,false);
                                } catch(err) {
                                    console.log("oneditcancel",cn.id,cn.type,err.toString());
                                }
                            } else {
                                try {
                                    configTypeDef.oneditcancel.call({id:configId},true);
                                } catch(err) {
                                    console.log("oneditcancel",configId,configType,err.toString());
                                }
                            }
                        }
                    }
                    RED.tray.close();
                }
            },
            {
                id: "node-config-dialog-ok",
                text: adding?RED._("editor.configAdd"):RED._("editor.configUpdate"),
                class: "primary",
                click: function() {
                    var configProperty = name;
                    var configId = editing_config_node.id;
                    var configType = type;
                    var configAdding = adding;
                    var configTypeDef = RED.nodes.getType(configType);
                    var d;
                    var input;
                    var scope = $("#node-config-dialog-scope").val();

                    if (configTypeDef.oneditsave) {
                        try {
                            configTypeDef.oneditsave.call(editing_config_node);
                        } catch(err) {
                            console.log("oneditsave",editing_config_node.id,editing_config_node.type,err.toString());
                        }
                    }

                    for (d in configTypeDef.defaults) {
                        if (configTypeDef.defaults.hasOwnProperty(d)) {
                            var newValue;
                            input = $("#node-config-input-"+d);
                            if (input.attr('type') === "checkbox") {
                                newValue = input.prop('checked');
                            } else if ("format" in configTypeDef.defaults[d] && configTypeDef.defaults[d].format !== "" && input[0].nodeName === "DIV") {
                                newValue = input.text();
                            } else {
                                newValue = input.val();
                            }
                            if (newValue != null && newValue !== editing_config_node[d]) {
                                if (editing_config_node._def.defaults[d].type) {
                                    if (newValue == "_ADD_") {
                                        newValue = "";
                                    }
                                    // Change to a related config node
                                    var configNode = RED.nodes.node(editing_config_node[d]);
                                    if (configNode) {
                                        var users = configNode.users;
                                        users.splice(users.indexOf(editing_config_node),1);
                                    }
                                    configNode = RED.nodes.node(newValue);
                                    if (configNode) {
                                        configNode.users.push(editing_config_node);
                                    }
                                }
                                editing_config_node[d] = newValue;
                            }
                        }
                    }
                    editing_config_node.label = configTypeDef.label;
                    editing_config_node.z = scope;

                    if (scope) {
                        // Search for nodes that use this one that are no longer
                        // in scope, so must be removed
                        editing_config_node.users = editing_config_node.users.filter(function(n) {
                            var keep = true;
                            for (var d in n._def.defaults) {
                                if (n._def.defaults.hasOwnProperty(d)) {
                                    if (n._def.defaults[d].type === editing_config_node.type &&
                                        n[d] === editing_config_node.id &&
                                        n.z !== scope) {
                                            keep = false;
                                            // Remove the reference to this node
                                            // and revalidate
                                            n[d] = null;
                                            n.dirty = true;
                                            n.changed = true;
                                            validateNode(n);
                                    }
                                }
                            }
                            return keep;
                        });
                    }

                    if (configAdding) {
                        RED.nodes.add(editing_config_node);
                    }

                    if (configTypeDef.credentials) {
                        updateNodeCredentials(editing_config_node,configTypeDef.credentials,"node-config-input");
                    }
                    validateNode(editing_config_node);
                    var validatedNodes = {};
                    validatedNodes[editing_config_node.id] = true;

                    var userStack = editing_config_node.users.slice();
                    while(userStack.length > 0) {
                        var user = userStack.pop();
                        if (!validatedNodes[user.id]) {
                            validatedNodes[user.id] = true;
                            if (user.users) {
                                userStack = userStack.concat(user.users);
                            }
                            validateNode(user);
                        }
                    }
                    RED.nodes.dirty(true);
                    RED.view.redraw(true);
                    if (!configAdding) {
                        RED.events.emit("editor:save",editing_config_node);
                    }
                    RED.tray.close(function() {
                        updateConfigNodeSelect(configProperty,configType,editing_config_node.id,prefix);
                    });
                }
            }
        ];

        if (!adding) {
            trayOptions.buttons.unshift({
                class: 'leftButton',
                text: RED._("editor.configDelete"), //'<i class="fa fa-trash"></i>',
                click: function() {
                    var configProperty = name;
                    var configId = editing_config_node.id;
                    var configType = type;
                    var configTypeDef = RED.nodes.getType(configType);

                    try {

                        if (configTypeDef.ondelete) {
                            // Deprecated: never documented but used by some early nodes
                            console.log("Deprecated API warning: config node type ",configType," has an ondelete function - should be oneditdelete");
                            configTypeDef.ondelete.call(editing_config_node);
                        }
                        if (configTypeDef.oneditdelete) {
                            configTypeDef.oneditdelete.call(editing_config_node);
                        }
                    } catch(err) {
                        console.log("oneditdelete",editing_config_node.id,editing_config_node.type,err.toString());
                    }

                    var historyEvent = {
                        t:'delete',
                        nodes:[editing_config_node],
                        changes: {},
                        dirty: RED.nodes.dirty()
                    }
                    for (var i=0;i<editing_config_node.users.length;i++) {
                        var user = editing_config_node.users[i];
                        historyEvent.changes[user.id] = {
                            changed: user.changed,
                            valid: user.valid
                        };
                        for (var d in user._def.defaults) {
                            if (user._def.defaults.hasOwnProperty(d) && user[d] == configId) {
                                historyEvent.changes[user.id][d] = configId
                                user[d] = "";
                                user.changed = true;
                                user.dirty = true;
                            }
                        }
                        validateNode(user);
                    }
                    RED.nodes.remove(configId);
                    RED.nodes.dirty(true);
                    RED.view.redraw(true);
                    RED.history.push(historyEvent);
                    RED.tray.close(function() {
                        updateConfigNodeSelect(configProperty,configType,"",prefix);
                    });
                }
            });
        }

        RED.tray.show(trayOptions);
    }

    function defaultConfigNodeSort(A,B) {
        if (A.__label__ < B.__label__) {
            return -1;
        } else if (A.__label__ > B.__label__) {
            return 1;
        }
        return 0;
    }

    function updateConfigNodeSelect(name,type,value,prefix) {
        // if prefix is null, there is no config select to update
        if (prefix) {
            var button = $("#"+prefix+"-edit-"+name);
            if (button.length) {
                if (value) {
                    button.text(RED._("editor.configEdit"));
                } else {
                    button.text(RED._("editor.configAdd"));
                }
                $("#"+prefix+"-"+name).val(value);
            } else {

                var select = $("#"+prefix+"-"+name);
                var node_def = RED.nodes.getType(type);
                select.children().remove();

                var activeWorkspace = RED.nodes.workspace(RED.workspaces.active());
                if (!activeWorkspace) {
                    activeWorkspace = RED.nodes.subflow(RED.workspaces.active());
                }

                var configNodes = [];

                RED.nodes.eachConfig(function(config) {
                    if (config.type == type && (!config.z || config.z === activeWorkspace.id)) {
                        var label = RED.utils.getNodeLabel(config,config.id);
                        config.__label__ = label;
                        configNodes.push(config);
                    }
                });
                var configSortFn = defaultConfigNodeSort;
                if (typeof node_def.sort == "function") {
                    configSortFn = node_def.sort;
                }
                try {
                    configNodes.sort(configSortFn);
                } catch(err) {
                    console.log("Definition error: "+node_def.type+".sort",err);
                }

                configNodes.forEach(function(cn) {
                    select.append('<option value="'+cn.id+'"'+(value==cn.id?" selected":"")+'>'+RED.text.bidi.enforceTextDirectionWithUCC(cn.__label__)+'</option>');
                    delete cn.__label__;
                });

                select.append('<option value="_ADD_"'+(value===""?" selected":"")+'>'+RED._("editor.addNewType", {type:type})+'</option>');
                window.setTimeout(function() { select.change();},50);
            }
        }
    }

    function showEditSubflowDialog(subflow) {
        var editing_node = subflow;
        editStack.push(subflow);
        RED.view.state(RED.state.EDITING);
        var subflowEditor;

        var trayOptions = {
            title: getEditStackTitle(),
            buttons: [
                {
                    id: "node-dialog-cancel",
                    text: RED._("common.label.cancel"),
                    click: function() {
                        RED.tray.close();
                    }
                },
                {
                    id: "node-dialog-ok",
                    class: "primary",
                    text: RED._("common.label.done"),
                    click: function() {
                        var i;
                        var changes = {};
                        var changed = false;
                        var wasDirty = RED.nodes.dirty();

                        var newName = $("#subflow-input-name").val();

                        if (newName != editing_node.name) {
                            changes['name'] = editing_node.name;
                            editing_node.name = newName;
                            changed = true;
                        }

                        var newDescription = subflowEditor.getValue();

                        if (newDescription != editing_node.info) {
                            changes['info'] = editing_node.info;
                            editing_node.info = newDescription;
                            changed = true;
                        }
                        var inputLabels = $("#node-label-form-inputs").children().find("input");
                        var outputLabels = $("#node-label-form-outputs").children().find("input");

                        var newValue = inputLabels.map(function() { return $(this).val();}).toArray().slice(0,editing_node.inputs);
                        if (JSON.stringify(newValue) !== JSON.stringify(editing_node.inputLabels)) {
                            changes.inputLabels = editing_node.inputLabels;
                            editing_node.inputLabels = newValue;
                            changed = true;
                        }
                        newValue = outputLabels.map(function() { return $(this).val();}).toArray().slice(0,editing_node.outputs);
                        if (JSON.stringify(newValue) !== JSON.stringify(editing_node.outputLabels)) {
                            changes.outputLabels = editing_node.outputLabels;
                            editing_node.outputLabels = newValue;
                            changed = true;
                        }

                        RED.palette.refresh();

                        if (changed) {
                            var subflowInstances = [];
                            RED.nodes.eachNode(function(n) {
                                if (n.type == "subflow:"+editing_node.id) {
                                    subflowInstances.push({
                                        id:n.id,
                                        changed:n.changed
                                    })
                                    n.changed = true;
                                    n.dirty = true;
                                    updateNodeProperties(n);
                                }
                            });
                            var wasChanged = editing_node.changed;
                            editing_node.changed = true;
                            RED.nodes.dirty(true);
                            var historyEvent = {
                                t:'edit',
                                node:editing_node,
                                changes:changes,
                                dirty:wasDirty,
                                changed:wasChanged,
                                subflow: {
                                    instances:subflowInstances
                                }
                            };

                            RED.history.push(historyEvent);
                        }
                        editing_node.dirty = true;
                        RED.tray.close();
                    }
                }
            ],
            resize: function(dimensions) {
                $(".editor-tray-content").height(dimensions.height - 78);
                var form = $(".editor-tray-content form").height(dimensions.height - 78 - 40);

                var rows = $("#dialog-form>div:not(.node-text-editor-row)");
                var editorRow = $("#dialog-form>div.node-text-editor-row");
                var height = $("#dialog-form").height();
                for (var i=0;i<rows.size();i++) {
                    height -= $(rows[i]).outerHeight(true);
                }
                height -= (parseInt($("#dialog-form").css("marginTop"))+parseInt($("#dialog-form").css("marginBottom")));
                $(".node-text-editor").css("height",height+"px");
                subflowEditor.resize();
            },
            open: function(tray) {
                var trayFooter = tray.find(".editor-tray-footer");
                var trayBody = tray.find('.editor-tray-body');
                trayBody.parent().css('overflow','hidden');

                var stack = RED.stack.create({
                    container: trayBody,
                    singleExpanded: true
                });
                var nodeProperties = stack.add({
                    title: RED._("editor.nodeProperties"),
                    expanded: true
                });
                nodeProperties.content.addClass("editor-tray-content");
                /*var portLabels = stack.add({
                    title: RED._("editor.portLabels")
                });
                portLabels.content.addClass("editor-tray-content");*/



                if (editing_node) {
                    RED.sidebar.info.refresh(editing_node);
                }
                var dialogForm = buildEditForm(nodeProperties.content,"dialog-form","subflow-template");
                subflowEditor = RED.editor.createEditor({
                    id: 'subflow-input-info-editor',
                    mode: 'ace/mode/markdown',
                    value: ""
                });

                $("#subflow-input-name").val(subflow.name);
                RED.text.bidi.prepareInput($("#subflow-input-name"));
                subflowEditor.getSession().setValue(subflow.info||"",-1);
                var userCount = 0;
                var subflowType = "subflow:"+editing_node.id;

                RED.nodes.eachNode(function(n) {
                    if (n.type === subflowType) {
                        userCount++;
                    }
                });
                $("#subflow-dialog-user-count").html(RED._("subflow.subflowInstances", {count:userCount})).show();

                //buildLabelForm(portLabels.content,subflow);
                trayBody.i18n();
            },
            close: function() {
                if (RED.view.state() != RED.state.IMPORT_DRAGGING) {
                    RED.view.state(RED.state.DEFAULT);
                }
                RED.sidebar.info.refresh(editing_node);
                RED.workspaces.refresh();
                editStack.pop();
                editing_node = null;
            },
            show: function() {
            }
        }
        RED.tray.show(trayOptions);
    }


    var expressionTestCache = {};

    function editExpression(options) {
        var expressionTestCacheId = "_";
        if (editStack.length > 0) {
            expressionTestCacheId = editStack[editStack.length-1].id;
        }

        var value = options.value;
        var onComplete = options.complete;
        var type = "_expression"
        editStack.push({type:type});
        RED.view.state(RED.state.EDITING);
        var expressionEditor;
        var testDataEditor;
        var testResultEditor
        var panels;

        var trayOptions = {
            title: getEditStackTitle(),
            buttons: [
                {
                    id: "node-dialog-cancel",
                    text: RED._("common.label.cancel"),
                    click: function() {
                        RED.tray.close();
                    }
                },
                {
                    id: "node-dialog-ok",
                    text: RED._("common.label.done"),
                    class: "primary",
                    click: function() {
                        $("#node-input-expression-help").html("");
                        onComplete(expressionEditor.getValue());
                        RED.tray.close();
                    }
                }
            ],
            resize: function(dimensions) {
                if (dimensions) {
                    editTrayWidthCache[type] = dimensions.width;
                }
                var height = $("#dialog-form").height();
                if (panels) {
                    panels.resize(height);
                }

            },
            open: function(tray) {
                var trayBody = tray.find('.editor-tray-body');
                trayBody.addClass("node-input-expression-editor")
                var dialogForm = buildEditForm(tray.find('.editor-tray-body'),'dialog-form','_expression','editor');
                var funcSelect = $("#node-input-expression-func");
                Object.keys(jsonata.functions).forEach(function(f) {
                    funcSelect.append($("<option></option>").val(f).text(f));
                })
                funcSelect.change(function(e) {
                    var f = $(this).val();
                    var args = RED._('jsonata:'+f+".args",{defaultValue:''});
                    var title = "<h5>"+f+"("+args+")</h5>";
                    var body = marked(RED._('jsonata:'+f+'.desc',{defaultValue:''}));
                    $("#node-input-expression-help").html(title+"<p>"+body+"</p>");

                })
                expressionEditor = RED.editor.createEditor({
                    id: 'node-input-expression',
                    value: "",
                    mode:"ace/mode/jsonata",
                    options: {
                        enableBasicAutocompletion:true,
                        enableSnippets:true,
                        enableLiveAutocompletion: true
                    }
                });
                var currentToken = null;
                var currentTokenPos = -1;
                var currentFunctionMarker = null;

                expressionEditor.getSession().setValue(value||"",-1);
                expressionEditor.on("changeSelection", function() {
                    var c = expressionEditor.getCursorPosition();
                    var token = expressionEditor.getSession().getTokenAt(c.row,c.column);
                    if (token !== currentToken || (token && /paren/.test(token.type) && c.column !== currentTokenPos)) {
                        currentToken = token;
                        var r,p;
                        var scopedFunction = null;
                        if (token && token.type === 'keyword') {
                            r = c.row;
                            scopedFunction = token;
                        } else {
                            var depth = 0;
                            var next = false;
                            if (token) {
                                if (token.type === 'paren.rparen') {
                                    // If this is a block of parens ')))', set
                                    // depth to offset against the cursor position
                                    // within the block
                                    currentTokenPos = c.column;
                                    depth = c.column - (token.start + token.value.length);
                                }
                                r = c.row;
                                p = token.index;
                            } else {
                                r = c.row-1;
                                p = -1;
                            }
                            while ( scopedFunction === null && r > -1) {
                                var rowTokens = expressionEditor.getSession().getTokens(r);
                                if (p === -1) {
                                    p = rowTokens.length-1;
                                }
                                while (p > -1) {
                                    var type = rowTokens[p].type;
                                    if (next) {
                                        if (type === 'keyword') {
                                            scopedFunction = rowTokens[p];
                                            // console.log("HIT",scopedFunction);
                                            break;
                                        }
                                        next = false;
                                    }
                                    if (type === 'paren.lparen') {
                                        depth-=rowTokens[p].value.length;
                                    } else if (type === 'paren.rparen') {
                                        depth+=rowTokens[p].value.length;
                                    }
                                    if (depth < 0) {
                                        next = true;
                                        depth = 0;
                                    }
                                    // console.log(r,p,depth,next,rowTokens[p]);
                                    p--;
                                }
                                if (!scopedFunction) {
                                    r--;
                                }
                            }
                        }
                        expressionEditor.session.removeMarker(currentFunctionMarker);
                        if (scopedFunction) {
                        //console.log(token,.map(function(t) { return t.type}));
                            funcSelect.val(scopedFunction.value).change();
                        }
                    }
                });

                dialogForm.i18n();
                $("#node-input-expression-func-insert").click(function(e) {
                    e.preventDefault();
                    var pos = expressionEditor.getCursorPosition();
                    var f = funcSelect.val();
                    var snippet = jsonata.getFunctionSnippet(f);
                    expressionEditor.insertSnippet(snippet);
                    expressionEditor.focus();
                });
                $("#node-input-expression-reformat").click(function(evt) {
                    evt.preventDefault();
                    var v = expressionEditor.getValue()||"";
                    try {
                        v = jsonata.format(v);
                    } catch(err) {
                        // TODO: do an optimistic auto-format
                    }
                    expressionEditor.getSession().setValue(v||"",-1);
                });

                var tabs = RED.tabs.create({
                    element: $("#node-input-expression-tabs"),
                    onchange:function(tab) {
                        $(".node-input-expression-tab-content").hide();
                        tab.content.show();
                        trayOptions.resize();
                    }
                })

                tabs.addTab({
                    id: 'expression-help',
                    label: 'Function reference',
                    content: $("#node-input-expression-tab-help")
                });
                tabs.addTab({
                    id: 'expression-tests',
                    label: 'Test',
                    content: $("#node-input-expression-tab-test")
                });
                testDataEditor = RED.editor.createEditor({
                    id: 'node-input-expression-test-data',
                    value: expressionTestCache[expressionTestCacheId] || '{\n    "payload": "hello world"\n}',
                    mode:"ace/mode/json",
                    lineNumbers: false
                });
                var changeTimer;
                $(".node-input-expression-legacy").click(function(e) {
                    e.preventDefault();
                    RED.sidebar.info.set(RED._("expressionEditor.compatModeDesc"));
                    RED.sidebar.info.show();
                })
                var testExpression = function() {
                    var value = testDataEditor.getValue();
                    var parsedData;
                    var currentExpression = expressionEditor.getValue();
                    var expr;
                    var usesContext = false;
                    var legacyMode = false;
                    try {
                        expr = jsonata(currentExpression);
                        expr.assign('flowContext',function(val) {
                            usesContext = true;
                            return null;
                        });
                        expr.assign('globalContext',function(val) {
                            usesContext = true;
                            return null;
                        });
                        legacyMode = /(^|[^a-zA-Z0-9_'"])msg([^a-zA-Z0-9_'"]|$)/.test(currentExpression);
                    } catch(err) {
                        testResultEditor.setValue(RED._("expressionEditor.errors.invalid-expr",{message:err.message}));
                        return;
                    }
                    $(".node-input-expression-legacy").toggle(legacyMode);
                    try {
                        parsedData = JSON.parse(value);
                    } catch(err) {
                        testResultEditor.setValue(RED._("expressionEditor.errors.invalid-msg",{message:err.toString()}))
                        return;
                    }

                    try {
                        var result = expr.evaluate(legacyMode?{msg:parsedData}:parsedData);
                        if (usesContext) {
                            testResultEditor.setValue(RED._("expressionEditor.errors.context-unsupported"));
                            return;
                        }

                        var formattedResult;
                        if (result !== undefined) {
                            formattedResult = JSON.stringify(result,null,4);
                        } else {
                            formattedResult = RED._("expressionEditor.noMatch");
                        }
                        testResultEditor.setValue(formattedResult);
                    } catch(err) {
                        testResultEditor.setValue(RED._("expressionEditor.errors.eval",{message:err.message}));
                    }
                }

                testDataEditor.getSession().on('change', function() {
                    clearTimeout(changeTimer);
                    changeTimer = setTimeout(testExpression,200);
                    expressionTestCache[expressionTestCacheId] = testDataEditor.getValue();
                });
                expressionEditor.getSession().on('change', function() {
                    clearTimeout(changeTimer);
                    changeTimer = setTimeout(testExpression,200);
                });

                testResultEditor = RED.editor.createEditor({
                    id: 'node-input-expression-test-result',
                    value: "",
                    mode:"ace/mode/json",
                    lineNumbers: false,
                    readOnly: true
                });
                panels = RED.panels.create({
                    id:"node-input-expression-panels",
                    resize: function(p1Height,p2Height) {
                        var p1 = $("#node-input-expression-panel-expr");
                        p1Height -= $(p1.children()[0]).outerHeight(true);
                        var editorRow = $(p1.children()[1]);
                        p1Height -= (parseInt(editorRow.css("marginTop"))+parseInt(editorRow.css("marginBottom")));
                        $("#node-input-expression").css("height",(p1Height-5)+"px");
                        expressionEditor.resize();

                        var p2 = $("#node-input-expression-panel-info > .form-row > div:first-child");
                        p2Height -= p2.outerHeight(true) + 20;
                        $(".node-input-expression-tab-content").height(p2Height);
                        $("#node-input-expression-test-data").css("height",(p2Height-5)+"px");
                        testDataEditor.resize();
                        $("#node-input-expression-test-result").css("height",(p2Height-5)+"px");
                        testResultEditor.resize();
                    }
                });

                testExpression();
            },
            close: function() {
                editStack.pop();
            },
            show: function() {}
        }
        if (editTrayWidthCache.hasOwnProperty(type)) {
            trayOptions.width = editTrayWidthCache[type];
        }
        RED.tray.show(trayOptions);
    }


    function editJSON(options) {
        var value = options.value;
        var onComplete = options.complete;
        var type = "_json"
        editStack.push({type:type});
        RED.view.state(RED.state.EDITING);
        var expressionEditor;

        var trayOptions = {
            title: getEditStackTitle(),
            buttons: [
                {
                    id: "node-dialog-cancel",
                    text: RED._("common.label.cancel"),
                    click: function() {
                        RED.tray.close();
                    }
                },
                {
                    id: "node-dialog-ok",
                    text: RED._("common.label.done"),
                    class: "primary",
                    click: function() {
                        onComplete(expressionEditor.getValue());
                        RED.tray.close();
                    }
                }
            ],
            resize: function(dimensions) {
                editTrayWidthCache[type] = dimensions.width;

                var rows = $("#dialog-form>div:not(.node-text-editor-row)");
                var editorRow = $("#dialog-form>div.node-text-editor-row");
                var height = $("#dialog-form").height();
                for (var i=0;i<rows.size();i++) {
                    height -= $(rows[i]).outerHeight(true);
                }
                height -= (parseInt($("#dialog-form").css("marginTop"))+parseInt($("#dialog-form").css("marginBottom")));
                $(".node-text-editor").css("height",height+"px");
                expressionEditor.resize();
            },
            open: function(tray) {
                var trayBody = tray.find('.editor-tray-body');
                var dialogForm = buildEditForm(tray.find('.editor-tray-body'),'dialog-form',type,'editor');
                expressionEditor = RED.editor.createEditor({
                    id: 'node-input-json',
                    value: "",
                    mode:"ace/mode/json"
                });
                expressionEditor.getSession().setValue(value||"",-1);
                $("#node-input-expression-reformat").click(function(evt) {
                    evt.preventDefault();
                    var v = expressionEditor.getValue()||"";
                    try {
                        v = JSON.stringify(JSON.parse(v),null,4);
                    } catch(err) {
                        // TODO: do an optimistic auto-format
                    }
                    expressionEditor.getSession().setValue(v||"",-1);
                });
                dialogForm.i18n();
            },
            close: function() {
                editStack.pop();
            },
            show: function() {}
        }
        if (editTrayWidthCache.hasOwnProperty(type)) {
            trayOptions.width = editTrayWidthCache[type];
        }
        RED.tray.show(trayOptions);
    }

    return {
        init: function() {
            RED.tray.init();
            RED.actions.add("core:confirm-edit-tray", function() {
                $("#node-dialog-ok").click();
                $("#node-config-dialog-ok").click();
            });
            RED.actions.add("core:cancel-edit-tray", function() {
                $("#node-dialog-cancel").click();
                $("#node-config-dialog-cancel").click();
            });
        },
        edit: showEditDialog,
        editConfig: showEditConfigNodeDialog,
        editSubflow: showEditSubflowDialog,
        editExpression: editExpression,
        editJSON: editJSON,
        validateNode: validateNode,
        updateNodeProperties: updateNodeProperties, // TODO: only exposed for edit-undo


        createEditor: function(options) {
            var editor = ace.edit(options.id);
            editor.setTheme("ace/theme/tomorrow");
            var session = editor.getSession();
            if (options.mode) {
                session.setMode(options.mode);
            }
            if (options.foldStyle) {
                session.setFoldStyle(options.foldStyle);
            } else {
                session.setFoldStyle('markbeginend');
            }
            if (options.options) {
                editor.setOptions(options.options);
            } else {
                editor.setOptions({
                    enableBasicAutocompletion:true,
                    enableSnippets:true
                });
            }
            if (options.readOnly) {
                editor.setOption('readOnly',options.readOnly);
            }
            if (options.hasOwnProperty('lineNumbers')) {
                editor.renderer.setOption('showGutter',options.lineNumbers);
            }
            editor.$blockScrolling = Infinity;
            if (options.value) {
                session.setValue(options.value,-1);
            }
            if (options.globals) {
                setTimeout(function() {
                    if (!!session.$worker) {
                        session.$worker.send("setOptions", [{globals: options.globals, esversion:6}]);
                    }
                },100);
            }
            return editor;
        }
    }
})();
;/**
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
            tray.body.height(trayHeight);
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
                tray.options.resize({width:tray.width, height:trayHeight});
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
;/**
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


RED.clipboard = (function() {

    var dialog;
    var dialogContainer;
    var exportNodesDialog;
    var importNodesDialog;
    var disabled = false;

    function setupDialogs() {
        dialog = $('<div id="clipboard-dialog" class="hide node-red-dialog"><form class="dialog-form form-horizontal"></form></div>')
            .appendTo("body")
            .dialog({
                modal: true,
                autoOpen: false,
                width: 500,
                resizable: false,
                buttons: [
                    {
                        id: "clipboard-dialog-cancel",
                        text: RED._("common.label.cancel"),
                        click: function() {
                            $( this ).dialog( "close" );
                        }
                    },
                    {
                        id: "clipboard-dialog-close",
                        class: "primary",
                        text: RED._("common.label.close"),
                        click: function() {
                            $( this ).dialog( "close" );
                        }
                    },
                    {
                        id: "clipboard-dialog-copy",
                        class: "primary",
                        text: RED._("clipboard.export.copy"),
                        click: function() {
                            $("#clipboard-export").select();
                            document.execCommand("copy");
                            document.getSelection().removeAllRanges();
                            RED.notify(RED._("clipboard.nodesExported"));
                            $( this ).dialog( "close" );
                        }
                    },
                    {
                        id: "clipboard-dialog-ok",
                        class: "primary",
                        text: RED._("common.label.import"),
                        click: function() {
                            RED.view.importNodes($("#clipboard-import").val(),$("#import-tab > a.selected").attr('id') === 'import-tab-new');
                            $( this ).dialog( "close" );
                        }
                    }
                ],
                open: function(e) {
                    $(this).parent().find(".ui-dialog-titlebar-close").hide();
                },
                close: function(e) {
                }
            });

        dialogContainer = dialog.children(".dialog-form");

        exportNodesDialog =
            '<div class="form-row">'+
                '<label style="width:auto;margin-right: 10px;" data-i18n="clipboard.export.copy"></label>'+
                '<span id="export-range-group" class="button-group">'+
                    '<a id="export-range-selected" class="editor-button toggle" href="#" data-i18n="clipboard.export.selected"></a>'+
                    '<a id="export-range-flow" class="editor-button toggle" href="#" data-i18n="clipboard.export.current"></a>'+
                    '<a id="export-range-full" class="editor-button toggle" href="#" data-i18n="clipboard.export.all"></a>'+
                '</span>'+
                '</div>'+
            '<div class="form-row">'+
                '<textarea readonly style="resize: none; width: 100%; border-radius: 4px;font-family: monospace; font-size: 12px; background:#f3f3f3; padding-left: 0.5em; box-sizing:border-box;" id="clipboard-export" rows="5"></textarea>'+
            '</div>'+
            '<div class="form-row" style="text-align: right;">'+
                '<span id="export-format-group" class="button-group">'+
                    '<a id="export-format-mini" class="editor-button editor-button-small toggle" href="#" data-i18n="clipboard.export.compact"></a>'+
                    '<a id="export-format-full" class="editor-button editor-button-small toggle" href="#" data-i18n="clipboard.export.formatted"></a>'+
                '</span>'+
            '</div>';

        importNodesDialog = '<div class="form-row">'+
            '<textarea style="resize: none; width: 100%; border-radius: 0px;font-family: monospace; font-size: 12px; background:#eee; padding-left: 0.5em; box-sizing:border-box;" id="clipboard-import" rows="5" placeholder="'+
            RED._("clipboard.pasteNodes")+
            '"></textarea>'+
            '</div>'+
            '<div class="form-row">'+
            '<label style="width:auto;margin-right: 10px;" data-i18n="clipboard.import.import"></label>'+
            '<span id="import-tab" class="button-group">'+
                '<a id="import-tab-current" class="editor-button toggle selected" href="#" data-i18n="clipboard.export.current"></a>'+
                '<a id="import-tab-new" class="editor-button toggle" href="#" data-i18n="clipboard.import.newFlow"></a>'+
            '</span>'+
            '</div>';
    }

    function validateImport() {
        var importInput = $("#clipboard-import");
        var v = importInput.val();
        v = v.substring(v.indexOf('['),v.lastIndexOf(']')+1);
        try {
            JSON.parse(v);
            importInput.removeClass("input-error");
            importInput.val(v);
            $("#clipboard-dialog-ok").button("enable");
        } catch(err) {
            if (v !== "") {
                importInput.addClass("input-error");
            }
            $("#clipboard-dialog-ok").button("disable");
        }
    }

    function importNodes() {
        if (disabled) {
            return;
        }
        dialogContainer.empty();
        dialogContainer.append($(importNodesDialog));
        dialogContainer.i18n();

        $("#clipboard-dialog-ok").show();
        $("#clipboard-dialog-cancel").show();
        $("#clipboard-dialog-close").hide();
        $("#clipboard-dialog-copy").hide();
        $("#clipboard-dialog-ok").button("disable");
        $("#clipboard-import").keyup(validateImport);
        $("#clipboard-import").on('paste',function() { setTimeout(validateImport,10)});

        $("#import-tab > a").click(function(evt) {
            evt.preventDefault();
            if ($(this).hasClass('disabled') || $(this).hasClass('selected')) {
                return;
            }
            $(this).parent().children().removeClass('selected');
            $(this).addClass('selected');
        });

        dialog.dialog("option","title",RED._("clipboard.importNodes")).dialog("open");
    }

    function exportNodes() {
        if (disabled) {
            return;
        }

        dialogContainer.empty();
        dialogContainer.append($(exportNodesDialog));
        dialogContainer.i18n();
        var format = RED.settings.flowFilePretty ? "export-format-full" : "export-format-mini";

        $("#export-format-group > a").click(function(evt) {
            evt.preventDefault();
            if ($(this).hasClass('disabled') || $(this).hasClass('selected')) {
                $("#clipboard-export").focus();
                return;
            }
            $(this).parent().children().removeClass('selected');
            $(this).addClass('selected');

            var flow = $("#clipboard-export").val();
            if (flow.length > 0) {
                var nodes = JSON.parse(flow);

                format = $(this).attr('id');
                if (format === 'export-format-full') {
                    flow = JSON.stringify(nodes,null,4);
                } else {
                    flow = JSON.stringify(nodes);
                }
                $("#clipboard-export").val(flow);
                $("#clipboard-export").focus();
            }
        });

        $("#export-range-group > a").click(function(evt) {
            evt.preventDefault();
            if ($(this).hasClass('disabled') || $(this).hasClass('selected')) {
                $("#clipboard-export").focus();
                return;
            }
            $(this).parent().children().removeClass('selected');
            $(this).addClass('selected');
            var type = $(this).attr('id');
            var flow = "";
            var nodes = null;
            if (type === 'export-range-selected') {
                var selection = RED.view.selection();
                nodes = RED.nodes.createExportableNodeSet(selection.nodes);
            } else if (type === 'export-range-flow') {
                var activeWorkspace = RED.workspaces.active();
                nodes = RED.nodes.filterNodes({z:activeWorkspace});
                var parentNode = RED.nodes.workspace(activeWorkspace)||RED.nodes.subflow(activeWorkspace);
                nodes.unshift(parentNode);
                nodes = RED.nodes.createExportableNodeSet(nodes);
            } else if (type === 'export-range-full') {
                nodes = RED.nodes.createCompleteNodeSet(false);
            }
            if (nodes !== null) {
                if (format === "export-format-full") {
                    flow = JSON.stringify(nodes,null,4);
                } else {
                    flow = JSON.stringify(nodes);
                }
            }
            if (flow.length > 0) {
                $("#export-copy").removeClass('disabled');
            } else {
                $("#export-copy").addClass('disabled');
            }
            $("#clipboard-export").val(flow);
            $("#clipboard-export").focus();
        })

        $("#clipboard-dialog-ok").hide();
        $("#clipboard-dialog-cancel").hide();
        $("#clipboard-dialog-copy").hide();
        $("#clipboard-dialog-close").hide();
        var selection = RED.view.selection();
        if (selection.nodes) {
            $("#export-range-selected").click();
        } else {
            $("#export-range-selected").addClass('disabled').removeClass('selected');
            $("#export-range-flow").click();
        }
        if (format === "export-format-full") {
            $("#export-format-full").click();
        } else {
            $("#export-format-mini").click();
        }
        $("#clipboard-export")
            .focus(function() {
                var textarea = $(this);
                textarea.select();
                textarea.mouseup(function() {
                    textarea.unbind("mouseup");
                    return false;
                })
            });
        dialog.dialog("option","title",RED._("clipboard.exportNodes")).dialog( "open" );

        $("#clipboard-export").focus();
        if (!document.queryCommandSupported("copy")) {
            $("#clipboard-dialog-cancel").hide();
            $("#clipboard-dialog-close").show();
        } else {
            $("#clipboard-dialog-cancel").show();
            $("#clipboard-dialog-copy").show();
        }
    }

    function hideDropTarget() {
        $("#dropTarget").hide();
        RED.keyboard.remove("escape");
    }
    function copyText(value,element,msg) {
        var truncated = false;
        if (typeof value !== "string" ) {
            value = JSON.stringify(value, function(key,value) {
                if (value !== null && typeof value === 'object') {
                    if (value.__encoded__ && value.hasOwnProperty('data') && value.hasOwnProperty('length')) {
                        truncated = value.data.length !== value.length;
                        return value.data;
                    }
                }
                return value;
            });
        }
        if (truncated) {
            msg += "_truncated";
        }
        $("#clipboard-hidden").val(value).select();
        var result =  document.execCommand("copy");
        if (result && element) {
            var popover = RED.popover.create({
                target: element,
                direction: 'left',
                size: 'small',
                content: RED._(msg)
            });
            setTimeout(function() {
                popover.close();
            },1000);
            popover.open();
        }
        return result;
    }
    return {
        init: function() {
            setupDialogs();

            $('<input type="text" id="clipboard-hidden">').appendTo("body");

            RED.events.on("view:selection-changed",function(selection) {
                if (!selection.nodes) {
                    RED.menu.setDisabled("menu-item-export",true);
                    RED.menu.setDisabled("menu-item-export-clipboard",true);
                    RED.menu.setDisabled("menu-item-export-library",true);
                } else {
                    RED.menu.setDisabled("menu-item-export",false);
                    RED.menu.setDisabled("menu-item-export-clipboard",false);
                    RED.menu.setDisabled("menu-item-export-library",false);
                }
            });

            RED.actions.add("core:show-export-dialog",exportNodes);
            RED.actions.add("core:show-import-dialog",importNodes);


            RED.events.on("editor:open",function() { disabled = true; });
            RED.events.on("editor:close",function() { disabled = false; });
            RED.events.on("search:open",function() { disabled = true; });
            RED.events.on("search:close",function() { disabled = false; });
            RED.events.on("type-search:open",function() { disabled = true; });
            RED.events.on("type-search:close",function() { disabled = false; });


            $('#chart').on("dragenter",function(event) {
                if ($.inArray("text/plain",event.originalEvent.dataTransfer.types) != -1 ||
                     $.inArray("Files",event.originalEvent.dataTransfer.types) != -1) {
                    $("#dropTarget").css({display:'table'});
                    RED.keyboard.add("*", "escape" ,hideDropTarget);
                }
            });

            $('#dropTarget').on("dragover",function(event) {
                if ($.inArray("text/plain",event.originalEvent.dataTransfer.types) != -1 ||
                     $.inArray("Files",event.originalEvent.dataTransfer.types) != -1) {
                    event.preventDefault();
                }
            })
            .on("dragleave",function(event) {
                hideDropTarget();
            })
            .on("drop",function(event) {
                if ($.inArray("text/plain",event.originalEvent.dataTransfer.types) != -1) {
                    var data = event.originalEvent.dataTransfer.getData("text/plain");
                    data = data.substring(data.indexOf('['),data.lastIndexOf(']')+1);
                    RED.view.importNodes(data);
                } else if ($.inArray("Files",event.originalEvent.dataTransfer.types) != -1) {
                    var files = event.originalEvent.dataTransfer.files;
                    if (files.length === 1) {
                        var file = files[0];
                        var reader = new FileReader();
                        reader.onload = (function(theFile) {
                            return function(e) {
                                RED.view.importNodes(e.target.result);
                            };
                        })(file);
                        reader.readAsText(file);
                    }
                }
                hideDropTarget();
                event.preventDefault();
            });

        },
        import: importNodes,
        export: exportNodes,
        copyText: copyText
    }
})();
;/**
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
RED.library = (function() {


    var exportToLibraryDialog;

    function loadFlowLibrary() {
        $.getJSON("library/flows",function(data) {
            //console.log(data);

            var buildMenu = function(data,root) {
                var i;
                var li;
                var a;
                var ul = document.createElement("ul");
                if (root === "") {
                    ul.id = "menu-item-import-library-submenu";
                }
                ul.className = "dropdown-menu";
                if (data.d) {
                    for (i in data.d) {
                        if (data.d.hasOwnProperty(i)) {
                            li = document.createElement("li");
                            li.className = "dropdown-submenu pull-left";
                            a = document.createElement("a");
                            a.href="#";
                            var label = i.replace(/^node-red-contrib-/,"").replace(/^node-red-node-/,"").replace(/-/," ").replace(/_/," ");
                            a.innerHTML = label;
                            li.appendChild(a);
                            li.appendChild(buildMenu(data.d[i],root+(root!==""?"/":"")+i));
                            ul.appendChild(li);
                        }
                    }
                }
                if (data.f) {
                    for (i in data.f) {
                        if (data.f.hasOwnProperty(i)) {
                            li = document.createElement("li");
                            a = document.createElement("a");
                            a.href="#";
                            a.innerHTML = data.f[i];
                            a.flowName = root+(root!==""?"/":"")+data.f[i];
                            a.onclick = function() {
                                $.get('library/flows/'+this.flowName, function(data) {
                                    RED.view.importNodes(data);
                                });
                            };
                            li.appendChild(a);
                            ul.appendChild(li);
                        }
                    }
                }
                return ul;
            };
            var examples;
            if (data.d && data.d._examples_) {
                examples = data.d._examples_;
                delete data.d._examples_;
            }
            var menu = buildMenu(data,"");
            $("#menu-item-import-examples").remove();
            if (examples) {
                RED.menu.addItem("menu-item-import",{id:"menu-item-import-examples",label:RED._("menu.label.examples"),options:[]})
                $("#menu-item-import-examples-submenu").replaceWith(buildMenu(examples,"_examples_"));
            }
            //TODO: need an api in RED.menu for this
            $("#menu-item-import-library-submenu").replaceWith(menu);
        });
    }

    function createUI(options) {
        var libraryData = {};
        var selectedLibraryItem = null;
        var libraryEditor = null;

        // Orion editor has set/getText
        // ACE editor has set/getValue
        // normalise to set/getValue
        if (options.editor.setText) {
            // Orion doesn't like having pos passed in, so proxy the call to drop it
            options.editor.setValue = function(text,pos) {
                options.editor.setText.call(options.editor,text);
            }
        }
        if (options.editor.getText) {
            options.editor.getValue = options.editor.getText;
        }

        function buildFileListItem(item) {
            var li = document.createElement("li");
            li.onmouseover = function(e) { $(this).addClass("list-hover"); };
            li.onmouseout = function(e) { $(this).removeClass("list-hover"); };
            return li;
        }

        function buildFileList(root,data) {
            var ul = document.createElement("ul");
            var li;
            for (var i=0;i<data.length;i++) {
                var v = data[i];
                if (typeof v === "string") {
                    // directory
                    li = buildFileListItem(v);
                    li.onclick = (function () {
                        var dirName = v;
                        return function(e) {
                            var bcli = $('<li class="active"><span class="divider">/</span> <a href="#">'+dirName+'</a></li>');
                            $("a",bcli).click(function(e) {
                                $(this).parent().nextAll().remove();
                                $.getJSON("library/"+options.url+root+dirName,function(data) {
                                    $("#node-select-library").children().first().replaceWith(buildFileList(root+dirName+"/",data));
                                });
                                e.stopPropagation();
                            });
                            var bc = $("#node-dialog-library-breadcrumbs");
                            $(".active",bc).removeClass("active");
                            bc.append(bcli);
                            $.getJSON("library/"+options.url+root+dirName,function(data) {
                                $("#node-select-library").children().first().replaceWith(buildFileList(root+dirName+"/",data));
                            });
                        }
                    })();
                    li.innerHTML = '<i class="fa fa-folder"></i> '+v+"</i>";
                    ul.appendChild(li);
                } else {
                    // file
                    li = buildFileListItem(v);
                    li.innerHTML = v.name;
                    li.onclick = (function() {
                        var item = v;
                        return function(e) {
                            $(".list-selected",ul).removeClass("list-selected");
                            $(this).addClass("list-selected");
                            $.get("library/"+options.url+root+item.fn, function(data) {
                                selectedLibraryItem = item;
                                libraryEditor.setValue(data,-1);
                            });
                        }
                    })();
                    ul.appendChild(li);
                }
            }
            return ul;
        }

        $('#node-input-name').css("width","60%").after(
            '<div class="btn-group" style="margin-left: 5px;">'+
            '<a id="node-input-'+options.type+'-lookup" class="editor-button" data-toggle="dropdown"><i class="fa fa-book"></i> <i class="fa fa-caret-down"></i></a>'+
            '<ul class="dropdown-menu pull-right" role="menu">'+
            '<li><a id="node-input-'+options.type+'-menu-open-library" tabindex="-1" href="#">'+RED._("library.openLibrary")+'</a></li>'+
            '<li><a id="node-input-'+options.type+'-menu-save-library" tabindex="-1" href="#">'+RED._("library.saveToLibrary")+'</a></li>'+
            '</ul></div>'
        );



        $('#node-input-'+options.type+'-menu-open-library').click(function(e) {
            $("#node-select-library").children().remove();
            var bc = $("#node-dialog-library-breadcrumbs");
            bc.children().first().nextAll().remove();
            libraryEditor.setValue('',-1);

            $.getJSON("library/"+options.url,function(data) {
                $("#node-select-library").append(buildFileList("/",data));
                $("#node-dialog-library-breadcrumbs a").click(function(e) {
                    $(this).parent().nextAll().remove();
                    $("#node-select-library").children().first().replaceWith(buildFileList("/",data));
                    e.stopPropagation();
                });
                $( "#node-dialog-library-lookup" ).dialog( "open" );
            });

            e.preventDefault();
        });

        $('#node-input-'+options.type+'-menu-save-library').click(function(e) {
            //var found = false;
            var name = $("#node-input-name").val().replace(/(^\s*)|(\s*$)/g,"");

            //var buildPathList = function(data,root) {
            //    var paths = [];
            //    if (data.d) {
            //        for (var i in data.d) {
            //            var dn = root+(root==""?"":"/")+i;
            //            var d = {
            //                label:dn,
            //                files:[]
            //            };
            //            for (var f in data.d[i].f) {
            //                d.files.push(data.d[i].f[f].fn.split("/").slice(-1)[0]);
            //            }
            //            paths.push(d);
            //            paths = paths.concat(buildPathList(data.d[i],root+(root==""?"":"/")+i));
            //        }
            //    }
            //    return paths;
            //};
            $("#node-dialog-library-save-folder").attr("value","");

            var filename = name.replace(/[^\w-]/g,"-");
            if (filename === "") {
                filename = "unnamed-"+options.type;
            }
            $("#node-dialog-library-save-filename").attr("value",filename+".js");

            //var paths = buildPathList(libraryData,"");
            //$("#node-dialog-library-save-folder").autocomplete({
            //        minLength: 0,
            //        source: paths,
            //        select: function( event, ui ) {
            //            $("#node-dialog-library-save-filename").autocomplete({
            //                    minLength: 0,
            //                    source: ui.item.files
            //            });
            //        }
            //});

            $( "#node-dialog-library-save" ).dialog( "open" );
            e.preventDefault();
        });

        libraryEditor = ace.edit('node-select-library-text');
        libraryEditor.setTheme("ace/theme/tomorrow");
        if (options.mode) {
            libraryEditor.getSession().setMode(options.mode);
        }
        libraryEditor.setOptions({
            readOnly: true,
            highlightActiveLine: false,
            highlightGutterLine: false
        });
        libraryEditor.renderer.$cursorLayer.element.style.opacity=0;
        libraryEditor.$blockScrolling = Infinity;

        $( "#node-dialog-library-lookup" ).dialog({
            title: RED._("library.typeLibrary", {type:options.type}),
            modal: true,
            autoOpen: false,
            width: 800,
            height: 450,
            buttons: [
                {
                    text: RED._("common.label.cancel"),
                    click: function() {
                        $( this ).dialog( "close" );
                    }
                },
                {
                    text: RED._("common.label.load"),
                    class: "primary",
                    click: function() {
                        if (selectedLibraryItem) {
                            for (var i=0;i<options.fields.length;i++) {
                                var field = options.fields[i];
                                $("#node-input-"+field).val(selectedLibraryItem[field]);
                            }
                            options.editor.setValue(libraryEditor.getValue(),-1);
                        }
                        $( this ).dialog( "close" );
                    }
                }
            ],
            open: function(e) {
                var form = $("form",this);
                form.height(form.parent().height()-30);
                $("#node-select-library-text").height("100%");
                $(".form-row:last-child",form).children().height(form.height()-60);
            },
            resize: function(e) {
                var form = $("form",this);
                form.height(form.parent().height()-30);
                $(".form-row:last-child",form).children().height(form.height()-60);
            }
        });

        function saveToLibrary(overwrite) {
            var name = $("#node-input-name").val().replace(/(^\s*)|(\s*$)/g,"");
            if (name === "") {
                name = RED._("library.unnamedType",{type:options.type});
            }
            var filename = $("#node-dialog-library-save-filename").val().replace(/(^\s*)|(\s*$)/g,"");
            var pathname = $("#node-dialog-library-save-folder").val().replace(/(^\s*)|(\s*$)/g,"");
            if (filename === "" || !/.+\.js$/.test(filename)) {
                RED.notify(RED._("library.invalidFilename"),"warning");
                return;
            }
            var fullpath = pathname+(pathname===""?"":"/")+filename;
            if (!overwrite) {
                //var pathnameParts = pathname.split("/");
                //var exists = false;
                //var ds = libraryData;
                //for (var pnp in pathnameParts) {
                //    if (ds.d && pathnameParts[pnp] in ds.d) {
                //        ds = ds.d[pathnameParts[pnp]];
                //    } else {
                //        ds = null;
                //        break;
                //    }
                //}
                //if (ds && ds.f) {
                //    for (var f in ds.f) {
                //        if (ds.f[f].fn == fullpath) {
                //            exists = true;
                //            break;
                //        }
                //    }
                //}
                //if (exists) {
                //    $("#node-dialog-library-save-content").html(RED._("library.dialogSaveOverwrite",{libraryType:options.type,libraryName:fullpath}));
                //    $("#node-dialog-library-save-confirm").dialog( "open" );
                //    return;
                //}
            }
            var queryArgs = [];
            var data = {};
            for (var i=0;i<options.fields.length;i++) {
                var field = options.fields[i];
                if (field == "name") {
                    data.name = name;
                } else {
                    data[field] = $("#node-input-"+field).val();
                }
            }

            data.text = options.editor.getValue();
            $.ajax({
                url:"library/"+options.url+'/'+fullpath,
                type: "POST",
                data: JSON.stringify(data),
                contentType: "application/json; charset=utf-8"
            }).done(function(data,textStatus,xhr) {
                RED.notify(RED._("library.savedType", {type:options.type}),"success");
            }).fail(function(xhr,textStatus,err) {
                if (xhr.status === 401) {
                    RED.notify(RED._("library.saveFailed",{message:RED._("user.notAuthorized")}),"error");
                } else {
                    RED.notify(RED._("library.saveFailed",{message:xhr.responseText}),"error");
                }
            });
        }
        $( "#node-dialog-library-save-confirm" ).dialog({
            title: RED._("library.saveToLibrary"),
            modal: true,
            autoOpen: false,
            width: 530,
            height: 230,
            buttons: [
                {
                    text: RED._("common.label.cancel"),
                    click: function() {
                        $( this ).dialog( "close" );
                    }
                },
                {
                    text: RED._("common.label.save"),
                    class: "primary",
                    click: function() {
                        saveToLibrary(true);
                        $( this ).dialog( "close" );
                    }
                }
            ]
        });
        $( "#node-dialog-library-save" ).dialog({
            title: RED._("library.saveToLibrary"),
            modal: true,
            autoOpen: false,
            width: 530,
            height: 230,
            buttons: [
                {
                    text: RED._("common.label.cancel"),
                    click: function() {
                        $( this ).dialog( "close" );
                    }
                },
                {
                    text: RED._("common.label.save"),
                    class: "primary",
                    click: function() {
                        saveToLibrary(false);
                        $( this ).dialog( "close" );
                    }
                }
            ]
        });

    }

    function exportFlow() {
        //TODO: don't rely on the main dialog
        var nns = RED.nodes.createExportableNodeSet(RED.view.selection().nodes);
        $("#node-input-library-filename").attr('nodes',JSON.stringify(nns));
        exportToLibraryDialog.dialog( "open" );
    }

    return {
        init: function() {

            RED.actions.add("core:library-export",exportFlow);

            RED.events.on("view:selection-changed",function(selection) {
                if (!selection.nodes) {
                    RED.menu.setDisabled("menu-item-export",true);
                    RED.menu.setDisabled("menu-item-export-clipboard",true);
                    RED.menu.setDisabled("menu-item-export-library",true);
                } else {
                    RED.menu.setDisabled("menu-item-export",false);
                    RED.menu.setDisabled("menu-item-export-clipboard",false);
                    RED.menu.setDisabled("menu-item-export-library",false);
                }
            });

            if (RED.settings.theme("menu.menu-item-import-library") !== false) {
                loadFlowLibrary();
            }

            exportToLibraryDialog = $('<div id="library-dialog" class="hide"><form class="dialog-form form-horizontal"></form></div>')
                .appendTo("body")
                .dialog({
                    modal: true,
                    autoOpen: false,
                    width: 500,
                    resizable: false,
                    title: RED._("library.exportToLibrary"),
                    buttons: [
                        {
                            id: "library-dialog-cancel",
                            text: RED._("common.label.cancel"),
                            click: function() {
                                $( this ).dialog( "close" );
                            }
                        },
                        {
                            id: "library-dialog-ok",
                            class: "primary",
                            text: RED._("common.label.export"),
                            click: function() {
                                //TODO: move this to RED.library
                                var flowName = $("#node-input-library-filename").val();
                                if (!/^\s*$/.test(flowName)) {
                                    $.ajax({
                                        url:'library/flows/'+flowName,
                                        type: "POST",
                                        data: $("#node-input-library-filename").attr('nodes'),
                                        contentType: "application/json; charset=utf-8"
                                    }).done(function() {
                                        RED.library.loadFlowLibrary();
                                        RED.notify(RED._("library.savedNodes"),"success");
                                    }).fail(function(xhr,textStatus,err) {
                                        if (xhr.status === 401) {
                                            RED.notify(RED._("library.saveFailed",{message:RED._("user.notAuthorized")}),"error");
                                        } else {
                                            RED.notify(RED._("library.saveFailed",{message:xhr.responseText}),"error");
                                        }
                                    });
                                }
                                $( this ).dialog( "close" );
                            }
                        }
                    ],
                    open: function(e) {
                        $(this).parent().find(".ui-dialog-titlebar-close").hide();
                    },
                    close: function(e) {
                    }
                });
            exportToLibraryDialog.children(".dialog-form").append($(
                '<div class="form-row">'+
                '<label for="node-input-library-filename" data-i18n="[append]editor:library.filename"><i class="fa fa-file"></i> </label>'+
                '<input type="text" id="node-input-library-filename" data-i18n="[placeholder]editor:library.fullFilenamePlaceholder">'+
                '<input type="text" style="display: none;" />'+ // Second hidden input to prevent submit on Enter
                '</div>'
            ));
        },
        create: createUI,
        loadFlowLibrary: loadFlowLibrary,

        export: exportFlow
    }
})();
;/**
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
        $("#notifications").append(n);
        $(n).slideDown(300);
        n.close = (function() {
            var nn = n;
            return function() {
                currentNotifications.splice(currentNotifications.indexOf(nn),1);
                $(nn).slideUp(300, function() {
                    nn.parentNode.removeChild(nn);
                });
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
            n.timeoutid = window.setTimeout(n.close,timeout||3000);
        }
        currentNotifications.push(n);
        c+=1;
        return n;
    }
})();
;/**
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
RED.search = (function() {

    var disabled = false;
    var dialog = null;
    var searchInput;
    var searchResults;
    var selected = -1;
    var visible = false;

    var index = {};
    var keys = [];
    var results = [];

    function indexNode(n) {
        var l = RED.utils.getNodeLabel(n);
        if (l) {
            l = (""+l).toLowerCase();
            index[l] = index[l] || {};
            index[l][n.id] = {node:n,label:l}
        }
        l = l||n.label||n.name||n.id||"";


        var properties = ['id','type','name','label','info'];
        if (n._def && n._def.defaults) {
            properties = properties.concat(Object.keys(n._def.defaults));
        }
        for (var i=0;i<properties.length;i++) {
            if (n.hasOwnProperty(properties[i])) {
                var v = n[properties[i]];
                if (typeof v === 'string' || typeof v === 'number') {
                    v = (""+v).toLowerCase();
                    index[v] = index[v] || {};
                    index[v][n.id] = {node:n,label:l};
                }
            }
        }


    }
    function indexWorkspace() {
        index = {};
        RED.nodes.eachWorkspace(indexNode);
        RED.nodes.eachSubflow(indexNode);
        RED.nodes.eachConfig(indexNode);
        RED.nodes.eachNode(indexNode);
        keys = Object.keys(index);
        keys.sort();
        keys.forEach(function(key) {
            index[key] = Object.keys(index[key]).map(function(id) {
                return index[key][id];
            })
        })
    }

    function search(val) {
        searchResults.editableList('empty');
        selected = -1;
        results = [];
        if (val.length > 0) {
            val = val.toLowerCase();
            var i;
            var j;
            var list = [];
            var nodes = {};
            for (i=0;i<keys.length;i++) {
                var key = keys[i];
                var kpos = keys[i].indexOf(val);
                if (kpos > -1) {
                    for (j=0;j<index[key].length;j++) {
                        var node = index[key][j];
                        nodes[node.node.id] = nodes[node.node.id] = node;
                        nodes[node.node.id].index = Math.min(nodes[node.node.id].index||Infinity,kpos);
                    }
                }
            }
            list = Object.keys(nodes);
            list.sort(function(A,B) {
                return nodes[A].index - nodes[B].index;
            });

            for (i=0;i<list.length;i++) {
                results.push(nodes[list[i]]);
            }
            if (results.length > 0) {
                for (i=0;i<Math.min(results.length,25);i++) {
                    searchResults.editableList('addItem',results[i])
                }
            } else {
                searchResults.editableList('addItem',{});
            }
        }
    }
    function ensureSelectedIsVisible() {
        var selectedEntry = searchResults.find("li.selected");
        if (selectedEntry.length === 1) {
            var scrollWindow = searchResults.parent();
            var scrollHeight = scrollWindow.height();
            var scrollOffset = scrollWindow.scrollTop();
            var y = selectedEntry.position().top;
            var h = selectedEntry.height();
            if (y+h > scrollHeight) {
                scrollWindow.animate({scrollTop: '-='+(scrollHeight-(y+h)-10)},50);
            } else if (y<0) {
                scrollWindow.animate({scrollTop: '+='+(y-10)},50);
            }
        }
    }

    function createDialog() {
        dialog = $("<div>",{id:"red-ui-search",class:"red-ui-search"}).appendTo("#main-container");
        var searchDiv = $("<div>",{class:"red-ui-search-container"}).appendTo(dialog);
        searchInput = $('<input type="text" placeholder="search your flows">').appendTo(searchDiv).searchBox({
            delay: 200,
            change: function() {
                search($(this).val());
            }
        });
        searchInput.on('keydown',function(evt) {
            var children;
            if (results.length > 0) {
                if (evt.keyCode === 40) {
                    // Down
                    children = searchResults.children();
                    if (selected < children.length-1) {
                        if (selected > -1) {
                            $(children[selected]).removeClass('selected');
                        }
                        selected++;
                    }
                    $(children[selected]).addClass('selected');
                    ensureSelectedIsVisible();
                    evt.preventDefault();
                } else if (evt.keyCode === 38) {
                    // Up
                    children = searchResults.children();
                    if (selected > 0) {
                        if (selected < children.length) {
                            $(children[selected]).removeClass('selected');
                        }
                        selected--;
                    }
                    $(children[selected]).addClass('selected');
                    ensureSelectedIsVisible();
                    evt.preventDefault();
                } else if (evt.keyCode === 13) {
                    // Enter
                    if (results.length > 0) {
                        reveal(results[Math.max(0,selected)].node);
                    }
                }
            }
        });

        var searchResultsDiv = $("<div>",{class:"red-ui-search-results-container"}).appendTo(dialog);
        searchResults = $('<ol>',{id:"search-result-list", style:"position: absolute;top: 5px;bottom: 5px;left: 5px;right: 5px;"}).appendTo(searchResultsDiv).editableList({
            addButton: false,
            addItem: function(container,i,object) {
                var node = object.node;
                if (node === undefined) {
                    $('<div>',{class:"red-ui-search-empty"}).html(RED._('search.empty')).appendTo(container);

                } else {
                    var def = node._def;
                    var div = $('<a>',{href:'#',class:"red-ui-search-result"}).appendTo(container);

                    var nodeDiv = $('<div>',{class:"red-ui-search-result-node"}).appendTo(div);
                    var colour = def.color;
                    var icon_url = RED.utils.getNodeIcon(def,node);
                    if (node.type === 'tab') {
                        colour = "#C0DEED";
                    }
                    nodeDiv.css('backgroundColor',colour);

                    var iconContainer = $('<div/>',{class:"palette_icon_container"}).appendTo(nodeDiv);
                    $('<div/>',{class:"palette_icon",style:"background-image: url("+icon_url+")"}).appendTo(iconContainer);

                    var contentDiv = $('<div>',{class:"red-ui-search-result-description"}).appendTo(div);
                    if (node.z) {
                        var workspace = RED.nodes.workspace(node.z);
                        if (!workspace) {
                            workspace = RED.nodes.subflow(node.z);
                            workspace = "subflow:"+workspace.name;
                        } else {
                            workspace = "flow:"+workspace.label;
                        }
                        $('<div>',{class:"red-ui-search-result-node-flow"}).html(workspace).appendTo(contentDiv);
                    }

                    $('<div>',{class:"red-ui-search-result-node-label"}).html(object.label || node.id).appendTo(contentDiv);
                    $('<div>',{class:"red-ui-search-result-node-type"}).html(node.type).appendTo(contentDiv);
                    $('<div>',{class:"red-ui-search-result-node-id"}).html(node.id).appendTo(contentDiv);

                    div.click(function(evt) {
                        evt.preventDefault();
                        reveal(node);
                    });
                }
            },
            scrollOnAdd: false
        });

    }
    function reveal(node) {
        hide();
        RED.view.reveal(node.id);
    }

    function show() {
        if (disabled) {
            return;
        }
        if (!visible) {
            RED.keyboard.add("*","escape",function(){hide()});
            $("#header-shade").show();
            $("#editor-shade").show();
            $("#palette-shade").show();
            $("#sidebar-shade").show();
            $("#sidebar-separator").hide();
            indexWorkspace();
            if (dialog === null) {
                createDialog();
            }
            dialog.slideDown(300);
            RED.events.emit("search:open");
            visible = true;
        }
        searchInput.focus();
    }
    function hide() {
        if (visible) {
            RED.keyboard.remove("escape");
            visible = false;
            $("#header-shade").hide();
            $("#editor-shade").hide();
            $("#palette-shade").hide();
            $("#sidebar-shade").hide();
            $("#sidebar-separator").show();
            if (dialog !== null) {
                dialog.slideUp(200,function() {
                    searchInput.searchBox('value','');
                });
            }
            RED.events.emit("search:close");
        }
    }

    function init() {
        RED.actions.add("core:search",show);

        RED.events.on("editor:open",function() { disabled = true; });
        RED.events.on("editor:close",function() { disabled = false; });
        RED.events.on("type-search:open",function() { disabled = true; });
        RED.events.on("type-search:close",function() { disabled = false; });



        $("#header-shade").on('mousedown',hide);
        $("#editor-shade").on('mousedown',hide);
        $("#palette-shade").on('mousedown',hide);
        $("#sidebar-shade").on('mousedown',hide);
    }

    return {
        init: init,
        show: show,
        hide: hide
    };

})();
;RED.typeSearch = (function() {

    var shade;

    var disabled = false;
    var dialog = null;
    var searchInput;
    var searchResults;
    var searchResultsDiv;
    var selected = -1;
    var visible = false;

    var activeFilter = "";
    var addCallback;

    var typesUsed = {};

    function search(val) {
        activeFilter = val.toLowerCase();
        var visible = searchResults.editableList('filter');
        setTimeout(function() {
            selected = 0;
            searchResults.children().removeClass('selected');
            searchResults.children(":visible:first").addClass('selected');
        },100);

    }

    function ensureSelectedIsVisible() {
        var selectedEntry = searchResults.find("li.selected");
        if (selectedEntry.length === 1) {
            var scrollWindow = searchResults.parent();
            var scrollHeight = scrollWindow.height();
            var scrollOffset = scrollWindow.scrollTop();
            var y = selectedEntry.position().top;
            var h = selectedEntry.height();
            if (y+h > scrollHeight) {
                scrollWindow.animate({scrollTop: '-='+(scrollHeight-(y+h)-10)},50);
            } else if (y<0) {
                scrollWindow.animate({scrollTop: '+='+(y-10)},50);
            }
        }
    }

    function createDialog() {
        //shade = $('<div>',{class:"red-ui-type-search-shade"}).appendTo("#main-container");
        dialog = $("<div>",{id:"red-ui-type-search",class:"red-ui-search red-ui-type-search"}).appendTo("#main-container");
        var searchDiv = $("<div>",{class:"red-ui-search-container"}).appendTo(dialog);
        searchInput = $('<input type="text">').attr("placeholder",RED._("search.addNode")).appendTo(searchDiv).searchBox({
            delay: 50,
            change: function() {
                search($(this).val());
            }
        });
        searchInput.on('keydown',function(evt) {
            var children = searchResults.children(":visible");
            if (children.length > 0) {
                if (evt.keyCode === 40) {
                    // Down
                    if (selected < children.length-1) {
                        if (selected > -1) {
                            $(children[selected]).removeClass('selected');
                        }
                        selected++;
                    }
                    $(children[selected]).addClass('selected');
                    ensureSelectedIsVisible();
                    evt.preventDefault();
                } else if (evt.keyCode === 38) {
                    // Up
                    if (selected > 0) {
                        if (selected < children.length) {
                            $(children[selected]).removeClass('selected');
                        }
                        selected--;
                    }
                    $(children[selected]).addClass('selected');
                    ensureSelectedIsVisible();
                    evt.preventDefault();
                } else if (evt.keyCode === 13) {
                    // Enter
                    var index = Math.max(0,selected);
                    if (index < children.length) {
                        // TODO: dips into editableList impl details
                        confirm($(children[index]).find(".red-ui-editableList-item-content").data('data'));
                    }
                }
            }
        });

        searchResultsDiv = $("<div>",{class:"red-ui-search-results-container"}).appendTo(dialog);
        searchResults = $('<ol>',{id:"search-result-list", style:"position: absolute;top: 0;bottom: 0;left: 0;right: 0;"}).appendTo(searchResultsDiv).editableList({
            addButton: false,
            filter: function(data) {
                if (activeFilter === "" ) {
                    return true;
                }
                if (data.recent || data.common) {
                    return false;
                }
                return (activeFilter==="")||(data.index.indexOf(activeFilter) > -1);
            },
            addItem: function(container,i,object) {
                var def = object.def;
                object.index = object.type.toLowerCase();
                if (object.separator) {
                    container.addClass("red-ui-search-result-separator")
                }
                var div = $('<a>',{href:'#',class:"red-ui-search-result"}).appendTo(container);

                var nodeDiv = $('<div>',{class:"red-ui-search-result-node"}).appendTo(div);
                var colour = def.color;
                var icon_url = RED.utils.getNodeIcon(def);
                nodeDiv.css('backgroundColor',colour);

                var iconContainer = $('<div/>',{class:"palette_icon_container"}).appendTo(nodeDiv);
                $('<div/>',{class:"palette_icon",style:"background-image: url("+icon_url+")"}).appendTo(iconContainer);

                if (def.inputs > 0) {
                    $('<div/>',{class:"red-ui-search-result-node-port"}).appendTo(nodeDiv);
                }
                if (def.outputs > 0) {
                    $('<div/>',{class:"red-ui-search-result-node-port red-ui-search-result-node-output"}).appendTo(nodeDiv);
                }

                var contentDiv = $('<div>',{class:"red-ui-search-result-description"}).appendTo(div);

                var label = object.label;
                object.index += "|"+label.toLowerCase();

                $('<div>',{class:"red-ui-search-result-node-label"}).html(label).appendTo(contentDiv);

                div.click(function(evt) {
                    evt.preventDefault();
                    confirm(object);
                });
            },
            scrollOnAdd: false
        });

    }
    function confirm(def) {
        hide();
        typesUsed[def.type] = Date.now();
        addCallback(def.type);
    }

    function handleMouseActivity(evt) {
        if (visible) {
            var t = $(evt.target);
            while (t.prop('nodeName').toLowerCase() !== 'body') {
                if (t.attr('id') === 'red-ui-type-search') {
                    return;
                }
                t = t.parent();
            }
            hide(true);
        }
    }
    function show(opts) {
        if (!visible) {
            RED.keyboard.add("*","escape",function(){hide()});
            if (dialog === null) {
                createDialog();
            }
            visible = true;
            setTimeout(function() {
                $(document).on('mousedown.type-search',handleMouseActivity);
                $(document).on('mouseup.type-search',handleMouseActivity);
                $(document).on('click.type-search',handleMouseActivity);
            },200);
        } else {
            dialog.hide();
            searchResultsDiv.hide();
        }
        refreshTypeList();
        addCallback = opts.add;
        RED.events.emit("type-search:open");
        //shade.show();
        dialog.css({left:opts.x+"px",top:opts.y+"px"}).show();
        searchResultsDiv.slideDown(300);
        setTimeout(function() {
            searchResultsDiv.find(".red-ui-editableList-container").scrollTop(0);
            searchInput.focus();
        },100);
    }
    function hide(fast) {
        if (visible) {
            RED.keyboard.remove("escape");
            visible = false;
            if (dialog !== null) {
                searchResultsDiv.slideUp(fast?50:200,function() {
                    dialog.hide();
                    searchInput.searchBox('value','');
                });
                //shade.hide();
            }
            RED.events.emit("type-search:close");
            RED.view.focus();
            $(document).off('mousedown.type-search');
            $(document).off('mouseup.type-search');
            $(document).off('click.type-search');
        }
    }

    function getTypeLabel(type, def) {
        var label = type;
        if (typeof def.paletteLabel !== "undefined") {
            try {
                label = (typeof def.paletteLabel === "function" ? def.paletteLabel.call(def) : def.paletteLabel)||"";
                label += " ("+type+")";
            } catch(err) {
                console.log("Definition error: "+type+".paletteLabel",err);
            }
        }
        return label;
    }

    function refreshTypeList() {
        var i;
        searchResults.editableList('empty');
        searchInput.searchBox('value','');
        selected = -1;
        var common = [
            'inject','debug','function','change','switch'
        ];

        var recentlyUsed = Object.keys(typesUsed);
        recentlyUsed.sort(function(a,b) {
            return typesUsed[b]-typesUsed[a];
        });
        recentlyUsed = recentlyUsed.filter(function(t) {
            return common.indexOf(t) === -1;
        });

        var items = [];
        RED.nodes.registry.getNodeTypes().forEach(function(t) {
            var def = RED.nodes.getType(t);
            if (def.category !== 'config' && t !== 'unknown') {
                items.push({type:t,def: def, label:getTypeLabel(t,def)});
            }
        });
        items.sort(function(a,b) {
            var al = a.label.toLowerCase();
            var bl = b.label.toLowerCase();
            if (al < bl) {
                return -1;
            } else if (al === bl) {
                return 0;
            } else {
                return 1;
            }
        })

        var commonCount = 0;
        var item;
        for(i=0;i<common.length;i++) {
            item = {
                type: common[i],
                common: true,
                def: RED.nodes.getType(common[i])
            };
            item.label = getTypeLabel(item.type,item.def);
            if (i === common.length-1) {
                item.separator = true;
            }
            searchResults.editableList('addItem', item);
        }
        for(i=0;i<Math.min(5,recentlyUsed.length);i++) {
            item = {
                type:recentlyUsed[i],
                def: RED.nodes.getType(recentlyUsed[i]),
                recent: true
            };
            item.label = getTypeLabel(item.type,item.def);
            if (i === recentlyUsed.length-1) {
                item.separator = true;
            }
            searchResults.editableList('addItem', item);
        }
        for (i=0;i<items.length;i++) {
            searchResults.editableList('addItem', items[i]);
        }
        setTimeout(function() {
            selected = 0;
            searchResults.children(":first").addClass('selected');
        },100);
    }

    return {
        show: show,
        hide: hide
    };

})();
;/** This file was modified by Sathya Laufer */

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

RED.subflow = (function() {


    function getSubflow() {
        return RED.nodes.subflow(RED.workspaces.active());
    }

    function findAvailableSubflowIOPosition(subflow,isInput) {
        var pos = {x:50,y:30};
        if (!isInput) {
            pos.x += 110;
        }
        for (var i=0;i<subflow.out.length+subflow.in.length;i++) {
            var port;
            if (i < subflow.out.length) {
                port = subflow.out[i];
            } else {
                port = subflow.in[i-subflow.out.length];
            }
            if (port.x == pos.x && port.y == pos.y) {
                pos.x += 55;
                i=0;
            }
        }
        return pos;
    }

    function addSubflowInput() {
        var subflow = RED.nodes.subflow(RED.workspaces.active());
        var position = findAvailableSubflowIOPosition(subflow,true);

        var newInput = {
            type:"subflow",
            direction:"in",
            z:subflow.id,
            i:subflow.in.length,
            x:position.x,
            y:position.y,
            id:RED.nodes.id()
        };
        var oldInCount = subflow.in.length;
        subflow.in.push(newInput);
        subflow.dirty = true;
        var wasDirty = RED.nodes.dirty();
        var wasChanged = subflow.changed;
        subflow.changed = true;
        var result = refresh(true);
        var historyEvent = {
            t:'edit',
            node:subflow,
            dirty:wasDirty,
            changed:wasChanged,
            subflow: {
                inputCount: oldInCount,
                instances: result.instances
            }
        };
        RED.history.push(historyEvent);
        RED.view.select();
        RED.nodes.dirty(true);
        RED.view.redraw();
        $("#workspace-subflow-input .spinner-value").html(subflow.in.length);
    }

    function removeSubflowInput() {
        var activeSubflow = RED.nodes.subflow(RED.workspaces.active());
        if (activeSubflow.in.length === 0) {
            return;
        }
        if (typeof removedSubflowInputs === "undefined") {
            removedSubflowInputs = [activeSubflow.in[activeSubflow.in.length-1]];
        }
        var removedLinks = [];
        removedSubflowInputs.sort(function(a,b) { return b.i-a.i});
        for (i=0;i<removedSubflowInputs.length;i++) {
            var input = removedSubflowInputs[i];
            activeSubflow.in.splice(input.i,1);
            var subflowRemovedLinks = [];
            var subflowMovedLinks = [];
            RED.nodes.eachLink(function(l) {
                if (l.source.type == "subflow" && l.source.z == activeSubflow.id && l.source.i == input.i) {
                    subflowRemovedLinks.push(l);
                }
                if (l.source.type == "subflow:"+activeSubflow.id) {
                    if (l.sourcePort == output.i) {
                        subflowRemovedLinks.push(l);
                    } else if (l.targetPort > input.i) {
                        subflowMovedLinks.push(l);
                    }
                }
            });
            subflowRemovedLinks.forEach(function(l) { RED.nodes.removeLink(l)});
            subflowMovedLinks.forEach(function(l) { l.targetPort--; });

            removedLinks = removedLinks.concat(subflowRemovedLinks);
            for (var j=input.i;j<activeSubflow.in.length;j++) {
                activeSubflow.in[j].i--;
                activeSubflow.in[j].dirty = true;
            }
        }
        activeSubflow.changed = true;

        return {subflowInputs: removedSubflowInputs, links: removedLinks}
    }

    function addSubflowOutput(id) {
        var subflow = RED.nodes.subflow(RED.workspaces.active());
        var position = findAvailableSubflowIOPosition(subflow,false);

        var newOutput = {
            type:"subflow",
            direction:"out",
            z:subflow.id,
            i:subflow.out.length,
            x:position.x,
            y:position.y,
            id:RED.nodes.id()
        };
        var oldOutCount = subflow.out.length;
        subflow.out.push(newOutput);
        subflow.dirty = true;
        var wasDirty = RED.nodes.dirty();
        var wasChanged = subflow.changed;
        subflow.changed = true;

        var result = refresh(true);

        var historyEvent = {
            t:'edit',
            node:subflow,
            dirty:wasDirty,
            changed:wasChanged,
            subflow: {
                outputCount: oldOutCount,
                instances: result.instances
            }
        };
        RED.history.push(historyEvent);
        RED.view.select();
        RED.nodes.dirty(true);
        RED.view.redraw();
        $("#workspace-subflow-output .spinner-value").html(subflow.out.length);
    }

    function removeSubflowOutput(removedSubflowOutputs) {
        var activeSubflow = RED.nodes.subflow(RED.workspaces.active());
        if (activeSubflow.out.length === 0) {
            return;
        }
        if (typeof removedSubflowOutputs === "undefined") {
            removedSubflowOutputs = [activeSubflow.out[activeSubflow.out.length-1]];
        }
        var removedLinks = [];
        removedSubflowOutputs.sort(function(a,b) { return b.i-a.i});
        for (i=0;i<removedSubflowOutputs.length;i++) {
            var output = removedSubflowOutputs[i];
            activeSubflow.out.splice(output.i,1);
            var subflowRemovedLinks = [];
            var subflowMovedLinks = [];
            RED.nodes.eachLink(function(l) {
                if (l.target.type == "subflow" && l.target.z == activeSubflow.id && l.target.i == output.i) {
                    subflowRemovedLinks.push(l);
                }
                if (l.source.type == "subflow:"+activeSubflow.id) {
                    if (l.sourcePort == output.i) {
                        subflowRemovedLinks.push(l);
                    } else if (l.sourcePort > output.i) {
                        subflowMovedLinks.push(l);
                    }
                }
            });
            subflowRemovedLinks.forEach(function(l) { RED.nodes.removeLink(l)});
            subflowMovedLinks.forEach(function(l) { l.sourcePort--; });

            removedLinks = removedLinks.concat(subflowRemovedLinks);
            for (var j=output.i;j<activeSubflow.out.length;j++) {
                activeSubflow.out[j].i--;
                activeSubflow.out[j].dirty = true;
            }
        }
        activeSubflow.changed = true;

        return {subflowOutputs: removedSubflowOutputs, links: removedLinks}
    }

    function refresh(markChange) {
        var activeSubflow = RED.nodes.subflow(RED.workspaces.active());
        refreshToolbar(activeSubflow);
        var subflowInstances = [];
        if (activeSubflow) {
            RED.nodes.filterNodes({type:"subflow:"+activeSubflow.id}).forEach(function(n) {
                subflowInstances.push({
                    id: n.id,
                    changed: n.changed
                });
                if (markChange) {
                    n.changed = true;
                }
                n.inputs = activeSubflow.in.length;
                while (n.inputs < n.inputPorts.length) {
                    n.inputPorts.pop();
                }
                n.outputs = activeSubflow.out.length;
                while (n.outputs < n.outputPorts.length) {
                    n.outputPorts.pop();
                }
                n.resize = true;
                n.dirty = true;
                RED.editor.updateNodeProperties(n);
            });
            RED.editor.validateNode(activeSubflow);
            return {
                instances: subflowInstances
            }
        }
    }
    function refreshToolbar(activeSubflow) {
        if (activeSubflow) {
            $("#workspace-subflow-input .spinner-value").html(activeSubflow.in.length);
            $("#workspace-subflow-output .spinner-value").html(activeSubflow.out.length);
        }
    }

    function showWorkspaceToolbar(activeSubflow) {
        var toolbar = $("#workspace-toolbar");
        toolbar.empty();

        $('<a class="button" id="workspace-subflow-edit" href="#" data-i18n="[append]subflow.editSubflowProperties"><i class="fa fa-pencil"></i> </a>').appendTo(toolbar);
        $('<span style="margin-left: 5px;" data-i18n="subflow.input"></span> <div id="workspace-subflow-input" style="display: inline-block;" class="button-group spinner-group">'+
            '<a id="workspace-subflow-input-remove" class="button" href="#"><i class="fa fa-minus"></i></a>'+
            '<div class="spinner-value">3</div>'+
            '<a id="workspace-subflow-input-add" class="button" href="#"><i class="fa fa-plus"></i></a>'+
            '</div>').appendTo(toolbar);

        $('<span style="margin-left: 5px;" data-i18n="subflow.output"></span> <div id="workspace-subflow-output" style="display: inline-block;" class="button-group spinner-group">'+
            '<a id="workspace-subflow-output-remove" class="button" href="#"><i class="fa fa-minus"></i></a>'+
            '<div class="spinner-value">3</div>'+
            '<a id="workspace-subflow-output-add" class="button" href="#"><i class="fa fa-plus"></i></a>'+
            '</div>').appendTo(toolbar);

        // $('<a class="button disabled" id="workspace-subflow-add-input" href="#" data-i18n="[append]subflow.input"><i class="fa fa-plus"></i> </a>').appendTo(toolbar);
        // $('<a class="button" id="workspace-subflow-add-output" href="#" data-i18n="[append]subflow.output"><i class="fa fa-plus"></i> </a>').appendTo(toolbar);
        $('<a class="button" id="workspace-subflow-delete" href="#" data-i18n="[append]subflow.deleteSubflow"><i class="fa fa-trash"></i> </a>').appendTo(toolbar);
        toolbar.i18n();


        $("#workspace-subflow-output-remove").click(function(event) {
            event.preventDefault();
            var wasDirty = RED.nodes.dirty();
            var wasChanged = activeSubflow.changed;
            var result = removeSubflowOutput();
            if (result) {
                var inst = refresh(true);
                RED.history.push({
                    t:'delete',
                    links:result.links,
                    subflowOutputs: result.subflowOutputs,
                    changed: wasChanged,
                    dirty:wasDirty,
                    subflow: {
                        instances: inst.instances
                    }
                });

                RED.view.select();
                RED.nodes.dirty(true);
                RED.view.redraw(true);
            }
        });
        $("#workspace-subflow-output-add").click(function(event) {
            event.preventDefault();
            addSubflowOutput();
        });

        $("#workspace-subflow-input-add").click(function(event) {
            event.preventDefault();
            addSubflowInput();
        });
        $("#workspace-subflow-input-remove").click(function(event) {
            event.preventDefault();
            var wasDirty = RED.nodes.dirty();
            var wasChanged = activeSubflow.changed;
            activeSubflow.changed = true;
            var result = removeSubflowInput();
            if (result) {
                var inst = refresh(true);
                RED.history.push({
                    t:'delete',
                    links:result.links,
                    changed: wasChanged,
                    subflowInputs: result.subflowInputs,
                    dirty:wasDirty,
                    subflow: {
                        instances: inst.instances
                    }
                });
                RED.view.select();
                RED.nodes.dirty(true);
                RED.view.redraw(true);
            }
        });

        $("#workspace-subflow-edit").click(function(event) {
            RED.editor.editSubflow(RED.nodes.subflow(RED.workspaces.active()));
            event.preventDefault();
        });

        $("#workspace-subflow-delete").click(function(event) {
            event.preventDefault();
            var startDirty = RED.nodes.dirty();
            var historyEvent = removeSubflow(RED.workspaces.active());
            historyEvent.t = 'delete';
            historyEvent.dirty = startDirty;

            RED.history.push(historyEvent);

        });

        refreshToolbar(activeSubflow);

        $("#chart").css({"margin-top": "40px"});
        $("#workspace-toolbar").show();
    }
    function hideWorkspaceToolbar() {
        $("#workspace-toolbar").hide().empty();
        $("#chart").css({"margin-top": "0"});
    }

    function removeSubflow(id) {
        var removedNodes = [];
        var removedLinks = [];

        var activeSubflow = RED.nodes.subflow(id);

        RED.nodes.eachNode(function(n) {
            if (n.type == "subflow:"+activeSubflow.id) {
                removedNodes.push(n);
            }
            if (n.z == activeSubflow.id) {
                removedNodes.push(n);
            }
        });
        RED.nodes.eachConfig(function(n) {
            if (n.z == activeSubflow.id) {
                removedNodes.push(n);
            }
        });

        var removedConfigNodes = [];
        for (var i=0;i<removedNodes.length;i++) {
            var removedEntities = RED.nodes.remove(removedNodes[i].id);
            removedLinks = removedLinks.concat(removedEntities.links);
            removedConfigNodes = removedConfigNodes.concat(removedEntities.nodes);
        }
        // TODO: this whole delete logic should be in RED.nodes.removeSubflow..
        removedNodes = removedNodes.concat(removedConfigNodes);

        RED.nodes.removeSubflow(activeSubflow);
        RED.workspaces.remove(activeSubflow);
        RED.nodes.dirty(true);
        RED.view.redraw();

        return {
            nodes:removedNodes,
            links:removedLinks,
            subflow: {
                subflow: activeSubflow
            }
        }
    }
    function init() {
        RED.events.on("workspace:change",function(event) {
            var activeSubflow = RED.nodes.subflow(event.workspace);
            if (activeSubflow) {
                showWorkspaceToolbar(activeSubflow);
            } else {
                hideWorkspaceToolbar();
            }
        });
        /*RED.events.on("view:selection-changed",function(selection) {
            if (!selection.nodes) {
                RED.menu.setDisabled("menu-item-subflow-convert",true);
            } else {
                RED.menu.setDisabled("menu-item-subflow-convert",false);
            }
        });*/

        RED.actions.add("core:create-subflow",createSubflow);
        /*RED.actions.add("core:convert-to-subflow",convertToSubflow);*/
    }

    function createSubflow() {
        var lastIndex = 0;
        RED.nodes.eachSubflow(function(sf) {
           var m = (new RegExp("^Subflow (\\d+)$")).exec(sf.name);
           if (m) {
               lastIndex = Math.max(lastIndex,m[1]);
           }
        });

        var name = "Subflow "+(lastIndex+1);

        var subflowId = RED.nodes.id();
        var subflow = {
            type:"subflow",
            id:subflowId,
            name:name,
            info:"",
            in: [],
            out: []
        };
        RED.nodes.addSubflow(subflow);
        RED.history.push({
            t:'createSubflow',
            subflow: {
                subflow:subflow
            },
            dirty:RED.nodes.dirty()
        });
        RED.workspaces.show(subflowId);
        RED.nodes.dirty(true);
    }

    /*function convertToSubflow() {
        var selection = RED.view.selection();
        if (!selection.nodes) {
            RED.notify(RED._("subflow.errors.noNodesSelected"),"error");
            return;
        }
        var i,n;
        var nodes = {};
        var new_links = [];
        var removedLinks = [];

        var candidateInputs = [];
        var candidateOutputs = [];
        var candidateInputNodes = {};


        var boundingBox = [selection.nodes[0].x,
            selection.nodes[0].y,
            selection.nodes[0].x,
            selection.nodes[0].y];

        for (i=0;i<selection.nodes.length;i++) {
            n = selection.nodes[i];
            nodes[n.id] = {n:n,outputs:{}};
            boundingBox = [
                Math.min(boundingBox[0],n.x),
                Math.min(boundingBox[1],n.y),
                Math.max(boundingBox[2],n.x),
                Math.max(boundingBox[3],n.y)
            ]
        }

        var center = [(boundingBox[2]+boundingBox[0]) / 2,(boundingBox[3]+boundingBox[1]) / 2];

        RED.nodes.eachLink(function(link) {
            if (nodes[link.source.id] && nodes[link.target.id]) {
                // A link wholely within the selection
            }

            if (nodes[link.source.id] && !nodes[link.target.id]) {
                // An outbound link from the selection
                candidateOutputs.push(link);
                removedLinks.push(link);
            }
            if (!nodes[link.source.id] && nodes[link.target.id]) {
                // An inbound link
                candidateInputs.push(link);
                candidateInputNodes[link.target.id] = link.target;
                removedLinks.push(link);
            }
        });

        var outputs = {};
        candidateOutputs = candidateOutputs.filter(function(v) {
             if (outputs[v.source.id+":"+v.sourcePort]) {
                 outputs[v.source.id+":"+v.sourcePort].targets.push(v.target);
                 return false;
             }
             v.targets = [];
             v.targets.push(v.target);
             outputs[v.source.id+":"+v.sourcePort] = v;
             return true;
        });
        candidateOutputs.sort(function(a,b) { return a.source.y-b.source.y});

        if (Object.keys(candidateInputNodes).length > 1) {
             RED.notify(RED._("subflow.errors.multipleInputsToSelection"),"error");
             return;
        }

        var lastIndex = 0;
        RED.nodes.eachSubflow(function(sf) {
           var m = (new RegExp("^Subflow (\\d+)$")).exec(sf.name);
           if (m) {
               lastIndex = Math.max(lastIndex,m[1]);
           }
        });

        var name = "Subflow "+(lastIndex+1);

        var subflowId = RED.nodes.id();
        var subflow = {
            type:"subflow",
            id:subflowId,
            name:name,
            info:"",
            in: Object.keys(candidateInputNodes).map(function(v,i) { var index = i; return {
                type:"subflow",
                direction:"in",
                x:candidateInputNodes[v].x-(candidateInputNodes[v].w/2)-80,
                y:candidateInputNodes[v].y,
                z:subflowId,
                i:index,
                id:RED.nodes.id(),
                wires:[{id:candidateInputNodes[v].id}]
            }}),
            out: candidateOutputs.map(function(v,i) { var index = i; return {
                type:"subflow",
                direction:"in",
                x:v.source.x+(v.source.w/2)+80,
                y:v.source.y,
                z:subflowId,
                i:index,
                id:RED.nodes.id(),
                wires:[{id:v.source.id,port:v.sourcePort}]
            }})
        };

        RED.nodes.addSubflow(subflow);

        var subflowInstance = {
            id:RED.nodes.id(),
            type:"subflow:"+subflow.id,
            x: center[0],
            y: center[1],
            z: RED.workspaces.active(),
            inputs: subflow.in.length,
            outputs: subflow.out.length,
            h: Math.max(30,(subflow.out.length||0) * 15),
            changed:true
        }
        subflowInstance._def = RED.nodes.getType(subflowInstance.type);
        RED.editor.validateNode(subflowInstance);
        RED.nodes.add(subflowInstance);

        candidateInputs.forEach(function(l) {
            var link = {source:l.source, sourcePort:l.sourcePort, target: subflowInstance};
            new_links.push(link);
            RED.nodes.addLink(link);
        });

        candidateOutputs.forEach(function(output,i) {
            output.targets.forEach(function(target) {
                var link = {source:subflowInstance, sourcePort:i, target: target};
                new_links.push(link);
                RED.nodes.addLink(link);
            });
        });

        subflow.in.forEach(function(input) {
            input.wires.forEach(function(wire) {
                var link = {source: input, sourcePort: 0, target: RED.nodes.node(wire.id) }
                new_links.push(link);
                RED.nodes.addLink(link);
            });
        });
        subflow.out.forEach(function(output,i) {
            output.wires.forEach(function(wire) {
                var link = {source: RED.nodes.node(wire.id), sourcePort: wire.port , target: output }
                new_links.push(link);
                RED.nodes.addLink(link);
            });
        });

        for (i=0;i<removedLinks.length;i++) {
            RED.nodes.removeLink(removedLinks[i]);
        }

        for (i=0;i<selection.nodes.length;i++) {
            n = selection.nodes[i];
            if (/^link /.test(n.type)) {
                n.links = n.links.filter(function(id) {
                    var isLocalLink = nodes.hasOwnProperty(id);
                    if (!isLocalLink) {
                        var otherNode = RED.nodes.node(id);
                        if (otherNode && otherNode.links) {
                            var i = otherNode.links.indexOf(n.id);
                            if (i > -1) {
                                otherNode.links.splice(i,1);
                            }
                        }
                    }
                    return isLocalLink;
                });
            }
            n.z = subflow.id;
        }

        RED.history.push({
            t:'createSubflow',
            nodes:[subflowInstance.id],
            links:new_links,
            subflow: {
                subflow: subflow
            },

            activeWorkspace: RED.workspaces.active(),
            removedLinks: removedLinks,

            dirty:RED.nodes.dirty()
        });
        RED.view.select(null);
        RED.editor.validateNode(subflow);
        RED.nodes.dirty(true);
        RED.view.redraw(true);
    }*/



    return {
        init: init,
        createSubflow: createSubflow,
        //convertToSubflow: convertToSubflow,
        removeSubflow: removeSubflow,
        refresh: refresh,
        removeInput: removeSubflowInput,
        removeOutput: removeSubflowOutput
    }
})();
;/**
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

RED.userSettings = (function() {

    var trayWidth = 700;
    var settingsVisible = false;

    var panes = [];

    function addPane(options) {
        panes.push(options);
    }

    function show(initialTab) {
        if (settingsVisible) {
            return;
        }
        settingsVisible = true;
        var tabContainer;

        var trayOptions = {
            title: "User Settings",
            buttons: [
                {
                    id: "node-dialog-ok",
                    text: RED._("common.label.close"),
                    class: "primary",
                    click: function() {
                        RED.tray.close();
                    }
                }
            ],
            resize: function(dimensions) {
                trayWidth = dimensions.width;
            },
            open: function(tray) {
                var trayBody = tray.find('.editor-tray-body');
                var settingsContent = $('<div></div>').appendTo(trayBody);
                var tabContainer = $('<div></div>',{id:"user-settings-tabs-container"}).appendTo(settingsContent);

                $('<ul></ul>',{id:"user-settings-tabs"}).appendTo(tabContainer);
                var settingsTabs = RED.tabs.create({
                    id: "user-settings-tabs",
                    vertical: true,
                    onchange: function(tab) {
                        setTimeout(function() {
                            $("#user-settings-tabs-content").children().hide();
                            $("#" + tab.id).show();
                            if (tab.pane.focus) {
                                tab.pane.focus();
                            }
                        },50);
                    }
                });
                var tabContents = $('<div></div>',{id:"user-settings-tabs-content"}).appendTo(settingsContent);

                panes.forEach(function(pane) {
                    settingsTabs.addTab({
                        id: "user-settings-tab-"+pane.id,
                        label: pane.title,
                        pane: pane
                    });
                    pane.get().hide().appendTo(tabContents);
                });
                settingsContent.i18n();
                settingsTabs.activateTab("user-settings-tab-"+(initialTab||'view'))
                $("#sidebar-shade").show();
            },
            close: function() {
                settingsVisible = false;
                panes.forEach(function(pane) {
                    if (pane.close) {
                        pane.close();
                    }
                });
                $("#sidebar-shade").hide();

            },
            show: function() {}
        }
        if (trayWidth !== null) {
            trayOptions.width = trayWidth;
        }
        RED.tray.show(trayOptions);
    }

    var viewSettings = [
        {
            title: "Grid",
            options: [
                {setting:"view-show-grid",label:"menu.label.view.showGrid",default:true,toggle:true,onchange:"core:toggle-show-grid"},
                {setting:"view-snap-grid",label:"menu.label.view.snapGrid",default:true,toggle:true,onchange:"core:toggle-snap-grid"},
                {setting:"view-grid-size",label:"menu.label.view.gridSize",type:"number",default:10, onchange:RED.view.gridSize}
            ]
        },
        {
            title: "Nodes",
            options: [
                {setting:"view-node-status",label:"menu.label.displayStatus",default: true, toggle:true,onchange:"core:toggle-status"}
            ]
        },
        {
            title: "Other",
            options: [
                {setting:"view-show-tips",label:"menu.label.showTips",toggle:true,default:true,onchange:"core:toggle-show-tips"}
            ]
        }
    ];

    var allSettings = {};

    function createViewPane() {

        var pane = $('<div id="user-settings-tab-view" class="node-help"></div>');

        viewSettings.forEach(function(section) {
            $('<h3></h3>').text(section.title).appendTo(pane);
            section.options.forEach(function(opt) {
                var initialState = RED.settings.get(opt.setting);
                var row = $('<div class="user-settings-row"></div>').appendTo(pane);
                var input;
                if (opt.toggle) {
                    input = $('<label for="user-settings-'+opt.setting+'"><input id="user-settings-'+opt.setting+'" type="checkbox"> '+RED._(opt.label)+'</label>').appendTo(row).find("input");
                    input.prop('checked',initialState);
                } else {
                    $('<label for="user-settings-'+opt.setting+'">'+RED._(opt.label)+'</label>').appendTo(row);
                    $('<input id="user-settings-'+opt.setting+'" type="'+(opt.type||"text")+'">').appendTo(row).val(initialState);
                }
            });
        })
        return pane;
    }

    function setSelected(id, value) {
        var opt = allSettings[id];
        RED.settings.set(opt.setting,value);
        var callback = opt.onchange;
        if (typeof callback === 'string') {
            callback = RED.actions.get(callback);
        }
        if (callback) {
            callback.call(opt,value);
        }
    }
    function toggle(id) {
        var opt = allSettings[id];
        var state = RED.settings.get(opt.setting);
        setSelected(id,!state);
    }


    function init() {
        RED.actions.add("core:show-user-settings",show);
        RED.actions.add("core:show-help", function() { show('keyboard')});

        addPane({
            id:'view',
            title: 'View',
            get: createViewPane,
            close: function() {
                viewSettings.forEach(function(section) {
                    section.options.forEach(function(opt) {
                        var input = $("#user-settings-"+opt.setting);
                        if (opt.toggle) {
                            setSelected(opt.setting,input.prop('checked'));
                        } else {
                            setSelected(opt.setting,input.val());
                        }
                    });
                })
            }
        })

        viewSettings.forEach(function(section) {
            section.options.forEach(function(opt) {
                allSettings[opt.setting] = opt;
                if (opt.onchange) {
                    var value = RED.settings.get(opt.setting);
                    if (value === null && opt.hasOwnProperty('default')) {
                        value = opt.default;
                        RED.settings.set(opt.setting,value);
                    }

                    var callback = opt.onchange;
                    if (typeof callback === 'string') {
                        callback = RED.actions.get(callback);
                    }
                    if (callback) {
                        callback.call(opt,value);
                    }
                }
            });
        });

    }
    return {
        init: init,
        toggle: toggle,
        show: show,
        add: addPane
    };
})();
;/**
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

RED.touch = RED.touch||{};
RED.touch.radialMenu = (function() {
    
    
    var touchMenu = null;
    var isActive = false;
    var isOutside = false;
    var activeOption = null;

    
    function createRadial(obj,pos,options) {
        isActive = true;
        try {
            var w = $("body").width();
            var h = $("body").height();
            
            touchMenu = d3.select("body").append("div")
                .style({
                        position:"absolute",
                        top: 0,
                        left:0,
                        bottom:0,
                        right:0,
                        "z-index": 1000
                })
                .on('touchstart',function() {
                    hide();
                    d3.event.preventDefault();
                });
                    
            

    
            var menu = touchMenu.append("div")
                .style({
                        position: "absolute",
                        top: (pos[1]-80)+"px",
                        left:(pos[0]-80)+"px",
                        "border-radius": "80px",
                        width: "160px",
                        height: "160px",
                        background: "rgba(255,255,255,0.6)",
                        border: "1px solid #666"
                });
                
            var menuOpts = [];
            var createMenuOpt = function(x,y,opt) {
                opt.el = menu.append("div")
                    .style({
                        position: "absolute",
                        top: (y+80-25)+"px",
                        left:(x+80-25)+"px",
                        "border-radius": "20px",
                        width: "50px",
                        height: "50px",
                        background: "#fff",
                        border: "2px solid #666",
                        "text-align": "center",
                        "line-height":"50px"
                    });
                    
                opt.el.html(opt.name);
                
                if (opt.disabled) {
                    opt.el.style({"border-color":"#ccc",color:"#ccc"});
                }
                opt.x = x;
                opt.y = y;
                menuOpts.push(opt);
                
                opt.el.on('touchstart',function() {
                    opt.el.style("background","#999");
                    d3.event.preventDefault();
                    d3.event.stopPropagation();
                });
                opt.el.on('touchend',function() {
                    hide();
                    opt.onselect();
                    d3.event.preventDefault();
                    d3.event.stopPropagation();
                });
            }
            
            var n = options.length;
            var dang = Math.max(Math.PI/(n-1),Math.PI/4);
            var ang = Math.PI;
            for (var i=0;i<n;i++) {
                var x = Math.floor(Math.cos(ang)*80);
                var y = Math.floor(Math.sin(ang)*80);
                if (options[i].name) {
                    createMenuOpt(x,y,options[i]);
                }
                ang += dang;
            }
            

            var hide = function() {
                isActive = false;
                activeOption = null;
                touchMenu.remove();
                touchMenu = null;
            }
                    
            obj.on('touchend.radial',function() {
                    obj.on('touchend.radial',null);
                    obj.on('touchmenu.radial',null);
                    
                    if (activeOption) {
                        try {
                            activeOption.onselect();
                        } catch(err) {
                            RED._debug(err);
                        }
                        hide();
                    } else if (isOutside) {
                        hide();
                    }
            });


            
            obj.on('touchmove.radial',function() {
            try {
                var touch0 = d3.event.touches.item(0);
                var p = [touch0.pageX - pos[0],touch0.pageY-pos[1]];
                for (var i=0;i<menuOpts.length;i++) {
                    var opt = menuOpts[i];
                    if (!opt.disabled) {
                        if (p[0]>opt.x-30 && p[0]<opt.x+30 && p[1]>opt.y-30 && p[1]<opt.y+30) {
                            if (opt !== activeOption) {
                                opt.el.style("background","#999");
                                activeOption = opt;
                            }
                        } else if (opt === activeOption) {
                            opt.el.style("background","#fff");
                            activeOption = null;
                        } else {
                            opt.el.style("background","#fff");
                        }
                    }
                }
                if (!activeOption) {
                    var d = Math.abs((p[0]*p[0])+(p[1]*p[1]));
                    isOutside = (d > 80*80);
                }
                
            } catch(err) {
                RED._debug(err);
            }

                
            });
            
        } catch(err) {
            RED._debug(err);
        }
    }    

    
    return {
        show: createRadial,
        active: function() {
            return isActive;
        }
    }

})();

