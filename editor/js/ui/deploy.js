/**
 * Copyright 2015 IBM Corp.
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
    
    var deploymentType = "full";
    
    function changeDeploymentType(type) {
        deploymentType = type;
        $("#btn-deploy img").attr("src",deploymentTypes[type].img);
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
              '<a id="btn-deploy" class="deploy-button disabled" href="#"><img id="btn-deploy-icon" src="red/images/deploy-full-o.png"> <span>Deploy</span></a>'+
              '<a id="btn-deploy-options" data-toggle="dropdown" class="deploy-button" href="#"><i class="fa fa-caret-down"></i></a>'+
              '</span></li>').prependTo(".header-toolbar");
              RED.menu.init({id:"btn-deploy-options",
                  options: [
                      {id:"deploymenu-item-full",toggle:"deploy-type",icon:"red/images/deploy-full.png",label:"Full",sublabel:"Deploys everything in the workspace",selected: true, onselect:function(s) { if(s){changeDeploymentType("full")}}},
                      {id:"deploymenu-item-flow",toggle:"deploy-type",icon:"red/images/deploy-flows.png",label:"Modified Flows",sublabel:"Only deploys flows that contain changed nodes", onselect:function(s) {if(s){changeDeploymentType("flows")}}},
                      {id:"deploymenu-item-node",toggle:"deploy-type",icon:"red/images/deploy-nodes.png",label:"Modified Nodes",sublabel:"Only deploys nodes that have changed",onselect:function(s) { if(s){changeDeploymentType("nodes")}}}
                  ]
              });
        } else if (type == "simple") {
            var label = options.label || "Deploy";
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
                title: "Confirm deploy",
                modal: true,
                autoOpen: false,
                width: 530,
                height: 230,
                buttons: [
                    {
                        text: "Confirm deploy",
                        click: function() {
                            save(true);
                            $( this ).dialog( "close" );
                        }
                    },
                    {
                        text: "Cancel",
                        click: function() {
                            $( this ).dialog( "close" );
                        }
                    }
                ]
        });

        RED.nodes.on('change',function(state) {
            if (state.dirty) {
                window.onbeforeunload = function() {
                    return "You have undeployed changes.\n\nLeaving this page will lose these changes.";
                }
                $("#btn-deploy").removeClass("disabled");
            } else {
                window.onbeforeunload = null;
                $("#btn-deploy").addClass("disabled");
            }
        });
    }

    function save(force) {
        if (RED.nodes.dirty()) {
            //$("#debug-tab-clear").click();  // uncomment this to auto clear debug on deploy

            if (!force) {
                var invalid = false;
                var unknownNodes = [];
                RED.nodes.eachNode(function(node) {
                    invalid = invalid || !node.valid;
                    if (node.type === "unknown") {
                        if (unknownNodes.indexOf(node.name) == -1) {
                            unknownNodes.push(node.name);
                        }
                        invalid = true;
                    }
                });
                if (invalid) {
                    if (unknownNodes.length > 0) {
                        $( "#node-dialog-confirm-deploy-config" ).hide();
                        $( "#node-dialog-confirm-deploy-unknown" ).show();
                        var list = "<li>"+unknownNodes.join("</li><li>")+"</li>";
                        $( "#node-dialog-confirm-deploy-unknown-list" ).html(list);
                    } else {
                        $( "#node-dialog-confirm-deploy-config" ).show();
                        $( "#node-dialog-confirm-deploy-unknown" ).hide();
                    }
                    $( "#node-dialog-confirm-deploy" ).dialog( "open" );
                    return;
                }
            }
            var nns = RED.nodes.createCompleteNodeSet();

            $("#btn-deploy-icon").removeClass('fa-download');
            $("#btn-deploy-icon").addClass('spinner');
            RED.nodes.dirty(false);

            $.ajax({
                url:"flows",
                type: "POST",
                data: JSON.stringify(nns),
                contentType: "application/json; charset=utf-8",
                headers: {
                    "Node-RED-Deployment-Type":deploymentType
                }
            }).done(function(data,textStatus,xhr) {
                RED.notify("Successfully deployed","success");
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
                    if (confNode.credentials) {
                        delete confNode.credentials;
                    }
                });
                // Once deployed, cannot undo back to a clean state
                RED.history.markAllDirty();
                RED.view.redraw();
            }).fail(function(xhr,textStatus,err) {
                RED.nodes.dirty(true);
                if (xhr.responseText) {
                    RED.notify("<strong>Error</strong>: "+xhr.responseJSON.message,"error");
                } else {
                    RED.notify("<strong>Error</strong>: no response from server","error");
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
