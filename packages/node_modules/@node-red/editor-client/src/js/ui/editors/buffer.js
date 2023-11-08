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

    var template = '<script type="text/x-red" data-template-name="_buffer"><div id="red-ui-editor-type-buffer-panels"><div id="red-ui-editor-type-buffer-panel-str" class="red-ui-panel"><div class="form-row" style="margin-bottom: 3px; text-align: right;"><button class="red-ui-editor-type-buffer-type red-ui-button red-ui-button-small"><i class="fa fa-exclamation-circle"></i> <span id="red-ui-editor-type-buffer-type-string" data-i18n="bufferEditor.modeString"></span><span id="red-ui-editor-type-buffer-type-array" data-i18n="bufferEditor.modeArray"></span></button></div><div class="form-row node-text-editor-row"><div class="node-text-editor" id="red-ui-editor-type-buffer-str"></div></div></div><div id="red-ui-editor-type-buffer-panel-bin" class="red-ui-panel"><div class="form-row node-text-editor-row" style="margin-top: 10px; margin-bottom:0;"><div class="node-text-editor" id="red-ui-editor-type-buffer-bin"></div></div></div></div></script>';

    function stringToUTF8Array(str) {
        var data = [];
        var i=0, l = str.length;
        for (i=0; i<l; i++) {
            var char = str.charCodeAt(i);
            if (char < 0x80) {
                data.push(char);
            } else if (char < 0x800) {
                data.push(0xc0 | (char >> 6));
                data.push(0x80 | (char & 0x3f));
            } else if (char < 0xd800 || char >= 0xe000) {
                data.push(0xe0 | (char >> 12));
                data.push(0x80 | ((char>>6) & 0x3f));
                data.push(0x80 | (char & 0x3f));
            } else {
                i++;
                char = 0x10000 + (((char & 0x3ff)<<10) | (str.charAt(i) & 0x3ff));
                data.push(0xf0 | (char >>18));
                data.push(0x80 | ((char>>12) & 0x3f));
                data.push(0x80 | ((char>>6) & 0x3f));
                data.push(0x80 | (char & 0x3f));
            }
        }
        return data;
    }


    var definition = {
        show: function(options) {
            var value = options.value;
            var onCancel = options.cancel;
            var onComplete = options.complete;
            var type = "_buffer"
            if ($("script[data-template-name='"+type+"']").length === 0) {
                $(template).appendTo("#red-ui-editor-node-configs");
            }
            RED.view.state(RED.state.EDITING);
            var bufferStringEditor = [];
            var bufferBinValue;

            var panels;

            var trayOptions = {
                title: options.title,
                focusElement: options.focusElement,
                width: "inherit",
                buttons: [
                    {
                        id: "node-dialog-cancel",
                        text: RED._("common.label.cancel"),
                        click: function() {
                            if (onCancel) { onCancel(); }
                            RED.tray.close();
                        }
                    },
                    {
                        id: "node-dialog-ok",
                        text: RED._("common.label.done"),
                        class: "primary",
                        click: function() {
                            bufferStringEditor.saveView();
                            if (onComplete) { onComplete(JSON.stringify(bufferBinValue),null,bufferStringEditor); }
                            RED.tray.close();
                        }
                    }
                ],
                resize: function(dimensions) {
                    var height = $("#dialog-form").height();
                    if (panels) {
                        panels.resize(height);
                    }
                },
                open: function(tray) {
                    var dialogForm = RED.editor.buildEditForm(tray.find('.red-ui-tray-body'),'dialog-form',type,'editor');
                    bufferStringEditor = RED.editor.createEditor({
                        id: 'red-ui-editor-type-buffer-str',
                        value: value||"",
                        stateId: RED.editor.generateViewStateId("buffer", options, ""),
                        focus: true,
                        mode:"ace/mode/text"
                    });

                    bufferBinEditor = RED.editor.createEditor({
                        id: 'red-ui-editor-type-buffer-bin',
                        value: "",
                        stateId: false,
                        focus: false,
                        mode:"ace/mode/text",
                        readOnly: true
                    });

                    var changeTimer;
                    var buildBuffer = function(data) {
                        var valid = true;
                        var isString = typeof data === 'string';
                        var binBuffer = [];
                        if (isString) {
                            bufferBinValue = stringToUTF8Array(data);
                        } else {
                            bufferBinValue = data;
                        }
                        var i=0,l=bufferBinValue.length;
                        var c = 0;
                        for(i=0;i<l;i++) {
                            var d = parseInt(Number(bufferBinValue[i]));
                            if (!isString && (isNaN(d) || d < 0 || d > 255)) {
                                valid = false;
                                break;
                            }
                            if (i>0) {
                                if (i%8 === 0) {
                                    if (i%16 === 0) {
                                        binBuffer.push("\n");
                                    } else {
                                        binBuffer.push("  ");
                                    }
                                } else {
                                    binBuffer.push(" ");
                                }
                            }
                            binBuffer.push((d<16?"0":"")+d.toString(16).toUpperCase());
                        }
                        if (valid) {
                            $("#red-ui-editor-type-buffer-type-string").toggle(isString);
                            $("#red-ui-editor-type-buffer-type-array").toggle(!isString);
                            bufferBinEditor.setValue(binBuffer.join(""),1);
                        }
                        return valid;
                    }
                    var bufferStringUpdate = function() {
                        var value = bufferStringEditor.getValue();
                        var isValidArray = false;
                        if (/^[\s]*\[[\s\S]*\][\s]*$/.test(value)) {
                            isValidArray = true;
                            try {
                                var data = JSON.parse(value);
                                isValidArray = buildBuffer(data);
                            } catch(err) {
                                isValidArray = false;
                            }
                        }
                        if (!isValidArray) {
                            buildBuffer(value);
                        }

                    }
                    bufferStringEditor.getSession().on('change', function() {
                        clearTimeout(changeTimer);
                        changeTimer = setTimeout(bufferStringUpdate,200);
                    });

                    bufferStringUpdate();

                    dialogForm.i18n();

                    panels = RED.panels.create({
                        id:"red-ui-editor-type-buffer-panels",
                        resize: function(p1Height,p2Height) {
                            var p1 = $("#red-ui-editor-type-buffer-panel-str");
                            p1Height -= $(p1.children()[0]).outerHeight(true);
                            var editorRow = $(p1.children()[1]);
                            p1Height -= (parseInt(editorRow.css("marginTop"))+parseInt(editorRow.css("marginBottom")));
                            $("#red-ui-editor-type-buffer-str").css("height",(p1Height-5)+"px");
                            bufferStringEditor.resize();

                            var p2 = $("#red-ui-editor-type-buffer-panel-bin");
                            editorRow = $(p2.children()[0]);
                            p2Height -= (parseInt(editorRow.css("marginTop"))+parseInt(editorRow.css("marginBottom")));
                            $("#red-ui-editor-type-buffer-bin").css("height",(p2Height-5)+"px");
                            bufferBinEditor.resize();
                        }
                    });

                    $(".red-ui-editor-type-buffer-type").on("click", function(e) {
                        e.preventDefault();
                        RED.sidebar.help.set(RED._("bufferEditor.modeDesc"));
                    })


                },
                close: function() {
                    if (options.onclose) {
                        options.onclose();
                    }
                    bufferStringEditor.destroy();
                    bufferBinEditor.destroy();
                },
                show: function() {}
            }
            RED.tray.show(trayOptions);
        }
    }
    RED.editor.registerTypeEditor("_buffer", definition);

})();
