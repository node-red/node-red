/**
 * Copyright 2013 IBM Corp.
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

module.exports = function(RED) {
    "use strict";
    var notify = require("fs.notify");
    var fs = require("fs");
    var sep = require("path").sep;

    function WatchNode(n) {
        RED.nodes.createNode(this,n);

        this.files = n.files.split(",");
        for (var f in this.files) {
            this.files[f] = this.files[f].trim();
        }
        this.p = (this.files.length == 1) ? this.files[0] : JSON.stringify(this.files);
        var node = this;

        var notifications = new notify(node.files);
        notifications.on('change', function (file, event, path) {
            try {
                if (fs.statSync(path).isDirectory()) { path = path + sep + file; }
            } catch(e) { }
            var msg = { payload: path, topic: node.p, file: file };
            node.send(msg);
        });

        notifications.on('error', function (error, path) {
            node.warn(error);
        });

        this.close = function() {
            notifications.close();
        }
    }
    RED.nodes.registerType("watch",WatchNode);
}
