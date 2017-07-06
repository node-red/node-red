$(function() {
    RED.i18n.init(function() {
        var options = {
            messageMouseEnter: function(sourceId) {
                window.opener.postMessage({event:"mouseEnter",id:sourceId},'*');
            },
            messageMouseLeave: function(sourceId) {
                window.opener.postMessage({event:"mouseLeave",id:sourceId},'*');
            },
            messageSourceClick: function(sourceId) {
                window.opener.postMessage({event:"mouseClick",id:sourceId},'*');
            },
            clear: function() {
                window.opener.postMessage({event:"clear"},'*');
            }
        }

        var uiComponents = RED.debug.init(options);

        $(".debug-window").append(uiComponents.content);

        window.addEventListener('message',function(evt) {
            if (evt.data.event === "message") {
                RED.debug.handleDebugMessage(evt.data.msg);
            } else if (evt.data.event === "workspaceChange") {
                RED.debug.refreshMessageList(evt.data.activeWorkspace);
            }
        },false);
    })
});
