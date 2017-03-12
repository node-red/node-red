(function() {
    function indentLine(str,length) {
        if (length <= 0) {
            return str;
        }
        var i = (new Array(length)).join(" ");
        str = str.replace(/^\s*/,i);
        return str;
    }
    function formatExpression(str) {
        var length = str.length;
        var start = 0;
        var inString = false;
        var inBox = false;
        var quoteChar;
        var list = [];
        var stack = [];
        var frame;
        var v;
        var matchingBrackets = {
            "(":")",
            "[":"]",
            "{":"}"
        }
        for (var i=0;i<length;i++) {
            var c = str[i];
            if (!inString) {
                if (c === "'" || c === '"') {
                    inString = true;
                    quoteChar = c;
                    frame = {type:"string",pos:i};
                    list.push(frame);
                    stack.push(frame);
                } else if (c === ";") {
                    frame = {type:";",pos:i};
                    list.push(frame);
                } else if (c === ",") {
                    frame = {type:",",pos:i};
                    list.push(frame);
                } else if (/[\(\[\{]/.test(c)) {
                    frame = {type:"open-block",char:c,pos:i};
                    list.push(frame);
                    stack.push(frame);
                } else if (/[\}\)\]]/.test(c)) {
                    var oldFrame = stack.pop();
                    if (matchingBrackets[oldFrame.char] !== c) {
                        //console.log("Stack frame mismatch",c,"at",i,"expected",matchingBrackets[oldFrame.char],"from",oldFrame.pos);
                        return str;
                    }
                    //console.log("Closing",c,"at",i,"compare",oldFrame.type,oldFrame.pos);
                    oldFrame.width = i-oldFrame.pos;
                    frame = {type:"close-block",pos:i,char:c,width:oldFrame.width}
                    list.push(frame);
                }
            } else {
                if (c === quoteChar) {
                    // Next char must be a ]
                    inString = false;
                    stack.pop();
                }
            }

        }
        // console.log(stack);
        var result = str;
        var indent = 0;
        var offset = 0;
        var pre,post,indented;
        var longStack = [];
        list.forEach(function(f) {
            if (f.type === ";" || f.type === ",") {
                if (longStack[longStack.length-1]) {
                    pre = result.substring(0,offset+f.pos+1);
                    post = result.substring(offset+f.pos+1);
                    indented = indentLine(post,indent);
                    result = pre+"\n"+indented;
                    offset += indented.length-post.length+1;
                }
            } else if (f.type === "open-block") {
                if (f.width > 30) {
                    longStack.push(true);
                    indent += 4;
                    pre = result.substring(0,offset+f.pos+1);
                    post = result.substring(offset+f.pos+1);
                    indented = indentLine(post,indent);
                    result = pre+"\n"+indented;
                    offset += indented.length-post.length+1;
                } else {
                    longStack.push(false);
                }
            } else if (f.type === "close-block") {
                if (f.width > 30) {
                    indent -= 4;
                    pre = result.substring(0,offset+f.pos);
                    post = result.substring(offset+f.pos);
                    indented = indentLine(post,indent);
                    result = pre+"\n"+indented;
                    offset += indented.length-post.length+1;
                }
                longStack.pop();
            }
        })
        //console.log(result);
        return result;
    }

    jsonata.format = formatExpression;
    jsonata.functions =
    {
        '$append':{ args:['array','array'] },
        '$average':{ args:['value'] },
        '$boolean':{ args:['value'] },
        '$contains':{ args:['str','pattern']},
        '$count':{ args:['array'] },
        '$exists':{ args:['value'] },
        '$join':{ args:['array','separator'] },
        '$keys':{ args:['object'] },
        '$length':{ args:['string'] },
        '$lookup':{ args:['object','key'] },
        '$lowercase':{ args:['string'] },
        '$match':{ args:['str','pattern','limit']},
        '$map':{ args:[] },
        '$max':{ args:['array'] },
        '$min':{ args:['array'] },
        '$not':{ args:['value'] },
        '$number':{ args:['value'] },
        '$reduce':{ args:[] },
        '$replace':{ args:['str','pattern','replacement','limit']},
        '$split':{ args:['string','separator','limit'] },
        '$spread':{ args:['object'] },
        '$string':{ args:['value'] },
        '$substring':{ args:['string','start','length'] },
        '$substringAfter':{ args:['string','chars'] },
        '$substringBefore':{ args:['string','chars'] },
        '$sum':{ args:['array'] },
        '$trim': { args:['str'] },
        '$uppercase':{ args:['string'] }
    }
    jsonata.getFunctionSnippet = function(fn) {
        var snippetText = "";
        if (jsonata.functions.hasOwnProperty(fn)) {
            var def = jsonata.functions[fn];
            snippetText = "\\"+fn+"(";
            if (def.args) {
                snippetText += def.args.map(function(a,i) { return "${"+(i+1)+":"+a+"}"}).join(", ");
            }
            snippetText += ")\n"
        }
        return snippetText;
    }
})();
