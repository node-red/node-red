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
(function($) {
    var allOptions = {
        msg: {value:"msg",label:"msg.",validate:RED.utils.validatePropertyExpression},
        flow: {value:"flow",label:"flow.",validate:RED.utils.validatePropertyExpression},
        global: {value:"global",label:"global.",validate:RED.utils.validatePropertyExpression},
        str: {value:"str",label:"string",icon:"red/images/typedInput/az.png"},
        num: {value:"num",label:"number",icon:"red/images/typedInput/09.png",validate:/^[+-]?[0-9]*\.?[0-9]*([eE][-+]?[0-9]+)?$/},
        bool: {value:"bool",label:"boolean",icon:"red/images/typedInput/bool.png",options:["true","false"]},
        json: {value:"json",label:"JSON",icon:"red/images/typedInput/json.png", validate: function(v) { try{JSON.parse(v);return true;}catch(e){return false;}}},
        re: {value:"re",label:"regular expression",icon:"red/images/typedInput/re.png"},
        date: {value:"date",label:"timestamp",hasValue:false},
        jsonata: {
            value: "jsonata",
            label: "expression",
            icon: "red/images/typedInput/expr.png",
            validate: function(v) { try{jsonata(v);return true;}catch(e){return false;}},
            expand:function() {
                var that = this;
                RED.editor.editExpression({
                    value: this.value().replace(/\t/g,"\n"),
                    complete: function(v) {
                        that.value(v.replace(/\n/g,"\t"));
                    }
                })
            }
        }
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
            if ((m = /width\s*:\s*(\d+(%|px))/i.exec(attrStyle)) !== null) {
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

            this.selectTrigger = $('<button tabindex="0"></button>').prependTo(this.uiSelect);
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
                that._showTypeMenu();
            });
            this.selectTrigger.on('keydown',function(evt) {
                if (evt.keyCode === 40) {
                    // Down
                    that._showTypeMenu();
                }
            }).on('focus', function() {
                that.uiSelect.addClass('red-ui-typedInput-focus');
            })

            // explicitly set optionSelectTrigger display to inline-block otherwise jQ sets it to 'inline'
            this.optionSelectTrigger = $('<button tabindex="0" class="red-ui-typedInput-option-trigger" style="display:inline-block"><span class="red-ui-typedInput-option-caret"><i class="fa fa-sort-desc"></i></span></button>').appendTo(this.uiSelect);
            this.optionSelectLabel = $('<span class="red-ui-typedInput-option-label"></span>').prependTo(this.optionSelectTrigger);
            this.optionSelectTrigger.click(function(event) {
                event.preventDefault();
                that._showOptionSelectMenu();
            }).on('keydown', function(evt) {
                if (evt.keyCode === 40) {
                    // Down
                    that._showOptionSelectMenu();
                }
            }).on('blur', function() {
                that.uiSelect.removeClass('red-ui-typedInput-focus');
            }).on('focus', function() {
                that.uiSelect.addClass('red-ui-typedInput-focus');
            });

            this.optionExpandButton = $('<button tabindex="0" class="red-ui-typedInput-option-expand" style="display:inline-block"><i class="fa fa-ellipsis-h"></i></button>').appendTo(this.uiSelect);


            this.type(this.options.default||this.typeList[0].value);
        },
        _showTypeMenu: function() {
            if (this.typeList.length > 1) {
                this._showMenu(this.menu,this.selectTrigger);
                this.menu.find("[value='"+this.propertyType+"']").focus();
            } else {
                this.element.focus();
            }
        },
        _showOptionSelectMenu: function() {
            if (this.optionMenu) {
                this.optionMenu.css({
                    minWidth:this.optionSelectLabel.width()
                });

                this._showMenu(this.optionMenu,this.optionSelectLabel);
                var selectedOption = this.optionMenu.find("[value='"+this.value()+"']");
                if (selectedOption.length === 0) {
                    selectedOption = this.optionMenu.children(":first");
                }
                selectedOption.focus();

            }
        },
        _hideMenu: function(menu) {
            $(document).off("mousedown.close-property-select");
            menu.hide();
            if (this.elementDiv.is(":visible")) {
                this.element.focus();
            } else if (this.optionSelectTrigger.is(":visible")){
                this.optionSelectTrigger.focus();
            } else {
                this.selectTrigger.focus();
            }
        },
        _createMenu: function(opts,callback) {
            var that = this;
            var menu = $("<div>").addClass("red-ui-typedInput-options");
            opts.forEach(function(opt) {
                if (typeof opt === 'string') {
                    opt = {value:opt,label:opt};
                }
                var op = $('<a href="#"></a>').attr("value",opt.value).appendTo(menu);
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

            menu.on('keydown', function(evt) {
                if (evt.keyCode === 40) {
                    // DOWN
                    $(this).children(":focus").next().focus();
                } else if (evt.keyCode === 38) {
                    // UP
                    $(this).children(":focus").prev().focus();
                } else if (evt.keyCode === 27) {
                    that._hideMenu(menu);
                }
            })



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
                this.selectTrigger.addClass("red-ui-typedInput-full-width");
            } else {
                this.selectTrigger.removeClass("red-ui-typedInput-full-width");
                var labelWidth = this._getLabelWidth(this.selectTrigger);
                this.elementDiv.css('left',labelWidth+"px");
                if (this.optionExpandButton.is(":visible")) {
                    this.elementDiv.css('right',"22px");
                } else {
                    this.elementDiv.css('right','0');
                }
                if (this.optionSelectTrigger) {
                    this.optionSelectTrigger.css({'left':(labelWidth)+"px",'width':'calc( 100% - '+labelWidth+'px )'});
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
                        if (this.optionExpandButton) {
                            this.optionExpandButton.hide();
                        }
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
                        if (opt.expand && typeof opt.expand === 'function') {
                            this.optionExpandButton.show();
                            this.optionExpandButton.off('click');
                            this.optionExpandButton.on('click',function(evt) {
                                evt.preventDefault();
                                opt.expand.call(that);
                            })
                        } else {
                            this.optionExpandButton.hide();
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
