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

/**
 * This is the comms subsystem of the runtime.
 * @mixin @node-red/runtime_comms
 */

/**
 * A WebSocket connection between the runtime and the editor.
 * @typedef CommsConnection
 * @type {object}
 * @property {string} session - a unique session identifier
 * @property {Object} user - the user associated with the connection
 * @property {Function} send - publish a message to the connection
 */


var runtime;
var retained = {};
var connections = [];


function handleCommsEvent(event) {
    publish(event.topic,event.data,event.retain);
}
function handleStatusEvent(event) {
    var status = {
        text: event.status.text,
        fill: event.status.fill,
        shape: event.status.shape
    };
    publish("status/"+event.id,status,true);
}
function handleRuntimeEvent(event) {
    runtime.log.trace("runtime event: "+JSON.stringify(event));
    publish("notification/"+event.id,event.payload||{},event.retain);
}
function handleEventLog(event) {
    var type = event.payload.type;
    var id = event.id;
    if (event.payload.data) {
        var data = event.payload.data;
        if (data.endsWith('\n')) {
            data = data.substring(0,data.length-1);
        }
        var lines = data.split(/\n/);
        lines.forEach(line => {
            runtime.log.debug((type?("["+type+"] "):"")+line)
        })
    }
    publish("event-log/"+event.id,event.payload||{});
}

function publish(topic,data,retain) {
    if (retain) {
        retained[topic] = data;
    } else {
        delete retained[topic];
    }
    connections.forEach(connection => connection.send(topic,data))
}


var api = module.exports = {
    init: function(_runtime) {
        runtime = _runtime;
        connections = [];
        retained = {};
        runtime.events.removeListener("node-status",handleStatusEvent);
        runtime.events.on("node-status",handleStatusEvent);
        runtime.events.removeListener("runtime-event",handleRuntimeEvent);
        runtime.events.on("runtime-event",handleRuntimeEvent);
        runtime.events.removeListener("comms",handleCommsEvent);
        runtime.events.on("comms",handleCommsEvent);
        runtime.events.removeListener("event-log",handleEventLog);
        runtime.events.on("event-log",handleEventLog);
    },

    /**
    * Registers a new comms connection
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {CommsConnection} opts.client - the client connection
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_comms
    */
    addConnection: function(opts) {
        connections.push(opts.client);
        return Promise.resolve();
    },

    /**
    * Unregisters a comms connection
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {CommsConnection} opts.client - the client connection
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_comms
    */
    removeConnection: function(opts) {
        for (var i=0;i<connections.length;i++) {
            if (connections[i] === opts.client) {
                connections.splice(i,1);
                break;
            }
        }
        return Promise.resolve();
    },

    /**
    * Subscribes a comms connection to a given topic. Currently, all clients get
    * automatically subscribed to everything and cannot unsubscribe. Sending a subscribe
    * request will trigger retained messages to be sent.
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {CommsConnection} opts.client - the client connection
    * @param {String} opts.topic - the topic to subscribe to
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_comms
    */
    subscribe: function(opts) {
        var re = new RegExp("^"+opts.topic.replace(/([\[\]\?\(\)\\\\$\^\*\.|])/g,"\\$1").replace(/\+/g,"[^/]+").replace(/\/#$/,"(\/.*)?")+"$");
        for (var t in retained) {
            if (re.test(t)) {
                opts.client.send(t,retained[t]);
            }
        }
        return Promise.resolve();
    },

    /**
    * TODO: Unsubscribes a comms connection from a given topic
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @param {CommsConnection} opts.client - the client connection
    * @param {String} opts.topic - the topic to unsubscribe from
    * @return {Promise<Object>} - resolves when complete
    * @memberof @node-red/runtime_comms
    */
    unsubscribe: function(opts) {}
};
