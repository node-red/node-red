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
    var connectionPool = require("./lib/mqttConnectionPool");
    var isUtf8 = require('is-utf8');

    function MQTTBrokerNode(n) {
        RED.nodes.createNode(this,n);
        this.broker = n.broker;
        this.port = n.port;
        this.clientid = n.clientid;
        if (this.credentials) {
            this.username = this.credentials.user;
            this.password = this.credentials.password;
        }
    }
    RED.nodes.registerType("mqtt-broker",MQTTBrokerNode,{
        credentials: {
            user: {type:"text"},
            password: {type: "password"}
        }
    });

    function MQTTInNode(n) {
        RED.nodes.createNode(this,n);
        this.topic = n.topic;
        this.broker = n.broker;
        this.brokerConfig = RED.nodes.getNode(this.broker);
        if (this.brokerConfig) {
            this.status({fill:"red",shape:"ring",text:"disconnected"});
            this.client = connectionPool.get(this.brokerConfig.broker,this.brokerConfig.port,this.brokerConfig.clientid,this.brokerConfig.username,this.brokerConfig.password);
            var node = this;
            if (this.topic) {
                this.client.subscribe(this.topic,2,function(topic,payload,qos,retain) {
                    if (isUtf8(payload)) { payload = payload.toString(); }
                    var msg = {topic:topic,payload:payload,qos:qos,retain:retain};
                    if ((node.brokerConfig.broker === "localhost")||(node.brokerConfig.broker === "127.0.0.1")) {
                        msg._topic = topic;
                    }
                    node.send(msg);
                }, this.id);
                this.client.on("connectionlost",function() {
                    node.status({fill:"red",shape:"ring",text:"disconnected"});
                });
                this.client.on("connect",function() {
                    node.status({fill:"green",shape:"dot",text:"connected"});
                });
                if (this.client.isConnected()) {
                    node.status({fill:"green",shape:"dot",text:"connected"});
                } else {
                    this.client.connect();
                }
            }
            else {
                this.error("topic not defined");
            }
        } else {
            this.error("missing broker configuration");
        }
        this.on('close', function() {
            if (this.client) {
                this.client.unsubscribe(this.topic,this.id);
                this.client.disconnect();
            }
        });
    }
    RED.nodes.registerType("mqtt in",MQTTInNode);

    function MQTTOutNode(n) {
        RED.nodes.createNode(this,n);
        this.topic = n.topic;
        this.qos = n.qos || null;
        this.retain = n.retain;
        this.broker = n.broker;
        this.brokerConfig = RED.nodes.getNode(this.broker);

        if (this.brokerConfig) {
            this.status({fill:"red",shape:"ring",text:"disconnected"});
            this.client = connectionPool.get(this.brokerConfig.broker,this.brokerConfig.port,this.brokerConfig.clientid,this.brokerConfig.username,this.brokerConfig.password);
            var node = this;
            this.on("input",function(msg) {
                if (msg.qos) {
                    msg.qos = parseInt(msg.qos);
                    if ((msg.qos !== 0) && (msg.qos !== 1) && (msg.qos !== 2)) {
                        msg.qos = null;
                    }
                }
                msg.qos = Number(node.qos || msg.qos || 0);
                msg.retain = node.retain || msg.retain || false;
                msg.retain = ((msg.retain === true) || (msg.retain === "true")) || false;
                if (node.topic) {
                    msg.topic = node.topic;
                }
                if ( msg.hasOwnProperty("payload")) {
                    if (msg.hasOwnProperty("topic") && (typeof msg.topic === "string") && (msg.topic !== "")) { // topic must exist
                        this.client.publish(msg);  // send the message
                    }
                    else { node.warn("Invalid topic specified"); }
                }
            });
            this.client.on("connectionlost",function() {
                node.status({fill:"red",shape:"ring",text:"disconnected"});
            });
            this.client.on("connect",function() {
                node.status({fill:"green",shape:"dot",text:"connected"});
            });
            if (this.client.isConnected()) {
                node.status({fill:"green",shape:"dot",text:"connected"});
            } else {
                this.client.connect();
            }
        } else {
            this.error("missing broker configuration");
        }
        this.on('close', function() {
            if (this.client) {
                this.client.disconnect();
            }
        });
    }
    RED.nodes.registerType("mqtt out",MQTTOutNode);
}
