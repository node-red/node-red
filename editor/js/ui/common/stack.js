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

        return {
            add: function(entry) {

                entries.push(entry);
                var entryContainer = $('<div class="palette-category">').appendTo(container);

                var header = $('<div class="palette-header"></div>').appendTo(entryContainer);
                var icon = $('<i class="fa fa-angle-down"></i>').appendTo(header);
                $('<span></span>').html(entry.title).appendTo(header);
                entry.content = $('<div class="editor-tray-content"></div>').appendTo(entryContainer);

                if (entry.expanded) {
                    icon.addClass("expanded");
                } else {
                    entry.content.hide();
                }

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

        }

    }

    return {
        create: createStack
    }
})();
