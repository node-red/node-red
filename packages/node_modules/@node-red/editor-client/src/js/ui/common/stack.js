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

RED.stack = (function() {
    function createStack(options) {
        var container = options.container;
        container.addClass("red-ui-stack");
        var contentHeight = 0;
        var entries = [];

        var visible = true;
        // TODO: make this a singleton function - and watch out for stacks no longer
        //       in the DOM
        var resizeStack = function() {
            if (entries.length > 0) {
                var headerHeight = 0;
                entries.forEach(function(entry) {
                    headerHeight += entry.header.outerHeight();
                });

                var height = container.innerHeight();
                contentHeight = height - headerHeight - (entries.length-1);
                entries.forEach(function(e) {
                    e.contentWrap.height(contentHeight);
                });
            }
        }
        if (options.fill && options.singleExpanded) {
            $(window).on("resize", resizeStack);
            $(window).on("focus", resizeStack);
        }
        return {
            add: function(entry) {
                entries.push(entry);
                entry.container = $('<div class="red-ui-palette-category">').appendTo(container);
                if (!visible) {
                    entry.container.hide();
                }
                var header = $('<div class="red-ui-palette-header"></div>').appendTo(entry.container);
                entry.header = header;
                entry.contentWrap = $('<div></div>',{style:"position:relative"}).appendTo(entry.container);
                if (options.fill) {
                    entry.contentWrap.css("height",contentHeight);
                }
                entry.content = $('<div></div>').appendTo(entry.contentWrap);
                if (entry.collapsible !== false) {
                    header.on("click", function() {
                        if (options.singleExpanded) {
                            if (!entry.isExpanded()) {
                                for (var i=0;i<entries.length;i++) {
                                    if (entries[i].isExpanded()) {
                                        entries[i].collapse();
                                    }
                                }
                                entry.expand();
                            } else if (entries.length === 2) {
                                if (entries[0] === entry) {
                                    entries[0].collapse();
                                    entries[1].expand();
                                } else {
                                    entries[1].collapse();
                                    entries[0].expand();
                                }
                            }
                        } else {
                            entry.toggle();
                        }
                    });
                    var icon = $('<i class="fa fa-angle-down"></i>').appendTo(header);

                    if (entry.expanded) {
                        entry.container.addClass("expanded");
                        icon.addClass("expanded");
                    } else {
                        entry.contentWrap.hide();
                    }
                } else {
                    $('<i style="opacity: 0.5;" class="fa fa-angle-down expanded"></i>').appendTo(header);
                    header.css("cursor","default");
                }
                entry.title = $('<span></span>').html(entry.title).appendTo(header);



                entry.toggle = function() {
                    if (entry.isExpanded()) {
                        entry.collapse();
                        return false;
                    } else {
                        entry.expand();
                        return true;
                    }
                };
                entry.expand = function() {
                    if (!entry.isExpanded()) {
                        if (entry.onexpand) {
                            entry.onexpand.call(entry);
                        }
                        if (options.singleExpanded) {
                            entries.forEach(function(e) {
                                if (e !== entry) {
                                    e.collapse();
                                }
                            })
                        }

                        icon.addClass("expanded");
                        entry.container.addClass("expanded");
                        entry.contentWrap.slideDown(200);
                        return true;
                    }
                };
                entry.collapse = function() {
                    if (entry.isExpanded()) {
                        icon.removeClass("expanded");
                        entry.container.removeClass("expanded");
                        entry.contentWrap.slideUp(200);
                        return true;
                    }
                };
                entry.isExpanded = function() {
                    return entry.container.hasClass("expanded");
                };
                if (options.fill && options.singleExpanded) {
                    resizeStack();
                }
                return entry;
            },

            hide: function() {
                visible = false;
                entries.forEach(function(entry) {
                    entry.container.hide();
                });
                return this;
            },

            show: function() {
                visible = true;
                entries.forEach(function(entry) {
                    entry.container.show();
                });
                return this;
            },
            resize: function() {
                if (resizeStack) {
                    resizeStack();
                }
            }
        }
    }

    return {
        create: createStack
    }
})();
