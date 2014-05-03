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
    var util = require("util");
    var redis = require("redis");
    
    var hashFieldRE = /^([^=]+)=(.*)$/;
    
    var redisConnectionPool = function() {
        var connections = {};
        var obj = {
            get: function(host,port) {
                var id = host+":"+port;
                if (!connections[id]) {
                    connections[id] = redis.createClient(port,host);
                    connections[id].on("error",function(err) {
                            util.log("[redis] "+err);
                    });
                    connections[id].on("connect",function() {
                            util.log("[redis] connected to "+host+":"+port);
                    });
                    connections[id]._id = id;
                    connections[id]._nodeCount = 0;
                }
                connections[id]._nodeCount += 1;
                return connections[id];
            },
            close: function(connection) {
                connection._nodeCount -= 1;
                if (connection._nodeCount == 0) {
                    if (connection) {
                        clearTimeout(connection.retry_timer);
                        connection.end();
                    }
                    delete connections[connection._id];
                }
            }
        };
        return obj;
    }();
    
    
    function RedisOutNode(n) {
        RED.nodes.createNode(this,n);
        this.port = n.port||"6379";
        this.hostname = n.hostname||"127.0.0.1";
        this.key = n.key;
        this.structtype = n.structtype;
    
        this.client = redisConnectionPool.get(this.hostname,this.port);
    
        this.on("input", function(msg) {
                if (msg != null) {
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
    }
    
    RED.nodes.registerType("redis out",RedisOutNode);
    
    RedisOutNode.prototype.close = function() {
        redisConnectionPool.close(this.client);
    }
}

