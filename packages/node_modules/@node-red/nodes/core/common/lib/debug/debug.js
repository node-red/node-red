$(function() {
    RED.i18n.init({apiRootUrl:"../../"},function() {
        var options = {
            messageMouseEnter: function(sourceId) {
                window.opener.postMessage({event:"mouseEnter",id:sourceId},'*');
            },
            messageMouseLeave: function(sourceId) {
                window.opener.postMessage({event:"mouseLeave",id:sourceId},'*');
            },
            messageSourceClick: function(sourceId, aliasId, path) {
                window.opener.postMessage({event:"mouseClick",id:sourceId, _alias: aliasId, path: path},'*');
            },
            clear: function() {
                window.opener.postMessage({event:"clear"},'*');
            },
            requestDebugNodeList: function(filteredNodes) {
                window.opener.postMessage({event: 'requestDebugNodeList', filteredNodes},'*')
            }
        }

        try {
            var uiComponents = RED.debug.init(options);
            $(".red-ui-debug-window").append(uiComponents.content);

            window.addEventListener('message',function(evt) {
                if (evt.data.event === "message") {
                    RED.debug.handleDebugMessage(evt.data.msg);
                } else if (evt.data.event === "workspaceChange") {
                    RED.debug.refreshMessageList(evt.data.activeWorkspace);
                } else if (evt.data.event === "projectChange") {
                    RED.debug.clearMessageList(true);
                } else if (evt.data.event === "refreshDebugNodeList") {
                    RED.debug.refreshDebugNodeList(evt.data.nodes)
                }
            },false);
        } catch(err) {
            console.error(err)
        }

    })
});
