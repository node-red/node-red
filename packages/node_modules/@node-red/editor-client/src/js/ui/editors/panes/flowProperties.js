;(function() {

    RED.editor.registerEditPane("editor-tab-flow-properties", function(node) {
        return {
            label: RED._("editor-tab.properties"),
            name: RED._("editor-tab.properties"),
            iconClass: "fa fa-cog",
            create: function(container) {
                var dialogForm = $('<form id="dialog-form" class="form-horizontal"></form>').appendTo(container);
                $('<div class="form-row">'+
                  '<label for="node-input-name" data-i18n="[append]editor:common.label.name"><i class="fa fa-tag"></i> </label>'+
                  '<input type="text" id="node-input-name" data-i18n="[placeholder]common.label.name">'+
                  '</div>').appendTo(dialogForm);

                var row = $('<div class="form-row node-text-editor-row">'+
                            '<label for="node-input-info" data-i18n="editor:workspace.info" style="width:300px;"></label>'+
                            '<div style="min-height:150px;" class="node-text-editor" id="node-input-info"></div>'+
                            '</div>').appendTo(dialogForm);
                this.tabflowEditor = RED.editor.createEditor({
                    id: 'node-input-info',
                    mode: 'ace/mode/markdown',
                    value: ""
                });

                $('<input type="text" style="display: none;" />').prependTo(dialogForm);
                dialogForm.on("submit", function(e) { e.preventDefault();});

                $("#node-input-name").val(node.label);
                RED.text.bidi.prepareInput($("#node-input-name"));
                this.tabflowEditor.getSession().setValue(node.info || "", -1);
            },
            resize: function(size) {
                $("#node-input-info").css("height", (size.height-70)+"px");
                this.tabflowEditor.resize();
            },
            close: function() {
                this.tabflowEditor.destroy();
            },
            apply: function(editState) {
                var label = $( "#node-input-name" ).val();

                if (node.label != label) {
                    editState.changes.label = node.label;
                    editState.changed = true;
                    node.label = label;
                }

                var info = this.tabflowEditor.getValue();
                if (node.info !== info) {
                    editState.changes.info = node.info;
                    editState.changed = true;
                    node.info = info;
                }
                $("#red-ui-tab-"+(node.id.replace(".","-"))).toggleClass('red-ui-workspace-disabled',!!node.disabled);
            }
        }
    });
})();
