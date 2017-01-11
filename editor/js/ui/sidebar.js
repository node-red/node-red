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
RED.sidebar = (function() {

    //$('#sidebar').tabs();
    var sidebar_tabs = RED.tabs.create({
        id:"sidebar-tabs",
        onchange:function(tab) {
            $("#sidebar-content").children().hide();
            $("#sidebar-footer").children().hide();
            if (tab.onchange) {
                tab.onchange.call(tab);
            }
            $(tab.wrapper).show();
            if (tab.toolbar) {
                $(tab.toolbar).show();
            }
        },
        onremove: function(tab) {
            $(tab.wrapper).hide();
            if (tab.onremove) {
                tab.onremove.call(tab);
            }
        },
        minimumActiveTabWidth: 110
    });

    var knownTabs = {

    };

    function addTab(title,content,closeable,visible) {
        var options;
        if (typeof title === "string") {
            // TODO: legacy support in case anyone uses this...
            options = {
                id: content.id,
                label: title,
                name: title,
                content: content,
                closeable: closeable,
                visible: visible
            }
        } else if (typeof title === "object") {
            options = title;
        }

        options.wrapper = $('<div>',{style:"height:100%"}).appendTo("#sidebar-content")
        options.wrapper.append(options.content);
        options.wrapper.hide();

        if (!options.enableOnEdit) {
            options.shade = $('<div>',{class:"sidebar-shade hide"}).appendTo(options.wrapper);
        }

        if (options.toolbar) {
            $("#sidebar-footer").append(options.toolbar);
            $(options.toolbar).hide();
        }
        var id = options.id;

        RED.menu.addItem("menu-item-view-menu",{
            id:"menu-item-view-menu-"+options.id,
            label:options.name,
            onselect:function() {
                showSidebar(options.id);
            },
            group: "sidebar-tabs"
        });

        knownTabs[options.id] = options;

        if (options.visible !== false) {
            sidebar_tabs.addTab(knownTabs[options.id]);
        }
    }

    function removeTab(id) {
        sidebar_tabs.removeTab(id);
        $(knownTabs[id].wrapper).remove();
        if (knownTabs[id].footer) {
            knownTabs[id].footer.remove();
        }
        delete knownTabs[id];
        RED.menu.removeItem("menu-item-view-menu-"+id);
    }

    var sidebarSeparator =  {};
    $("#sidebar-separator").draggable({
            axis: "x",
            start:function(event,ui) {
                sidebarSeparator.closing = false;
                sidebarSeparator.opening = false;
                var winWidth = $(window).width();
                sidebarSeparator.start = ui.position.left;
                sidebarSeparator.chartWidth = $("#workspace").width();
                sidebarSeparator.chartRight = winWidth-$("#workspace").width()-$("#workspace").offset().left-2;

                if (!RED.menu.isSelected("menu-item-sidebar")) {
                    sidebarSeparator.opening = true;
                    var newChartRight = 7;
                    $("#sidebar").addClass("closing");
                    $("#workspace").css("right",newChartRight);
                    $("#editor-stack").css("right",newChartRight+1);
                    $("#sidebar").width(0);
                    RED.menu.setSelected("menu-item-sidebar",true);
                    RED.events.emit("sidebar:resize");
                }
                sidebarSeparator.width = $("#sidebar").width();
            },
            drag: function(event,ui) {
                var d = ui.position.left-sidebarSeparator.start;
                var newSidebarWidth = sidebarSeparator.width-d;
                if (sidebarSeparator.opening) {
                    newSidebarWidth -= 3;
                }

                if (newSidebarWidth > 150) {
                    if (sidebarSeparator.chartWidth+d < 200) {
                        ui.position.left = 200+sidebarSeparator.start-sidebarSeparator.chartWidth;
                        d = ui.position.left-sidebarSeparator.start;
                        newSidebarWidth = sidebarSeparator.width-d;
                    }
                }

                if (newSidebarWidth < 150) {
                    if (!sidebarSeparator.closing) {
                        $("#sidebar").addClass("closing");
                        sidebarSeparator.closing = true;
                    }
                    if (!sidebarSeparator.opening) {
                        newSidebarWidth = 150;
                        ui.position.left = sidebarSeparator.width-(150 - sidebarSeparator.start);
                        d = ui.position.left-sidebarSeparator.start;
                    }
                } else if (newSidebarWidth > 150 && (sidebarSeparator.closing || sidebarSeparator.opening)) {
                    sidebarSeparator.closing = false;
                    $("#sidebar").removeClass("closing");
                }

                var newChartRight = sidebarSeparator.chartRight-d;
                $("#workspace").css("right",newChartRight);
                $("#editor-stack").css("right",newChartRight+1);
                $("#sidebar").width(newSidebarWidth);

                sidebar_tabs.resize();
                RED.events.emit("sidebar:resize");
            },
            stop:function(event,ui) {
                if (sidebarSeparator.closing) {
                    $("#sidebar").removeClass("closing");
                    RED.menu.setSelected("menu-item-sidebar",false);
                    if ($("#sidebar").width() < 180) {
                        $("#sidebar").width(180);
                        $("#workspace").css("right",187);
                        $("#editor-stack").css("right",188);
                    }
                }
                $("#sidebar-separator").css("left","auto");
                $("#sidebar-separator").css("right",($("#sidebar").width()+2)+"px");
                RED.events.emit("sidebar:resize");
            }
    });

    function toggleSidebar(state) {
        if (!state) {
            $("#main-container").addClass("sidebar-closed");
        } else {
            $("#main-container").removeClass("sidebar-closed");
            sidebar_tabs.resize();
        }
        RED.events.emit("sidebar:resize");
    }

    function showSidebar(id) {
        if (id) {
            if (!containsTab(id)) {
                sidebar_tabs.addTab(knownTabs[id]);
            }
            sidebar_tabs.activateTab(id);
            if (!RED.menu.isSelected("menu-item-sidebar")) {
                RED.menu.setSelected("menu-item-sidebar",true);
            }
        }
    }

    function containsTab(id) {
        return sidebar_tabs.contains(id);
    }

    function init () {
        RED.actions.add("core:toggle-sidebar",function(state){
            if (state === undefined) {
                RED.menu.toggleSelected("menu-item-sidebar");
            } else {
                toggleSidebar(state);
            }
        });
        showSidebar();
        RED.sidebar.info.init();
        RED.sidebar.config.init();
        // hide info bar at start if screen rather narrow...
        if ($(window).width() < 600) { RED.menu.setSelected("menu-item-sidebar",false); }
    }

    return {
        init: init,
        addTab: addTab,
        removeTab: removeTab,
        show: showSidebar,
        containsTab: containsTab,
        toggleSidebar: toggleSidebar,
    }

})();
