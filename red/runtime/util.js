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
var safeJSONStringify = require("json-stringify-safe");
var util = require("util");

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

function createError(code, message) {
    var e = new Error(message);
    e.code = code;
    return e;
}

function normalisePropertyExpression(str) {
    // This must be kept in sync with validatePropertyExpression
    // in editor/js/ui/utils.js

    var length = str.length;
    if (length === 0) {
        throw createError("INVALID_EXPR","Invalid property expression: zero-length");
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
                    throw createError("INVALID_EXPR","Invalid property expression: unexpected "+c+" at position "+i);
                }
                inString = true;
                quoteChar = c;
                start = i+1;
            } else if (c === '.') {
                if (i===0) {
                    throw createError("INVALID_EXPR","Invalid property expression: unexpected . at position 0");
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
                    throw createError("INVALID_EXPR","Invalid property expression: unterminated expression");
                }
                // Next char is first char of an identifier: a-z 0-9 $ _
                if (!/[a-z0-9\$\_]/i.test(str[i+1])) {
                    throw createError("INVALID_EXPR","Invalid property expression: unexpected "+str[i+1]+" at position "+(i+1));
                }
                start = i+1;
            } else if (c === '[') {
                if (i === 0) {
                    throw createError("INVALID_EXPR","Invalid property expression: unexpected "+c+" at position "+i);
                }
                if (start != i) {
                    parts.push(str.substring(start,i));
                }
                if (i===length-1) {
                    throw createError("INVALID_EXPR","Invalid property expression: unterminated expression");
                }
                // Next char is either a quote or a number
                if (!/["'\d]/.test(str[i+1])) {
                    throw createError("INVALID_EXPR","Invalid property expression: unexpected "+str[i+1]+" at position "+(i+1));
                }
                start = i+1;
                inBox = true;
            } else if (c === ']') {
                if (!inBox) {
                    throw createError("INVALID_EXPR","Invalid property expression: unexpected "+c+" at position "+i);
                }
                if (start != i) {
                    v = str.substring(start,i);
                    if (/^\d+$/.test(v)) {
                        parts.push(parseInt(v));
                    } else {
                        throw createError("INVALID_EXPR","Invalid property expression: unexpected array expression at position "+start);
                    }
                }
                start = i+1;
                inBox = false;
            } else if (c === ' ') {
                throw createError("INVALID_EXPR","Invalid property expression: unexpected ' ' at position "+i);
            }
        } else {
            if (c === quoteChar) {
                if (i-start === 0) {
                    throw createError("INVALID_EXPR","Invalid property expression: zero-length string at position "+start);
                }
                parts.push(str.substring(start,i));
                // If inBox, next char must be a ]. Otherwise it may be [ or .
                if (inBox && !/\]/.test(str[i+1])) {
                    throw createError("INVALID_EXPR","Invalid property expression: unexpected array expression at position "+start);
                } else if (!inBox && i+1!==length && !/[\[\.]/.test(str[i+1])) {
                    throw createError("INVALID_EXPR","Invalid property expression: unexpected "+str[i+1]+" expression at position "+(i+1));
                }
                start = i+1;
                inString = false;
            }
        }

    }
    if (inBox || inString) {
        throw new createError("INVALID_EXPR","Invalid property expression: unterminated expression");
    }
    if (start < length) {
        parts.push(str.substring(start));
    }
    return parts;
}

function getMessageProperty(msg,expr) {
    if (expr.indexOf('msg.')===0) {
        expr = expr.substring(4);
    }
    return getObjectProperty(msg,expr);
}
function getObjectProperty(msg,expr) {
    var result = null;
    var msgPropParts = normalisePropertyExpression(expr);
    var m;
    msgPropParts.reduce(function(obj, key) {
        result = (typeof obj[key] !== "undefined" ? obj[key] : undefined);
        return result;
    }, msg);
    return result;
}

function setMessageProperty(msg,prop,value,createMissing) {
    if (prop.indexOf('msg.')===0) {
        prop = prop.substring(4);
    }
    return setObjectProperty(msg,prop,value,createMissing);
}
function setObjectProperty(msg,prop,value,createMissing) {
    if (typeof createMissing === 'undefined') {
        createMissing = (typeof value !== 'undefined');
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
                    return null;
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

function evaluateEnvProperty(value) {
    if (/^\${[^}]+}$/.test(value)) {
        // ${ENV_VAR}
        value = value.substring(2,value.length-1);
        value = process.env.hasOwnProperty(value)?process.env[value]:""
    } else if (!/\${\S+}/.test(value)) {
        // ENV_VAR
        value = process.env.hasOwnProperty(value)?process.env[value]:""
    } else {
        // FOO${ENV_VAR}BAR
        value = value.replace(/\${([^}]+)}/g, function(match, v) {
            return process.env.hasOwnProperty(v)?process.env[v]:""
        });
    }
    return value;
}

var parseContextStore = function(key) {
    var parts = {};
    var m = /^#:\((\S+?)\)::(.*)$/.exec(key);
    if (m) {
        parts.store = m[1];
        parts.key = m[2];
    } else {
        parts.key = key;
    }
    return parts;
}

function evaluateNodeProperty(value, type, node, msg, callback) {
    var result = value;
    if (type === 'str') {
        result = ""+value;
    } else if (type === 'num') {
        result = Number(value);
    } else if (type === 'json') {
        result = JSON.parse(value);
    } else if (type === 're') {
        result = new RegExp(value);
    } else if (type === 'date') {
        result = Date.now();
    } else if (type === 'bin') {
        var data = JSON.parse(value);
        result = Buffer.from(data);
    } else if (type === 'msg' && msg) {
        try {
            result = getMessageProperty(msg,value);
        } catch(err) {
            if (callback) {
                callback(err);
            } else {
                throw err;
            }
            return;
        }
    } else if ((type === 'flow' || type === 'global') && node) {
        var contextKey = parseContextStore(value);
        result = node.context()[type].get(contextKey.key,contextKey.store,callback);
        if (callback) {
            return;
        }
    } else if (type === 'bool') {
        result = /^true$/i.test(value);
    } else if (type === 'jsonata') {
        var expr = prepareJSONataExpression(value,node);
        result = evaluateJSONataExpression(expr,msg);
    } else if (type === 'env') {
        result = evaluateEnvProperty(value);
    }
    if (callback) {
        callback(null,result);
    } else {
        return result;
    }
}

function prepareJSONataExpression(value,node) {
    var expr = jsonata(value);
    expr.assign('flowContext',function(val) {
        return node.context().flow.get(val);
    });
    expr.assign('globalContext',function(val) {
        return node.context().global.get(val);
    });
    expr.assign('env', function(val) {
        return process.env[val];
    })
    expr.registerFunction('clone', cloneMessage, '<(oa)-:o>');
    expr._legacyMode = /(^|[^a-zA-Z0-9_'"])msg([^a-zA-Z0-9_'"]|$)/.test(value);
    expr._node = node;
    return expr;
}

function evaluateJSONataExpression(expr,msg,callback) {
    var context = msg;
    if (expr._legacyMode) {
        context = {msg:msg};
    }
    var bindings = {};

    if (callback) {
        // If callback provided, need to override the pre-assigned sync
        // context functions to be their async variants
        bindings.flowContext = function(val, store) {
            return new Promise((resolve,reject) => {
                expr._node.context().flow.get(val, store, function(err,value) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(value);
                    }
                })
            });
        }
        bindings.globalContext = function(val, store) {
            return new Promise((resolve,reject) => {
                expr._node.context().global.get(val, store, function(err,value) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(value);
                    }
                })
            });
        }
    }
    return expr.evaluate(context, bindings, callback);
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

function encodeObject(msg,opts) {
    var debuglength = 1000;
    if (opts && opts.hasOwnProperty('maxLength')) {
        debuglength = opts.maxLength;
    }
    var msgType = typeof msg.msg;
    if (msg.msg instanceof Error) {
        msg.format = "error";
        var errorMsg = {};
        if (msg.msg.name) {
            errorMsg.name = msg.msg.name;
        }
        if (msg.msg.hasOwnProperty('message')) {
            errorMsg.message = msg.msg.message;
        } else {
            errorMsg.message = msg.msg.toString();
        }
        msg.msg = JSON.stringify(errorMsg);
    } else if (msg.msg instanceof Buffer) {
        msg.format = "buffer["+msg.msg.length+"]";
        msg.msg = msg.msg.toString('hex');
        if (msg.msg.length > debuglength) {
            msg.msg = msg.msg.substring(0,debuglength);
        }
    } else if (msg.msg && msgType === 'object') {
        try {
            msg.format = msg.msg.constructor.name || "Object";
            // Handle special case of msg.req/res objects from HTTP In node
            if (msg.format === "IncomingMessage" || msg.format === "ServerResponse") {
                msg.format = "Object";
            }
        } catch(err) {
            msg.format = "Object";
        }
        if (/error/i.test(msg.format)) {
            msg.msg = JSON.stringify({
                name: msg.msg.name,
                message: msg.msg.message
            });
        } else {
            var isArray = util.isArray(msg.msg);
            if (isArray) {
                msg.format = "array["+msg.msg.length+"]";
                if (msg.msg.length > debuglength) {
                    // msg.msg = msg.msg.slice(0,debuglength);
                    msg.msg = {
                        __enc__: true,
                        type: "array",
                        data: msg.msg.slice(0,debuglength),
                        length: msg.msg.length
                    }
                }
            }
            if (isArray || (msg.format === "Object")) {
                msg.msg = safeJSONStringify(msg.msg, function(key, value) {
                    if (key === '_req' || key === '_res') {
                        value = {
                            __enc__: true,
                            type: "internal"
                        }
                    } else if (value instanceof Error) {
                        value = value.toString()
                    } else if (util.isArray(value) && value.length > debuglength) {
                        value = {
                            __enc__: true,
                            type: "array",
                            data: value.slice(0,debuglength),
                            length: value.length
                        }
                    } else if (typeof value === 'string') {
                        if (value.length > debuglength) {
                            value = value.substring(0,debuglength)+"...";
                        }
                    } else if (typeof value === 'function') {
                        value = {
                            __enc__: true,
                            type: "function"
                        }
                    } else if (typeof value === 'number') {
                        if (isNaN(value) || value === Infinity || value === -Infinity) {
                            value = {
                                __enc__: true,
                                type: "number",
                                data: value.toString()
                            }
                        }
                    } else if (value && value.constructor) {
                        if (value.type === "Buffer") {
                            value.__enc__ = true;
                            value.length = value.data.length;
                            if (value.length > debuglength) {
                                value.data = value.data.slice(0,debuglength);
                            }
                        } else if (value.constructor.name === "ServerResponse") {
                            value = "[internal]"
                        } else if (value.constructor.name === "Socket") {
                            value = "[internal]"
                        }
                    }
                    return value;
                }," ");
            } else {
                try { msg.msg = msg.msg.toString(); }
                catch(e) { msg.msg = "[Type not printable]"; }
            }
        }
    } else if (msgType === "function") {
        msg.format = "function";
        msg.msg = "[function]"
    } else if (msgType === "boolean") {
        msg.format = "boolean";
        msg.msg = msg.msg.toString();
    } else if (msgType === "number") {
        msg.format = "number";
        msg.msg = msg.msg.toString();
    } else if (msg.msg === null || msgType === "undefined") {
        msg.format = (msg.msg === null)?"null":"undefined";
        msg.msg = "(undefined)";
    } else {
        msg.format = "string["+msg.msg.length+"]";
        if (msg.msg.length > debuglength) {
            msg.msg = msg.msg.substring(0,debuglength)+"...";
        }
    }
    return msg;
}

module.exports = {
    encodeObject: encodeObject,
    ensureString: ensureString,
    ensureBuffer: ensureBuffer,
    cloneMessage: cloneMessage,
    compareObjects: compareObjects,
    generateId: generateId,
    getMessageProperty: getMessageProperty,
    setMessageProperty: setMessageProperty,
    getObjectProperty: getObjectProperty,
    setObjectProperty: setObjectProperty,
    evaluateNodeProperty: evaluateNodeProperty,
    normalisePropertyExpression: normalisePropertyExpression,
    normaliseNodeTypeName: normaliseNodeTypeName,
    prepareJSONataExpression: prepareJSONataExpression,
    evaluateJSONataExpression: evaluateJSONataExpression,
    parseContextStore: parseContextStore
};
