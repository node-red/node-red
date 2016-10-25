var RED = {};
$(function() {

    $("#debug-tab-clear").click(function() {
        $(".debug-message").remove();
        // messageCount = 0;
        // RED.nodes.eachNode(function(node) {
        //     node.highlighted = false;
        //     node.dirty = true;
        // });
        // RED.view.redraw();
    });


    function getTimestamp() {
        var d = new Date();
        return d.toLocaleString();
    }
    function sanitize(m) {
        return m.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    }
    window.addEventListener('message',function(evt) {
        console.log(evt.data);
        var o = evt.data;

        var msg = document.createElement("div");

        //var sourceNode = RED.nodes.node(o.id) || RED.nodes.node(o.z);

        // msg.onmouseover = function() {
        //     msg.style.borderRightColor = "#999";
        //     var n = RED.nodes.node(o.id) || RED.nodes.node(o.z);
        //     if (n) {
        //         n.highlighted = true;
        //         n.dirty = true;
        //     }
        //     RED.view.redraw();
        // };
        // msg.onmouseout = function() {
        //     msg.style.borderRightColor = "";
        //     var n = RED.nodes.node(o.id) || RED.nodes.node(o.z);
        //     if (n) {
        //         n.highlighted = false;
        //         n.dirty = true;
        //     }
        //     RED.view.redraw();
        // };
        // msg.onclick = function() {
        //     var node = RED.nodes.node(o.id) || RED.nodes.node(o.z);
        //     if (node) {
        //         RED.workspaces.show(node.z);
        //     }
        //
        // };
        //console.log(o);
        var name = sanitize(((o.name?o.name:o.id)||"").toString());
        var topic = sanitize((o.topic||"").toString());
        var property = sanitize(o.property?o.property:'');
        var payload = sanitize((o.msg||"").toString());
        var format = sanitize((o.format||"").toString());

        msg.className = 'debug-message'+(o.level?(' debug-message-level-'+o.level):'');
        msg.innerHTML = '<span class="debug-message-date">'+
                        getTimestamp()+'</span>'+
                        (name?'<span class="debug-message-name">'+name:'')+
                        '</span>';
        // NOTE: relying on function error to have a "type" that all other msgs don't
        if (o.hasOwnProperty("type") && (o.type === "function")) {
            var errorLvlType = 'error';
            var errorLvl = 20;
            if (o.hasOwnProperty("level") && o.level === 30) {
                errorLvl = 30;
                errorLvlType = 'warn';
            }
            msg.className = 'debug-message debug-message-level-' + errorLvl;
            msg.innerHTML += '<span class="debug-message-topic">function : (' + errorLvlType + ')</span>';
        } else {
            msg.innerHTML += '<span class="debug-message-topic">'+
                            (o.topic?topic+' : ':'')+
                            (o.property?'msg.'+property:'msg')+" : "+format+

                            '</span>';
        }
        if (format === 'Object' || /^array/.test(format) || format === 'boolean' || format === 'number' ) {
            payload = JSON.parse(payload);
        } else if (format === 'null') {
            payload = null;
        } else if (format === 'undefined') {
            payload = undefined;
        } else if (/^buffer/.test(format)) {
            var buffer = payload;
            payload = [];
            for (var c = 0; c < buffer.length; c += 2) {
                payload.push(parseInt(buffer.substr(c, 2), 16));
            }
        }
        var el = $('<span class="debug-message-payload"></span>').appendTo(msg);
        RED.debug.buildMessageElement(payload,true,format).appendTo(el);
        $("#debug-content").append(msg);
        $("#debug-content").scrollTop($("#debug-content")[0].scrollHeight);
    },false);
});
