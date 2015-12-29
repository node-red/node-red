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
        msg: {value:"msg",label:"msg.",style:"code"},
        flow: {value:"flow",label:"flow.",style:"code"},
        global: {value:"global",label:"global.",style:"code"},
        str: {value:"str",label:"string",icon:"red/images/az.png"},
        num: {value:"num",label:"number",icon:"red/images/09.png"},
        json: {value:"json",label:"JSON",icon:"red/images/json.png"},
        re: {value:"re",label:"regular expression",icon:"red/images/re.png"}
    };
    var nlsd = false;

    $.widget( "nodered.propertySelect", {
        _create: function() {
            /*
            {
                options: []
            }
            */
            if (!nlsd && RED && RED._) {
                for (var i in allOptions) {
                    if (allOptions.hasOwnProperty(i)) {
                        allOptions[i].label = RED._("propertySelect.type."+i,{defaultValue:allOptions[i].label});
                    }
                }
            }
            nlsd = true;
            var that = this;
            this.disarmClick = false;
            this.element.addClass('red-ui-propertySelect');
            this.uiWidth = this.element.width();

            this.uiSelect = this.element
                .wrap( "<div>" )
                .parent();

            this.uiSelect.addClass("red-ui-propertySelect-container");

            this.selectTrigger = $('<a href="#" class="foo"><i class="fa fa-sort-desc"></i></a>').prependTo(this.uiSelect);
            this.selectLabel = $('<span>msg.</span>').appendTo(this.selectTrigger);

            this.element.on('focus', function() {
                that.uiSelect.addClass('red-ui-propertySelect-focus');
            });
            this.element.on('blur', function() {
                that.uiSelect.removeClass('red-ui-propertySelect-focus');
            });

            this.selectTrigger.click(function(event) {
                event.preventDefault();
                if (that.disarmClick) {
                    that.disarmClick = false;
                    return
                }
                that._showMenu();
            });
            this.options.options = this.options.options||Object.keys(allOptions);
            this._createMenu(this.options.options);
            this.type(this.options.default||this.options.options[0])
            this._delay(function() {
                //this._resize();
            });
        },
        _hideMenu: function() {
            $(document).off("mousedown.close-property-select");
            this.menu.hide();
            this.element.focus();
        },
        _createMenu: function(opts) {
            var that = this;
            this.menu = $("<div>").addClass("red-ui-propertySelect-options");
            opts.forEach(function(key) {
                var opt = allOptions[key];
                if (opt) {
                    var op = $('<a href="#">').attr("value",opt.value).appendTo(that.menu);
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
                        that.type(key);
                        that._hideMenu();
                    });
                }
            });
            this.menu.css({
                display: "none",
            });
            this.menu.appendTo(document.body);

        },
        _showMenu: function() {
            var that = this;
            var pos = this.selectTrigger.offset();
            var height = this.selectTrigger.height();
            this.menu.css({
                top: (height+pos.top)+"px",
                left: (2+pos.left)+"px"
            });
            this.menu.slideDown(200);
            this._delay(function() {
                that.uiSelect.addClass('red-ui-propertySelect-focus');
                $(document).on("mousedown.close-property-select", function(event) {
                    if(!$(event.target).closest(that.menu).length) {
                        that._hideMenu();
                    }
                    if ($(event.target).closest(that.selectTrigger).length) {
                        that.disarmClick = true;
                        event.preventDefault();
                    }
                })
            });
        },
        _resize: function() {
            var labelWidth = this.selectTrigger.width();
            if (labelWidth === 0) {
                var newTrigger = this.selectTrigger.clone();
                newTrigger.css({
                    position:"absolute",
                    top:0,
                    left:-1000
                }).appendTo(document.body);
                labelWidth = newTrigger.width()+4;
                newTrigger.remove();
            }
            this.element.width(this.uiWidth-labelWidth+4);
        },
        width: function(desiredWidth) {
            this.uiWidth = desiredWidth;
            this._resize();
        },
        _destroy: function() {
            this.menu.remove();
        },
        type: function(type) {
            if (!arguments.length) {
                return this.propertyType;
            } else {
                var opt = allOptions[type];
                if (opt) {
                    this.propertyType = type;
                    this.selectLabel.empty();
                    if (opt.icon) {
                        $('<img>',{src:opt.icon,style:"margin-right: 4px;height: 18px;"}).prependTo(this.selectLabel);
                    } else {
                        this.selectLabel.text(opt.label);
                    }
                    this._resize();
                }
            }
        }
    });
})(jQuery);
