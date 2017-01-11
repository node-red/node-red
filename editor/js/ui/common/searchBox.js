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

    $.widget( "nodered.searchBox", {
        _create: function() {
            var that = this;

            this.currentTimeout = null;
            this.lastSent = "";
            this.element.val("");
            this.uiContainer = this.element.wrap("<div>").parent();
            this.uiContainer.addClass("red-ui-searchBox-container");

            $('<i class="fa fa-search"></i>').prependTo(this.uiContainer);
            this.clearButton = $('<a href="#"><i class="fa fa-times"></i></a>').appendTo(this.uiContainer);
            this.clearButton.on("click",function(e) {
                e.preventDefault();
                that.element.val("");
                that._change("",true);
                that.element.focus();
            });

            this.resultCount = $('<span>',{class:"red-ui-searchBox-resultCount hide"}).appendTo(this.uiContainer);

            this.element.val("");
            this.element.on("keydown",function(evt) {
                if (evt.keyCode === 27) {
                    that.element.val("");
                }
            })
            this.element.on("keyup",function(evt) {
                that._change($(this).val());
            });

            this.element.on("focus",function() {
                $("body").one("mousedown",function() {
                    that.element.blur();
                });
            });

        },
        _change: function(val,instant) {
            var fireEvent = false;
            if (val === "") {
                this.clearButton.hide();
                fireEvent = true;
            } else {
                this.clearButton.show();
                fireEvent = (val.length >= (this.options.minimumLength||0));
            }
            var current = this.element.val();
            fireEvent = fireEvent && current !== this.lastSent;
            if (fireEvent) {
                if (!instant && this.options.delay > 0) {
                    clearTimeout(this.currentTimeout);
                    var that = this;
                    this.currentTimeout = setTimeout(function() {
                        that.lastSent = that.element.val();
                        that._trigger("change");
                    },this.options.delay);
                } else {
                    this._trigger("change");
                }
            }
        },
        value: function(val) {
            if (val === undefined) {
                return this.element.val();
            } else {
                this.element.val(val);
                this._change(val);
            }
        },
        count: function(val) {
            if (val === undefined || val === null || val === "") {
                this.resultCount.text("").hide();
            } else {
                this.resultCount.text(val).show();
            }
        }
    });
})(jQuery);
