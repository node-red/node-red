/**
 * Copyright 2014 IBM Corp.
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
 


RED.menu = (function() {
    
    var menuItems = {};
    
    function createMenuItem(opt) {
        var item;
        if (opt === null) {
            item = $('<li class="divider"></li>');
        } else {
            item = $('<li></li>');
            var link = $('<a '+(opt.id?'id="'+opt.id+'" ':'')+'tabindex="-1" href="#">'+
                (opt.toggle?'<i class="fa fa-check pull-right"></i>':'')+
                (opt.icon?'<i class="'+opt.icon+'"></i> ':'')+
                opt.label+
                '</a>').appendTo(item);
                
            menuItems[opt.id] = opt;
            
            if (opt.onselect) {
                link.click(function() {
                        if ($(this).parent().hasClass("disabled")) {
                            return;
                        }
                        if (opt.toggle) {
                            setSelected(opt.id,!isSelected(opt.id));
                        } else {
                            opt.onselect.call(opt);
                        }
                })
            } else if (opt.href) {
                link.attr("target","_blank").attr("href",opt.href);
            }
            if (opt.options) {
                item.addClass("dropdown-submenu pull-left");
                var submenu = $('<ul id="'+opt.id+'-submenu" class="dropdown-menu"></ul>').appendTo(item);
                
                for (var i=0;i<opt.options.length;i++) {
                    createMenuItem(opt.options[i]).appendTo(submenu);
                }
            }
            if (opt.disabled) {
                item.addClass("disabled");
            }
        }
        
        
        return item;
        
    }
    function createMenu(options) {
        
        var button = $("#"+options.id);
        
        var topMenu = $("<ul/>",{class:"dropdown-menu"}).insertAfter(button);
        
        for (var i=0;i<options.options.length;i++) {
            var opt = options.options[i];
            createMenuItem(opt).appendTo(topMenu);
        }
    }
    
    function isSelected(id) {
        return $("#"+id).hasClass("active");
    }
    function setSelected(id,state) {
        if (isSelected(id) == state) {
            return;
        }
        var opt = menuItems[id];
        if (state) {
            $("#"+id).addClass("active");
        } else {
            $("#"+id).removeClass("active");
        }
        if (opt.onselect) {
            opt.onselect.call(opt,state);
        }
    }
    
    function setDisabled(id,state) {
        if (state) {
            $("#"+id).parent().addClass("disabled");
        } else {
            $("#"+id).parent().removeClass("disabled");
        }
    }
    
    function addItem(id,opt) {
        createMenuItem(opt).appendTo("#"+id+"-submenu");
    }
    function removeItem(id) {
        $("#"+id).parent().remove();
    }
    
    return {
        init: createMenu,
        setSelected: setSelected,
        isSelected: isSelected,
        setDisabled: setDisabled,
        addItem: addItem,
        removeItem: removeItem
        //TODO: add an api for replacing a submenu - see library.js:loadFlowLibrary
    }
})();
