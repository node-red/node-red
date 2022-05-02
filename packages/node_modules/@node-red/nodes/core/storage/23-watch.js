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
    const watch = require('node-watch')
    const fs = require("fs")
    const path = require("path")

    function WatchNode(n) {
        RED.nodes.createNode(this,n);

        this.recursive = n.recursive || false;
        this.files = (n.files || "").split(",");
        for (var f=0; f < this.files.length; f++) {
            this.files[f] = this.files[f].trim();
        }
        this.p = (this.files.length === 1) ? this.files[0] : JSON.stringify(this.files);
        const node = this;

        const watcher = watch(this.files, { recursive: this.recursive });

        watcher.on('change', function (event, fpath) {
            const file = path.basename(fpath)
            let stat;
            try {
                stat = fs.statSync(fpath);
            } catch(e) { }
            let type = "none";
            const msg = {
                payload:fpath,
                topic:node.p,
                file:file,
                filename:fpath,
                event: event
            };
            if (stat) {
                if (stat.isFile()) { type = "file"; msg.size = stat.size; }
                else if (stat.isBlockDevice()) { type = "blockdevice"; }
                else if (stat.isCharacterDevice()) { type = "characterdevice"; }
                else if (stat.isSocket()) { type = "socket"; }
                else if (stat.isFIFO()) { type = "fifo"; }
                else if (stat.isDirectory()) { type = "directory"; }
                else { type = "n/a"; }
            }
            msg.type = type;
            node.send(msg);
        });

        watcher.on('error', function (error) {
            const msg = { payload: "" };
            node.error(error,msg);
        });

        this.close = function() {
            watcher.close();
        }
    }
    RED.nodes.registerType("watch", WatchNode);
}
