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
    var Notify = require("fs.notify");
    var fs = require("fs");
    var sep = require("path").sep;

    function WatchNode(n) {
        RED.nodes.createNode(this,n);

        this.files = n.files.split(",");
        for (var f=0; f < this.files.length; f++) {
            this.files[f] = this.files[f].trim();
        }
        this.p = (this.files.length == 1) ? this.files[0] : JSON.stringify(this.files);
        var node = this;

        var notifications = new Notify(node.files);
        notifications.on('change', function (file, event, path) {
            var stat;
            try {
                if (fs.statSync(path).isDirectory()) { path = path + sep + file; }
                stat = fs.statSync(path);
            } catch(e) { }
            var type = "other";
            if (stat.isFile()) { type = "file"; }
            if (stat.isDirectory()) { type = "directory"; }
            if (stat.isBlockDevice()) { type = "blockdevice"; }
            if (stat.isCharacterDevice()) { type = "characterdevice"; }
            if (stat.isSocket()) { type = "socket"; }
            if (stat.isFIFO()) { type = "fifo"; }
            var msg = { payload:path, topic:node.p, file:file, type:type, size:stat.size };
            node.send(msg);
        });

        notifications.on('error', function (error, path) {
            var msg = { payload:path };
            node.error(error,msg);
        });

        this.close = function() {
            notifications.close();
        }
    }
    RED.nodes.registerType("watch",WatchNode);
}
