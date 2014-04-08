/**
 * Copyright 2013 IBM Corp.
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
RED.editor = function() {
    var editing_node = null;
    
    // TODO: should IMPORT/EXPORT get their own dialogs?
    
    function onInputLookupClick(select,name,type) {
        return function(e) {
            showEditConfigNodeDialog(name,type,select.find(":selected").val());
            e.preventDefault();
        }
    }
    function showEditDialog(node) {
        editing_node = node;
        RED.view.state(RED.state.EDITING);
        $("#dialog-form").html($("script[data-template-name='"+node.type+"']").html());
        if (node._def.defaults) {
            for (var d in node._def.defaults) {
                var def = node._def.defaults[d];
                var input = $("#node-input-"+d);
                
                var node_def = RED.nodes.getType(def.type);
                
                if (node_def && node_def.category == "config") {
                    input.replaceWith('<select style="width: 60%;" id="node-input-'+d+'"></select>');
                    updateConfigNodeSelect(d,def.type,node[d]);
                    var select = $("#node-input-"+d);
                    select.after(' <a id="node-input-lookup-'+d+'" class="btn"><i class="icon icon-pencil"></i></a>');
                    $('#node-input-lookup-'+d).click(onInputLookupClick(select,d,def.type));
                    var label = "";
                    var configNode = RED.nodes.node(node[d]);
                    if (configNode && node_def.label) {
                        if (typeof node_def.label == "function") {
                            label = node_def.label.call(configNode);
                        } else {
                            label = node_def.label;
                        }
                    }
                    input.val(label);
                } else {
                    if (input.attr('type') === "checkbox") {
                        input.prop('checked',node[d]);
                    } else {
                        var val = node[d];
                        if (node[d] == null) {
                            val = "";
                        }
                        input.val(val);
                    }
                }
                $("#node-input-"+d).change(function() {
                        var n = node;
                        var property = d;
                        return function() {
                            if (!validateNodeProperty(node, property,this.value)) {
                                $(this).addClass("input-error");
                            } else {
                                $(this).removeClass("input-error");
                            }
                        };
                }());
            }
        }
        if (node._def.oneditprepare) {
            node._def.oneditprepare.call(node);
        }
        if (node._def.defaults) {
            for (var d in node._def.defaults) {
                $("#node-input-"+d).change();
            }
        }

        $( "#dialog" ).dialog("option","title","Edit "+node.type+" node").dialog( "open" );
    }
    
    function validateNode(node) {
        var oldValue = node.valid;
        node.valid = true;
        for (var d in node._def.defaults) {
            if (!validateNodeProperty(node,d,node[d])) {
                node.valid = false;
            }
        }
        if (node.valid != oldValue) {
            node.dirty = true;
        }
    }

    function validateNodeProperty(node,property,value) {
        var valid = true;
        if ("required" in node._def.defaults[property] && node._def.defaults[property].required) {
            valid = value !== "";
        }
        if (valid && "validate" in node._def.defaults[property]) {
            valid = node._def.defaults[property].validate.call(node,value);
        }
        if (valid && node._def.defaults[property].type && RED.nodes.getType(node._def.defaults[property].type) && !("validate" in node._def.defaults[property])) {
            if (!value || value == "_ADD_") {
                valid = false;
            } else {
                var v = RED.nodes.node(value).valid;
                valid = (v==null || v);
            }
        }
        return valid;
    }
    
    function updateNodeProperties(node) {
        node.resize = true;
        node.dirty = true;
        var removedLinks = [];
        if (node.outputs < node.ports.length) {
            while (node.outputs < node.ports.length) {
                node.ports.pop();
            }
            var removedLinks = [];
            RED.nodes.eachLink(function(l) {
                    if (l.source === node && l.sourcePort >= node.outputs) {
                        removedLinks.push(l);
                    }
            });
            for (var l in removedLinks) {
                RED.nodes.removeLink(removedLinks[l]);
            }
        } else if (node.outputs > node.ports.length) {
            while (node.outputs > node.ports.length) {
                node.ports.push(node.ports.length);
            }
        }
        return removedLinks;
    }
    
    
    
    $( "#dialog" ).dialog({
            modal: true,
            autoOpen: false,
            closeOnEscape: false,
            width: 500,
            buttons: [
                {
                    text: "Ok",
                    click: function() {
                        if (editing_node) {
                            var changes = {};
                            var changed = false;
                            var wasDirty = RED.view.dirty();
                            
                            
                            if (editing_node._def.oneditsave) {
                                var oldValues = {};
                                for (var d in editing_node._def.defaults) {
                                    if (typeof editing_node[d] === "string" || typeof editing_node[d] === "number") {
                                        oldValues[d] = editing_node[d];
                                    } else {
                                        oldValues[d] = $.extend(true,{},{v:editing_node[d]}).v;
                                    }
                                }
                                var rc = editing_node._def.oneditsave.call(editing_node);
                                if (rc === true) {
                                    changed = true;
                                }
                                
                                for (var d in editing_node._def.defaults) {
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
                            
                            if (editing_node._def.defaults) {
                                for (var d in editing_node._def.defaults) {
                                    var input = $("#node-input-"+d);
                                    var newValue;
                                    if (input.attr('type') === "checkbox") {
                                        newValue = input.prop('checked');
                                    } else {
                                        newValue = input.val();
                                    }
                                    if (newValue != null) {
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
                                                var configNode = RED.nodes.node(newValue);
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
                            
                            var removedLinks = updateNodeProperties(editing_node);
                            if (changed) {
                                var wasChanged = editing_node.changed;
                                editing_node.changed = true;
                                RED.view.dirty(true);
                                RED.history.push({t:'edit',node:editing_node,changes:changes,links:removedLinks,dirty:wasDirty,changed:wasChanged});
                            }
                            editing_node.dirty = true;
                            validateNode(editing_node);
                            RED.view.redraw();
                        } else if (RED.view.state() == RED.state.EXPORT) {
                            if (/library/.test($( "#dialog" ).dialog("option","title"))) {
                                //TODO: move this to RED.library
                                var flowName = $("#node-input-filename").val();
                                if (!/^\s*$/.test(flowName)) {
                                    $.post('library/flows/'+flowName,$("#node-input-filename").attr('nodes'),function() {
                                            RED.library.loadFlowLibrary();
                                            RED.notify("Saved nodes","success");
                                    });
                                }
                            };
                        } else if (RED.view.state() == RED.state.IMPORT) {
                            RED.view.importNodes($("#node-input-import").val());
                        }
                        $( this ).dialog( "close" );
                    }
                },
                {
                    text: "Cancel",
                    click: function() {
                        $( this ).dialog( "close" );
                    }
                }
            ],
            resize: function(e,ui) {
                if (editing_node) {
                    $(this).dialog('option',"sizeCache-"+editing_node.type,ui.size);
                }
            },
            open: function(e) {
                RED.keyboard.disable();
                if (editing_node) {
                    var size = $(this).dialog('option','sizeCache-'+editing_node.type);
                    if (size) {
                        $(this).dialog('option','width',size.width);
                        $(this).dialog('option','height',size.height);
                    }
                }
            },
            close: function(e) {
                RED.keyboard.enable();

                if (RED.view.state() != RED.state.IMPORT_DRAGGING) {
                    RED.view.state(RED.state.DEFAULT);
                }
                $( this ).dialog('option','height','auto');
                $( this ).dialog('option','width','500');
                if (editing_node) {
                    RED.sidebar.info.refresh(editing_node);
                }
                RED.sidebar.config.refresh();
                editing_node = null;
            }
    });
    
    
    function showEditConfigNodeDialog(name,type,id) {
        var adding = (id == "_ADD_");
        $("#dialog-config-form").html($("script[data-template-name='"+type+"']").html());
        var node_def = RED.nodes.getType(type);
        var configNode = RED.nodes.node(id);

        for (var d in node_def.defaults) {
            var input = $("#node-config-input-"+d);
            if (id == "_ADD_") {
                input.val(node_def.defaults[d].value);
            } else {
                input.val(configNode[d]);
            }
            $("#node-config-input-"+d).change(function() {
                    var n = configNode;
                    if (adding) {
                        n = {_def:node_def};
                    }
                    var property = d;
                    return function() {
                        if (!validateNodeProperty(n, property,this.value)) {
                            $(this).addClass("input-error");
                        } else {
                            $(this).removeClass("input-error");
                        }
                    };
            }());
            $("#node-config-input-"+d).change();
        }
        var buttons = $( "#node-config-dialog" ).dialog("option","buttons");
        if (id == "_ADD_") {
            if (buttons.length == 3) {
                buttons = buttons.splice(1);
            }
            buttons[0].text = "Add";
            $("#node-config-dialog-user-count").html("").hide();
        } else {
            if (buttons.length == 2) {
                buttons.unshift({
                        class: 'leftButton',
                        text: "Delete",
                        click: function() {
                            var configProperty = $(this).dialog('option','node-property');
                            var configId = $(this).dialog('option','node-id');
                            var configType = $(this).dialog('option','node-type');
                            var configNode = RED.nodes.node(configId);
                            var configTypeDef = RED.nodes.getType(configType);
                            
                            if (configTypeDef.ondelete) {
                                configTypeDef.ondelete.call(RED.nodes.node(configId));
                            }
                            RED.nodes.remove(configId);
                            for (var i in configNode.users) {
                                var user = configNode.users[i];
                                for (var d in user._def.defaults) {
                                    if (user[d] == configId) {
                                        user[d] = "";
                                    }
                                }
                                validateNode(user);
                            }
                            updateConfigNodeSelect(configProperty,configType,"");
                            RED.view.dirty(true);
                            $( this ).dialog( "close" );
                            RED.view.redraw();
                        }
                });
            }
            buttons[1].text = "Update";
            $("#node-config-dialog-user-count").html(configNode.users.length+" node"+(configNode.users.length==1?" uses":"s use")+" this config").show();
        }
        $( "#node-config-dialog" ).dialog("option","buttons",buttons);
        
        if (adding) {
            id = (1+Math.random()*4294967295).toString(16);
        }
        if (node_def.oneditprepare) {
            var cn = RED.nodes.node(id);
            if (cn) {
                node_def.oneditprepare.call(cn);
            } else {
                node_def.oneditprepare.call({id:id});
            }
        }
        
        
        $( "#node-config-dialog" )
            .dialog("option","node-adding",adding)
            .dialog("option","node-property",name)
            .dialog("option","node-id",id)
            .dialog("option","node-type",type)
            .dialog("option","title",(adding?"Add new ":"Edit ")+type+" config node")
            .dialog( "open" );
    }
    
    function updateConfigNodeSelect(name,type,value) {
        var select = $("#node-input-"+name);
        var node_def = RED.nodes.getType(type); 
        select.children().remove();
        RED.nodes.eachConfig(function(config) {
            if (config.type == type) {
                var label = "";
                if (typeof node_def.label == "function") {
                    label = node_def.label.call(config);
                } else {
                    label = node_def.label;
                }
                select.append('<option value="'+config.id+'"'+(value==config.id?" selected":"")+'>'+label+'</option>');
            }
        });
        
        select.append('<option value="_ADD_"'+(value==""?" selected":"")+'>Add new '+type+'...</option>');
        window.setTimeout(function() { select.change();},50);
    }
    
    $( "#node-config-dialog" ).dialog({
            modal: true,
            autoOpen: false,
            width: 500,
            closeOnEscape: false,
            buttons: [
                {
                    text: "Ok",
                    click: function() {
                        var configProperty = $(this).dialog('option','node-property');
                        var configId = $(this).dialog('option','node-id');
                        var configType = $(this).dialog('option','node-type');
                        var configAdding = $(this).dialog('option','node-adding');
                        var configTypeDef = RED.nodes.getType(configType);
                        var configNode;
                        
                        if (configAdding) {
                            configNode = {type:configType,id:configId,users:[]};
                            for (var d in configTypeDef.defaults) {
                                var input = $("#node-config-input-"+d);
                                configNode[d] = input.val();
                            }
                            configNode.label = configTypeDef.label;
                            configNode._def = configTypeDef;
                            //console.log(nn.id,nn.label());
                            RED.nodes.add(configNode);
                            updateConfigNodeSelect(configProperty,configType,configNode.id);
                        } else {
                            configNode = RED.nodes.node(configId);
                            for (var d in configTypeDef.defaults) {
                                var input = $("#node-config-input-"+d);
                                configNode[d] = input.val();
                            }
                            updateConfigNodeSelect(configProperty,configType,configId);
                        }
                        
                        if (configTypeDef.oneditsave) {
                            configTypeDef.oneditsave.call(RED.nodes.node(configId));
                        }
                        validateNode(configNode);
                        RED.view.dirty(true);
                        
                        $( this ).dialog( "close" );
                    }
                },
                {
                    text: "Cancel",
                    click: function() {
                        var configType = $(this).dialog('option','node-type');
                        var configId = $(this).dialog('option','node-id');
                        var configAdding = $(this).dialog('option','node-adding');
                        var configTypeDef = RED.nodes.getType(configType);

                        if (configTypeDef.oneditcancel) {
                            // TODO: what to pass as this to call
                            if (configTypeDef.oneditcancel) {
                                var cn = RED.nodes.node(configId);
                                if (cn) {
                                    configTypeDef.oneditcancel.call(cn,false);
                                } else {
                                    configTypeDef.oneditcancel.call({id:configId},true);
                                }
                            }
                        }
                        $( this ).dialog( "close" );
                    }
                }
            ],
            resize: function(e,ui) {
            },
            open: function(e) {
                if (RED.view.state() != RED.state.EDITING) {
                    RED.keyboard.disable();
                }
            },
            close: function(e) {
                $("#dialog-config-form").html("");
                if (RED.view.state() != RED.state.EDITING) {
                    RED.keyboard.enable();
                }
                RED.sidebar.config.refresh();
            }
    });
    
    
    return {
        edit: showEditDialog,
        editConfig: showEditConfigNodeDialog,
        validateNode: validateNode,
        updateNodeProperties: updateNodeProperties // TODO: only exposed for edit-undo
    }
}();
