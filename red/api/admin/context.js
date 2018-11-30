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
var settings;

function exportContextStore(scope,ctx, store, result, callback) {
    ctx.keys(store,function(err, keys) {
        if (err) {
            return callback(err);
        }
        result[store] = {};
        var c = keys.length;
        if (c === 0) {
            callback(null);
        } else {
            keys.forEach(function(key) {
                ctx.get(key,store,function(err, v) {
                    if (err) {
                        return callback(err);
                    }
                    if (scope !== 'global' ||
                        store === redNodes.listContextStores().default ||
                        !settings.hasOwnProperty("functionGlobalContext") ||
                        !settings.functionGlobalContext.hasOwnProperty(key) ||
                        settings.functionGlobalContext[key] !== v) {
                            result[store][key] = util.encodeObject({msg:v});
                    }
                    c--;
                    if (c === 0) {
                        callback(null);
                    }
                });
            });
        }
    });
}

module.exports = {
    init: function(runtime) {
        redNodes = runtime.nodes;
        log = runtime.log;
        util = runtime.util;
        settings = runtime.settings;
    },

    get: function(req,res) {
        var scope = req.params.scope;
        var id = req.params.id;
        var key = req.params[0];
        var availableStores = redNodes.listContextStores();
        //{ default: 'default', stores: [ 'default', 'file' ] }
        var store = req.query['store'];
        if (store && availableStores.stores.indexOf(store) === -1) {
            return res.status(404).end();
        }
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
                store = store || availableStores.default;
                ctx.get(key,store,function(err, v) {
                    var encoded = util.encodeObject({msg:v});
                    if (store !== availableStores.default) {
                        encoded.store = store;
                    }
                    res.json(encoded);
                });
                return;
            } else {
                var stores;
                if (!store) {
                    stores = availableStores.stores;
                } else {
                    stores = [store];
                }

                var result = {};
                var c = stores.length;
                var errorReported = false;
                stores.forEach(function(store) {
                    exportContextStore(scope,ctx,store,result,function(err) {
                        if (err) {
                            // TODO: proper error reporting
                            if (!errorReported) {
                                errorReported = true;
                                res.end(400);
                            }
                            return;
                        }
                        c--;
                        if (c === 0) {
                            if (!errorReported) {
                                if (stores.length > 1 && scope === 'global') {
                                }
                                res.json(result);
                            }
                        }
                    });
                })



            }
        } else {
            res.json({});
        }
    }
}
