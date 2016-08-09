/**
 * Copyright 2013, 2016 IBM Corp.
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



RED.tabs = (function() {


    function createTabs(options) {
        var tabs = {};
        var currentTabWidth;
        var currentActiveTabWidth = 0;

        var ul = $("#"+options.id);
        ul.addClass("red-ui-tabs");
        ul.children().first().addClass("active");
        ul.children().addClass("red-ui-tab");

        function onTabClick() {
            activateTab($(this));
            return false;
        }

        function onTabDblClick() {
            if (options.ondblclick) {
                options.ondblclick(tabs[$(this).attr('href').slice(1)]);
            }
            return false;
        }

        function activateTab(link) {
            if (typeof link === "string") {
                link = ul.find("a[href='#"+link+"']");
            }
            if (!link.parent().hasClass("active")) {
                ul.children().removeClass("active");
                ul.children().css({"transition": "width 100ms"});
                link.parent().addClass("active");
                if (options.onchange) {
                    options.onchange(tabs[link.attr('href').slice(1)]);
                }
                updateTabWidths();
                setTimeout(function() {
                    ul.children().css({"transition": ""});
                },100);
            }
        }

        function updateTabWidths() {
            var tabs = ul.find("li.red-ui-tab");
            var width = ul.width();
            var tabCount = tabs.size();
            var tabWidth = (width-12-(tabCount*6))/tabCount;
            currentTabWidth = 100*tabWidth/width;
            currentActiveTabWidth = currentTabWidth+"%";

            if (options.hasOwnProperty("minimumActiveTabWidth")) {
                if (tabWidth < options.minimumActiveTabWidth) {
                    tabCount -= 1;
                    tabWidth = (width-12-options.minimumActiveTabWidth-(tabCount*6))/tabCount;
                    currentTabWidth = 100*tabWidth/width;
                    currentActiveTabWidth = options.minimumActiveTabWidth+"px";
                } else {
                    currentActiveTabWidth = 0;
                }
            }
            tabs.css({width:currentTabWidth+"%"});
            if (tabWidth < 50) {
                ul.find(".red-ui-tab-close").hide();
                ul.find(".red-ui-tab-icon").hide();
                ul.find(".red-ui-tab-label").css({paddingLeft:Math.min(12,Math.max(0,tabWidth-38))+"px"})
            } else {
                ul.find(".red-ui-tab-close").show();
                ul.find(".red-ui-tab-icon").show();
                ul.find(".red-ui-tab-label").css({paddingLeft:""})
            }
            if (currentActiveTabWidth !== 0) {
                ul.find("li.red-ui-tab.active").css({"width":options.minimumActiveTabWidth});
                ul.find("li.red-ui-tab.active .red-ui-tab-close").show();
                ul.find("li.red-ui-tab.active .red-ui-tab-icon").show();
                ul.find("li.red-ui-tab.active .red-ui-tab-label").css({paddingLeft:""})
            }

        }

        ul.find("li.red-ui-tab a").on("click",onTabClick).on("dblclick",onTabDblClick);
        updateTabWidths();


        function removeTab(id) {
            var li = ul.find("a[href='#"+id+"']").parent();
            if (li.hasClass("active")) {
                var tab = li.prev();
                if (tab.size() === 0) {
                    tab = li.next();
                }
                activateTab(tab.find("a"));
            }
            li.remove();
            if (options.onremove) {
                options.onremove(tabs[id]);
            }
            delete tabs[id];
            updateTabWidths();
        }

        return {
            addTab: function(tab) {
                tabs[tab.id] = tab;
                var li = $("<li/>",{class:"red-ui-tab"}).appendTo(ul);
                li.data("tabId",tab.id);
                var link = $("<a/>",{href:"#"+tab.id, class:"red-ui-tab-label"}).appendTo(li);
                if (tab.icon) {
                    $('<img src="'+tab.icon+'" class="red-ui-tab-icon"/>').appendTo(link);
                }
                $('<span/>').text(tab.label).appendTo(link);

                link.on("click",onTabClick);
                link.on("dblclick",onTabDblClick);
                if (tab.closeable) {
                    var closeLink = $("<a/>",{href:"#",class:"red-ui-tab-close"}).appendTo(li);
                    closeLink.append('<i class="fa fa-times" />');

                    closeLink.on("click",function(event) {
                        removeTab(tab.id);
                    });
                }
                updateTabWidths();
                if (options.onadd) {
                    options.onadd(tab);
                }
                link.attr("title",tab.label);
                if (ul.find("li.red-ui-tab").size() == 1) {
                    activateTab(link);
                }
                if (options.onreorder) {
                    var originalTabOrder;
                    var tabDragIndex;
                    var tabElements = [];
                    var startDragIndex;

                    li.draggable({
                        axis:"x",
                        distance: 20,
                        start: function(event,ui) {
                            originalTabOrder = [];
                            tabElements = [];
                            ul.children().each(function(i) {
                                tabElements[i] = {
                                    el:$(this),
                                    text: $(this).text(),
                                    left: $(this).position().left,
                                    width: $(this).width()
                                };
                                if ($(this).is(li)) {
                                    tabDragIndex = i;
                                    startDragIndex = i;
                                }
                                originalTabOrder.push($(this).data("tabId"));
                            });
                            ul.children().each(function(i) {
                                if (i!==tabDragIndex) {
                                    $(this).css({
                                        position: 'absolute',
                                        left: tabElements[i].left+"px",
                                        width: tabElements[i].width+2,
                                        transition: "left 0.3s"
                                    });
                                }

                            })
                            if (!li.hasClass('active')) {
                                li.css({'zIndex':1});
                            }
                        },
                        drag: function(event,ui) {
                            ui.position.left += tabElements[tabDragIndex].left;
                            var tabCenter = ui.position.left + tabElements[tabDragIndex].width/2;
                            for (var i=0;i<tabElements.length;i++) {
                                if (i === tabDragIndex) {
                                    continue;
                                }
                                if (tabCenter > tabElements[i].left && tabCenter < tabElements[i].left+tabElements[i].width) {
                                    if (i < tabDragIndex) {
                                        tabElements[i].left += tabElements[tabDragIndex].width+8;
                                        tabElements[tabDragIndex].el.detach().insertBefore(tabElements[i].el);
                                    } else {
                                        tabElements[i].left -= tabElements[tabDragIndex].width+8;
                                        tabElements[tabDragIndex].el.detach().insertAfter(tabElements[i].el);
                                    }
                                    tabElements[i].el.css({left:tabElements[i].left+"px"});

                                    tabElements.splice(i, 0, tabElements.splice(tabDragIndex, 1)[0]);

                                    tabDragIndex = i;
                                    break;
                                }
                            }

                            // console.log(ui.position.left,ui.offset.left);
                        },
                        stop: function(event,ui) {
                            ul.children().css({position:"relative",left:"",transition:""});
                            if (!li.hasClass('active')) {
                                li.css({zIndex:""});
                            }
                            updateTabWidths();
                            if (startDragIndex !== tabDragIndex) {
                                options.onreorder(originalTabOrder, $.makeArray(ul.children().map(function() { return $(this).data('tabId');})));
                            }
                            activateTab(tabElements[tabDragIndex].el.data('tabId'));
                        }
                    })
                }
            },
            removeTab: removeTab,
            activateTab: activateTab,
            resize: updateTabWidths,
            count: function() {
                return ul.find("li.red-ui-tab").size();
            },
            contains: function(id) {
                return ul.find("a[href='#"+id+"']").length > 0;
            },
            renameTab: function(id,label) {
                tabs[id].label = label;
                var tab = ul.find("a[href='#"+id+"']");
                tab.attr("title",label);
                tab.find("span").text(label);
                updateTabWidths();
            },
            order: function(order) {
                var existingTabOrder = $.makeArray(ul.children().map(function() { return $(this).data('tabId');}));
                if (existingTabOrder.length !== order.length) {
                    return
                }
                var i;
                var match = true;
                for (i=0;i<order.length;i++) {
                    if (order[i] !== existingTabOrder[i]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    return;
                }
                var existingTabMap = {};
                var existingTabs = ul.children().detach().each(function() {
                    existingTabMap[$(this).data("tabId")] = $(this);
                });
                for (i=0;i<order.length;i++) {
                    existingTabMap[order[i]].appendTo(ul);
                }
            }

        }
    }

    return {
        create: createTabs
    }
})();
