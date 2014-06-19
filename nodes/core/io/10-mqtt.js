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
    var connectionPool = require("./lib/mqttConnectionPool");
    var util = require("util");

    function MQTTBrokerNode(n) {
        RED.nodes.createNode(this,n);
        this.broker = n.broker;
        this.port = n.port;
        this.clientid = n.clientid;
        var credentials = RED.nodes.getCredentials(n.id);
        if (credentials) {
            this.username = credentials.user;
            this.password = credentials.password;
        }
    }
    RED.nodes.registerType("mqtt-broker",MQTTBrokerNode);

    var querystring = require('querystring');

    RED.httpAdmin.get('/mqtt-broker/:id',function(req,res) {
        var credentials = RED.nodes.getCredentials(req.params.id);
        if (credentials) {
            res.send(JSON.stringify({user:credentials.user,hasPassword:(credentials.password&&credentials.password!="")}));
        } else {
            res.send(JSON.stringify({}));
        }
    });

    RED.httpAdmin.delete('/mqtt-broker/:id',function(req,res) {
        RED.nodes.deleteCredentials(req.params.id);
        res.send(200);
    });

    RED.httpAdmin.post('/mqtt-broker/:id',function(req,res) {
        var body = "";
        req.on('data', function(chunk) {
            body+=chunk;
        });
        req.on('end', function(){
            var newCreds = querystring.parse(body);
            var credentials = RED.nodes.getCredentials(req.params.id)||{};
            if (newCreds.user == null || newCreds.user == "") {
                delete credentials.user;
            } else {
                credentials.user = newCreds.user;
            }
            if (newCreds.password == "") {
                delete credentials.password;
            } else {
                credentials.password = newCreds.password||credentials.password;
            }
            RED.nodes.addCredentials(req.params.id,credentials);
            res.send(200);
        });
    });


    function MQTTInNode(n) {
        RED.nodes.createNode(this,n);
        this.topic = n.topic;
        this.broker = n.broker;
        this.brokerConfig = RED.nodes.getNode(this.broker);
        var node = this;
        if (this.brokerConfig) {
            this.status({fill:"red",shape:"ring",text:"disconnected"});
            this.client = connectionPool.get(this.brokerConfig.broker,this.brokerConfig.port,this.brokerConfig.clientid,this.brokerConfig.username,this.brokerConfig.password);
            var node = this;
            this.client.subscribe(this.topic,2,function(topic,payload,qos,retain) {
                    var msg = {topic:topic,payload:payload,qos:qos,retain:retain};
                    if ((node.brokerConfig.broker == "localhost")||(node.brokerConfig.broker == "127.0.0.1")) {
                        msg._topic = topic;
                    }
                    node.send(msg);
            });
            this.client.on("connectionlost",function() {
                node.status({fill:"red",shape:"ring",text:"disconnected"});
            });
            this.client.on("connect",function() {
                node.status({fill:"green",shape:"dot",text:"connected"});
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
        var node = this;

        if (this.brokerConfig) {
            this.status({fill:"red",shape:"ring",text:"disconnected"},true);
            this.client = connectionPool.get(this.brokerConfig.broker,this.brokerConfig.port,this.brokerConfig.clientid,this.brokerConfig.username,this.brokerConfig.password);
            this.on("input",function(msg) {
                if (msg != null) {
                    if (this.topic) {
                        msg.topic = this.topic;
                    }
                    this.client.publish(msg);
                }
            });
            this.client.on("connectionlost",function() {
                node.status({fill:"red",shape:"ring",text:"disconnected"});
            });
            this.client.on("connect",function() {
                node.status({fill:"green",shape:"dot",text:"connected"});
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
}
