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

/**
 * options:
 *   - minimumLength : the minimum length of text before firing a change event
 *   - delay : delay, in ms, after a keystroke before firing change event
 *
 * methods:
 *   - value([val]) - gets the current value, or, if `val` is provided, sets the value
 *   - count - sets or clears a sub-label on the input. This can be used to provide
 *             a feedback on the number of matches, or number of available entries to search
 *   - change - trigger a change event
 *
 */

    $.widget( "nodered.searchBox", {
        _create: function() {
            var that = this;

            this.currentTimeout = null;
            this.lastSent = "";
            this.element.val("");
            this.element.addClass("red-ui-searchBox-input");
            this.uiContainer = this.element.wrap("<div>").parent();
            this.uiContainer.addClass("red-ui-searchBox-container");

            if (this.options.style === "compact") {
                this.uiContainer.addClass("red-ui-searchBox-compact");
            }

            if (this.element.parents("form").length === 0) {
                var form = this.element.wrap("<form>").parent();
                form.addClass("red-ui-searchBox-form");
            }
            $('<i class="fa fa-search"></i>').prependTo(this.uiContainer);
            this.clearButton = $('<a class="red-ui-searchBox-clear" href="#"><i class="fa fa-times"></i></a>').appendTo(this.uiContainer);
            this.clearButton.on("click",function(e) {
                e.preventDefault();
                that.element.val("");
                that._change("",true);
                that.element.trigger("focus");
            });

            if (this.options.options) {
                this.uiContainer.addClass("red-ui-searchBox-has-options");
                this.optsButton = $('<a class="red-ui-searchBox-opts" href="#"><i class="fa fa-caret-down"></i></a>').appendTo(this.uiContainer);
                var menuShown = false;
                this.optsMenu = RED.popover.menu({
                    style: this.options.style,
                    options: this.options.options.map(function(opt) {
                        return {
                            label: opt.label,
                            onselect: function() {
                                that.element.val(opt.value+" ");
                                that._change(opt.value,true);
                            }
                        }
                    }),
                    onclose: function(cancelled) {
                        menuShown = false;
                        that.element.trigger("focus");
                    },
                    disposeOnClose: false
                });

                var showMenu = function() {
                    menuShown = true;
                    that.optsMenu.show({
                        target: that.optsButton,
                        align: "left",
                        offset: [that.optsButton.width()-2,-1],
                        dispose: false
                    })
                }
                this.optsButton.on("click",function(e) {
                    e.preventDefault();
                    if (!menuShown) {
                        showMenu();
                    } else {
                        // TODO: This doesn't quite work because the panel's own
                        // mousedown handler triggers a close before this click
                        // handler fires.
                        that.optsMenu.hide(true);
                    }
                });
                this.optsButton.on("keydown",function(e) {
                    if (!menuShown && e.keyCode === 40) {
                        //DOWN
                        showMenu();
                    }
                });
                this.element.on("keydown",function(e) {
                    if (!menuShown && e.keyCode === 40) {
                        //DOWN
                        showMenu();
                    }
                });
            }

            this.resultCount = $('<span>',{class:"red-ui-searchBox-resultCount hide"}).appendTo(this.uiContainer);

            this.element.val("");
            this.element.on("keydown",function(evt) {
                if (evt.keyCode === 27) {
                    that.element.val("");
                }
                if (evt.keyCode === 13) {
                    evt.preventDefault();
                }
            })
            this.element.on("keyup",function(evt) {
                that._change($(this).val());
            });

            this.element.on("focus",function() {
                $(document).one("mousedown",function() {
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
                    this.lastSent = this.element.val();
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
        },
        change: function() {
            this._trigger("change");
        }
    });
})(jQuery);
