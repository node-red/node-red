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
(function($) {
    var allOptions = {
        msg: {value:"msg",label:"msg.",validate:/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]+)*/i},
        flow: {value:"flow",label:"flow.",validate:/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]+)*/i},
        global: {value:"global",label:"global.",validate:/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]+)*/i},
        str: {value:"str",label:"string",icon:"red/images/typedInput/az.png"},
        num: {value:"num",label:"number",icon:"red/images/typedInput/09.png",validate:/^[+-]?[0-9]*\.?[0-9]*([eE][-+]?[0-9]+)?$/},
        bool: {value:"bool",label:"boolean",icon:"red/images/typedInput/bool.png",options:["true","false"]},
        json: {value:"json",label:"JSON",icon:"red/images/typedInput/json.png", validate: function(v) { try{JSON.parse(v);return true;}catch(e){return false;}}},
        re: {value:"re",label:"regular expression",icon:"red/images/typedInput/re.png"}
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
            this.uiWidth = this.element.width();
            this.uiSelect = this.element
                .wrap( "<div>" )
                .parent();

            ["Right","Left"].forEach(function(d) {
                var m = that.element.css("margin"+d);
                that.uiSelect.css("margin"+d,m);
                that.element.css("margin"+d,0);
            });
            this.uiSelect.addClass("red-ui-typedInput-container");

            this.options.types = this.options.types||Object.keys(allOptions);

            var hasSubOptions = false;
            this.typeMap = {};
            this.types = this.options.types.map(function(opt) {
                var result;
                if (typeof opt === 'string') {
                    result = allOptions[opt];
                } else {
                    result = opt;
                }
                that.typeMap[result.value] = result;
                if (result.options) {
                    hasSubOptions = true;
                }
                return result;
            });

            if (this.options.typeField) {
                this.typeField = $(this.options.typeField).hide();
                var t = this.typeField.val();
                if (t && this.typeMap[t]) {
                    this.options.default = t;
                }
            } else {
                this.typeField = $("<input>",{type:'hidden'}).appendTo(this.uiSelect);
            }

            this.selectTrigger = $('<a href="#"><i class="fa fa-sort-desc"></i></a>').prependTo(this.uiSelect);
            this.selectLabel = $('<span></span>').appendTo(this.selectTrigger);

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
                that._showMenu(that.menu,that.selectTrigger);
            });


            if (hasSubOptions) {
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
            }
            this.menu = this._createMenu(this.types, function(v) { that.type(v) });
            this.type(this.options.default||this.types[0].value);
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
            menu.css({
                top: (height+pos.top-3)+"px",
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
            var labelWidth = label.width();
            if (labelWidth === 0) {
                var newTrigger = label.clone();
                newTrigger.css({
                    position:"absolute",
                    top:0,
                    left:-1000
                }).appendTo(document.body);
                labelWidth = newTrigger.width()+4;
                newTrigger.remove();
            }
            return labelWidth;
        },
        _resize: function() {

            if (this.typeMap[this.propertyType] && this.typeMap[this.propertyType].hasValue === false) {
                this.selectTrigger.width(this.uiWidth+5);
            } else {
                this.selectTrigger.width('auto');
                var labelWidth = this._getLabelWidth(this.selectTrigger);

                var newWidth = this.uiWidth-labelWidth+4;
                this.element.width(newWidth);

                if (this.optionSelectTrigger) {
                    var triggerWidth = this._getLabelWidth(this.optionSelectTrigger);
                    labelWidth = this._getLabelWidth(this.optionSelectLabel)-4;
                    this.optionSelectLabel.width(labelWidth+(newWidth-triggerWidth));
                }
            }
        },
        _destroy: function() {
            this.menu.remove();
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
                this.element.trigger('change');
            }
        },
        type: function(type) {
            if (!arguments.length) {
                return this.propertyType;
            } else {
                var opt = this.typeMap[type];
                if (opt && this.propertyType !== type) {
                    this.propertyType = type;
                    this.typeField.val(type);
                    this.selectLabel.empty();
                    if (opt.icon) {
                        $('<img>',{src:opt.icon,style:"margin-right: 4px;height: 18px;"}).prependTo(this.selectLabel);
                    } else {
                        this.selectLabel.text(opt.label);
                    }
                    if (opt.options) {
                        if (this.optionSelectTrigger) {
                            this.optionSelectTrigger.show();
                            this.element.hide();
                            var that = this;
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
                            this.element.val("");
                            this.element.hide();
                        } else {
                            this.element.show();
                        }
                        this.element.trigger('change');
                    }
                    this._resize();
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
        }
    });
})(jQuery);
