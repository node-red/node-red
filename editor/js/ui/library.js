/**
 * Copyright 2013, 2015 IBM Corp.
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
RED.library = (function() {
    
    
    function loadFlowLibrary() {
        $.getJSON("library/flows",function(data) {
            //console.log(data);

            var buildMenu = function(data,root) {
                var i;
                var li;
                var a;
                var ul = document.createElement("ul");
                ul.id = "menu-item-import-library-submenu";
                ul.className = "dropdown-menu";
                if (data.d) {
                    for (i in data.d) {
                        if (data.d.hasOwnProperty(i)) {
                            li = document.createElement("li");
                            li.className = "dropdown-submenu pull-left";
                            a = document.createElement("a");
                            a.href="#";
                            a.innerHTML = i;
                            li.appendChild(a);
                            li.appendChild(buildMenu(data.d[i],root+(root!==""?"/":"")+i));
                            ul.appendChild(li);
                        }
                    }
                }
                if (data.f) {
                    for (i in data.f) {
                        if (data.f.hasOwnProperty(i)) {
                            li = document.createElement("li");
                            a = document.createElement("a");
                            a.href="#";
                            a.innerHTML = data.f[i];
                            a.flowName = root+(root!==""?"/":"")+data.f[i];
                            a.onclick = function() {
                                $.get('library/flows/'+this.flowName, function(data) {
                                        RED.view.importNodes(data);
                                });
                            };
                            li.appendChild(a);
                            ul.appendChild(li);
                        }
                    }
                }
                return ul;
            };
            var menu = buildMenu(data,"");
            //TODO: need an api in RED.menu for this
            $("#menu-item-import-library-submenu").replaceWith(menu);
        });
    }
    
    function createUI(options) {
        var libraryData = {};
        var selectedLibraryItem = null;
        var libraryEditor = null;
        
        // Orion editor has set/getText
        // ACE editor has set/getValue
        // normalise to set/getValue
        if (options.editor.setText) {
            // Orion doesn't like having pos passed in, so proxy the call to drop it
            options.editor.setValue = function(text,pos) {
                options.editor.setText.call(options.editor,text);
            }
        }
        if (options.editor.getText) {
            options.editor.getValue = options.editor.getText;
        }
        
        function buildFileListItem(item) {
            var li = document.createElement("li");
            li.onmouseover = function(e) { $(this).addClass("list-hover"); };
            li.onmouseout = function(e) { $(this).removeClass("list-hover"); };
            return li;
        }
        
        function buildFileList(root,data) {
            var ul = document.createElement("ul");
            var li;
            for (var i=0;i<data.length;i++) {
                var v = data[i];
                if (typeof v === "string") {
                    // directory
                    li = buildFileListItem(v);
                    li.onclick = (function () {
                        var dirName = v;
                        return function(e) {
                            var bcli = $('<li class="active"><span class="divider">/</span> <a href="#">'+dirName+'</a></li>');
                            $("a",bcli).click(function(e) { 
                                $(this).parent().nextAll().remove();
                                $.getJSON("library/"+options.url+root+dirName,function(data) {
                                    $("#node-select-library").children().first().replaceWith(buildFileList(root+dirName+"/",data));
                                });
                                e.stopPropagation();
                            });
                            var bc = $("#node-dialog-library-breadcrumbs");
                            $(".active",bc).removeClass("active");
                            bc.append(bcli);
                            $.getJSON("library/"+options.url+root+dirName,function(data) {
                                    $("#node-select-library").children().first().replaceWith(buildFileList(root+dirName+"/",data));
                            });
                        }
                    })();
                    li.innerHTML = '<i class="fa fa-folder"></i> '+v+"</i>";
                    ul.appendChild(li);
                } else {
                    // file
                   li = buildFileListItem(v);
                   li.innerHTML = v.name;
                   li.onclick = (function() {
                       var item = v;
                       return function(e) {
                           $(".list-selected",ul).removeClass("list-selected");
                           $(this).addClass("list-selected");
                           $.get("library/"+options.url+root+item.fn, function(data) {
                                   selectedLibraryItem = item;
                                   libraryEditor.setValue(data,-1);
                           });
                       }
                   })();
                   ul.appendChild(li);
                }
            }
            return ul;
        }
    
        $('#node-input-name').addClass('input-append-left').css("width","65%").after(
            '<div class="btn-group" style="margin-left: 0px;">'+
            '<button id="node-input-'+options.type+'-lookup" class="btn input-append-right" data-toggle="dropdown"><i class="fa fa-book"></i> <i class="fa fa-caret-down"></i></button>'+
            '<ul class="dropdown-menu pull-right" role="menu">'+
            '<li><a id="node-input-'+options.type+'-menu-open-library" tabindex="-1" href="#">Open Library...</a></li>'+
            '<li><a id="node-input-'+options.type+'-menu-save-library" tabindex="-1" href="#">Save to Library...</a></li>'+
            '</ul></div>'
        );
    
        
        
        $('#node-input-'+options.type+'-menu-open-library').click(function(e) {
            $("#node-select-library").children().remove();
            var bc = $("#node-dialog-library-breadcrumbs");
            bc.children().first().nextAll().remove();
            libraryEditor.setValue('',-1);
            
            $.getJSON("library/"+options.url,function(data) {
                $("#node-select-library").append(buildFileList("/",data));
                $("#node-dialog-library-breadcrumbs a").click(function(e) {
                    $(this).parent().nextAll().remove();
                    $("#node-select-library").children().first().replaceWith(buildFileList("/",data));
                    e.stopPropagation();
                });
                $( "#node-dialog-library-lookup" ).dialog( "open" );
            });
            
            e.preventDefault();
        });
    
        $('#node-input-'+options.type+'-menu-save-library').click(function(e) {
            //var found = false;
            var name = $("#node-input-name").val().replace(/(^\s*)|(\s*$)/g,"");

            //var buildPathList = function(data,root) {
            //    var paths = [];
            //    if (data.d) {
            //        for (var i in data.d) {
            //            var dn = root+(root==""?"":"/")+i;
            //            var d = {
            //                label:dn,
            //                files:[]
            //            };
            //            for (var f in data.d[i].f) {
            //                d.files.push(data.d[i].f[f].fn.split("/").slice(-1)[0]);
            //            }
            //            paths.push(d);
            //            paths = paths.concat(buildPathList(data.d[i],root+(root==""?"":"/")+i));
            //        }
            //    }
            //    return paths;
            //};
            $("#node-dialog-library-save-folder").attr("value","");

            var filename = name.replace(/[^\w-]/g,"-");
            if (filename === "") {
                filename = "unnamed-"+options.type;
            }
            $("#node-dialog-library-save-filename").attr("value",filename+".js");

            //var paths = buildPathList(libraryData,"");
            //$("#node-dialog-library-save-folder").autocomplete({
            //        minLength: 0,
            //        source: paths,
            //        select: function( event, ui ) {
            //            $("#node-dialog-library-save-filename").autocomplete({
            //                    minLength: 0,
            //                    source: ui.item.files
            //            });
            //        }
            //});

            $( "#node-dialog-library-save" ).dialog( "open" );
            e.preventDefault();
        });
    
        libraryEditor = ace.edit('node-select-library-text');
        libraryEditor.setTheme("ace/theme/tomorrow");
        if (options.mode) {
            libraryEditor.getSession().setMode(options.mode);
        }
        libraryEditor.setOptions({
            readOnly: true,
            highlightActiveLine: false,
            highlightGutterLine: false
        });
        libraryEditor.renderer.$cursorLayer.element.style.opacity=0;
        libraryEditor.$blockScrolling = Infinity;
        
        $( "#node-dialog-library-lookup" ).dialog({
            title: options.type+" library",
            modal: true,
            autoOpen: false,
            width: 800,
            height: 450,
            buttons: [
                {
                    text: "Ok",
                    click: function() {
                        if (selectedLibraryItem) {
                            for (var i=0;i<options.fields.length;i++) {
                                var field = options.fields[i];
                                $("#node-input-"+field).val(selectedLibraryItem[field]);
                            }
                            options.editor.setValue(libraryEditor.getValue(),-1);
                        }
                        $( this ).dialog( "close" );
                    }
                },
                {
                    text: "Cancel",
                    click: function() {
                        $( this ).dialog( "close" );
                    }
                }
            ],
            open: function(e) {
                var form = $("form",this);
                form.height(form.parent().height()-30);
                $("#node-select-library-text").height("100%");
                $(".form-row:last-child",form).children().height(form.height()-60);
            },
            resize: function(e) {
                var form = $("form",this);
                form.height(form.parent().height()-30);
                $(".form-row:last-child",form).children().height(form.height()-60);
            }
        });
        
        function saveToLibrary(overwrite) {
            var name = $("#node-input-name").val().replace(/(^\s*)|(\s*$)/g,"");
            if (name === "") {
                name = "Unnamed "+options.type;
            }
            var filename = $("#node-dialog-library-save-filename").val().replace(/(^\s*)|(\s*$)/g,"");
            var pathname = $("#node-dialog-library-save-folder").val().replace(/(^\s*)|(\s*$)/g,"");
            if (filename === "" || !/.+\.js$/.test(filename)) {
                RED.notify("Invalid filename","warning");
                return;
            }
            var fullpath = pathname+(pathname===""?"":"/")+filename;
            if (!overwrite) {
                //var pathnameParts = pathname.split("/");
                //var exists = false;
                //var ds = libraryData;
                //for (var pnp in pathnameParts) {
                //    if (ds.d && pathnameParts[pnp] in ds.d) {
                //        ds = ds.d[pathnameParts[pnp]];
                //    } else {
                //        ds = null;
                //        break;
                //    }
                //}
                //if (ds && ds.f) {
                //    for (var f in ds.f) {
                //        if (ds.f[f].fn == fullpath) {
                //            exists = true;
                //            break;
                //        }
                //    }
                //}
                //if (exists) {
                //    $("#node-dialog-library-save-type").html(options.type);
                //    $("#node-dialog-library-save-name").html(fullpath);
                //    $("#node-dialog-library-save-confirm").dialog( "open" );
                //    return;
                //}
            }
            var queryArgs = [];
            var data = {};
            for (var i=0;i<options.fields.length;i++) {
                var field = options.fields[i];
                if (field == "name") {
                    data.name = name;
                } else {
                    data[field] = $("#node-input-"+field).val();
                }
            }
            
            data.text = options.editor.getValue();
            $.ajax({
                url:"library/"+options.url+'/'+fullpath,
                type: "POST",
                data: JSON.stringify(data),
                contentType: "application/json; charset=utf-8"
            }).done(function(data,textStatus,xhr) {
                RED.notify("Saved "+options.type,"success");
            }).fail(function(xhr,textStatus,err) {
                RED.notify("Saved failed: "+xhr.responseJSON.message,"error");
            });
        }
        $( "#node-dialog-library-save-confirm" ).dialog({
            title: "Save to library",
            modal: true,
            autoOpen: false,
            width: 530,
            height: 230,
            buttons: [
                {
                    text: "Ok",
                    click: function() {
                        saveToLibrary(true);
                        $( this ).dialog( "close" );
                    }
                },
                {
                    text: "Cancel",
                    click: function() {
                        $( this ).dialog( "close" );
                    }
                }
            ]
        });
        $( "#node-dialog-library-save" ).dialog({
            title: "Save to library",
            modal: true,
            autoOpen: false,
            width: 530,
            height: 230,
            buttons: [
                {
                    text: "Ok",
                    click: function() {
                        saveToLibrary(false);
                        $( this ).dialog( "close" );
                    }
                },
                {
                    text: "Cancel",
                    click: function() {
                        $( this ).dialog( "close" );
                    }
                }
            ]
        });

    }
    
    function exportFlow() {
        //TODO: don't rely on the main dialog
        var nns = RED.nodes.createExportableNodeSet(RED.view.selection().nodes);
        $("#dialog-form").html($("script[data-template-name='export-library-dialog']").html());
        $("#node-input-filename").attr('nodes',JSON.stringify(nns));
        $( "#dialog" ).dialog("option","title","Export nodes to library").dialog( "open" );
    }
    
    return {
        init: function() {
            RED.view.on("selection-changed",function(selection) {
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
            
            if (RED.settings.theme("menu.menu-item-import-library") !== false) { 
                loadFlowLibrary();
            }
        },
        create: createUI,
        loadFlowLibrary: loadFlowLibrary,
        
        export: exportFlow
    }
})();


