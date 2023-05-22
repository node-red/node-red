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


    var template = '<script type="text/x-red" data-template-name="_expression">'+
    '<div id="red-ui-editor-type-expression-panels">'+
        '<div id="red-ui-editor-type-expression-panel-expr" class="red-ui-panel">'+
            '<div class="form-row" style="margin-bottom: 3px; text-align: right;"><button class="red-ui-editor-type-expression-legacy red-ui-button red-ui-button-small"><i class="fa fa-exclamation-circle"></i> <span data-i18n="expressionEditor.compatMode"></span></button><button id="red-ui-editor-type-expression-reformat" class="red-ui-button red-ui-button-small"><span data-i18n="expressionEditor.format"></span></button></div>'+
            '<div class="form-row node-text-editor-row"><div class="node-text-editor" id="red-ui-editor-type-expression"></div></div>'+
        '</div>'+
        '<div id="red-ui-editor-type-expression-panel-info" class="red-ui-panel">'+
            '<div class="form-row">'+
                '<ul id="red-ui-editor-type-expression-tabs"></ul>'+
                '<div id="red-ui-editor-type-expression-tab-help" class="red-ui-editor-type-expression-tab-content hide">'+
                    '<div>'+
                        '<select id="red-ui-editor-type-expression-func"></select>'+
                        '<button id="red-ui-editor-type-expression-func-insert" class="red-ui-button" data-i18n="expressionEditor.insert"></button>'+
                    '</div>'+
                    '<div id="red-ui-editor-type-expression-help"></div>'+
                '</div>'+
                '<div id="red-ui-editor-type-expression-tab-test" class="red-ui-editor-type-expression-tab-content hide">'+
                    '<div>'+
                        '<span style="display: inline-block; width: calc(50% - 5px);"><span data-i18n="expressionEditor.data"></span><button style="float: right; margin-right: 5px;" id="node-input-example-reformat" class="red-ui-button red-ui-button-small"><span data-i18n="jsonEditor.format"></span></button></span>'+
                        '<span style="display: inline-block; margin-left: 10px; width: calc(50% - 5px);" data-i18n="expressionEditor.result"></span>'+
                    '</div>'+
                    '<div style="display: inline-block; width: calc(50% - 5px);" class="node-text-editor" id="red-ui-editor-type-expression-test-data"></div>'+
                    '<div style="display: inline-block; margin-left: 10px;  width:calc(50% - 5px);" class="node-text-editor" id="red-ui-editor-type-expression-test-result"></div>'+
                '</div>'+
            '</div>'+
        '</div>'+
    '</div>'+
    '</script>';
    var expressionTestCache = {};

    var definition = {
        show: function(options) {
            var expressionTestCacheId = options.parent||"_";
            var value = options.value;
            var onCancel = options.cancel;
            var onComplete = options.complete;
            var type = "_expression"
            if ($("script[data-template-name='"+type+"']").length === 0) {
                $(template).appendTo("#red-ui-editor-node-configs");
            }
            RED.view.state(RED.state.EDITING);
            var expressionEditor;
            var testDataEditor;
            var testResultEditor
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
                            if(onCancel) { onCancel(); }
                            RED.tray.close();
                        }
                    },
                    {
                        id: "node-dialog-ok",
                        text: RED._("common.label.done"),
                        class: "primary",
                        click: function() {
                            $("#red-ui-editor-type-expression-help").text("");
                            expressionEditor.saveView();
                            if (onComplete) { onComplete(expressionEditor.getValue(),expressionEditor.getCursorPosition(),expressionEditor); }
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
                    var trayBody = tray.find('.red-ui-tray-body');
                    trayBody.addClass("red-ui-editor-type-expression")
                    var dialogForm = RED.editor.buildEditForm(tray.find('.red-ui-tray-body'),'dialog-form','_expression','editor');
                    var funcSelect = $("#red-ui-editor-type-expression-func");
                    Object.keys(jsonata.functions).forEach(function(f) {
                        funcSelect.append($("<option></option>").val(f).text(f));
                    })
                    funcSelect.on("change", function(e) {
                        var f = $(this).val();
                        var args = RED._('jsonata:'+f+".args",{defaultValue:''});
                        var title = "<h5>"+f+"("+args+")</h5>";
                        var body = RED.utils.renderMarkdown(RED._('jsonata:'+f+'.desc',{defaultValue:''}));
                        $("#red-ui-editor-type-expression-help").html(title+"<p>"+body+"</p>");

                    })
                    expressionEditor = RED.editor.createEditor({
                        id: 'red-ui-editor-type-expression',
                        value: "",
                        mode:"ace/mode/jsonata",
                        stateId: options.stateId,
                        focus: true,
                        options: {
                            enableBasicAutocompletion:true,
                            enableSnippets:true,
                            enableLiveAutocompletion: true
                        }
                    });
                    var currentToken = null;
                    var currentTokenPos = -1;
                    var currentFunctionMarker = null;

                    expressionEditor.getSession().setValue(value||"",-1);
                    //ace only (monaco has jsonata tokeniser)
                    if(expressionEditor.type == "ace") {
                        expressionEditor.on("changeSelection", function() {
                            var c = expressionEditor.getCursorPosition();
                            var token = expressionEditor.getSession().getTokenAt(c.row,c.column);
                            if (token !== currentToken || (token && /paren/.test(token.type) && c.column !== currentTokenPos)) {
                                currentToken = token;
                                var r,p;
                                var scopedFunction = null;
                                if (token && token.type === 'keyword') {
                                    r = c.row;
                                    scopedFunction = token;
                                } else {
                                    var depth = 0;
                                    var next = false;
                                    if (token) {
                                        if (token.type === 'paren.rparen') {
                                            // If this is a block of parens ')))', set
                                            // depth to offset against the cursor position
                                            // within the block
                                            currentTokenPos = c.column;
                                            depth = c.column - (token.start + token.value.length);
                                        }
                                        r = c.row;
                                        p = token.index;
                                    } else {
                                        r = c.row-1;
                                        p = -1;
                                    }
                                    while ( scopedFunction === null && r > -1) {
                                        var rowTokens = expressionEditor.getSession().getTokens(r);
                                        if (p === -1) {
                                            p = rowTokens.length-1;
                                        }
                                        while (p > -1) {
                                            var type = rowTokens[p].type;
                                            if (next) {
                                                if (type === 'keyword') {
                                                    scopedFunction = rowTokens[p];
                                                    // console.log("HIT",scopedFunction);
                                                    break;
                                                }
                                                next = false;
                                            }
                                            if (type === 'paren.lparen') {
                                                depth-=rowTokens[p].value.length;
                                            } else if (type === 'paren.rparen') {
                                                depth+=rowTokens[p].value.length;
                                            }
                                            if (depth < 0) {
                                                next = true;
                                                depth = 0;
                                            }
                                            // console.log(r,p,depth,next,rowTokens[p]);
                                            p--;
                                        }
                                        if (!scopedFunction) {
                                            r--;
                                        }
                                    }
                                }
                                expressionEditor.session.removeMarker(currentFunctionMarker);
                                if (scopedFunction) {
                                //console.log(token,.map(function(t) { return t.type}));
                                    funcSelect.val(scopedFunction.value).trigger("change");
                                }
                            }
                        });
                    }
                    dialogForm.i18n();
                    $("#red-ui-editor-type-expression-func-insert").on("click", function(e) {
                        e.preventDefault();
                        var pos = expressionEditor.getCursorPosition();
                        var f = funcSelect.val();
                        var snippet = jsonata.getFunctionSnippet(f);
                        expressionEditor.insertSnippet(snippet);
                        expressionEditor.focus();
                    });
                    $("#red-ui-editor-type-expression-reformat").on("click", function(evt) {
                        evt.preventDefault();
                        var v = expressionEditor.getValue()||"";
                        try {
                            v = jsonata.format(v);
                        } catch(err) {
                            // TODO: do an optimistic auto-format
                        }
                        expressionEditor.getSession().setValue(v||"",-1);
                    });
                    funcSelect.change();

                    var tabs = RED.tabs.create({
                        element: $("#red-ui-editor-type-expression-tabs"),
                        onchange:function(tab) {
                            $(".red-ui-editor-type-expression-tab-content").hide();
                            tab.content.show();
                            trayOptions.resize();
                        }
                    })

                    tabs.addTab({
                        id: 'expression-help',
                        label: RED._('expressionEditor.functionReference'),
                        content: $("#red-ui-editor-type-expression-tab-help")
                    });
                    tabs.addTab({
                        id: 'expression-tests',
                        label: RED._('expressionEditor.test'),
                        content: $("#red-ui-editor-type-expression-tab-test")
                    });
                    testDataEditor = RED.editor.createEditor({
                        id: 'red-ui-editor-type-expression-test-data',
                        value: expressionTestCache[expressionTestCacheId] || '{\n    "payload": "hello world"\n}',
                        stateId: false,
                        focus: false,
                        mode:"ace/mode/json",
                        lineNumbers: false
                    });
                    var changeTimer;
                    $(".red-ui-editor-type-expression-legacy").on("click", function(e) {
                        e.preventDefault();
                        RED.sidebar.help.set(RED._("expressionEditor.compatModeDesc"));
                    })
                    var testExpression = function() {
                        var value = testDataEditor.getValue();
                        var parsedData;
                        var currentExpression = expressionEditor.getValue();
                        var expr;
                        var usesContext = false;
                        var usesEnv = false;
                        var usesMoment = false;
                        var usesClone = false;
                        var legacyMode = /(^|[^a-zA-Z0-9_'".])msg([^a-zA-Z0-9_'"]|$)/.test(currentExpression);
                        $(".red-ui-editor-type-expression-legacy").toggle(legacyMode);
                        try {
                            expr = jsonata(currentExpression);
                            expr.assign('flowContext',function(val) {
                                usesContext = true;
                                return null;
                            });
                            expr.assign('globalContext',function(val) {
                                usesContext = true;
                                return null;
                            });
                            expr.assign("env", function(name) {
                                usesEnv = true;
                                return null;
                            });
                            expr.assign("moment", function(name) {
                                usesMoment = true;
                                return null;
                            });
                            expr.assign("clone", function(name) {
                                usesClone = true;
                                return null;
                            });
                        } catch(err) {
                            testResultEditor.setValue(RED._("expressionEditor.errors.invalid-expr",{message:err.message}),-1);
                            return;
                        }
                        try {
                            parsedData = JSON.parse(value);
                        } catch(err) {
                            testResultEditor.setValue(RED._("expressionEditor.errors.invalid-msg",{message:err.toString()}))
                            return;
                        }

                        try {
                            expr.evaluate(legacyMode?{msg:parsedData}:parsedData, null, (err, result) => {
                                if (err) {
                                    testResultEditor.setValue(RED._("expressionEditor.errors.eval",{message:err.message}),-1);
                                } else {
                                    if (usesContext) {
                                        testResultEditor.setValue(RED._("expressionEditor.errors.context-unsupported"),-1);
                                        return;
                                    }
                                    if (usesEnv) {
                                        testResultEditor.setValue(RED._("expressionEditor.errors.env-unsupported"),-1);
                                        return;
                                    }
                                    if (usesMoment) {
                                        testResultEditor.setValue(RED._("expressionEditor.errors.moment-unsupported"),-1);
                                        return;
                                    }
                                    if (usesClone) {
                                        testResultEditor.setValue(RED._("expressionEditor.errors.clone-unsupported"),-1);
                                        return;
                                    }
        
                                    var formattedResult;
                                    if (result !== undefined) {
                                        formattedResult = JSON.stringify(result,null,4);
                                    } else {
                                        formattedResult = RED._("expressionEditor.noMatch");
                                    }
                                    testResultEditor.setValue(formattedResult,-1);
                                }
                            });
                        } catch(err) {                            
                            testResultEditor.setValue(RED._("expressionEditor.errors.eval",{message:err.message}),-1);
                        }
                    }

                    testDataEditor.getSession().on('change', function() {
                        clearTimeout(changeTimer);
                        changeTimer = setTimeout(testExpression,200);
                        expressionTestCache[expressionTestCacheId] = testDataEditor.getValue();
                    });
                    expressionEditor.getSession().on('change', function() {
                        clearTimeout(changeTimer);
                        changeTimer = setTimeout(testExpression,200);
                    });

                    testResultEditor = RED.editor.createEditor({
                        id: 'red-ui-editor-type-expression-test-result',
                        value: "",
                        stateId: false,
                        focus: false,
                        mode:"ace/mode/json",
                        lineNumbers: false,
                        readOnly: true
                    });
                    panels = RED.panels.create({
                        id:"red-ui-editor-type-expression-panels",
                        resize: function(p1Height,p2Height) {
                            var p1 = $("#red-ui-editor-type-expression-panel-expr");
                            p1Height -= $(p1.children()[0]).outerHeight(true);
                            var editorRow = $(p1.children()[1]);
                            p1Height -= (parseInt(editorRow.css("marginTop"))+parseInt(editorRow.css("marginBottom")));
                            $("#red-ui-editor-type-expression").css("height",(p1Height-5)+"px");
                            expressionEditor.resize();

                            var p2 = $("#red-ui-editor-type-expression-panel-info > .form-row > div:first-child");
                            p2Height -= p2.outerHeight(true) + 20;
                            $(".red-ui-editor-type-expression-tab-content").height(p2Height);
                            $("#red-ui-editor-type-expression-test-data").css("height",(p2Height-25)+"px");
                            testDataEditor.resize();
                            $("#red-ui-editor-type-expression-test-result").css("height",(p2Height-25)+"px");
                            testResultEditor.resize();
                        }
                    });

                    $("#node-input-example-reformat").on("click", function(evt) {
                        evt.preventDefault();
                        var v = testDataEditor.getValue()||"";
                        try {
                            v = JSON.stringify(JSON.parse(v),null,4);
                        } catch(err) {
                            // TODO: do an optimistic auto-format
                        }
                        testDataEditor.getSession().setValue(v||"",-1);
                    });

                    testExpression();
                },
                close: function() {
                    if (options.onclose) {
                        options.onclose();
                    }
                    expressionEditor.destroy();
                    testDataEditor.destroy();
                    testResultEditor.destroy();
                },
                show: function() {}
            }
            RED.tray.show(trayOptions);
        }
    }
    RED.editor.registerTypeEditor("_expression", definition);
})();
