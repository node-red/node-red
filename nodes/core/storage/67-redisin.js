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

function RedisInNode(n) {
    RED.nodes.createNode(this,n);
    var node = this;
    this.port = n.port||"6379";
    this.hostname = n.hostname||"127.0.0.1";
    this.key = n.key;
    this.structtype = n.structtype;
    this.keytype = n.keytype;
    
    this.client = redisConnectionPool.get(this.hostname,this.port);

    this.on("input", function(msg) {

            if (msg != null) {
                var k = (n.keytype=="REDISKEY")?this.key:msg.payload[this.key].toString();
                
                if (k) {
                this.client.get(k, function(err, reply){
                  msg.payload = reply;
                  node.send(msg); 
                })
                } else {
                    this.warn("No key or topic set");
                }
            }
    });
}

RED.nodes.registerType("redis in",RedisInNode);

RedisInNode.prototype.close = function() {
    redisConnectionPool.close(this.client);
}

