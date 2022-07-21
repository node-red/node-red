RED.contextMenu = (function () {

    let menu;
    function createMenu() {
        // menu = RED.popover.menu({
        //     options: [
        //         {
        //             label: 'delete selection',
        //             onselect: function() {
        //                 RED.actions.invoke('core:delete-selection')
        //                 RED.view.focus()
        //             }
        //         },
        //         { label: 'world' }
        //     ],
        //     width: 200,
        // })
    }

    function disposeMenu() {
        $(document).off("mousedown.red-ui-workspace-context-menu");
        if (menu) {
            menu.remove();
        }
        menu = null;
    }
    function show(options) {
        if (menu) {
            menu.remove()
        }

        const selection = RED.view.selection()
        const noSelection = !selection || Object.keys(selection).length === 0
        const hasSelection = (selection.nodes && selection.nodes.length > 0);
        const hasMultipleSelection = hasSelection && selection.nodes.length > 1;
        const virtulLinks = (selection.links && selection.links.filter(e => !!e.link)) || [];
        const wireLinks = (selection.links && selection.links.filter(e => !e.link)) || [];
        const hasLinks = wireLinks.length > 0;
        const isSingleLink = !hasSelection && hasLinks && wireLinks.length === 1
        const isMultipleLinks = !hasSelection && hasLinks && wireLinks.length > 1
        const canDelete = hasSelection || hasLinks
        const isGroup = hasSelection && selection.nodes.length === 1 && selection.nodes[0].type === 'group'

        const canRemoveFromGroup = hasSelection && !!selection.nodes[0].g
        const offset = $("#red-ui-workspace-chart").offset()

        // addX/addY must be the position in the workspace accounting for both scroll and scale
        // The +5 is because we display the contextMenu -5,-5 to actual click position
        let addX = (options.x + 5 - offset.left + $("#red-ui-workspace-chart").scrollLeft()) / RED.view.scale()
        let addY = (options.y + 5 - offset.top + $("#red-ui-workspace-chart").scrollTop()) / RED.view.scale()

        const menuItems = [
            { onselect: 'core:show-action-list', onpostselect: function () { } },
            {
                label: RED._("contextMenu.insert"),
                options: [
                    {
                        label: RED._("contextMenu.node"),
                        onselect: function () {
                            RED.view.showQuickAddDialog({
                                position: [addX, addY],
                                touchTrigger: true,
                                splice: isSingleLink ? selection.links[0] : undefined,
                                // spliceMultiple: isMultipleLinks
                            })
                        },
                        onpostselect: function() {
                            // ensure quick add dialog search input has focus
                            $('#red-ui-type-search-input').trigger('focus')
                        }
                    },
                    (hasLinks) ? { // has least 1 wire selected
                        label: RED._("contextMenu.junction"),
                        onselect: 'core:split-wires-with-junctions',
                        disabled: !hasLinks
                    } : {
                        label: RED._("contextMenu.junction"),
                        onselect: function () {
                            const nn = {
                                _def: { defaults: {} },
                                type: 'junction',
                                z: RED.workspaces.active(),
                                id: RED.nodes.id(),
                                x: addX,
                                y: addY,
                                w: 0, h: 0,
                                outputs: 1,
                                inputs: 1,
                                dirty: true
                            }
                            const historyEvent = {
                                dirty: RED.nodes.dirty(),
                                t: 'add',
                                junctions: [nn]
                            }
                            RED.nodes.addJunction(nn);
                            RED.history.push(historyEvent);
                            RED.nodes.dirty(true);
                            RED.view.select({nodes: [nn] });
                            RED.view.redraw(true)
                        }
                    },
                    {
                        label: RED._("contextMenu.linkNodes"),
                        onselect: 'core:split-wire-with-link-nodes',
                        disabled: !hasLinks
                    }
                ]



            }
        ]

        menuItems.push(
            null,
            { onselect: 'core:undo', disabled: RED.history.list().length === 0 },
            { onselect: 'core:redo', disabled: RED.history.listRedo().length === 0 },
            null,
            { onselect: 'core:cut-selection-to-internal-clipboard', label: RED._("keyboard.cutNode"), disabled: !hasSelection },
            { onselect: 'core:copy-selection-to-internal-clipboard', label: RED._("keyboard.copyNode"), disabled: !hasSelection },
            { onselect: 'core:paste-from-internal-clipboard', label: RED._("keyboard.pasteNode"), disabled: !RED.view.clipboard() },
            { onselect: 'core:delete-selection', disabled: !canDelete },
            { onselect: 'core:show-export-dialog', label: RED._("menu.label.export") },
            { onselect: 'core:select-all-nodes' }
        )

        if (hasSelection) {
            menuItems.push(
                null,
                isGroup ?
                    { onselect: 'core:ungroup-selection', disabled: !isGroup }
                    : { onselect: 'core:group-selection', disabled: !hasSelection }
            )
            if (canRemoveFromGroup) {
                menuItems.push({ onselect: 'core:remove-selection-from-group', label: RED._("menu.label.groupRemoveSelection") })
            }

        }

        var direction = "right";
        var MENU_WIDTH = 500; // can not use menu width here
        if ((options.x -$(document).scrollLeft()) >
            ($(window).width() -MENU_WIDTH)) {
            direction = "left";
        }

        menu = RED.menu.init({
            direction: direction,
            onpreselect: function() {
                disposeMenu()
            },
            onpostselect: function () {
                RED.view.focus()
            },
            options: menuItems
        });

        menu.attr("id", "red-ui-workspace-context-menu");
        menu.css({
            position: "absolute"
        })
        menu.appendTo("body");

        // TODO: prevent the menu from overflowing the window.

        var top = options.y
        var left = options.x

        if (top + menu.height() - $(document).scrollTop() > $(window).height()) {
            top -= (top + menu.height()) - $(window).height() + 22;
        }
        if (left + menu.width() - $(document).scrollLeft() > $(window).width()) {
            left -= (left + menu.width()) - $(window).width() + 18;
        }
        menu.css({
            top: top + "px",
            left: left + "px"
        })
        $(".red-ui-menu.red-ui-menu-dropdown").hide();
        $(document).on("mousedown.red-ui-workspace-context-menu", function (evt) {
            if (menu && menu[0].contains(evt.target)) {
                return
            }
            disposeMenu()
        });
        menu.show();
        // set focus to first item so that pressing escape key closes the menu
        $("#red-ui-workspace-context-menu :first(ul) > a").trigger("focus")

    }
    // Allow escape key hook and other editor events to close context menu
    RED.keyboard.add("red-ui-workspace-context-menu", "escape", function () { RED.contextMenu.hide() })
    RED.events.on("editor:open", function () { RED.contextMenu.hide() });
    RED.events.on("search:open", function () { RED.contextMenu.hide() });
    RED.events.on("type-search:open", function () { RED.contextMenu.hide() });
    RED.events.on("actionList:open", function () { RED.contextMenu.hide() });
    RED.events.on("view:selection-changed", function () { RED.contextMenu.hide() });
    return {
        show: show,
        hide: disposeMenu
    }
})()
