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



RED.tabs = (function() {


    function createTabs(options) {
        var tabs = {};
        var currentTabWidth;
        var currentActiveTabWidth = 0;

        var ul = $("#"+options.id)
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
            } else {
                ul.find(".red-ui-tab-close").show();
                ul.find(".red-ui-tab-icon").show();
            }
            if (currentActiveTabWidth !== 0) {
                ul.find("li.red-ui-tab.active").css({"width":options.minimumActiveTabWidth});
                ul.find("li.red-ui-tab.active .red-ui-tab-close").show();
                ul.find("li.red-ui-tab.active .red-ui-tab-icon").show();
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
            }

        }
    }

    return {
        create: createTabs
    }
})();
