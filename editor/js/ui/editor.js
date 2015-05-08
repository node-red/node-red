/**
 * Copyright 2013, 2015 IBM Corp.
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
    var editing_node = null;

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
            node.changed = hasChanged;
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
                subflowInstances[i].changed = node.changed;
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
        if ("required" in definition[property] && definition[property].required) {
            valid = value !== "";
        }
        if (valid && "validate" in definition[property]) {
            valid = definition[property].validate.call(node,value);
        }
        if (valid && definition[property].type && RED.nodes.getType(definition[property].type) && !("validate" in definition[property])) {
            if (!value || value == "_ADD_") {
                valid = definition[property].hasOwnProperty("required") && !definition[property].required;
            } else {
                var v = RED.nodes.node(value).valid;
                valid = (v==null || v);
            }
        }
        return valid;
    }

    /**
     * Called when the node's properties have changed.
     * Marks the node as dirty and needing a size check.
     * Removes any links to non-existant outputs.
     * @param node - the node that has been updated
     * @returns {array} the links that were removed due to this update
     */
    function updateNodeProperties(node) {
        node.resize = true;
        node.dirty = true;
        var removedLinks = [];
        if (node.ports) {
            if (node.outputs < node.ports.length) {
                while (node.outputs < node.ports.length) {
                    node.ports.pop();
                }
                RED.nodes.eachLink(function(l) {
                        if (l.source === node && l.sourcePort >= node.outputs) {
                            removedLinks.push(l);
                        }
                });
            } else if (node.outputs > node.ports.length) {
                while (node.outputs > node.ports.length) {
                    node.ports.push(node.ports.length);
                }
            }
        }
        if (node.inputs === 0) {
            removedLinks.concat(RED.nodes.filterLinks({target:node}));
        }
        for (var l=0;l<removedLinks.length;l++) {
            RED.nodes.removeLink(removedLinks[l]);
        }
        return removedLinks;
    }

    $( "#dialog" ).dialog({
            modal: true,
            autoOpen: false,
            dialogClass: "ui-dialog-no-close",
            closeOnEscape: false,
            minWidth: 500,
            width: 'auto',
            buttons: [
                {
                    id: "node-dialog-ok",
                    text: "Ok",
                    click: function() {
                        if (editing_node) {
                            var changes = {};
                            var changed = false;
                            var wasDirty = RED.nodes.dirty();
                            var d;

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
                                var rc = editing_node._def.oneditsave.call(editing_node);
                                if (rc === true) {
                                    changed = true;
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

                            if (editing_node._def.defaults) {
                                for (d in editing_node._def.defaults) {
                                    if (editing_node._def.defaults.hasOwnProperty(d)) {
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

                            var removedLinks = updateNodeProperties(editing_node);
                            if (changed) {
                                var wasChanged = editing_node.changed;
                                editing_node.changed = true;
                                RED.nodes.dirty(true);
                                RED.history.push({t:'edit',node:editing_node,changes:changes,links:removedLinks,dirty:wasDirty,changed:wasChanged});
                            }
                            editing_node.dirty = true;
                            validateNode(editing_node);
                            RED.view.redraw();
                        } else if (/Export nodes to library/.test($( "#dialog" ).dialog("option","title"))) {
                            //TODO: move this to RED.library
                            var flowName = $("#node-input-filename").val();
                            if (!/^\s*$/.test(flowName)) {
                                $.ajax({
                                    url:'library/flows/'+flowName,
                                    type: "POST",
                                    data: $("#node-input-filename").attr('nodes'),
                                    contentType: "application/json; charset=utf-8"
                                }).done(function() {
                                        RED.library.loadFlowLibrary();
                                        RED.notify("Saved nodes","success");
                                });
                            }
                        }
                        $( this ).dialog( "close" );
                    }
                },
                {
                    id: "node-dialog-cancel",
                    text: "Cancel",
                    click: function() {
                        if (editing_node && editing_node._def) {
                            if (editing_node._def.oneditcancel) {
                                editing_node._def.oneditcancel.call(editing_node);
                            }
                        }
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
                var minWidth = $(this).dialog('option','minWidth');
                if ($(this).outerWidth() < minWidth) {
                    $(this).dialog('option','width',minWidth);
                } else {
                    $(this).dialog('option','width',$(this).outerWidth());
                }
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
                $( this ).dialog('option','width','auto');
                if (editing_node) {
                    RED.sidebar.info.refresh(editing_node);
                }
                RED.sidebar.config.refresh();

                var buttons = $( this ).dialog("option","buttons");
                if (buttons.length == 3) {
                    $( this ).dialog("option","buttons",buttons.splice(1));
                }
                editing_node = null;
            }
    });

    /**
     * Create a config-node select box for this property
     * @param node - the node being edited
     * @param property - the name of the field
     * @param type - the type of the config-node
     */
    function prepareConfigNodeSelect(node,property,type) {
        var input = $("#node-input-"+property);
        var node_def = RED.nodes.getType(type);

        input.replaceWith('<select style="width: 60%;" id="node-input-'+property+'"></select>');
        updateConfigNodeSelect(property,type,node[property]);
        var select = $("#node-input-"+property);
        select.after(' <a id="node-input-lookup-'+property+'" class="btn"><i class="fa fa-pencil"></i></a>');
        $('#node-input-lookup-'+property).click(function(e) {
            showEditConfigNodeDialog(property,type,select.find(":selected").val());
            e.preventDefault();
        });
        var label = "";
        var configNode = RED.nodes.node(node[property]);
        if (configNode && node_def.label) {
            if (typeof node_def.label == "function") {
                label = node_def.label.call(configNode);
            } else {
                label = node_def.label;
            }
        }
        input.val(label);
    }

    /**
     * Create a config-node button for this property
     * @param node - the node being edited
     * @param property - the name of the field
     * @param type - the type of the config-node
     */
    function prepareConfigNodeButton(node,property,type) {
        var input = $("#node-input-"+property);
        input.val(node[property]);
        input.attr("type","hidden");

        var button = $("<a>",{id:"node-input-edit-"+property, class:"btn"});
        input.after(button);

        if (node[property]) {
            button.text("edit");
        } else {
            button.text("add");
        }

        button.click(function(e) {
            showEditConfigNodeDialog(property,type,input.val()||"_ADD_");
            e.preventDefault();
        });
    }

    /**
     * Populate the editor dialog input field for this property
     * @param node - the node being edited
     * @param property - the name of the field
     * @param prefix - the prefix to use in the input element ids (node-input|node-config-input)
     */
    function preparePropertyEditor(node,property,prefix) {
        var input = $("#"+prefix+"-"+property);
        if (input.attr('type') === "checkbox") {
            input.prop('checked',node[property]);
        } else {
            var val = node[property];
            if (val == null) {
                val = "";
            }
            input.val(val);
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
        $("#"+prefix+"-"+property).change(function() {
            if (!validateNodeProperty(node, definition, property,this.value)) {
                $(this).addClass("input-error");
            } else {
                $(this).removeClass("input-error");
            }
        });
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
                    preparePropertyEditor(credData, cred, prefix);
                }
                attachPropertyChangeHandler(node, credDef, cred, prefix);
            }
        }
        for (cred in credDef) {
            if (credDef.hasOwnProperty(cred)) {
                $("#" + prefix + "-" + cred).change();
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
    function prepareEditDialog(node,definition,prefix) {
        for (var d in definition.defaults) {
            if (definition.defaults.hasOwnProperty(d)) {
                if (definition.defaults[d].type) {
                    if (definition.defaults[d].exclusive) {
                        prepareConfigNodeButton(node,d,definition.defaults[d].type);
                    } else {
                        prepareConfigNodeSelect(node,d,definition.defaults[d].type);
                    }
                } else {
                    preparePropertyEditor(node,d,prefix);
                }
                attachPropertyChangeHandler(node,definition.defaults,d,prefix);
            }
        }
        var completePrepare = function() {
            if (definition.oneditprepare) {
                definition.oneditprepare.call(node);
            }
            for (var d in definition.defaults) {
                if (definition.defaults.hasOwnProperty(d)) {
                    $("#"+prefix+"-"+d).change();
                }
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

    function showEditDialog(node) {
        editing_node = node;
        RED.view.state(RED.state.EDITING);
        var type = node.type;
        if (node.type.substring(0,8) == "subflow:") {
            type = "subflow";
            var id = editing_node.type.substring(8);
            var buttons = $( "#dialog" ).dialog("option","buttons");
            buttons.unshift({
                class: 'leftButton',
                text: "Edit flow",
                click: function() {
                    RED.workspaces.show(id);
                    $("#node-dialog-ok").click();
                }
            });
            $( "#dialog" ).dialog("option","buttons",buttons);
        }
        $("#dialog-form").html($("script[data-template-name='"+type+"']").html());
        $('<input type="text" style="display: none;" />').appendTo("#dialog-form");
        prepareEditDialog(node,node._def,"node-input");





        $( "#dialog" ).dialog("option","title","Edit "+type+" node").dialog( "open" );
    }

    function showEditConfigNodeDialog(name,type,id) {
        var adding = (id == "_ADD_");
        var node_def = RED.nodes.getType(type);

        var configNode = RED.nodes.node(id);
        if (configNode == null) {
            configNode = {
                id: (1+Math.random()*4294967295).toString(16),
                _def: node_def,
                type: type
            }
            for (var d in node_def.defaults) {
                if (node_def.defaults[d].value) {
                    configNode[d] = node_def.defaults[d].value;
                }
            }
        }

        $("#dialog-config-form").html($("script[data-template-name='"+type+"']").html());
        prepareEditDialog(configNode,node_def,"node-config-input");

        var buttons = $( "#node-config-dialog" ).dialog("option","buttons");
        if (adding) {
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
                            if (configTypeDef.oneditdelete) {
                                configTypeDef.oneditdelete.call(RED.nodes.node(configId));
                            }
                            RED.nodes.remove(configId);
                            for (var i=0;i<configNode.users.length;i++) {
                                var user = configNode.users[i];
                                for (var d in user._def.defaults) {
                                    if (user._def.defaults.hasOwnProperty(d) && user[d] == configId) {
                                        user[d] = "";
                                    }
                                }
                                validateNode(user);
                            }
                            updateConfigNodeSelect(configProperty,configType,"");
                            RED.nodes.dirty(true);
                            $( this ).dialog( "close" );
                            RED.view.redraw();
                        }
                });
            }
            buttons[1].text = "Update";
            $("#node-config-dialog-user-count").html(configNode.users.length+" node"+(configNode.users.length==1?" uses":"s use")+" this config").show();
        }
        $( "#node-config-dialog" ).dialog("option","buttons",buttons);

        $( "#node-config-dialog" )
            .dialog("option","node-adding",adding)
            .dialog("option","node-property",name)
            .dialog("option","node-id",configNode.id)
            .dialog("option","node-type",type)
            .dialog("option","title",(adding?"Add new ":"Edit ")+type+" config node")
            .dialog( "open" );
    }

    function updateConfigNodeSelect(name,type,value) {
        var button = $("#node-input-edit-"+name);
        if (button.length) {
            if (value) {
                button.text("edit");
            } else {
                button.text("add");
            }
            $("#node-input-"+name).val(value);
        } else {

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

            select.append('<option value="_ADD_"'+(value===""?" selected":"")+'>Add new '+type+'...</option>');
            window.setTimeout(function() { select.change();},50);
        }
    }

    $( "#node-config-dialog" ).dialog({
            modal: true,
            autoOpen: false,
            dialogClass: "ui-dialog-no-close",
            minWidth: 500,
            width: 'auto',
            closeOnEscape: false,
            buttons: [
                {
                    id: "node-config-dialog-ok",
                    text: "Ok",
                    click: function() {
                        var configProperty = $(this).dialog('option','node-property');
                        var configId = $(this).dialog('option','node-id');
                        var configType = $(this).dialog('option','node-type');
                        var configAdding = $(this).dialog('option','node-adding');
                        var configTypeDef = RED.nodes.getType(configType);
                        var configNode;
                        var d;
                        var input;

                        if (configAdding) {
                            configNode = {type:configType,id:configId,users:[]};
                            for (d in configTypeDef.defaults) {
                                if (configTypeDef.defaults.hasOwnProperty(d)) {
                                    input = $("#node-config-input-"+d);
                                    if (input.attr('type') === "checkbox") {
                                      configNode[d] = input.prop('checked');
                                    } else {
                                      configNode[d] = input.val();
                                    }
                                }
                            }
                            configNode.label = configTypeDef.label;
                            configNode._def = configTypeDef;
                            RED.nodes.add(configNode);
                            updateConfigNodeSelect(configProperty,configType,configNode.id);
                        } else {
                            configNode = RED.nodes.node(configId);
                            for (d in configTypeDef.defaults) {
                                if (configTypeDef.defaults.hasOwnProperty(d)) {
                                    input = $("#node-config-input-"+d);
                                    if (input.attr('type') === "checkbox") {
                                      configNode[d] = input.prop('checked');
                                    } else {
                                      configNode[d] = input.val();
                                    }
                                }
                            }
                            updateConfigNodeSelect(configProperty,configType,configId);
                        }
                        if (configTypeDef.credentials) {
                            updateNodeCredentials(configNode,configTypeDef.credentials,"node-config-input");
                        }
                        if (configTypeDef.oneditsave) {
                            configTypeDef.oneditsave.call(RED.nodes.node(configId));
                        }
                        validateNode(configNode);
                        for (var i=0;i<configNode.users.length;i++) {
                            var user = configNode.users[i];
                            validateNode(user);
                        }

                        RED.nodes.dirty(true);
                        $(this).dialog("close");

                    }
                },
                {
                    id: "node-config-dialog-cancel",
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
                var minWidth = $(this).dialog('option','minWidth');
                if ($(this).outerWidth() < minWidth) {
                    $(this).dialog('option','width',minWidth);
                }
                if (RED.view.state() != RED.state.EDITING) {
                    RED.keyboard.disable();
                }
            },
            close: function(e) {
                $(this).dialog('option','width','auto');
                $(this).dialog('option','height','auto');
                $("#dialog-config-form").html("");
                if (RED.view.state() != RED.state.EDITING) {
                    RED.keyboard.enable();
                }
                RED.sidebar.config.refresh();
            }
    });

    $( "#subflow-dialog" ).dialog({
        modal: true,
        autoOpen: false,
        dialogClass: "ui-dialog-no-close",
        closeOnEscape: false,
        minWidth: 500,
        width: 'auto',
        buttons: [
            {
                id: "subflow-dialog-ok",
                text: "Ok",
                click: function() {
                    if (editing_node) {
                        var i;
                        var changes = {};
                        var changed = false;
                        var wasDirty = RED.nodes.dirty();

                        var newName = $("#subflow-input-name").val();

                        if (newName != editing_node.name) {
                            changes['name'] = editing_node.name;
                            editing_node.name = newName;
                            changed = true;
                            $("#menu-item-workspace-menu-"+editing_node.id.replace(".","-")).text("Subflow: "+newName);
                        }

                        RED.palette.refresh();

                        if (changed) {
                            RED.nodes.eachNode(function(n) {
                                if (n.type == "subflow:"+editing_node.id) {
                                    n.changed = true;
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
                                changed:wasChanged
                            };

                            RED.history.push(historyEvent);
                        }
                        editing_node.dirty = true;
                        RED.view.redraw();
                    }
                    $( this ).dialog( "close" );
                }
            },
            {
                id: "subflow-dialog-cancel",
                text: "Cancel",
                click: function() {
                    $( this ).dialog( "close" );
                    editing_node = null;
                }
            }
        ],
        open: function(e) {
            RED.keyboard.disable();
            var minWidth = $(this).dialog('option','minWidth');
            if ($(this).outerWidth() < minWidth) {
                $(this).dialog('option','width',minWidth);
            }
        },
        close: function(e) {
            RED.keyboard.enable();

            if (RED.view.state() != RED.state.IMPORT_DRAGGING) {
                RED.view.state(RED.state.DEFAULT);
            }
            RED.sidebar.info.refresh(editing_node);
            editing_node = null;
        }
    });
    $("#subflow-dialog form" ).submit(function(e) { e.preventDefault();});


    function showEditSubflowDialog(subflow) {
        editing_node = subflow;
        RED.view.state(RED.state.EDITING);
        $("#subflow-input-name").val(subflow.name);
        var userCount = 0;
        var subflowType = "subflow:"+editing_node.id;

        RED.nodes.eachNode(function(n) {
            if (n.type === subflowType) {
                userCount++;
            }
        });

        $("#subflow-dialog-user-count").html("There "+(userCount==1?"is":"are")+" "+userCount+" instance"+(userCount==1?" ":"s")+" of this subflow").show();
        $("#subflow-dialog").dialog("option","title","Edit flow "+subflow.name).dialog( "open" );
    }



    return {
        edit: showEditDialog,
        editConfig: showEditConfigNodeDialog,
        editSubflow: showEditSubflowDialog,
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
            editor.$blockScrolling = Infinity;
            if (options.value) {
                session.setValue(options.value,-1);
            }
            return editor;
        }
    }
})();
