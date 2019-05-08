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
RED.eventLog = (function() {

    var template = '<script type="text/x-red" data-template-name="_eventLog"><div class="form-row node-text-editor-row"><div style="height: 100%;min-height: 150px;" class="node-text-editor" id="red-ui-event-log-editor"></div></div></script>';

    var eventLogEditor;
    var backlog = [];
    var shown = false;

    function appendLogLine(line) {
        backlog.push(line);
        if (backlog.length > 500) {
            backlog = backlog.slice(-500);
        }
        if (eventLogEditor) {
            eventLogEditor.getSession().insert({
                row: eventLogEditor.getSession().getLength(),
                column: 0
            }, "\n" + line);
            eventLogEditor.scrollToLine(eventLogEditor.getSession().getLength());
        }
    }
    return {
        init: function() {
            $(template).appendTo("#red-ui-editor-node-configs");
            RED.actions.add("core:show-event-log",RED.eventLog.show);
        },
        show: function() {
            if (shown) {
                return;
            }
            shown = true;
            var type = "_eventLog"

            var trayOptions = {
                title: RED._("eventLog.title"),
                width: Infinity,
                buttons: [
                    {
                        id: "node-dialog-close",
                        text: RED._("common.label.close"),
                        click: function() {
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
                    eventLogEditor.resize();
                },
                open: function(tray) {
                    var trayBody = tray.find('.red-ui-tray-body');
                    var dialogForm = RED.editor.buildEditForm(tray.find('.red-ui-tray-body'),'dialog-form',type,'editor');
                    eventLogEditor = RED.editor.createEditor({
                        id: 'red-ui-event-log-editor',
                        value: backlog.join("\n"),
                        lineNumbers: false,
                        readOnly: true,
                        options: {
                            showPrintMargin: false
                        }
                    });
                    setTimeout(function() {
                        eventLogEditor.scrollToLine(eventLogEditor.getSession().getLength());
                    },200);
                    dialogForm.i18n();
                },
                close: function() {
                    eventLogEditor.destroy();
                    eventLogEditor = null;
                    shown = false;
                },
                show: function() {}
            }
            RED.tray.show(trayOptions);
        },
        log: function(id,payload) {
            var ts = (new Date(payload.ts)).toISOString()+" ";
            if (payload.type) {
                ts += "["+payload.type+"] "
            }
            if (payload.data) {
                var data = payload.data;
                if (data.endsWith('\n')) {
                    data = data.substring(0,data.length-1);
                }
                var lines = data.split(/\n/);
                lines.forEach(function(line) {
                    appendLogLine(ts+line);
                })
            }
        },
        startEvent: function(name) {
            backlog.push("");
            backlog.push("-----------------------------------------------------------");
            backlog.push((new Date()).toISOString()+" "+name);
            backlog.push("");
        }
    }
})();
