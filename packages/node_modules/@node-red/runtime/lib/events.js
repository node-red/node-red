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

var events = require("events");

module.exports = new events.EventEmitter();

/**
 * Runtime events emitter
 * @mixin @node-red/runtime_events
 */

/**
 * Register an event listener for a runtime event
 * @name on
 * @function
 * @memberof @node-red/runtime_events
 * @param {String} eventName - the name of the event to listen to
 * @param {Function} listener - the callback function for the event
 */

 /**
  * Emit an event to all of its registered listeners
  * @name emit
  * @function
  * @memberof @node-red/runtime_events
  * @param {String} eventName - the name of the event to emit
  * @param {any} ...args - the arguments to pass in the event
  * @return {Boolean} - whether the event had listeners or not
  */
