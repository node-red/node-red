/**
 * Copyright 2013,2014 IBM Corp.
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
    var util = require('util');
    var nodemailer = require("nodemailer");
    var Imap = null;
    try {
        Imap = require('imap');
    } catch (e) {
        util.log("[61-email.js] - imap npm not installed - no inbound email available");
    }

    //console.log(nodemailer.Transport.transports.SMTP.wellKnownHosts);

    try { var globalkeys = RED.settings.email || require(process.env.NODE_RED_HOME+"/../emailkeys.js"); }
    catch(err) { }

    function EmailNode(n) {
        RED.nodes.createNode(this,n);
        this.topic = n.topic;
        this.name = n.name;
        this.outserver = n.server;
        this.outport = n.port;
        var flag = false;
        var credentials = RED.nodes.getCredentials(n.id);
        if ((credentials) && (credentials.hasOwnProperty("userid"))) { this.userid = credentials.userid; }
        else {
            if (globalkeys) { this.userid = globalkeys.user; flag = true; }
            else { this.error("No e-mail userid set"); }
        }
        if ((credentials) && (credentials.hasOwnProperty("password"))) { this.password = credentials.password; }
        else {
            if (globalkeys) { this.password = globalkeys.pass; flag = true; }
            else { this.error("No e-mail password set"); }
        }
        if (flag) { RED.nodes.addCredentials(n.id,{userid:this.userid, password:this.password, global:true}); }
        var node = this;

        var smtpTransport = nodemailer.createTransport("SMTP",{
            //service: emailkey.service,
            // {
            //transport: 'SMTP',
            host: node.outserver,
            port: node.outport,
            requiresAuth: true,
            secureConnection: true,
            //domains: [ 'gmail.com', 'googlemail.com' ],
            //},
            auth: {
                user: node.userid,
                pass: node.password
            }
        });

        this.on("input", function(msg) {
            if (msg != null) {
                node.status({fill:"blue",shape:"dot",text:"sending"});
                if (smtpTransport) {
                    smtpTransport.sendMail({
                        from: node.userid, // sender address
                        to: node.name, // comma separated list of receivers
                        subject: msg.topic, // subject line
                        text: msg.payload // plaintext body
                    }, function(error, response) {
                        if (error) {
                            node.error(error);
                            node.status({fill:"red",shape:"ring",text:"post error"});
                        } else {
                            node.log("Message sent: " + response.message);
                            node.status({});
                        }
                    });
                }
                else { node.warn("No Email credentials found. See info panel."); }
            }
        });
    }
    RED.nodes.registerType("e-mail",EmailNode);

    function EmailInNode(n) {
        RED.nodes.createNode(this,n);
        this.name = n.name;
        this.repeat = n.repeat * 1000 || 300000;
        this.inserver = n.server || emailkey.server || "imap.gmail.com";
        this.inport = n.port || emailkey.port || "993";
        var flag = false;
        var credentials = RED.nodes.getCredentials(n.id);
        if ((credentials) && (credentials.hasOwnProperty("userid"))) { this.userid = credentials.userid; }
        else {
            if (globalkeys) { this.userid = globalkeys.user; flag = true; }
            else { this.error("No e-mail userid set"); }
        }
        if ((credentials) && (credentials.hasOwnProperty("password"))) { this.password = credentials.password; }
        else {
            if (globalkeys) { this.password = globalkeys.pass; flag = true; }
            else { this.error("No e-mail password set"); }
        }
        if (flag) { RED.nodes.addCredentials(n.id,{userid:this.userid, password:this.password, global:true}); }
        var node = this;
        this.interval_id = null;
        var oldmail = {};

        var imap = new Imap({
            user: node.userid,
            password: node.password,
            host: node.inserver,
            port: node.inport,
            tls: true,
            tlsOptions: { rejectUnauthorized: false },
            connTimeout: node.repeat,
            authTimeout: node.repeat
        });

        if (!isNaN(this.repeat) && this.repeat > 0) {
            node.log("repeat = "+this.repeat);
            this.interval_id = setInterval( function() {
                node.emit("input",{});
            }, this.repeat );
        }

        this.on("input", function(msg) {
            imap.once('ready', function() {
                node.status({fill:"blue",shape:"dot",text:"fetching"});
                var pay = {};
                imap.openBox('INBOX', true, function(err, box) {
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
                            node.status({fill:"red",shape:"ring",text:"fetch error"});
                        });
                        f.on('end', function() {
                            if (JSON.stringify(pay) !== oldmail) {
                                node.send(pay);
                                oldmail = JSON.stringify(pay);
                                node.log('received new email: '+pay.topic);
                            }
                            else { node.log('duplicate not sent: '+pay.topic); }
                            //node.status({fill:"green",shape:"dot",text:"ok"});
                            node.status({});
                            imap.end();
                        });
                    }
                    else {
                        node.log("you have achieved inbox zero");
                        //node.status({fill:"green",shape:"dot",text:"ok"});
                        node.status({});
                        imap.end();
                    }
                });
            });
            node.status({fill:"grey",shape:"dot",text:"connecting"});
            imap.connect();
        });

        imap.on('error', function(err) {
            node.log(err);
            node.status({fill:"red",shape:"ring",text:"connect error"});
        });

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
    if (Imap != null) {
        RED.nodes.registerType("e-mail in",EmailInNode);
    }

    var querystring = require('querystring');

    RED.httpAdmin.get('/email/global',function(req,res) {
        res.send(JSON.stringify({hasToken:!(globalkeys && globalkeys.userid && globalkeys.password)}));
    });

    RED.httpAdmin.get('/email/:id',function(req,res) {
        var credentials = RED.nodes.getCredentials(req.params.id);
        if (credentials) {
            res.send(JSON.stringify({userid:credentials.userid,hasPassword:(credentials.password&&credentials.password!="")}));
        }
        else if (globalkeys && globalkeys.user && globalkeys.pass) {
            RED.nodes.addCredentials(req.params.id,{userid:globalkeys.user, password:globalkeys.pass, global:true});
            credentials = RED.nodes.getCredentials(req.params.id);
            res.send(JSON.stringify({userid:credentials.userid,global:credentials.global,hasPassword:(credentials.password&&credentials.password!="")}));
        }
        else {
            res.send(JSON.stringify({}));
        }
    });

    RED.httpAdmin.delete('/email/:id',function(req,res) {
        RED.nodes.deleteCredentials(req.params.id);
        res.send(200);
    });

    RED.httpAdmin.post('/email/:id',function(req,res) {
        var body = "";
        req.on('data', function(chunk) {
            body+=chunk;
        });
        req.on('end', function(){
            var newCreds = querystring.parse(body);
            var credentials = RED.nodes.getCredentials(req.params.id)||{};
            if (newCreds.userid == null || newCreds.userid == "") {
                delete credentials.userid;
            } else {
                credentials.userid = newCreds.userid;
            }
            if (newCreds.password == "") {
                delete credentials.password;
            } else {
                credentials.password = newCreds.password||credentials.password;
            }
            RED.nodes.addCredentials(req.params.id,credentials);
            res.send(200);
        });
    });
}
