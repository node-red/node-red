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
  * A user accessing the API
  * @typedef User
  * @type {object}
  */


/**
 * @namespace RED
 */
var api = module.exports = {
    init: function(runtime) {
        api.flows.init(runtime);
        api.nodes.init(runtime);
        api.settings.init(runtime);
        api.library.init(runtime);
    },

    /**
    * Auth module
    */
    auth: require("./auth"),

    /**
    * Comms module
    */
    comms: require("./comms"),

    /**
    * Flows module
    */
    flows: require("./flows"),

    /**
    * Library module
    */
    library: require("./library"),

    /**
    * Nodes module
    */
    nodes: require("./nodes"),

    /**
    * Settings module
    */
    settings: require("./settings")
}
