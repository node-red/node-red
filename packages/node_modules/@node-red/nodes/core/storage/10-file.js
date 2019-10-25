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
    var fs = require("fs-extra");
    var os = require("os");
    var path = require("path");
    var iconv = require("iconv-lite")

    function encode(data, enc) {
        if (enc !== "none") {
            return iconv.encode(data, enc);
        }
        return Buffer.from(data);
    }

    function decode(data, enc) {
        if (enc !== "none") {
            return iconv.decode(data, enc);
        }
        return data.toString();
    }

    function FileNode(n) {
        // Write/delete a file
        RED.nodes.createNode(this,n);
        this.filename = n.filename;
        this.appendNewline = n.appendNewline;
        this.overwriteFile = n.overwriteFile.toString();
        this.createDir = n.createDir || false;
        this.encoding = n.encoding || "none";
        var node = this;
        node.wstream = null;
        node.msgQueue = [];
        node.closing = false;
        node.closeCallback = null;

        function processMsg(msg,nodeSend, done) {
            var filename = node.filename || msg.filename || "";
            if ((!node.filename) && (!node.tout)) {
                node.tout = setTimeout(function() {
                    node.status({fill:"grey",shape:"dot",text:filename});
                    clearTimeout(node.tout);
                    node.tout = null;
                },333);
            }
            if (filename === "") {
                node.warn(RED._("file.errors.nofilename"));
                done();
            } else if (node.overwriteFile === "delete") {
                fs.unlink(filename, function (err) {
                    if (err) {
                        node.error(RED._("file.errors.deletefail",{error:err.toString()}),msg);
                    } else {
                        if (RED.settings.verbose) {
                            node.log(RED._("file.status.deletedfile",{file:filename}));
                        }
                        nodeSend(msg);
                    }
                    done();
                });
            } else if (msg.hasOwnProperty("payload") && (typeof msg.payload !== "undefined")) {
                var dir = path.dirname(filename);
                if (node.createDir) {
                    try {
                        fs.ensureDirSync(dir);
                    } catch(err) {
                        node.error(RED._("file.errors.createfail",{error:err.toString()}),msg);
                        done();
                        return;
                    }
                }

                var data = msg.payload;
                if ((typeof data === "object") && (!Buffer.isBuffer(data))) {
                    data = JSON.stringify(data);
                }
                if (typeof data === "boolean") { data = data.toString(); }
                if (typeof data === "number") { data = data.toString(); }
                if ((node.appendNewline) && (!Buffer.isBuffer(data))) { data += os.EOL; }
                var buf = encode(data, node.encoding);
                if (node.overwriteFile === "true") {
                    var wstream = fs.createWriteStream(filename, { encoding:'binary', flags:'w', autoClose:true });
                    node.wstream = wstream;
                    wstream.on("error", function(err) {
                        node.error(RED._("file.errors.writefail",{error:err.toString()}),msg);
                        done();
                    });
                    wstream.on("open", function() {
                        wstream.end(buf, function() {
                            nodeSend(msg);
                            done();
                        });
                    })
                    return;
                }
                else {
                    // Append mode
                    var recreateStream = !node.wstream || !node.filename;
                    if (node.wstream && node.wstreamIno) {
                        // There is already a stream open and we have the inode
                        // of the file. Check the file hasn't been deleted
                        // or deleted and recreated.
                        try {
                            var stat = fs.statSync(filename);
                            // File exists - check the inode matches
                            if (stat.ino !== node.wstreamIno) {
                                // The file has been recreated. Close the current
                                // stream and recreate it
                                recreateStream = true;
                                node.wstream.end();
                                delete node.wstream;
                                delete node.wstreamIno;
                            }
                        } catch(err) {
                            // File does not exist
                            recreateStream = true;
                            node.wstream.end();
                            delete node.wstream;
                            delete node.wstreamIno;
                        }
                    }
                    if (recreateStream) {
                        node.wstream = fs.createWriteStream(filename, { encoding:'binary', flags:'a', autoClose:true });
                        node.wstream.on("open", function(fd) {
                            try {
                                var stat = fs.statSync(filename);
                                node.wstreamIno = stat.ino;
                            } catch(err) {
                            }
                        });
                        node.wstream.on("error", function(err) {
                            node.error(RED._("file.errors.appendfail",{error:err.toString()}),msg);
                            done();
                        });
                    }
                    if (node.filename) {
                        // Static filename - write and reuse the stream next time
                        node.wstream.write(buf, function() {
                            nodeSend(msg);
                            done();
                        });
                    } else {
                        // Dynamic filename - write and close the stream
                        node.wstream.end(buf, function() {
                            nodeSend(msg);
                            delete node.wstream;
                            delete node.wstreamIno;
                            done();
                        });
                    }
                }
            }
            else {
                done();
            }
        }

        function processQueue(queue) {
            var event = queue[0];
            processMsg(event.msg, event.send, function() {
                event.done();
                queue.shift();
                if (queue.length > 0) {
                    processQueue(queue);
                }
                else if (node.closing) {
                    closeNode();
                }
            });
        }

        this.on("input", function(msg,nodeSend,nodeDone) {
            var msgQueue = node.msgQueue;
            msgQueue.push({
                msg: msg,
                send: nodeSend,
                done: nodeDone
            })
            if (msgQueue.length > 1) {
                // pending write exists
                return;
            }
            try {
                processQueue(msgQueue);
            }
            catch (e) {
                node.msgQueue = [];
                if (node.closing) {
                    closeNode();
                }
                throw e;
            }
        });

        function closeNode() {
            if (node.wstream) { node.wstream.end(); }
            if (node.tout) { clearTimeout(node.tout); }
            node.status({});
            var cb = node.closeCallback;
            node.closeCallback = null;
            node.closing = false;
            if (cb) {
                cb();
            }
        }

        this.on('close', function(done) {
            if (node.closing) {
                // already closing
                return;
            }
            node.closing = true;
            if (done) {
                node.closeCallback = done;
            }
            if (node.msgQueue.length > 0) {
                // close after queue processed
                return;
            }
            else {
                closeNode();
            }
        });
    }
    RED.nodes.registerType("file",FileNode);


    function FileInNode(n) {
        // Read a file
        RED.nodes.createNode(this,n);
        this.filename = n.filename;
        this.format = n.format;
        this.chunk = false;
        this.encoding = n.encoding || "none";
        if (n.sendError === undefined) {
            this.sendError = true;
        } else {
            this.sendError = n.sendError;
        }
        if (this.format === "lines") { this.chunk = true; }
        if (this.format === "stream") { this.chunk = true; }
        var node = this;

        this.on("input",function(msg, nodeSend, nodeDone) {
            var filename = (node.filename || msg.filename || "").replace(/\t|\r|\n/g,'');
            if (!node.filename) {
                node.status({fill:"grey",shape:"dot",text:filename});
            }
            if (filename === "") {
                node.warn(RED._("file.errors.nofilename"));
                nodeDone();
            }
            else {
                msg.filename = filename;
                var lines = Buffer.from([]);
                var spare = "";
                var count = 0;
                var type = "buffer";
                var ch = "";
                if (node.format === "lines") {
                    ch = "\n";
                    type = "string";
                }
                var hwm;
                var getout = false;

                var rs = fs.createReadStream(filename)
                    .on('readable', function () {
                        var chunk;
                        var hwm = rs._readableState.highWaterMark;
                        while (null !== (chunk = rs.read())) {
                            if (node.chunk === true) {
                                getout = true;
                                if (node.format === "lines") {
                                    spare += decode(chunk, node.encoding);
                                    var bits = spare.split("\n");
                                    for (var i=0; i < bits.length - 1; i++) {
                                        var m = {
                                            payload:bits[i],
                                            topic:msg.topic,
                                            filename:msg.filename,
                                            parts:{index:count, ch:ch, type:type, id:msg._msgid}
                                        }
                                        count += 1;
                                        nodeSend(m);
                                    }
                                    spare = bits[i];
                                }
                                if (node.format === "stream") {
                                    var m = {
                                        payload:chunk,
                                        topic:msg.topic,
                                        filename:msg.filename,
                                        parts:{index:count, ch:ch, type:type, id:msg._msgid}
                                    }
                                    count += 1;
                                    if (chunk.length < hwm) { // last chunk is smaller that high water mark = eof
                                        getout = false;
                                        m.parts.count = count;
                                    }
                                    nodeSend(m);
                                }
                            }
                            else {
                                lines = Buffer.concat([lines,chunk]);
                            }
                        }
                    })
                    .on('error', function(err) {
                        node.error(err, msg);
                        if (node.sendError) {
                            var sendMessage = RED.util.cloneMessage(msg);
                            delete sendMessage.payload;
                            sendMessage.error = err;
                            nodeSend(sendMessage);
                        }
                        nodeDone();
                    })
                    .on('end', function() {
                        if (node.chunk === false) {
                            if (node.format === "utf8") {
                                msg.payload = decode(lines, node.encoding);
                            }
                            else { msg.payload = lines; }
                            nodeSend(msg);
                        }
                        else if (node.format === "lines") {
                            var m = { payload: spare,
                                      topic:msg.topic,
                                      parts: {
                                          index: count,
                                          count: count+1,
                                          ch: ch,
                                          type: type,
                                          id: msg._msgid
                                      }
                                    };
                            nodeSend(m);
                        }
                        else if (getout) { // last chunk same size as high water mark - have to send empty extra packet.
                            var m = { parts:{index:count, count:count, ch:ch, type:type, id:msg._msgid} };
                            nodeSend(m);
                        }
                        nodeDone();
                    });
            }
        });
        this.on('close', function() {
            node.status({});
        });
    }
    RED.nodes.registerType("file in",FileInNode);
}
