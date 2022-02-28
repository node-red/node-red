const Log = require("./log.js");

const VALID_HOOKS = [
    // Message Routing Path
   "onSend",
   "preRoute",
   "preDeliver",
   "postDeliver",
   "onReceive",
   "postReceive",
   "onComplete",
   // Module install hooks
   "preInstall",
   "postInstall",
   "preUninstall",
   "postUninstall"
]


// Flags for what hooks have handlers registered
let states = { }

// Doubly-LinkedList of hooks by id.
// - hooks[id] points to head of list
// - each list item looks like:
//   {
//       cb: the callback function
//       location: filename/line of code that added the hook
//       previousHook: reference to previous hook in list
//       nextHook: reference to next hook in list
//       removed: a flag that is set if the item was removed
//   }
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
 * @mixin @node-red/util_hooks
 */

/**
 * Register a handler to a named hook
 * @memberof @node-red/util_hooks
 * @param {String} hookId - the name of the hook to attach to
 * @param {Function} callback - the callback function for the hook
 */
function add(hookId, callback) {
    let [id, label] = hookId.split(".");
    if (VALID_HOOKS.indexOf(id) === -1) {
        throw new Error(`Invalid hook '${id}'`);
    }
    if (label && labelledHooks[label] && labelledHooks[label][id]) {
        throw new Error("Hook "+hookId+" already registered")
    }
    // Get location of calling code
    let callModule;
    const stack = new Error().stack;
    const stackEntries = stack.split("\n").slice(1);//drop 1st line (error message)
    const stackEntry2 = stackEntries[1];//get 2nd stack entry
    if (stackEntry2) {
        try {
            if (stackEntry2.indexOf(" (") >= 0) {
                callModule = stackEntry2.split("(")[1].slice(0, -1);
            } else {
                callModule = stackEntry2.split(" ").slice(-1)[0];
            }
        } catch (error) {
            Log.debug(`Unable to determined module when adding hook '${hookId}'. Stack:\n${stackEntries.join("\n")}`);
            callModule = "unknown:0:0";
        }
    } else {
        Log.debug(`Unable to determined module when adding hook '${hookId}'. Stack:\n${stackEntries.join("\n")}`);
        callModule = "unknown:0:0";
    }
    Log.debug(`Adding hook '${hookId}' from ${callModule}`);

    const hookItem = {cb:callback, location: callModule, previousHook: null, nextHook: null }

    let tailItem = hooks[id];
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

    // TODO: get rid of this;
    states[id] = true;
}

/**
 * Remove a handled from a named hook
 * @memberof @node-red/util_hooks
 * @param {String} hookId - the name of the hook event to remove - must be `name.label`
 */
function remove(hookId) {
    let [id,label] = hookId.split(".");
    if ( !label) {
        throw new Error("Cannot remove hook without label: "+hookId)
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

function removeHook(id,hookItem) {
    let previousHook = hookItem.previousHook;
    let nextHook = hookItem.nextHook;

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
        delete states[id];
    }
}


function trigger(hookId, payload, done) {
    let hookItem = hooks[hookId];
    if (!hookItem) {
        if (done) {
            done();
            return;
        } else {
            return Promise.resolve();
        }
    }
    if (!done) {
        return new Promise((resolve,reject) => {
            invokeStack(hookItem,payload,function(err) {
                if (err !== undefined && err !== false) {
                    if (!(err instanceof Error)) {
                        err = new Error(err);
                    }
                    err.hook = hookId
                    reject(err);
                } else {
                    resolve(err);
                }
            })
        });
    } else {
        invokeStack(hookItem,payload,done)
    }
}
function invokeStack(hookItem,payload,done) {
    function callNextHook(err) {
        if (!hookItem || err) {
            done(err);
            return;
        }
        if (hookItem.removed) {
            hookItem = hookItem.nextHook;
            callNextHook();
            return;
        }
        const callback = hookItem.cb;
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
                hookItem = hookItem.nextHook;
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
    function handleResolve(result) {
        if (result === undefined) {
            hookItem = hookItem.nextHook;
            callNextHook();
        } else {
            done(result);
        }
    }
    callNextHook();
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
