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

module.exports = function(RED) {
    "use strict";
    var Notify = require("fs.notify");
    var fs = require("fs");
    var sep = require("path").sep;
    var path = require("path");

    var getAllDirs = function (dir, filelist) {
        filelist = filelist || [];
        fs.readdirSync(dir).forEach(file => {
            if (fs.statSync(path.join(dir, file)).isDirectory() ) {
                filelist.push(path.join(dir, file));
                getAllDirs(path.join(dir, file), filelist);
            }
        });
        return filelist;
    }

    function WatchNode(n) {
        RED.nodes.createNode(this,n);

        this.recursive = n.recursive || false;
        this.files = (n.files || "").split(",");
        for (var f=0; f < this.files.length; f++) {
            this.files[f] = this.files[f].trim();
        }
        this.p = (this.files.length === 1) ? this.files[0] : JSON.stringify(this.files);
        var node = this;

        if (node.recursive) {
            for (var fi in node.files) {
                if (node.files.hasOwnProperty(fi)) {
                    node.files = node.files.concat(getAllDirs( node.files[fi]));
                }
            }
        }

        var notifications = new Notify(node.files);
        notifications.on('change', function (file, event, path) {
            var stat;
            try {
                if (fs.statSync(path).isDirectory()) { path = path + sep + file; }
                stat = fs.statSync(path);
            } catch(e) { }
            var type = "none";
            var msg = { payload:path, topic:node.p, file:file };
            if (stat) {
                if (stat.isFile()) { type = "file"; msg.size = stat.size; }
                else if (stat.isBlockDevice()) { type = "blockdevice"; }
                else if (stat.isCharacterDevice()) { type = "characterdevice"; }
                else if (stat.isSocket()) { type = "socket"; }
                else if (stat.isFIFO()) { type = "fifo"; }
                else if (stat.isDirectory()) {
                    type = "directory";
                    if (node.recursive) {
                        notifications.add([path]);
                        notifications.add(getAllDirs(path));
                    }
                }
                else { type = "n/a"; }
            }
            msg.type = type;
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
