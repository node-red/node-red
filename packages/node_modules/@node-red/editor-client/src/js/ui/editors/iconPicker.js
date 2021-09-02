RED.editor.iconPicker = (function() {
    function showIconPicker(container, backgroundColor, iconPath, faOnly, done) {
        var picker = $('<div class="red-ui-icon-picker">');
        var searchDiv = $("<div>",{class:"red-ui-search-container"}).appendTo(picker);
        searchInput = $('<input type="text">').attr("placeholder",RED._("editor.searchIcons")).appendTo(searchDiv).searchBox({
            delay: 50,
            change: function() {
                var searchTerm = $(this).val().trim();
                if (searchTerm === "") {
                    iconList.find(".red-ui-icon-list-module").show();
                    iconList.find(".red-ui-icon-list-icon").show();
                } else {
                    iconList.find(".red-ui-icon-list-module").hide();
                    iconList.find(".red-ui-icon-list-icon").each(function(i,n) {
                        if ($(n).data('icon').indexOf(searchTerm) === -1) {
                            $(n).hide();
                        } else {
                            $(n).show();
                        }
                    });
                }
            }
        });

        var row = $('<div>').appendTo(picker);
        var iconList = $('<div class="red-ui-icon-list">').appendTo(picker);
        var metaRow = $('<div class="red-ui-icon-meta"></div>').appendTo(picker);
        var summary = $('<span>').appendTo(metaRow);
        var resetButton = $('<button type="button" class="red-ui-button red-ui-button-small">'+RED._("editor.useDefault")+'</button>').appendTo(metaRow).on("click", function(e) {
            e.preventDefault();
            iconPanel.hide();
            done(null);
        });
        if (!backgroundColor && faOnly) {
            iconList.addClass("red-ui-icon-list-dark");
        }
        setTimeout(function() {
            var iconSets = RED.nodes.getIconSets();
            Object.keys(iconSets).forEach(function(moduleName) {
                if (faOnly && (moduleName !== "font-awesome")) {
                    return;
                }
                var icons = iconSets[moduleName];
                if (icons.length > 0) {
                    // selectIconModule.append($("<option></option>").val(moduleName).text(moduleName));
                    var header = $('<div class="red-ui-icon-list-module"></div>').text(moduleName).appendTo(iconList);
                    $('<i class="fa fa-cube"></i>').prependTo(header);
                    icons.forEach(function(icon) {
                        var iconDiv = $('<div>',{class:"red-ui-icon-list-icon"}).appendTo(iconList);
                        var nodeDiv = $('<div>',{class:"red-ui-search-result-node"}).appendTo(iconDiv);
                        var icon_url = RED.settings.apiRootUrl+"icons/"+moduleName+"/"+icon;
                        iconDiv.data('icon',icon_url);
                        if (backgroundColor) {
                            nodeDiv.css({
                                'backgroundColor': backgroundColor
                            });
                            var borderColor = RED.utils.getDarkerColor(backgroundColor);
                            if (borderColor !== backgroundColor) {
                                nodeDiv.css('border-color',borderColor)
                            }

                        }
                        var iconContainer = $('<div/>',{class:"red-ui-palette-icon-container"}).appendTo(nodeDiv);
                        RED.utils.createIconElement(icon_url, iconContainer, true);

                        if (iconPath.module === moduleName && iconPath.file === icon) {
                            iconDiv.addClass("selected");
                        }
                        iconDiv.on("mouseover", function() {
                            summary.text(icon);
                        })
                        iconDiv.on("mouseout", function() {
                            summary.html("&nbsp;");
                        })
                        iconDiv.on("click", function() {
                            iconPanel.hide();
                            done(moduleName+"/"+icon);
                        })
                    })
                }
            });
            setTimeout(function() {
                spinner.remove();
            },50);
        },300);
        var spinner = RED.utils.addSpinnerOverlay(iconList,true);
        var iconPanel = RED.popover.panel(picker);
        iconPanel.show({
            target: container
        })


        picker.slideDown(100);
        searchInput.trigger("focus");
    }
    return {
        show: showIconPicker
    }
})();
