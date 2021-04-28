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

const log = require("./lib/log");
const i18n = require("./lib/i18n");
const util = require("./lib/util");
const events = require("./lib/events");
const exec = require("./lib/exec");
const hooks = require("./lib/hooks");

/**
 * This module provides common utilities for the Node-RED runtime and editor
 *
 * @namespace @node-red/util
 */
module.exports = {
    /**
    * Initialise the module with the runtime settings
    * @param {Object} settings
    * @memberof @node-red/util
    */
    init: function(settings) {
        log.init(settings);
        i18n.init(settings);
    },

    /**
    * Logging utilities
    * @mixes @node-red/util_log
    * @memberof @node-red/util
    */
    log: log,

    /**
    * Internationalization utilities
    * @mixes @node-red/util_i18n
    * @memberof @node-red/util
    */
    i18n: i18n,

    /**
    * General utilities
    * @mixes @node-red/util_util
    * @memberof @node-red/util
    */
    util: util,

    /**
    * Runtime events
    * @mixes @node-red/util_event
    * @memberof @node-red/util
    */
    events: events,

    /**
    * Run system commands with event-log integration
    * @mixes @node-red/util_exec
    * @memberof @node-red/util
    */
    exec: exec,

    /**
    * Runtime hooks
    * @mixes @node-red/util_hooks
    * @memberof @node-red/util
    */
    hooks: hooks
}
