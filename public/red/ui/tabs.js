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
 


RED.tabs = function() {
    
    
    function createTabs(options) {
        var ul = $("#"+options.id)
        ul.addClass("red-ui-tabs");
        ul.children().first().addClass("active");
        ul.children().addClass("red-ui-tab");
        
        if (options.onadd) {
            var addItem = $('<li class="red-ui-add-tab"/>').appendTo(ul);
            var addLink = $('<a href="#"><i class="icon icon-plus"></i></a>').appendTo(addItem);
            
            addLink.on("click", function() {
                 options.onadd()
            });
        }
        
        function onTabClick() {
            ul.children().removeClass("active");
            $(this).parent().addClass("active");
            if (options.onchange) {
                options.onchange($(this).attr('href'));
            }
            return false;
        }
        function updateTabWidths() {
            var tabs = ul.find("li.red-ui-tab");
            var pct = (100/tabs.size())-2;
            tabs.css({width:pct+"%"});
                
        }
        ul.find("li.red-ui-tab a").on("click",onTabClick);
        updateTabWidths();
        
        return {
            addTab: function(tab) {
                var li = $("<li/>",{class:"red-ui-tab"});
                
                if (options.onadd) {
                    ul.find(".red-ui-add-tab").before(li);
                } else {
                    li.appendTo(ul);
                }
                var link = $("<a/>",{href:"#"+tab.id}).appendTo(li);
                link.html(tab.label);
                link.on("click",onTabClick);
                updateTabWidths();
            }
        }
    }
    
    return {
        create: createTabs
    }
}();
