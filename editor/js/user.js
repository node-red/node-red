/**
 * Copyright 2014, 2015 IBM Corp.
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
            closeOnEscape: false,
            width: 600,
            resizable: false,
            draggable: false
        });
        
        $("#node-dialog-login-fields").empty();
        $.ajax({
            dataType: "json",
            url: "auth/login",
            success: function(data) {
                if (data.type == "credentials") {
                    var i=0;
                    
                    if (data.image) {
                        $("#node-dialog-login-image").attr("src",data.image);
                    } else {
                        $("#node-dialog-login-image").attr("src","red/images/node-red-256.png");
                    }
                    for (;i<data.prompts.length;i++) {
                        var field = data.prompts[i];
                        var row = $("<div/>",{id:"rrr"+i,class:"form-row"});
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
                    $('<div class="form-row" style="text-align: right; margin-top: 10px;"><span id="node-dialog-login-failed" style="line-height: 2em;float:left;" class="hide">Login failed</span><img src="red/images/spin.svg" style="height: 30px; margin-right: 10px; " class="login-spinner hide"/>'+
                        (opts.cancelable?'<a href="#" id="node-dialog-login-cancel" style="margin-right: 20px;" tabIndex="'+(i+1)+'">Cancel</a>':'')+
                        '<input type="submit" id="node-dialog-login-submit" style="width: auto;" tabIndex="'+(i+2)+'" value="Login"></div>').appendTo("#node-dialog-login-fields");
                        
                                
                    $("#node-dialog-login-submit").button();
                    $("#node-dialog-login-fields").submit(function(event) {
                        $("#node-dialog-login-submit").button("option","disabled",true);
                        $("#node-dialog-login-failed").hide();
                        $(".login-spinner").show();
                        
                        var body = {
                            client_id: "node-red-editor",
                            grant_type: "password",
                            scope:"*"
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
                    if (opts.cancelable) {
                        $("#node-dialog-login-cancel").button().click(function( event ) {
                            $("#node-dialog-login").dialog('destroy').remove();
                        });
                    }
                }
                dialog.dialog("open");
            }     
        });
    }

    function logout() {
        $.ajax({
            url: "auth/revoke",
            type: "POST",
            data: {token:RED.settings.get("auth-tokens").access_token},
            success: function() {
                RED.settings.remove("auth-tokens");
                document.location.reload(true);
            }
        })
    }
    
    function updateUserMenu() {
        $("#usermenu-submenu li").remove();
        if (RED.settings.user.anonymous) {
            RED.menu.addItem("btn-usermenu",{
                id:"usermenu-item-login",
                label:"Login",
                onselect: function() {
                    RED.user.login({cancelable:true},function() {
                        RED.settings.load(function() {
                            RED.notify("Logged in as "+RED.settings.user.username,"success");
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
                label:"Logout",
                onselect: function() {
                    RED.user.logout();
                }
            });
        }
        
    }
    
    
    
    function init() {
        if (RED.settings.user) {
            if (!RED.settings.editorTheme || !RED.settings.editorTheme.hasOwnProperty("userMenu")) {
            
                $('<li><a id="btn-usermenu" class="button hide" data-toggle="dropdown" href="#"><i class="fa fa-user"></i></a></li>')
                    .prependTo(".header-toolbar");
    
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
