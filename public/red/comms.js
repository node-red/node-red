/**
 * Copyright 2014 IBM Corp.
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
 
RED.comms = function() {
    
    var errornotification = null;
    var subscriptions = {};
    var ws;
    function connectWS() {
        var path = location.hostname+":"+location.port+document.location.pathname;
        path = path+(path.slice(-1) == "/"?"":"/")+"comms";
        path = "ws"+(document.location.protocol=="https:"?"s":"")+"://"+path;
        ws = new WebSocket(path);
        ws.onopen = function() {
            if (errornotification) {
                errornotification.close();
                errornotification = null;
            }
            for (var t in subscriptions) {
                ws.send(JSON.stringify({subscribe:t}));
            }
        }
        ws.onmessage = function(event) {
            var msg = JSON.parse(event.data);
            if (msg.topic) {
                for (var t in subscriptions) {
                    var re = new RegExp("^"+t.replace(/([\[\]\?\(\)\\\\$\^\*\.|])/g,"\\$1").replace(/\+/g,"[^/]+").replace(/\/#$/,"(\/.*)?")+"$");
                    if (re.test(msg.topic)) {
                        var subscribers = subscriptions[t];
                        if (subscribers) {
                            for (var i=0;i<subscribers.length;i++) {
                                subscribers[i](msg.topic,msg.data);
                            }
                        }
                    }
                }
            }
        };
        ws.onclose = function() {
            if (errornotification == null) {
                errornotification = RED.notify("<b>Error</b>: Lost connection to server","error",true);
            }
            setTimeout(connectWS,1000);
        }
    }
    
    function subscribe(topic,callback) {
        if (subscriptions[topic] == null) {
            subscriptions[topic] = [];
        }
        subscriptions[topic].push(callback);
        if (ws && ws.readyState == 1) {
            ws.send(JSON.stringify({subscribe:topic}));
        }
    }
    
    
    return {
        connect: connectWS,
        subscribe: subscribe
    }
}();
