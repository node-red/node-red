/**
 * Copyright 2013 IBM Corp.
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
RED.sidebar = function() {

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
    
    $('#btn-sidebar').click(function() {toggleSidebar();});
    RED.keyboard.add(/* SPACE */ 32,{ctrl:true},function(){toggleSidebar();d3.event.preventDefault();});

    var sidebarSeparator =  {};
    $("#sidebar-separator").draggable({
            axis: "x",
            start:function(event,ui) {
                var winWidth = $(window).width();
                sidebarSeparator.start = ui.position.left;
                sidebarSeparator.width = $("#sidebar").width();
                sidebarSeparator.chartWidth = $("#workspace").width();
                sidebarSeparator.chartRight = winWidth-$("#workspace").width()-$("#workspace").offset().left-2;
                sidebarSeparator.closing = false;
            },
            drag: function(event,ui) {
                var d = ui.position.left-sidebarSeparator.start;
                var newSidebarWidth = sidebarSeparator.width-d;
                
                if (newSidebarWidth > 180 && sidebarSeparator.chartWidth+d > 200) {
                    var newChartRight = sidebarSeparator.chartRight-d;
                    $("#workspace").css("right",newChartRight);
                    $("#chart-zoom-controls").css("right",newChartRight+20);
                    $("#sidebar").width(newSidebarWidth);
                }
                if (newSidebarWidth < 150 && !sidebarSeparator.closing) {
                    $("#sidebar").addClass("closing");
                    sidebarSeparator.closing = true;
                }
                if (newSidebarWidth >= 150 && sidebarSeparator.closing) {
                    sidebarSeparator.closing = false;
                    $("#sidebar").removeClass("closing");
                }
                sidebar_tabs.resize();
                RED.view.resize();
                    
            },
            stop:function(event,ui) {
                $("#sidebar-separator").css("left","auto");
                $("#sidebar-separator").css("right",($("#sidebar").width()+15)+"px");
                if (sidebarSeparator.closing) {
                    $("#sidebar").removeClass("closing");
                    toggleSidebar();
                }
            }
    });
    
    function toggleSidebar() {
        //if ($('#sidebar').tabs( "option", "active" ) === false) {
        //    $('#sidebar').tabs( "option", "active",0);
        //}
        var btnSidebar = $("#btn-sidebar");
        btnSidebar.toggleClass("active");
        
        if (!btnSidebar.hasClass("active")) {
            $("#main-container").addClass("sidebar-closed");
        } else {
            $("#main-container").removeClass("sidebar-closed");
        }
    }
    toggleSidebar();
    
    function showSidebar(id) {
        if (!$("#btn-sidebar").hasClass("active")) {
            toggleSidebar();
        }
        sidebar_tabs.activateTab("tab-"+id);
    }
    
    function containsTab(id) {
        return sidebar_tabs.contains("tab-"+id);
    }
    
    return {
        addTab: addTab,
        show: showSidebar,
        containsTab: containsTab
    }
    
}();
