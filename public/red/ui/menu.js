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

        function setState() {
            var savedStateActive = isSavedStateActive(opt.id);
            if (savedStateActive) {
                link.addClass("active");
                opt.onselect.call(opt, true);
            } else if (savedStateActive === false) {
                link.removeClass("active");
                opt.onselect.call(opt, false);
            } else if (opt.hasOwnProperty("selected")) {
                if (opt.selected) {
                    link.addClass("active");
                } else {
                    link.removeClass("active");
                }
                opt.onselect.call(opt, opt.selected);
            }
        }

        if (opt === null) {
            item = $('<li class="divider"></li>');
        } else {
            item = $('<li></li>');
            
            var linkContent = '<a '+(opt.id?'id="'+opt.id+'" ':'')+'tabindex="-1" href="#">';
            if (opt.toggle) {
                linkContent += '<i class="fa fa-square pull-left"></i>';
                linkContent += '<i class="fa fa-check-square pull-left"></i>';
                
            }
            if (opt.icon !== undefined) {
                if (/\.png/.test(opt.icon)) {
                    linkContent += '<img src="'+opt.icon+'"/> ';
                } else {
                    linkContent += '<i class="'+(opt.icon?opt.icon:'" style="display: inline-block;"')+'"></i> ';
                }
            }
            
            if (opt.sublabel) {
                linkContent += '<span class="menu-label-container"><span class="menu-label">'+opt.label+'</span>'+
                               '<span class="menu-sublabel">'+opt.sublabel+'</span></span>'
            } else {
                linkContent += '<span class="menu-label">'+opt.label+'</span>'
            }
            
            linkContent += '</a>';
                
            var link = $(linkContent).appendTo(item);

            menuItems[opt.id] = opt;

            if (opt.onselect) {
                link.click(function() {
                    if ($(this).parent().hasClass("disabled")) {
                        return;
                    }
                    if (opt.toggle) {
                        var selected = isSelected(opt.id);
                        if (typeof opt.toggle === "string") {
                            if (!selected) {
                                for (var m in menuItems) {
                                    if (menuItems.hasOwnProperty(m)) {
                                        var mi = menuItems[m];
                                        if (mi.id != opt.id && opt.toggle == mi.toggle) {
                                            setSelected(mi.id,false);
                                        }
                                    }
                                }
                                setSelected(opt.id,true);
                            }
                        } else {
                            setSelected(opt.id, !selected);
                        }
                    } else {
                        opt.onselect.call(opt);
                    }
                });
                setState();
            } else if (opt.href) {
                link.attr("target","_blank").attr("href",opt.href);
            } else if (!opt.options) {
                item.addClass("disabled");
                link.click(function(event) {
                    event.preventDefault();
                });
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
            if (opt.tip) {
                item.popover({
                    placement:"left",
                    trigger: "hover",
                    delay: { show: 350, hide: 20 },
                    html: true,
                    container:'body',
                    content: opt.tip
                });
            }
            
        }


        return item;

    }
    function createMenu(options) {

        var button = $("#"+options.id);

        //button.click(function(event) {
        //    $("#"+options.id+"-submenu").show();
        //    event.preventDefault();
        //});
        
        
        var topMenu = $("<ul/>",{id:options.id+"-submenu", class:"dropdown-menu pull-right"}).insertAfter(button);

        for (var i=0;i<options.options.length;i++) {
            var opt = options.options[i];
            createMenuItem(opt).appendTo(topMenu);
        }
    }

    function isSavedStateActive(id) {
        return RED.settings.get("menu-" + id);
    }

    function isSelected(id) {
        return $("#" + id).hasClass("active");
    }

    function setSavedState(id, state) {
        RED.settings.set("menu-" + id, state);
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
        setSavedState(id, state);
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

    function setAction(id,action) {
        menuItems[id].onselect = action;
        $("#"+id).click(function() {
            if ($(this).parent().hasClass("disabled")) {
                return;
            }
            if (menuItems[id].toggle) {
                setSelected(id,!isSelected(id));
            } else {
                menuItems[id].onselect.call(menuItems[id]);
            }
        });
    }

    return {
        init: createMenu,
        setSelected: setSelected,
        isSelected: isSelected,
        setDisabled: setDisabled,
        addItem: addItem,
        removeItem: removeItem,
        setAction: setAction
        //TODO: add an api for replacing a submenu - see library.js:loadFlowLibrary
    }
})();
