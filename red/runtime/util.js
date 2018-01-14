/**
 * Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

var clone = require("clone");
var jsonata = require("jsonata");

function generateId() {
    return (1+Math.random()*4294967295).toString(16);
}

function ensureString(o) {
    if (Buffer.isBuffer(o)) {
        return o.toString();
    } else if (typeof o === "object") {
        return JSON.stringify(o);
    } else if (typeof o === "string") {
        return o;
    }
    return ""+o;
}

function ensureBuffer(o) {
    if (Buffer.isBuffer(o)) {
        return o;
    } else if (typeof o === "object") {
        o = JSON.stringify(o);
    } else if (typeof o !== "string") {
        o = ""+o;
    }
    return new Buffer(o);
}

function cloneMessage(msg) {
    // Temporary fix for #97
    // TODO: remove this http-node-specific fix somehow
    var req = msg.req;
    var res = msg.res;
    delete msg.req;
    delete msg.res;
    var m = clone(msg);
    if (req) {
        m.req = req;
        msg.req = req;
    }
    if (res) {
        m.res = res;
        msg.res = res;
    }
    return m;
}

function compareObjects(obj1,obj2) {
    var i;
    if (obj1 === obj2) {
        return true;
    }
    if (obj1 == null || obj2 == null) {
        return false;
    }

    var isArray1 = Array.isArray(obj1);
    var isArray2 = Array.isArray(obj2);
    if (isArray1 != isArray2) {
        return false;
    }
    if (isArray1 && isArray2) {
        if (obj1.length !== obj2.length) {
            return false;
        }
        for (i=0;i<obj1.length;i++) {
            if (!compareObjects(obj1[i],obj2[i])) {
                return false;
            }
        }
        return true;
    }
    var isBuffer1 = Buffer.isBuffer(obj1);
    var isBuffer2 = Buffer.isBuffer(obj2);
    if (isBuffer1 != isBuffer2) {
        return false;
    }
    if (isBuffer1 && isBuffer2) {
        if (obj1.equals) {
            // For node 0.12+ - use the native equals
            return obj1.equals(obj2);
        } else {
            if (obj1.length !== obj2.length) {
                return false;
            }
            for (i=0;i<obj1.length;i++) {
                if (obj1.readUInt8(i) !== obj2.readUInt8(i)) {
                    return false;
                }
            }
            return true;
        }
    }

    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
        return false;
    }
    var keys1 = Object.keys(obj1);
    var keys2 = Object.keys(obj2);
    if (keys1.length != keys2.length) {
        return false;
    }
    for (var k in obj1) {
        /* istanbul ignore else */
        if (obj1.hasOwnProperty(k)) {
            if (!compareObjects(obj1[k],obj2[k])) {
                return false;
            }
        }
    }
    return true;
}

function normalisePropertyExpression(str) {
    // This must be kept in sync with validatePropertyExpression
    // in editor/js/ui/utils.js

    var length = str.length;
    if (length === 0) {
        throw new Error("Invalid property expression: zero-length");
    }
    var parts = [];
    var start = 0;
    var inString = false;
    var inBox = false;
    var quoteChar;
    var v;
    for (var i=0;i<length;i++) {
        var c = str[i];
        if (!inString) {
            if (c === "'" || c === '"') {
                if (i != start) {
                    throw new Error("Invalid property expression: unexpected "+c+" at position "+i);
                }
                inString = true;
                quoteChar = c;
                start = i+1;
            } else if (c === '.') {
                if (i===0) {
                    throw new Error("Invalid property expression: unexpected . at position 0");
                }
                if (start != i) {
                    v = str.substring(start,i);
                    if (/^\d+$/.test(v)) {
                        parts.push(parseInt(v));
                    } else {
                        parts.push(v);
                    }
                }
                if (i===length-1) {
                    throw new Error("Invalid property expression: unterminated expression");
                }
                // Next char is first char of an identifier: a-z 0-9 $ _
                if (!/[a-z0-9\$\_]/i.test(str[i+1])) {
                    throw new Error("Invalid property expression: unexpected "+str[i+1]+" at position "+(i+1));
                }
                start = i+1;
            } else if (c === '[') {
                if (i === 0) {
                    throw new Error("Invalid property expression: unexpected "+c+" at position "+i);
                }
                if (start != i) {
                    parts.push(str.substring(start,i));
                }
                if (i===length-1) {
                    throw new Error("Invalid property expression: unterminated expression");
                }
                // Next char is either a quote or a number
                if (!/["'\d]/.test(str[i+1])) {
                    throw new Error("Invalid property expression: unexpected "+str[i+1]+" at position "+(i+1));
                }
                start = i+1;
                inBox = true;
            } else if (c === ']') {
                if (!inBox) {
                    throw new Error("Invalid property expression: unexpected "+c+" at position "+i);
                }
                if (start != i) {
                    v = str.substring(start,i);
                    if (/^\d+$/.test(v)) {
                        parts.push(parseInt(v));
                    } else {
                        throw new Error("Invalid property expression: unexpected array expression at position "+start);
                    }
                }
                start = i+1;
                inBox = false;
            } else if (c === ' ') {
                throw new Error("Invalid property expression: unexpected ' ' at position "+i);
            }
        } else {
            if (c === quoteChar) {
                if (i-start === 0) {
                    throw new Error("Invalid property expression: zero-length string at position "+start);
                }
                parts.push(str.substring(start,i));
                // If inBox, next char must be a ]. Otherwise it may be [ or .
                if (inBox && !/\]/.test(str[i+1])) {
                    throw new Error("Invalid property expression: unexpected array expression at position "+start);
                } else if (!inBox && i+1!==length && !/[\[\.]/.test(str[i+1])) {
                    throw new Error("Invalid property expression: unexpected "+str[i+1]+" expression at position "+(i+1));
                }
                start = i+1;
                inString = false;
            }
        }

    }
    if (inBox || inString) {
        throw new Error("Invalid property expression: unterminated expression");
    }
    if (start < length) {
        parts.push(str.substring(start));
    }
    return parts;
}

function getMessageProperty(msg,expr) {
    var result = null;
    if (expr.indexOf('msg.')===0) {
        expr = expr.substring(4);
    }
    var msgPropParts = normalisePropertyExpression(expr);
    var m;
    msgPropParts.reduce(function(obj, key) {
        result = (typeof obj[key] !== "undefined" ? obj[key] : undefined);
        return result;
    }, msg);
    return result;
}

function setMessageProperty(msg,prop,value,createMissing) {
    if (typeof createMissing === 'undefined') {
        createMissing = (typeof value !== 'undefined');
    }
    if (prop.indexOf('msg.')===0) {
        prop = prop.substring(4);
    }
    var msgPropParts = normalisePropertyExpression(prop);
    var depth = 0;
    var length = msgPropParts.length;
    var obj = msg;
    var key;
    for (var i=0;i<length-1;i++) {
        key = msgPropParts[i];
        if (typeof key === 'string' || (typeof key === 'number' && !Array.isArray(obj))) {
            if (obj.hasOwnProperty(key)) {
                obj = obj[key];
            } else if (createMissing) {
                if (typeof msgPropParts[i+1] === 'string') {
                    obj[key] = {};
                } else {
                    obj[key] = [];
                }
                obj = obj[key];
            } else {
                return null;
            }
        } else if (typeof key === 'number') {
            // obj is an array
            if (obj[key] === undefined) {
                if (createMissing) {
                    if (typeof msgPropParts[i+1] === 'string') {
                        obj[key] = {};
                    } else {
                        obj[key] = [];
                    }
                    obj = obj[key];
                } else {
                    return null
                }
            } else {
                obj = obj[key];
            }
        }
    }
    key = msgPropParts[length-1];
    if (typeof value === "undefined") {
        if (typeof key === 'number' && Array.isArray(obj)) {
            obj.splice(key,1);
        } else {
            delete obj[key]
        }
    } else {
        obj[key] = value;
    }
}

function evaluateNodeProperty(value, type, node, msg) {
    if (type === 'str') {
        return ""+value;
    } else if (type === 'num') {
        return Number(value);
    } else if (type === 'json') {
        return JSON.parse(value);
    } else if (type === 're') {
        return new RegExp(value);
    } else if (type === 'date') {
        return Date.now();
    } else if (type === 'bin') {
        var data = JSON.parse(value);
        return Buffer.from(data);
    } else if (type === 'msg' && msg) {
        return getMessageProperty(msg,value);
    } else if (type === 'flow' && node) {
        return node.context().flow.get(value);
    } else if (type === 'global' && node) {
        return node.context().global.get(value);
    } else if (type === 'bool') {
        return /^true$/i.test(value);
    } else if (type === 'jsonata') {
        var expr = prepareJSONataExpression(value,node);
        return evaluateJSONataExpression(expr,msg);
    }
    return value;
}

function prepareJSONataExpression(value,node) {
    var expr = jsonata(value);
    expr.assign('flowContext',function(val) {
        return node.context().flow.get(val);
    });
    expr.assign('globalContext',function(val) {
        return node.context().global.get(val);
    });
    expr.registerFunction('clone', cloneMessage, '<(oa)-:o>');
    expr._legacyMode = /(^|[^a-zA-Z0-9_'"])msg([^a-zA-Z0-9_'"]|$)/.test(value);
    return expr;
}

function evaluateJSONataExpression(expr,msg) {
    var context = msg;
    if (expr._legacyMode) {
        context = {msg:msg};
    }
    return expr.evaluate(context);
}


function normaliseNodeTypeName(name) {
    var result = name.replace(/[^a-zA-Z0-9]/g, " ");
    result = result.trim();
    result = result.replace(/ +/g, " ");
    result = result.replace(/ ./g,
        function(s) {
            return s.charAt(1).toUpperCase();
        }
    );
    result = result.charAt(0).toLowerCase() + result.slice(1);
    return result;
}

module.exports = {
    ensureString: ensureString,
    ensureBuffer: ensureBuffer,
    cloneMessage: cloneMessage,
    compareObjects: compareObjects,
    generateId: generateId,
    getMessageProperty: getMessageProperty,
    setMessageProperty: setMessageProperty,
    evaluateNodeProperty: evaluateNodeProperty,
    normalisePropertyExpression: normalisePropertyExpression,
    normaliseNodeTypeName: normaliseNodeTypeName,
    prepareJSONataExpression: prepareJSONataExpression,
    evaluateJSONataExpression: evaluateJSONataExpression
};
