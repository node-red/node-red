RED.actions = (function() {
    var actions = {

    }

    function addAction(name,handler) {
        actions[name] = handler;
    }
    function removeAction(name) {
        delete actions[name];
    }
    function getAction(name) {
        return actions[name];
    }
    function invokeAction(name) {
        if (actions.hasOwnProperty(name)) {
            actions[name]();
        }
    }
    function listActions() {
        var result = [];
        Object.keys(actions).forEach(function(action) {
            var shortcut = RED.keyboard.getShortcut(action);
            result.push({id:action,scope:shortcut?shortcut.scope:undefined,key:shortcut?shortcut.key:undefined})
        })
        return result;
    }
    return {
        add: addAction,
        remove: removeAction,
        get: getAction,
        invoke: invokeAction,
        list: listActions
    }
})();
