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
var mongo = require('mongodb');

function MongoNode(n) {
    RED.nodes.createNode(this,n);
    this.hostname = n.hostname;
    this.port = n.port;
    this.db = n.db;
    this.name = n.name;
}
RED.nodes.registerType("mongodb",MongoNode);


function MongoOutNode(n) {
    RED.nodes.createNode(this,n);
    this.collection = n.collection;
    this.mongodb = n.mongodb;
    this.payonly = n.payonly || false;
    this.operation = n.operation;
    this.mongoConfig = RED.nodes.getNode(this.mongodb);

    if (this.mongoConfig) {
        var node = this;
        this.clientDb = new mongo.Db(node.mongoConfig.db, new mongo.Server(node.mongoConfig.hostname, node.mongoConfig.port, {}), {w: 1});
        this.clientDb.open(function(err,cli) {
            if (err) { node.error(err); }
            else {
                node.clientDb.collection(node.collection,function(err,coll) {
                    if (err) { node.error(err); }
                    else {
                        node.on("input",function(msg) {
                            if (node.operation == "store") {
                                delete msg._topic;
                                if (node.payonly) {
                                    if (typeof msg.payload !== "object") { msg.payload = {"payload":msg.payload}; }
                                    coll.save(msg.payload,function(err,item){ if (err){node.error(err);} });
                                }
                                else coll.save(msg,function(err,item){if (err){node.error(err);}});
                            }
                            else if (node.operation == "insert") {
                                delete msg._topic;
                                if (node.payonly) {
                                    if (typeof msg.payload !== "object") { msg.payload = {"payload":msg.payload}; }
                                    coll.insert(msg.payload,function(err,item){ if (err){node.error(err);} });
                                }
                                else coll.insert(msg,function(err,item){if (err){node.error(err);}});
                            }
                            if (node.operation == "delete") {
                                coll.remove(msg.payload, {w:1}, function(err, items){ if (err) node.error(err); });
                            }
                        });
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
        this.clientDb = new mongo.Db(node.mongoConfig.db, new mongo.Server(node.mongoConfig.hostname, node.mongoConfig.port, {}), {w: 1});
        this.clientDb.open(function(err,cli) {
            if (err) { node.error(err); }
            else {
                node.clientDb.collection(node.collection,function(err,coll) {
                    if (err) { node.error(err); }
                    else {
                        node.on("input",function(msg) {
                            msg.projection = msg.projection || {};
                            coll.find(msg.payload,msg.projection).sort(msg.sort).limit(msg.limit).toArray(function(err, items) {
                                if (err) { node.error(err); }
                                msg.payload = items;
                                delete msg.projection;
                                delete msg.sort;
                                delete msg.limit;
                                node.send(msg);
                            });
                        });
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
RED.nodes.registerType("mongodb in",MongoInNode);
