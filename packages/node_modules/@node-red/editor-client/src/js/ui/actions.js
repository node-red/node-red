RED.actions = (function() {
    var actions = {

    };

    function addAction(name,handler,options) {
        if (typeof handler !== 'function') {
            throw new Error("Action handler not a function");
        }
        if (actions[name]) {
            throw new Error("Cannot override existing action");
        }
        actions[name] = {
            handler: handler,
            options: options,
        };
    }
    function removeAction(name) {
        delete actions[name];
    }
    function getAction(name) {
        return actions[name].handler;
    }
    function getActionLabel(name) {
        let def = actions[name]
        if (!def) {
            return ''
        }
        if (!def.label) {
            var options = def.options;
            var key = options ? options.label : undefined;
            if (!key) {
                key = "action-list." +name.replace(/^.*:/,"");
            }
            var label = RED._(key);
            if (label === key) {
                // no translation. convert `name` to description
                label = name.replace(/(^.+:([a-z]))|(-([a-z]))/g, function() {
                    if (arguments[5] === 0) {
                        return arguments[2].toUpperCase();
                    } else {
                        return " "+arguments[4].toUpperCase();
                    }
                });
            }
            def.label = label;
        }
        return def.label
    }


    function invokeAction() {
        var args = Array.prototype.slice.call(arguments);
        var name = args.shift();
        if (actions.hasOwnProperty(name)) {
            var handler = actions[name].handler;
            handler.apply(null, args);
        }
    }
    function listActions() {
        var result = [];

        Object.keys(actions).forEach(function(action) {
            var def = actions[action];
            var shortcut = RED.keyboard.getShortcut(action);
            var isUser = false;
            if (shortcut) {
                isUser = shortcut.user;
            } else {
                isUser = !!RED.keyboard.getUserShortcut(action);
            }
            if (!def.label) {
                def.label = getActionLabel(action)
            }
            result.push({
                id:action,
                scope:shortcut?shortcut.scope:undefined,
                key:shortcut?shortcut.key:undefined,
                user:isUser,
                label: def.label,
                options: def.options,
            });
        });
        return result;
    }
    return {
        add: addAction,
        remove: removeAction,
        get: getAction,
        getLabel: getActionLabel,
        invoke: invokeAction,
        list: listActions
    }
})();
