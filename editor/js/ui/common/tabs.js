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



RED.tabs = (function() {
    function createTabs(options) {
        var tabs = {};
        var currentTabWidth;
        var currentActiveTabWidth = 0;

        var ul = $("#"+options.id);
        var wrapper = ul.wrap( "<div>" ).parent();
        var scrollContainer = ul.wrap( "<div>" ).parent();
        wrapper.addClass("red-ui-tabs");
        if (options.addButton && typeof options.addButton === 'function') {
            wrapper.addClass("red-ui-tabs-add");
            var addButton = $('<div class="red-ui-tab-button"><a href="#"><i class="fa fa-plus"></i></a></div>').appendTo(wrapper);
            addButton.find('a').click(function(evt) {
                evt.preventDefault();
                options.addButton();
            })

        }
        var scrollLeft;
        var scrollRight;

        if (options.scrollable) {
            wrapper.addClass("red-ui-tabs-scrollable");
            scrollContainer.addClass("red-ui-tabs-scroll-container");
            scrollContainer.scroll(updateScroll);
            scrollLeft = $('<div class="red-ui-tab-button red-ui-tab-scroll red-ui-tab-scroll-left"><a href="#" style="display:none;"><i class="fa fa-caret-left"></i></a></div>').appendTo(wrapper).find("a");
            scrollLeft.on('mousedown',function(evt) { scrollEventHandler(evt,'-=150') }).on('click',function(evt){ evt.preventDefault();});
            scrollRight = $('<div class="red-ui-tab-button red-ui-tab-scroll red-ui-tab-scroll-right"><a href="#" style="display:none;"><i class="fa fa-caret-right"></i></a></div>').appendTo(wrapper).find("a");
            scrollRight.on('mousedown',function(evt) { scrollEventHandler(evt,'+=150') }).on('click',function(evt){ evt.preventDefault();});
        }
        function scrollEventHandler(evt,dir) {
            evt.preventDefault();
            if ($(this).hasClass('disabled')) {
                return;
            }
            var currentScrollLeft = scrollContainer.scrollLeft();
            scrollContainer.animate( { scrollLeft: dir }, 100);
            var interval = setInterval(function() {
                var newScrollLeft = scrollContainer.scrollLeft()
                if (newScrollLeft === currentScrollLeft) {
                    clearInterval(interval);
                    return;
                }
                currentScrollLeft = newScrollLeft;
                scrollContainer.animate( { scrollLeft: dir }, 100);
            },100);
            $(this).one('mouseup',function() {
                clearInterval(interval);
            })
        }


        ul.children().first().addClass("active");
        ul.children().addClass("red-ui-tab");

        function onTabClick() {
            activateTab($(this));
            return false;
        }

        function updateScroll() {
            if (ul.children().length !== 0) {
                var sl = scrollContainer.scrollLeft();
                var scWidth = scrollContainer.width();
                var ulWidth = ul.width();
                if (sl === 0) {
                    scrollLeft.hide();
                } else {
                    scrollLeft.show();
                }
                if (sl === ulWidth-scWidth) {
                    scrollRight.hide();
                } else {
                    scrollRight.show();
                }
            }
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
            if (link.length === 0) {
                return;
            }
            if (!link.parent().hasClass("active")) {
                ul.children().removeClass("active");
                ul.children().css({"transition": "width 100ms"});
                link.parent().addClass("active");
                if (options.scrollable) {
                    var pos = link.parent().position().left;
                    if (pos-21 < 0) {
                        scrollContainer.animate( { scrollLeft: '+='+(pos-50) }, 300);
                    } else if (pos + 120 > scrollContainer.width()) {
                        scrollContainer.animate( { scrollLeft: '+='+(pos + 140-scrollContainer.width()) }, 300);
                    }
                }
                if (options.onchange) {
                    options.onchange(tabs[link.attr('href').slice(1)]);
                }
                updateTabWidths();
                setTimeout(function() {
                    ul.children().css({"transition": ""});
                },100);
            }
        }
        function activatePreviousTab() {
            var previous = ul.find("li.active").prev();
            if (previous.length > 0) {
                activateTab(previous.find("a"));
            }
        }
        function activateNextTab() {
            var next = ul.find("li.active").next();
            if (next.length > 0) {
                activateTab(next.find("a"));
            }
        }

        function updateTabWidths() {
            var tabs = ul.find("li.red-ui-tab");
            var width = wrapper.width();
            var tabCount = tabs.size();
            var tabWidth = (width-12-(tabCount*6))/tabCount;
            currentTabWidth = (100*tabWidth/width)+"%";
            currentActiveTabWidth = currentTabWidth+"%";
            if (options.scrollable) {
                tabWidth = Math.max(tabWidth,140);
                currentTabWidth = tabWidth+"px";
                currentActiveTabWidth = 0;
                var listWidth = Math.max(wrapper.width(),12+(tabWidth+6)*tabCount);
                ul.width(listWidth);
                updateScroll();
            } else if (options.hasOwnProperty("minimumActiveTabWidth")) {
                if (tabWidth < options.minimumActiveTabWidth) {
                    tabCount -= 1;
                    tabWidth = (width-12-options.minimumActiveTabWidth-(tabCount*6))/tabCount;
                    currentTabWidth = (100*tabWidth/width)+"%";
                    currentActiveTabWidth = options.minimumActiveTabWidth+"px";
                } else {
                    currentActiveTabWidth = 0;
                }
            }
            tabs.css({width:currentTabWidth});
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
        setTimeout(function() {
            updateTabWidths();
        },0);


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
                var span = $('<span/>',{class:"bidiAware"}).text(tab.label).appendTo(link);
                span.attr('dir', RED.text.bidi.resolveBaseTextDir(tab.label));

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
                            ui.position.left += tabElements[tabDragIndex].left+scrollContainer.scrollLeft();
                            var tabCenter = ui.position.left + tabElements[tabDragIndex].width/2 - scrollContainer.scrollLeft();
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
            nextTab: activateNextTab,
            previousTab: activatePreviousTab,
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
                tab.find("span").text(label).attr('dir', RED.text.bidi.resolveBaseTextDir(label));
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
