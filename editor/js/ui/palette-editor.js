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

    var editorTabs;
    var filterInput;
    var searchInput;
    var nodeList;
    var packageList;
    var loadedList = [];
    var filteredList = [];

    var typesInUse = {};
    var nodeEntries = {};
    var eventTimers = {};
    var activeFilter = "";

    function delayCallback(start,callback) {
        var delta = Date.now() - start;
        if (delta < 300) {
            delta = 300;
        } else {
            delta = 0;
        }
        setTimeout(function() {
            callback();
        },delta);
    }
    function changeNodeState(id,state,shade,callback) {
        shade.show();
        var start = Date.now();
        $.ajax({
            url:"nodes/"+id,
            type: "PUT",
            data: JSON.stringify({
                enabled: state
            }),
            contentType: "application/json; charset=utf-8"
        }).done(function(data,textStatus,xhr) {
            delayCallback(start,function() {
                shade.hide();
                callback();
            });
        }).fail(function(xhr,textStatus,err) {
            delayCallback(start,function() {
                shade.hide();
                callback(xhr);
            });
        })
    }
    function installNodeModule(id,shade,callback) {
        shade.show();
        $.ajax({
            url:"nodes",
            type: "POST",
            data: JSON.stringify({
                module: id
            }),
            contentType: "application/json; charset=utf-8"
        }).done(function(data,textStatus,xhr) {
            shade.hide();
            callback();
        }).fail(function(xhr,textStatus,err) {
            shade.hide();
            callback(xhr);
        });
    }
    function removeNodeModule(id,callback) {
        $.ajax({
            url:"nodes/"+id,
            type: "DELETE"
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

    function formatUpdatedAt(dateString) {
        var now = new Date();
        var d = new Date(dateString);
        var delta = now.getTime() - d.getTime();

        delta /= 1000;

        if (delta < 60) {
            return "seconds ago";
        }

        delta = Math.floor(delta/60);

        if (delta < 10) {
            return "minutes ago";
        }
        if (delta < 60) {
            return delta+" minutes ago";
        }

        delta = Math.floor(delta/60);

        if (delta < 24) {
            return delta+" hour"+(delta>1?"s":"")+" ago";
        }

        delta = Math.floor(delta/24);

        if (delta < 7) {
            return delta+" day"+(delta>1?"s":"")+" ago";
        }
        var weeks = Math.floor(delta/7);
        var days = delta%7;

        if (weeks < 4) {
            if (days === 0) {
                return weeks+" week"+(weeks>1?"s":"")+" ago";
            } else {
                return weeks+" week"+(weeks>1?"s":"")+", "+days+" day"+(days>1?"s":"")+" ago";
            }
        }

        var months = Math.floor(weeks/4);
        weeks = weeks%4;

        if (months < 12) {
            if (weeks === 0) {
                return months+" month"+(months>1?"s":"")+" ago";
            } else {
                return months+" month"+(months>1?"s":"")+", "+weeks+" week"+(weeks>1?"s":"")+" ago";
            }
        }

        var years = Math.floor(months/12);
        months = months%12;

        if (months === 0) {
            return years+" year"+(years>1?"s":"")+" ago";
        } else {
            return years+" year"+(years>1?"s":"")+", "+months+" month"+(months>1?"s":"")+" ago";
        }

    }


    function _refreshNodeModule(module) {
        if (!nodeEntries.hasOwnProperty(module)) {
            nodeEntries[module] = {info:RED.nodes.registry.getModule(module)};
            var index = [module];
            for (var s in nodeEntries[module].info.sets) {
                if (nodeEntries[module].info.sets.hasOwnProperty(s)) {
                    index.push(s);
                    index = index.concat(nodeEntries[module].info.sets[s].types)
                }
            }
            nodeEntries[module].index = index.join(",").toLowerCase();

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
        setTimeout(function() {
            editorTabs.resize();
        },250);

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
        filterInput.searchBox('value',"");
    }

    function filterChange(val) {
        activeFilter = val.toLowerCase();
        var visible = nodeList.editableList('filter');
        var size = nodeList.editableList('length');
        if (val === "") {
            filterInput.searchBox('count');
        } else {
            filterInput.searchBox('count',visible+" / "+size);
        }
    }

    function initInstallTab() {
        $("#palette-module-install-shade").show();
        $.getJSON('http://catalog.nodered.org/catalog.json',function(v) {
            loadedList = v;
            searchInput.searchBox('count',loadedList.length);
            loadedList.forEach(function(m) {
                m.index = [m.id];
                if (m.keywords) {
                    m.index = m.index.concat(m.keywords);
                }
                m.index = m.index.join(",").toLowerCase();
            })
            $("#palette-module-install-shade").hide();

        })

    }
    function init() {

        editorTabs = RED.tabs.create({
            id:"palette-editor-tabs",
            onchange:function(tab) {
                $("#palette-editor .palette-editor-tab").hide();
                tab.content.show();
                if (tab.id === 'install') {
                    initInstallTab();
                    if (searchInput) {
                        searchInput.focus();
                    }
                } else {
                    if (filterInput) {
                        filterInput.focus();
                    }
                }
            },
            minimumActiveTabWidth: 110
        });


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

        var modulesTab = $('<div>',{class:"palette-editor-tab"}).appendTo("#palette-editor");

        editorTabs.addTab({
            id: 'nodes',
            label: 'Nodes',
            name: 'Nodes',
            content: modulesTab
        })

        var filterDiv = $('<div>',{class:"palette-search"}).appendTo(modulesTab);
        filterInput = $('<input type="text" data-i18n="[placeholder]palette.filter"></input>')
            .appendTo(filterDiv)
            .searchBox({
                delay: 200,
                change: function() {
                    filterChange($(this).val());
                }
            });


        nodeList = $('<ol>',{id:"palette-module-list", style:"position: absolute;top: 35px;bottom: 0;left: 0;right: 0px;"}).appendTo(modulesTab).editableList({
            addButton: false,
            sort: function(A,B) {
                return A.info.name.localeCompare(B.info.name);
            },
            filter: function(data) {
                if (activeFilter === "" ) {
                    return true;
                }

                return (activeFilter==="")||(data.index.indexOf(activeFilter) > -1);
            },
            addItem: function(container,i,object) {
                var entry = object.info;
                var headerRow = $('<div>',{class:"palette-module-header"}).appendTo(container);
                var titleRow = $('<div class="palette-module-meta"><i class="fa fa-cube"></i></div>').appendTo(headerRow);
                $('<span>',{class:"palette-module-name"}).html(entry.name).appendTo(titleRow);
                var metaRow = $('<div class="palette-module-meta"><span class="palette-module-version"><i class="fa fa-tag"></i></span></div>').appendTo(headerRow);
                $('<span>').html(entry.version).appendTo(metaRow.find(".palette-module-version"));
                var buttonRow = $('<div>',{class:"palette-module-meta"}).appendTo(headerRow);
                var setButton = $('<a href="#" class="editor-button editor-button-small palette-module-set-button"><i class="fa fa-angle-right palette-module-node-chevron"></i> </a>').appendTo(buttonRow);
                var setCount = $('<span>').appendTo(setButton);
                var buttonGroup = $('<div>',{class:"palette-module-button-group"}).appendTo(buttonRow);
                var removeButton = $('<a href="#" class="editor-button editor-button-small"></a>').html('remove').appendTo(buttonGroup);
                removeButton.click(function() {
                    shade.show();
                    removeNodeModule(entry.name, function(xhr) {
                        console.log(xhr);
                    })
                })
                if (!entry.local) {
                    removeButton.hide();
                }
                var enableButton = $('<a href="#" class="editor-button editor-button-small"></a>').html('disable all').appendTo(buttonGroup);

                var contentRow = $('<div>',{class:"palette-module-content"}).appendTo(container);
                var shade = $('<div class="palette-module-shade hide"><img src="red/images/spin.svg" class="palette-spinner"/></div>').appendTo(container);

                object.elements = {
                    removeButton: removeButton,
                    enableButton: enableButton,
                    setCount: setCount,
                    container: container,
                    shade: shade,
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
                            shade.show();
                            changeNodeState(set.id,!currentSet.enabled,shade,function(xhr){
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
                        changeNodeState(entry.name,(container.hasClass('disabled')),shade,function(xhr){
                            console.log(xhr)
                        });
                    }
                    evt.preventDefault();
                })
                refreshNodeModule(entry.name);
            }
        });



        var installTab = $('<div>',{class:"palette-editor-tab hide"}).appendTo("#palette-editor");

        editorTabs.addTab({
            id: 'install',
            label: 'Install',
            name: 'Install',
            content: installTab
        })

        var searchDiv = $('<div>',{class:"palette-search"}).appendTo(installTab);
        searchInput = $('<input type="text" data-i18n="[placeholder]palette.search"></input>')
            .appendTo(searchDiv)
            .searchBox({
                delay: 300,
                minimumLength: 2,
                change: function() {
                    var searchTerm = $(this).val();
                    packageList.editableList('empty');
                    if (searchTerm.length >= 2) {
                        filteredList = loadedList.filter(function(m) {
                            return (m.index.indexOf(searchTerm) > -1);
                        }).map(function(f) { return {info:f}});
                        for (var i=0;i<Math.min(10,filteredList.length);i++) {
                            packageList.editableList('addItem',filteredList[i]);
                        }
                        if (filteredList.length > 10) {
                            packageList.editableList('addItem',{start:10,more:filteredList.length-10})
                        }
                        searchInput.searchBox('count',filteredList.length+" / "+loadedList.length);
                    } else {
                        searchInput.searchBox('count',loadedList.length);
                    }
                }
            });

        $('<div id="palette-module-install-shade" class="palette-module-shade hide"><img src="red/images/spin.svg" class="palette-spinner"/></div>').appendTo(installTab);


        packageList = $('<ol>',{id:"palette-module-list", style:"position: absolute;top: 35px;bottom: 0;left: 0;right: 0px;"}).appendTo(installTab).editableList({
           addButton: false,
        //    sort: function(A,B) {
        //        return A.info.name.localeCompare(B.info.name);
        //    },
           addItem: function(container,i,object) {
               if (object.more) {
                   container.addClass('palette-module-more');
                   var moreRow = $('<div>',{class:"palette-module-header palette-module"}).appendTo(container);
                   var moreLink = $('<a href="#"></a>').html("+ "+object.more+" more").appendTo(moreRow);
                   moreLink.click(function(e) {
                       e.preventDefault();
                       packageList.editableList('removeItem',object);
                       for (var i=object.start;i<Math.min(object.start+10,object.start+object.more);i++) {
                           packageList.editableList('addItem',filteredList[i]);
                       }
                       if (object.more > 10) {
                           packageList.editableList('addItem',{start:object.start+10, more:object.more-10})
                       }
                   })
                   return;
               }
               var entry = object.info;
               var headerRow = $('<div>',{class:"palette-module-header"}).appendTo(container);
               var titleRow = $('<div class="palette-module-meta"><i class="fa fa-cube"></i></div>').appendTo(headerRow);
               $('<span>',{class:"palette-module-name"}).html(entry.name||entry.id).appendTo(titleRow);
               $('<a target="_blank" class="palette-module-link"><i class="fa fa-external-link"></i></a>').attr('href',entry.url).appendTo(titleRow);
               var descRow = $('<div class="palette-module-meta"></div>').appendTo(headerRow);
               $('<div>',{class:"palette-module-description"}).html(entry.description).appendTo(descRow);

               var metaRow = $('<div class="palette-module-meta"></div>').appendTo(headerRow);
               $('<span class="palette-module-version"><i class="fa fa-tag"></i> '+entry.version+'</span>').appendTo(metaRow);
               $('<span class="palette-module-updated"><i class="fa fa-calendar"></i> '+formatUpdatedAt(entry.updated_at)+'</span>').appendTo(metaRow);
               var buttonRow = $('<div>',{class:"palette-module-meta"}).appendTo(headerRow);
               var buttonGroup = $('<div>',{class:"palette-module-button-group"}).appendTo(buttonRow);
               var shade = $('<div class="palette-module-shade hide"><img src="red/images/spin.svg" class="palette-spinner"/></div>').appendTo(container);
               var installButton = $('<a href="#" class="editor-button editor-button-small"></a>').html('install').appendTo(buttonGroup);
               installButton.click(function(e) {
                   e.preventDefault();
                   installNodeModule(entry.id,shade,function(xhr) {
                       console.log(xhr);
                   })
               })
               if (nodeEntries.hasOwnProperty(entry.id)) {
                   installButton.hide();
               }

               object.elements = {
                   installButton:installButton
               }
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
            for (var i=0;i<filteredList.length;i++) {
                if (filteredList[i].info.id === ns.module) {
                    filteredList[i].elements.installButton.hide();
                    break;
                }
            }
        });
        RED.events.on('registry:node-set-removed', function(ns) {
            var module = RED.nodes.registry.getModule(ns.module);
            if (!module) {
                var entry = nodeEntries[ns.module];
                if (entry) {
                    nodeList.editableList('removeItem', entry);
                    delete nodeEntries[ns.module];
                    for (var i=0;i<filteredList.length;i++) {
                        if (filteredList[i].info.id === ns.module) {
                            filteredList[i].elements.installButton.show();
                            break;
                        }
                    }
                }
            }
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
