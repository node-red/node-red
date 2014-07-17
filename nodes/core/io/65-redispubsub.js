/**
 * Copyright 2014 IBM Corp.
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

    function RedisPubNode(n) {

        RED.nodes.createNode(this,n);
        this.topic = n.topic;
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
            this.client.on("end",function() {
                node.status({fill:"red",shape:"ring",text:"disconnected"});
            });
            this.client.on("connect",function() {
                node.status({fill:"green",shape:"dot",text:"connected"});
            });

            this.on("input",function(msg) {
                if (msg !== null) {
                    if (this.topic) {
                        msg.topic = this.topic;
                    }
                    if (Buffer.isBuffer(msg.payload)) {
                        msg.payload = msg.payload.toString();
                    } else if (typeof msg.payload === "object") {
                        msg.payload = JSON.stringify(msg.payload);
                    } else if (typeof msg.payload !== "string") {
                        msg.payload = ""+msg.payload;
                    }

                    this.client.publish(msg.topic, msg.payload);
                }
            });
            this.on("close", function() {
                redisConnectionPool.close(node.client);
            });
        } else {
            this.error("missing redis server configuration");
        }
    }
    RED.nodes.registerType("redis pub", RedisPubNode);

    function RedisSubNode(n) {

        RED.nodes.createNode(this,n);
        this.topic = n.topic;
        this.server = n.server;
        this.serverConfig = RED.nodes.getNode(this.server);
        if (this.serverConfig) {
            this.client = redisConnectionPool.get(this.serverConfig.host,
                                                  this.serverConfig.port,
                                                  'sub');

            if (this.client.connected) {
                this.status({fill:"green",shape:"dot",text:"connected"});
            } else {
                this.status({fill:"red",shape:"ring",text:"disconnected"},true);
            }

            var node = this;
            this.client.on("end",function() {
                node.status({fill:"red",shape:"ring",text:"disconnected"});
            });
            this.client.on("connect",function() {
                node.status({fill:"green",shape:"dot",text:"connected"});
            });

            redisConnectionPool.subscribe(this, this.client, this.topic,
                                          function (msg) {
                                              node.send(msg);
                                          });
            this.on("close", function() {
                redisConnectionPool.unsubscribe(node, node.client, node.topic);
                redisConnectionPool.close(node.client);
            });
        } else {
            this.error("missing redis server configuration");
        }
    }
    RED.nodes.registerType("redis sub", RedisSubNode);
};
