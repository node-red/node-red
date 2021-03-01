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
 *   - data : array - initial items to display in tree
 *   - multi : boolean - if true, .selected will return an array of results
 *                       otherwise, returns the first selected item
 *   - sortable: boolean/string - TODO: see editableList
 *   - rootSortable: boolean - if 'sortable' is set, then setting this to
 *                             false, prevents items being sorted to the
 *                             top level of the tree
 *
 * methods:
 *   - data(items) - clears existing items and replaces with new data
 *   - clearSelection - clears the selected items
 *   - filter(filterFunc) - filters the tree using the provided function
 * events:
 *   - treelistselect : function(event, item) {}
 *   - treelistconfirm : function(event,item) {}
 *   - treelistchangeparent: function(event,item, oldParent, newParent) {}
 *
 * data:
 * [
 *     {
 *         label: 'Local', // label for the item
 *         sublabel: 'Local', // a sub-label for the item
 *         icon: 'fa fa-rocket', // (optional) icon for the item
 *         checkbox: true/false, // (optional) if present, display checkbox accordingly
 *         selected: true/false, // (optional) whether the item is selected or not
 *         children: [] | function(done,item) // (optional) an array of child items, or a function
 *                                       // that will call the `done` callback with an array
 *                                       // of child items
 *         expanded: true/false, // show the child items by default
 *         deferBuild: true/false, // don't build any ui elements for the item's children
 *                                    until it is expanded by the user.
 *         element: // custom dom element to use for the item - ignored if `label` is set
 *     }
 * ]
 *
 * var treeList = $("<div>").css({width: "100%", height: "100%"}).treeList({data:[...]})
 * treeList.on('treelistselect', function(e,item) { console.log(item)})
 * treeList.treeList('data',[ ... ] )
 *
 *
 * After `data` has been added to the tree, each item is augmented the following
 * properties and functions:
 *
 *   item.parent - set to the parent item
 *   item.depth - the depth in the tree (0 == root)
 *   item.treeList.container
 *   item.treeList.label - the label element for the item
 *   item.treeList.parentList  - the editableList instance this item is in
 *   item.treeList.remove(detach) - removes the item from the tree. Optionally detach to preserve any event handlers on the item's label
 *   item.treeList.makeLeaf(detachChildElements) - turns an element with children into a leaf node,
 *                                                 removing the UI decoration etc.
 *                                                 detachChildElements - any children with custom
 *                                                 elements will be detached rather than removed
 *                                                 so jQuery event handlers are preserved in case
 *                                                 the child elements need to be reattached later
 *   item.treeList.makeParent(children) - turns an element into a parent node, adding the necessary
 *                                        UI decoration.
 *   item.treeList.insertChildAt(newItem,position,select) - adds a child item an the specified position.
 *                                                          Optionally selects the item after adding.
 *   item.treeList.addChild(newItem,select) - appends a child item.
 *                                            Optionally selects the item after adding.
 *   item.treeList.expand(done) - expands the parent item to show children. Optional 'done' callback.
 *   item.treeList.collapse() - collapse the parent item to hide children.
 *   item.treeList.sortChildren(sortFunction) - does a one-time sort of the children using sortFunction
 *   item.treeList.replaceElement(element) - replace the custom element for the item
 *
 *
 */

    $.widget( "nodered.treeList", {
        _create: function() {
            var that = this;

            this.element.addClass('red-ui-treeList');
            this.element.attr("tabIndex",0);
            var wrapper = $('<div>',{class:'red-ui-treeList-container'}).appendTo(this.element);
            this.element.on('keydown', function(evt) {
                var selected = that._topList.find(".selected").parent().data('data');
                if (!selected && (evt.keyCode === 40 || evt.keyCode === 38)) {
                    that.select(that._data[0]);
                    return;
                }
                var target;
                switch(evt.keyCode) {
                    case 13: // ENTER
                        evt.preventDefault();
                        evt.stopPropagation();
                        if (selected.children) {
                            if (selected.treeList.container.hasClass("expanded")) {
                                selected.treeList.collapse()
                            } else {
                                selected.treeList.expand()
                            }
                        } else {
                            that._trigger("confirm",null,selected)
                        }

                    break;
                    case 37: // LEFT
                        evt.preventDefault();
                        evt.stopPropagation();
                        if (selected.children&& selected.treeList.container.hasClass("expanded")) {
                            selected.treeList.collapse()
                        } else if (selected.parent) {
                            target = selected.parent;
                        }
                    break;
                    case 38: // UP
                        evt.preventDefault();
                        evt.stopPropagation();
                        target = that._getPreviousSibling(selected);
                        if (target) {
                            target = that._getLastDescendant(target);
                        }
                        if (!target && selected.parent) {
                            target = selected.parent;
                        }
                    break;
                    case 39: // RIGHT
                        evt.preventDefault();
                        evt.stopPropagation();
                        if (selected.children) {
                            if (!selected.treeList.container.hasClass("expanded")) {
                                selected.treeList.expand()
                            }
                        }
                    break
                    case 40: //DOWN
                        evt.preventDefault();
                        evt.stopPropagation();
                        if (selected.children && Array.isArray(selected.children) && selected.children.length > 0 && selected.treeList.container.hasClass("expanded")) {
                            target = selected.children[0];
                        } else {
                            target = that._getNextSibling(selected);
                            while (!target && selected.parent) {
                                selected = selected.parent;
                                target = that._getNextSibling(selected);
                            }
                        }
                    break
                }
                if (target) {
                    that.select(target);
                }
            });
            this._data = [];
            this._items = {};
            this._selected = new Set();
            this._topList = $('<ol class="red-ui-treeList-list">').css({
                position:'absolute',
                top:0,
                left:0,
                right:0,
                bottom:0
            }).appendTo(wrapper);

            var topListOptions = {
                addButton: false,
                scrollOnAdd: false,
                height: '100%',
                addItem: function(container,i,item) {
                    that._addSubtree(that._topList,container,item,0);
                }
            };
            if (this.options.header) {
                topListOptions.header = this.options.header;
            }
            if (this.options.rootSortable !== false && !!this.options.sortable) {
                topListOptions.sortable = this.options.sortable;
                topListOptions.connectWith = '.red-ui-treeList-sortable';
                this._topList.addClass('red-ui-treeList-sortable');
            }
            this._topList.editableList(topListOptions)


            if (this.options.data) {
                this.data(this.options.data);
            }
        },
        _getLastDescendant: function(item) {
            // Gets the last visible descendant of the item
            if (!item.children || !item.treeList.container.hasClass("expanded") || item.children.length === 0) {
                return item;
            }
            return this._getLastDescendant(item.children[item.children.length-1]);
        },
        _getPreviousSibling: function(item) {
            var candidates;
            if (!item.parent) {
                candidates = this._data;
            } else {
                candidates = item.parent.children;
            }
            var index = candidates.indexOf(item);
            if (index === 0) {
                return null;
            } else {
                return candidates[index-1];
            }
        },
        _getNextSibling: function(item) {
            var candidates;
            if (!item.parent) {
                candidates = this._data;
            } else {
                candidates = item.parent.children;
            }
            var index = candidates.indexOf(item);
            if (index === candidates.length - 1) {
                return null;
            } else {
                return candidates[index+1];
            }
        },
        _addChildren: function(container,parent,children,depth,onCompleteChildren) {
            var that = this;
            var subtree = $('<ol class="red-ui-treeList-list">').appendTo(container).editableList({
                connectWith: ".red-ui-treeList-sortable",
                sortable: that.options.sortable,
                addButton: false,
                scrollOnAdd: false,
                height: 'auto',
                addItem: function(container,i,item) {
                    that._addSubtree(subtree,container,item,depth+1);
                },
                sortItems: function(data) {
                    var children = [];
                    var reparented = [];
                    data.each(function() {
                        var child = $(this).data('data');
                        children.push(child);
                        var evt = that._fixDepths(parent,child);
                        if (evt) {
                            reparented.push(evt);
                        }
                    })
                    if (Array.isArray(parent.children)) {
                        parent.children = children;
                    }
                    reparented.forEach(function(evt) {
                        that._trigger("changeparent",null,evt);
                    });
                    that._trigger("sort",null,parent);
                },
                filter: parent.treeList.childFilter
            });
            if (!!that.options.sortable) {
                subtree.addClass('red-ui-treeList-sortable');
            }
            var sliceSize = 30;
            var index = 0;
            var addSlice = function() {
                var start = index;
                for (var i=0;i<sliceSize;i++) {
                    index = start+i;
                    if (index === children.length) {
                        setTimeout(function() {
                            if (onCompleteChildren) {
                                onCompleteChildren();
                            }
                        },10);
                        return;
                    }
                    children[index].parent = parent;
                    subtree.editableList('addItem',children[index])
                }
                index++;
                if (index < children.length) {
                    setTimeout(function() {
                        addSlice();
                    },10);
                }
            }
            addSlice();
            subtree.hide()
            return subtree;
        },
        _fixDepths: function(parent,child) {
            // If child has just been moved into parent in the UI
            // this will fix up the internal data structures to match.
            // The calling function must take care of getting child
            // into the parent.children array. The rest is up to us.
            var that = this;
            var reparentedEvent = null;
            if (child.parent !== parent) {
                reparented = true;
                var oldParent = child.parent;
                child.parent = parent;
                reparentedEvent = {
                    item: child,
                    old: oldParent,
                }
            }
            if (child.depth !== parent.depth+1) {
                child.depth = parent.depth+1;
                var labelPaddingWidth = ((child.gutter?child.gutter.width()+2:0)+(child.depth*20));
                child.treeList.labelPadding.width(labelPaddingWidth+'px');
                if (child.element) {
                    $(child.element).css({
                        width: "calc(100% - "+(labelPaddingWidth+20+(child.icon?20:0))+"px)"
                    })
                }
                // This corrects all child item depths
                if (child.children && Array.isArray(child.children)) {
                    child.children.forEach(function(item) {
                        that._fixDepths(child,item);
                    })
                }
            }
            return reparentedEvent;
        },
        _initItem: function(item,depth) {
            if (item.treeList) {
                return;
            }
            var that = this;
            this._items[item.id] = item;
            item.treeList = {};
            item.depth = depth;
            item.treeList.remove = function(detach) {
                if (item.treeList.parentList) {
                    item.treeList.parentList.editableList('removeItem',item,detach);
                }
                if (item.parent) {
                    var index = item.parent.children.indexOf(item);
                    item.parent.children.splice(index,1)
                    that._trigger("sort",null,item.parent);
                }
                that._selected.delete(item);
                delete item.treeList;
                delete that._items[item.id];
            }
            item.treeList.insertChildAt = function(newItem,position,select) {
                newItem.parent = item;
                item.children.splice(position,0,newItem);
                var processChildren = function(parent,i) {
                    that._initItem(i,parent.depth+1)
                    i.parent = parent;
                    if (i.children && typeof i.children !== 'function') {
                        i.children.forEach(function(item) {
                            processChildren(i, item, parent.depth+2)
                        });
                    }
                }
                processChildren(item,newItem);

                if (!item.deferBuild && item.treeList.childList) {
                    item.treeList.childList.editableList('insertItemAt',newItem,position)
                    if (select) {
                        setTimeout(function() {
                            that.select(newItem)
                        },100);
                    }
                    that._trigger("sort",null,item);

                    if (that.activeFilter) {
                        that.filter(that.activeFilter);
                    }
                }
            }
            item.treeList.addChild = function(newItem,select) {
                item.treeList.insertChildAt(newItem,item.children.length,select);
            }
            item.treeList.expand = function(done) {
                if (!item.children) {
                    if (done) { done(false) }
                    return;
                }
                if (!item.treeList.container) {
                    item.expanded = true;
                    if (done) { done(false) }
                    return;
                }
                var container = item.treeList.container;
                if (container.hasClass("expanded")) {
                    if (done) { done(false) }
                    return;
                }

                if (!container.hasClass("built") && (item.deferBuild || typeof item.children === 'function')) {
                    container.addClass('built');
                    var childrenAdded = false;
                    var spinner;
                    var startTime = 0;
                    var started = Date.now();
                    var completeBuild = function(children) {
                        childrenAdded = true;
                        item.treeList.childList = that._addChildren(container,item,children,depth, function() {
                            if (done) { done(true) }
                            that._trigger("childrenloaded",null,item)
                        });
                        var delta = Date.now() - startTime;
                        if (delta < 400) {
                            setTimeout(function() {
                                item.treeList.childList.slideDown('fast');
                                if (spinner) {
                                    spinner.remove();
                                }
                            },400-delta);
                        } else {
                            item.treeList.childList.slideDown('fast');
                            if (spinner) {
                                spinner.remove();
                            }
                        }
                        item.expanded = true;
                    }
                    if (typeof item.children === 'function') {
                        item.children(completeBuild,item);
                    } else {
                        delete item.deferBuild;
                        completeBuild(item.children);
                    }
                    if (!childrenAdded) {
                        startTime = Date.now();
                        spinner = $('<div class="red-ui-treeList-spinner">').css({
                            "background-position": (35+depth*20)+'px 50%'
                        }).appendTo(container);
                    }

                } else {
                    if (that._loadingData || item.children.length > 20) {
                        item.treeList.childList.show();
                    } else {
                        item.treeList.childList.slideDown('fast');
                    }
                    item.expanded = true;
                    if (done) { done(!that._loadingData) }
                }
                container.addClass("expanded");
            }
            item.treeList.collapse = function() {
                if (!item.children) {
                    return;
                }
                item.expanded = false;
                if (item.treeList.container) {
                    if (item.children.length < 20) {
                        item.treeList.childList.slideUp('fast');
                    } else {
                        item.treeList.childList.hide();
                    }
                    item.treeList.container.removeClass("expanded");
                }
            }
            item.treeList.sortChildren = function(sortFunc) {
                if (!item.children) {
                    return;
                }
                item.children.sort(sortFunc);
                if (item.treeList.childList) {
                    // Do a one-off sort of the list, which means calling sort twice:
                    // 1. first with the desired sort function
                    item.treeList.childList.editableList('sort',sortFunc);
                    // 2. and then with null to remove it
                    item.treeList.childList.editableList('sort',null);
                }
            }
            item.treeList.replaceElement = function (element) {
                if (item.element) {
                    if (item.treeList.container) {
                        $(item.element).remove();
                        $(element).appendTo(item.treeList.label);
                        var labelPaddingWidth = (item.gutter?item.gutter.width()+2:0)+(item.depth*20);
                        $(element).css({
                            width: "calc(100% - "+(labelPaddingWidth+20+(item.icon?20:0))+"px)"
                        })
                    }
                    item.element = element;
                }
            }

            if (item.children && typeof item.children !== "function") {
                item.children.forEach(function(i) {
                    that._initItem(i,depth+1);
                })
            }
        },
        _addSubtree: function(parentList, container, item, depth) {
            var that = this;
            this._initItem(item,depth);
            // item.treeList = {};
            // item.treeList.depth = depth;
            item.treeList.container = container;

            item.treeList.parentList = parentList;

            var label = $("<div>",{class:"red-ui-treeList-label"});
            label.appendTo(container);
            item.treeList.label = label;
            if (item.class) {
                label.addClass(item.class);
            }
            if (item.gutter) {
                item.gutter.css({
                    position: 'absolute'
                }).appendTo(label)

            }
            var labelPaddingWidth = (item.gutter?item.gutter.width()+2:0)+(depth*20);
            item.treeList.labelPadding = $('<span>').css({
                display: "inline-block",
                width:  labelPaddingWidth+'px'
            }).appendTo(label);

            label.on('mouseover',function(e) { that._trigger('itemmouseover',e,item); })
            label.on('mouseout',function(e) { that._trigger('itemmouseout',e,item); })
            label.on('mouseenter',function(e) { that._trigger('itemmouseenter',e,item); })
            label.on('mouseleave',function(e) { that._trigger('itemmouseleave',e,item); })

            item.treeList.makeLeaf = function(detachChildElements) {
                if (!treeListIcon.children().length) {
                    // Already a leaf
                    return
                }
                if (detachChildElements && item.children) {
                    var detachChildren = function(item) {
                        if (item.children) {
                            item.children.forEach(function(child) {
                                if (child.element) {
                                    child.element.detach();
                                }
                                if (child.gutter) {
                                    child.gutter.detach();
                                }
                                detachChildren(child);
                            });
                        }
                    }
                    detachChildren(item);
                }
                treeListIcon.empty();
                if (!item.deferBuild) {
                    item.treeList.childList.remove();
                    delete item.treeList.childList;
                }
                label.off("click.red-ui-treeList-expand");
                treeListIcon.off("click.red-ui-treeList-expand");
                delete item.children;
                container.removeClass("expanded");
                delete item.expanded;
            }
            item.treeList.makeParent = function(children) {
                if (treeListIcon.children().length) {
                    // Already a parent because we've got the angle-right icon
                    return;
                }
                $('<i class="fa fa-angle-right" />').appendTo(treeListIcon);
                treeListIcon.on("click.red-ui-treeList-expand", function(e) {
                        e.stopPropagation();
                        e.preventDefault();
                        if (container.hasClass("expanded")) {
                            item.treeList.collapse();
                        } else {
                            item.treeList.expand();
                        }
                    });
                // $('<span class="red-ui-treeList-icon"><i class="fa fa-folder-o" /></span>').appendTo(label);
                label.on("click.red-ui-treeList-expand", function(e) {
                    if (container.hasClass("expanded")) {
                        if (item.hasOwnProperty('selected') || label.hasClass("selected")) {
                            item.treeList.collapse();
                        }
                    } else {
                        item.treeList.expand();
                    }
                })
                if (!item.children) {
                    item.children = children||[];
                    item.treeList.childList = that._addChildren(container,item,item.children,depth);
                }
            }

            var treeListIcon = $('<span class="red-ui-treeList-icon"></span>').appendTo(label);
            if (item.children) {
                item.treeList.makeParent();
            }

            if (item.checkbox) {
                var selectWrapper = $('<span class="red-ui-treeList-icon"></span>');
                var cb = $('<input class="red-ui-treeList-checkbox" type="checkbox">').prop('checked',item.selected).appendTo(selectWrapper);
                cb.on('click', function(e) {
                    e.stopPropagation();
                });
                cb.on('change', function(e) {
                    item.selected = this.checked;
                    if (item.selected) {
                        that._selected.add(item);
                    } else {
                        that._selected.delete(item);
                    }
                    label.toggleClass("selected",this.checked);
                    that._trigger("select",e,item);
                })
                if (!item.children) {
                    label.on("click", function(e) {
                        e.stopPropagation();
                        cb.trigger("click");
                    })
                }
                item.treeList.select = function(v) {
                    if (v !== item.selected) {
                        cb.trigger("click");
                    }
                }
                selectWrapper.appendTo(label)
            } else {
                label.on("click", function(e) {
                    if (!that.options.multi) {
                        that.clearSelection();
                    }
                    label.addClass("selected");
                    that._selected.add(item);

                    that._trigger("select",e,item)
                })
                label.on("dblclick", function(e) {
                    if (!item.children) {
                        that._trigger("confirm",e,item);
                    }
                })
                item.treeList.select = function(v) {
                    if (!that.options.multi) {
                        that.clearSelection();
                    }
                    label.toggleClass("selected",v);
                    if (v) {
                        that._selected.add(item);
                        that._trigger("select",null,item)
                    } else {
                        that._selected.delete(item);
                    }
                    that.reveal(item);
                }
            }
            label.toggleClass("selected",!!item.selected);
            if (item.selected) {
                that._selected.add(item);
            }
            if (item.icon) {
                if (typeof item.icon === "string") {
                    $('<span class="red-ui-treeList-icon"><i class="'+item.icon+'" /></span>').appendTo(label);
                } else {
                    $('<span class="red-ui-treeList-icon">').appendTo(label).append(item.icon);
                }
            }
            if (item.hasOwnProperty('label') || item.hasOwnProperty('sublabel')) {
                if (item.hasOwnProperty('label')) {
                    $('<span class="red-ui-treeList-label-text"></span>').text(item.label).appendTo(label);
                }
                if (item.hasOwnProperty('sublabel')) {
                    $('<span class="red-ui-treeList-sublabel-text"></span>').text(item.sublabel).appendTo(label);
                }

            } else if (item.element) {
                $(item.element).appendTo(label);
                $(item.element).css({
                    width: "calc(100% - "+(labelPaddingWidth+20+(item.icon?20:0))+"px)"
                })
            }
            if (item.children) {
                if (Array.isArray(item.children) && !item.deferBuild) {
                    item.treeList.childList = that._addChildren(container,item,item.children,depth);
                }
                if (item.expanded) {
                    item.treeList.expand();
                }
            }
            // label.appendTo(container);
        },
        empty: function() {
            this._topList.editableList('empty');
        },
        data: function(items) {
            var that = this;
            if (items !== undefined) {
                this._data = items;
                this._items = {};
                this._topList.editableList('empty');
                this._loadingData = true;
                for (var i=0; i<items.length;i++) {
                    this._topList.editableList('addItem',items[i]);
                }
                setTimeout(function() {
                    delete that._loadingData;
                },200);
                this._trigger("select")

            } else {
                return this._data;
            }
        },
        show: function(item, done) {
            if (typeof item === "string") {
                item = this._items[item]
            }
            if (!item) {
                return;
            }
            var that = this;
            var stack = [];
            var i = item;
            while(i) {
                stack.unshift(i);
                i = i.parent;
            }
            var isOpening = false;
            var handleStack = function(opening) {
                isOpening = isOpening ||opening
                var item = stack.shift();
                if (stack.length === 0) {
                    setTimeout(function() {
                        that.reveal(item);
                        if (done) { done(); }
                    },isOpening?200:0);
                } else {
                    item.treeList.expand(handleStack)
                }
            }
            handleStack();
        },
        reveal: function(item) {
            if (typeof item === "string") {
                item = this._items[item]
            }
            if (!item) {
                return;
            }
            var listOffset = this._topList.offset().top;
            var itemOffset = item.treeList.label.offset().top;
            var scrollTop = this._topList.parent().scrollTop();
            itemOffset -= listOffset+scrollTop;
            var treeHeight = this._topList.parent().height();
            var itemHeight = item.treeList.label.outerHeight();
            if (itemOffset < itemHeight/2) {
                this._topList.parent().scrollTop(scrollTop+itemOffset-itemHeight/2-itemHeight)
            } else if (itemOffset+itemHeight > treeHeight) {
                this._topList.parent().scrollTop(scrollTop+((itemOffset+2.5*itemHeight)-treeHeight));
            }
        },
        select: function(item, triggerEvent, deselectExisting) {
            var that = this;
            if (!this.options.multi && deselectExisting !== false) {
                this.clearSelection();
            }
            if (Array.isArray(item)) {
                item.forEach(function(i) {
                    that.select(i,triggerEvent,false);
                })
                return;
            }
            if (typeof item === "string") {
                item = this._items[item]
            }
            if (!item) {
                return;
            }
            // this.show(item.id);
            item.selected = true;
            this._selected.add(item);

            if (item.treeList.label) {
                item.treeList.label.addClass("selected");
            }
            if (triggerEvent !== false) {
                this._trigger("select",null,item)
            }
        },
        clearSelection: function() {
            this._selected.forEach(function(item) {
                item.selected = false;
                if (item.treeList.label) {
                    item.treeList.label.removeClass("selected")
                }
            });
            this._selected.clear();
        },
        selected: function() {
            var selected = [];
            this._selected.forEach(function(item) {
                selected.push(item);
            })
            if (this.options.multi) {
                return selected;
            }
            if (selected.length) {
                return selected[0]
            } else {
                // TODO: This may be a bug.. it causes the call to return itself
                // not undefined.
                return undefined;
            }
        },
        filter: function(filterFunc) {
            this.activeFilter = filterFunc;
            var totalCount = 0;
            var filter = function(item) {
                var matchCount = 0;
                if (filterFunc && filterFunc(item)) {
                    matchCount++;
                    totalCount++;
                }
                var childCount = 0;
                if (item.children && typeof item.children !== "function") {
                    if (item.treeList.childList) {
                        childCount = item.treeList.childList.editableList('filter', filter);
                    } else {
                        item.treeList.childFilter = filter;
                        if (filterFunc) {
                            item.children.forEach(function(i) {
                                if (filter(i)) {
                                    childCount++;
                                }
                            })

                        }
                    }
                    matchCount += childCount;
                    if (filterFunc && childCount > 0) {
                        setTimeout(function() {
                            item.treeList.expand();
                        },10);
                    }
                }
                if (!filterFunc) {
                    totalCount++;
                    return true
                }
                return matchCount > 0
            }
            this._topList.editableList('filter', filter);
            return totalCount;
        },
        get: function(id) {
            return this._items[id] || null;
        }
    });

})(jQuery);
