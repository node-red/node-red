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

RED.palette = (function() {

    var exclusion = ['config','unknown','deprecated'];
    var core = ['subflows', 'input', 'output', 'function', 'social', 'mobile', 'storage', 'analysis', 'advanced'];

    var categoryContainers = {};

    function createCategoryContainer(category, label){
        label = label || category.replace("_", " ");
        var catDiv = $('<div id="palette-container-'+category+'" class="palette-category palette-close hide">'+
            '<div id="palette-header-'+category+'" class="palette-header"><i class="expanded fa fa-angle-down"></i><span>'+label+'</span></div>'+
            '<div class="palette-content" id="palette-base-category-'+category+'">'+
            '<div id="palette-'+category+'-input"></div>'+
            '<div id="palette-'+category+'-output"></div>'+
            '<div id="palette-'+category+'-function"></div>'+
            '</div>'+
            '</div>').appendTo("#palette-container");

        categoryContainers[category] = {
            container: catDiv,
            close: function() {
                catDiv.removeClass("palette-open");
                catDiv.addClass("palette-closed");
                $("#palette-base-category-"+category).slideUp();
                $("#palette-header-"+category+" i").removeClass("expanded");
            },
            open: function() {
                catDiv.addClass("palette-open");
                catDiv.removeClass("palette-closed");
                $("#palette-base-category-"+category).slideDown();
                $("#palette-header-"+category+" i").addClass("expanded");
            },
            toggle: function() {
                if (catDiv.hasClass("palette-open")) {
                    categoryContainers[category].close();
                } else {
                    categoryContainers[category].open();
                }
            }
        };

        $("#palette-header-"+category).on('click', function(e) {
            categoryContainers[category].toggle();
        });
    }

    function setLabel(type, el,label, info) {
        var nodeWidth = 82;
        var nodeHeight = 25;
        var lineHeight = 20;
        var portHeight = 10;

        var words = label.split(" ");

        var displayLines = [];

        var currentLine = words[0];
        var currentLineWidth = RED.view.calculateTextWidth(currentLine, "palette_label", 0);

        for (var i=1;i<words.length;i++) {
            var newWidth = RED.view.calculateTextWidth(currentLine+" "+words[i], "palette_label", 0);
            if (newWidth < nodeWidth) {
                currentLine += " "+words[i];
                currentLineWidth = newWidth;
            } else {
                displayLines.push(currentLine);
                currentLine = words[i];
                currentLineWidth = RED.view.calculateTextWidth(currentLine, "palette_label", 0);
            }
        }
        displayLines.push(currentLine);

        var lines = displayLines.join("<br/>");
        var multiLineNodeHeight = 8+(lineHeight*displayLines.length);
        el.css({height:multiLineNodeHeight+"px"});

        var labelElement = el.find(".palette_label");
        labelElement.html(lines);

        el.find(".palette_port").css({top:(multiLineNodeHeight/2-5)+"px"});

        var popOverContent;
        try {
            var l = "<p><b>"+label+"</b></p>";
            if (label != type) {
                l = "<p><b>"+label+"</b><br/><i>"+type+"</i></p>";
            }
            popOverContent = $(l+(info?info:$("script[data-help-name|='"+type+"']").html()||"<p>"+RED._("palette.noInfo")+"</p>").trim())
                                .filter(function(n) {
                                    return (this.nodeType == 1 && this.nodeName == "P") || (this.nodeType == 3 && this.textContent.trim().length > 0)
                                }).slice(0,2);
        } catch(err) {
            // Malformed HTML may cause errors. TODO: need to understand what can break
            // NON-NLS: internal debug
            console.log("Error generating pop-over label for ",type);
            console.log(err.toString());
            popOverContent = "<p><b>"+label+"</b></p><p>"+RED._("palette.noInfo")+"</p>";
        }

        el.data('popover').setContent(popOverContent);
    }

    function escapeNodeType(nt) {
        return nt.replace(" ","_").replace(".","_").replace(":","_");
    }

    function addNodeType(nt,def) {
        var nodeTypeId = escapeNodeType(nt);
        if ($("#palette_node_"+nodeTypeId).length) {
            return;
        }
        if (exclusion.indexOf(def.category)===-1) {

            var category = def.category.replace(" ","_");
            var rootCategory = category.split("-")[0];

            var d = document.createElement("div");
            d.id = "palette_node_"+nodeTypeId;
            d.type = nt;

            var label = /^(.*?)([ -]in|[ -]out)?$/.exec(nt)[1];
            if (typeof def.paletteLabel !== "undefined") {
                try {
                    label = (typeof def.paletteLabel === "function" ? def.paletteLabel.call(def) : def.paletteLabel)||"";
                } catch(err) {
                    console.log("Definition error: "+nt+".paletteLabel",err);
                }
            }

            $('<div/>',{class:"palette_label"+(def.align=="right"?" palette_label_right":"")}).appendTo(d);

            d.className="palette_node";


            if (def.icon) {
                var icon_url = "arrow-in.png";
                try {
                    icon_url = (typeof def.icon === "function" ? def.icon.call({}) : def.icon);
                } catch(err) {
                    console.log("Definition error: "+nt+".icon",err);
                }
                var iconContainer = $('<div/>',{class:"palette_icon_container"+(def.align=="right"?" palette_icon_container_right":"")}).appendTo(d);
                $('<div/>',{class:"palette_icon",style:"background-image: url(icons/"+icon_url+")"}).appendTo(iconContainer);
            }

            d.style.backgroundColor = def.color;

            if (def.outputs > 0) {
                var portOut = document.createElement("div");
                portOut.className = "palette_port palette_port_output";
                d.appendChild(portOut);
            }

            if (def.inputs > 0) {
                var portIn = document.createElement("div");
                portIn.className = "palette_port palette_port_input";
                d.appendChild(portIn);
            }

            if ($("#palette-base-category-"+rootCategory).length === 0) {
                if(core.indexOf(rootCategory) !== -1){
                    createCategoryContainer(rootCategory, RED._("node-red:palette.label."+rootCategory, {defaultValue:rootCategory}));
                } else {
                    var ns = def.set.id;
                    createCategoryContainer(rootCategory, RED._(ns+":palette.label."+rootCategory, {defaultValue:rootCategory}));
                }
            }
            $("#palette-container-"+rootCategory).show();

            if ($("#palette-"+category).length === 0) {
                $("#palette-base-category-"+rootCategory).append('<div id="palette-'+category+'"></div>');
            }

            $("#palette-"+category).append(d);
            d.onmousedown = function(e) { e.preventDefault(); };

            RED.popover.create({
                target:$(d),
                content: "hi",
                delay: { show: 750, hide: 50 }
            });

            // $(d).popover({
            //     title:d.type,
            //     placement:"right",
            //     trigger: "hover",
            //     delay: { show: 750, hide: 50 },
            //     html: true,
            //     container:'body'
            // });
            $(d).click(function() {
                RED.view.focus();
                var helpText;
                if (nt.indexOf("subflow:") === 0) {
                    helpText = marked(RED.nodes.subflow(nt.substring(8)).info||"");
                } else {
                    helpText = $("script[data-help-name|='"+d.type+"']").html()||"";
                }
                var help = '<div class="node-help">'+helpText+"</div>";
                RED.sidebar.info.set(help);
            });
            var chart = $("#chart");
            var chartOffset = chart.offset();
            var chartSVG = $("#chart>svg").get(0);
            var activeSpliceLink;
            var mouseX;
            var mouseY;
            var spliceTimer;
            $(d).draggable({
                helper: 'clone',
                appendTo: 'body',
                revert: true,
                revertDuration: 50,
                start: function() {RED.view.focus();},
                stop: function() { d3.select('.link_splice').classed('link_splice',false); if (spliceTimer) { clearTimeout(spliceTimer); spliceTimer = null;}},
                drag: function(e,ui) {
                    // TODO: this is the margin-left of palette node. Hard coding
                    // it here makes me sad
                    ui.position.left += 17.5;
                    if (def.inputs > 0 && def.outputs > 0) {
                        mouseX = e.clientX - chartOffset.left+chart.scrollLeft();
                        mouseY = e.clientY-chartOffset.top +chart.scrollTop();

                        if (!spliceTimer) {
                            spliceTimer = setTimeout(function() {
                                var nodes = [];
                                var bestDistance = Infinity;
                                var bestLink = null;
                                if (chartSVG.getIntersectionList) {
                                    var svgRect = chartSVG.createSVGRect();
                                    svgRect.x = mouseX;
                                    svgRect.y = mouseY;
                                    svgRect.width = 1;
                                    svgRect.height = 1;
                                    nodes = chartSVG.getIntersectionList(svgRect,chartSVG);
                                    mouseX /= RED.view.scale();
                                    mouseY /= RED.view.scale();
                                } else {
                                    // Firefox doesn't do getIntersectionList and that
                                    // makes us sad
                                    mouseX /= RED.view.scale();
                                    mouseY /= RED.view.scale();
                                    nodes = RED.view.getLinksAtPoint(mouseX,mouseY);
                                }
                                for (var i=0;i<nodes.length;i++) {
                                    if (d3.select(nodes[i]).classed('link_background')) {
                                        var length = nodes[i].getTotalLength();
                                        for (var j=0;j<length;j+=10) {
                                            var p = nodes[i].getPointAtLength(j);
                                            var d2 = ((p.x-mouseX)*(p.x-mouseX))+((p.y-mouseY)*(p.y-mouseY));
                                            if (d2 < 200 && d2 < bestDistance) {
                                                bestDistance = d2;
                                                bestLink = nodes[i];
                                            }
                                        }
                                    }
                                }
                                if (activeSpliceLink && activeSpliceLink !== bestLink) {
                                    d3.select(activeSpliceLink.parentNode).classed('link_splice',false);
                                }
                                if (bestLink) {
                                    d3.select(bestLink.parentNode).classed('link_splice',true)
                                } else {
                                    d3.select('.link_splice').classed('link_splice',false);
                                }
                                if (activeSpliceLink !== bestLink) {
                                    if (bestLink) {
                                        $(ui.helper).data('splice',d3.select(bestLink).data()[0]);
                                    } else {
                                        $(ui.helper).removeData('splice');
                                    }
                                }
                                activeSpliceLink = bestLink;
                                spliceTimer = null;
                            },200);
                        }
                    }
                }
            });

            var nodeInfo = null;
            if (def.category == "subflows") {
                $(d).dblclick(function(e) {
                    RED.workspaces.show(nt.substring(8));
                    e.preventDefault();
                });
                nodeInfo = marked(def.info||"");
            }
            setLabel(nt,$(d),label,nodeInfo);

            var categoryNode = $("#palette-container-"+category);
            if (categoryNode.find(".palette_node").length === 1) {
                categoryContainers[category].open();
            }

        }
    }

    function removeNodeType(nt) {
        var nodeTypeId = escapeNodeType(nt);
        var paletteNode = $("#palette_node_"+nodeTypeId);
        var categoryNode = paletteNode.closest(".palette-category");
        paletteNode.remove();
        if (categoryNode.find(".palette_node").length === 0) {
            if (categoryNode.find("i").hasClass("expanded")) {
                categoryNode.find(".palette-content").slideToggle();
                categoryNode.find("i").toggleClass("expanded");
            }
        }
    }
    function hideNodeType(nt) {
        var nodeTypeId = escapeNodeType(nt);
        $("#palette_node_"+nodeTypeId).hide();
    }

    function showNodeType(nt) {
        var nodeTypeId = escapeNodeType(nt);
        $("#palette_node_"+nodeTypeId).show();
    }

    function refreshNodeTypes() {
        RED.nodes.eachSubflow(function(sf) {
            var paletteNode = $("#palette_node_subflow_"+sf.id.replace(".","_"));
            var portInput = paletteNode.find(".palette_port_input");
            var portOutput = paletteNode.find(".palette_port_output");

            if (portInput.length === 0 && sf.in.length > 0) {
                var portIn = document.createElement("div");
                portIn.className = "palette_port palette_port_input";
                paletteNode.append(portIn);
            } else if (portInput.length !== 0 && sf.in.length === 0) {
                portInput.remove();
            }

            if (portOutput.length === 0 && sf.out.length > 0) {
                var portOut = document.createElement("div");
                portOut.className = "palette_port palette_port_output";
                paletteNode.append(portOut);
            } else if (portOutput.length !== 0 && sf.out.length === 0) {
                portOutput.remove();
            }
            setLabel(sf.type+":"+sf.id,paletteNode,sf.name,marked(sf.info||""));
        });
    }

    function filterChange() {
        var val = $("#palette-search-input").val();
        if (val === "") {
            $("#palette-search-clear").hide();
        } else {
            $("#palette-search-clear").show();
        }

        var re = new RegExp(val,'i');
        $("#palette-container .palette_node").each(function(i,el) {
            var currentLabel = $(el).find(".palette_label").text();
            if (val === "" || re.test(el.id) || re.test(currentLabel)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });

        for (var category in categoryContainers) {
            if (categoryContainers.hasOwnProperty(category)) {
                if (categoryContainers[category].container
                        .find(".palette_node")
                        .filter(function() { return $(this).css('display') !== 'none'}).length === 0) {
                    categoryContainers[category].close();
                } else {
                    categoryContainers[category].open();
                }
            }
        }
    }

    function init() {
        $(".palette-spinner").show();
        if (RED.settings.paletteCategories) {
            RED.settings.paletteCategories.forEach(function(category){
                createCategoryContainer(category, RED._("palette.label."+category,{defaultValue:category}));
            });
        } else {
            core.forEach(function(category){
                createCategoryContainer(category, RED._("palette.label."+category,{defaultValue:category}));
            });
        }

        $("#palette-search-input").focus(function(e) {
            RED.keyboard.disable();
        });
        $("#palette-search-input").blur(function(e) {
            RED.keyboard.enable();
        });

        $("#palette-search-clear").on("click",function(e) {
            e.preventDefault();
            $("#palette-search-input").val("");
            filterChange();
            $("#palette-search-input").focus();
        });

        $("#palette-search-input").val("");
        $("#palette-search-input").on("keyup",function() {
            filterChange();
        });

        $("#palette-search-input").on("focus",function() {
            $("body").one("mousedown",function() {
                $("#palette-search-input").blur();
            });
        });

        $("#palette-collapse-all").on("click", function(e) {
            e.preventDefault();
            for (var cat in categoryContainers) {
                if (categoryContainers.hasOwnProperty(cat)) {
                    categoryContainers[cat].close();
                }
            }
        });
        $("#palette-expand-all").on("click", function(e) {
            e.preventDefault();
            for (var cat in categoryContainers) {
                if (categoryContainers.hasOwnProperty(cat)) {
                    categoryContainers[cat].open();
                }
            }
        });
    }

    return {
        init: init,
        add:addNodeType,
        remove:removeNodeType,
        hide:hideNodeType,
        show:showNodeType,
        refresh:refreshNodeTypes
    };
})();
