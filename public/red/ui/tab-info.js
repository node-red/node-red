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
RED.sidebar.info = function() {
    
    var content = document.createElement("div");
    content.id = "tab-info";
    content.style.paddingTop = "4px";
    content.style.paddingLeft = "4px";
    content.style.paddingRight = "4px";

    RED.sidebar.addTab("info",content);
    
    function jsonFilter(key,value) {
        if (key == "") {
            return value;
        }
        var t = typeof value;
        if ($.isArray(value)) {
            return "[array:"+value.length+"]";
        } else if (t === "object") {
            return "[object]"
        } else if (t === "string") {
            if (value.length > 30) {
                return value.substring(0,30)+" ...";
            }
        }
        return value;
    }
    
    function refresh(node) {
        var table = '<table class="node-info"><tbody>';

        table += "<tr><td>Type</td><td>&nbsp;"+node.type+"</td></tr>";
        table += "<tr><td>ID</td><td>&nbsp;"+node.id+"</td></tr>";
        table += '<tr class="blank"><td colspan="2">&nbsp;Properties</td></tr>';
        for (var n in node._def.defaults) {
            var val = node[n]||"";
            var type = typeof val;
            if (type === "string") {
                if (val.length > 30) { 
                    val = val.substring(0,30)+" ...";
                }
                val = val.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
            } else if (type === "number") {
                val = val.toString();
            } else if ($.isArray(val)) {
                val = "[<br/>";
                for (var i=0;i<Math.min(node[n].length,10);i++) {
                    var vv = JSON.stringify(node[n][i],jsonFilter," ").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
                    val += "&nbsp;"+i+": "+vv+"<br/>";
                }
                if (node[n].length > 10) {
                    val += "&nbsp;... "+node[n].length+" items<br/>";
                }
                val += "]";
            } else {
                val = JSON.stringify(val,jsonFilter," ");
                val = val.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
            }
            
            table += "<tr><td>&nbsp;"+n+"</td><td>"+val+"</td></tr>";
        }
        table += "</tbody></table><br/>";
        table  += '<div class="node-help">'+($("script[data-help-name|='"+node.type+"']").html()||"")+"</div>";
        $("#tab-info").html(table);
    }
    
    return {
        refresh:refresh,
        clear: function() {
            $("#tab-info").html("");
        }
    }
}();
