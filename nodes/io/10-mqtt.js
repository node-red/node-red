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
var connectionPool = require("./lib/mqttConnectionPool");
var util = require("util");

function MQTTBrokerNode(n) {
    RED.nodes.createNode(this,n);
    this.broker = n.broker;
    this.port = n.port;
}
RED.nodes.registerType("mqtt-broker",MQTTBrokerNode);


function MQTTInNode(n) {
    RED.nodes.createNode(this,n);
    this.topic = n.topic;
    this.broker = n.broker;
    this.brokerConfig = RED.nodes.getNode(this.broker);
    if (this.brokerConfig) {
        this.client = connectionPool.get(this.brokerConfig.broker,this.brokerConfig.port);
        var node = this;
        this.client.subscribe(this.topic,2,function(topic,payload,qos,retain) {
                var msg = {topic:topic,payload:payload,qos:qos,retain:retain};
                if ((node.brokerConfig.broker == "localhost")||(node.brokerConfig.broker == "127.0.0.1")) {
                    msg._topic = topic;
                }
                node.send(msg);
        });
        this.client.connect();
    } else {
        this.error("missing broker configuration");
    }
}

RED.nodes.registerType("mqtt in",MQTTInNode);

MQTTInNode.prototype.close = function() {
    if (this.client) {
        this.client.disconnect();
    }
}


function MQTTOutNode(n) {
    RED.nodes.createNode(this,n);

    this.topic = n.topic;
    this.broker = n.broker;

    this.brokerConfig = RED.nodes.getNode(this.broker);

    if (this.brokerConfig) {
        this.client = connectionPool.get(this.brokerConfig.broker,this.brokerConfig.port);
        this.on("input",function(msg) {
            if (msg != null) {
                if (this.topic) {
                    msg.topic = this.topic;
                }
                this.client.publish(msg);
            }
        });
        this.client.connect();
    } else {
        this.error("missing broker configuration");
    }
}

RED.nodes.registerType("mqtt out",MQTTOutNode);

MQTTOutNode.prototype.close = function() {
    if (this.client) {
        this.client.disconnect();
    }
}

