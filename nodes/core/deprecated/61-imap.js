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

var RED = require(process.env.NODE_RED_HOME+"/red/red");
var Imap = require('imap');
var util = require('util');

try {
    var emailkey = RED.settings.email || require(process.env.NODE_RED_HOME+"/../emailkeys.js");
} catch (err) {
    //util.log("[61-imap.js] Info : No Email credentials found.");
}

if (emailkey) {
    var imap = new Imap({
        user: emailkey.user,
        password: emailkey.pass,
        host: emailkey.server||"imap.gmail.com",
        port: emailkey.port||"993",
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
    });

    function openInbox(cb) {
        imap.openBox('INBOX', true, cb);
    }
}

function ImapNode(n) {
    RED.nodes.createNode(this,n);
    this.name = n.name;
    this.repeat = n.repeat * 1000 || 300000;
    var node = this;
    this.interval_id = null;
    var oldmail = {};

    if (!isNaN(this.repeat) && this.repeat > 0) {
        node.log("repeat = "+this.repeat);
        this.interval_id = setInterval( function() {
            node.emit("input",{});
        }, this.repeat );
    }

    this.on("input", function(msg) {
        if (imap) {
            imap.once('ready', function() {
                var pay = {};
                openInbox(function(err, box) {
                    if (box.messages.total > 0) {
                        var f = imap.seq.fetch(box.messages.total + ':*', { bodies: ['HEADER.FIELDS (FROM SUBJECT DATE)','TEXT'] });
                        f.on('message', function(msg, seqno) {
                            node.log('message: #'+ seqno);
                            var prefix = '(#' + seqno + ') ';
                            msg.on('body', function(stream, info) {
                                var buffer = '';
                                stream.on('data', function(chunk) {
                                    buffer += chunk.toString('utf8');
                                });
                                stream.on('end', function() {
                                    if (info.which !== 'TEXT') {
                                        pay.from = Imap.parseHeader(buffer).from[0];
                                        pay.topic = Imap.parseHeader(buffer).subject[0];
                                        pay.date = Imap.parseHeader(buffer).date[0];
                                    } else {
                                        var parts = buffer.split("Content-Type");
                                        for (var p in parts) {
                                            if (parts[p].indexOf("text/plain") >= 0) {
                                                pay.payload = parts[p].split("\n").slice(1,-2).join("\n").trim();
                                            }
                                            if (parts[p].indexOf("text/html") >= 0) {
                                                pay.html = parts[p].split("\n").slice(1,-2).join("\n").trim();
                                            }
                                        }
                                        //pay.body = buffer;
                                    }
                                });
                            });
                            msg.on('end', function() {
                                //node.log('Finished: '+prefix);
                            });
                        });
                        f.on('error', function(err) {
                            node.warn('fetch error: ' + err);
                        });
                        f.on('end', function() {
                            if (JSON.stringify(pay) !== oldmail) {
                                node.send(pay);
                                oldmail = JSON.stringify(pay);
                                node.log('sent new message: '+pay.topic);
                            }
                            else { node.log('duplicate not sent: '+pay.topic); }
                            imap.end();
                        });
                    }
                    else {
                        // node.log("you have achieved inbox zero");
                        imap.end();
                    }
                });
            });
            imap.connect();
        }
        else { node.warn("No Email credentials found. See info panel."); }
    });

    if (imap) {
        imap.on('error', function(err) {
            util.log(err);
        });
    }

    this.on("error", function(err) {
        node.log("error: ",err);
    });

    this.on("close", function() {
        if (this.interval_id != null) {
            clearInterval(this.interval_id);
        }
        if (imap) { imap.destroy(); }
    });

    node.emit("input",{});
}
RED.nodes.registerType("imap",ImapNode);
