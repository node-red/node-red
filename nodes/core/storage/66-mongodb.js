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
    var mongo = require('mongodb');
    var MongoClient = mongo.MongoClient;

    function MongoNode(n) {
        RED.nodes.createNode(this,n);
        this.hostname = n.hostname;
        this.port = n.port;
        this.db = n.db;
        this.name = n.name;
        var credentials = RED.nodes.getCredentials(n.id);
        if (credentials) {
            this.username = credentials.user;
            this.password = credentials.password;
        }

        var url = "mongodb://";
        if (this.username && this.password) {
            url += this.username+":"+this.password+"@";
        }
        url += this.hostname+":"+this.port+"/"+this.db;

        this.url = url;
    }

    RED.nodes.registerType("mongodb",MongoNode);

    var querystring = require('querystring');

    RED.httpAdmin.get('/mongodb/:id',function(req,res) {
        var credentials = RED.nodes.getCredentials(req.params.id);
        if (credentials) {
            res.send(JSON.stringify({user:credentials.user,hasPassword:(credentials.password&&credentials.password!="")}));
        } else {
            res.send(JSON.stringify({}));
        }
    });

    RED.httpAdmin.delete('/mongodb/:id',function(req,res) {
        RED.nodes.deleteCredentials(req.params.id);
        res.send(200);
    });

    RED.httpAdmin.post('/mongodb/:id',function(req,res) {
        var body = "";
        req.on('data', function(chunk) {
            body+=chunk;
        });
        req.on('end', function(){
            var newCreds = querystring.parse(body);
            var credentials = RED.nodes.getCredentials(req.params.id)||{};
            if (newCreds.user == null || newCreds.user == "") {
                delete credentials.user;
            } else {
                credentials.user = newCreds.user;
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


    function MongoOutNode(n) {
        RED.nodes.createNode(this,n);
        this.collection = n.collection;
        this.mongodb = n.mongodb;
        this.payonly = n.payonly || false;
        this.operation = n.operation;
        this.mongoConfig = RED.nodes.getNode(this.mongodb);

        if (this.mongoConfig) {
            var node = this;
            MongoClient.connect(this.mongoConfig.url, function(err,db) {
                if (err) {
                    node.error(err);
                } else {
                    node.clientDb = db;
                    var coll = db.collection(node.collection);
                    node.on("input",function(msg) {
                        if (node.operation == "store") {
                            delete msg._topic;
                            if (node.payonly) {
                                if (typeof msg.payload !== "object") { msg.payload = {"payload":msg.payload}; }
                                coll.save(msg.payload,function(err,item){ if (err){node.error(err);} });
                            } else {
                                coll.save(msg,function(err,item){if (err){node.error(err);}});
                            }
                        }
                        else if (node.operation == "insert") {
                            delete msg._topic;
                            if (node.payonly) {
                                if (typeof msg.payload !== "object") { msg.payload = {"payload":msg.payload}; }
                                coll.insert(msg.payload,function(err,item){ if (err){node.error(err);} });
                            } else {
                                coll.insert(msg,function(err,item){if (err){node.error(err);}});
                            }
                        }
                        else if (node.operation == "update") {
                            delete msg._topic;
                            if (node.payonly) {
                                if (typeof msg.payload !== "object") { msg.payload = {"payload":msg.payload}; }
                                coll.update(msg.payload,function(err,item){ if (err){node.error(err);} });
                            } else {
                                coll.update(msg,function(err,item){if (err){node.error(err);}});
                            }
                        }
                        if (node.operation == "delete") {
                            coll.remove(msg.payload, {w:1}, function(err, items){ if (err) node.error(err); });
                        }
                    });
                }
            });
        } else {
            this.error("missing mongodb configuration");
        }

        this.on("close", function() {
            if (this.clientDb) {
                this.clientDb.close();
            }
        });
    }
    RED.nodes.registerType("mongodb out",MongoOutNode);


    function MongoInNode(n) {
        RED.nodes.createNode(this,n);
        this.collection = n.collection;
        this.mongodb = n.mongodb;
        this.mongoConfig = RED.nodes.getNode(this.mongodb);

        if (this.mongoConfig) {
            var node = this;
            MongoClient.connect(this.mongoConfig.url, function(err,db) {
                if (err) {
                    node.error(err);
                } else {
                    node.clientDb = db;
                    var coll = db.collection(node.collection);
                    node.on("input",function(msg) {
                        msg.projection = msg.projection || {};
                        coll.find(msg.payload,msg.projection).sort(msg.sort).limit(msg.limit).toArray(function(err, items) {
                            if (err) {
                                node.error(err);
                            } else {
                                msg.payload = items;
                                delete msg.projection;
                                delete msg.sort;
                                delete msg.limit;
                                node.send(msg);
                            }
                        });
                    });
                }
            });
        } else {
            this.error("missing mongodb configuration");
        }

        this.on("close", function() {
            if (this.clientDb) {
                this.clientDb.close();
            }
        });
    }
    RED.nodes.registerType("mongodb in",MongoInNode);
}
