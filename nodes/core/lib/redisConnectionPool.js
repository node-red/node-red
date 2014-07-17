/**
 * Copyright 2013, 2014 IBM Corp.
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

module.exports = (function() {
    "use strict";
    var redis = require("redis");
    var util = require("util");

    var connections = {};
    var obj = {
        get: function(host,port,type) {
            var id = host+":"+port+"!"+(type || 'pub');
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
                connections[id]._subscriptions = {};
                connections[id]._topics = {};
            }
            connections[id]._nodeCount += 1;
            connections[id].on('pmessage',function(pattern, channel, message) {
                var connection = connections[this._id];
                for (var i=0; i<connection._topics[pattern].length; i++) {
                    var callback = connection._topics[pattern][i].callback;
                    callback({ topic: channel,
                               pattern: pattern,
                               payload: message });
                }
            });
            return connections[id];
        },
        close: function(connection) {
            connection._nodeCount -= 1;
            if (connection._nodeCount === 0) {
                if (connection) {
                    clearTimeout(connection.retry_timer);
                    connection.end();
                }
                delete connections[connection._id];
            }
        },
        subscribe: function(node, connection, pattern, callback) {
            if (!connection._topics.hasOwnProperty(pattern)) {
                connection.psubscribe(pattern);
                connection._topics[pattern] = [];
            }
            connection._topics[pattern].push({node:node,callback:callback});
        },
        unsubscribe: function(node, connection, pattern) {
            for (var i=0; i<connection._topics[pattern].length; i++) {
                if (connection._topics[pattern][i].node === node) {
                    connection._topics[pattern].splice(i,1);
                    break;
                }
            }
            if (connection._topics[pattern].length == 0) {
                connection.punsubscribe(pattern);
                connection._topics[pattern];
            }
        }

    };
    return obj;
})();
