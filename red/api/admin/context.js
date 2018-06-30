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

var log;
var redNodes;
var util;

module.exports = {
    init: function(runtime) {
        redNodes = runtime.nodes;
        log = runtime.log;
        util = runtime.util;
    },

    get: function(req,res) {
        var scope = req.params.scope;
        var id = req.params.id;
        var key = req.params[0];
        var result = {};
        var ctx;
        if (scope === 'global') {
            ctx = redNodes.getContext('global');
        } else if (scope === 'flow') {
            ctx = redNodes.getContext(id);
        } else if (scope === 'node') {
            var node = redNodes.getNode(id);
            if (node) {
                ctx = node.context();
            }
        }
        if (ctx) {
            if (key) {
                result = util.encodeObject({msg:ctx.get(key)});
            } else {
                var keys = ctx.keys();

                var i = 0;
                var l = keys.length;
                while(i < l) {
                    var k = keys[i];
                    result[k] = util.encodeObject({msg:ctx.get(k)});
                    i++;
                }
            }
        }
        res.json(result);
    }
}
