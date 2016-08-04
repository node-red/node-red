/**
 * Copyright 2016 IBM Corp.
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
RED.palette.editor = (function() {

    var nodeList;
    var typesInUse = {};

    var nodeEntries = {};

    var eventTimers = {};

    function changeNodeState(id,state,callback) {
        $.ajax({
            url:"nodes/"+id,
            type: "PUT",
            data: JSON.stringify({
                enabled: state
            }),
            contentType: "application/json; charset=utf-8"
        }).done(function(data,textStatus,xhr) {
            callback();
        }).fail(function(xhr,textStatus,err) {
            callback(xhr);
        })
    }
    function refreshNodeModule(module) {
        if (!eventTimers.hasOwnProperty(module)) {
            eventTimers[module] = setTimeout(function() {
                delete eventTimers[module];
                _refreshNodeModule(module);
            },100);
        }
    }


    function getContrastingBorder(rgbColor){
        var parts = /^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)[,)]/.exec(rgbColor);
        if (parts) {
            var r = parseInt(parts[1]);
            var g = parseInt(parts[2]);
            var b = parseInt(parts[3]);
            var yiq = ((r*299)+(g*587)+(b*114))/1000;
            if (yiq > 160) {
                r = Math.floor(r*0.8);
                g = Math.floor(g*0.8);
                b = Math.floor(b*0.8);
                return "rgb("+r+","+g+","+b+")";
            }
        }
        return rgbColor;
    }


    function _refreshNodeModule(module) {
        if (!nodeEntries.hasOwnProperty(module)) {
            nodeEntries[module] = {info:RED.nodes.registry.getModule(module)};
            nodeList.editableList('addItem', nodeEntries[module]);
            //console.log(nodeList.editableList('items'));

        } else {
            var moduleInfo = nodeEntries[module].info;
            var nodeEntry = nodeEntries[module].elements;
            if (nodeEntry) {
                var activeTypeCount = 0;
                var typeCount = 0;
                nodeEntries[module].totalUseCount = 0;
                nodeEntries[module].setUseCount = {};

                for (var setName in moduleInfo.sets) {
                    if (moduleInfo.sets.hasOwnProperty(setName)) {
                        var inUseCount = 0;
                        var set = moduleInfo.sets[setName];
                        var setElements = nodeEntry.sets[setName];

                        if (set.enabled) {
                            activeTypeCount += set.types.length;
                        }
                        typeCount += set.types.length;
                        for (var i=0;i<moduleInfo.sets[setName].types.length;i++) {
                            var t = moduleInfo.sets[setName].types[i];
                            inUseCount += (typesInUse[t]||0);
                            var swatch = setElements.swatches[t];
                            if (set.enabled) {
                                var def = RED.nodes.getType(t);
                                if (def && def.color) {
                                    swatch.css({background:def.color});
                                    swatch.css({border: "1px solid "+getContrastingBorder(swatch.css('backgroundColor'))})

                                } else {
                                    swatch.css({background:"#eee",border:"1px dashed #999"})
                                }
                            } else {
                                swatch.css({background:"#eee",border:"1px dashed #999"})
                            }
                        }
                        nodeEntries[module].setUseCount[setName] = inUseCount;
                        nodeEntries[module].totalUseCount += inUseCount;

                        if (inUseCount > 0) {
                            setElements.enableButton.html('in use');
                            setElements.enableButton.addClass('disabled');
                        } else {
                            setElements.enableButton.removeClass('disabled');
                            if (set.enabled) {
                                setElements.enableButton.html('disable');
                            } else {
                                setElements.enableButton.html('enable');
                            }
                        }
                        setElements.setRow.toggleClass("palette-module-set-disabled",!set.enabled);
                    }
                }
                var nodeCount = (activeTypeCount === typeCount)?typeCount:activeTypeCount+" / "+typeCount;
                nodeEntry.setCount.html(nodeCount+" node"+(typeCount>1?"s":""));

                if (nodeEntries[module].totalUseCount > 0) {
                    nodeEntry.enableButton.html("in use");
                    nodeEntry.enableButton.addClass('disabled');
                    nodeEntry.removeButton.hide();
                } else {
                    nodeEntry.enableButton.removeClass('disabled');
                    nodeEntry.removeButton.show();
                    if (activeTypeCount === 0) {
                        nodeEntry.enableButton.html("enable all");
                    } else {
                        nodeEntry.enableButton.html("disable all");
                    }
                    nodeEntry.container.toggleClass("disabled",(activeTypeCount === 0));
                }
            }
        }

    }
    function showPaletteEditor() {
        $("#header-shade").show();
        $("#editor-shade").show();
        $("#sidebar-shade").show();
        $("#main-container").addClass("palette-expanded");
    }
    function hidePaletteEditor() {
        $("#main-container").removeClass("palette-expanded");
        $("#header-shade").hide();
        $("#editor-shade").hide();
        $("#sidebar-shade").hide();
        $("#palette-editor").find('.expanded').each(function(i,el) {
            $(el).find(".palette-module-content").slideUp();
            $(el).removeClass('expanded');
        });
    }

    function init() {
        $("#editor-shade").click(function() {
            if ($("#main-container").hasClass("palette-expanded")) {
                hidePaletteEditor();
            }
        });
        $("#palette-edit").on("click",function(e) {
            if ($("#main-container").hasClass("palette-expanded")) {
                hidePaletteEditor();
            } else {
                showPaletteEditor();
            }
        });
        $("#palette-editor-close").on("click", function(e) {
            hidePaletteEditor();
        })

        var divTabs = $('<div>',{style:"position:absolute;top:80px;left:0;right:0;bottom:0"}).appendTo("#palette-editor");

        nodeList = $('<ol>',{id:"palette-module-list", style:"position: absolute;top: 0;bottom: 0;left: 0;right: 0px;"}).appendTo(divTabs).editableList({
            addButton: false,
            sort: function(A,B) {
                return A.info.name.localeCompare(B.info.name);
            },
            addItem: function(container,i,object) {
                var entry = object.info;

                var headerRow = $('<div>',{class:"palette-module-header"}).appendTo(container);

                var titleRow = $('<div>',{class:"palette-module-meta"}).appendTo(headerRow);
                var chevron = $('<i class="fa fa-cube">').appendTo(titleRow);
                var title = $('<span>',{class:"palette-module-name"}).html(entry.name).appendTo(titleRow);

                var metaRow = $('<div>',{class:"palette-module-meta"}).appendTo(headerRow);
                var version = $('<span class="palette-module-version"><i class="fa fa-tag"></i></span>').appendTo(metaRow);
                $('<span>').html(entry.version).appendTo(version);


                var buttonRow = $('<div>',{class:"palette-module-meta"}).appendTo(headerRow);

                var setButton = $('<a href="#" class="editor-button editor-button-small palette-module-set-button"><i class="fa fa-angle-right palette-module-node-chevron"></i> </a>').appendTo(buttonRow);
                var setCount = $('<span>').appendTo(setButton);

                var buttonGroup = $('<div>',{class:"palette-module-button-group"}).appendTo(buttonRow);
                var removeButton = $('<a href="#" class="editor-button editor-button-small"></a>').html('remove').appendTo(buttonGroup);
                if (!entry.local) {
                    removeButton.hide();
                }
                var enableButton = $('<a href="#" class="editor-button editor-button-small"></a>').html('disable all').appendTo(buttonGroup);

                var contentRow = $('<div>',{class:"palette-module-content"}).appendTo(container);

                object.elements = {
                    removeButton: removeButton,
                    enableButton: enableButton,
                    setCount: setCount,
                    container: container,
                    sets: {}
                }
                setButton.click(function() {
                    if (container.hasClass('expanded')) {
                        container.removeClass('expanded');
                        contentRow.slideUp();
                    } else {
                        container.addClass('expanded');
                        contentRow.slideDown();
                    }
                })

                var setList = Object.keys(entry.sets)
                setList.sort(function(A,B) {
                    return A.toLowerCase().localeCompare(B.toLowerCase());
                });
                setList.forEach(function(setName) {
                    var set = entry.sets[setName];
                    var setRow = $('<div>',{class:"palette-module-set"}).appendTo(contentRow);
                    var buttonGroup = $('<div>',{class:"palette-module-set-button-group"}).appendTo(setRow);
                    var typeSwatches = {};
                    set.types.forEach(function(t) {
                        var typeDiv = $('<div>',{class:"palette-module-type"}).appendTo(setRow);
                        typeSwatches[t] = $('<span>',{class:"palette-module-type-swatch"}).appendTo(typeDiv);
                        $('<span>',{class:"palette-module-type-node"}).html(t).appendTo(typeDiv);
                    })

                    var enableButton = $('<a href="#" class="editor-button editor-button-small"></a>').appendTo(buttonGroup);
                    enableButton.click(function(evt) {
                        if (object.setUseCount[setName] === 0) {
                            var currentSet = RED.nodes.registry.getNodeSet(set.id);
                            changeNodeState(set.id,!currentSet.enabled,function(xhr){
                                console.log(xhr)
                            });
                        }
                        evt.preventDefault();
                    })

                    object.elements.sets[set.name] = {
                        setRow: setRow,
                        enableButton: enableButton,
                        swatches: typeSwatches
                    };
                });
                enableButton.click(function(evt) {
                    if (object.totalUseCount === 0) {
                        changeNodeState(entry.name,(container.hasClass('disabled')),function(xhr){
                            console.log(xhr)
                        });
                    }
                    evt.preventDefault();
                })
                refreshNodeModule(entry.name);
            }
        });

        RED.events.on('registry:node-set-enabled', function(ns) {
            refreshNodeModule(ns.module);
        });
        RED.events.on('registry:node-set-disabled', function(ns) {
            refreshNodeModule(ns.module);
        });
        RED.events.on('registry:node-type-added', function(nodeType) {
            var ns = RED.nodes.registry.getNodeSetForType(nodeType);
            refreshNodeModule(ns.module);
        });
        RED.events.on('registry:node-type-removed', function(nodeType) {
            var ns = RED.nodes.registry.getNodeSetForType(nodeType);
            refreshNodeModule(ns.module);
        });
        RED.events.on('registry:node-set-added', function(ns) {
            refreshNodeModule(ns.module);
        });
        RED.events.on('registry:node-set-removed', function(ns) {
            refreshNodeModule(ns.module);
        });
        RED.events.on('nodes:add', function(n) {
            typesInUse[n.type] = (typesInUse[n.type]||0)+1;
            if (typesInUse[n.type] === 1) {
                var ns = RED.nodes.registry.getNodeSetForType(n.type);
                refreshNodeModule(ns.module);
            }
        })
        RED.events.on('nodes:remove', function(n) {
            if (typesInUse.hasOwnProperty(n.type)) {
                typesInUse[n.type]--;
                if (typesInUse[n.type] === 0) {
                    delete typesInUse[n.type];
                    var ns = RED.nodes.registry.getNodeSetForType(n.type);
                    refreshNodeModule(ns.module);
                }
            }
        })


    }

    return {
        init: init,
    }
})();
