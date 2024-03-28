/**
 * Copyright JS Foundation and other contributors, http://js.foundation
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

var ws = require("ws");
var url = require("url");
const crypto = require("crypto");

var log = require("@node-red/util").log; // TODO: separate module
var Tokens;
var Users;
var Permissions;
var Strategies;

var server;
var settings;
var runtimeAPI;

var wsServer;
var activeConnections = [];

var anonymousUser;

var heartbeatTimer;
var lastSentTime;

function init(_server,_settings,_runtimeAPI) {
    server = _server;
    settings = _settings;
    runtimeAPI = _runtimeAPI;
    Tokens = require("../auth/tokens");
    Tokens.onSessionExpiry(handleSessionExpiry);
    Users = require("../auth/users");
    Permissions = require("../auth/permissions");
    Strategies = require("../auth/strategies");

}
function handleSessionExpiry(session) {
    activeConnections.forEach(connection => {
        if (connection.token === session.accessToken) {
            connection.ws.send(JSON.stringify({auth:"fail"}));
            connection.ws.close();
        }
    })
}

function CommsConnection(ws, user) {
    this.session = crypto.randomBytes(32).toString('base64');
    this.ws = ws;
    this.stack = [];
    this.user = user;
    this.lastSentTime = 0;
    var self = this;

    log.audit({event: "comms.open"});
    log.trace("comms.open "+self.session);
    var preAuthed = !!user;
    var pendingAuth = !this.user && (settings.adminAuth != null);

    if (!pendingAuth) {
        addActiveConnection(self);
    }
    ws.on('close',function() {
        log.audit({event: "comms.close",user:self.user, session: self.session});
        log.trace("comms.close "+self.session);
        removeActiveConnection(self);
    });

    const handleAuthPacket = function(msg) {
        Tokens.get(msg.auth).then(function(client) {
            if (client) {
                Users.get(client.user).then(function(user) {
                    if (user) {
                        self.user = user;
                        log.audit({event: "comms.auth",user:self.user});
                        completeConnection(msg, client.scope,msg.auth,true);
                    } else {
                        log.audit({event: "comms.auth.fail"});
                        completeConnection(msg, null,null,false);
                    }
                });
            } else {
                Users.tokens(msg.auth).then(function(user) {
                    if (user) {
                        self.user = user;
                        log.audit({event: "comms.auth",user:self.user});
                        completeConnection(msg, user.permissions,msg.auth,true);
                    } else {
                        log.audit({event: "comms.auth.fail"});
                        completeConnection(msg, null,null,false);
                    }
                });
            }
        });
    }
    const completeConnection = function(msg, userScope, session, sendAck) {
        try {
            if (!userScope || !Permissions.hasPermission(userScope,"status.read")) {
                ws.send(JSON.stringify({auth:"fail"}));
                ws.close();
            } else {
                pendingAuth = false;
                addActiveConnection(self);
                self.token = msg.auth;
                if (sendAck) {
                    ws.send(JSON.stringify({auth:"ok"}));
                }
            }
        } catch(err) {
            console.log(err.stack);
            // Just in case the socket closes before we attempt
            // to send anything.
        }
    }
    ws.on('message', function(data,flags) {
        var msg = null;
        try {
            msg = JSON.parse(data);
        } catch(err) {
            log.trace("comms received malformed message : "+err.toString());
            return;
        }
        if (!pendingAuth) {
            if (msg.auth) {
                handleAuthPacket(msg)
            } else if (msg.subscribe) {
                self.subscribe(msg.subscribe);
                // handleRemoteSubscription(ws,msg.subscribe);
            } else if (msg.topic) {
                runtimeAPI.comms.receive({
                    user: self.user,
                    client: self,
                    topic: msg.topic,
                    data: msg.data
                })
            }
        } else {
            if (msg.auth) {
                handleAuthPacket(msg)
            } else {
                if (anonymousUser) {
                    log.audit({event: "comms.auth",user:anonymousUser});
                    self.user = anonymousUser;
                    completeConnection(msg, anonymousUser.permissions, null, false);
                    //TODO: duplicated code - pull non-auth message handling out
                    if (msg.subscribe) {
                        self.subscribe(msg.subscribe);
                    }
                } else {
                    log.audit({event: "comms.auth.fail"});
                    completeConnection(msg, null,null,false);
                }
            }
        }
    });
    ws.on('error', function(err) {
        log.warn(log._("comms.error",{message:err.toString()}));
    });
}

CommsConnection.prototype.send = function(topic,data) {
    if (topic && data) {
        this.stack.push({topic:topic,data:data});
    }
    this._queueSend();
}
CommsConnection.prototype._queueSend = function() {
    var self = this;
    if (!this._xmitTimer) {
        this._xmitTimer = setTimeout(function() {
            try {
                self.ws.send(JSON.stringify(self.stack.splice(0,50)));
                self.lastSentTime = Date.now();
            } catch(err) {
                removeActiveConnection(self);
                log.warn(log._("comms.error-send",{message:err.toString()}));
            }
            delete self._xmitTimer;
            if (self.stack.length > 0) {
                self._queueSend();
            }
        },50);
    }
}


CommsConnection.prototype.subscribe = function(topic) {
    runtimeAPI.comms.subscribe({
        user: this.user,
        client: this,
        topic: topic
    })
}

function start() {
    if (!settings.disableEditor) {
        Users.default().then(function(_anonymousUser) {
            anonymousUser = _anonymousUser;
            var webSocketKeepAliveTime = settings.webSocketKeepAliveTime || 15000;
            var commsPath = settings.httpAdminRoot || "/";
            commsPath = (commsPath.slice(0,1) != "/" ? "/":"") + commsPath + (commsPath.slice(-1) == "/" ? "":"/") + "comms";
            wsServer = new ws.Server({ noServer: true });
            wsServer.on('connection',function(ws, request, user) {
                var commsConnection = new CommsConnection(ws, user);
            });
            wsServer.on('error', function(err) {
                log.warn(log._("comms.error-server",{message:err.toString()}));
            });

            server.on('upgrade', function upgrade(request, socket, head) {
                const pathname = url.parse(request.url).pathname;
                if (pathname === commsPath) {
                    if (Users.tokenHeader() !== null && request.headers[Users.tokenHeader()]) {
                        // The user has provided custom token handling. For the websocket,
                        // the token could be provided in two ways:
                        //  - as an http header (only possible with a reverse proxy setup)
                        //  - passed over the connected websock in an auth packet
                        // If the header is present, verify the token. If not, use the auth
                        // packet over the connected socket
                        //
                        Strategies.authenticateUserToken(request).then(user => {
                            wsServer.handleUpgrade(request, socket, head, function done(ws) {
                                wsServer.emit('connection', ws, request, user);
                            });
                        }).catch(err => {
                            log.audit({event: "comms.auth.fail"});
                            socket.destroy();
                        })
                        return
                    }
                    wsServer.handleUpgrade(request, socket, head, function done(ws) {
                        wsServer.emit('connection', ws, request, null);
                    });
                }
                // Don't destroy the socket as other listeners may want to handle the
                // event.
            });

            lastSentTime = Date.now();

            heartbeatTimer = setInterval(function() {
                var now = Date.now();
                if (now-lastSentTime > webSocketKeepAliveTime) {
                    activeConnections.forEach(connection => connection.send("hb",lastSentTime));
                }
            }, webSocketKeepAliveTime);
        });
    }
}

function stop() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
    if (wsServer) {
        wsServer.close();
        wsServer = null;
    }
}

function addActiveConnection(connection) {
    activeConnections.push(connection);
    runtimeAPI.comms.addConnection({client: connection});
}
function removeActiveConnection(connection) {
    for (var i=0;i<activeConnections.length;i++) {
        if (activeConnections[i] === connection) {
            activeConnections.splice(i,1);
            runtimeAPI.comms.removeConnection({client:connection})
            break;
        }
    }
}

module.exports = {
    init:init,
    start:start,
    stop:stop
}
