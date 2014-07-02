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

    var exclusion = ['config','unknown','deprecated'];
    var core = ['input', 'output', 'function', 'social', 'storage', 'analysis', 'advanced'];
    
    function createCategoryContainer(category){

        $("#palette-container").append('\
            <div class="palette-category">\
            <div id="header-'+category+'" class="palette-header"><i class="expanded icon-chevron-down"></i><span>'+category+'</span></div>\
            <div class="palette-content" id="palette-base-category-'+category+'">\
              <div id="palette-'+category+'-input"></div>\
              <div id="palette-'+category+'-output"></div>\
              <div id="palette-'+category+'-function"></div>\
            </div>\
            </div>');
          
    }
    
    core.forEach(createCategoryContainer);
    
    function addNodeType(nt,def) {
        if (exclusion.indexOf(def.category)===-1) {
          
          var category = def.category.split("-");
          
          var d = document.createElement("div");
          d.id = "pn_"+nt;
          d.type = nt;
          
          var label = /^(.*?)([ -]in|[ -]out)?$/.exec(nt)[1];
          
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
          
          if($("#palette-base-category-"+category[0]).length == 0){
            createCategoryContainer(category[0]);
          }
          
          if($("#palette-"+def.category).length == 0){          
            $("#palette-base-category-"+category[0]).append('\
            <div id="palette-'+def.category+'"></div>');            
          }

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
         
          $("#header-"+category[0]).off('click').on('click', function(e) {
              $(this).next().slideToggle();
              $(this).children("i").toggleClass("expanded");
          });

        }
    }
    
    function filterChange() {
        var val = $("#palette-search-input").val();
        if (val == "") {
            $("#palette-search-clear").hide();
        } else {
            $("#palette-search-clear").show();
        }
        
        var re = new RegExp(val);
        $(".palette_node").each(function(i,el) {
            if (val == "" || re.test(el.id)) {
                $(this).show();
            } else {
                $(this).hide();
            }
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
    
    return {
        add:addNodeType
    };
}();
