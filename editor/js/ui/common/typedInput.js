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
    var contextParse = function(v) {
        var parts = RED.utils.parseContextKey(v);
        return {
            option: parts.store,
            value: parts.key
        }
    }
    var contextExport = function(v,opt) {
        if (!opt) {
            return v;
        }
        var store = ((typeof opt === "string")?opt:opt.value)
        if (store !== RED.settings.context.default) {
            return "#:("+store+")::"+v;
        } else {
            return v;
        }
    }
    var allOptions = {
        msg: {value:"msg",label:"msg.",validate:RED.utils.validatePropertyExpression},
        flow: {value:"flow",label:"flow.",hasValue:true,
            options:[],
            validate:RED.utils.validatePropertyExpression,
            parse: contextParse,
            export: contextExport
        },
        global: {value:"global",label:"global.",hasValue:true,
            options:[],
            validate:RED.utils.validatePropertyExpression,
            parse: contextParse,
            export: contextExport
        },
        str: {value:"str",label:"string",icon:"red/images/typedInput/az.png"},
        num: {value:"num",label:"number",icon:"red/images/typedInput/09.png",validate:/^[+-]?[0-9]*\.?[0-9]*([eE][-+]?[0-9]+)?$/},
        bool: {value:"bool",label:"boolean",icon:"red/images/typedInput/bool.png",options:["true","false"]},
        json: {
            value:"json",
            label:"JSON",
            icon:"red/images/typedInput/json.png",
            validate: function(v) { try{JSON.parse(v);return true;}catch(e){return false;}},
            expand: function() {
                var that = this;
                var value = this.value();
                try {
                    value = JSON.stringify(JSON.parse(value),null,4);
                } catch(err) {
                }
                RED.editor.editJSON({
                    value: value,
                    complete: function(v) {
                        var value = v;
                        try {
                            value = JSON.stringify(JSON.parse(v));
                        } catch(err) {
                        }
                        that.value(value);
                    }
                })
            }
        },
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
        },
        bin: {
            value: "bin",
            label: "buffer",
            icon: "red/images/typedInput/bin.png",
            expand: function() {
                var that = this;
                RED.editor.editBuffer({
                    value: this.value(),
                    complete: function(v) {
                        that.value(v);
                    }
                })
            }
        },
        env: {
            value: "env",
            label: "env variable",
            icon: "red/images/typedInput/env.png"
        }
    };
    var nlsd = false;

    $.widget( "nodered.typedInput", {
        _create: function() {
            try {
            if (!nlsd && RED && RED._) {
                for (var i in allOptions) {
                    if (allOptions.hasOwnProperty(i)) {
                        allOptions[i].label = RED._("typedInput.type."+i,{defaultValue:allOptions[i].label});
                    }
                }
                var contextStores = RED.settings.context.stores;
                var contextOptions = contextStores.map(function(store) {
                    return {value:store,label: store, icon:'<i class="red-ui-typedInput-icon fa fa-database" style="color: #'+(store==='memory'?'ddd':'777')+'"></i>'}
                })
                if (contextOptions.length < 2) {
                    allOptions.flow.options = [];
                    allOptions.global.options = [];
                } else {
                    allOptions.flow.options = contextOptions;
                    allOptions.global.options = contextOptions;
                }
            }
            nlsd = true;
            var that = this;

            this.disarmClick = false;
            this.input = $('<input type="text"></input>');
            this.input.insertAfter(this.element);
            this.input.val(this.element.val());
            this.element.addClass('red-ui-typedInput');
            this.uiWidth = this.element.outerWidth();
            this.elementDiv = this.input.wrap("<div>").parent().addClass('red-ui-typedInput-input');
            this.uiSelect = this.elementDiv.wrap( "<div>" ).parent();
            var attrStyle = this.element.attr('style');
            var m;
            if ((m = /width\s*:\s*(calc\s*\(.*\)|\d+(%|px))/i.exec(attrStyle)) !== null) {
                this.input.css('width','100%');
                this.uiSelect.width(m[1]);
                this.uiWidth = null;
            } else {
                this.uiSelect.width(this.uiWidth);
            }
            ["Right","Left"].forEach(function(d) {
                var m = that.element.css("margin"+d);
                that.uiSelect.css("margin"+d,m);
                that.input.css("margin"+d,0);
            });

            this.uiSelect.addClass("red-ui-typedInput-container");

            this.element.attr('type','hidden');

            this.options.types = this.options.types||Object.keys(allOptions);

            this.selectTrigger = $('<button tabindex="0"></button>').prependTo(this.uiSelect);
            $('<i class="red-ui-typedInput-icon fa fa-sort-desc"></i>').toggle(this.options.types.length > 1).appendTo(this.selectTrigger);

            this.selectLabel = $('<span class="red-ui-typedInput-type-label"></span>').appendTo(this.selectTrigger);

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

            this.input.on('focus', function() {
                that.uiSelect.addClass('red-ui-typedInput-focus');
            });
            this.input.on('blur', function() {
                that.uiSelect.removeClass('red-ui-typedInput-focus');
            });
            this.input.on('change', function() {
                that.validate();
                that.element.val(that.value());
                that.element.trigger('change',that.propertyType,that.value());
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
            this.optionSelectTrigger = $('<button tabindex="0" class="red-ui-typedInput-option-trigger" style="display:inline-block"><span class="red-ui-typedInput-option-caret"><i class="red-ui-typedInput-icon fa fa-sort-desc"></i></span></button>').appendTo(this.uiSelect);
            this.optionSelectLabel = $('<span class="red-ui-typedInput-option-label"></span>').prependTo(this.optionSelectTrigger);
            RED.popover.tooltip(this.optionSelectLabel,function() {
                return that.optionValue;
            });
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

            this.optionExpandButton = $('<button tabindex="0" class="red-ui-typedInput-option-expand" style="display:inline-block"><i class="red-ui-typedInput-icon fa fa-ellipsis-h"></i></button>').appendTo(this.uiSelect);
            this.type(this.options.default||this.typeList[0].value);
        }catch(err) {
            console.log(err.stack);
        }
        },
        _showTypeMenu: function() {
            if (this.typeList.length > 1) {
                this._showMenu(this.menu,this.selectTrigger);
                this.menu.find("[value='"+this.propertyType+"']").focus();
            } else {
                this.input.focus();
            }
        },
        _showOptionSelectMenu: function() {
            if (this.optionMenu) {
                this.optionMenu.css({
                    minWidth:this.optionSelectLabel.width()
                });

                this._showMenu(this.optionMenu,this.optionSelectTrigger);
                var selectedOption = this.optionMenu.find("[value='"+this.optionValue+"']");
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
                this.input.focus();
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
                    if (opt.icon.indexOf("<") === 0) {
                        $(opt.icon).prependTo(op);
                    } else if (opt.icon.indexOf("/") !== -1) {
                        $('<img>',{src:opt.icon,style:"margin-right: 4px; height: 18px;"}).prependTo(op);
                    } else {
                        $('<i>',{class:"red-ui-typedInput-icon "+opt.icon}).prependTo(op);
                    }
                } else {
                    op.css({paddingLeft: "18px"});
                }
                if (!opt.icon && !opt.label) {
                    op.text(opt.value);
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
            var type = this.typeMap[this.propertyType];
            if (type && type.hasValue === false) {
                this.selectTrigger.addClass("red-ui-typedInput-full-width");
            } else {
                this.selectTrigger.removeClass("red-ui-typedInput-full-width");
                var labelWidth = this._getLabelWidth(this.selectTrigger);
                this.elementDiv.css('left',labelWidth+"px");
                if (this.optionExpandButton.is(":visible")) {
                    this.elementDiv.css('right',"22px");
                } else {
                    this.elementDiv.css('right','0');
                    this.input.css({
                        'border-top-right-radius': '4px',
                        'border-bottom-right-radius': '4px'
                    });
                }

                // if (this.optionSelectTrigger) {
                //     this.optionSelectTrigger.css({'left':(labelWidth)+"px",'width':'calc( 100% - '+labelWidth+'px )'});
                // }

                if (this.optionSelectTrigger) {
                    if (type && type.options && type.hasValue === true) {
                        this.optionSelectLabel.css({'left':'auto'})
                        var lw = this._getLabelWidth(this.optionSelectLabel);
                        this.optionSelectTrigger.css({'width':(23+lw)+"px"});
                        this.elementDiv.css('right',(23+lw)+"px");
                        this.input.css({
                            'border-top-right-radius': 0,
                            'border-bottom-right-radius': 0
                        });
                    } else {
                        this.optionSelectLabel.css({'left':'0'})
                        this.optionSelectTrigger.css({'width':'calc( 100% - '+labelWidth+'px )'});
                        if (!this.optionExpandButton.is(":visible")) {
                            this.elementDiv.css({'right':0});
                            this.input.css({
                                'border-top-right-radius': '4px',
                                'border-bottom-right-radius': '4px'
                            });
                        }
                    }
                }
            }
        },
        _updateOptionSelectLabel: function(o) {
            var opt = this.typeMap[this.propertyType];
            this.optionSelectLabel.empty();
            if (o.icon) {
                if (o.icon.indexOf("<") === 0) {
                    $(o.icon).prependTo(this.optionSelectLabel);
                } else if (o.icon.indexOf("/") !== -1) {
                    // url
                    $('<img>',{src:o.icon,style:"height: 18px;"}).prependTo(this.optionSelectLabel);
                } else {
                    // icon class
                    $('<i>',{class:"red-ui-typedInput-icon "+o.icon}).prependTo(this.optionSelectLabel);
                }
            } else if (o.label) {
                this.optionSelectLabel.text(o.label);
            } else {
                this.optionSelectLabel.text(o.value);
            }
            if (opt.hasValue) {
                this.optionValue = o.value;
                this._resize();
                this.input.trigger('change',this.propertyType,this.value());
            }
        },
        _destroy: function() {
            if (this.optionMenu) {
                this.optionMenu.remove();
            }
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
            this.selectTrigger.find(".fa-sort-desc").toggle(this.typeList.length > 1)
            if (this.menu) {
                this.menu.remove();
            }
            this.menu = this._createMenu(this.typeList, function(v) { that.type(v) });
            if (currentType && !this.typeMap.hasOwnProperty(currentType)) {
                this.type(this.typeList[0].value);
            } else {
                this.propertyType = null;
                this.type(currentType);
            }
            setTimeout(function() {that._resize();},0);
        },
        width: function(desiredWidth) {
            this.uiWidth = desiredWidth;
            this._resize();
        },
        value: function(value) {
            if (!arguments.length) {
                var v = this.input.val();
                if (this.typeMap[this.propertyType].export) {
                    v = this.typeMap[this.propertyType].export(v,this.optionValue)
                }
                return v;
            } else {
                var selectedOption;
                if (this.typeMap[this.propertyType].options) {
                    for (var i=0;i<this.typeMap[this.propertyType].options.length;i++) {
                        var op = this.typeMap[this.propertyType].options[i];
                        if (typeof op === "string") {
                            if (op === value) {
                                selectedOption = this.activeOptions[op];
                                break;
                            }
                        } else if (op.value === value) {
                            selectedOption = op;
                            break;
                        }
                    }
                    if (!selectedOption) {
                        selectedOption = {value:""}
                    }
                    this._updateOptionSelectLabel(selectedOption)
                }
                this.input.val(value);
                this.input.trigger('change',this.type(),value);
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
                    if (this.typeField) {
                        this.typeField.val(type);
                    }
                    this.selectLabel.empty();
                    var image;
                    if (opt.icon) {
                        if (opt.icon.indexOf("<") === 0) {
                            $(opt.icon).prependTo(this.selectLabel);
                        }
                        else if (opt.icon.indexOf("/") !== -1) {
                            image = new Image();
                            image.name = opt.icon;
                            image.src = opt.icon;
                            $('<img>',{src:opt.icon,style:"margin-right: 4px;height: 18px;"}).prependTo(this.selectLabel);
                        }
                        else {
                            $('<i>',{class:"red-ui-typedInput-icon "+opt.icon}).prependTo(this.selectLabel);
                        }
                    } else {
                        this.selectLabel.text(opt.label);
                    }
                    if (this.optionMenu) {
                        this.optionMenu.remove();
                        this.optionMenu = null;
                    }
                    if (opt.options) {
                        if (this.optionExpandButton) {
                            this.optionExpandButton.hide();
                        }
                        if (this.optionSelectTrigger) {
                            this.optionSelectTrigger.show();
                            if (!opt.hasValue) {
                                this.elementDiv.hide();
                            } else {
                                this.elementDiv.show();
                            }
                            this.activeOptions = {};
                            opt.options.forEach(function(o) {
                                if (typeof o === 'string') {
                                    that.activeOptions[o] = {label:o,value:o};
                                } else {
                                    that.activeOptions[o.value] = o;
                                }
                            });

                            if (!that.activeOptions.hasOwnProperty(that.optionValue)) {
                                that.optionValue = null;
                            }
                            this.optionMenu = this._createMenu(opt.options,function(v){
                                that._updateOptionSelectLabel(that.activeOptions[v]);
                                if (!opt.hasValue) {
                                    that.value(that.activeOptions[v].value)
                                }
                            });
                            var op;
                            if (!opt.hasValue) {
                                var currentVal = this.input.val();
                                var validValue = false;
                                for (var i=0;i<opt.options.length;i++) {
                                    op = opt.options[i];
                                    if (typeof op === "string" && op === currentVal) {
                                        that._updateOptionSelectLabel({value:currentVal});
                                        validValue = true;
                                        break;
                                    } else if (op.value === currentVal) {
                                        that._updateOptionSelectLabel(op);
                                        validValue = true;
                                        break;
                                    }
                                }
                                if (!validValue) {
                                    op = opt.options[0];
                                    if (typeof op === "string") {
                                        this.value(op);
                                        that._updateOptionSelectLabel({value:op});
                                    } else {
                                        this.value(op.value);
                                        that._updateOptionSelectLabel(op);
                                    }
                                }
                            } else {
                                var selectedOption = this.optionValue||opt.options[0];
                                if (opt.parse) {
                                    var parts = opt.parse(this.input.val());
                                    if (parts.option) {
                                        selectedOption = parts.option;
                                        if (!this.activeOptions.hasOwnProperty(selectedOption)) {
                                            parts.option = Object.keys(this.activeOptions)[0];
                                            selectedOption = parts.option
                                        }
                                    }
                                    this.input.val(parts.value);
                                    if (opt.export) {
                                        this.element.val(opt.export(parts.value,parts.option||selectedOption));
                                    }
                                }
                                if (typeof selectedOption === "string") {
                                    this.optionValue = selectedOption;
                                    if (!this.activeOptions.hasOwnProperty(selectedOption)) {
                                        selectedOption = Object.keys(this.activeOptions)[0];
                                    }
                                    if (!selectedOption) {
                                        this.optionSelectTrigger.hide();
                                    } else {
                                        this._updateOptionSelectLabel(this.activeOptions[selectedOption]);
                                    }
                                } else if (selectedOption) {
                                    this.optionValue = selectedOption.value;
                                    this._updateOptionSelectLabel(selectedOption);
                                } else {
                                    this.optionSelectTrigger.hide();
                                }
                            }
                        }
                    } else {
                        if (this.optionSelectTrigger) {
                            this.optionSelectTrigger.hide();
                        }
                        if (opt.hasValue === false) {
                            this.oldValue = this.input.val();
                            this.input.val("");
                            this.elementDiv.hide();
                        } else {
                            if (this.oldValue !== undefined) {
                                this.input.val(this.oldValue);
                                delete this.oldValue;
                            }
                            this.elementDiv.show();
                        }
                        if (this.optionExpandButton) {
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
                        }
                        this.input.trigger('change',this.propertyType,this.value());
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
