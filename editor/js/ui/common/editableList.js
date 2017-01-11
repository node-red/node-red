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
 *   - addButton : boolean|string - text for add label, default 'add'
 *   - height : number|'auto'
 *   - resize : function - called when list as a whole is resized
 *   - resizeItem : function(item) - called to resize individual item
 *   - sortable : boolean|string - string is the css selector for handle
 *   - sortItems : function(items) - when order of items changes
 *   - connectWith : css selector of other sortables
 *   - removable : boolean - whether to display delete button on items
 *   - addItem : function(row,index,itemData) - when an item is added
 *   - removeItem : function(itemData) - called when an item is removed
 *   - filter : function(itemData) - called for each item to determine if it should be shown
 *   - sort : function(itemDataA,itemDataB) - called to sort items
 *   - scrollOnAdd : boolean - whether to scroll to newly added items
 * methods:
 *   - addItem(itemData)
 *   - removeItem(itemData)
 *   - width(width)
 *   - height(height)
 *   - items()
 *   - empty()
 *   - filter(filter)
 *   - sort(sort)
 *   - length()
 */
    $.widget( "nodered.editableList", {
        _create: function() {
            var that = this;

            this.element.addClass('red-ui-editableList-list');
            this.uiWidth = this.element.width();
            this.uiContainer = this.element
                .wrap( "<div>" )
                .parent();
            this.topContainer = this.uiContainer.wrap("<div>").parent();

            this.topContainer.addClass('red-ui-editableList');

            if (this.options.addButton !== false) {
                var addLabel;
                if (typeof this.options.addButton === 'string') {
                    addLabel = this.options.addButton
                } else {
                    if (RED && RED._) {
                        addLabel = RED._("editableList.add");
                    } else {
                        addLabel = 'add';
                    }
                }
                $('<a href="#" class="editor-button editor-button-small" style="margin-top: 4px;"><i class="fa fa-plus"></i> '+addLabel+'</a>')
                    .appendTo(this.topContainer)
                    .click(function(evt) {
                        evt.preventDefault();
                        that.addItem({});
                    });
            }
            if (this.element.css("position") === "absolute") {
                ["top","left","bottom","right"].forEach(function(s) {
                    var v = that.element.css(s);
                    if (s!=="auto" && s!=="") {
                        that.topContainer.css(s,v);
                        that.uiContainer.css(s,"0");
                        that.element.css(s,'auto');
                    }
                })
                this.element.css("position","static");
                this.topContainer.css("position","absolute");
                this.uiContainer.css("position","absolute");

            }
            this.uiContainer.addClass("red-ui-editableList-container");

            this.uiHeight = this.element.height();

            this.activeFilter = this.options.filter||null;
            this.activeSort = this.options.sort||null;
            this.scrollOnAdd = this.options.scrollOnAdd;
            if (this.scrollOnAdd === undefined) {
                this.scrollOnAdd = true;
            }
            var minHeight = this.element.css("minHeight");
            if (minHeight !== '0px') {
                this.uiContainer.css("minHeight",minHeight);
                this.element.css("minHeight",0);
            }
            if (this.options.height !== 'auto') {
                this.uiContainer.css("overflow-y","scroll");
                if (!isNaN(this.options.height)) {
                    this.uiHeight = this.options.height;
                }
            }
            this.element.height('auto');

            var attrStyle = this.element.attr('style');
            var m;
            if ((m = /width\s*:\s*(\d+%)/i.exec(attrStyle)) !== null) {
                this.element.width('100%');
                this.uiContainer.width(m[1]);
            }
            if (this.options.sortable) {
                var handle = (typeof this.options.sortable === 'string')?
                                this.options.sortable :
                                ".red-ui-editableList-item-handle";
                var sortOptions = {
                    axis: "y",
                    update: function( event, ui ) {
                        if (that.options.sortItems) {
                            that.options.sortItems(that.items());
                        }
                    },
                    handle:handle,
                    cursor: "move",
                    tolerance: "pointer",
                    forcePlaceholderSize:true,
                    placeholder: "red-ui-editabelList-item-placeholder",
                    start: function(e, ui){
                        ui.placeholder.height(ui.item.height()-4);
                    }
                };
                if (this.options.connectWith) {
                    sortOptions.connectWith = this.options.connectWith;
                }

                this.element.sortable(sortOptions);
            }

            this._resize();

            // this.menu = this._createMenu(this.types, function(v) { that.type(v) });
            // this.type(this.options.default||this.types[0].value);
        },
        _resize: function() {
            var currentFullHeight = this.topContainer.height();
            var innerHeight = this.uiContainer.height();
            var delta = currentFullHeight - innerHeight;
            if (this.uiHeight !== 0) {
                this.uiContainer.height(this.uiHeight-delta);
            }
            if (this.options.resize) {
                this.options.resize();
            }
            if (this.options.resizeItem) {
                var that = this;
                this.element.children().each(function(i) {
                    that.options.resizeItem($(this).find(".red-ui-editableList-item-content"),i);
                });
            }
        },
        _destroy: function() {
        },
        _refreshFilter: function() {
            var that = this;
            var count = 0;
            if (!this.activeFilter) {
                this.element.children().show();
            }
            var items = this.items();
            items.each(function (i,el) {
                var data = el.data('data');
                try {
                    if (that.activeFilter(data)) {
                        el.parent().show();
                        count++;
                    } else {
                        el.parent().hide();
                    }
                } catch(err) {
                    console.log(err);
                    el.parent().show();
                    count++;
                }
            });
            return count;
        },
        _refreshSort: function() {
            if (this.activeSort) {
                var items = this.element.children();
                var that = this;
                items.sort(function(A,B) {
                    return that.activeSort($(A).find(".red-ui-editableList-item-content").data('data'),$(B).find(".red-ui-editableList-item-content").data('data'));
                });
                $.each(items,function(idx,li) {
                    that.element.append(li);
                })
            }
        },
        width: function(desiredWidth) {
            this.uiWidth = desiredWidth;
            this._resize();
        },
        height: function(desiredHeight) {
            this.uiHeight = desiredHeight;
            this._resize();
        },
        addItem: function(data) {
            var that = this;
            data = data || {};
            var li = $('<li>');
            var added = false;
            if (this.activeSort) {
                var items = this.items();
                var skip = false;
                items.each(function(i,el) {
                    if (added) { return }
                    var itemData = el.data('data');
                    if (that.activeSort(data,itemData) < 0) {
                         li.insertBefore(el.closest("li"));
                         added = true;
                    }
                });
            }
            if (!added) {
                li.appendTo(this.element);
            }
            var row = $('<div/>').addClass("red-ui-editableList-item-content").appendTo(li);
            row.data('data',data);
            if (this.options.sortable === true) {
                $('<i class="red-ui-editableList-item-handle fa fa-bars"></i>').appendTo(li);
                li.addClass("red-ui-editableList-item-sortable");
            }
            if (this.options.removable) {
                var deleteButton = $('<a/>',{href:"#",class:"red-ui-editableList-item-remove editor-button editor-button-small"}).appendTo(li);
                $('<i/>',{class:"fa fa-remove"}).appendTo(deleteButton);
                li.addClass("red-ui-editableList-item-removable");
                deleteButton.click(function(evt) {
                    evt.preventDefault();
                    var data = row.data('data');
                    li.addClass("red-ui-editableList-item-deleting")
                    li.fadeOut(300, function() {
                        $(this).remove();
                        if (that.options.removeItem) {
                            that.options.removeItem(data);
                        }
                    });
                });
            }
            if (this.options.addItem) {
                var index = that.element.children().length-1;
                setTimeout(function() {
                    that.options.addItem(row,index,data);
                    if (that.activeFilter) {
                        try {
                            if (!that.activeFilter(data)) {
                                li.hide();
                            }
                        } catch(err) {
                        }
                    }

                    if (!that.activeSort && that.scrollOnAdd) {
                        setTimeout(function() {
                            that.uiContainer.scrollTop(that.element.height());
                        },0);
                    }
                },0);
            }
        },
        removeItem: function(data) {
            var items = this.element.children().filter(function(f) {
                return data === $(this).find(".red-ui-editableList-item-content").data('data');
            });
            items.remove();
            if (this.options.removeItem) {
                this.options.removeItem(data);
            }
        },
        items: function() {
            return this.element.children().map(function(i) { return $(this).find(".red-ui-editableList-item-content"); });
        },
        empty: function() {
            this.element.empty();
        },
        filter: function(filter) {
            if (filter !== undefined) {
                this.activeFilter = filter;
            }
            return this._refreshFilter();
        },
        sort: function(sort) {
            if (sort !== undefined) {
                this.activeSort = sort;
            }
            return this._refreshSort();
        },
        length: function() {
            return this.element.children().length;
        }
    });
})(jQuery);
