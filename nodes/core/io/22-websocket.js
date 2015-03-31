/**
 * Copyright 2013,2015 IBM Corp.
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
    var ws = require("ws"),
        inspect = require("sys").inspect;

    // A node red node that sets up a local websocket server
    function WebSocketListenerNode(n) {
        // Create a RED node
        RED.nodes.createNode(this,n);

        var node = this;

        // Store local copies of the node configuration (as defined in the .html)
        node.path = n.path;
        node.wholemsg = (n.wholemsg === "true");

        node._inputNodes = [];    // collection of nodes that want to receive events
        node._clients = {};

        function handleConnection(/*socket*/socket) {
            var id = (1+Math.random()*4294967295).toString(16);
            node._clients[id] = socket;
            socket.on('close',function() {
                delete node._clients[id];
            });
            socket.on('message',function(data,flags){
                node.handleEvent(id,socket,'message',data,flags);
            });
            socket.on('error', function(err) {
                node.warn("An error occured on the ws connection: "+inspect(err));
            });
        }

        // match absolute url
        node.isServer = !/^ws{1,2}:\/\//i.test(node.path);
        if(node.isServer)
        {
            var path = RED.settings.httpNodeRoot || "/";
            path = path + (path.slice(-1) == "/" ? "":"/") + (node.path.charAt(0) == "/" ? node.path.substring(1) : node.path);

            // Workaround https://github.com/einaros/ws/pull/253
            // Listen for 'newListener' events from RED.server
            node._serverListeners = {};

            var storeListener = function(/*String*/event,/*function*/listener){
                if(event == "error" || event == "upgrade" || event == "listening"){
                    node._serverListeners[event] = listener;
                }
            }

            RED.server.addListener('newListener',storeListener);

            // Create a WebSocket Server
            node.server = new ws.Server({server:RED.server,path:path});

            // Workaround https://github.com/einaros/ws/pull/253
            // Stop listening for new listener events
            RED.server.removeListener('newListener',storeListener);

            node.server.on('connection', handleConnection);
        }
        else
        {
            // Connect to remote endpoint
            var socket = new ws(node.path);
            node.server = socket; // keep for closing
            handleConnection(socket);
        }

        node.on("close", function() {
            // Workaround https://github.com/einaros/ws/pull/253
            // Remove listeners from RED.server
            var listener = null;
            for(var event in node._serverListeners) {
                if (node._serverListeners.hasOwnProperty(event)) {
                    listener = node._serverListeners[event];
                    if(typeof listener === "function"){
                        RED.server.removeListener(event,listener);
                    }
                }
            }
            node._serverListeners = {};
            node.server.close();
            node._inputNodes = [];
        });
    }
    RED.nodes.registerType("websocket-listener",WebSocketListenerNode);
    RED.nodes.registerType("websocket-client",WebSocketListenerNode);

    WebSocketListenerNode.prototype.registerInputNode = function(/*Node*/handler){
        this._inputNodes.push(handler);
    }

    WebSocketListenerNode.prototype.handleEvent = function(id,/*socket*/socket,/*String*/event,/*Object*/data,/*Object*/flags){
        var msg;
        if (this.wholemsg) {
            try {
                msg = JSON.parse(data);
            }
            catch(err) {
                msg = { payload:data };
            }
        } else {
            msg = {
                payload:data
            };
        }
        msg._session = {type:"websocket",id:id};

        for (var i = 0; i < this._inputNodes.length; i++) {
            this._inputNodes[i].send(msg);
        }
    }

    WebSocketListenerNode.prototype.broadcast = function(data){
        try {
            if(this.isServer) {
                for (var i = 0; i < this.server.clients.length; i++) {
                    this.server.clients[i].send(data);
                }
            }
            else {
                this.server.send(data);
            }
        }
        catch(e) { // swallow any errors
            this.warn("ws:"+i+" : "+e);
        }
    }

    WebSocketListenerNode.prototype.reply = function(id,data) {
        var session = this._clients[id];
        if (session) {
            try {
                session.send(data);
            }
            catch(e) { // swallow any errors
            }
        }
    }

    function WebSocketInNode(n) {
        RED.nodes.createNode(this,n);
        this.server = (n.client)?n.client:n.server;
        var node = this;
        this.serverConfig = RED.nodes.getNode(this.server);
        if (this.serverConfig) {
            this.serverConfig.registerInputNode(this);
        } else {
            this.error("Missing server configuration");
        }
    }
    RED.nodes.registerType("websocket in",WebSocketInNode);

    function WebSocketOutNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        this.server = (n.client)?n.client:n.server;
        this.serverConfig = RED.nodes.getNode(this.server);
        if (!this.serverConfig) {
            this.error("Missing server configuration");
        }
        this.on("input", function(msg) {
            var payload;
            if (this.serverConfig.wholemsg) {
                delete msg._session;
                payload = JSON.stringify(msg);
            } else if (msg.hasOwnProperty("payload")) {
                if (!Buffer.isBuffer(msg.payload)) { // if it's not a buffer make sure it's a string.
                    payload = RED.util.ensureString(msg.payload);
                }
                else {
                    payload = msg.payload;
                }
            }
            if (payload) {
                if (msg._session && msg._session.type == "websocket") {
                    node.serverConfig.reply(msg._session.id,payload);
                } else {
                    node.serverConfig.broadcast(payload,function(error){
                        if (!!error) {
                            node.warn("An error occurred while sending:" + inspect(error));
                        }
                    });
                }
            }
        });
    }
    RED.nodes.registerType("websocket out",WebSocketOutNode);
}
