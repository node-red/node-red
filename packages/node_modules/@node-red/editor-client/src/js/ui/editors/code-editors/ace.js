/*
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

/**
* @namespace RED.editor.codeEditor.ace
*/
RED.editor.codeEditor.ace = (function() {

    const type = "ace";
    var initialised = false;
    var initOptions = {};

    function init(options) {
        initOptions = options || {}; 
        initialised = true;
        return initialised;
    }

    function create(options) {
        var editorSettings = RED.editor.codeEditor.settings || {};
        var el = options.element || $("#"+options.id)[0];
        var toolbarRow = $("<div>").appendTo(el);
        el = $("<div>").appendTo(el).addClass("red-ui-editor-text-container")[0];
        var editor = window.ace.edit(el);
        editor.setTheme(editorSettings.theme || initOptions.theme || "ace/theme/tomorrow");
        var session = editor.getSession();
        session.on("changeAnnotation", function () {
            var annotations = session.getAnnotations() || [];
            var i = annotations.length;
            var len = annotations.length;
            while (i--) {
                if (/doctype first\. Expected/.test(annotations[i].text)) { annotations.splice(i, 1); }
                else if (/Unexpected End of file\. Expected/.test(annotations[i].text)) { annotations.splice(i, 1); }
            }
            if (len > annotations.length) { session.setAnnotations(annotations); }
        });
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
                enableSnippets:true,
                tooltipFollowsMouse: false
            });
        }
        if (options.readOnly) {
            editor.setOption('readOnly',options.readOnly);
            editor.container.classList.add("ace_read-only");
        }
        if (options.hasOwnProperty('lineNumbers')) {
            editor.renderer.setOption('showGutter',options.lineNumbers);
        }
        editor.$blockScrolling = Infinity;
        if (options.value) {
            session.setValue(options.value,-1);
        }
        if (options.globals) {
            setTimeout(function() {
                if (!!session.$worker) {
                    session.$worker.send("setOptions", [{globals: options.globals, maxerr:1000}]);
                }
            },100);
        }
        if (!options.stateId && options.stateId !== false) {
            options.stateId = RED.editor.generateViewStateId("ace", options, (options.mode || options.title).split("/").pop());
        }
        if (options.mode === 'ace/mode/markdown') {
            $(el).addClass("red-ui-editor-text-container-toolbar");
            editor.toolbar = RED.editor.customEditTypes['_markdown'].buildToolbar(toolbarRow,editor);
            if (options.expandable !== false) {
                var expandButton = $('<button type="button" class="red-ui-button" style="float: right;"><i class="fa fa-expand"></i></button>').appendTo(editor.toolbar);
                RED.popover.tooltip(expandButton, RED._("markdownEditor.expand"));
                expandButton.on("click", function(e) {
                    e.preventDefault();
                    var value = editor.getValue();
                    RED.editor.editMarkdown({
                        value: value,
                        width: "Infinity",
                        stateId: options.stateId,
                        focus: true,
                        cancel: function () {
                            editor.focus();
                        },
                        complete: function(v,cursor) {
                            editor.setValue(v, -1);
                            setTimeout(function() {
                                editor.restoreView();
                                editor.focus();
                            },300);
                        }
                    })
                });
            }
            var helpButton = $('<button type="button" class="red-ui-editor-text-help red-ui-button red-ui-button-small"><i class="fa fa-question"></i></button>').appendTo($(el).parent());
            RED.popover.create({
                target: helpButton,
                trigger: 'click',
                size: "small",
                direction: "left",
                content: RED._("markdownEditor.format"),
                autoClose: 50
            });
            session.setUseWrapMode(true);
        }
        editor._destroy = editor.destroy;
        editor.destroy = function() {
            try {
                editor.saveView();
                editor._initState = null;
                this._destroy();
            } catch (e) { }
            $(el).remove();
            $(toolbarRow).remove();
        }
        editor.on("blur", function () {
            editor.focusMemory = false;
            editor.saveView();
        })
        editor.on("focus", function () {
            if (editor._initState) {
                editor.restoreView(editor._initState);
                editor._initState = null;
            }
        })
        editor.getView = function () {
            var session = editor.getSession();
            return {
                selection: session.selection.toJSON(),
                scrollTop: session.getScrollTop(),
                scrollLeft: session.getScrollLeft(),
                options: session.getOptions()
            }
        }
        editor.saveView = function () {
            if (!options.stateId) { return; } //only possible if created with a unique stateId
            window._editorStateAce = window._editorStateAce || {};
            var state = editor.getView();
            window._editorStateAce[options.stateId] = state;
            return state;
        }
        editor.restoreView = function (state) {
            if (!options.stateId) { return; } //only possible if created with a unique stateId
            window._editorStateAce = window._editorStateAce || {};
            var _state = state || window._editorStateAce[options.stateId];
            if (!_state) { return; } //no view state available
            try {
                var session = editor.getSession();
                session.setOptions(_state.options);
                session.selection.fromJSON(_state.selection);
                session.setScrollTop(_state.scrollTop);
                session.setScrollLeft(_state.scrollLeft);
                editor._initState = _state;
            } catch (error) {
                delete window._editorStateMonaco[options.stateId];
            }
        };
        editor.restoreView();
        editor.type = type;
        return editor;
    }

    return {
        /**
         * Editor type
         * @memberof RED.editor.codeEditor.ace
         */
         get type() { return type; },
         /**
          * Editor initialised
         * @memberof RED.editor.codeEditor.ace
         */
        get initialised() { return initialised; },
        /**
         * Initialise code editor
         * @param {object} options - initialisation options
         * @memberof RED.editor.codeEditor.ace
         */
         init: init,
         /**
          * Create a code editor
          * @param {object} options - the editor options
          * @memberof RED.editor.codeEditor.ace
          */
         create: create
    }
})();