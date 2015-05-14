/**
 * Copyright 2014, 2015 IBM Corp.
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
var log = require("./log");

var server;
var settings;

var wsServer;
var pendingConnections = [];
var activeConnections = [];

var retained = {};

var heartbeatTimer;
var lastSentTime;


function init(_server,_settings) {
    server = _server;
    settings = _settings;
}


function start() {
    var Tokens = require("./api/auth/tokens");
    var Users = require("./api/auth/users");
    var Permissions = require("./api/auth/permissions");
    if (!settings.disableEditor) {
        Users.default().then(function(anonymousUser) {
            var webSocketKeepAliveTime = settings.webSocketKeepAliveTime || 15000;
            var path = settings.httpAdminRoot || "/";
            path = (path.slice(0,1) != "/" ? "/":"") + path + (path.slice(-1) == "/" ? "":"/") + "comms";
            wsServer = new ws.Server({server:server,path:path});
            
            wsServer.on('connection',function(ws) {
                log.audit({event: "comms.open"});
                var pendingAuth = (settings.adminAuth != null);
                if (!pendingAuth) {
                    activeConnections.push(ws);
                } else {
                    pendingConnections.push(ws);
                }
                ws.on('close',function() {
                    log.audit({event: "comms.close",user:ws.user});
                    removeActiveConnection(ws);
                    removePendingConnection(ws);
                });
                ws.on('message', function(data,flags) {
                    var msg = null;
                    try {
                        msg = JSON.parse(data);
                    } catch(err) {
                        log.warn("comms received malformed message : "+err.toString());
                        return;
                    }
                    if (!pendingAuth) {
                        if (msg.subscribe) {
                            handleRemoteSubscription(ws,msg.subscribe);
                        }
                    } else {
                        var completeConnection = function(userScope,sendAck) {
                            if (!userScope || !Permissions.hasPermission(userScope,"status.read")) {
                                ws.close();
                            } else {
                                pendingAuth = false;
                                removePendingConnection(ws);
                                activeConnections.push(ws);
                                if (sendAck) {
                                    ws.send(JSON.stringify({auth:"ok"}));
                                }
                            }
                        }
                        if (msg.auth) {
                            Tokens.get(msg.auth).then(function(client) {
                                if (client) {
                                    Users.get(client.user).then(function(user) {
                                        if (user) {
                                            ws.user = user;
                                            log.audit({event: "comms.auth",user:ws.user});
                                            completeConnection(client.scope,true);
                                        } else {
                                            log.audit({event: "comms.auth.fail"});
                                            completeConnection(null,false);
                                        }
                                    });
                                } else {
                                    log.audit({event: "comms.auth.fail"});
                                    completeConnection(null,false);
                                }
                            });
                        } else {
                            if (anonymousUser) {
                                log.audit({event: "comms.auth",user:anonymousUser});
                                completeConnection(anonymousUser.permissions,false);
                            } else {
                                log.audit({event: "comms.auth.fail"});
                                completeConnection(null,false);
                            }
                            //TODO: duplicated code - pull non-auth message handling out
                            if (msg.subscribe) {
                                handleRemoteSubscription(ws,msg.subscribe);
                            }
                        }
                    }
                });
                ws.on('error', function(err) {
                    log.warn("comms error : "+err.toString());
                });
            });
            
            wsServer.on('error', function(err) {
                log.warn("comms server error : "+err.toString());
            });
             
            lastSentTime = Date.now();
            
            heartbeatTimer = setInterval(function() {
                var now = Date.now();
                if (now-lastSentTime > webSocketKeepAliveTime) {
                    publish("hb",lastSentTime);
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

function publish(topic,data,retain) {
    if (retain) {
        retained[topic] = data;
    } else {
        delete retained[topic];
    }
    lastSentTime = Date.now();
    activeConnections.forEach(function(conn) {
        publishTo(conn,topic,data);
    });
}

function publishTo(ws,topic,data) {
    var msg = JSON.stringify({topic:topic,data:data});
    try {
        ws.send(msg);
    } catch(err) {
        log.warn("comms send error : "+err.toString());
    }
}

function handleRemoteSubscription(ws,topic) {
    var re = new RegExp("^"+topic.replace(/([\[\]\?\(\)\\\\$\^\*\.|])/g,"\\$1").replace(/\+/g,"[^/]+").replace(/\/#$/,"(\/.*)?")+"$");
    for (var t in retained) {
        if (re.test(t)) {
            publishTo(ws,t,retained[t]);
        }
    }
}

function removeActiveConnection(ws) {
    for (var i=0;i<activeConnections.length;i++) {
        if (activeConnections[i] === ws) {
            activeConnections.splice(i,1);
            break;
        }
    }
}
function removePendingConnection(ws) {
    for (var i=0;i<pendingConnections.length;i++) {
        if (pendingConnections[i] === ws) {
            pendingConnections.splice(i,1);
            break;
        }
    }
}

module.exports = {
    init:init,
    start:start,
    stop:stop,
    publish:publish,
}
