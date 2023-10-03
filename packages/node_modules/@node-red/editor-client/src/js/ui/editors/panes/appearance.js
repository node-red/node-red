;(function() {

    RED.editor.registerEditPane("editor-tab-appearance", function(node) {
        return {
            label: RED._("editor-tab.appearance"),
            name: RED._("editor-tab.appearance"),
            iconClass: "fa fa-object-group",
            create: function(container) {
                this.content = container;
                buildAppearanceForm(this.content,node);

                if (node.type === 'subflow') {
                    this.defaultIcon = "node-red/subflow.svg";
                } else {
                    var iconPath = RED.utils.getDefaultNodeIcon(node._def,node);
                    this.defaultIcon = iconPath.module+"/"+iconPath.file;
                    if (node.icon && node.icon !== this.defaultIcon) {
                        this.isDefaultIcon = false;
                    } else {
                        this.isDefaultIcon = true;
                    }
                }
            },
            resize: function(size) {

            },
            close: function() {

            },
            show: function() {
                refreshLabelForm(this.content, node);
            },
            apply: function(editState) {
                if (updateLabels(node, editState.changes, editState.outputMap)) {
                    editState.changed = true;
                }
                if (!node._def.defaults || !node._def.defaults.hasOwnProperty("icon")) {
                    var icon = $("#red-ui-editor-node-icon").val()||"";
                    if (!this.isDefaultIcon) {
                        if ((node.icon && icon !== node.icon) || (!node.icon && icon !== "")) {
                            editState.changes.icon = node.icon;
                            node.icon = icon;
                            editState.changed = true;
                        }
                    } else {
                        if (icon !== "" && icon !== this.defaultIcon) {
                            editState.changes.icon = node.icon;
                            node.icon = icon;
                            editState.changed = true;
                        } else {
                            var iconPath = RED.utils.getDefaultNodeIcon(node._def, node);
                            var currentDefaultIcon = iconPath.module+"/"+iconPath.file;
                            if (this.defaultIcon !== currentDefaultIcon) {
                                editState.changes.icon = node.icon;
                                node.icon = currentDefaultIcon;
                                editState.changed = true;
                            }
                        }
                    }
                }
                if (node.type === "subflow") {
                    var newCategory = $("#subflow-appearance-input-category").val().trim();
                    if (newCategory === "_custom_") {
                        newCategory = $("#subflow-appearance-input-custom-category").val().trim();
                        if (newCategory === "") {
                            newCategory = node.category;
                        }
                    }
                    if (newCategory === 'subflows') {
                        newCategory = '';
                    }
                    if (newCategory != node.category) {
                        editState.changes['category'] = node.category;
                        node.category = newCategory;
                        editState.changed = true;
                    }

                    var oldColor = node.color;
                    var newColor =  $("#red-ui-editor-node-color").val();
                    if (oldColor !== newColor) {
                        editState.changes.color = node.color;
                        node.color = newColor;
                        editState.changed = true;
                        RED.utils.clearNodeColorCache();
                        if (node.type === "subflow") {
                            var nodeDefinition = RED.nodes.getType(
                                "subflow:" + node.id
                            );
                            nodeDefinition["color"] = newColor;
                        }
                    }



                }
                var showLabel = node._def.hasOwnProperty("showLabel")?node._def.showLabel:true;

                if (!$("#node-input-show-label").prop('checked')) {
                    // Not checked - hide label

                    if (showLabel) {
                        // Default to show label
                        if (node.l !== false) {
                            editState.changes.l = node.l;
                            editState.changed = true;
                        }
                        node.l = false;
                    } else {
                        // Node has showLabel:false (eg link nodes)
                        if (node.hasOwnProperty('l') && node.l) {
                            editState.changes.l = node.l;
                            editState.changed = true;
                        }
                        delete node.l;
                    }
                } else {
                    // Checked - show label
                    if (showLabel) {
                        // Default to show label
                        if (node.hasOwnProperty('l') && !node.l) {
                            editState.changes.l = node.l;
                            editState.changed = true;
                        }
                        delete node.l;
                    } else {
                        if (!node.l) {
                            editState.changes.l = node.l;
                            editState.changed = true;
                        }
                        node.l = true;
                    }
                }
            }
        };
    });

    function buildAppearanceForm(container,node) {
        var dialogForm = $('<form class="dialog-form form-horizontal" autocomplete="off"></form>').appendTo(container);

        var i,row;

        if (node.type === "subflow") {
            var categoryRow = $("<div/>", {
                class: "form-row"
            }).appendTo(dialogForm);
            $("<label/>", {
                for: "subflow-appearance-input-category",
                "data-i18n": "editor:subflow.category"
            }).appendTo(categoryRow);
            var categorySelector = $("<select/>", {
                id: "subflow-appearance-input-category"
            }).css({
                width: "250px"
            }).appendTo(categoryRow);
            $("<input/>", {
                type: "text",
                id: "subflow-appearance-input-custom-category"
            }).css({
                display: "none",
                "margin-left": "10px",
                width: "calc(100% - 250px)"
            }).appendTo(categoryRow);

            var categories = RED.palette.getCategories();
            categories.sort(function(A,B) {
                return A.label.localeCompare(B.label);
            });
            categories.forEach(function(cat) {
                categorySelector.append($("<option/>").val(cat.id).text(cat.label));
            });
            categorySelector.append($("<option/>").attr('disabled',true).text("---"));
            categorySelector.append($("<option/>").val("_custom_").text(RED._("palette.addCategory")));

            $("#subflow-appearance-input-category").on("change", function() {
                var val = $(this).val();
                if (val === "_custom_") {
                    $("#subflow-appearance-input-category").width(120);
                    $("#subflow-appearance-input-custom-category").show();
                } else {
                    $("#subflow-appearance-input-category").width(250);
                    $("#subflow-appearance-input-custom-category").hide();
                }
            });

            $("#subflow-appearance-input-category").val(node.category||"subflows");
            var userCount = 0;
            var subflowType = "subflow:"+node.id;

            // RED.nodes.eachNode(function(n) {
            //     if (n.type === subflowType) {
            //         userCount++;
            //     }
            // });
            $("#red-ui-editor-subflow-user-count")
                .text(RED._("subflow.subflowInstances", {count:node.instances.length})).show();
        }

        $('<div class="form-row">'+
            '<label for="node-input-show-label" data-i18n="editor.label"></label>'+
            '<span style="margin-right: 2px;"/>'+
            '<input type="checkbox" id="node-input-show-label"/>'+
        '</div>').appendTo(dialogForm);

        $("#node-input-show-label").toggleButton({
            enabledLabel: RED._("editor.show"),
            disabledLabel: RED._("editor.hide")
        });

        if (!node.hasOwnProperty("l")) {
            // Show label unless def.showLabel set to false
            node.l =  node._def.hasOwnProperty("showLabel")?node._def.showLabel:true;
        }
        $("#node-input-show-label").prop("checked",node.l).trigger("change");

        if (node.type === "subflow") {
            // subflow template can select its color
            var color = node.color ? node.color : "#DDAA99";
            var colorRow = $("<div/>", {
                class: "form-row"
            }).appendTo(dialogForm);
            $("<label/>").text(RED._("editor.color")).appendTo(colorRow);

            var recommendedColors = [
                "#DDAA99",
                "#3FADB5", "#87A980", "#A6BBCF",
                "#AAAA66", "#C0C0C0", "#C0DEED",
                "#C7E9C0", "#D7D7A0", "#D8BFD8",
                "#DAC4B4", "#DEB887", "#DEBD5C",
                "#E2D96E", "#E6E0F8", "#E7E7AE",
                "#E9967A", "#F3B567", "#FDD0A2",
                "#FDF0C2", "#FFAAAA", "#FFCC66",
                "#FFF0F0", "#FFFFFF"
            ];

            RED.editor.colorPicker.create({
                id: "red-ui-editor-node-color",
                value: color,
                defaultValue: "#DDAA99",
                palette: recommendedColors,
                sortPalette: function (a, b) {return a.l - b.l;}
            }).appendTo(colorRow);

            $("#red-ui-editor-node-color").on('change', function(ev) {
                // Horribly out of scope...
                var colour = $(this).val();
                nodeDiv.css('backgroundColor',colour);
                var borderColor = RED.utils.getDarkerColor(colour);
                if (borderColor !== colour) {
                    nodeDiv.css('border-color',borderColor);
                }
            });
        }


        // If a node has icon property in defaults, the icon of the node cannot be modified. (e.g, ui_button node in dashboard)
        if ((!node._def.defaults || !node._def.defaults.hasOwnProperty("icon"))) {
            var iconRow = $('<div class="form-row"></div>').appendTo(dialogForm);
            $('<label data-i18n="editor.settingIcon">').appendTo(iconRow);

            var iconButton = $('<button type="button" class="red-ui-button red-ui-editor-node-appearance-button">').appendTo(iconRow);
            $('<i class="fa fa-caret-down"></i>').appendTo(iconButton);
            var nodeDiv = $('<div>',{class:"red-ui-search-result-node"}).appendTo(iconButton);
            var colour = RED.utils.getNodeColor(node.type, node._def);
            var icon_url = RED.utils.getNodeIcon(node._def,node);
            nodeDiv.css('backgroundColor',colour);
            var borderColor = RED.utils.getDarkerColor(colour);
            if (borderColor !== colour) {
                nodeDiv.css('border-color',borderColor);
            }

            var iconContainer = $('<div/>',{class:"red-ui-palette-icon-container"}).appendTo(nodeDiv);
            RED.utils.createIconElement(icon_url, iconContainer, true);

            iconButton.on("click", function(e) {
                e.preventDefault();
                var iconPath;
                var icon = $("#red-ui-editor-node-icon").val()||"";
                if (icon) {
                    iconPath = RED.utils.separateIconPath(icon);
                } else {
                    iconPath = RED.utils.getDefaultNodeIcon(node._def, node);
                }
                var backgroundColor = RED.utils.getNodeColor(node.type, node._def);
                if (node.type === "subflow") {
                    backgroundColor = $("#red-ui-editor-node-color").val();
                }
                RED.editor.iconPicker.show(iconButton,backgroundColor,iconPath,false,function(newIcon) {
                    $("#red-ui-editor-node-icon").val(newIcon||"");
                    var icon_url = RED.utils.getNodeIcon(node._def,{type:node.type,icon:newIcon});
                    RED.utils.createIconElement(icon_url, iconContainer, true);
                });
            });

            RED.popover.tooltip(iconButton, function() {
                return $("#red-ui-editor-node-icon").val() || RED._("editor.default");
            });
            $('<input type="hidden" id="red-ui-editor-node-icon">').val(node.icon).appendTo(iconRow);
        }


        $('<div class="form-row"><span data-i18n="editor.portLabels"></span></div>').appendTo(dialogForm);

        var inputCount = node.inputs || node._def.inputs || 0;
        var outputCount = node.outputs || node._def.outputs || 0;
        if (node.type === 'subflow') {
            inputCount = node.in.length;
            outputCount = node.out.length;
        }

        var inputLabels = node.inputLabels || [];
        var outputLabels = node.outputLabels || [];

        var inputPlaceholder = node._def.inputLabels?RED._("editor.defaultLabel"):RED._("editor.noDefaultLabel");
        var outputPlaceholder = node._def.outputLabels?RED._("editor.defaultLabel"):RED._("editor.noDefaultLabel");

        $('<div class="form-row"><span style="margin-left: 50px;" data-i18n="editor.labelInputs"></span><div id="red-ui-editor-node-label-form-inputs"></div></div>').appendTo(dialogForm);
        var inputsDiv = $("#red-ui-editor-node-label-form-inputs");
        if (inputCount > 0) {
            for (i=0;i<inputCount;i++) {
                buildLabelRow("input",i,inputLabels[i],inputPlaceholder).appendTo(inputsDiv);
            }
        } else {
            buildLabelRow().appendTo(inputsDiv);
        }
        $('<div class="form-row"><span style="margin-left: 50px;" data-i18n="editor.labelOutputs"></span><div id="red-ui-editor-node-label-form-outputs"></div></div>').appendTo(dialogForm);
        var outputsDiv = $("#red-ui-editor-node-label-form-outputs");
        if (outputCount > 0) {
            for (i=0;i<outputCount;i++) {
                buildLabelRow("output",i,outputLabels[i],outputPlaceholder).appendTo(outputsDiv);
            }
        } else {
            buildLabelRow().appendTo(outputsDiv);
        }
    }

    function refreshLabelForm(container,node) {

        var inputPlaceholder = node._def.inputLabels?RED._("editor.defaultLabel"):RED._("editor.noDefaultLabel");
        var outputPlaceholder = node._def.outputLabels?RED._("editor.defaultLabel"):RED._("editor.noDefaultLabel");

        var inputsDiv = $("#red-ui-editor-node-label-form-inputs");
        var outputsDiv = $("#red-ui-editor-node-label-form-outputs");

        var inputCount;
        var formInputs = $("#node-input-inputs").val();
        if (formInputs === undefined) {
            if (node.type === 'subflow') {
                inputCount = node.in.length;
            } else {
                inputCount = node.inputs || node._def.inputs || 0;
            }
        } else {
            inputCount = Math.min(1,Math.max(0,parseInt(formInputs)));
            if (isNaN(inputCount)) {
                inputCount = 0;
            }
        }

        var children = inputsDiv.children();
        var childCount = children.length;
        if (childCount === 1 && $(children[0]).hasClass('red-ui-editor-node-label-form-none')) {
            childCount--;
        }

        if (childCount < inputCount) {
            if (childCount === 0) {
                // remove the 'none' placeholder
                $(children[0]).remove();
            }
            for (i = childCount;i<inputCount;i++) {
                buildLabelRow("input",i,"",inputPlaceholder).appendTo(inputsDiv);
            }
        } else if (childCount > inputCount) {
            for (i=inputCount;i<childCount;i++) {
                $(children[i]).remove();
            }
            if (inputCount === 0) {
                buildLabelRow().appendTo(inputsDiv);
            }
        }

        var outputCount;
        var i;
        var formOutputs = $("#node-input-outputs").val();

        if (formOutputs === undefined) {
            if (node.type === 'subflow') {
                outputCount = node.out.length;
            } else {
                inputCount = node.outputs || node._def.outputs || 0;
            }
        } else if (isNaN(formOutputs)) {
            var outputMap = JSON.parse(formOutputs);
            var keys = Object.keys(outputMap);
            children = outputsDiv.children();
            childCount = children.length;
            if (childCount === 1 && $(children[0]).hasClass('red-ui-editor-node-label-form-none')) {
                childCount--;
            }

            outputCount = 0;
            var rows = [];
            keys.forEach(function(p) {
                var row = $("#red-ui-editor-node-label-form-output-"+p).parent();
                if (row.length === 0 && outputMap[p] !== -1) {
                    if (childCount === 0) {
                        $(children[0]).remove();
                        childCount = -1;
                    }
                    row = buildLabelRow("output",p,"",outputPlaceholder);
                } else {
                    row.detach();
                }
                if (outputMap[p] !== -1) {
                    outputCount++;
                    rows.push({i:parseInt(outputMap[p]),r:row});
                }
            });
            rows.sort(function(A,B) {
                return A.i-B.i;
            });
            rows.forEach(function(r,i) {
                r.r.find("label").text((i+1)+".");
                r.r.appendTo(outputsDiv);
            });
            if (rows.length === 0) {
                buildLabelRow("output",i,"").appendTo(outputsDiv);
            } else {

            }
        } else {
            outputCount = Math.max(0,parseInt(formOutputs));
        }
        children = outputsDiv.children();
        childCount = children.length;
        if (childCount === 1 && $(children[0]).hasClass('red-ui-editor-node-label-form-none')) {
            childCount--;
        }
        if (childCount < outputCount) {
            if (childCount === 0) {
                // remove the 'none' placeholder
                $(children[0]).remove();
            }
            for (i = childCount;i<outputCount;i++) {
                buildLabelRow("output",i,"").appendTo(outputsDiv);
            }
        } else if (childCount > outputCount) {
            for (i=outputCount;i<childCount;i++) {
                $(children[i]).remove();
            }
            if (outputCount === 0) {
                buildLabelRow().appendTo(outputsDiv);
            }
        }
    }

    function buildLabelRow(type, index, value, placeHolder) {
        var result = $('<div>',{class:"red-ui-editor-node-label-form-row"});
        if (type === undefined) {
            $('<span>').text(RED._("editor.noDefaultLabel")).appendTo(result);
            result.addClass("red-ui-editor-node-label-form-none");
        } else {
            result.addClass("");
            var id = "red-ui-editor-node-label-form-"+type+"-"+index;
            $('<label>',{for:id}).text((index+1)+".").appendTo(result);
            var input = $('<input>',{type:"text",id:id, placeholder: placeHolder}).val(value).appendTo(result);
            var clear = $('<button type="button" class="red-ui-button red-ui-button-small"><i class="fa fa-times"></i></button>').appendTo(result);
            clear.on("click", function(evt) {
                evt.preventDefault();
                input.val("");
            });
        }
        return result;
    }

    function updateLabels(node, changes, outputMap) {
        var inputLabels = $("#red-ui-editor-node-label-form-inputs").children().find("input");
        var outputLabels = $("#red-ui-editor-node-label-form-outputs").children().find("input");

        var hasNonBlankLabel = false;
        var changed = false;
        var newValue = inputLabels.map(function() {
            var v = $(this).val();
            hasNonBlankLabel = hasNonBlankLabel || v!== "";
            return v;
        }).toArray().slice(0,node.inputs);
        if ((node.inputLabels === undefined && hasNonBlankLabel) ||
            (node.inputLabels !== undefined && JSON.stringify(newValue) !== JSON.stringify(node.inputLabels))) {
            changes.inputLabels = node.inputLabels;
            node.inputLabels = newValue;
            changed = true;
        }
        hasNonBlankLabel = false;
        newValue = new Array(node.outputs);
        outputLabels.each(function() {
            var index = $(this).attr('id').substring("red-ui-editor-node-label-form-output-".length);
            if (outputMap && outputMap.hasOwnProperty(index)) {
                index = parseInt(outputMap[index]);
                if (index === -1) {
                    return;
                }
            }
            var v = $(this).val();
            hasNonBlankLabel = hasNonBlankLabel || v!== "";

            // mark changed output port labels as dirty
            if (node.type === "subflow" && (!node.outputLabels || node.outputLabels[index] !== v)) {
                node.out[index].dirty = true;
            }

            newValue[index] = v;
        });

        if ((node.outputLabels === undefined && hasNonBlankLabel) ||
            (node.outputLabels !== undefined && JSON.stringify(newValue) !== JSON.stringify(node.outputLabels))) {
            changes.outputLabels = node.outputLabels;
            node.outputLabels = newValue;
            changed = true;

            // trigger redraw of dirty port labels
            if (node.type === "subflow") {
                RED.view.redraw();
            }

        }
        return changed;
    }


})();
