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
    var mqlight = require('mqlight');

    function MQLightServiceNode(n) {
        RED.nodes.createNode(this,n);
        this.service = n.service;
        this.clientid = n.clientid;
        if (this.credentials) {
            this.username = this.credentials.user;
            this.password = this.credentials.password;
        }
    }
    RED.nodes.registerType("mqlight service",MQLightServiceNode,{
        credentials: {
            user: {type:"text"},
            password: {type: "password"}
        }
    });

    function MQLightIn(n) {
        RED.nodes.createNode(this, n);
        this.topic = n.topic || "";
        this.service = n.service;
        this.serviceConfig = RED.nodes.getNode(this.service);
        var node = this;

        if (node.serviceConfig) {
            var id = "revc_client_" + (node.serviceConfig.clientid ? node.serviceConfig.clientid : Math.floor((Math.random() * 1000)));
            var opts = {
                service: node.serviceConfig.service,
                id: id
            };

            if (node.serviceConfig.username && node.serviceConfig.password) {
                opts.user = node.serviceConfig.username;
                opts.password = node.serviceConfig.password;
            }

            var recvClient = mqlight.createClient(opts, function(err) {
                if (err) {
                    node.error(err);
                } else {
                    recvClient.subscribe(node.topic, function(err, pattern) {
                        if (err) {
                            node.error("Failed to subscribe: " + err);
                        }
                    });
                    recvClient.on("message", function(data, delivery) {
                        var msg = {
                            topic: delivery.message.topic,
                            payload: data,
                            _session: {
                                type: "mqlight",
                                id: recvClient.id
                            }
                        };
                        node.send(msg);
                    });
                }
            });

            node.on("close", function () {
                recvClient.stop();
            });
        }
    }
    RED.nodes.registerType("mqlight in", MQLightIn);

    function MQLightOut(n) {
        RED.nodes.createNode(this, n);
        this.topic = n.topic || "";
        this.service = n.service;
        this.serviceConfig = RED.nodes.getNode(this.service);
        var node = this;

        if (node.serviceConfig) {
            var id = "send_client_" + (node.serviceConfig.clientid ? node.serviceConfig.clientid : Math.floor((Math.random() * 1000)));
            var opts = {
                service: node.serviceConfig.service,
                id: id
            };

            if (node.serviceConfig.username && node.serviceConfig.password) {
                opts.user = node.serviceConfig.username;
                opts.password = node.serviceConfig.password;
            }

            var sendClient = mqlight.createClient(opts, function(err) {
                if (err) {
                    node.error(err);
                } else {
                    node.on("input", function(msg) {
                        if (node.topic === "") {
                            if (msg.topic) {
                                node.topic = msg.topic;
                            } else {
                                node.warn("No topic set in MQ Light out node");
                                return;
                            }
                        }
                        sendClient.send(node.topic, msg.payload, function(err) {
                            if (err) {
                                node.error(err);
                            }
                        });
                    });
                }
            });

            node.on("close", function () {
                sendClient.stop();
            });
        }
    }
    RED.nodes.registerType("mqlight out", MQLightOut);
};
