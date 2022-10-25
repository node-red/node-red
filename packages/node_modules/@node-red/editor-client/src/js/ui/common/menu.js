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
RED.menu = (function() {

    var menuItems = {};
    let menuItemCount = 0

    function createMenuItem(opt) {
        var item;

        if (opt !== null && opt.id) {
            var themeSetting = RED.settings.theme("menu."+opt.id);
            if (themeSetting === false) {
                return null;
            }
        }

        function setInitialState() {
            var savedStateActive = RED.settings.get("menu-" + opt.id);
            if (opt.setting) {
                // May need to migrate pre-0.17 setting

                if (savedStateActive !== null) {
                    RED.settings.set(opt.setting,savedStateActive);
                    RED.settings.remove("menu-" + opt.id);
                } else {
                    savedStateActive = RED.settings.get(opt.setting);
                }
            }
            if (savedStateActive) {
                link.addClass("active");
                triggerAction(opt.id,true);
            } else if (savedStateActive === false) {
                link.removeClass("active");
                triggerAction(opt.id,false);
            } else if (opt.hasOwnProperty("selected")) {
                if (opt.selected) {
                    link.addClass("active");
                } else {
                    link.removeClass("active");
                }
                triggerAction(opt.id,opt.selected);
            }
        }

        if (opt === null) {
            item = $('<li class="red-ui-menu-divider"></li>');
        } else {
            item = $('<li></li>');
            if (!opt.id) {
                opt.id = 'red-ui-menu-item-'+(menuItemCount++)
            }
            if (opt.group) {
                item.addClass("red-ui-menu-group-"+opt.group);
            }
            var linkContent = '<a '+(opt.id?'id="'+opt.id+'" ':'')+'tabindex="-1" href="#">';
            if (opt.toggle) {
                linkContent += '<i class="fa fa-square'+(opt.direction!=='right'?" pull-left":"")+'"></i>';
                linkContent += '<i class="fa fa-check-square'+(opt.direction!=='right'?" pull-left":"")+'"></i>';

            }
            if (opt.icon !== undefined) {
                if (/\.(png|svg)/.test(opt.icon)) {
                    linkContent += '<img src="'+opt.icon+'"/> ';
                } else {
                    linkContent += '<i class="'+(opt.icon?opt.icon:'" style="display: inline-block;"')+'"></i> ';
                }
            }
            let label = opt.label
            if (!opt.label && typeof opt.onselect === 'string') {
                label = RED.actions.getLabel(opt.onselect)
            }
            if (opt.sublabel) {
                linkContent += '<span class="red-ui-menu-label-container"><span class="red-ui-menu-label">'+label+'</span>'+
                               '<span class="red-ui-menu-sublabel">'+opt.sublabel+'</span></span>'
            } else {
                linkContent += '<span class="red-ui-menu-label"><span>'+label+'</span></span>'
            }

            linkContent += '</a>';

            var link = $(linkContent).appendTo(item);
            opt.link = link;
            if (typeof opt.onselect === 'string' || opt.shortcut) {
                var shortcut = opt.shortcut || RED.keyboard.getShortcut(opt.onselect);
                if (shortcut && shortcut.key) {
                    opt.shortcutSpan = $('<span class="red-ui-popover-key">'+RED.keyboard.formatKey(shortcut.key, true)+'</span>').appendTo(link.find(".red-ui-menu-label"));
                }
            }

            menuItems[opt.id] = opt;

            if (opt.onselect) {
                link.on("click", function(e) {
                    e.preventDefault();
                    if ($(this).parent().hasClass("disabled")) {
                        return;
                    }
                    if (opt.toggle) {
                        if (opt.toggle === true) {
                            setSelected(opt.id, !isSelected(opt.id));
                        } else {
                            setSelected(opt.id, true);
                        }
                    } else {
                        triggerAction(opt.id);
                    }
                });
                if (opt.toggle) {
                    setInitialState();
                }
            } else if (opt.href) {
                link.attr("target","_blank").attr("href",opt.href);
            } else if (!opt.options) {
                item.addClass("disabled");
                link.on("click", function(event) {
                    event.preventDefault();
                });
            }
            if (opt.options) {
                item.addClass("red-ui-menu-dropdown-submenu"+(opt.direction!=='right'?" pull-left":""));
                var submenu = $('<ul id="'+opt.id+'-submenu" class="red-ui-menu-dropdown"></ul>').appendTo(item);
                var hasIcons = false
                var hasSubmenus = false

                for (var i=0;i<opt.options.length;i++) {

                    if (opt.options[i]) {
                        if (opt.onpreselect && opt.options[i].onpreselect === undefined) {
                            opt.options[i].onpreselect = opt.onpreselect
                        }
                        if (opt.onpostselect && opt.options[i].onpostselect === undefined) {
                            opt.options[i].onpostselect = opt.onpostselect
                        }
                        opt.options[i].direction = opt.direction
                        hasIcons = hasIcons || (opt.options[i].icon);
                        hasSubmenus = hasSubmenus || (opt.options[i].options);
                    }

                    var li = createMenuItem(opt.options[i]);
                    if (li) {
                        li.appendTo(submenu);
                    }
                }
                if (!hasIcons) {
                    submenu.addClass("red-ui-menu-dropdown-noicons")
                }
                if (hasSubmenus) {
                    submenu.addClass("red-ui-menu-dropdown-submenus")
                }


            }
            if (opt.disabled) {
                item.addClass("disabled");
            }
            if (opt.visible === false) {
                item.addClass("hide");
            }
        }


        return item;

    }
    function createMenu(options) {
        var topMenu = $("<ul/>",{class:"red-ui-menu red-ui-menu-dropdown pull-right"});
        if (options.direction) {
            topMenu.addClass("red-ui-menu-dropdown-direction-"+options.direction)
        }
        if (options.id) {
            topMenu.attr({id:options.id+"-submenu"});
            var menuParent = $("#"+options.id);
            if (menuParent.length === 1) {
                topMenu.insertAfter(menuParent);
                menuParent.on("click", function(evt) {
                    evt.stopPropagation();
                    evt.preventDefault();
                    if (topMenu.is(":visible")) {
                        $(document).off("click.red-ui-menu");
                        topMenu.hide();
                    } else {
                        $(document).on("click.red-ui-menu", function(evt) {
                            $(document).off("click.red-ui-menu");
                            activeMenu = null;
                            topMenu.hide();
                        });
                        $(".red-ui-menu.red-ui-menu-dropdown").hide();
                        topMenu.show();
                    }
                })
            }
        }

        var lastAddedSeparator = false;
        var hasSubmenus = false;
        var hasIcons = false;
        for (var i=0;i<options.options.length;i++) {
            var opt = options.options[i];
            if (opt) {
                if (options.onpreselect && opt.onpreselect === undefined) {
                    opt.onpreselect = options.onpreselect
                }
                if (options.onpostselect && opt.onpostselect === undefined) {
                    opt.onpostselect = options.onpostselect
                }
                opt.direction = options.direction || 'left'
            }
            if (opt !== null || !lastAddedSeparator) {
                hasIcons = hasIcons || (opt && opt.icon);
                hasSubmenus = hasSubmenus || (opt && opt.options);
                var li = createMenuItem(opt);
                if (li) {
                    li.appendTo(topMenu);
                    lastAddedSeparator = (opt === null);
                }
            }
        }
        if (!hasIcons) {
            topMenu.addClass("red-ui-menu-dropdown-noicons")
        }
        if (hasSubmenus) {
            topMenu.addClass("red-ui-menu-dropdown-submenus")
        }
        return topMenu;
    }

    function triggerAction(id, args) {
        var opt = menuItems[id];
        var callback = opt.onselect;
        if (opt.onpreselect) {
            opt.onpreselect.call(opt,args)
        }
        if (typeof opt.onselect === 'string') {
            callback = RED.actions.get(opt.onselect);
        }
        if (callback) {
            callback.call(opt,args);
        } else {
            console.log("No callback for",id,opt.onselect);
        }
        if (opt.onpostselect) {
            opt.onpostselect.call(opt,args)
        }
    }

    function isSelected(id) {
        return $("#" + id).hasClass("active");
    }

    function setSelected(id,state) {
        var alreadySet = false;
        if (isSelected(id) == state) {
            alreadySet = true;
        }
        var opt = menuItems[id];
        if (state) {
            $("#"+id).addClass("active");
        } else {
            $("#"+id).removeClass("active");
        }
        if (opt) {
            if (opt.toggle && typeof opt.toggle === "string") {
                if (state) {
                    for (var m in menuItems) {
                        if (menuItems.hasOwnProperty(m)) {
                            var mi = menuItems[m];
                            if (mi.id != opt.id && opt.toggle == mi.toggle) {
                                setSelected(mi.id,false);
                            }
                        }
                    }
                }
            }
            if (!alreadySet && opt.onselect) {
                triggerAction(opt.id,state);
            }
            if (!opt.local && !alreadySet) {
                RED.settings.set(opt.setting||("menu-"+opt.id), state);
            }
        }
    }

    function toggleSelected(id) {
        setSelected(id,!isSelected(id));
    }

    function setDisabled(id,state) {
        if (state) {
            $("#"+id).parent().addClass("disabled");
        } else {
            $("#"+id).parent().removeClass("disabled");
        }
    }

    function setVisible(id,state) {
        if (!state) {
            $("#"+id).parent().addClass("hide");
        } else {
            $("#"+id).parent().removeClass("hide");
        }
    }

    function addItem(id,opt) {
        var item = createMenuItem(opt);
        if (opt !== null && opt.group) {
            var groupItems = $("#"+id+"-submenu").children(".red-ui-menu-group-"+opt.group);
            if (groupItems.length === 0) {
                item.appendTo("#"+id+"-submenu");
            } else {
                for (var i=0;i<groupItems.length;i++) {
                    var groupItem = groupItems[i];
                    var label = $(groupItem).find(".red-ui-menu-label").html();
                    if (opt.label < label) {
                        $(groupItem).before(item);
                        break;
                    }
                }
                if (i === groupItems.length) {
                    item.appendTo("#"+id+"-submenu");
                }
            }
        } else {
            item.appendTo("#"+id+"-submenu");
        }
    }
    function removeItem(id) {
        $("#"+id).parent().remove();
    }

    function setAction(id,action) {
        var opt = menuItems[id];
        if (opt) {
            opt.onselect = action;
        }
    }

    function refreshShortcuts() {
        for (var id in menuItems) {
            if (menuItems.hasOwnProperty(id)) {
                var opt = menuItems[id];
                if (typeof opt.onselect === "string" && opt.shortcutSpan) {
                    opt.shortcutSpan.remove();
                    delete opt.shortcutSpan;
                    var shortcut = RED.keyboard.getShortcut(opt.onselect);
                    if (shortcut && shortcut.key) {
                        opt.shortcutSpan = $('<span class="red-ui-popover-key">'+RED.keyboard.formatKey(shortcut.key, true)+'</span>').appendTo(opt.link.find(".red-ui-menu-label"));
                    }
                }
            }
        }
    }

    return {
        init: createMenu,
        setSelected: setSelected,
        isSelected: isSelected,
        toggleSelected: toggleSelected,
        setDisabled: setDisabled,
        setVisible: setVisible,
        addItem: addItem,
        removeItem: removeItem,
        setAction: setAction,
        refreshShortcuts: refreshShortcuts
    }
})();
