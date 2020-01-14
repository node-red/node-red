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
(function() {


    var template = '<script type="text/x-red" data-template-name="_text"><div class="form-row node-text-editor-row"><div style="height: 200px;min-height: 150px;" class="node-text-editor" id="node-input-text"></div></div></script>';

    var definition = {
        show: function(options) {
            var value = options.value;
            var onComplete = options.complete;
            var type = "_text"
            if ($("script[data-template-name='"+type+"']").length === 0) {
                $(template).appendTo("#red-ui-editor-node-configs");
            }
            RED.view.state(RED.state.EDITING);
            var expressionEditor;
            var changeTimer;

            var trayOptions = {
                title: options.title,
                width: options.width||"inherit",
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
                            onComplete(expressionEditor.getValue(),expressionEditor.getCursorPosition());
                            RED.tray.close();
                        }
                    }
                ],
                resize: function(dimensions) {
                    var rows = $("#dialog-form>div:not(.node-text-editor-row)");
                    var editorRow = $("#dialog-form>div.node-text-editor-row");
                    var height = $("#dialog-form").height();
                    // for (var i=0;i<rows.size();i++) {
                    //     height -= $(rows[i]).outerHeight(true);
                    // }
                    // height -= (parseInt($("#dialog-form").css("marginTop"))+parseInt($("#dialog-form").css("marginBottom")));
                    $(".node-text-editor").css("height",height+"px");
                    expressionEditor.resize();
                },
                open: function(tray) {
                    var trayBody = tray.find('.red-ui-tray-body');
                    var dialogForm = RED.editor.buildEditForm(tray.find('.red-ui-tray-body'),'dialog-form',type,'editor');
                    expressionEditor = RED.editor.createEditor({
                        id: 'node-input-text',
                        value: "",
                        mode:"ace/mode/"+(options.mode||"text")
                    });
                    expressionEditor.getSession().setValue(value||"",-1);
                    if (options.cursor) {
                        expressionEditor.gotoLine(options.cursor.row+1,options.cursor.column,false);
                    }
                },
                close: function() {
                    expressionEditor.destroy();
                    if (options.onclose) {
                        options.onclose();
                    }
                },
                show: function() {}
            }
            RED.tray.show(trayOptions);
        }
    }
    RED.editor.registerTypeEditor("_text", definition);
})();
