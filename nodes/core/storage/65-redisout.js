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
    var redisConnectionPool = require("../lib/redisConnectionPool");

    var hashFieldRE = /^([^=]+)=(.*)$/;

    function RedisOutNode(n) {
        RED.nodes.createNode(this,n);
        this.key = n.key;
        this.structtype = n.structtype;
        this.server = n.server;
        this.serverConfig = RED.nodes.getNode(this.server);
        if (this.serverConfig) {
            this.client = redisConnectionPool.get(this.serverConfig.host,
                                                  this.serverConfig.port);

            if (this.client.connected) {
                this.status({fill:"green",shape:"dot",text:"connected"});
            } else {
                this.status({fill:"red",shape:"ring",text:"disconnected"},true);
            }

            var node = this;
            this.client.on("end", function() {
                node.status({fill:"red",shape:"ring",text:"disconnected"});
            });
            this.client.on("connect", function() {
                node.status({fill:"green",shape:"dot",text:"connected"});
            });

            this.on("input", function(msg) {
                if (msg !== null) {
                    var k = this.key || msg.topic;
                    if (k) {
                        if (this.structtype == "string") {
                            this.client.set(k,msg.payload);
                        } else if (this.structtype == "hash") {
                            var r = hashFieldRE.exec(msg.payload);
                            if (r) {
                                this.client.hset(k,r[1],r[2]);
                            } else {
                                this.warn("Invalid payload for redis hash");
                            }
                        } else if (this.structtype == "set") {
                            this.client.sadd(k,msg.payload);
                        } else if (this.structtype == "list") {
                            this.client.rpush(k,msg.payload);
                        }
                    } else {
                        this.warn("No key or topic set");
                    }
                }
            });
            this.on("close", function() {
                redisConnectionPool.close(node.client);
            });
        } else {
            this.error("missing redis server configuration");
        }
    }
    RED.nodes.registerType("redis out",RedisOutNode);

    function RedisServerNode(n) {
        RED.nodes.createNode(this,n);
        this.host = n.host;
        this.port = n.port;
    }
    RED.nodes.registerType("redis-server", RedisServerNode);
};
