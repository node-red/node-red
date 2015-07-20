/**
 * Template Copyright 2013 IBM Corp.
 * Template Copyright 2014 www.github.com/raynerv
 * Additions Copyright 2015 www.github.com/tedstriker
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
 var util = require("util");
 var mqtt = require("mqtt");
 //var fs = require("fs");

 var settings = require(process.env.NODE_RED_HOME + "/red/red").settings;

 var clients = {};

 function matchTopic(ts, t) {
    if (ts == "#" && t) {
        return true;
    }
    var re = new RegExp("^"+ts.replace(/([\[\]\?\(\)\\\\$\^\*\.|])/g,"\\$1").replace(/\+/g,"[^/]+").replace(/\/#$/,"(\/.*)?")+"$");
    return re.test(t);
}

function convertPayload(payload) {
    var converted;
    
    if (Buffer.isBuffer(payload)) {
        converted = payload.toString();
    } else if (typeof payload === "object") {
        converted = JSON.stringify(payload);
    } else if (typeof payload !== "string") {
        converted = ""+payload;
    } else {
        converted = payload;
    }   
    return converted;
}

module.exports = {
    get: function(brokerConfig) {
        var id = "["+(brokerConfig.username||"")+":"+(brokerConfig.password||"")+"]["+(brokerConfig.clientid||"")+"]@"+brokerConfig.protocol+"://"+brokerConfig.broker+":"+brokerConfig.port;
        if (!clients[id]) {
            clients[id] = function() {
                var uid = (1+Math.random()*4294967295).toString(16);
                var options = {};
                options.protocol = brokerConfig.protocol || "mqtt";
                options.host = brokerConfig.broker || "localhost";
                options.port = brokerConfig.port || (options.protocol == 'mqtts'? 8883:1883);
                options.keepalive = 15;
                options.clientid = brokerConfig.clientid || 'mqtt_' + (1+Math.random()*4294967295).toString(16);//crypto.randomBytes(16).toString('hex');
                options.username = brokerConfig.username;
                options.password = brokerConfig.password;
                options.protocolId = "MQIsdp";
                options.protocolVersion = 3;
                options.will = null;
                options.rejectUnauthorized = (brokerConfig.acceptanycertificate?false:true);
                options.reconnectPeriod = 5000;
                options.connectTimeout = 30000;

                if (brokerConfig.capath && brokerConfig.capath!=""){
                    options.ca = (require('fs').readFileSync(require('path').join(brokerConfig.capath)));
                }

                var queue = [];
                var subscriptions = [];
                var connecting = false;

                var client = mqtt.connect(options);

                var obj = {
                    _instances: 0,
                    publish: function(msg) {
                        if (client.connected) {
                            client.publish(msg.topic,msg.payload,{qos:msg.qos,retain:msg.retain});
                        } else {
                            connecting = true;
                            queue.push(msg);
                        }
                    },
                    subscribe: function(topic,qos,callback,ref) {
                        ref = ref||0;
                        subscriptions[topic] = subscriptions[topic]||{};
                        
                        var sub = {
                            topic:topic,
                            qos:qos,
                            handler:function(mtopic,mpayload,mpacket) {
                                if (matchTopic(topic,mtopic)) {
                                    callback(mtopic,mpayload,mpacket.qos,mpacket.retain);
                                }
                            },
                            ref: ref
                        };
                        subscriptions[topic][ref] = sub;
                        client.on('message',sub.handler);
                        if (client.connected) {
                            client.subscribe(topic,{qos:qos});
                        }
                    },
                    unsubscribe: function(topic){
                        client.unsubscribe(topic);
                    },
                    on: function(a,b){
                        client.on(a,b);
                    },
                    disconnect: function() {
                        this._instances -= 1;
                        if (this._instances == 0) {
                            client.end();
                            client = null;
                            delete clients[id];
                        }
                    },
                    isConnected: function() {
                        return client.connected;
                    },
                    isConnecting: function() {
                        return connecting;
                    }
                };
                client.on('connect',function() {
                    if (client) {
                        util.log('[mqtt] ['+uid+'] connected to broker '+options.protocol+'://'+options.host+':'+options.port);
                        connecting = false;
                        for (var s in subscriptions) {
                            var topic = s;
                            var qos = 0;
                            for (var r in subscriptions[s]) {
                                qos = Math.max(qos,subscriptions[s][r].qos);
                            }
                            client.subscribe(topic,{qos:qos});
                        }

                        //console.log("connected - publishing",queue.length,"messages");
                        while(queue.length) {
                            var msg = queue.shift();
                            //console.log(msg);
                            client.publish(msg.topic,msg.payload,{qos:msg.qos,retain:msg.retain});
                        }
                    }
                });
                client.on('reconnect', function() {
                   connecting = true;
                });
                client.on('close', function() {
                    connecting = false;
                    util.log('[mqtt] ['+uid+'] disconnected from broker '+options.protocol+'://'+options.host+':'+options.port);
                });
                client.on('error', function(err){
                   connecting = false;
                   util.log('[mqtt] ['+uid+'] error while connecting to broker '+options.protocol+'://'+options.host+':'+options.port);
                   util.log('[mqtt] ['+uid+'] error message: '+err.message);
                });

    return obj
    }();
    }
        clients[id]._instances += 1;
        return clients[id];
    }
};