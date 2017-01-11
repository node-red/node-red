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
RED.palette.editor = (function() {

    var disabled = false;

    var editorTabs;
    var filterInput;
    var searchInput;
    var nodeList;
    var packageList;
    var loadedList = [];
    var filteredList = [];
    var loadedIndex = {};

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

    function refreshNodeModuleList() {
        for (var id in nodeEntries) {
            if (nodeEntries.hasOwnProperty(id)) {
                _refreshNodeModule(id);
            }
        }
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
        var delta = (Date.now() - new Date(dateString).getTime())/1000;

        if (delta < 60) {
            return RED._('palette.editor.times.seconds');
        }
        delta = Math.floor(delta/60);
        if (delta < 10) {
            return RED._('palette.editor.times.minutes');
        }
        if (delta < 60) {
            return RED._('palette.editor.times.minutesV',{count:delta});
        }

        delta = Math.floor(delta/60);

        if (delta < 24) {
            return RED._('palette.editor.times.hoursV',{count:delta});
        }

        delta = Math.floor(delta/24);

        if (delta < 7) {
            return RED._('palette.editor.times.daysV',{count:delta})
        }
        var weeks = Math.floor(delta/7);
        var days = delta%7;

        if (weeks < 4) {
            return RED._('palette.editor.times.weeksV',{count:weeks})
        }

        var months = Math.floor(weeks/4);
        weeks = weeks%4;

        if (months < 12) {
            return RED._('palette.editor.times.monthsV',{count:months})
        }
        var years = Math.floor(months/12);
        months = months%12;

        if (months === 0) {
            return RED._('palette.editor.times.yearsV',{count:years})
        } else {
            return RED._('palette.editor.times.year'+(years>1?'s':'')+'MonthsV',{y:years,count:months})
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
                            setElements.enableButton.html(RED._('palette.editor.inuse'));
                            setElements.enableButton.addClass('disabled');
                        } else {
                            setElements.enableButton.removeClass('disabled');
                            if (set.enabled) {
                                setElements.enableButton.html(RED._('palette.editor.disable'));
                            } else {
                                setElements.enableButton.html(RED._('palette.editor.enable'));
                            }
                        }
                        setElements.setRow.toggleClass("palette-module-set-disabled",!set.enabled);
                    }
                }
                var nodeCount = (activeTypeCount === typeCount)?typeCount:activeTypeCount+" / "+typeCount;
                nodeEntry.setCount.html(RED._('palette.editor.nodeCount',{count:typeCount,label:nodeCount}));

                if (nodeEntries[module].totalUseCount > 0) {
                    nodeEntry.enableButton.html(RED._('palette.editor.inuse'));
                    nodeEntry.enableButton.addClass('disabled');
                    nodeEntry.removeButton.hide();
                } else {
                    nodeEntry.enableButton.removeClass('disabled');
                    if (moduleInfo.local) {
                        nodeEntry.removeButton.show();
                    }
                    if (activeTypeCount === 0) {
                        nodeEntry.enableButton.html(RED._('palette.editor.enableall'));
                    } else {
                        nodeEntry.enableButton.html(RED._('palette.editor.disableall'));
                    }
                    nodeEntry.container.toggleClass("disabled",(activeTypeCount === 0));
                }
            }

            nodeEntry.updateButton.hide();
            // if (loadedIndex.hasOwnProperty(module)) {
            //     if (moduleInfo.version !== loadedIndex[module].version) {
            //         nodeEntry.updateButton.show();
            //         nodeEntry.updateButton.html(RED._('palette.editor.update',{version:loadedIndex[module].version}));
            //     } else {
            //         nodeEntry.updateButton.hide();
            //     }
            //
            // } else {
            //     nodeEntry.updateButton.hide();
            // }
        }

    }
    function showPaletteEditor() {
        if (RED.settings.theme('palette.editable') === false) {
            return;
        }
        if (disabled) {
            return;
        }

        initInstallTab();
        $("#header-shade").show();
        $("#editor-shade").show();
        $("#sidebar-shade").show();
        $("#sidebar-separator").hide();

        editorTabs.activateTab('nodes');

        $("#main-container").addClass("palette-expanded");
        setTimeout(function() {
            editorTabs.resize();
            filterInput.focus();
        },250);
        RED.events.emit("palette-editor:open");
        RED.keyboard.add("*","escape",function(){hidePaletteEditor()});
    }
    function hidePaletteEditor() {
        RED.keyboard.remove("escape");
        $("#main-container").removeClass("palette-expanded");
        $("#header-shade").hide();
        $("#editor-shade").hide();
        $("#sidebar-shade").hide();
        $("#sidebar-separator").show();
        $("#palette-editor").find('.expanded').each(function(i,el) {
            $(el).find(".palette-module-content").slideUp();
            $(el).removeClass('expanded');
        });
        filterInput.searchBox('value',"");
        searchInput.searchBox('value',"");
        RED.events.emit("palette-editor:close");

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


    var catalogueCount;
    var catalogueLoadStatus = [];
    var catalogueLoadStart;
    var catalogueLoadErrors = false;

    var activeSort = sortModulesAZ;

    function handleCatalogResponse(err,catalog,index,v) {
        catalogueLoadStatus.push(err||v);
        if (!err) {
            if (v.modules) {
                v.modules.forEach(function(m) {
                    loadedIndex[m.id] = m;
                    m.index = [m.id];
                    if (m.keywords) {
                        m.index = m.index.concat(m.keywords);
                    }
                    if (m.updated_at) {
                        m.timestamp = new Date(m.updated_at).getTime();
                    } else {
                        m.timestamp = 0;
                    }
                    m.index = m.index.join(",").toLowerCase();
                })
                loadedList = loadedList.concat(v.modules);
            }
            searchInput.searchBox('count',loadedList.length);
        } else {
            catalogueLoadErrors = true;
        }
        if (catalogueCount > 1) {
            $(".palette-module-shade-status").html(RED._('palette.editor.loading')+"<br>"+catalogueLoadStatus.length+"/"+catalogueCount);
        }
        if (catalogueLoadStatus.length === catalogueCount) {
            if (catalogueLoadErrors) {
                RED.notify(RED._('palette.editor.errors.catalogLoadFailed',{url: catalog}),"error",false,8000);
            }
            var delta = 250-(Date.now() - catalogueLoadStart);
            setTimeout(function() {
                $("#palette-module-install-shade").hide();
            },Math.max(delta,0));

        }
    }

    function initInstallTab() {
        if (loadedList.length === 0) {
            loadedList = [];
            loadedIndex = {};
            packageList.editableList('empty');
            $(".palette-module-shade-status").html(RED._('palette.editor.loading'));
            var catalogues = RED.settings.theme('palette.catalogues')||['https://catalogue.nodered.org/catalogue.json'];
            catalogueLoadStatus = [];
            catalogueLoadErrors = false;
            catalogueCount = catalogues.length;
            if (catalogues.length > 1) {
                $(".palette-module-shade-status").html(RED._('palette.editor.loading')+"<br>0/"+catalogues.length);
            }
            $("#palette-module-install-shade").show();
            catalogueLoadStart = Date.now();
            catalogues.forEach(function(catalog,index) {
                $.getJSON(catalog, {_: new Date().getTime()},function(v) {
                    handleCatalogResponse(null,catalog,index,v);
                    refreshNodeModuleList();
                }).fail(function(jqxhr, textStatus, error) {
                    handleCatalogResponse(jqxhr,catalog,index);
                })
            });
        }
    }

    function refreshFilteredItems() {
        packageList.editableList('empty');
        filteredList.sort(activeSort);
        for (var i=0;i<Math.min(10,filteredList.length);i++) {
            packageList.editableList('addItem',filteredList[i]);
        }
        if (filteredList.length === 0) {
            packageList.editableList('addItem',{});
        }

        if (filteredList.length > 10) {
            packageList.editableList('addItem',{start:10,more:filteredList.length-10})
        }
    }
    function sortModulesAZ(A,B) {
        return A.info.id.localeCompare(B.info.id);
    }
    function sortModulesRecent(A,B) {
        return -1 * (A.info.timestamp-B.info.timestamp);
    }

    function init() {
        if (RED.settings.theme('palette.editable') === false) {
            return;
        }

        RED.events.on("editor:open",function() { disabled = true; });
        RED.events.on("editor:close",function() { disabled = false; });
        RED.events.on("search:open",function() { disabled = true; });
        RED.events.on("search:close",function() { disabled = false; });
        RED.events.on("type-search:open",function() { disabled = true; });
        RED.events.on("type-search:close",function() { disabled = false; });

        RED.actions.add("core:manage-palette",RED.palette.editor.show);

        editorTabs = RED.tabs.create({
            id:"palette-editor-tabs",
            onchange:function(tab) {
                $("#palette-editor .palette-editor-tab").hide();
                tab.content.show();
                if (filterInput) {
                    filterInput.searchBox('value',"");
                }
                if (searchInput) {
                    searchInput.searchBox('value',"");
                }
                if (tab.id === 'install') {
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

        $("#palette-editor-close").on("click", function(e) {
            hidePaletteEditor();
        })

        var modulesTab = $('<div>',{class:"palette-editor-tab"}).appendTo("#palette-editor");

        editorTabs.addTab({
            id: 'nodes',
            label: RED._('palette.editor.tab-nodes'),
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
            scrollOnAdd: false,
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
                if (entry) {
                    var headerRow = $('<div>',{class:"palette-module-header"}).appendTo(container);
                    var titleRow = $('<div class="palette-module-meta palette-module-name"><i class="fa fa-cube"></i></div>').appendTo(headerRow);
                    $('<span>').html(entry.name).appendTo(titleRow);
                    var metaRow = $('<div class="palette-module-meta palette-module-version"><i class="fa fa-tag"></i></div>').appendTo(headerRow);
                    $('<span>').html(entry.version).appendTo(metaRow);
                    var buttonRow = $('<div>',{class:"palette-module-meta"}).appendTo(headerRow);
                    var setButton = $('<a href="#" class="editor-button editor-button-small palette-module-set-button"><i class="fa fa-angle-right palette-module-node-chevron"></i> </a>').appendTo(buttonRow);
                    var setCount = $('<span>').appendTo(setButton);
                    var buttonGroup = $('<div>',{class:"palette-module-button-group"}).appendTo(buttonRow);

                    var updateButton = $('<a href="#" class="editor-button editor-button-small"></a>').html(RED._('palette.editor.update')).appendTo(buttonGroup);
                    updateButton.click(function(evt) {
                        evt.preventDefault();
                    })


                    var removeButton = $('<a href="#" class="editor-button editor-button-small"></a>').html(RED._('palette.editor.remove')).appendTo(buttonGroup);
                    removeButton.click(function(evt) {
                        evt.preventDefault();

                        $("#palette-module-install-confirm").data('module',entry.name);
                        $("#palette-module-install-confirm").data('shade',shade);
                        $("#palette-module-install-confirm-body").html(RED._("palette.editor.confirm.remove.body"));
                        $(".palette-module-install-confirm-button-install").hide();
                        $(".palette-module-install-confirm-button-remove").show();
                        $("#palette-module-install-confirm")
                            .dialog('option', 'title', RED._("palette.editor.confirm.remove.title"))
                            .dialog('open');
                    })
                    if (!entry.local) {
                        removeButton.hide();
                    }
                    var enableButton = $('<a href="#" class="editor-button editor-button-small"></a>').html(RED._('palette.editor.disableall')).appendTo(buttonGroup);

                    var contentRow = $('<div>',{class:"palette-module-content"}).appendTo(container);
                    var shade = $('<div class="palette-module-shade hide"><img src="red/images/spin.svg" class="palette-spinner"/></div>').appendTo(container);

                    object.elements = {
                        updateButton: updateButton,
                        removeButton: removeButton,
                        enableButton: enableButton,
                        setCount: setCount,
                        container: container,
                        shade: shade,
                        sets: {}
                    }
                    setButton.click(function(evt) {
                        evt.preventDefault();
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
                            evt.preventDefault();
                            if (object.setUseCount[setName] === 0) {
                                var currentSet = RED.nodes.registry.getNodeSet(set.id);
                                shade.show();
                                changeNodeState(set.id,!currentSet.enabled,shade,function(xhr){
                                    console.log(xhr)
                                });
                            }
                        })

                        object.elements.sets[set.name] = {
                            setRow: setRow,
                            enableButton: enableButton,
                            swatches: typeSwatches
                        };
                    });
                    enableButton.click(function(evt) {
                        evt.preventDefault();
                        if (object.totalUseCount === 0) {
                            changeNodeState(entry.name,(container.hasClass('disabled')),shade,function(xhr){
                                console.log(xhr)
                            });
                        }
                    })
                    refreshNodeModule(entry.name);
                } else {
                    $('<div>',{class:"red-ui-search-empty"}).html(RED._('search.empty')).appendTo(container);
                }
            }
        });



        var installTab = $('<div>',{class:"palette-editor-tab hide"}).appendTo("#palette-editor");

        editorTabs.addTab({
            id: 'install',
            label: RED._('palette.editor.tab-install'),
            content: installTab
        })

        var toolBar = $('<div>',{class:"palette-editor-toolbar"}).appendTo(installTab);

        var searchDiv = $('<div>',{class:"palette-search"}).appendTo(installTab);
        searchInput = $('<input type="text" data-i18n="[placeholder]palette.search"></input>')
            .appendTo(searchDiv)
            .searchBox({
                delay: 300,
                change: function() {
                    var searchTerm = $(this).val().toLowerCase();
                    if (searchTerm.length > 0) {
                        filteredList = loadedList.filter(function(m) {
                            return (m.index.indexOf(searchTerm) > -1);
                        }).map(function(f) { return {info:f}});
                        refreshFilteredItems();
                        searchInput.searchBox('count',filteredList.length+" / "+loadedList.length);
                    } else {
                        searchInput.searchBox('count',loadedList.length);
                        packageList.editableList('empty');
                    }
                }
            });


        $('<span>').html(RED._("palette.editor.sort")+' ').appendTo(toolBar);
        var sortGroup = $('<span class="button-group"></span>').appendTo(toolBar);
        var sortAZ = $('<a href="#" class="sidebar-header-button-toggle selected" data-i18n="palette.editor.sortAZ"></a>').appendTo(sortGroup);
        var sortRecent = $('<a href="#" class="sidebar-header-button-toggle" data-i18n="palette.editor.sortRecent"></a>').appendTo(sortGroup);

        sortAZ.click(function(e) {
            e.preventDefault();
            if ($(this).hasClass("selected")) {
                return;
            }
            $(this).addClass("selected");
            sortRecent.removeClass("selected");
            activeSort = sortModulesAZ;
            refreshFilteredItems();
        });

        sortRecent.click(function(e) {
            e.preventDefault();
            if ($(this).hasClass("selected")) {
                return;
            }
            $(this).addClass("selected");
            sortAZ.removeClass("selected");
            activeSort = sortModulesRecent;
            refreshFilteredItems();
        });


        var refreshSpan = $('<span>').appendTo(toolBar);
        var refreshButton = $('<a href="#" class="sidebar-header-button"><i class="fa fa-refresh"></i></a>').appendTo(refreshSpan);
        refreshButton.click(function(e) {
            e.preventDefault();
            loadedList = [];
            loadedIndex = {};
            initInstallTab();
        })

        packageList = $('<ol>',{style:"position: absolute;top: 78px;bottom: 0;left: 0;right: 0px;"}).appendTo(installTab).editableList({
            addButton: false,
            scrollOnAdd: false,
            addItem: function(container,i,object) {

                if (object.more) {
                    container.addClass('palette-module-more');
                    var moreRow = $('<div>',{class:"palette-module-header palette-module"}).appendTo(container);
                    var moreLink = $('<a href="#"></a>').html(RED._('palette.editor.more',{count:object.more})).appendTo(moreRow);
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
                if (object.info) {
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
                    var installButton = $('<a href="#" class="editor-button editor-button-small"></a>').html(RED._('palette.editor.install')).appendTo(buttonGroup);
                    installButton.click(function(e) {
                        e.preventDefault();
                        if (!$(this).hasClass('disabled')) {
                            $("#palette-module-install-confirm").data('module',entry.id);
                            $("#palette-module-install-confirm").data('url',entry.url);
                            $("#palette-module-install-confirm").data('shade',shade);
                            $("#palette-module-install-confirm-body").html(RED._("palette.editor.confirm.install.body"));
                            $(".palette-module-install-confirm-button-install").show();
                            $(".palette-module-install-confirm-button-remove").hide();
                            $("#palette-module-install-confirm")
                                .dialog('option', 'title', RED._("palette.editor.confirm.install.title"))
                                .dialog('open');
                        }
                    })
                    if (nodeEntries.hasOwnProperty(entry.id)) {
                        installButton.addClass('disabled');
                        installButton.html(RED._('palette.editor.installed'));
                    }

                    object.elements = {
                        installButton:installButton
                    }
                } else {
                    $('<div>',{class:"red-ui-search-empty"}).html(RED._('search.empty')).appendTo(container);
                }
            }
        });

        $('<div id="palette-module-install-shade" class="palette-module-shade hide"><div class="palette-module-shade-status"></div><img src="red/images/spin.svg" class="palette-spinner"/></div>').appendTo(installTab);

        $('<div id="palette-module-install-confirm" class="hide"><form class="form-horizontal"><div id="palette-module-install-confirm-body" class="node-dialog-confirm-row"></div></form></div>').appendTo(document.body);
        $("#palette-module-install-confirm").dialog({
            title: RED._('palette.editor.confirm.title'),
            modal: true,
            autoOpen: false,
            width: 550,
            height: "auto",
            buttons: [
                {
                    text: RED._("common.label.cancel"),
                    click: function() {
                        $( this ).dialog( "close" );
                    }
                },
                {
                    text: RED._("palette.editor.confirm.button.review"),
                    class: "primary palette-module-install-confirm-button-install",
                    click: function() {
                        var url = $(this).data('url');
                        window.open(url);
                    }
                },
                {
                    text: RED._("palette.editor.confirm.button.install"),
                    class: "primary palette-module-install-confirm-button-install",
                    click: function() {
                        var id = $(this).data('module');
                        var shade = $(this).data('shade');
                        installNodeModule(id,shade,function(xhr) {
                             if (xhr) {
                                 if (xhr.responseJSON) {
                                     RED.notify(RED._('palette.editor.errors.installFailed',{module: id,message:xhr.responseJSON.message}));
                                 }
                             }
                        });
                        $( this ).dialog( "close" );
                    }
                },
                {
                    text: RED._("palette.editor.confirm.button.remove"),
                    class: "primary palette-module-install-confirm-button-remove",
                    click: function() {
                        var id = $(this).data('module');
                        var shade = $(this).data('shade');
                        shade.show();
                        removeNodeModule(id, function(xhr) {
                            shade.hide();
                            if (xhr) {
                                if (xhr.responseJSON) {
                                    RED.notify(RED._('palette.editor.errors.removeFailed',{module: id,message:xhr.responseJSON.message}));
                                }
                            }
                        })

                        $( this ).dialog( "close" );
                    }
                }
            ]
        })

        RED.events.on('registry:node-set-enabled', function(ns) {
            refreshNodeModule(ns.module);
        });
        RED.events.on('registry:node-set-disabled', function(ns) {
            refreshNodeModule(ns.module);
        });
        RED.events.on('registry:node-type-added', function(nodeType) {
            if (!/^subflow:/.test(nodeType)) {
                var ns = RED.nodes.registry.getNodeSetForType(nodeType);
                refreshNodeModule(ns.module);
            }
        });
        RED.events.on('registry:node-type-removed', function(nodeType) {
            if (!/^subflow:/.test(nodeType)) {
                var ns = RED.nodes.registry.getNodeSetForType(nodeType);
                refreshNodeModule(ns.module);
            }
        });
        RED.events.on('registry:node-set-added', function(ns) {
            refreshNodeModule(ns.module);
            for (var i=0;i<filteredList.length;i++) {
                if (filteredList[i].info.id === ns.module) {
                    var installButton = filteredList[i].elements.installButton;
                    installButton.addClass('disabled');
                    installButton.html(RED._('palette.editor.installed'));
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
                            var installButton = filteredList[i].elements.installButton;
                            installButton.removeClass('disabled');
                            installButton.html(RED._('palette.editor.install'));
                            break;
                        }
                    }
                }
            }
        });
        RED.events.on('nodes:add', function(n) {
            if (!/^subflow:/.test(n.type)) {
                typesInUse[n.type] = (typesInUse[n.type]||0)+1;
                if (typesInUse[n.type] === 1) {
                    var ns = RED.nodes.registry.getNodeSetForType(n.type);
                    refreshNodeModule(ns.module);
                }
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
        show: showPaletteEditor
    }
})();
