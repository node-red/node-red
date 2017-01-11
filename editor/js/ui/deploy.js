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

    var currentDiff = null;

    function changeDeploymentType(type) {
        deploymentType = type;
        $("#btn-deploy-icon").attr("src",deploymentTypes[type].img);
    }

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
              '<a id="btn-deploy" class="deploy-button disabled" href="#">'+
                '<span class="deploy-button-content">'+
                 '<img id="btn-deploy-icon" src="red/images/deploy-full-o.png"> '+
                 '<span>'+RED._("deploy.deploy")+'</span>'+
                '</span>'+
                '<span class="deploy-button-spinner hide">'+
                 '<img src="red/images/spin.svg"/>'+
                '</span>'+
              '</a>'+
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
                '<span class="deploy-button-content">'+
                  (icon?'<img id="btn-deploy-icon" src="'+icon+'"> ':'')+
                  '<span>'+label+'</span>'+
                '</span>'+
                '<span class="deploy-button-spinner hide">'+
                 '<img src="red/images/spin.svg"/>'+
                '</span>'+
              '</a>'+
              '</span></li>').prependTo(".header-toolbar");
        }

        $('#btn-deploy').click(function() { save(); });

        RED.actions.add("core:deploy-flows",save);

        $( "#node-dialog-confirm-deploy" ).dialog({
                title: RED._('deploy.confirm.button.confirm'),
                modal: true,
                autoOpen: false,
                width: 550,
                height: "auto",
                buttons: [
                    {
                        text: RED._("common.label.cancel"),
                        click: function() {
                            $( this ).dialog( "close" );
                        }
                    },
                    {
                        id: "node-dialog-confirm-deploy-review",
                        text: RED._("deploy.confirm.button.review"),
                        class: "primary disabled",
                        click: function() {
                            if (!$("#node-dialog-confirm-deploy-review").hasClass('disabled')) {
                                RED.diff.showRemoteDiff();
                                $( this ).dialog( "close" );
                            }
                        }
                    },
                    {
                        id: "node-dialog-confirm-deploy-merge",
                        text: RED._("deploy.confirm.button.merge"),
                        class: "primary disabled",
                        click: function() {
                            RED.diff.mergeDiff(currentDiff);
                            $( this ).dialog( "close" );
                        }
                    },
                    {
                        id: "node-dialog-confirm-deploy-deploy",
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
                        $("#node-dialog-confirm-deploy-deploy").hide();
                        $("#node-dialog-confirm-deploy-review").addClass('disabled').show();
                        $("#node-dialog-confirm-deploy-merge").addClass('disabled').show();
                        currentDiff = null;
                        $("#node-dialog-confirm-deploy-conflict-checking").show();
                        $("#node-dialog-confirm-deploy-conflict-auto-merge").hide();
                        $("#node-dialog-confirm-deploy-conflict-manual-merge").hide();

                        var now = Date.now();
                        RED.diff.getRemoteDiff(function(diff) {
                            var ellapsed = Math.max(1000 - (Date.now()-now), 0);
                            currentDiff = diff;
                            setTimeout(function() {
                                $("#node-dialog-confirm-deploy-conflict-checking").hide();
                                var d = Object.keys(diff.conflicts);
                                if (d.length === 0) {
                                    $("#node-dialog-confirm-deploy-conflict-auto-merge").show();
                                    $("#node-dialog-confirm-deploy-merge").removeClass('disabled')
                                } else {
                                    $("#node-dialog-confirm-deploy-conflict-manual-merge").show();
                                }
                                $("#node-dialog-confirm-deploy-review").removeClass('disabled')
                            },ellapsed);
                        })


                        $("#node-dialog-confirm-deploy-hide").parent().hide();
                    } else {
                        $("#node-dialog-confirm-deploy-deploy").show();
                        $("#node-dialog-confirm-deploy-review").hide();
                        $("#node-dialog-confirm-deploy-merge").hide();
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
    }

    function save(skipValidation,force) {
        if (!$("#btn-deploy").hasClass("disabled")) {
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

            var startTime = Date.now();
            $(".deploy-button-content").css('opacity',0);
            $(".deploy-button-spinner").show();
            $("#btn-deploy").addClass("disabled");

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
                RED.nodes.originalFlow(nns);
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
                $("#btn-deploy").removeClass("disabled");
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
                var delta = Math.max(0,300-(Date.now()-startTime));
                setTimeout(function() {
                    $(".deploy-button-content").css('opacity',1);
                    $(".deploy-button-spinner").hide();
                },delta);
            });
        }
    }
    return {
        init: init
    }
})();
