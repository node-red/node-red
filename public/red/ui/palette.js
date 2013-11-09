/**
 * Copyright 2013 IBM Corp.
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
RED.palette = function() {
    
    function addNodeType(nt,def) {
        
        if (def.category != 'config') {
            var d = document.createElement("div");
            d.id = "pn_"+nt;
            d.type = nt;
            
            var label = /^(.*?)( in| out)?$/.exec(nt)[1];
            d.innerHTML = '<div class="palette_label">'+label+"</div>";
            d.className="palette_node";
            if (def.icon) {
                d.style.backgroundImage = "url(icons/"+def.icon+")";
                if (def.align == "right") {
                    d.style.backgroundPosition = "95% 50%";
                } else if (def.inputs > 0) {
                    d.style.backgroundPosition = "10% 50%";
                }
            }
            
            d.style.backgroundColor = def.color;
            
            if (def.outputs > 0) {
                var port = document.createElement("div");
                port.className = "palette_port palette_port_output";
                d.appendChild(port);
            }
            
            if (def.inputs > 0) {
                var port = document.createElement("div");
                port.className = "palette_port";
                d.appendChild(port);
            }
            
            // TODO: add categories dynamically?
            $("#palette-"+def.category).append(d);
            
            d.onmousedown = function(e) { e.preventDefault(); }
            
            $(d).popover({
                    title:d.type,
                    placement:"right",
                    trigger: "hover",
                    delay: { show: 750, hide: 50 },
                    html: true,
                    container:'body',
                    content: $(($("script[data-help-name|='"+nt+"']").html()||"<p>no information available</p>").trim())[0] 
            });
            $(d).click(function() {
                    var help = '<div class="node-help">'+($("script[data-help-name|='"+d.type+"']").html()||"")+"</div>";
                    $("#tab-info").html(help);
            });
            $(d).draggable({
                helper: 'clone',
                appendTo: 'body',
                revert: true,
                revertDuration: 50
            });
        }
    }
    
    $(".palette-header").click(
        function(e) {
            $(this).next().slideToggle();
            $(this).children("i").toggleClass("expanded");
        });

    
    return {
        add:addNodeType
    };
}();
