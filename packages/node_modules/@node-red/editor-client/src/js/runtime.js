RED.runtime = (function() {
    let state = ""
    let settings = { ui: false, enabled: false };
    const STOPPED = "stop"
    const STARTED = "start"
    const SAFE = "safe"

    return {
        init: function() {
            // refresh the current runtime status from server
            settings = Object.assign({}, settings, RED.settings.runtimeState);
            RED.events.on("runtime-state", function(msg) {
                if (msg.state) {
                    const currentState = state
                    state = msg.state
                    $(".red-ui-flow-node-button").toggleClass("red-ui-flow-node-button-stopped", state !== STARTED)
                    if(settings.enabled === true && settings.ui === true) {
                        RED.menu.setVisible("deploymenu-item-runtime-stop", state === STARTED)
                        RED.menu.setVisible("deploymenu-item-runtime-start", state !== STARTED)
                    }
                    // Do not notify the user about this event if:
                    // - This is the very first event we've received after loading the editor (currentState = '')
                    // - The state matches what we already thought was the case (state === currentState)
                    // - The event was triggered by a deploy (msg.deploy === true)
                    // - The event is a safe mode event - that gets notified separately
                    if (currentState !== '' && state !== currentState && !msg.deploy && state !== SAFE) {
                        RED.notify(RED._("notification.state.flows"+(state === STOPPED?'Stopped':'Started'), msg), "success")
                    }
                }
            });
        },
        get started() {
            return state === STARTED
        }
    }
})()
