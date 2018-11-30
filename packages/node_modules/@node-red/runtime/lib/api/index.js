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



var runtime;

var api = module.exports = {
    init: function(_runtime) {
        runtime = _runtime;
        api.comms.init(runtime);
        api.flows.init(runtime);
        api.nodes.init(runtime);
        api.settings.init(runtime);
        api.library.init(runtime);
        api.projects.init(runtime);
        api.context.init(runtime);
    },

    comms: require("./comms"),
    flows: require("./flows"),
    library: require("./library"),
    nodes: require("./nodes"),
    settings: require("./settings"),
    projects: require("./projects"),
    context: require("./context"),

    isStarted: function(opts) {
        return Promise.resolve(runtime.isStarted());
    },
    version: function(opts) {
        return Promise.resolve(runtime.version());
    }
}
