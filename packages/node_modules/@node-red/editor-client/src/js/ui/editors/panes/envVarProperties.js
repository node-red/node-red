;(function() {

    RED.editor.registerEditPane("editor-tab-envProperties", function(node) {
        return {
            label: RED._("editor-tab.envProperties"),
            name: RED._("editor-tab.envProperties"),
            iconClass: "fa fa-list",
            create: function(container) {
                var form = $('<form class="dialog-form form-horizontal"></form>').appendTo(container);
                var listContainer = $('<div class="form-row node-input-env-container-row"></div>').appendTo(form);
                this.list = $('<ol></ol>').appendTo(listContainer);
                RED.editor.envVarList.create(this.list, node);
            },
            resize: function(size) {
                this.list.editableList('height',size.height);
            },
            close: function() {

            },
            apply: function(editState) {
                var old_env = node.env;
                var new_env = [];

                if (/^subflow:/.test(node.type)) {
                    // Get the list of environment variables from the node properties
                    new_env = RED.subflow.exportSubflowInstanceEnv(node);
                }

                if (old_env && old_env.length) {
                    old_env.forEach(function (prop) {
                        if (prop.type === "conf-type" && prop.value) {
                            const stillInUse = new_env?.some((p) => p.type === "conf-type" && p.name === prop.name && p.value === prop.value);
                            if (!stillInUse) {
                                // Remove the node from the config node users
                                // Only for empty value or modified
                                const configNode = RED.nodes.node(prop.value);
                                if (configNode) {
                                    if (configNode.users.indexOf(node) !== -1) {
                                        configNode.users.splice(configNode.users.indexOf(node), 1);
                                        RED.events.emit('nodes:change', configNode)
                                    }
                                }
                            }
                        }
                    });
                }

                // Get the values from the Properties table tab
                var items = this.list.editableList('items');
                items.each(function (i,el) {
                    var data = el.data('data');
                    var item;
                    if (data.nameField && data.valueField) {
                        item = {
                            name: data.nameField.val(),
                            value: data.valueField.typedInput("value"),
                            type: data.valueField.typedInput("type")
                        }
                        if (item.name.trim() !== "") {
                            new_env.push(item);
                        }
                    }
                });

                if (new_env && new_env.length > 0) {
                    new_env.forEach(function(prop) {
                        if (prop.type === "cred") {
                            node.credentials = node.credentials || {_:{}};
                            node.credentials[prop.name] = prop.value;
                            node.credentials['has_'+prop.name] = (prop.value !== "");
                            if (prop.value !== '__PWRD__') {
                                editState.changed = true;
                            }
                            delete prop.value;
                        } else if (prop.type === "conf-type" && prop.value) {  
                            const configNode = RED.nodes.node(prop.value);
                            if (configNode) {
                                if (configNode.users.indexOf(node) === -1) {
                                    // Add the node to the config node users
                                    configNode.users.push(node);
                                    RED.events.emit('nodes:change', configNode);
                                }
                            }
                        }
                    });
                }
                if (!old_env && new_env.length === 0) {
                    delete node.env;
                } else if (!isSameObj(old_env, new_env)) {
                    editState.changes.env = node.env;
                    if (new_env.length === 0) {
                        delete node.env;
                    } else {
                        node.env = new_env;
                    }
                    editState.changed = true;
                }
            }
        }
    });
    function isSameObj(env0, env1) {
        return (JSON.stringify(env0) === JSON.stringify(env1));
    }
})();
