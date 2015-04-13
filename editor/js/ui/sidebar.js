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
RED.sidebar = (function() {

    //$('#sidebar').tabs();
    var sidebar_tabs = RED.tabs.create({
        id:"sidebar-tabs",
        onchange:function(tab) {
            $("#sidebar-content").children().hide();
            $("#"+tab.id).show();
        },
        onremove: function(tab) {
            $("#"+tab.id).remove();
        }
    });
    
    function addTab(title,content,closeable) {
        $("#sidebar-content").append(content);
        $(content).hide();
        sidebar_tabs.addTab({id:"tab-"+title,label:title,closeable:closeable});
        //content.style.position = "absolute";
        //$('#sidebar').tabs("refresh");
    }

    function removeTab(title) {
        sidebar_tabs.removeTab("tab-"+title);
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
                    var newChartRight = 15;
                    $("#sidebar").addClass("closing");
                    $("#workspace").css("right",newChartRight);
                    $("#chart-zoom-controls").css("right",newChartRight+20);
                    $("#sidebar").width(0);
                    RED.menu.setSelected("menu-item-sidebar",true);
                    eventHandler.emit("resize");
                }
                sidebarSeparator.width = $("#sidebar").width();
            },
            drag: function(event,ui) {
                var d = ui.position.left-sidebarSeparator.start;
                var newSidebarWidth = sidebarSeparator.width-d;
                if (sidebarSeparator.opening) {
                    newSidebarWidth -= 13;
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
                $("#chart-zoom-controls").css("right",newChartRight+20);
                $("#sidebar").width(newSidebarWidth);

                sidebar_tabs.resize();
                eventHandler.emit("resize");
            },
            stop:function(event,ui) {
                if (sidebarSeparator.closing) {
                    $("#sidebar").removeClass("closing");
                    RED.menu.setSelected("menu-item-sidebar",false);
                    if ($("#sidebar").width() < 180) {
                        $("#sidebar").width(180);
                        $("#workspace").css("right",208);
                        $("#chart-zoom-controls").css("right",228);
                    }
                }
                $("#sidebar-separator").css("left","auto");
                $("#sidebar-separator").css("right",($("#sidebar").width()+13)+"px");
                eventHandler.emit("resize");
            }
    });
    
    function toggleSidebar(state) {
        if (!state) {
            $("#main-container").addClass("sidebar-closed");
        } else {
            $("#main-container").removeClass("sidebar-closed");
            sidebar_tabs.resize();
        }
        eventHandler.emit("resize");
    }
    
    function showSidebar(id) {
        if (id) {
            sidebar_tabs.activateTab("tab-"+id);
        }
    }
    
    function containsTab(id) {
        return sidebar_tabs.contains("tab-"+id);
    }
    
    function init () {
        RED.keyboard.add(/* SPACE */ 32,{ctrl:true},function(){RED.menu.setSelected("menu-item-sidebar",!RED.menu.isSelected("menu-item-sidebar"));d3.event.preventDefault();});
        showSidebar();
        RED.sidebar.info.show();
    }
    
    var eventHandler = (function() {
        var handlers = {};
        
        return {
            on: function(evt,func) {
                handlers[evt] = handlers[evt]||[];
                handlers[evt].push(func);
            },
            emit: function(evt,arg) {
                if (handlers[evt]) {
                    for (var i=0;i<handlers[evt].length;i++) {
                        handlers[evt][i](arg);
                    }
                    
                }
            }
        }
    })();
    
    return {
        init: init,
        addTab: addTab,
        removeTab: removeTab,
        show: showSidebar,
        containsTab: containsTab,
        toggleSidebar: toggleSidebar,
        on: eventHandler.on
    }
    
})();
