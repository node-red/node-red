/**
 * Copyright 2014 IBM Corp.
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

RED.touch = RED.touch||{};
RED.touch.radialMenu = (function() {
    
    
    var touchMenu = null;
    var isActive = false;
    var isOutside = false;
    var activeOption = null;

    
    function createRadial(obj,pos,options) {
        isActive = true;
        try {
            var w = $("body").width();
            var h = $("body").height();
            
            touchMenu = d3.select("body").append("div")
                .style({
                        position:"absolute",
                        top: 0,
                        left:0,
                        bottom:0,
                        right:0,
                        "z-index": 1000
                })
                .on('touchstart',function() {
                    hide();
                    d3.event.preventDefault();
                });
                    
            

    
            var menu = touchMenu.append("div")
                .style({
                        position: "absolute",
                        top: (pos[1]-80)+"px",
                        left:(pos[0]-80)+"px",
                        "border-radius": "80px",
                        width: "160px",
                        height: "160px",
                        background: "rgba(255,255,255,0.6)",
                        border: "1px solid #666"
                });
                
            var menuOpts = [];
            var createMenuOpt = function(x,y,opt) {
                opt.el = menu.append("div")
                    .style({
                        position: "absolute",
                        top: (y+80-25)+"px",
                        left:(x+80-25)+"px",
                        "border-radius": "20px",
                        width: "50px",
                        height: "50px",
                        background: "#fff",
                        border: "2px solid #666",
                        "text-align": "center",
                        "line-height":"50px"
                    });
                    
                opt.el.html(opt.name);
                
                if (opt.disabled) {
                    opt.el.style({"border-color":"#ccc",color:"#ccc"});
                }
                opt.x = x;
                opt.y = y;
                menuOpts.push(opt);
                
                opt.el.on('touchstart',function() {
                    opt.el.style("background","#999");
                    d3.event.preventDefault();
                    d3.event.stopPropagation();
                });
                opt.el.on('touchend',function() {
                    hide();
                    opt.onselect();
                    d3.event.preventDefault();
                    d3.event.stopPropagation();
                });
            }
            
            var n = options.length;
            var dang = Math.max(Math.PI/(n-1),Math.PI/4);
            var ang = Math.PI;
            for (var i=0;i<n;i++) {
                var x = Math.floor(Math.cos(ang)*80);
                var y = Math.floor(Math.sin(ang)*80);
                if (options[i].name) {
                    createMenuOpt(x,y,options[i]);
                }
                ang += dang;
            }
            

            var hide = function() {
                isActive = false;
                activeOption = null;
                touchMenu.remove();
                touchMenu = null;
            }
                    
            obj.on('touchend.radial',function() {
                    obj.on('touchend.radial',null);
                    obj.on('touchmenu.radial',null);
                    
                    if (activeOption) {
                        try {
                            activeOption.onselect();
                        } catch(err) {
                            RED._debug(err);
                        }
                        hide();
                    } else if (isOutside) {
                        hide();
                    }
            });


            
            obj.on('touchmove.radial',function() {
            try {
                var touch0 = d3.event.touches.item(0);
                var p = [touch0.pageX - pos[0],touch0.pageY-pos[1]];
                for (var i=0;i<menuOpts.length;i++) {
                    var opt = menuOpts[i];
                    if (!opt.disabled) {
                        if (p[0]>opt.x-30 && p[0]<opt.x+30 && p[1]>opt.y-30 && p[1]<opt.y+30) {
                            if (opt !== activeOption) {
                                opt.el.style("background","#999");
                                activeOption = opt;
                            }
                        } else if (opt === activeOption) {
                            opt.el.style("background","#fff");
                            activeOption = null;
                        } else {
                            opt.el.style("background","#fff");
                        }
                    }
                }
                if (!activeOption) {
                    var d = Math.abs((p[0]*p[0])+(p[1]*p[1]));
                    isOutside = (d > 80*80);
                }
                
            } catch(err) {
                RED._debug(err);
            }

                
            });
            
        } catch(err) {
            RED._debug(err);
        }
    }    

    
    return {
        show: createRadial,
        active: function() {
            return isActive;
        }
    }

})();

