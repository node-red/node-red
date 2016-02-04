/**
 * Copyright 2014, 2016 IBM Corp.
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
    if (obj1 === obj2) {
        return true;
    }
    if (obj1 == null || obj2 == null) {
        return false;
    }
    if (!(obj1 instanceof Object) && !(obj2 instanceof Object)) {
        return false;
    }
    var isArray1 = Array.isArray(obj1);
    var isArray2 = Array.isArray(obj2);
    if (isArray1 != isArray2) {
        return false;
    }
    if (isArray1 && isArray2) {
        if (obj1.length != obj2.length) {
            return false;
        }
        for (var i=0;i<obj1.length;i++) {
            if (!compareObjects(obj1[i],obj2[i])) {
                return false;
            }
        }
        return true;
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

function getMessageProperty(msg,expr) {
    var result = null;
    if (expr.indexOf('msg.')===0) {
        expr = expr.substring(4);
    }
    var msgPropParts = expr.split(".");
    msgPropParts.reduce(function(obj, i) {
        result = (typeof obj[i] !== "undefined" ? obj[i] : undefined);
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
    var msgPropParts = prop.split(".");
    var depth = 0;
    msgPropParts.reduce(function(obj, i) {
        if (obj === null) {
            return null;
        }
        depth++;
        if (depth === msgPropParts.length) {
            if (typeof value === "undefined") {
                delete obj[i];
            } else {
                obj[i] = value;
            }
        } else {
            if (!obj[i]) {
                if (createMissing) {
                    obj[i] = {};
                } else {
                    return null;
                }
            }
            return obj[i];
        }
    }, msg);
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
    } else if (type === 'msg' && msg) {
        return getMessageProperty(msg,value);
    } else if (type === 'flow' && node) {
        return node.context().flow.get(value);
    } else if (type === 'global' && node) {
        return node.context().global.get(value);
    } else if (type === 'bool') {
        return /^true$/i.test(value);
    }
    return value;
}


module.exports = {
    ensureString: ensureString,
    ensureBuffer: ensureBuffer,
    cloneMessage: cloneMessage,
    compareObjects: compareObjects,
    generateId: generateId,
    getMessageProperty: getMessageProperty,
    setMessageProperty: setMessageProperty,
    evaluateNodeProperty: evaluateNodeProperty
};
