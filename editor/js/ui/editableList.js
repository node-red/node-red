/**
 * Copyright 2016 IBM Corp.
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

            var addLabel = "foo";
            if (RED && RED._) {
                addLabel = RED._("editableList.add");
            }

            var addButton = $('<a href="#" class="editor-button editor-button-small" style="margin-top: 4px;"><i class="fa fa-plus"></i> '+addLabel+'</a>').appendTo(this.topContainer);
            addButton.click(function(evt) {
                evt.preventDefault();
                that.addItem({});
            });

            this.uiContainer.addClass("red-ui-editableList-container");

            this.uiHeight = this.element.height();

            var minHeight = this.element.css("minHeight");
            if (minHeight !== '0px') {
                this.uiContainer.css("minHeight",minHeight);
                this.element.css("minHeight",0);
            }

            if (this.options.sortable) {
                this.element.sortable({
                    axis: "y",
                    update: function( event, ui ) {
                        if (that.options.updateOrder) {
                            that.options.updateOrder(that.items());
                        }
                    },
                    handle:".red-ui-editableList-item-handle",
                    cursor: "move"
                });
            }

            this._resize();

            // this.menu = this._createMenu(this.types, function(v) { that.type(v) });
            // this.type(this.options.default||this.types[0].value);
        },
        _resize: function() {
            var currentFullHeight = this.topContainer.height();
            var innerHeight = this.uiContainer.height();
            var delta = currentFullHeight - innerHeight;
            this.uiContainer.height(this.uiHeight-delta);
            if (this.options.resize) {
                this.options.resize();
            }
            if (this.options.resizeItem) {
                var that = this;
                this.element.children().each(function(i) {
                    that.options.resizeItem($(this).find(".red-ui-editableList-item-content"));
                });
            }
        },
        _destroy: function() {
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
            var li = $('<li>').appendTo(this.element);
            li.data('data',data);
            var row = $('<div/>').addClass("red-ui-editableList-item-content").appendTo(li);
            if (this.options.sortable) {
                $('<i class="red-ui-editableList-item-handle fa fa-bars"></i>').appendTo(li);
                li.addClass("red-ui-editableList-item-sortable");
            }
            if (this.options.deletable) {
                var deleteButton = $('<a/>',{href:"#",class:"red-ui-editableList-item-delete editor-button editor-button-small"}).appendTo(li);
                $('<i/>',{class:"fa fa-remove"}).appendTo(deleteButton);
                li.addClass("red-ui-editableList-item-deletable");
                deleteButton.click(function() {
                    li.addClass("red-ui-editableList-item-deleting")
                    li.fadeOut(300, function() {
                        $(this).remove();
                        if (that.options.deleteItem) {
                            that.options.deleteItem(li.data('data'));
                        }
                    });
                });
            }
            if (this.options.addItem) {
                var index = that.element.children().length-1;
                setTimeout(function() {
                    that.options.addItem(row,index,data);
                },0);
            }
        },
        items: function() {
            return this.element.children().map(function(i) { return $(this).find(".red-ui-editableList-item-content"); });
        }
    });
})(jQuery);
