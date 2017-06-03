/** This file was modified by Sathya Laufer */

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

RED.comms = (function() {
    var homegear = null;
    var errornotification = null;
    var subscriptions = {};

    function getHomegear()
    {
        return homegear;
    }

    function readCookie(key) {
        var result;
        return (result = new RegExp('(?:^|; )' + encodeURIComponent(key) + '=([^;]*)').exec(document.cookie)) ? (result[1]) : null;
    }

    function homegearEvent(message) {
        if(message.method == "nodeEvent") {
            if(message.params[2].format && !message.params[2].format.match(/string/g)) message.params[2].msg = JSON.stringify(message.params[2].msg);
            for (var t in subscriptions) {
                if (subscriptions.hasOwnProperty(t)) {
                    var re = new RegExp("^"+t.replace(/([\[\]\?\(\)\\\\$\^\*\.|])/g,"\\$1").replace(/\+/g,"[^/]+").replace(/\/#$/,"(\/.*)?")+"$");
                    if (re.test(message.params[1])) {
                        var subscribers = subscriptions[t];
                        if (subscribers) {
                            for (var i=0;i<subscribers.length;i++) {
                                subscribers[i](message.params[1], message.params[2]);
                            }
                        }
                    }
                }
            }
        }
    }

    function connectWS() {
        var ssl = window.location.protocol == "https:" ? true : false;
        var server = '';
        var port = ssl ? '443' : '80';
        var ipEndIndex = window.location.host.indexOf(']');
        if(ipEndIndex > -1) { //IPv6
            part2 = window.location.host.substring(ipEndIndex);
            if(part2.length > 2 && part2.charAt(1) == ':') port = part2.substring(2);
            server = window.location.host.substring(0, ipEndIndex + 1);
        } else {
            var hostArray = window.location.host.split(':');
            server = hostArray[0];
            if(hostArray.length > 1) port = hostArray[1];
        }
        var sessionId = readCookie('PHPSESSID');
        homegear = new HomegearWS(server, port, 'hgflows', ssl, sessionId);
        homegear.ready(function() {
            if(errornotification) {
                errornotification.close();
                errornotification = null;
            }
        });
        homegear.error(function(message) {
            if(errornotification) errornotification.close();
            errornotification = RED.notify(RED._("notification.error",{message:RED._("notification.errors.lostConnection")}),"error",true);
        });
        homegear.event(homegearEvent);
        homegear.connect();        
    }

    function subscribe(topic,callback) {
        if (subscriptions[topic] == null) {
            subscriptions[topic] = [];
        }
        subscriptions[topic].push(callback);
    }

    function unsubscribe(topic,callback) {
        if (subscriptions[topic]) {
            for (var i=0;i<subscriptions[topic].length;i++) {
                if (subscriptions[topic][i] === callback) {
                    subscriptions[topic].splice(i,1);
                    break;
                }
            }
            if (subscriptions[topic].length === 0) {
                delete subscriptions[topic];
            }
        }
    }

    function getEvents() {
        homegear.invoke("getNodeEvents", function(message) {
            for(var nodeKey in message.result) {
                if (message.result.hasOwnProperty(nodeKey)) {
                    var node = message.result[nodeKey];
                    for(var topicKey in node) {
                        if (node.hasOwnProperty(topicKey)) {
                            var value = node[topicKey];
                            if(value.format && !value.format.match(/string/g)) value.msg = JSON.stringify(value.msg);
                            for (var t in subscriptions) {
                                if (subscriptions.hasOwnProperty(t)) {
                                    var re = new RegExp("^"+t.replace(/([\[\]\?\(\)\\\\$\^\*\.|])/g,"\\$1").replace(/\+/g,"[^/]+").replace(/\/#$/,"(\/.*)?")+"$");
                                    if (re.test(topicKey)) {
                                        var subscribers = subscriptions[t];
                                        if (subscribers) {
                                            for (var i=0;i<subscribers.length;i++) {
                                                subscribers[i](topicKey, value);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    return {
        homegear: getHomegear,
        connect: connectWS,
        subscribe: subscribe,
        unsubscribe: unsubscribe,
        getEvents: getEvents
    }
})();
