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


 RED.view.navigator = (function() {

     var nav_scale = 25;
     var nav_width = 5000/nav_scale;
     var nav_height = 5000/nav_scale;

     var navContainer;
     var navBox;
     var navBorder;
     var navVis;
     var scrollPos;
     var scaleFactor;
     var chartSize;
     var dimensions;
     var isDragging;
     var isShowing = false;

     function refreshNodes() {
         if (!isShowing) {
             return;
         }
         var navNode = navVis.selectAll(".red-ui-navigator-node").data(RED.view.getActiveNodes(),function(d){return d.id});
         navNode.exit().remove();
         navNode.enter().insert("rect")
             .attr('class','red-ui-navigator-node')
             .attr("pointer-events", "none");
         navNode.each(function(d) {
             d3.select(this).attr("x",function(d) { return (d.x-d.w/2)/nav_scale })
             .attr("y",function(d) { return (d.y-d.h/2)/nav_scale })
             .attr("width",function(d) { return Math.max(9,d.w/nav_scale) })
             .attr("height",function(d) { return Math.max(3,d.h/nav_scale) })
             .attr("fill",function(d) { return RED.utils.getNodeColor(d.type,d._def);})
         });
     }
     function onScroll() {
         if (!isDragging) {
             resizeNavBorder();
         }
     }
     function resizeNavBorder() {
         if (navBorder) {
             scaleFactor = RED.view.scale();
             chartSize = [ $("#red-ui-workspace-chart").width(), $("#red-ui-workspace-chart").height()];
             scrollPos = [$("#red-ui-workspace-chart").scrollLeft(),$("#red-ui-workspace-chart").scrollTop()];
             navBorder.attr('x',scrollPos[0]/nav_scale)
                      .attr('y',scrollPos[1]/nav_scale)
                      .attr('width',chartSize[0]/nav_scale/scaleFactor)
                      .attr('height',chartSize[1]/nav_scale/scaleFactor)
         }
     }
     function toggle() {
         if (!isShowing) {
             isShowing = true;
             $("#red-ui-view-navigate").addClass("selected");
             resizeNavBorder();
             refreshNodes();
             $("#red-ui-workspace-chart").on("scroll",onScroll);
             navContainer.fadeIn(200);
         } else {
             isShowing = false;
             navContainer.fadeOut(100);
             $("#red-ui-workspace-chart").off("scroll",onScroll);
             $("#red-ui-view-navigate").removeClass("selected");
         }
     }

     return {
         init: function() {

             $(window).on("resize", resizeNavBorder);
             RED.events.on("sidebar:resize",resizeNavBorder);
             RED.actions.add("core:toggle-navigator",toggle);
             var hideTimeout;

             navContainer = $('<div>').css({
                 "position":"absolute",
                 "bottom":$("#red-ui-workspace-footer").height(),
                 "right":0,
                 zIndex: 1
             }).appendTo("#red-ui-workspace").hide();

             navBox = d3.select(navContainer[0])
                 .append("svg:svg")
                 .attr("width", nav_width)
                 .attr("height", nav_height)
                 .attr("pointer-events", "all")
                 .attr("id","red-ui-navigator-canvas")

             navBox.append("rect").attr("x",0).attr("y",0).attr("width",nav_width).attr("height",nav_height).style({
                 fill:"none",
                 stroke:"none",
                 pointerEvents:"all"
             }).on("mousedown", function() {
                 // Update these in case they have changed
                 scaleFactor = RED.view.scale();
                 chartSize = [ $("#red-ui-workspace-chart").width(), $("#red-ui-workspace-chart").height()];
                 dimensions = [chartSize[0]/nav_scale/scaleFactor, chartSize[1]/nav_scale/scaleFactor];
                 var newX = Math.max(0,Math.min(d3.event.offsetX+dimensions[0]/2,nav_width)-dimensions[0]);
                 var newY = Math.max(0,Math.min(d3.event.offsetY+dimensions[1]/2,nav_height)-dimensions[1]);
                 navBorder.attr('x',newX).attr('y',newY);
                 isDragging = true;
                 $("#red-ui-workspace-chart").scrollLeft(newX*nav_scale*scaleFactor);
                 $("#red-ui-workspace-chart").scrollTop(newY*nav_scale*scaleFactor);
             }).on("mousemove", function() {
                 if (!isDragging) { return }
                 if (d3.event.buttons === 0) {
                     isDragging = false;
                     return;
                 }
                 var newX = Math.max(0,Math.min(d3.event.offsetX+dimensions[0]/2,nav_width)-dimensions[0]);
                 var newY = Math.max(0,Math.min(d3.event.offsetY+dimensions[1]/2,nav_height)-dimensions[1]);
                 navBorder.attr('x',newX).attr('y',newY);
                 $("#red-ui-workspace-chart").scrollLeft(newX*nav_scale*scaleFactor);
                 $("#red-ui-workspace-chart").scrollTop(newY*nav_scale*scaleFactor);
             }).on("mouseup", function() {
                 isDragging = false;
             })

             navBorder = navBox.append("rect").attr("class","red-ui-navigator-border")

             navVis = navBox.append("svg:g")

             RED.statusBar.add({
                 id: "view-navigator",
                 align: "right",
                 element: $('<button class="red-ui-footer-button-toggle single" id="red-ui-view-navigate"><i class="fa fa-map-o"></i></button>')
             })

            $("#red-ui-view-navigate").on("click", function(evt) {
                evt.preventDefault();
                toggle();
            })
            RED.popover.tooltip($("#red-ui-view-navigate"),RED._('actions.toggle-navigator'),'core:toggle-navigator');
        },
        refresh: refreshNodes,
        resize: resizeNavBorder,
        toggle: toggle
    }


})();
