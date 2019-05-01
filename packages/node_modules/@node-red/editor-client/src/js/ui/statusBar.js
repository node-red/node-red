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

 /*!
 RED.statusBar.add({
     id: "widget-identifier",
     align: "left|right",
     element: widgetElement
 })
*/

RED.statusBar = (function() {

    var widgets = {};
    var leftBucket;
    var rightBucket;

    function addWidget(options) {
        widgets[options.id] = options;
        var el = $('<span class="red-ui-statusbar-widget"></span>');
        options.element.appendTo(el);
        if (options.align === 'left') {
            leftBucket.append(el);
        } else if (options.align === 'right') {
            rightBucket.prepend(el);
        }
    }

    return {
        init: function() {
            leftBucket = $('<span class="red-ui-statusbar-bucket red-ui-statusbar-bucket-left">').appendTo("#red-ui-workspace-footer");
            rightBucket = $('<span class="red-ui-statusbar-bucket red-ui-statusbar-bucket-right">').appendTo("#red-ui-workspace-footer");
        },
        add: addWidget
    }

})();
