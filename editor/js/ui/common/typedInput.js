/**
 * Copyright 2015, 2016 IBM Corp.
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
(function($) {
    function validateExpression(str) {
        var length = str.length;
        var start = 0;
        var inString = false;
        var inBox = false;
        var quoteChar;
        var v;
        for (var i=0;i<length;i++) {
            var c = str[i];
            if (!inString) {
                if (c === "'" || c === '"') {
                    if (!inBox) {
                        return false;
                    }
                    inString = true;
                    quoteChar = c;
                    start = i+1;
                } else if (c === '.') {
                    if (i===0 || i===length-1) {
                        return false;
                    }
                    // Next char is a-z
                    if (!/[a-z0-9\$\_]/i.test(str[i+1])) {
                        return false;
                    }
                    start = i+1;
                } else if (c === '[') {
                    if (i === 0) {
                        return false;
                    }
                    if (i===length-1) {
                        return false;
                    }
                    // Next char is either a quote or a number
                    if (!/["'\d]/.test(str[i+1])) {
                        return false;
                    }
                    start = i+1;
                    inBox = true;
                } else if (c === ']') {
                    if (!inBox) {
                        return false;
                    }
                    if (start != i) {
                        v = str.substring(start,i);
                        if (!/^\d+$/.test(v)) {
                            return false;
                        }
                    }
                    start = i+1;
                    inBox = false;
                } else if (c === ' ') {
                    return false;
                }
            } else {
                if (c === quoteChar) {
                    // Next char must be a ]
                    if (!/\]/.test(str[i+1])) {
                        return false;
                    }
                    start = i+1;
                    inString = false;
                }
            }

        }
        if (inBox || inString) {
            return false;
        }
        return true;
    }
    var allOptions = {
        msg: {value:"msg",label:"msg.",validate:validateExpression},
        flow: {value:"flow",label:"flow.",validate:validateExpression},
        global: {value:"global",label:"global.",validate:validateExpression},
        str: {value:"str",label:"string",icon:"red/images/typedInput/az.png"},
        num: {value:"num",label:"number",icon:"red/images/typedInput/09.png",validate:/^[+-]?[0-9]*\.?[0-9]*([eE][-+]?[0-9]+)?$/},
        bool: {value:"bool",label:"boolean",icon:"red/images/typedInput/bool.png",options:["true","false"]},
        json: {value:"json",label:"JSON",icon:"red/images/typedInput/json.png", validate: function(v) { try{JSON.parse(v);return true;}catch(e){return false;}}},
        re: {value:"re",label:"regular expression",icon:"red/images/typedInput/re.png"},
        date: {value:"date",label:"timestamp",hasValue:false}
    };
    var nlsd = false;

    $.widget( "nodered.typedInput", {
        _create: function() {
            if (!nlsd && RED && RED._) {
                for (var i in allOptions) {
                    if (allOptions.hasOwnProperty(i)) {
                        allOptions[i].label = RED._("typedInput.type."+i,{defaultValue:allOptions[i].label});
                    }
                }
            }
            nlsd = true;
            var that = this;

            this.disarmClick = false;
            this.element.addClass('red-ui-typedInput');
            this.uiWidth = this.element.outerWidth();
            this.elementDiv = this.element.wrap("<div>").parent().addClass('red-ui-typedInput-input');
            this.uiSelect = this.elementDiv.wrap( "<div>" ).parent();
            var attrStyle = this.element.attr('style');
            var m;
            if ((m = /width\s*:\s*(\d+%)/i.exec(attrStyle)) !== null) {
                this.element.css('width','100%');
                this.uiSelect.width(m[1]);
                this.uiWidth = null;
            } else {
                this.uiSelect.width(this.uiWidth);
            }
            ["Right","Left"].forEach(function(d) {
                var m = that.element.css("margin"+d);
                that.uiSelect.css("margin"+d,m);
                that.element.css("margin"+d,0);
            });
            this.uiSelect.addClass("red-ui-typedInput-container");

            this.options.types = this.options.types||Object.keys(allOptions);

            this.selectTrigger = $('<a href="#"></a>').prependTo(this.uiSelect);
            $('<i class="fa fa-sort-desc"></i>').appendTo(this.selectTrigger);
            this.selectLabel = $('<span></span>').appendTo(this.selectTrigger);

            this.types(this.options.types);

            if (this.options.typeField) {
                this.typeField = $(this.options.typeField).hide();
                var t = this.typeField.val();
                if (t && this.typeMap[t]) {
                    this.options.default = t;
                }
            } else {
                this.typeField = $("<input>",{type:'hidden'}).appendTo(this.uiSelect);
            }

            this.element.on('focus', function() {
                that.uiSelect.addClass('red-ui-typedInput-focus');
            });
            this.element.on('blur', function() {
                that.uiSelect.removeClass('red-ui-typedInput-focus');
            });
            this.element.on('change', function() {
                that.validate();
            })
            this.selectTrigger.click(function(event) {
                event.preventDefault();
                if (that.typeList.length > 1) {
                    that._showMenu(that.menu,that.selectTrigger);
                } else {
                    that.element.focus();
                }
            });

            // explicitly set optionSelectTrigger display to inline-block otherwise jQ sets it to 'inline'
            this.optionSelectTrigger = $('<a href="#" class="red-ui-typedInput-option-trigger" style="display:inline-block"><i class="fa fa-sort-desc"></i></a>').appendTo(this.uiSelect);
            this.optionSelectLabel = $('<span></span>').prependTo(this.optionSelectTrigger);
            this.optionSelectTrigger.click(function(event) {
                event.preventDefault();
                if (that.optionMenu) {
                    that.optionMenu.css({
                        minWidth:that.optionSelectLabel.width()
                    });

                    that._showMenu(that.optionMenu,that.optionSelectLabel)
                }
            });
            this.type(this.options.default||this.typeList[0].value);
        },
        _hideMenu: function(menu) {
            $(document).off("mousedown.close-property-select");
            menu.hide();
            this.element.focus();
        },
        _createMenu: function(opts,callback) {
            var that = this;
            var menu = $("<div>").addClass("red-ui-typedInput-options");
            opts.forEach(function(opt) {
                if (typeof opt === 'string') {
                    opt = {value:opt,label:opt};
                }
                var op = $('<a href="#">').attr("value",opt.value).appendTo(menu);
                if (opt.label) {
                    op.text(opt.label);
                }
                if (opt.icon) {
                    $('<img>',{src:opt.icon,style:"margin-right: 4px; height: 18px;"}).prependTo(op);
                } else {
                    op.css({paddingLeft: "18px"});
                }

                op.click(function(event) {
                    event.preventDefault();
                    callback(opt.value);
                    that._hideMenu(menu);
                });
            });
            menu.css({
                display: "none",
            });
            menu.appendTo(document.body);
            return menu;

        },
        _showMenu: function(menu,relativeTo) {
            if (this.disarmClick) {
                this.disarmClick = false;
                return
            }
            var that = this;
            var pos = relativeTo.offset();
            var height = relativeTo.height();
            var menuHeight = menu.height();
            var top = (height+pos.top-3);
            if (top+menuHeight > $(window).height()) {
                top -= (top+menuHeight)-$(window).height()+5;
            }
            menu.css({
                top: top+"px",
                left: (2+pos.left)+"px",
            });
            menu.slideDown(100);
            this._delay(function() {
                that.uiSelect.addClass('red-ui-typedInput-focus');
                $(document).on("mousedown.close-property-select", function(event) {
                    if(!$(event.target).closest(menu).length) {
                        that._hideMenu(menu);
                    }
                    if ($(event.target).closest(relativeTo).length) {
                        that.disarmClick = true;
                        event.preventDefault();
                    }
                })
            });
        },
        _getLabelWidth: function(label) {
            var labelWidth = label.outerWidth();
            if (labelWidth === 0) {
                var container = $('<div class="red-ui-typedInput-container"></div>').css({
                    position:"absolute",
                    top:0,
                    left:-1000
                }).appendTo(document.body);
                var newTrigger = label.clone().appendTo(container);
                labelWidth = newTrigger.outerWidth();
                container.remove();
            }
            return labelWidth;
        },
        _resize: function() {
            if (this.uiWidth !== null) {
                this.uiSelect.width(this.uiWidth);
            }
            if (this.typeMap[this.propertyType] && this.typeMap[this.propertyType].hasValue === false) {
                this.selectTrigger.css('width',"100%");
            } else {
                this.selectTrigger.width('auto');
                var labelWidth = this._getLabelWidth(this.selectTrigger);
                this.elementDiv.css('left',labelWidth+"px");
                if (this.optionSelectTrigger) {
                    this.optionSelectTrigger.css('left',(labelWidth+5)+"px");
                }
            }
        },
        _destroy: function() {
            this.menu.remove();
        },
        types: function(types) {
            var that = this;
            var currentType = this.type();
            this.typeMap = {};
            this.typeList = types.map(function(opt) {
                var result;
                if (typeof opt === 'string') {
                    result = allOptions[opt];
                } else {
                    result = opt;
                }
                that.typeMap[result.value] = result;
                return result;
            });
            this.selectTrigger.toggleClass("disabled", this.typeList.length === 1);
            if (this.menu) {
                this.menu.remove();
            }
            this.menu = this._createMenu(this.typeList, function(v) { that.type(v) });
            if (currentType && !this.typeMap.hasOwnProperty(currentType)) {
                this.type(this.typeList[0].value);
            }
        },
        width: function(desiredWidth) {
            this.uiWidth = desiredWidth;
            this._resize();
        },
        value: function(value) {
            if (!arguments.length) {
                return this.element.val();
            } else {
                if (this.typeMap[this.propertyType].options) {
                    if (this.typeMap[this.propertyType].options.indexOf(value) === -1) {
                        value = "";
                    }
                    this.optionSelectLabel.text(value);
                }
                this.element.val(value);
                this.element.trigger('change',this.type(),value);
            }
        },
        type: function(type) {
            if (!arguments.length) {
                return this.propertyType;
            } else {
                var that = this;
                var opt = this.typeMap[type];
                if (opt && this.propertyType !== type) {
                    this.propertyType = type;
                    this.typeField.val(type);
                    this.selectLabel.empty();
                    var image;
                    if (opt.icon) {
                        image = new Image();
                        image.name = opt.icon;
                        image.src = opt.icon;
                        $('<img>',{src:opt.icon,style:"margin-right: 4px;height: 18px;"}).prependTo(this.selectLabel);
                    } else {
                        this.selectLabel.text(opt.label);
                    }
                    if (opt.options) {
                        if (this.optionSelectTrigger) {
                            this.optionSelectTrigger.show();
                            this.elementDiv.hide();
                            this.optionMenu = this._createMenu(opt.options,function(v){
                                that.optionSelectLabel.text(v);
                                that.value(v);
                            });
                            var currentVal = this.element.val();
                            if (opt.options.indexOf(currentVal) !== -1) {
                                this.optionSelectLabel.text(currentVal);
                            } else {
                                this.value(opt.options[0]);
                            }
                        }
                    } else {
                        if (this.optionMenu) {
                            this.optionMenu.remove();
                            this.optionMenu = null;
                        }
                        if (this.optionSelectTrigger) {
                            this.optionSelectTrigger.hide();
                        }
                        if (opt.hasValue === false) {
                            this.oldValue = this.element.val();
                            this.element.val("");
                            this.elementDiv.hide();
                        } else {
                            if (this.oldValue !== undefined) {
                                this.element.val(this.oldValue);
                                delete this.oldValue;
                            }
                            this.elementDiv.show();
                        }
                        this.element.trigger('change',this.propertyType,this.value());
                    }
                    if (image) {
                        image.onload = function() { that._resize(); }
                        image.onerror = function() { that._resize(); }
                    } else {
                        this._resize();
                    }
                }
            }
        },
        validate: function() {
            var result;
            var value = this.value();
            var type = this.type();
            if (this.typeMap[type] && this.typeMap[type].validate) {
                var val = this.typeMap[type].validate;
                if (typeof val === 'function') {
                    result = val(value);
                } else {
                    result = val.test(value);
                }
            } else {
                result = true;
            }
            if (result) {
                this.uiSelect.removeClass('input-error');
            } else {
                this.uiSelect.addClass('input-error');
            }
            return result;
        },
        show: function() {
            this.uiSelect.show();
            this._resize();
        },
        hide: function() {
            this.uiSelect.hide();
        }
    });
})(jQuery);
