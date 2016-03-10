/**
 * Copyright 2015 IBM Corp.
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


RED.clipboard = (function() {

    var dialog;
    var dialogContainer;
    var exportNodesDialog;
    var importNodesDialog;

    function setupDialogs() {
        dialog = $('<div id="clipboard-dialog" class="hide"><form class="dialog-form form-horizontal"></form></div>')
            .appendTo("body")
            .dialog({
                modal: true,
                autoOpen: false,
                width: 500,
                resizable: false,
                buttons: [
                    {
                        id: "clipboard-dialog-ok",
                        text: RED._("common.label.ok"),
                        click: function() {
                            RED.view.importNodes($("#clipboard-import").val());
                            $( this ).dialog( "close" );
                        }
                    },
                    {
                        id: "clipboard-dialog-cancel",
                        text: RED._("common.label.cancel"),
                        click: function() {
                            $( this ).dialog( "close" );
                        }
                    },
                    {
                        id: "clipboard-dialog-close",
                        text: RED._("common.label.close"),
                        click: function() {
                            $( this ).dialog( "close" );
                        }
                    }
                ],
                open: function(e) {
                    $(this).parent().find(".ui-dialog-titlebar-close").hide();
                    RED.keyboard.disable();
                },
                close: function(e) {
                    RED.keyboard.enable();
                }
            });

        dialogContainer = dialog.children(".dialog-form");

        exportNodesDialog = '<div class="form-row">'+
            '<label for="node-input-export" style="display: block; width:100%;"><i class="fa fa-clipboard"></i> '+RED._("clipboard.nodes")+'</label>'+
            '<textarea readonly style="resize: none; width: 100%; border-radius: 0px;font-family: monospace; font-size: 12px; background:#eee; padding-left: 0.5em; box-sizing:border-box;" id="clipboard-export" rows="5"></textarea>'+
            '</div>'+
            '<div class="form-tips">'+
            RED._("clipboard.selectNodes")+
            '</div>';

        importNodesDialog = '<div class="form-row">'+
            '<textarea style="resize: none; width: 100%; border-radius: 0px;font-family: monospace; font-size: 12px; background:#eee; padding-left: 0.5em; box-sizing:border-box;" id="clipboard-import" rows="5" placeholder="'+
            RED._("clipboard.pasteNodes")+
            '"></textarea>'+
            '</div>';
    }

    function validateImport() {
        var importInput = $("#clipboard-import");
        var v = importInput.val();
        v = v.substring(v.indexOf('['),v.lastIndexOf(']')+1);
        try {
            JSON.parse(v);
            importInput.removeClass("input-error");
            importInput.val(v);
            $("#clipboard-dialog-ok").button("enable");
        } catch(err) {
            if (v !== "") {
                importInput.addClass("input-error");
            }
            $("#clipboard-dialog-ok").button("disable");
        }
    }

    function importNodes() {
        dialogContainer.empty();
        dialogContainer.append($(importNodesDialog));
        $("#clipboard-dialog-ok").show();
        $("#clipboard-dialog-cancel").show();
        $("#clipboard-dialog-close").hide();
        $("#clipboard-dialog-ok").button("disable");
        $("#clipboard-import").keyup(validateImport);
        $("#clipboard-import").on('paste',function() { setTimeout(validateImport,10)});

        dialog.dialog("option","title",RED._("clipboard.importNodes")).dialog("open");
    }

    function exportNodes() {
        dialogContainer.empty();
        dialogContainer.append($(exportNodesDialog));
        $("#clipboard-dialog-ok").hide();
        $("#clipboard-dialog-cancel").hide();
        $("#clipboard-dialog-close").show();
        var selection = RED.view.selection();
        if (selection.nodes) {
            var nns = RED.nodes.createExportableNodeSet(selection.nodes);
            $("#clipboard-export")
                .val(JSON.stringify(nns))
                .focus(function() {
                    var textarea = $(this);
                    textarea.select();
                    textarea.mouseup(function() {
                        textarea.unbind("mouseup");
                        return false;
                    })
                });
            dialog.dialog("option","title",RED._("clipboard.exportNodes")).dialog( "open" );
        }
    }

    function hideDropTarget() {
        $("#dropTarget").hide();
        RED.keyboard.remove(/* ESCAPE */ 27);
    }

    return {
        init: function() {
            setupDialogs();
            RED.events.on("view:selection-changed",function(selection) {
                if (!selection.nodes) {
                    RED.menu.setDisabled("menu-item-export",true);
                    RED.menu.setDisabled("menu-item-export-clipboard",true);
                    RED.menu.setDisabled("menu-item-export-library",true);
                } else {
                    RED.menu.setDisabled("menu-item-export",false);
                    RED.menu.setDisabled("menu-item-export-clipboard",false);
                    RED.menu.setDisabled("menu-item-export-library",false);
                }
            });
            RED.keyboard.add(/* e */ 69,{ctrl:true},function(){exportNodes();d3.event.preventDefault();});
            RED.keyboard.add(/* i */ 73,{ctrl:true},function(){importNodes();d3.event.preventDefault();});

            $('#chart').on("dragenter",function(event) {
                if ($.inArray("text/plain",event.originalEvent.dataTransfer.types) != -1) {
                    $("#dropTarget").css({display:'table'});
                    RED.keyboard.add(/* ESCAPE */ 27,hideDropTarget);
                }
            });

            $('#dropTarget').on("dragover",function(event) {
                if ($.inArray("text/plain",event.originalEvent.dataTransfer.types) != -1) {
                    event.preventDefault();
                }
            })
            .on("dragleave",function(event) {
                hideDropTarget();
            })
            .on("drop",function(event) {
                var data = event.originalEvent.dataTransfer.getData("text/plain");
                hideDropTarget();
                data = data.substring(data.indexOf('['),data.lastIndexOf(']')+1);
                RED.view.importNodes(data);
                event.preventDefault();
            });

        },
        import: importNodes,
        export: exportNodes
    }
})();
