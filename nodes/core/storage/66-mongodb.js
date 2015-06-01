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

    function MongoClose( db ){
      if( ! process.env.MONGODB_SINGLETON ) db.close();
    }
    
    function MongoCleanup(node,RED){
      if ( config.instance != undefined ){
        for( var i in config.instance ){
          config.instance[i].close()
          if (RED.settings.verbose) 
            node.log("mongodb: closing mongod connectionpool "+i)
        }
        delete config.instance
      }
      if (node.clientDb) node.clientDb.close();
    } 

    function MongoConnect( node, config, cb ) {
        if ( config ){
          // lets store our db instances to prevent spawning zillions of mongodb threads
          if( config.instance == undefined || config.instance[ config.url ] == undefined ){ 
            if( config.instance == undefined ) config.instance = {};
            MongoClient.connect(config.url, function(err, db) { 
              if (RED.settings.verbose) console.info("connecting mongo client")
              if (err){
                node.error(err);
              }else {
                if( process.env.MONGODB_SINGLETON ) config.instance[ config.url ] = db;
                cb(db);
              }
            });
          }else cb( config.instance[ config.url ] ); // reuse db instance
        } else {
            this.error("missing mongodb configuration");
        }
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
        var node = this;
        
        node.on("close", function(){ 
          MongoCleanup(node,RED); 
        });

        node.on("input",function(msg) {
          MongoConnect( node, this.mongoConfig, function(db){
            node.clientDb = db;
            var coll;
            if (node.collection) {
                coll = db.collection(node.collection);
            }
            if (!node.collection) {
                if (msg.collection) {
                    coll = db.collection(msg.collection);
                } else {
                    node.error("No collection defined",msg);
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
                        MongoClose(db);
                        if (err) {
                            node.error(err,msg);
                        }
                    });
                } else {
                    coll.save(msg,function(err, item) {
                        MongoClose(db);
                        if (err) {
                            node.error(err,msg);
                        }
                    });
                }
            } else if (node.operation === "insert") {
                if (node.payonly) {
                    if (typeof msg.payload !== "object") {
                        msg.payload = {"payload": msg.payload};
                    }
                    coll.insert(msg.payload, function(err, item) {
                        MongoClose(db);
                        if (err) {
                            node.error(err,msg);
                        }
                    });
                } else {
                    coll.insert(msg, function(err,item) {
                        MongoClose(db);
                        if (err) {
                            node.error(err,msg);
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
                    MongoClose(db);
                    if (err) {
                        node.error(err,msg);
                    }
                });
            } else if (node.operation === "delete") {
                coll.remove(msg.payload, function(err, items) {
                    MongoClose(db);
                    if (err) {
                        node.error(err,msg);
                    }
                });
            }
          });
        });
    
    }

    function MongoInNode(n) {
        RED.nodes.createNode(this,n);
        this.collection = n.collection;
        this.mongodb = n.mongodb;
        this.operation = n.operation || "find";
        this.mongoConfig = RED.nodes.getNode(this.mongodb);
        var node = this;
        
        node.on("close", function(){ 
          MongoCleanup(node,RED); 
        });
        
        node.on("input", function(msg) {
          MongoConnect( node, this.mongoConfig, function(db){
            var selector;
            node.clientDb = db;
            var coll;
            if (node.collection) {
                coll = db.collection(node.collection);
            }
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
                selector = ensureValidSelectorObject(msg.payload);
                var limit = msg.limit;
                if (typeof limit === "string" && !isNaN(limit)) {
                    limit = Number(limit);
                }
                var skip = msg.skip || 0;
                if (typeof skip === "string" && !isNaN(skip)) {
                    skip = Number(skip);
                }

                var reserved = {}; for( var k in msg ) reserved[k] = msg[k];

                coll.find(selector,msg.projection).sort(msg.sort).limit(limit).skip(skip).toArray(function(err, items) {
                    MongoClose(db);
                    for( var k in reserved ) msg[k] = reserved[k]
                    if (err) {
                        msg.error = err
                        node.send(msg); // always output
                        node.error(err);
                    } else {
                        msg.payload = items;
                        delete msg.projection;
                        delete msg.sort;
                        delete msg.limit;
                        delete msg.skip;
                        node.send(msg); // always output
                    }
                });
            } else if (node.operation === "count") {
                selector = ensureValidSelectorObject(msg.payload);
                coll.count(selector, function(err, count) {
                    MongoClose(db);
                    if (err) {
                        msg.error = err
                        node.send(msg); // always output
                        node.error(err);
                    } else {
                        msg.payload = count;
                        node.send(msg); // always output
                    }
                });
            } else if (node.operation === "aggregate") {
                msg.payload = (Array.isArray(msg.payload)) ? msg.payload : [];
                coll.aggregate(msg.payload, function(err, result) {
                    MongoClose(db);
                    if (err) {
                        msg.error = err
                        node.send(msg); // always output
                        node.error(err);
                    } else {
                        msg.payload = result;
                        node.send(msg);
                    }
                });
            }
          });
        });

    }
    
    RED.nodes.registerType("mongodb out",MongoOutNode);
    RED.nodes.registerType("mongodb in",MongoInNode);

}
