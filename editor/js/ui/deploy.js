/**
 * Copyright 2016 IBM Corp.
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

RED.deploy = (function() {

    var deploymentTypes = {
        "full":{img:"red/images/deploy-full-o.png"},
        "nodes":{img:"red/images/deploy-nodes-o.png"},
        "flows":{img:"red/images/deploy-flows-o.png"}
    }

    var ignoreDeployWarnings = {
        unknown: false,
        unusedConfig: false,
        invalid: false
    }

    var deploymentType = "full";

    function changeDeploymentType(type) {
        deploymentType = type;
        $("#btn-deploy img").attr("src",deploymentTypes[type].img);
    }

    var currentDiff = null;

    /**
     * options:
     *   type: "default" - Button with drop-down options - no further customisation available
     *   type: "simple"  - Button without dropdown. Customisations:
     *      label: the text to display - default: "Deploy"
     *      icon : the icon to use. Null removes the icon. default: "red/images/deploy-full-o.png"
     */
    function init(options) {
        options = options || {};
        var type = options.type || "default";

        if (type == "default") {
            $('<li><span class="deploy-button-group button-group">'+
              '<a id="btn-deploy" class="deploy-button disabled" href="#"><img id="btn-deploy-icon" src="red/images/deploy-full-o.png"> <span>'+RED._("deploy.deploy")+'</span></a>'+
              '<a id="btn-deploy-options" data-toggle="dropdown" class="deploy-button" href="#"><i class="fa fa-caret-down"></i></a>'+
              '</span></li>').prependTo(".header-toolbar");
              RED.menu.init({id:"btn-deploy-options",
                  options: [
                      {id:"deploymenu-item-full",toggle:"deploy-type",icon:"red/images/deploy-full.png",label:RED._("deploy.full"),sublabel:RED._("deploy.fullDesc"),selected: true, onselect:function(s) { if(s){changeDeploymentType("full")}}},
                      {id:"deploymenu-item-flow",toggle:"deploy-type",icon:"red/images/deploy-flows.png",label:RED._("deploy.modifiedFlows"),sublabel:RED._("deploy.modifiedFlowsDesc"), onselect:function(s) {if(s){changeDeploymentType("flows")}}},
                      {id:"deploymenu-item-node",toggle:"deploy-type",icon:"red/images/deploy-nodes.png",label:RED._("deploy.modifiedNodes"),sublabel:RED._("deploy.modifiedNodesDesc"),onselect:function(s) { if(s){changeDeploymentType("nodes")}}}
                  ]
              });
        } else if (type == "simple") {
            var label = options.label || RED._("deploy.deploy");
            var icon = 'red/images/deploy-full-o.png';
            if (options.hasOwnProperty('icon')) {
                icon = options.icon;
            }

            $('<li><span class="deploy-button-group button-group">'+
              '<a id="btn-deploy" class="deploy-button disabled" href="#">'+
              (icon?'<img id="btn-deploy-icon" src="'+icon+'"> ':'')+
              '<span>'+label+'</span></a>'+
              '</span></li>').prependTo(".header-toolbar");
        }

        $('#btn-deploy').click(function() { save(); });

        $( "#node-dialog-confirm-deploy" ).dialog({
                title: RED._('deploy.confirm.button.confirm'),
                modal: true,
                autoOpen: false,
                width: 550,
                height: "auto",
                buttons: [
                    {
                        text: RED._("deploy.confirm.button.cancel"),
                        click: function() {
                            $( this ).dialog( "close" );
                        }
                    },
                    // {
                    //     id: "node-dialog-confirm-deploy-review",
                    //     text: RED._("deploy.confirm.button.review"),
                    //     class: "primary",
                    //     click: function() {
                    //         showDiff();
                    //         $( this ).dialog( "close" );
                    //     }
                    // },
                    {
                        text: RED._("deploy.confirm.button.confirm"),
                        class: "primary",
                        click: function() {

                            var ignoreChecked = $( "#node-dialog-confirm-deploy-hide" ).prop("checked");
                            if (ignoreChecked) {
                                ignoreDeployWarnings[$( "#node-dialog-confirm-deploy-type" ).val()] = true;
                            }
                            save(true,$( "#node-dialog-confirm-deploy-type" ).val() === "conflict");
                            $( this ).dialog( "close" );
                        }
                    }
                ],
                create: function() {
                    $("#node-dialog-confirm-deploy").parent().find("div.ui-dialog-buttonpane")
                        .prepend('<div style="height:0; vertical-align: middle; display:inline-block; margin-top: 13px; float:left;">'+
                                   '<input style="vertical-align:top;" type="checkbox" id="node-dialog-confirm-deploy-hide">'+
                                   '<label style="display:inline;" for="node-dialog-confirm-deploy-hide"> do not warn about this again</label>'+
                                   '<input type="hidden" id="node-dialog-confirm-deploy-type">'+
                                   '</div>');
                },
                open: function() {
                    if ($( "#node-dialog-confirm-deploy-type" ).val() === "conflict") {
                        // $("#node-dialog-confirm-deploy-review").show();
                        $("#node-dialog-confirm-deploy-hide").parent().hide();
                    } else {
                        // $("#node-dialog-confirm-deploy-review").hide();
                        $("#node-dialog-confirm-deploy-hide").parent().show();
                    }
                }
        });

        RED.events.on('nodes:change',function(state) {
            if (state.dirty) {
                window.onbeforeunload = function() {
                    return RED._("deploy.confirm.undeployedChanges");
                }
                $("#btn-deploy").removeClass("disabled");
            } else {
                window.onbeforeunload = null;
                $("#btn-deploy").addClass("disabled");
            }
        });

        // $("#node-dialog-view-diff").dialog({
        //     title: RED._('deploy.confirm.button.review'),
        //     modal: true,
        //     autoOpen: false,
        //     buttons: [
        //         {
        //             text: RED._("deploy.confirm.button.cancel"),
        //             click: function() {
        //                 $( this ).dialog( "close" );
        //             }
        //         },
        //         {
        //             text: RED._("deploy.confirm.button.merge"),
        //             class: "primary",
        //             click: function() {
        //                 $( this ).dialog( "close" );
        //             }
        //         }
        //     ],
        //     open: function() {
        //         $(this).dialog({width:Math.min($(window).width(),900),height:Math.min($(window).height(),600)});
        //     }
        // });

        // $("#node-dialog-view-diff-diff").editableList({
        //     addButton: false,
        //     scrollOnAdd: false,
        //     addItem: function(container,i,object) {
        //         var tab = object.tab.n;
        //         var tabDiv = $('<div>',{class:"node-diff-tab collapsed"}).appendTo(container);
        //
        //         var titleRow = $('<div>',{class:"node-diff-tab-title"}).appendTo(tabDiv);
        //         titleRow.click(function(evt) {
        //             evt.preventDefault();
        //             titleRow.parent().toggleClass('collapsed');
        //         })
        //         var chevron = $('<i class="fa fa-angle-down node-diff-chevron ">').appendTo(titleRow);
        //         var title = $('<span>').html(tab.label||tab.id).appendTo(titleRow);
        //
        //         var stats = $('<span>',{class:"node-diff-tab-stats"}).appendTo(titleRow);
        //
        //         var addedCount = 0;
        //         var deletedCount = 0;
        //         var changedCount = 0;
        //         var conflictedCount = 0;
        //
        //         object.tab.nodes.forEach(function(node) {
        //             var realNode = RED.nodes.node(node.id);
        //             var hasChanges = false;
        //             if (currentDiff.added[node.id]) {
        //                 addedCount++;
        //                 hasChanges = true;
        //             }
        //             if (currentDiff.deleted[node.id]) {
        //                 deletedCount++;
        //                 hasChanges = true;
        //             }
        //             if (currentDiff.changed[node.id]) {
        //                 changedCount++;
        //                 hasChanges = true;
        //             }
        //             if (currentDiff.conflicted[node.id]) {
        //                 conflictedCount++;
        //                 hasChanges = true;
        //             }
        //
        //             if (hasChanges) {
        //                 var def = RED.nodes.getType(node.type)||{};
        //                 var div = $("<div>",{class:"node-diff-node-entry collapsed"}).appendTo(tabDiv);
        //                 var nodeTitleDiv = $("<div>",{class:"node-diff-node-entry-title"}).appendTo(div);
        //                 nodeTitleDiv.click(function(evt) {
        //                     evt.preventDefault();
        //                     $(this).parent().toggleClass('collapsed');
        //                 })
        //                 var newNode = currentDiff.newConfig.all[node.id];
        //                 var nodePropertiesDiv = $("<div>",{class:"node-diff-node-entry-properties"}).appendTo(div);
        //
        //                 var nodePropertiesTable = $("<table>").appendTo(nodePropertiesDiv);
        //
        //                 if (node.hasOwnProperty('x')) {
        //                     if (newNode.x !== node.x || newNode.y !== node.y) {
        //                         var currentPosition = node.x+", "+node.y
        //                         var newPosition = newNode.x+", "+newNode.y;
        //                         $("<tr><td>position</td><td>"+currentPosition+"</td><td>"+newPosition+"</td></tr>").appendTo(nodePropertiesTable);
        //                     }
        //                 }
        //                 var properties = Object.keys(node).filter(function(p) { return p!='z'&&p!='wires'&&p!=='x'&&p!=='y'&&p!=='id'&&p!=='type'&&(!def.defaults||!def.defaults.hasOwnProperty(p))});
        //                 if (def.defaults) {
        //                     properties = properties.concat(Object.keys(def.defaults));
        //                 }
        //                 properties.forEach(function(d) {
        //                     var localValue = JSON.stringify(node[d]);
        //                     var remoteValue = JSON.stringify(newNode[d]);
        //                     var originalValue = realNode._config[d];
        //
        //                     if (remoteValue !== originalValue) {
        //                         var formattedProperty = formatNodeProperty(node[d]);
        //                         var newFormattedProperty = formatNodeProperty(newNode[d]);
        //                         if (localValue === originalValue) {
        //                             // no conflict change
        //                         } else {
        //                             // conflicting change
        //                         }
        //                         $("<tr><td>"+d+'</td><td class="">'+formattedProperty+'</td><td class="node-diff-property-changed">'+newFormattedProperty+"</td></tr>").appendTo(nodePropertiesTable);
        //                     }
        //
        //                 })
        //                 var nodeChevron = $('<i class="fa fa-angle-down node-diff-chevron">').appendTo(nodeTitleDiv);
        //
        //
        //                 // var leftColumn = $('<div>',{class:"node-diff-column"}).appendTo(div);
        //                 // var rightColumn = $('<div>',{class:"node-diff-column"}).appendTo(div);
        //                 // rightColumn.html("&nbsp");
        //
        //
        //
        //                 var nodeDiv = $("<div>",{class:"node-diff-node-entry-node"}).appendTo(nodeTitleDiv);
        //                 var colour = def.color;
        //                 var icon_url = "arrow-in.png";
        //                 if (node.type === 'tab') {
        //                     colour = "#C0DEED";
        //                     icon_url = "subflow.png";
        //                 } else if (def.category === 'config') {
        //                     icon_url = "cog.png";
        //                 } else if (node.type === 'unknown') {
        //                     icon_url = "alert.png";
        //                 } else {
        //                     icon_url = def.icon;
        //                 }
        //                 nodeDiv.css('backgroundColor',colour);
        //
        //                 var iconContainer = $('<div/>',{class:"palette_icon_container"}).appendTo(nodeDiv);
        //                 $('<div/>',{class:"palette_icon",style:"background-image: url(icons/"+icon_url+")"}).appendTo(iconContainer);
        //
        //
        //
        //                 var contentDiv = $('<div>',{class:"node-diff-node-description"}).appendTo(nodeTitleDiv);
        //
        //                 $('<span>',{class:"node-diff-node-label"}).html(node.label || node.name || node.id).appendTo(contentDiv);
        //                 //$('<div>',{class:"red-ui-search-result-node-type"}).html(node.type).appendTo(contentDiv);
        //                 //$('<div>',{class:"red-ui-search-result-node-id"}).html(node.id).appendTo(contentDiv);
        //             }
        //
        //         });
        //
        //         var statsInfo = '<span class="node-diff-count">'+object.tab.nodes.length+" nodes"+
        //                         (addedCount+deletedCount+changedCount+conflictedCount > 0 ? " : ":"")+
        //                         "</span> "+
        //                         ((addedCount > 0)?'<span class="node-diff-added">'+addedCount+' added</span> ':'')+
        //                         ((deletedCount > 0)?'<span class="node-diff-deleted">'+deletedCount+' deleted</span> ':'')+
        //                         ((changedCount > 0)?'<span class="node-diff-changed">'+changedCount+' changed</span> ':'')+
        //                         ((conflictedCount > 0)?'<span class="node-diff-conflicted">'+conflictedCount+' conflicts</span>':'');
        //         stats.html(statsInfo);
        //
        //
        //
        //         //
        //         //
        //         //
        //         // var node = object.node;
        //         // var realNode = RED.nodes.node(node.id);
        //         // var def = RED.nodes.getType(object.node.type)||{};
        //         // var l = "";
        //         // if (def && def.label && realNode) {
        //         //     l = def.label;
        //         //     try {
        //         //         l = (typeof l === "function" ? l.call(realNode) : l);
        //         //     } catch(err) {
        //         //         console.log("Definition error: "+node.type+".label",err);
        //         //     }
        //         // }
        //         // l = l||node.label||node.name||node.id||"";
        //         // console.log(node);
        //         // var div = $('<div>').appendTo(container);
        //         // div.html(l);
        //     }
        // });
    }

    function formatNodeProperty(prop) {
        var formattedProperty = prop;
        if (formattedProperty === null) {
            formattedProperty = 'null';
        } else if (formattedProperty === undefined) {
            formattedProperty = 'undefined';
        } else if (typeof formattedProperty === 'object') {
            formattedProperty = JSON.stringify(formattedProperty);
        }
        if (/\n/.test(formattedProperty)) {
            formattedProperty = "<pre>"+formattedProperty+"</pre>"
        }
        return formattedProperty;
    }

    function getNodeInfo(node) {
        var tabLabel = "";
        if (node.z) {
            var tab = RED.nodes.workspace(node.z);
            if (!tab) {
                tab = RED.nodes.subflow(node.z);
                tabLabel = tab.name;
            } else {
                tabLabel = tab.label;
            }
        }
        var label = "";
        if (typeof node._def.label == "function") {
            try {
                label = node._def.label.call(node);
            } catch(err) {
                console.log("Definition error: "+node_def.type+".label",err);
                label = node_def.type;
            }
        } else {
            label = node._def.label;
        }
        label = label || node.id;
        return {tab:tabLabel,type:node.type,label:label};
    }
    function sortNodeInfo(A,B) {
        if (A.tab < B.tab) { return -1;}
        if (A.tab > B.tab) { return 1;}
        if (A.type < B.type) { return -1;}
        if (A.type > B.type) { return 1;}
        if (A.name < B.name) { return -1;}
        if (A.name > B.name) { return 1;}
        return 0;
    }

    function resolveConflict(currentNodes) {
        $( "#node-dialog-confirm-deploy-config" ).hide();
        $( "#node-dialog-confirm-deploy-unknown" ).hide();
        $( "#node-dialog-confirm-deploy-unused" ).hide();
        $( "#node-dialog-confirm-deploy-conflict" ).show();
        $( "#node-dialog-confirm-deploy-type" ).val("conflict");
        $( "#node-dialog-confirm-deploy" ).dialog( "open" );

        // $("#node-dialog-confirm-deploy-review").append($('<img src="red/images/spin.svg" style="background: rgba(255,255,255,0.8); margin-top: -16px; margin-left: -8px; height:16px; position: absolute; "/>'));
        // $("#node-dialog-confirm-deploy-review .ui-button-text").css("opacity",0.4);
        // $("#node-dialog-confirm-deploy-review").attr("disabled",true).addClass("disabled");
        // $.ajax({
        //     headers: {
        //         "Accept":"application/json",
        //     },
        //     cache: false,
        //     url: 'flows',
        //     success: function(nodes) {
        //         var newNodes = nodes.flows;
        //         var newRevision = nodes.rev;
        //         generateDiff(currentNodes,newNodes);
        //         $("#node-dialog-confirm-deploy-review").attr("disabled",false).removeClass("disabled");
        //         $("#node-dialog-confirm-deploy-review img").remove();
        //         $("#node-dialog-confirm-deploy-review .ui-button-text").css("opacity",1);
        //     }
        // });
    }

    // function parseNodes(nodeList) {
    //     var tabOrder = [];
    //     var tabs = {};
    //     var subflows = {};
    //     var globals = [];
    //     var all = {};
    //
    //     nodeList.forEach(function(node) {
    //         all[node.id] = node;
    //         if (node.type === 'tab') {
    //             tabOrder.push(node.id);
    //             tabs[node.id] = {n:node,nodes:[]};
    //         } else if (node.type === 'subflow') {
    //             subflows[node.id] = {n:node,nodes:[]};
    //         }
    //     });
    //
    //     nodeList.forEach(function(node) {
    //         if (node.type !== 'tab' && node.type !== 'subflow') {
    //             if (tabs[node.z]) {
    //                 tabs[node.z].nodes.push(node);
    //             } else if (subflows[node.z]) {
    //                 subflows[node.z].nodes.push(node);
    //             } else {
    //                 globals.push(node);
    //             }
    //         }
    //     });
    //
    //     return {
    //         all: all,
    //         tabOrder: tabOrder,
    //         tabs: tabs,
    //         subflows: subflows,
    //         globals: globals
    //     }
    // }

    // function generateDiff(currentNodes,newNodes) {
    //     var currentConfig = parseNodes(currentNodes);
    //     var newConfig = parseNodes(newNodes);
    //     var pending = RED.nodes.pending();
    //     var added = {};
    //     var deleted = {};
    //     var changed = {};
    //     var conflicted = {};
    //
    //
    //     Object.keys(currentConfig.all).forEach(function(id) {
    //         var node = RED.nodes.workspace(id)||RED.nodes.subflow(id)||RED.nodes.node(id);
    //         if (!newConfig.all.hasOwnProperty(id)) {
    //             if (!pending.added.hasOwnProperty(id)) {
    //                 deleted[id] = true;
    //                 conflicted[id] = node.changed;
    //             }
    //         } else if (JSON.stringify(currentConfig.all[id]) !== JSON.stringify(newConfig.all[id])) {
    //             changed[id] = true;
    //             conflicted[id] = node.changed;
    //         }
    //     });
    //     Object.keys(newConfig.all).forEach(function(id) {
    //         if (!currentConfig.all.hasOwnProperty(id) && !pending.deleted.hasOwnProperty(id)) {
    //             added[id] = true;
    //         }
    //     });
    //
    //     // console.log("Added",added);
    //     // console.log("Deleted",deleted);
    //     // console.log("Changed",changed);
    //     // console.log("Conflicted",conflicted);
    //
    //     var formatString = function(id) {
    //         return conflicted[id]?"!":(added[id]?"+":(deleted[id]?"-":(changed[id]?"~":" ")));
    //     }
    //     newConfig.tabOrder.forEach(function(tabId) {
    //         var tab = newConfig.tabs[tabId];
    //         console.log(formatString(tabId),"Flow:",tab.n.label, "("+tab.n.id+")");
    //         tab.nodes.forEach(function(node) {
    //             console.log(" ",formatString(node.id),node.type,node.name || node.id);
    //         })
    //         if (currentConfig.tabs[tabId]) {
    //             currentConfig.tabs[tabId].nodes.forEach(function(node) {
    //                 if (deleted[node.id]) {
    //                     console.log(" ",formatString(node.id),node.type,node.name || node.id);
    //                 }
    //             })
    //         }
    //     });
    //     currentConfig.tabOrder.forEach(function(tabId) {
    //         if (deleted[tabId]) {
    //             console.log(formatString(tabId),"Flow:",tab.n.label, "("+tab.n.id+")");
    //         }
    //     });
    //
    //     currentDiff = {
    //         currentConfig: currentConfig,
    //         newConfig: newConfig,
    //         added: added,
    //         deleted: deleted,
    //         changed: changed,
    //         conflicted: conflicted
    //     }
    // }

    // function showDiff() {
    //     if (currentDiff) {
    //         var list = $("#node-dialog-view-diff-diff");
    //         list.editableList('empty');
    //         var currentConfig = currentDiff.currentConfig;
    //         currentConfig.tabOrder.forEach(function(tabId) {
    //             var tab = currentConfig.tabs[tabId];
    //             list.editableList('addItem',{tab:tab})
    //         });
    //     }
    //     $("#node-dialog-view-diff").dialog("open");
    // }


    function save(skipValidation,force) {
        if (RED.nodes.dirty()) {
            //$("#debug-tab-clear").click();  // uncomment this to auto clear debug on deploy

            if (!skipValidation) {
                var hasUnknown = false;
                var hasInvalid = false;
                var hasUnusedConfig = false;

                var unknownNodes = [];
                var invalidNodes = [];

                RED.nodes.eachNode(function(node) {
                    hasInvalid = hasInvalid || !node.valid;
                    if (!node.valid) {
                        invalidNodes.push(getNodeInfo(node));
                    }
                    if (node.type === "unknown") {
                        if (unknownNodes.indexOf(node.name) == -1) {
                            unknownNodes.push(node.name);
                        }
                    }
                });
                hasUnknown = unknownNodes.length > 0;

                var unusedConfigNodes = [];
                RED.nodes.eachConfig(function(node) {
                    if (node.users.length === 0 && (node._def.hasUsers !== false)) {
                        unusedConfigNodes.push(getNodeInfo(node));
                        hasUnusedConfig = true;
                    }
                });

                $( "#node-dialog-confirm-deploy-config" ).hide();
                $( "#node-dialog-confirm-deploy-unknown" ).hide();
                $( "#node-dialog-confirm-deploy-unused" ).hide();
                $( "#node-dialog-confirm-deploy-conflict" ).hide();

                var showWarning = false;

                if (hasUnknown && !ignoreDeployWarnings.unknown) {
                    showWarning = true;
                    $( "#node-dialog-confirm-deploy-type" ).val("unknown");
                    $( "#node-dialog-confirm-deploy-unknown" ).show();
                    $( "#node-dialog-confirm-deploy-unknown-list" )
                        .html("<li>"+unknownNodes.join("</li><li>")+"</li>");
                } else if (hasInvalid && !ignoreDeployWarnings.invalid) {
                    showWarning = true;
                    $( "#node-dialog-confirm-deploy-type" ).val("invalid");
                    $( "#node-dialog-confirm-deploy-config" ).show();
                    invalidNodes.sort(sortNodeInfo);
                    $( "#node-dialog-confirm-deploy-invalid-list" )
                        .html("<li>"+invalidNodes.map(function(A) { return (A.tab?"["+A.tab+"] ":"")+A.label+" ("+A.type+")"}).join("</li><li>")+"</li>");

                } else if (hasUnusedConfig && !ignoreDeployWarnings.unusedConfig) {
                    // showWarning = true;
                    // $( "#node-dialog-confirm-deploy-type" ).val("unusedConfig");
                    // $( "#node-dialog-confirm-deploy-unused" ).show();
                    //
                    // unusedConfigNodes.sort(sortNodeInfo);
                    // $( "#node-dialog-confirm-deploy-unused-list" )
                    //     .html("<li>"+unusedConfigNodes.map(function(A) { return (A.tab?"["+A.tab+"] ":"")+A.label+" ("+A.type+")"}).join("</li><li>")+"</li>");
                }
                if (showWarning) {
                    $( "#node-dialog-confirm-deploy-hide" ).prop("checked",false);
                    $( "#node-dialog-confirm-deploy" ).dialog( "open" );
                    return;
                }
            }

            var nns = RED.nodes.createCompleteNodeSet();

            $("#btn-deploy-icon").removeClass('fa-download');
            $("#btn-deploy-icon").addClass('spinner');

            var data = {flows:nns};

            if (!force) {
                data.rev = RED.nodes.version();
            }

            $.ajax({
                url:"flows",
                type: "POST",
                data: JSON.stringify(data),
                contentType: "application/json; charset=utf-8",
                headers: {
                    "Node-RED-Deployment-Type":deploymentType
                }
            }).done(function(data,textStatus,xhr) {
                RED.nodes.dirty(false);
                RED.nodes.version(data.rev);
                if (hasUnusedConfig) {
                    RED.notify(
                    '<p>'+RED._("deploy.successfulDeploy")+'</p>'+
                    '<p>'+RED._("deploy.unusedConfigNodes")+' <a href="#" onclick="RED.sidebar.config.show(true); return false;">'+RED._("deploy.unusedConfigNodesLink")+'</a></p>',"success",false,6000);
                } else {
                    RED.notify(RED._("deploy.successfulDeploy"),"success");
                }
                RED.nodes.eachNode(function(node) {
                    if (node.changed) {
                        node.dirty = true;
                        node.changed = false;
                    }
                    if(node.credentials) {
                        delete node.credentials;
                    }
                });
                RED.nodes.eachConfig(function (confNode) {
                    confNode.changed = false;
                    if (confNode.credentials) {
                        delete confNode.credentials;
                    }
                });
                RED.nodes.eachWorkspace(function(ws) {
                    ws.changed = false;
                })
                // Once deployed, cannot undo back to a clean state
                RED.history.markAllDirty();
                RED.view.redraw();
                RED.events.emit("deploy");
            }).fail(function(xhr,textStatus,err) {
                RED.nodes.dirty(true);
                if (xhr.status === 401) {
                    RED.notify(RED._("deploy.deployFailed",{message:RED._("user.notAuthorized")}),"error");
                } else if (xhr.status === 409) {
                    resolveConflict(nns);
                } else if (xhr.responseText) {
                    RED.notify(RED._("deploy.deployFailed",{message:xhr.responseText}),"error");
                } else {
                    RED.notify(RED._("deploy.deployFailed",{message:RED._("deploy.errors.noResponse")}),"error");
                }
            }).always(function() {
                $("#btn-deploy-icon").removeClass('spinner');
                $("#btn-deploy-icon").addClass('fa-download');
            });
        }
    }
    return {
        init: init
    }
})();
