RED.hooks = (function() {

    var VALID_HOOKS = [

    ]

    var hooks = { }
    var labelledHooks = { }

    function add(hookId, callback) {
        var parts = hookId.split(".");
        var id = parts[0], label = parts[1];

        // if (VALID_HOOKS.indexOf(id) === -1) {
        //     throw new Error("Invalid hook '"+id+"'");
        // }
        if (label && labelledHooks[label] && labelledHooks[label][id]) {
            throw new Error("Hook "+hookId+" already registered")
        }
        var hookItem = {cb:callback, previousHook: null, nextHook: null }

        var tailItem = hooks[id];
        if (tailItem === undefined) {
            hooks[id] = hookItem;
        } else {
            while(tailItem.nextHook !== null) {
                tailItem = tailItem.nextHook
            }
            tailItem.nextHook = hookItem;
            hookItem.previousHook = tailItem;
        }

        if (label) {
            labelledHooks[label] = labelledHooks[label]||{};
            labelledHooks[label][id] = hookItem;
        }
    }
    function remove(hookId) {
        var parts = hookId.split(".");
        var id = parts[0], label = parts[1];
        if ( !label) {
            throw new Error("Cannot remove hook without label: "+hookId)
        }
        if (labelledHooks[label]) {
            if (id === "*") {
                // Remove all hooks for this label
                var hookList = Object.keys(labelledHooks[label]);
                for (var i=0;i<hookList.length;i++) {
                    removeHook(hookList[i],labelledHooks[label][hookList[i]])
                }
                delete labelledHooks[label];
            } else if (labelledHooks[label][id]) {
                removeHook(id,labelledHooks[label][id])
                delete labelledHooks[label][id];
                if (Object.keys(labelledHooks[label]).length === 0){
                    delete labelledHooks[label];
                }
            }
        }
    }

    function removeHook(id,hookItem) {
        var previousHook = hookItem.previousHook;
        var nextHook = hookItem.nextHook;

        if (previousHook) {
            previousHook.nextHook = nextHook;
        } else {
            hooks[id] = nextHook;
        }
        if (nextHook) {
            nextHook.previousHook = previousHook;
        }
        hookItem.removed = true;
        if (!previousHook && !nextHook) {
            delete hooks[id];
        }
    }

    function trigger(hookId, payload, done) {
        var hookItem = hooks[hookId];
        if (!hookItem) {
            if (done) {
                done();
            }
            return;
        }
        function callNextHook(err) {
            if (!hookItem || err) {
                if (done) { done(err) }
                return err;
            }
            if (hookItem.removed) {
                hookItem = hookItem.nextHook;
                return callNextHook();
            }
            var callback = hookItem.cb;
            if (callback.length === 1) {
                try {
                    let result = callback(payload);
                    if (result === false) {
                        // Halting the flow
                        if (done) { done(false) }
                        return result;
                    }
                    hookItem = hookItem.nextHook;
                    return callNextHook();
                } catch(e) {
                    console.warn(e);
                    if (done) { done(e);}
                    return e;
                }
            } else {
                // There is a done callback
                try {
                    callback(payload,function(result) {
                        if (result === undefined) {
                            hookItem = hookItem.nextHook;
                            callNextHook();
                        } else {
                            if (done) { done(result)}
                        }
                    })
                } catch(e) {
                    console.warn(e);
                    if (done) { done(e) }
                    return e;
                }
            }
        }

        return callNextHook();
    }

    function clear() {
        hooks = {}
        labelledHooks = {}
    }

    function has(hookId) {
        var parts = hookId.split(".");
        var id = parts[0], label = parts[1];
        if (label) {
            return !!(labelledHooks[label] && labelledHooks[label][id])
        }
        return !!hooks[id]
    }

    return {
        has: has,
        clear: clear,
        add: add,
        remove: remove,
        trigger: trigger
    }
})();
