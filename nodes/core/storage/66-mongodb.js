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
    var mongo = require('mongodb');
    var MongoClient = mongo.MongoClient;

    function MongoNode(n) {
        RED.nodes.createNode(this,n);
        this.hostname = n.hostname;
        this.port = n.port;
        this.db = n.db;
        this.name = n.name;

        var url = "mongodb://";
        if (this.credentials && this.credentials.user && this.credentials.password) {
            url += this.credentials.user+":"+this.credentials.password+"@";
        }
        url += this.hostname+":"+this.port+"/"+this.db;

        this.url = url;
    }

    RED.nodes.registerType("mongodb",MongoNode,{
        credentials: {
            user: {type:"text"},
            password: {type: "password"}
        }
    });

    function ensureValidSelectorObject(selector) {
        if (selector != null && (typeof selector != 'object' || Buffer.isBuffer(selector))) {
            return {};
        }
        return selector;
    }


    function MongoOutNode(n) {
        RED.nodes.createNode(this,n);
        this.collection = n.collection;
        this.mongodb = n.mongodb;
        this.payonly = n.payonly || false;
        this.upsert = n.upsert || false;
        this.multi = n.multi || false;
        this.operation = n.operation;
        this.mongoConfig = RED.nodes.getNode(this.mongodb);

        if (this.mongoConfig) {
            var node = this;
            MongoClient.connect(this.mongoConfig.url, function(err, db) {
                if (err) {
                    node.error(err);
                } else {
                    node.clientDb = db;
                    var coll;
                    if (node.collection) {
                        coll = db.collection(node.collection);
                    }
                    node.on("input",function(msg) {
                        if (!node.collection) {
                            if (msg.collection) {
                                coll = db.collection(msg.collection);
                            } else {
                                node.error("No collection defined");
                                return;
                            }
                        }
                        delete msg._topic;
                        delete msg.collection;
                        if (node.operation === "store") {
                            if (node.payonly) {
                                if (typeof msg.payload !== "object") {
                                    msg.payload = {"payload": msg.payload};
                                }
                                coll.save(msg.payload,function(err, item) {
                                    if (err) {
                                        node.error(err);
                                    }
                                });
                            } else {
                                coll.save(msg,function(err, item) {
                                    if (err) {
                                        node.error(err);
                                    }
                                });
                            }
                        } else if (node.operation === "insert") {
                            if (node.payonly) {
                                if (typeof msg.payload !== "object") {
                                    msg.payload = {"payload": msg.payload};
                                }
                                coll.insert(msg.payload, function(err, item) {
                                    if (err) {
                                        node.error(err);
                                    }
                                });
                            } else {
                                coll.insert(msg, function(err,item) {
                                    if (err) {
                                        node.error(err);
                                    }
                                });
                            }
                        } else if (node.operation === "update") {
                            if (typeof msg.payload !== "object") {
                                msg.payload = {"payload": msg.payload};
                            }
                            var query = msg.query || {};
                            var payload = msg.payload || {};
                            var options = {
                                upsert: node.upsert,
                                multi: node.multi
                            };

                            coll.update(query, payload, options, function(err, item) {
                                if (err) {
                                    node.error(err + " " + payload);
                                }
                            });
                        } else if (node.operation === "delete") {
                            coll.remove(msg.payload, function(err, items) {
                                if (err) {
                                    node.error(err);
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
        this.operation = n.operation || "find";
        this.mongoConfig = RED.nodes.getNode(this.mongodb);

        if (this.mongoConfig) {
            var node = this;
            MongoClient.connect(this.mongoConfig.url, function(err,db) {
                if (err) {
                    node.error(err);
                } else {
                    node.clientDb = db;
                    var coll;
                    if (node.collection) {
                        coll = db.collection(node.collection);
                    }
                    node.on("input", function(msg) {
                        if (!node.collection) {
                            if (msg.collection) {
                                coll = db.collection(msg.collection);
                            } else {
                                node.error("No collection defined");
                                return;
                            }
                        }
                        if (node.operation === "find") {
                            msg.projection = msg.projection || {};
                            var selector = ensureValidSelectorObject(msg.payload);
                            var limit = msg.limit;
                            if (typeof limit === "string" && !isNaN(limit)) {
                                limit = Number(limit);
                            }
                            var skip = msg.skip;
                            if (typeof skip === "string" && !isNaN(skip)) {
                                skip = Number(skip);
                            }

                            coll.find(selector,msg.projection).sort(msg.sort).limit(limit).skip(skip).toArray(function(err, items) {
                                if (err) {
                                    node.error(err);
                                } else {
                                    msg.payload = items;
                                    delete msg.projection;
                                    delete msg.sort;
                                    delete msg.limit;
                                    delete msg.skip;
                                    node.send(msg);
                                }
                            });
                        } else if (node.operation === "count") {
                            var selector = ensureValidSelectorObject(msg.payload);
                            coll.count(selector, function(err, count) {
                                if (err) {
                                    node.error(err);
                                } else {
                                    msg.payload = count;
                                    node.send(msg);
                                }
                            });
                        } else if (node.operation === "aggregate") {
                            msg.payload = (Array.isArray(msg.payload)) ? msg.payload : [];
                            coll.aggregate(msg.payload, function(err, result) {
                                if (err) {
                                    node.error(err);
                                } else {
                                    msg.payload = result;
                                    node.send(msg);
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
    RED.nodes.registerType("mongodb in",MongoInNode);
}
