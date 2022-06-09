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
RED.library = (function() {

    var loadLibraryBrowser;
    var saveLibraryBrowser;
    var libraryEditor;
    var activeLibrary;

    var _libraryLookup = '<div id="red-ui-library-dialog-load" class="hide">'+
        '<form class="form-horizontal">'+
            '<div class="red-ui-library-dialog-box" style="height: 400px; position:relative; ">'+
                '<div id="red-ui-library-dialog-load-panes">'+
                    '<div class="red-ui-panel" id="red-ui-library-dialog-load-browser"></div>'+
                    '<div class="red-ui-panel">'+
                        '<div id="red-ui-library-dialog-load-preview">'+
                            '<div class="red-ui-panel" id="red-ui-library-dialog-load-preview-text" style="position:relative; height: 50%; overflow-y: hidden;"></div>'+
                            '<div class="red-ui-panel" id="red-ui-library-dialog-load-preview-details">'+
                                '<table id="red-ui-library-dialog-load-preview-details-table" class="red-ui-info-table"></table>'+
                            '</div>'+
                        '</div>'+
                    '</div>'+
                '</div>'+
            '</div>'+
        '</form>'+
    '</div>'


    var _librarySave = '<div id="red-ui-library-dialog-save" class="hide">'+
        '<form class="form-horizontal">'+
        '<div class="red-ui-library-dialog-box" style="height: 400px; position:relative; ">'+
            '<div id="red-ui-library-dialog-save-browser"></div>'+
            '<div class="form-row">'+
                '<label data-i18n="clipboard.export.exportAs"></label><input id="red-ui-library-dialog-save-filename" type="text">'+
            '</div>'+
        '</div>'+
        '</form>'+
    '</div>'

    function saveToLibrary() {
        var elementPrefix = activeLibrary.elementPrefix || "node-input-";
        var name = $("#"+elementPrefix+"name").val().trim();
        if (name === "") {
            name = RED._("library.unnamedType",{type:activeLibrary.type});
        }
        var filename = $("#red-ui-library-dialog-save-filename").val().trim()
        var selectedPath = saveLibraryBrowser.getSelected();
        if (!selectedPath.children) {
            selectedPath = selectedPath.parent;
        }

        var queryArgs = [];
        var data = {};
        for (var i=0; i < activeLibrary.fields.length; i++) {
            var field = activeLibrary.fields[i];
            if (field === "name") {
                data.name = name;
            } else if (typeof(field) === 'object') {
                data[field.name] = field.get();
            } else {
                data[field] = $("#" + elementPrefix + field).val();
            }
        }
        data.text = activeLibrary.editor.getValue();
        var saveFlow = function() {
            $.ajax({
                url:"library/"+selectedPath.library+'/'+selectedPath.type+'/'+selectedPath.path + filename,
                type: "POST",
                data: JSON.stringify(data),
                contentType: "application/json; charset=utf-8"
            }).done(function(data,textStatus,xhr) {
                RED.notify(RED._("library.savedType", {type:activeLibrary.type}),"success");
            }).fail(function(xhr,textStatus,err) {
                if (xhr.status === 401) {
                    RED.notify(RED._("library.saveFailed",{message:RED._("user.notAuthorized")}),"error");
                } else {
                    RED.notify(RED._("library.saveFailed",{message:xhr.responseText}),"error");
                }
            });
        }
        if (selectedPath.children) {
            var exists = false;
            selectedPath.children.forEach(function(f) {
                if (f.label === filename) {
                    exists = true;
                }
            });
            if (exists) {
                $( "#red-ui-library-dialog-save" ).dialog("close");
                var notification = RED.notify(RED._("clipboard.export.exists",{file:RED.utils.sanitize(filename)}),{
                    type: "warning",
                    fixed: true,
                    buttons: [{
                        text: RED._("common.label.cancel"),
                        click: function() {
                            notification.hideNotification()
                            $( "#red-ui-library-dialog-save" ).dialog( "open" );
                        }
                    },{
                        text: RED._("clipboard.export.overwrite"),
                        click: function() {
                            notification.hideNotification()
                            saveFlow();
                        }
                    }]
                });
            } else {
                saveFlow();
            }
        } else {
            saveFlow();
        }
    }

    function loadLibraryFolder(library,type,root,done) {
        $.getJSON("library/"+library+"/"+type+"/"+root,function(data) {
            var items = data.map(function(d) {
                if (typeof d === "string") {
                    return {
                        library: library,
                        type: type,
                        icon: 'fa fa-folder',
                        label: d,
                        path: root+d+"/",
                        children: function(done, item) {
                            loadLibraryFolder(library,type,root+d+"/", function(children) {
                                item.children = children; // TODO: should this be done by treeList for us
                                done(children);
                            })
                        }
                    };
                } else {
                    return {
                        library: library,
                        type: type,
                        icon: 'fa fa-file-o',
                        label: d.fn,
                        path: root+d.fn,
                        props: d
                    };
                }
            });
            items.sort(function(A,B){
                if (A.children && !B.children) {
                    return -1;
                } else if (!A.children && B.children) {
                    return 1;
                } else {
                    return A.label.localeCompare(B.label);
                }
            });
            done(items);
        });
    }

    var validateExportFilenameTimeout;
    function validateExportFilename(filenameInput) {
        if (validateExportFilenameTimeout) {
            clearTimeout(validateExportFilenameTimeout);
        }
        validateExportFilenameTimeout = setTimeout(function() {
            var filename = filenameInput.val().trim();
            var valid = filename.length > 0 && !/[\/\\]/.test(filename);
            if (valid) {
                filenameInput.removeClass("input-error");
                $("#red-ui-library-dialog-save-button").button("enable");
            } else {
                filenameInput.addClass("input-error");
                $("#red-ui-library-dialog-save-button").button("disable");
            }
        },100);
    }

    function createUI(options) {
        var libraryData = {};
        var elementPrefix = options.elementPrefix || "node-input-";

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

        // Add the library button to the name <input> in the edit dialog
        $('#'+elementPrefix+"name").css("width","calc(100% - 52px)").after(
            '<div style="margin-left:5px; display: inline-block;position: relative;">'+
            '<a id="node-input-'+options.type+'-lookup" class="red-ui-button"><i class="fa fa-book"></i> <i class="fa fa-caret-down"></i></a>'+
            '</div>'

            // '<ul class="red-ui-menu-dropdown pull-right" role="menu">'+
            // '<li><a id="node-input-'+options.type+'-menu-open-library" tabindex="-1" href="#">'+RED._("library.openLibrary")+'</a></li>'+
            // '<li><a id="node-input-'+options.type+'-menu-save-library" tabindex="-1" href="#">'+RED._("library.saveToLibrary")+'</a></li>'+
            // '</ul></div>'
        );
        RED.menu.init({id:'node-input-'+options.type+'-lookup', options: [
            { id:'node-input-'+options.type+'-menu-open-library',
                label: RED._("library.openLibrary"),
                onselect: function() {
                    var editorOpts = {
                        id: 'red-ui-library-dialog-load-preview-text',
                        mode: options.mode,
                        readOnly: true,
                        highlightActiveLine: false,
                        highlightGutterLine: false,
                        contextmenu: false
                    }
                    libraryEditor = RED.editor.createEditor(editorOpts); //use red.editor
                    if(libraryEditor.isACE) {
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
                    }

                    activeLibrary = options;
                    var listing = [];
                    var libraries = RED.settings.libraries || [];
                    libraries.forEach(function(lib) {
                        if (lib.types && lib.types.indexOf(options.url) === -1) {
                            return;
                        }
                        listing.push({
                            library: lib.id,
                            type: options.url,
                            icon: lib.icon || 'fa fa-hdd-o',
                            label: RED._(lib.label||lib.id),
                            path: "",
                            expanded: true,
                            writable: false,
                            children: [{
                                library: lib.id,
                                type: options.url,
                                icon: 'fa fa-cube',
                                label: options.type,
                                path: "",
                                expanded: false,
                                children: function(done, item) {
                                    loadLibraryFolder(lib.id, options.url, "", function(children) {
                                        item.children = children;
                                        done(children);
                                    })
                                }
                            }]
                        })
                    });
                    loadLibraryBrowser.data(listing);
                    setTimeout(function() {
                        loadLibraryBrowser.select(listing[0].children[0]);
                    },200);


                    var dialogHeight = 400;
                    var winHeight = $(window).height();
                    if (winHeight < 570) {
                        dialogHeight = 400 - (570 - winHeight);
                    }
                    $("#red-ui-library-dialog-load .red-ui-library-dialog-box").height(dialogHeight);

                    $( "#red-ui-library-dialog-load" ).dialog("option","title",RED._("library.typeLibrary", {type:options.type})).dialog( "open" );
                }
            },
            { id:'node-input-'+options.type+'-menu-save-library',
                label: RED._("library.saveToLibrary"),
                onselect: function() {
                    activeLibrary = options;
                    //var found = false;
                    var name = $("#"+elementPrefix+"name").val().replace(/(^\s*)|(\s*$)/g,"");
                    var filename = name.replace(/[^\w-]/g,"-");
                    if (filename === "") {
                        filename = "unnamed-"+options.type;
                    }
                    $("#red-ui-library-dialog-save-filename").attr("value",filename+"."+(options.ext||"txt"));

                    var listing = [];
                    var libraries = RED.settings.libraries || [];
                    libraries.forEach(function(lib) {
                        if (lib.types && lib.types.indexOf(options.url) === -1) {
                            return;
                        }
                        listing.push({
                            library: lib.id,
                            type: options.url,
                            icon: lib.icon || 'fa fa-hdd-o',
                            label: RED._(lib.label||lib.id),
                            path: "",
                            expanded: true,
                            writable: false,
                            children: [{
                                library: lib.id,
                                type: options.url,
                                icon: 'fa fa-cube',
                                label: options.type,
                                path: "",
                                expanded: false,
                                children: function(done, item) {
                                    loadLibraryFolder(lib.id, options.url, "", function(children) {
                                        item.children = children;
                                        done(children);
                                    })
                                }
                            }]
                        })
                    });
                    saveLibraryBrowser.data(listing);
                    setTimeout(function() {
                        saveLibraryBrowser.select(listing[0].children[0]);
                    },200);

                    var dialogHeight = 400;
                    var winHeight = $(window).height();
                    if (winHeight < 570) {
                        dialogHeight = 400 - (570 - winHeight);
                    }
                    $("#red-ui-library-dialog-save .red-ui-library-dialog-box").height(dialogHeight);


                    $( "#red-ui-library-dialog-save" ).dialog( "open" );
                }
            }
        ]})
    }

    function exportFlow() {
        console.warn("Deprecated call to RED.library.export");
    }

    var menuOptionMenu;
    function createBrowser(options) {
        var panes = $('<div class="red-ui-library-browser"></div>').appendTo(options.container);
        var dirList = $("<div>").css({width: "100%", height: "100%"}).appendTo(panes)
            .treeList({}).on('treelistselect', function(event, item) {
                if (options.onselect) {
                    options.onselect(item);
                }
            }).on('treelistconfirm', function(event, item) {
                if (options.onconfirm) {
                    options.onconfirm(item);
                }
            });
        var itemTools = null;
        if (options.folderTools) {
            dirList.on('treelistselect', function(event, item) {
                if (item.writable !== false && item.treeList) {
                    if (itemTools) {
                        itemTools.remove();
                    }
                    itemTools = $("<div>").css({position: "absolute",bottom:"6px",right:"8px"});
                    var menuButton = $('<button class="red-ui-button red-ui-button-small" type="button"><i class="fa fa-ellipsis-h"></i></button>')
                        .on("click", function(evt) {
                            evt.preventDefault();
                            evt.stopPropagation();
                            var elementPos = menuButton.offset();

                            var menuOptionMenu
                                = RED.menu.init({id:"red-ui-library-browser-menu",
                                      options: [
                                          {id:"red-ui-library-browser-menu-addFolder",label:RED._("library.newFolder"), onselect: function() {
                                              var defaultFolderName = "new-folder";
                                              var defaultFolderNameMatches = {};

                                              var selected = dirList.treeList('selected');
                                              if (!selected.children) {
                                                  selected = selected.parent;
                                              }
                                              var complete = function() {
                                                  selected.children.forEach(function(c) {
                                                      if (/^new-folder/.test(c.label)) {
                                                          defaultFolderNameMatches[c.label] = true
                                                      }
                                                  });
                                                  var folderIndex = 2;
                                                  while(defaultFolderNameMatches[defaultFolderName]) {
                                                      defaultFolderName = "new-folder-"+(folderIndex++)
                                                  }

                                                  selected.treeList.expand();
                                                  var input = $('<input type="text" class="red-ui-treeList-input">').val(defaultFolderName);
                                                  var newItem = {
                                                      icon: "fa fa-folder-o",
                                                      children:[],
                                                      path: selected.path,
                                                      element: input
                                                  }
                                                  var confirmAdd = function() {
                                                      var val = input.val().trim();
                                                      if (val === "") {
                                                          cancelAdd();
                                                          return;
                                                      } else {
                                                          for (var i=0;i<selected.children.length;i++) {
                                                              if (selected.children[i].label === val) {
                                                                  cancelAdd();
                                                                  return;
                                                              }
                                                          }
                                                      }
                                                      newItem.treeList.remove();
                                                      var finalItem = {
                                                          library: selected.library,
                                                          type: selected.type,
                                                          icon: "fa fa-folder",
                                                          children:[],
                                                          label: val,
                                                          path: newItem.path+val+"/"
                                                      }
                                                      selected.treeList.addChild(finalItem,true);
                                                  }
                                                  var cancelAdd = function() {
                                                      newItem.treeList.remove();
                                                  }
                                                  input.on('keydown', function(evt) {
                                                      evt.stopPropagation();
                                                      if (evt.keyCode === 13) {
                                                          confirmAdd();
                                                      } else if (evt.keyCode === 27) {
                                                          cancelAdd();
                                                      }
                                                  })
                                                  input.on("blur", function() {
                                                      confirmAdd();
                                                  })
                                                  selected.treeList.addChild(newItem);
                                                  setTimeout(function() {
                                                      input.trigger("focus");
                                                      input.select();
                                                  },400);
                                              }
                                              selected.treeList.expand(complete);

                                          } },
                                          // null,
                                          // {id:"red-ui-library-browser-menu-rename",label:"Rename", onselect: function() {} },
                                          // {id:"red-ui-library-browser-menu-delete",label:"Delete", onselect: function() {} }
                                      ]
                                                }).on('mouseleave', function(){ $(this).remove(); dirList.focus() })
                                .on('mouseup', function() { var self = $(this);self.hide(); dirList.focus(); setTimeout(function() { self.remove() },100)})
                                .appendTo("body");
                            menuOptionMenu.css({
                                position: "absolute",
                                top: elementPos.top+"px",
                                left: (elementPos.left - menuOptionMenu.width() + 20)+"px"
                            }).show();

                        }).appendTo(itemTools);
                    
                    itemTools.appendTo(item.treeList.label);
                }
            });
        }

        return {
            select: function(item) {
                dirList.treeList('select',item);
            },
            getSelected: function() {
                return dirList.treeList('selected');
            },
            focus: function() {
                dirList.focus();
            },
            data: function(content,selectFirst) {
                dirList.treeList('data',content);
                if (selectFirst) {
                    setTimeout(function() {
                        dirList.treeList('select',content[0]);
                    },100);
                }
            }
        }
    }

    // var libraryPlugins = {};
    //
    // function showLibraryDetailsDialog(container, lib, done) {
    //     var dialog = $('<div>').addClass("red-ui-projects-dialog-list-dialog").hide().appendTo(container);
    //     $('<div>').addClass("red-ui-projects-dialog-list-dialog-header").text(lib?"Edit library source":"Add library source").appendTo(dialog);
    //     var formRow = $('<div class="red-ui-settings-row"></div>').appendTo(dialog);
    //     $('<label>').text("Type").appendTo(formRow);
    //     var typeSelect = $('<select>').appendTo(formRow);
    //     for (var type in libraryPlugins) {
    //         if (libraryPlugins.hasOwnProperty(type)) {
    //             $('<option>').attr('value',type).attr('selected',(lib && lib.type === type)?true:null).text(libraryPlugins[type].name).appendTo(typeSelect);
    //         }
    //     }
    //     var dialogBody = $("<div>").addClass("red-ui-settings-section").appendTo(dialog);
    //     var libraryFields = {};
    //     var fieldsModified = {};
    //     function validateFields() {
    //         var validForm = true;
    //         for (var p in libraryFields) {
    //             if (libraryFields.hasOwnProperty(p)) {
    //                 var v = libraryFields[p].input.val().trim();
    //                 if (v === "") {
    //                     validForm = false;
    //                     if (libraryFields[p].modified) {
    //                         libraryFields[p].input.addClass("input-error");
    //                     }
    //                 } else {
    //                     libraryFields[p].input.removeClass("input-error");
    //                 }
    //             }
    //         }
    //         okayButton.attr("disabled",validForm?null:"disabled");
    //     }
    //     typeSelect.on("change", function(evt) {
    //         dialogBody.empty();
    //         libraryFields = {};
    //         fieldsModified = {};
    //         var libDef = libraryPlugins[$(this).val()];
    //         var defaultIcon = lib?lib.icon:(libDef.icon || "font-awesome/fa-image");
    //         formRow = $('<div class="red-ui-settings-row"></div>').appendTo(dialogBody);
    //         $('<label>').text(RED._("editor.settingIcon")).appendTo(formRow);
    //         libraryFields['icon'] = {input: $('<input type="hidden">').val(defaultIcon) };
    //         var iconButton = $('<button type="button" class="red-ui-button"></button>').appendTo(formRow);
    //         iconButton.on("click", function(evt) {
    //             evt.preventDefault();
    //             var icon = libraryFields['icon'].input.val() || "";
    //             var iconPath = (icon ? RED.utils.separateIconPath(icon) : {});
    //             RED.editor.iconPicker.show(iconButton, null, iconPath, true, function (newIcon) {
    //                 iconButton.empty();
    //                 var path = newIcon || "";
    //                 var newPath = RED.utils.separateIconPath(path);
    //                 if (newPath) {
    //                     $('<i class="fa"></i>').addClass(newPath.file).appendTo(iconButton);
    //                 }
    //                 libraryFields['icon'].input.val(path);
    //             });
    //         })
    //         var newPath = RED.utils.separateIconPath(defaultIcon);
    //         $('<i class="fa '+newPath.file+'"></i>').appendTo(iconButton);
    //
    //         var libProps = libDef.defaults;
    //         var libPropKeys = Object.keys(libProps).map(function(p) { return {id: p, def: libProps[p]}});
    //         libPropKeys.unshift({id: "label", def: {value:""}})
    //
    //         libPropKeys.forEach(function(prop) {
    //             var p = prop.id;
    //             var def = prop.def;
    //             formRow = $('<div class="red-ui-settings-row"></div>').appendTo(dialogBody);
    //             var label = libDef._(def.label || "label."+p,{defaultValue: p});
    //             if (label === p) {
    //                 label = libDef._("editor:common.label."+p,{defaultValue:p});
    //             }
    //             $('<label>').text(label).appendTo(formRow);
    //             libraryFields[p] = {
    //                 input: $('<input type="text">').val(lib?(lib[p]||lib.config[p]):def.value).appendTo(formRow),
    //                 modified: false
    //             }
    //             if (def.type === "password") {
    //                 libraryFields[p].input.attr("type","password").typedInput({type:"cred"})
    //             }
    //
    //             libraryFields[p].input.on("change paste keyup", function(evt) {
    //                 if (!evt.key || evt.key.length === 1) {
    //                     libraryFields[p].modified = true;
    //                 }
    //                 validateFields();
    //             })
    //             var desc = libDef._("desc."+p, {defaultValue: ""});
    //             if (desc) {
    //                 $('<label class="red-ui-projects-edit-form-sublabel"></label>').append($('<small>').text(desc)).appendTo(formRow);
    //             }
    //         });
    //         validateFields();
    //     })
    //
    //     var dialogButtons = $('<span class="button-row" style="position: relative; float: right; margin: 10px;"></span>').appendTo(dialog);
    //     var cancelButton = $('<button class="red-ui-button"></button>').text(RED._("common.label.cancel")).appendTo(dialogButtons).on("click", function(evt) {
    //         evt.preventDefault();
    //         done(false);
    //     })
    //     var okayButton = $('<button class="red-ui-button"></button>').text(lib?"Update library":"Add library").appendTo(dialogButtons).on("click", function(evt) {
    //         evt.preventDefault();
    //         var item;
    //         if (!lib) {
    //             item = {
    //                 id: libraryFields['label'].input.val().trim().toLowerCase().replace(/( |[^a-z0-9])/g,"-"),
    //                 user: true,
    //                 type: typeSelect.val(),
    //                 config: {}
    //             }
    //         } else {
    //             item = lib;
    //         }
    //
    //         item.label = libraryFields['label'].input.val().trim();
    //         item.icon = libraryFields['icon'].input.val();
    //
    //         for (var p in libraryFields) {
    //             if (libraryFields.hasOwnProperty(p) && p !== 'label') {
    //                 item.config[p] = libraryFields[p].input.val().trim();
    //             }
    //         }
    //         done(item);
    //     });
    //
    //     typeSelect.trigger("change");
    //     if (lib) {
    //         typeSelect.attr('disabled',true);
    //     }
    //
    //     dialog.slideDown(200);
    // }
    //
    // function createSettingsPane() {
    //     var pane = $('<div id="red-ui-settings-tab-library-manager"></div>');
    //     var toolbar = $('<div>').css("text-align","right").appendTo(pane);
    //     var addButton = $('<button class="red-ui-button"><i class="fa fa-plus"></i> Add library</button>').appendTo(toolbar);
    //
    //     var addingLibrary = false;
    //
    //     var libraryList = $("<ol>").css({
    //         position: "absolute",
    //         left: "10px",
    //         right: "10px",
    //         top: "50px",
    //         bottom: "10px"
    //     }).appendTo(pane).editableList({
    //         addButton: false,
    //         addItem: function(row,index,itemData) {
    //             if (itemData.id) {
    //                 row.addClass("red-ui-settings-tab-library-entry");
    //                 var iconCell = $("<span>").appendTo(row);
    //                 if (itemData.icon) {
    //                     var iconPath = RED.utils.separateIconPath(itemData.icon);
    //                     if (iconPath) {
    //                         $("<i>").addClass("fa "+iconPath.file).appendTo(iconCell);
    //                     }
    //                 }
    //                 $("<span>").text(RED._(itemData.label)).appendTo(row);
    //                 $("<span>").text(RED._(itemData.type)).appendTo(row);
    //                 $('<button class="red-ui-button red-ui-button-small"></button>').text(RED._("sidebar.project.projectSettings.edit")).appendTo(
    //                     $('<span>').appendTo(row)
    //                 ).on("click", function(evt) {
    //                     if (addingLibrary) {
    //                         return;
    //                     }
    //                     evt.preventDefault();
    //                     addingLibrary = true;
    //                     row.empty();
    //                     row.removeClass("red-ui-settings-tab-library-entry");
    //                     showLibraryDetailsDialog(row,itemData,function(newItem) {
    //                         var itemIndex = libraryList.editableList("indexOf", itemData);
    //                         libraryList.editableList("removeItem", itemData);
    //                         if (newItem) {
    //                             libraryList.editableList("insertItemAt", newItem, itemIndex);
    //                         } else {
    //                             libraryList.editableList("insertItemAt", itemData,itemIndex);
    //                         }
    //                         addingLibrary = false;
    //
    //                     })
    //                 })
    //
    //             } else {
    //                 showLibraryDetailsDialog(row,null,function(newItem) {
    //                     libraryList.editableList("removeItem", itemData);
    //                     if (newItem) {
    //                         libraryList.editableList("addItem", newItem);
    //                     }
    //                     addingLibrary = false;
    //                 })
    //
    //             }
    //         }
    //     });
    //
    //     addButton.on('click', function(evt) {
    //         evt.preventDefault();
    //         if (!addingLibrary) {
    //             addingLibrary = true;
    //             libraryList.editableList("addItem",{user:true});
    //         }
    //     })
    //     var libraries = RED.settings.libraries || [];
    //     libraries.forEach(function(library) {
    //         if (library.user) {
    //             libraryList.editableList("addItem",library)
    //         }
    //     })
    //
    //     return pane;
    // }
    //
    //
    return {
        init: function() {
            // RED.events.on("registry:plugin-added", function(id) {
            //     var plugin = RED.plugins.getPlugin(id);
            //     if (plugin.type === "node-red-library-source") {
            //         libraryPlugins[id] = plugin;
            //     }
            // });
            //
            // RED.userSettings.add({
            //     id:'library-manager',
            //     title: "NLS: Libraries",
            //     get: createSettingsPane,
            //     close: function() {}
            // });
            $(_librarySave).appendTo("#red-ui-editor").i18n();
            $(_libraryLookup).appendTo("#red-ui-editor").i18n();

            $( "#red-ui-library-dialog-save" ).dialog({
                title: RED._("library.saveToLibrary"),
                modal: true,
                autoOpen: false,
                width: 800,
                resizable: false,
                open: function( event, ui ) { RED.keyboard.disable() },
                close: function( event, ui ) { RED.keyboard.enable() },
                classes: {
                    "ui-dialog": "red-ui-editor-dialog",
                    "ui-dialog-titlebar-close": "hide",
                    "ui-widget-overlay": "red-ui-editor-dialog"
                },
                buttons: [
                    {
                        text: RED._("common.label.cancel"),
                        click: function() {
                            $( this ).dialog( "close" );
                        }
                    },
                    {
                        id: "red-ui-library-dialog-save-button",
                        text: RED._("common.label.save"),
                        class: "primary",
                        click: function() {
                            saveToLibrary(false);
                            $( this ).dialog( "close" );
                        }
                    }
                ]
            });

            saveLibraryBrowser = RED.library.createBrowser({
                container: $("#red-ui-library-dialog-save-browser"),
                folderTools: true,
                onselect: function(item) {
                    if (item.label) {
                        if (!item.children) {
                            $("#red-ui-library-dialog-save-filename").val(item.label);
                            item = item.parent;
                        }
                        if (item.writable === false) {
                            $("#red-ui-library-dialog-save-button").button("disable");
                        } else {
                            $("#red-ui-library-dialog-save-button").button("enable");
                        }
                    }
                }
            });
            $("#red-ui-library-dialog-save-filename").on("keyup", function() { validateExportFilename($(this))});
            $("#red-ui-library-dialog-save-filename").on('paste',function() { var input = $(this); setTimeout(function() { validateExportFilename(input)},10)});

            $( "#red-ui-library-dialog-load" ).dialog({
                modal: true,
                autoOpen: false,
                width: 800,
                resizable: false,
                classes: {
                    "ui-dialog": "red-ui-editor-dialog",
                    "ui-dialog-titlebar-close": "hide",
                    "ui-widget-overlay": "red-ui-editor-dialog"
                },
                buttons: [
                    {
                        text: RED._("common.label.cancel"),
                        click: function() {
                            $( this ).dialog( "close" );
                        }
                    },
                    {
                        text: RED._("common.label.load"),
                        class: "primary",
                        click: function () {
                            if (selectedLibraryItem) {
                                var elementPrefix = activeLibrary.elementPrefix || "node-input-";
                                for (var i = 0; i < activeLibrary.fields.length; i++) {
                                    var field = activeLibrary.fields[i];
                                    if (typeof(field) === 'object') {
                                        var val = selectedLibraryItem[field.name];
                                        field.set(val);
                                    }
                                    else {
                                        $("#"+elementPrefix+field).val(selectedLibraryItem[field]);
                                    }
                                }
                                activeLibrary.editor.setValue(libraryEditor.getValue(), -1);
                            }
                            $( this ).dialog( "close" );
                        }
                    }
                ],
                open: function(e) {
                    RED.keyboard.disable();
                    $(this).parent().find(".ui-dialog-titlebar-close").hide();
                    libraryEditor.resize();
                },
                close: function(e) {
                    RED.keyboard.enable();
                    if (libraryEditor) {
                        libraryEditor.destroy();
                        libraryEditor = null;
                    }
                }
            });
            loadLibraryBrowser = RED.library.createBrowser({
                container: $("#red-ui-library-dialog-load-browser"),
                onselect: function(file) {
                    var table = $("#red-ui-library-dialog-load-preview-details-table").empty();
                    selectedLibraryItem = file.props;
                    if (file && file.label && !file.children) {
                        $.get("library/"+file.library+"/"+file.type+"/"+file.path, function(data) {
                            //TODO: nls + sanitize
                            var propRow = $('<tr class="red-ui-help-info-row"><td>Type</td><td></td></tr>').appendTo(table);
                            $(propRow.children()[1]).text(activeLibrary.type);
                            if (file.props.hasOwnProperty('name')) {
                                propRow = $('<tr class="red-ui-help-info-row"><td>Name</td><td>'+file.props.name+'</td></tr>').appendTo(table);
                                $(propRow.children()[1]).text(file.props.name);
                            }
                            for (var p in file.props) {
                                if (file.props.hasOwnProperty(p) && p !== 'name' && p !== 'fn') {
                                    propRow = $('<tr class="red-ui-help-info-row"><td></td><td></td></tr>').appendTo(table);
                                    $(propRow.children()[0]).text(p);
                                    RED.utils.createObjectElement(file.props[p]).appendTo(propRow.children()[1]);
                                }
                            }
                            libraryEditor.setValue(data,-1);
                        });
                    } else {
                        libraryEditor.setValue("",-1);
                    }
                }
            });
            RED.panels.create({
                container:$("#red-ui-library-dialog-load-panes"),
                dir: "horizontal",
                resize: function() {
                    libraryEditor.resize();
                }
            });
            RED.panels.create({
                container:$("#red-ui-library-dialog-load-preview"),
                dir: "vertical",
                resize: function() {
                    libraryEditor.resize();
                }
            });
        },
        create: createUI,
        createBrowser:createBrowser,
        export: exportFlow,
        loadLibraryFolder: loadLibraryFolder
    }
})();
