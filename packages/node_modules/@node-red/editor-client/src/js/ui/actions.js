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
    function invokeAction(name,args) {
        if (actions.hasOwnProperty(name)) {
            actions[name](args);
        }
    }
    function listActions() {
        var result = [];
        Object.keys(actions).forEach(function(action) {
            var shortcut = RED.keyboard.getShortcut(action);
            var isUser = false;
            if (shortcut) {
                isUser = shortcut.user;
            } else {
                isUser = !!RED.keyboard.getUserShortcut(action);
            }
            result.push({
                id:action,
                scope:shortcut?shortcut.scope:undefined,
                key:shortcut?shortcut.key:undefined,
                user:isUser
            })
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
