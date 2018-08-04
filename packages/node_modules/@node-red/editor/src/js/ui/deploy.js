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

    var deployInflight = false;

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

        $('#btn-deploy').click(function(event) {
            event.preventDefault();
            save();
        });

        RED.actions.add("core:deploy-flows",save);


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

        var activeNotifyMessage;
        RED.comms.subscribe("notification/runtime-deploy",function(topic,msg) {
            if (!activeNotifyMessage) {
                var currentRev = RED.nodes.version();
                if (currentRev === null || deployInflight || currentRev === msg.revision) {
                    return;
                }
                var message = $('<p>').text(RED._('deploy.confirm.backgroundUpdate'));
                activeNotifyMessage = RED.notify(message,{
                    modal: true,
                    fixed: true,
                    buttons: [
                        {
                            text: RED._('deploy.confirm.button.ignore'),
                            click: function() {
                                activeNotifyMessage.close();
                                activeNotifyMessage = null;
                            }
                        },
                        {
                            text: RED._('deploy.confirm.button.review'),
                            class: "primary",
                            click: function() {
                                activeNotifyMessage.close();
                                var nns = RED.nodes.createCompleteNodeSet();
                                resolveConflict(nns,false);
                                activeNotifyMessage = null;
                            }
                        }
                    ]
                });
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
        var label = RED.utils.getNodeLabel(node,node.id);
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

    function resolveConflict(currentNodes, activeDeploy) {
        var message = $('<div>');
        $('<p data-i18n="deploy.confirm.conflict"></p>').appendTo(message);
        var conflictCheck = $('<div id="node-dialog-confirm-deploy-conflict-checking" class="node-dialog-confirm-conflict-row">'+
            '<img src="red/images/spin.svg"/><div data-i18n="deploy.confirm.conflictChecking"></div>'+
        '</div>').appendTo(message);
        var conflictAutoMerge = $('<div class="node-dialog-confirm-conflict-row">'+
            '<i style="color: #3a3;" class="fa fa-check"></i><div data-i18n="deploy.confirm.conflictAutoMerge"></div>'+
            '</div>').hide().appendTo(message);
        var conflictManualMerge = $('<div id="node-dialog-confirm-deploy-conflict-manual-merge" class="node-dialog-confirm-conflict-row">'+
            '<i style="color: #999;" class="fa fa-exclamation"></i><div data-i18n="deploy.confirm.conflictManualMerge"></div>'+
            '</div>').hide().appendTo(message);

        message.i18n();
        currentDiff = null;
        var buttons = [
            {
                text: RED._("common.label.cancel"),
                click: function() {
                    conflictNotification.close();
                }
            },
            {
                id: "node-dialog-confirm-deploy-review",
                text: RED._("deploy.confirm.button.review"),
                class: "primary disabled",
                click: function() {
                    if (!$("#node-dialog-confirm-deploy-review").hasClass('disabled')) {
                        RED.diff.showRemoteDiff();
                        conflictNotification.close();
                    }
                }
            },
            {
                id: "node-dialog-confirm-deploy-merge",
                text: RED._("deploy.confirm.button.merge"),
                class: "primary disabled",
                click: function() {
                    if (!$("#node-dialog-confirm-deploy-merge").hasClass('disabled')) {
                        RED.diff.mergeDiff(currentDiff);
                        conflictNotification.close();
                    }
                }
            }
        ];
        if (activeDeploy) {
            buttons.push({
                id: "node-dialog-confirm-deploy-overwrite",
                text: RED._("deploy.confirm.button.overwrite"),
                class: "primary",
                click: function() {
                    save(true,activeDeploy);
                    conflictNotification.close();
                }
            })
        }
        var conflictNotification = RED.notify(message,{
            modal: true,
            fixed: true,
            width: 600,
            buttons: buttons
        });

        var now = Date.now();
        RED.diff.getRemoteDiff(function(diff) {
            var ellapsed = Math.max(1000 - (Date.now()-now), 0);
            currentDiff = diff;
            setTimeout(function() {
                conflictCheck.hide();
                var d = Object.keys(diff.conflicts);
                if (d.length === 0) {
                    conflictAutoMerge.show();
                    $("#node-dialog-confirm-deploy-merge").removeClass('disabled')
                } else {
                    conflictManualMerge.show();
                }
                $("#node-dialog-confirm-deploy-review").removeClass('disabled')
            },ellapsed);
        })
    }
    function cropList(list) {
        if (list.length > 5) {
            var remainder = list.length - 5;
            list = list.slice(0,5);
            list.push(RED._("deploy.confirm.plusNMore",{count:remainder}));
        }
        return list;
    }
    function save(skipValidation,force) {
        if (!$("#btn-deploy").hasClass("disabled")) {
            if (!RED.user.hasPermission("flows.write")) {
                RED.notify(RED._("user.errors.deploy"),"error");
                return;
            }
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

                var showWarning = false;
                var notificationMessage;
                var notificationButtons = [];
                var notification;
                if (hasUnknown && !ignoreDeployWarnings.unknown) {
                    showWarning = true;
                    notificationMessage = "<p>"+RED._('deploy.confirm.unknown')+"</p>"+
                        '<ul class="node-dialog-configm-deploy-list"><li>'+cropList(unknownNodes).join("</li><li>")+"</li></ul><p>"+
                        RED._('deploy.confirm.confirm')+
                        "</p>";

                    notificationButtons= [
                        {
                            id: "node-dialog-confirm-deploy-deploy",
                            text: RED._("deploy.confirm.button.confirm"),
                            class: "primary",
                            click: function() {
                                save(true);
                                notification.close();
                            }
                        }
                    ];
                } else if (hasInvalid && !ignoreDeployWarnings.invalid) {
                    showWarning = true;
                    invalidNodes.sort(sortNodeInfo);

                    notificationMessage = "<p>"+RED._('deploy.confirm.improperlyConfigured')+"</p>"+
                        '<ul class="node-dialog-configm-deploy-list"><li>'+cropList(invalidNodes.map(function(A) { return (A.tab?"["+A.tab+"] ":"")+A.label+" ("+A.type+")"})).join("</li><li>")+"</li></ul><p>"+
                        RED._('deploy.confirm.confirm')+
                        "</p>";
                    notificationButtons= [
                        {
                            id: "node-dialog-confirm-deploy-deploy",
                            text: RED._("deploy.confirm.button.confirm"),
                            class: "primary",
                            click: function() {
                                save(true);
                                notification.close();
                            }
                        }
                    ];
                }
                if (showWarning) {
                    notificationButtons.unshift(
                        {
                            text: RED._("common.label.cancel"),
                            click: function() {
                                notification.close();
                            }
                        }
                    );
                    notification = RED.notify(notificationMessage,{
                        modal: true,
                        fixed: true,
                        buttons:notificationButtons
                    });
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

            deployInflight = true;
            $("#header-shade").show();
            $("#editor-shade").show();
            $("#palette-shade").show();
            $("#sidebar-shade").show();
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
                    RED.notify('<p>'+RED._("deploy.successfulDeploy")+'</p>',"success");
                }
                RED.nodes.eachNode(function(node) {
                    if (node.changed) {
                        node.dirty = true;
                        node.changed = false;
                    }
                    if (node.moved) {
                        node.dirty = true;
                        node.moved = false;
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
                RED.nodes.eachSubflow(function(subflow) {
                    subflow.changed = false;
                });
                RED.nodes.eachWorkspace(function(ws) {
                    ws.changed = false;
                });
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
                    resolveConflict(nns, true);
                } else if (xhr.responseText) {
                    RED.notify(RED._("deploy.deployFailed",{message:xhr.responseText}),"error");
                } else {
                    RED.notify(RED._("deploy.deployFailed",{message:RED._("deploy.errors.noResponse")}),"error");
                }
            }).always(function() {
                deployInflight = false;
                var delta = Math.max(0,300-(Date.now()-startTime));
                setTimeout(function() {
                    $(".deploy-button-content").css('opacity',1);
                    $(".deploy-button-spinner").hide();
                    $("#header-shade").hide();
                    $("#editor-shade").hide();
                    $("#palette-shade").hide();
                    $("#sidebar-shade").hide();
                },delta);
            });
        }
    }
    return {
        init: init,
        setDeployInflight: function(state) {
            deployInflight = state;
        }

    }
})();
