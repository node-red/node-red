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
        if (format !== 'Object') {
            msg.innerHTML += '<span class="debug-message-payload">'+ payload+ '</span>';
        } else {
            var el = $('<span class="debug-message-payload"></span>').appendTo(msg);
            buildMessageElement(JSON.parse(payload),true).appendTo(el);
        }
        $("#debug-content").append(msg);
        $("#debug-content").scrollTop($("#debug-content")[0].scrollHeight);
    },false);

    function buildMessageElement(obj,topLevel) {
        var i;
        var e;
        var entryObj;
        var header;
        var element = $('<span class="debug-message-element"></span>').toggleClass('collapsed',topLevel);
        if (Array.isArray(obj)) {
            $('<span>').html('Array['+obj.length+']').appendTo(element);
            var length = Math.min(obj.length,10);
            for (i=0;i<length;i++) {
                entryObj = $('<div class="debug-message-object-entry collapsed"></div>').appendTo(element);
                header = $('<span></span>').appendTo(entryObj);
                if (typeof obj[i] === 'object' && obj[i] !== null) {
                    $('<i class="fa fa-caret-right debug-message-object-handle"></i> ').appendTo(header);
                    header.addClass("debug-message-expandable");
                    header.click(function(e) {
                        $(this).parent().toggleClass('collapsed');
                    });
                }
                $('<span class="debug-message-object-key"></span>').text(i).appendTo(header);
                $('<span>: </span>').appendTo(entryObj);
                e = $('<span class="debug-message-object-value"></span>').appendTo(entryObj);
                buildMessageElement(obj[i],false).appendTo(e);
            }
            if (length < obj.length) {
                $('<div class="debug-message-object-entry"><span class="debug-message-object-key">...</span></div>').appendTo(element);
            }
        } else if (obj === null) {
            $('<span class="debug-message-object-value debug-message-type-null">null</span>').appendTo(element);
        } else if (typeof obj === 'object') {

            header = $('<span>').html((topLevel?(JSON.stringify(obj,2).substring(0,200)):'Object')).appendTo(element);
            if (topLevel) {
                $('<i class="fa fa-caret-right debug-message-object-handle"></i> ').prependTo(header);
                header.addClass("debug-message-expandable");
                header.click(function(e) {
                    $(this).parent().toggleClass('collapsed');
                });
            }
            var keys = Object.keys(obj);
            for (i=0;i<keys.length;i++) {
                entryObj = $('<div class="debug-message-object-entry collapsed"></div>').appendTo(element);
                header = $('<span></span>').appendTo(entryObj);
                if (typeof obj[keys[i]] === 'object' && obj[keys[i]] !== null) {
                    $('<i class="fa fa-caret-right debug-message-object-handle"></i> ').appendTo(header);
                    header.addClass("debug-message-expandable");
                    header.click(function(e) {
                        $(this).parent().toggleClass('collapsed');
                    });
                }
                $('<span class="debug-message-object-key"></span>').text(keys[i]).appendTo(header);
                $('<span>: </span>').appendTo(header);
                e = $('<span class="debug-message-object-value"></span>').appendTo(entryObj);
                buildMessageElement(obj[keys[i]],false).appendTo(e);
            }
        } else if (typeof obj === 'string') {
            $('<span class="debug-message-object-value debug-message-type-string"></span>').text('"'+obj+'"').appendTo(element);
        } else {
            $('<span class="debug-message-object-value debug-message-type-other"></span>').text(""+obj).appendTo(element);
        }
        return element;
    }
});
