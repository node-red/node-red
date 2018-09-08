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
RED.editor.types._json = (function() {


    var template = '<script type="text/x-red" data-template-name="_json"><div class="form-row" style="margin-bottom: 3px; text-align: right;"><button id="node-input-json-reformat" class="editor-button editor-button-small"><span data-i18n="jsonEditor.format"></span></button></div><div class="form-row node-text-editor-row"><div style="height: 200px;min-height: 150px;" class="node-text-editor" id="node-input-json"></div></div></script>';

    return {
        init: function() {
            $(template).appendTo(document.body);
        },
        show: function(options) {
            var value = options.value;
            var onComplete = options.complete;
            var type = "_json"
            RED.view.state(RED.state.EDITING);
            var expressionEditor;
            var changeTimer;

            var checkValid = function() {
                var v = expressionEditor.getValue();
                try {
                    JSON.parse(v);
                    $("#node-dialog-ok").removeClass('disabled');
                    return true;
                } catch(err) {
                    $("#node-dialog-ok").addClass('disabled');
                    return false;
                }
            }
            var trayOptions = {
                title: options.title,
                width: "inherit",
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
                            if (options.requireValid && !checkValid()) {
                                return;
                            }
                            onComplete(expressionEditor.getValue());
                            RED.tray.close();
                        }
                    }
                ],
                resize: function(dimensions) {
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
                    var dialogForm = RED.editor.buildEditForm(tray.find('.editor-tray-body'),'dialog-form',type,'editor');
                    expressionEditor = RED.editor.createEditor({
                        id: 'node-input-json',
                        value: "",
                        mode:"ace/mode/json"
                    });
                    expressionEditor.getSession().setValue(value||"",-1);
                    if (options.requireValid) {
                        expressionEditor.getSession().on('change', function() {
                            clearTimeout(changeTimer);
                            changeTimer = setTimeout(checkValid,200);
                        });
                        checkValid();
                    }
                    $("#node-input-json-reformat").click(function(evt) {
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
})();
