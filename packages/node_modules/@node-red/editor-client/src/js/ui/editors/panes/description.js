;(function() {

    RED.editor.registerEditPane("editor-tab-description", function(node) {
        return {
            label: RED._("editor-tab.description"),
            name: RED._("editor-tab.description"),
            iconClass: "fa fa-file-text-o",

            create: function(container) {
                this.editor = buildDescriptionForm(container,node);
            },
            resize: function(size) {
                this.editor.resize();
            },
            close: function() {
                this.editor.destroy();
                this.editor = null;
            },
            show: function() {
                this.editor.focus();
            },
            apply: function(editState) {
                var oldInfo = node.info;
                var newInfo = this.editor.getValue();
                if (!!oldInfo) {
                    // Has existing info property
                    if (newInfo.trim() === "") {
                        // New value is blank - remove the property
                        editState.changed = true;
                        editState.changes.info = oldInfo;
                        delete node.info;
                    } else if (newInfo !== oldInfo) {
                        // New value is different
                        editState.changed = true;
                        editState.changes.info = oldInfo;
                        node.info = newInfo;
                    }
                } else {
                    // No existing info
                    if (newInfo.trim() !== "") {
                        // New value is not blank
                        editState.changed = true;
                        editState.changes.info = undefined;
                        node.info = newInfo;
                    }
                }
            }
        }
    });

    function buildDescriptionForm(container,node) {
        var dialogForm = $('<form class="dialog-form form-horizontal" autocomplete="off"></form>').appendTo(container);
        var toolbarRow = $('<div></div>').appendTo(dialogForm);
        var row = $('<div class="form-row node-text-editor-row" style="position:relative; padding-top: 4px; height: 100%"></div>').appendTo(dialogForm);
        var editorId = "node-info-input-info-editor-"+Math.floor(1000*Math.random());
        $('<div style="height: 100%" class="node-text-editor" id="'+editorId+'" ></div>').appendTo(row);
        var nodeInfoEditor = RED.editor.createEditor({
            id: editorId,
            mode: 'ace/mode/markdown',
            stateId: RED.editor.generateViewStateId("node", node, "nodeinfo"),
            value: node.info || ""
        });
        node.infoEditor = nodeInfoEditor;
        return nodeInfoEditor;
    }

})();
