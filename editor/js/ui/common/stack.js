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

        var entries = [];

        var visible = true;

        return {
            add: function(entry) {
                entries.push(entry);
                entry.container = $('<div class="palette-category">').appendTo(container);
                if (!visible) {
                    entry.container.hide();
                }
                var header = $('<div class="palette-header"></div>').appendTo(entry.container);
                entry.content = $('<div></div>').appendTo(entry.container);
                if (entry.collapsible !== false) {
                    header.click(function() {
                        if (options.singleExpanded) {
                            if (!entry.isExpanded()) {
                                for (var i=0;i<entries.length;i++) {
                                    if (entries[i].isExpanded()) {
                                        entries[i].collapse();
                                    }
                                }
                                entry.expand();
                            }
                        } else {
                            entry.toggle();
                        }
                    });
                    var icon = $('<i class="fa fa-angle-down"></i>').appendTo(header);

                    if (entry.expanded) {
                        icon.addClass("expanded");
                    } else {
                        entry.content.hide();
                    }
                } else {
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
                        icon.addClass("expanded");
                        entry.content.slideDown(200);
                        return true;
                    }
                };
                entry.collapse = function() {
                    if (entry.isExpanded()) {
                        icon.removeClass("expanded");
                        entry.content.slideUp(200);
                        return true;
                    }
                };
                entry.isExpanded = function() {
                    return icon.hasClass("expanded");
                };

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
            }
        }

    }

    return {
        create: createStack
    }
})();
