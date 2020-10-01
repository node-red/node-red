const Log = require("@node-red/util").log;

const VALID_HOOKS = [
    // Message Routing Path
   "onSend",
   "preRoute",
   "preDeliver",
   "postDeliver",
   "onReceive",
   "postReceive",
   "onComplete"
]


// Flags for what hooks have handlers registered
let states = { }

// Hooks by id
let hooks = { }

// Hooks by label
let labelledHooks = { }

/**
 * Runtime hooks engine
 *
 * The following hooks can be used:
 *
 * Message sending
 *  - `onSend` - passed an array of `SendEvent` objects. The messages inside these objects are exactly what the node has passed to `node.send` - meaning there could be duplicate references to the same message object.
 *  - `preRoute` - passed a `SendEvent`
 *  - `preDeliver` - passed a `SendEvent`. The local router has identified the node it is going to send to. At this point, the message has been cloned if needed.
 *  - `postDeliver` - passed a `SendEvent`. The message has been dispatched to be delivered asynchronously (unless the sync delivery flag is set, in which case it would be continue as synchronous delivery)
 *  - `onReceive` - passed a `ReceiveEvent` when a node is about to receive a message
 *  - `postReceive` - passed a `ReceiveEvent` when the message has been given to the node's `input` handler(s)
 *  - `onComplete` - passed a `CompleteEvent` when the node has completed with a message or logged an error
 *
 * @mixin @node-red/runtime_hooks
 */

/**
 * Register a handler to a named hook
 * @memberof @node-red/runtime_hooks
 * @param {String} hookId - the name of the hook to attach to
 * @param {Function} callback - the callback function for the hook
 */
function add(hookId, callback) {
    let [id, label] = hookId.split(".");
    if (VALID_HOOKS.indexOf(id) === -1) {
        throw new Error(`Invalid hook '${id}'`);
    }
    if (label) {
        if (labelledHooks[label] && labelledHooks[label][id]) {
            throw new Error("Hook "+hookId+" already registered")
        }
        labelledHooks[label] = labelledHooks[label]||{};
        labelledHooks[label][id] = callback;
    }
    // Get location of calling code
    const stack = new Error().stack;
    const callModule = stack.split("\n")[2].split("(")[1].slice(0,-1);
    Log.debug(`Adding hook '${hookId}' from ${callModule}`);

    hooks[id] = hooks[id] || [];
    hooks[id].push({cb:callback,location:callModule});
    states[id] = true;
}

/**
 * Remove a handled from a named hook
 * @memberof @node-red/runtime_hooks
 * @param {String} hookId - the name of the hook event to remove - must be `name.label`
 */
function remove(hookId) {
    let [id,label] = hookId.split(".");
    if ( !label) {
        throw new Error("Cannot remove hook without label: ",hookId)
    }
    Log.debug(`Removing hook '${hookId}'`);
    if (labelledHooks[label]) {
        if (id === "*") {
            // Remove all hooks for this label
            let hookList = Object.keys(labelledHooks[label]);
            for (let i=0;i<hookList.length;i++) {
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

function removeHook(id,callback) {
    let i = hooks[id].findIndex(hook => hook.cb === callback);
    if (i !== -1) {
        hooks[id].splice(i,1);
        if (hooks[id].length === 0) {
            delete hooks[id];
            delete states[id];
        }
    }
}


function trigger(hookId, payload, done) {
    const hookStack = hooks[hookId];
    if (!hookStack || hookStack.length === 0) {
        done();
        return;
    }
    let i = 0;

    function callNextHook(err) {
        if (i === hookStack.length || err) {
            done(err);
            return;
        }
        const hook = hookStack[i++];
        const callback = hook.cb;
        if (callback.length === 1) {
            try {
                let result = callback(payload);
                if (result === false) {
                    // Halting the flow
                    done(false);
                    return
                }
                if (result && typeof result.then === 'function') {
                    result.then(handleResolve, callNextHook)
                    return;
                }
                callNextHook();
            } catch(err) {
                done(err);
                return;
            }
        } else {
            try {
                callback(payload,handleResolve)
            } catch(err) {
                done(err);
                return;
            }
        }
    }
    callNextHook();

    function handleResolve(result) {
        if (result === undefined) {
            callNextHook();
        } else {
            done(result);
        }
    }
}

function clear() {
    hooks = {}
    labelledHooks = {}
    states = {}
}

function has(hookId) {
    let [id, label] = hookId.split(".");
    if (label) {
        return !!(labelledHooks[label] && labelledHooks[label][id])
    }
    return !!states[id]
}

module.exports = {
    has,
    clear,
    add,
    remove,
    trigger
}