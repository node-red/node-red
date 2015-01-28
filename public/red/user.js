/**
 * Copyright 2014 IBM Corp.
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
                       '<div style="display: inline-block;width: 250px; vertical-align: top; margin-right: 10px; margin-bottom: 20px;"><img src="node-red-256.png"/></div>'+
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
                    for (;i<data.prompts.length;i++) {
                        var field = data.prompts[i];
                        var row = $("<div/>",{class:"form-row"});
                        $('<label for="node-dialog-login-'+field.id+'">'+field.label+':</label><br/>').appendTo(row);
                        $('<input style="width: 100%" id="node-dialog-login-'+field.id+'" type="'+field.type+'" tabIndex="'+(i+1)+'"/>').appendTo(row);
                        row.appendTo("#node-dialog-login-fields");
                    }
                    $('<div class="form-row" style="text-align: right; margin-top: 10px;"><span id="node-dialog-login-failed" style="line-height: 2em;float:left;" class="hide">Login failed</span><img src="spin.svg" style="height: 30px; margin-right: 10px; " class="login-spinner hide"/>'+
                        (opts.cancelable?'<a href="#" id="node-dialog-login-cancel" style="margin-right: 20px;" tabIndex="'+(i+1)+'">Cancel</a>':'')+
                        '<a href="#" id="node-dialog-login-submit" tabIndex="'+(i+2)+'">Login</a></div>').appendTo("#node-dialog-login-fields");
                    $("#node-dialog-login-submit").button().click(function( event ) {
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
    
    return {
        login: login,
        logout: logout
    }

})();
