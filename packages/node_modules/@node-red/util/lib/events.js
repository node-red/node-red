/*!
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
  * Runtime events
  * @mixin @node-red/util_events
  */

const events = new (require("events")).EventEmitter();


const deprecatedEvents = {
    "nodes-stopped": "flows:stopped",
    "nodes-started": "flows:started"
}

function wrapEventFunction(obj,func) {
    events["_"+func] = events[func];
    return function(eventName, listener) {
        if (deprecatedEvents.hasOwnProperty(eventName)) {
            const log = require("@node-red/util").log;

            const stack = (new Error().stack).split("\n");
            let location = "(unknown)"
            // See https://github.com/node-red/node-red/issues/3292
            if (stack.length > 2) {
                location = stack[2].split("(")[1].slice(0,-1);
            }
            log.warn(`[RED.events] Deprecated use of "${eventName}" event from "${location}". Use "${deprecatedEvents[eventName]}" instead.`)
        }
        return events["_"+func].call(events,eventName,listener)
    }
}


events.on = wrapEventFunction(events,"on");
events.once = wrapEventFunction(events,"once");
events.addListener = events.on;



module.exports = events;

/**
 * Runtime events emitter
 * @mixin @node-red/util_events
 */

/**
 * Register an event listener for a runtime event
 * @name on
 * @function
 * @memberof @node-red/util_events
 * @param {String} eventName - the name of the event to listen to
 * @param {Function} listener - the callback function for the event
 */

 /**
  * Emit an event to all of its registered listeners
  * @name emit
  * @function
  * @memberof @node-red/util_events
  * @param {String} eventName - the name of the event to emit
  * @param {any} ...args - the arguments to pass in the event
  * @return {Boolean} - whether the event had listeners or not
  */
