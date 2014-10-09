/**
 * Copyright 2013, 2014 IBM Corp.
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
    var fs = require("fs");

    function FileNode(n) {
        RED.nodes.createNode(this,n);
        this.filename = n.filename || "";
        this.appendNewline = n.appendNewline;
        this.overwriteFile = n.overwriteFile;
        var node = this;
        this.on("input",function(msg) {
            var filename = msg.filename || this.filename;
            if (filename === "") {
                node.warn('No filename specified');
            } else if (msg.hasOwnProperty('delete')) {
                fs.unlink(filename, function (err) {
                    if (err) { node.warn('Failed to delete file : '+err); }
                    //console.log('Deleted file",filename);
                });
            } else if (typeof msg.payload != "undefined") {
                var data = msg.payload;
                if (typeof data === "object") {
                    if (!Buffer.isBuffer(data)) {
                        data = JSON.stringify(data);
                    }
                }
                if (typeof data === "boolean") { data = data.toString(); }
                if ((this.appendNewline)&&(!Buffer.isBuffer(data))) { data += "\n"; }
                if (this.overwriteFile) {
                    // using "binary" not {encoding:"binary"} to be 0.8 compatible for a while
                    fs.writeFile(filename, data, "binary", function (err) {
                        if (err) { node.warn('Failed to write to file : '+err); }
                        //console.log('Message written to file',filename);
                    });
                }
                else {
                    // using "binary" not {encoding:"binary"} to be 0.8 compatible for a while
                    fs.appendFile(filename, data, "binary", function (err) {
                        if (err) { node.warn('Failed to append to file : '+err); }
                        //console.log('Message appended to file',filename);
                    });
                }
            }
        });
    }
    RED.nodes.registerType("file",FileNode);

    function FileInNode(n) {
        RED.nodes.createNode(this,n);

        this.filename = n.filename || "";
        this.format = n.format;
        var node = this;
        var options = {};
        if (this.format) {
            options['encoding'] = this.format;
        }
        this.on("input",function(msg) {
            var filename = msg.filename || this.filename;
            if (filename === "") {
                node.warn('No filename specified');
            } else {
                fs.readFile(filename,options,function(err,data) {
                    if (err) {
                        node.warn(err);
                        msg.error = err;
                    } else {
                        msg.filename = filename;
                        msg.payload = data;
                    }
                    node.send(msg);
                });
            }
        });
    }
    RED.nodes.registerType("file in",FileInNode);
}
