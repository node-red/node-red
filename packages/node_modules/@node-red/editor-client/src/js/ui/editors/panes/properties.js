;(function() {

    RED.editor.registerEditPane("editor-tab-properties", function(node) {
        return {
            label: RED._("editor-tab.properties"),
            name: RED._("editor-tab.properties"),
            iconClass: "fa fa-cog",
            create: function(container) {

                var nodeType = node.type;
                if (node.type === "subflow") {
                    nodeType = "subflow-template";
                } else if (node.type.substring(0,8) == "subflow:") {
                    nodeType = "subflow";
                }

                var i18nNamespace;
                if (node._def.set.module === "node-red") {
                    i18nNamespace = "node-red";
                } else {
                    i18nNamespace = node._def.set.id;
                }

                var formStyle = "dialog-form";
                this.inputClass = "node-input";
                if (node._def.category === "config" && nodeType !== "group") {
                    this.inputClass = "node-config-input";
                    formStyle = "node-config-dialog-edit-form";
                }
                RED.editor.buildEditForm(container,formStyle,nodeType,i18nNamespace,node);
            },
            resize: function(size) {
                if (node && node._def.oneditresize) {
                    try {
                        node._def.oneditresize.call(node,size);
                    } catch(err) {
                        console.log("oneditresize",node.id,node.type,err.toString());
                    }
                }
            },
            close: function() {

            },
            apply: function(editState) {
                var newValue;
                var d;
                if (node._def.defaults) {
                    for (d in node._def.defaults) {
                        if (node._def.defaults.hasOwnProperty(d)) {
                            var input = $("#"+this.inputClass+"-"+d);
                            if (input.attr('type') === "checkbox") {
                                newValue = input.prop('checked');
                            } else if (input.prop("nodeName") === "select" && input.attr("multiple") === "multiple") {
                                // An empty select-multiple box returns null.
                                // Need to treat that as an empty array.
                                newValue = input.val();
                                if (newValue == null) {
                                    newValue = [];
                                }
                            } else if ("format" in node._def.defaults[d] && node._def.defaults[d].format !== "" && input[0].nodeName === "DIV") {
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
                                        editState.outputMap = JSON.parse(newValue);
                                        var outputCount = 0;
                                        var outputsChanged = false;
                                        var keys = Object.keys(editState.outputMap);
                                        keys.forEach(function(p) {
                                            if (isNaN(p)) {
                                                // New output;
                                                outputCount ++;
                                                delete editState.outputMap[p];
                                            } else {
                                                editState.outputMap[p] = editState.outputMap[p]+"";
                                                if (editState.outputMap[p] !== "-1") {
                                                    outputCount++;
                                                    if (editState.outputMap[p] !== p) {
                                                        // Output moved
                                                        outputsChanged = true;
                                                    } else {
                                                        delete editState.outputMap[p];
                                                    }
                                                } else {
                                                    // Output removed
                                                    outputsChanged = true;
                                                }
                                            }
                                        });

                                        newValue = outputCount;
                                        if (outputsChanged) {
                                            editState.changed = true;
                                        }
                                    } else {
                                        newValue = parseInt(newValue);
                                    }
                                }
                                if (node._def.defaults[d].type) {
                                    if (newValue == "_ADD_") {
                                        newValue = "";
                                    }
                                }
                                if (!isEqual(node[d], newValue)) {
                                    if (node._def.defaults[d].type) {
                                        // Change to a related config node
                                        var configNode = RED.nodes.node(node[d]);
                                        if (configNode) {
                                            var users = configNode.users;
                                            users.splice(users.indexOf(node),1);
                                            RED.events.emit("nodes:change",configNode);
                                        }
                                        configNode = RED.nodes.node(newValue);
                                        if (configNode) {
                                            configNode.users.push(node);
                                            RED.events.emit("nodes:change",configNode);
                                        }
                                    }
                                    editState.changes[d] = node[d];
                                    node[d] = newValue;
                                    editState.changed = true;
                                }
                            }
                        }
                    }
                }
                if (node._def.credentials) {
                    var credDefinition = node._def.credentials;
                    var credsChanged = updateNodeCredentials(node,credDefinition,this.inputClass);
                    editState.changed = editState.changed || credsChanged;
                }
            }
        }
    });

    /**
     * Compares `newValue` with `originalValue` for equality.  
     * @param {*} originalValue Original value
     * @param {*} newValue New value
     * @returns {boolean} true if originalValue equals newValue, otherwise false
     */
     function isEqual(originalValue, newValue) {
        try {
            if(originalValue == newValue) {
                return true; 
            }
            return JSON.stringify(originalValue) === JSON.stringify(newValue);
        } catch (err) {
            return false;
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
        if (!node.credentials) {
            node.credentials = {_:{}};
        } else if (!node.credentials._) {
            node.credentials._ = {};
        }

        for (var cred in credDefinition) {
            if (credDefinition.hasOwnProperty(cred)) {
                var input = $("#" + prefix + '-' + cred);
                if (input.length > 0) {
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
        }
        return changed;
    }


})();
