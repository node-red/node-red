"no use strict";
;(function(window) {
if (typeof window.window != "undefined" && window.document)
    return;
if (window.require && window.define)
    return;

if (!window.console) {
    window.console = function() {
        var msgs = Array.prototype.slice.call(arguments, 0);
        postMessage({type: "log", data: msgs});
    };
    window.console.error =
    window.console.warn =
    window.console.log =
    window.console.trace = window.console;
}
window.window = window;
window.ace = window;

window.onerror = function(message, file, line, col, err) {
    postMessage({type: "error", data: {
        message: message,
        data: err.data,
        file: file,
        line: line,
        col: col,
        stack: err.stack
    }});
};

window.normalizeModule = function(parentId, moduleName) {
    // normalize plugin requires
    if (moduleName.indexOf("!") !== -1) {
        var chunks = moduleName.split("!");
        return window.normalizeModule(parentId, chunks[0]) + "!" + window.normalizeModule(parentId, chunks[1]);
    }
    // normalize relative requires
    if (moduleName.charAt(0) == ".") {
        var base = parentId.split("/").slice(0, -1).join("/");
        moduleName = (base ? base + "/" : "") + moduleName;

        while (moduleName.indexOf(".") !== -1 && previous != moduleName) {
            var previous = moduleName;
            moduleName = moduleName.replace(/^\.\//, "").replace(/\/\.\//, "/").replace(/[^\/]+\/\.\.\//, "");
        }
    }

    return moduleName;
};

window.require = function require(parentId, id) {
    if (!id) {
        id = parentId;
        parentId = null;
    }
    if (!id.charAt)
        throw new Error("worker.js require() accepts only (parentId, id) as arguments");

    id = window.normalizeModule(parentId, id);

    var module = window.require.modules[id];
    if (module) {
        if (!module.initialized) {
            module.initialized = true;
            module.exports = module.factory().exports;
        }
        return module.exports;
    }

    if (!window.require.tlns)
        return console.log("unable to load " + id);

    var path = resolveModuleId(id, window.require.tlns);
    if (path.slice(-3) != ".js") path += ".js";

    window.require.id = id;
    window.require.modules[id] = {}; // prevent infinite loop on broken modules
    importScripts(path);
    return window.require(parentId, id);
};
function resolveModuleId(id, paths) {
    var testPath = id, tail = "";
    while (testPath) {
        var alias = paths[testPath];
        if (typeof alias == "string") {
            return alias + tail;
        } else if (alias) {
            return  alias.location.replace(/\/*$/, "/") + (tail || alias.main || alias.name);
        } else if (alias === false) {
            return "";
        }
        var i = testPath.lastIndexOf("/");
        if (i === -1) break;
        tail = testPath.substr(i) + tail;
        testPath = testPath.slice(0, i);
    }
    return id;
}
window.require.modules = {};
window.require.tlns = {};

window.define = function(id, deps, factory) {
    if (arguments.length == 2) {
        factory = deps;
        if (typeof id != "string") {
            deps = id;
            id = window.require.id;
        }
    } else if (arguments.length == 1) {
        factory = id;
        deps = [];
        id = window.require.id;
    }

    if (typeof factory != "function") {
        window.require.modules[id] = {
            exports: factory,
            initialized: true
        };
        return;
    }

    if (!deps.length)
        // If there is no dependencies, we inject "require", "exports" and
        // "module" as dependencies, to provide CommonJS compatibility.
        deps = ["require", "exports", "module"];

    var req = function(childId) {
        return window.require(id, childId);
    };

    window.require.modules[id] = {
        exports: {},
        factory: function() {
            var module = this;
            var returnExports = factory.apply(this, deps.map(function(dep) {
                switch (dep) {
                    // Because "require", "exports" and "module" aren't actual
                    // dependencies, we must handle them seperately.
                    case "require": return req;
                    case "exports": return module.exports;
                    case "module":  return module;
                    // But for all other dependencies, we can just go ahead and
                    // require them.
                    default:        return req(dep);
                }
            }));
            if (returnExports)
                module.exports = returnExports;
            return module;
        }
    };
};
window.define.amd = {};
require.tlns = {};
window.initBaseUrls  = function initBaseUrls(topLevelNamespaces) {
    for (var i in topLevelNamespaces)
        require.tlns[i] = topLevelNamespaces[i];
};

window.initSender = function initSender() {

    var EventEmitter = window.require("ace/lib/event_emitter").EventEmitter;
    var oop = window.require("ace/lib/oop");

    var Sender = function() {};

    (function() {

        oop.implement(this, EventEmitter);

        this.callback = function(data, callbackId) {
            postMessage({
                type: "call",
                id: callbackId,
                data: data
            });
        };

        this.emit = function(name, data) {
            postMessage({
                type: "event",
                name: name,
                data: data
            });
        };

    }).call(Sender.prototype);

    return new Sender();
};

var main = window.main = null;
var sender = window.sender = null;

window.onmessage = function(e) {
    var msg = e.data;
    if (msg.event && sender) {
        sender._signal(msg.event, msg.data);
    }
    else if (msg.command) {
        if (main[msg.command])
            main[msg.command].apply(main, msg.args);
        else if (window[msg.command])
            window[msg.command].apply(window, msg.args);
        else
            throw new Error("Unknown command:" + msg.command);
    }
    else if (msg.init) {
        window.initBaseUrls(msg.tlns);
        require("ace/lib/es5-shim");
        sender = window.sender = window.initSender();
        var clazz = require(msg.module)[msg.classname];
        main = window.main = new clazz(sender);
    }
};
})(this);

define("ace/lib/oop",["require","exports","module"], function(require, exports, module) {
"use strict";

exports.inherits = function(ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true
        }
    });
};

exports.mixin = function(obj, mixin) {
    for (var key in mixin) {
        obj[key] = mixin[key];
    }
    return obj;
};

exports.implement = function(proto, mixin) {
    exports.mixin(proto, mixin);
};

});

define("ace/range",["require","exports","module"], function(require, exports, module) {
"use strict";
var comparePoints = function(p1, p2) {
    return p1.row - p2.row || p1.column - p2.column;
};
var Range = function(startRow, startColumn, endRow, endColumn) {
    this.start = {
        row: startRow,
        column: startColumn
    };

    this.end = {
        row: endRow,
        column: endColumn
    };
};

(function() {
    this.isEqual = function(range) {
        return this.start.row === range.start.row &&
            this.end.row === range.end.row &&
            this.start.column === range.start.column &&
            this.end.column === range.end.column;
    };
    this.toString = function() {
        return ("Range: [" + this.start.row + "/" + this.start.column +
            "] -> [" + this.end.row + "/" + this.end.column + "]");
    };

    this.contains = function(row, column) {
        return this.compare(row, column) == 0;
    };
    this.compareRange = function(range) {
        var cmp,
            end = range.end,
            start = range.start;

        cmp = this.compare(end.row, end.column);
        if (cmp == 1) {
            cmp = this.compare(start.row, start.column);
            if (cmp == 1) {
                return 2;
            } else if (cmp == 0) {
                return 1;
            } else {
                return 0;
            }
        } else if (cmp == -1) {
            return -2;
        } else {
            cmp = this.compare(start.row, start.column);
            if (cmp == -1) {
                return -1;
            } else if (cmp == 1) {
                return 42;
            } else {
                return 0;
            }
        }
    };
    this.comparePoint = function(p) {
        return this.compare(p.row, p.column);
    };
    this.containsRange = function(range) {
        return this.comparePoint(range.start) == 0 && this.comparePoint(range.end) == 0;
    };
    this.intersects = function(range) {
        var cmp = this.compareRange(range);
        return (cmp == -1 || cmp == 0 || cmp == 1);
    };
    this.isEnd = function(row, column) {
        return this.end.row == row && this.end.column == column;
    };
    this.isStart = function(row, column) {
        return this.start.row == row && this.start.column == column;
    };
    this.setStart = function(row, column) {
        if (typeof row == "object") {
            this.start.column = row.column;
            this.start.row = row.row;
        } else {
            this.start.row = row;
            this.start.column = column;
        }
    };
    this.setEnd = function(row, column) {
        if (typeof row == "object") {
            this.end.column = row.column;
            this.end.row = row.row;
        } else {
            this.end.row = row;
            this.end.column = column;
        }
    };
    this.inside = function(row, column) {
        if (this.compare(row, column) == 0) {
            if (this.isEnd(row, column) || this.isStart(row, column)) {
                return false;
            } else {
                return true;
            }
        }
        return false;
    };
    this.insideStart = function(row, column) {
        if (this.compare(row, column) == 0) {
            if (this.isEnd(row, column)) {
                return false;
            } else {
                return true;
            }
        }
        return false;
    };
    this.insideEnd = function(row, column) {
        if (this.compare(row, column) == 0) {
            if (this.isStart(row, column)) {
                return false;
            } else {
                return true;
            }
        }
        return false;
    };
    this.compare = function(row, column) {
        if (!this.isMultiLine()) {
            if (row === this.start.row) {
                return column < this.start.column ? -1 : (column > this.end.column ? 1 : 0);
            }
        }

        if (row < this.start.row)
            return -1;

        if (row > this.end.row)
            return 1;

        if (this.start.row === row)
            return column >= this.start.column ? 0 : -1;

        if (this.end.row === row)
            return column <= this.end.column ? 0 : 1;

        return 0;
    };
    this.compareStart = function(row, column) {
        if (this.start.row == row && this.start.column == column) {
            return -1;
        } else {
            return this.compare(row, column);
        }
    };
    this.compareEnd = function(row, column) {
        if (this.end.row == row && this.end.column == column) {
            return 1;
        } else {
            return this.compare(row, column);
        }
    };
    this.compareInside = function(row, column) {
        if (this.end.row == row && this.end.column == column) {
            return 1;
        } else if (this.start.row == row && this.start.column == column) {
            return -1;
        } else {
            return this.compare(row, column);
        }
    };
    this.clipRows = function(firstRow, lastRow) {
        if (this.end.row > lastRow)
            var end = {row: lastRow + 1, column: 0};
        else if (this.end.row < firstRow)
            var end = {row: firstRow, column: 0};

        if (this.start.row > lastRow)
            var start = {row: lastRow + 1, column: 0};
        else if (this.start.row < firstRow)
            var start = {row: firstRow, column: 0};

        return Range.fromPoints(start || this.start, end || this.end);
    };
    this.extend = function(row, column) {
        var cmp = this.compare(row, column);

        if (cmp == 0)
            return this;
        else if (cmp == -1)
            var start = {row: row, column: column};
        else
            var end = {row: row, column: column};

        return Range.fromPoints(start || this.start, end || this.end);
    };

    this.isEmpty = function() {
        return (this.start.row === this.end.row && this.start.column === this.end.column);
    };
    this.isMultiLine = function() {
        return (this.start.row !== this.end.row);
    };
    this.clone = function() {
        return Range.fromPoints(this.start, this.end);
    };
    this.collapseRows = function() {
        if (this.end.column == 0)
            return new Range(this.start.row, 0, Math.max(this.start.row, this.end.row-1), 0)
        else
            return new Range(this.start.row, 0, this.end.row, 0)
    };
    this.toScreenRange = function(session) {
        var screenPosStart = session.documentToScreenPosition(this.start);
        var screenPosEnd = session.documentToScreenPosition(this.end);

        return new Range(
            screenPosStart.row, screenPosStart.column,
            screenPosEnd.row, screenPosEnd.column
        );
    };
    this.moveBy = function(row, column) {
        this.start.row += row;
        this.start.column += column;
        this.end.row += row;
        this.end.column += column;
    };

}).call(Range.prototype);
Range.fromPoints = function(start, end) {
    return new Range(start.row, start.column, end.row, end.column);
};
Range.comparePoints = comparePoints;

Range.comparePoints = function(p1, p2) {
    return p1.row - p2.row || p1.column - p2.column;
};


exports.Range = Range;
});

define("ace/apply_delta",["require","exports","module"], function(require, exports, module) {
"use strict";

function throwDeltaError(delta, errorText){
    console.log("Invalid Delta:", delta);
    throw "Invalid Delta: " + errorText;
}

function positionInDocument(docLines, position) {
    return position.row    >= 0 && position.row    <  docLines.length &&
           position.column >= 0 && position.column <= docLines[position.row].length;
}

function validateDelta(docLines, delta) {
    if (delta.action != "insert" && delta.action != "remove")
        throwDeltaError(delta, "delta.action must be 'insert' or 'remove'");
    if (!(delta.lines instanceof Array))
        throwDeltaError(delta, "delta.lines must be an Array");
    if (!delta.start || !delta.end)
       throwDeltaError(delta, "delta.start/end must be an present");
    var start = delta.start;
    if (!positionInDocument(docLines, delta.start))
        throwDeltaError(delta, "delta.start must be contained in document");
    var end = delta.end;
    if (delta.action == "remove" && !positionInDocument(docLines, end))
        throwDeltaError(delta, "delta.end must contained in document for 'remove' actions");
    var numRangeRows = end.row - start.row;
    var numRangeLastLineChars = (end.column - (numRangeRows == 0 ? start.column : 0));
    if (numRangeRows != delta.lines.length - 1 || delta.lines[numRangeRows].length != numRangeLastLineChars)
        throwDeltaError(delta, "delta.range must match delta lines");
}

exports.applyDelta = function(docLines, delta, doNotValidate) {

    var row = delta.start.row;
    var startColumn = delta.start.column;
    var line = docLines[row] || "";
    switch (delta.action) {
        case "insert":
            var lines = delta.lines;
            if (lines.length === 1) {
                docLines[row] = line.substring(0, startColumn) + delta.lines[0] + line.substring(startColumn);
            } else {
                var args = [row, 1].concat(delta.lines);
                docLines.splice.apply(docLines, args);
                docLines[row] = line.substring(0, startColumn) + docLines[row];
                docLines[row + delta.lines.length - 1] += line.substring(startColumn);
            }
            break;
        case "remove":
            var endColumn = delta.end.column;
            var endRow = delta.end.row;
            if (row === endRow) {
                docLines[row] = line.substring(0, startColumn) + line.substring(endColumn);
            } else {
                docLines.splice(
                    row, endRow - row + 1,
                    line.substring(0, startColumn) + docLines[endRow].substring(endColumn)
                );
            }
            break;
    }
}
});

define("ace/lib/event_emitter",["require","exports","module"], function(require, exports, module) {
"use strict";

var EventEmitter = {};
var stopPropagation = function() { this.propagationStopped = true; };
var preventDefault = function() { this.defaultPrevented = true; };

EventEmitter._emit =
EventEmitter._dispatchEvent = function(eventName, e) {
    this._eventRegistry || (this._eventRegistry = {});
    this._defaultHandlers || (this._defaultHandlers = {});

    var listeners = this._eventRegistry[eventName] || [];
    var defaultHandler = this._defaultHandlers[eventName];
    if (!listeners.length && !defaultHandler)
        return;

    if (typeof e != "object" || !e)
        e = {};

    if (!e.type)
        e.type = eventName;
    if (!e.stopPropagation)
        e.stopPropagation = stopPropagation;
    if (!e.preventDefault)
        e.preventDefault = preventDefault;

    listeners = listeners.slice();
    for (var i=0; i<listeners.length; i++) {
        listeners[i](e, this);
        if (e.propagationStopped)
            break;
    }

    if (defaultHandler && !e.defaultPrevented)
        return defaultHandler(e, this);
};


EventEmitter._signal = function(eventName, e) {
    var listeners = (this._eventRegistry || {})[eventName];
    if (!listeners)
        return;
    listeners = listeners.slice();
    for (var i=0; i<listeners.length; i++)
        listeners[i](e, this);
};

EventEmitter.once = function(eventName, callback) {
    var _self = this;
    callback && this.addEventListener(eventName, function newCallback() {
        _self.removeEventListener(eventName, newCallback);
        callback.apply(null, arguments);
    });
};


EventEmitter.setDefaultHandler = function(eventName, callback) {
    var handlers = this._defaultHandlers
    if (!handlers)
        handlers = this._defaultHandlers = {_disabled_: {}};

    if (handlers[eventName]) {
        var old = handlers[eventName];
        var disabled = handlers._disabled_[eventName];
        if (!disabled)
            handlers._disabled_[eventName] = disabled = [];
        disabled.push(old);
        var i = disabled.indexOf(callback);
        if (i != -1)
            disabled.splice(i, 1);
    }
    handlers[eventName] = callback;
};
EventEmitter.removeDefaultHandler = function(eventName, callback) {
    var handlers = this._defaultHandlers
    if (!handlers)
        return;
    var disabled = handlers._disabled_[eventName];

    if (handlers[eventName] == callback) {
        var old = handlers[eventName];
        if (disabled)
            this.setDefaultHandler(eventName, disabled.pop());
    } else if (disabled) {
        var i = disabled.indexOf(callback);
        if (i != -1)
            disabled.splice(i, 1);
    }
};

EventEmitter.on =
EventEmitter.addEventListener = function(eventName, callback, capturing) {
    this._eventRegistry = this._eventRegistry || {};

    var listeners = this._eventRegistry[eventName];
    if (!listeners)
        listeners = this._eventRegistry[eventName] = [];

    if (listeners.indexOf(callback) == -1)
        listeners[capturing ? "unshift" : "push"](callback);
    return callback;
};

EventEmitter.off =
EventEmitter.removeListener =
EventEmitter.removeEventListener = function(eventName, callback) {
    this._eventRegistry = this._eventRegistry || {};

    var listeners = this._eventRegistry[eventName];
    if (!listeners)
        return;

    var index = listeners.indexOf(callback);
    if (index !== -1)
        listeners.splice(index, 1);
};

EventEmitter.removeAllListeners = function(eventName) {
    if (this._eventRegistry) this._eventRegistry[eventName] = [];
};

exports.EventEmitter = EventEmitter;

});

define("ace/anchor",["require","exports","module","ace/lib/oop","ace/lib/event_emitter"], function(require, exports, module) {
"use strict";

var oop = require("./lib/oop");
var EventEmitter = require("./lib/event_emitter").EventEmitter;

var Anchor = exports.Anchor = function(doc, row, column) {
    this.$onChange = this.onChange.bind(this);
    this.attach(doc);

    if (typeof column == "undefined")
        this.setPosition(row.row, row.column);
    else
        this.setPosition(row, column);
};

(function() {

    oop.implement(this, EventEmitter);
    this.getPosition = function() {
        return this.$clipPositionToDocument(this.row, this.column);
    };
    this.getDocument = function() {
        return this.document;
    };
    this.$insertRight = false;
    this.onChange = function(delta) {
        if (delta.start.row == delta.end.row && delta.start.row != this.row)
            return;

        if (delta.start.row > this.row)
            return;

        var point = $getTransformedPoint(delta, {row: this.row, column: this.column}, this.$insertRight);
        this.setPosition(point.row, point.column, true);
    };

    function $pointsInOrder(point1, point2, equalPointsInOrder) {
        var bColIsAfter = equalPointsInOrder ? point1.column <= point2.column : point1.column < point2.column;
        return (point1.row < point2.row) || (point1.row == point2.row && bColIsAfter);
    }

    function $getTransformedPoint(delta, point, moveIfEqual) {
        var deltaIsInsert = delta.action == "insert";
        var deltaRowShift = (deltaIsInsert ? 1 : -1) * (delta.end.row    - delta.start.row);
        var deltaColShift = (deltaIsInsert ? 1 : -1) * (delta.end.column - delta.start.column);
        var deltaStart = delta.start;
        var deltaEnd = deltaIsInsert ? deltaStart : delta.end; // Collapse insert range.
        if ($pointsInOrder(point, deltaStart, moveIfEqual)) {
            return {
                row: point.row,
                column: point.column
            };
        }
        if ($pointsInOrder(deltaEnd, point, !moveIfEqual)) {
            return {
                row: point.row + deltaRowShift,
                column: point.column + (point.row == deltaEnd.row ? deltaColShift : 0)
            };
        }

        return {
            row: deltaStart.row,
            column: deltaStart.column
        };
    }
    this.setPosition = function(row, column, noClip) {
        var pos;
        if (noClip) {
            pos = {
                row: row,
                column: column
            };
        } else {
            pos = this.$clipPositionToDocument(row, column);
        }

        if (this.row == pos.row && this.column == pos.column)
            return;

        var old = {
            row: this.row,
            column: this.column
        };

        this.row = pos.row;
        this.column = pos.column;
        this._signal("change", {
            old: old,
            value: pos
        });
    };
    this.detach = function() {
        this.document.removeEventListener("change", this.$onChange);
    };
    this.attach = function(doc) {
        this.document = doc || this.document;
        this.document.on("change", this.$onChange);
    };
    this.$clipPositionToDocument = function(row, column) {
        var pos = {};

        if (row >= this.document.getLength()) {
            pos.row = Math.max(0, this.document.getLength() - 1);
            pos.column = this.document.getLine(pos.row).length;
        }
        else if (row < 0) {
            pos.row = 0;
            pos.column = 0;
        }
        else {
            pos.row = row;
            pos.column = Math.min(this.document.getLine(pos.row).length, Math.max(0, column));
        }

        if (column < 0)
            pos.column = 0;

        return pos;
    };

}).call(Anchor.prototype);

});

define("ace/document",["require","exports","module","ace/lib/oop","ace/apply_delta","ace/lib/event_emitter","ace/range","ace/anchor"], function(require, exports, module) {
"use strict";

var oop = require("./lib/oop");
var applyDelta = require("./apply_delta").applyDelta;
var EventEmitter = require("./lib/event_emitter").EventEmitter;
var Range = require("./range").Range;
var Anchor = require("./anchor").Anchor;

var Document = function(textOrLines) {
    this.$lines = [""];
    if (textOrLines.length === 0) {
        this.$lines = [""];
    } else if (Array.isArray(textOrLines)) {
        this.insertMergedLines({row: 0, column: 0}, textOrLines);
    } else {
        this.insert({row: 0, column:0}, textOrLines);
    }
};

(function() {

    oop.implement(this, EventEmitter);
    this.setValue = function(text) {
        var len = this.getLength() - 1;
        this.remove(new Range(0, 0, len, this.getLine(len).length));
        this.insert({row: 0, column: 0}, text);
    };
    this.getValue = function() {
        return this.getAllLines().join(this.getNewLineCharacter());
    };
    this.createAnchor = function(row, column) {
        return new Anchor(this, row, column);
    };
    if ("aaa".split(/a/).length === 0) {
        this.$split = function(text) {
            return text.replace(/\r\n|\r/g, "\n").split("\n");
        };
    } else {
        this.$split = function(text) {
            return text.split(/\r\n|\r|\n/);
        };
    }


    this.$detectNewLine = function(text) {
        var match = text.match(/^.*?(\r\n|\r|\n)/m);
        this.$autoNewLine = match ? match[1] : "\n";
        this._signal("changeNewLineMode");
    };
    this.getNewLineCharacter = function() {
        switch (this.$newLineMode) {
          case "windows":
            return "\r\n";
          case "unix":
            return "\n";
          default:
            return this.$autoNewLine || "\n";
        }
    };

    this.$autoNewLine = "";
    this.$newLineMode = "auto";
    this.setNewLineMode = function(newLineMode) {
        if (this.$newLineMode === newLineMode)
            return;

        this.$newLineMode = newLineMode;
        this._signal("changeNewLineMode");
    };
    this.getNewLineMode = function() {
        return this.$newLineMode;
    };
    this.isNewLine = function(text) {
        return (text == "\r\n" || text == "\r" || text == "\n");
    };
    this.getLine = function(row) {
        return this.$lines[row] || "";
    };
    this.getLines = function(firstRow, lastRow) {
        return this.$lines.slice(firstRow, lastRow + 1);
    };
    this.getAllLines = function() {
        return this.getLines(0, this.getLength());
    };
    this.getLength = function() {
        return this.$lines.length;
    };
    this.getTextRange = function(range) {
        return this.getLinesForRange(range).join(this.getNewLineCharacter());
    };
    this.getLinesForRange = function(range) {
        var lines;
        if (range.start.row === range.end.row) {
            lines = [this.getLine(range.start.row).substring(range.start.column, range.end.column)];
        } else {
            lines = this.getLines(range.start.row, range.end.row);
            lines[0] = (lines[0] || "").substring(range.start.column);
            var l = lines.length - 1;
            if (range.end.row - range.start.row == l)
                lines[l] = lines[l].substring(0, range.end.column);
        }
        return lines;
    };
    this.insertLines = function(row, lines) {
        console.warn("Use of document.insertLines is deprecated. Use the insertFullLines method instead.");
        return this.insertFullLines(row, lines);
    };
    this.removeLines = function(firstRow, lastRow) {
        console.warn("Use of document.removeLines is deprecated. Use the removeFullLines method instead.");
        return this.removeFullLines(firstRow, lastRow);
    };
    this.insertNewLine = function(position) {
        console.warn("Use of document.insertNewLine is deprecated. Use insertMergedLines(position, ['', '']) instead.");
        return this.insertMergedLines(position, ["", ""]);
    };
    this.insert = function(position, text) {
        if (this.getLength() <= 1)
            this.$detectNewLine(text);

        return this.insertMergedLines(position, this.$split(text));
    };
    this.insertInLine = function(position, text) {
        var start = this.clippedPos(position.row, position.column);
        var end = this.pos(position.row, position.column + text.length);

        this.applyDelta({
            start: start,
            end: end,
            action: "insert",
            lines: [text]
        }, true);

        return this.clonePos(end);
    };

    this.clippedPos = function(row, column) {
        var length = this.getLength();
        if (row === undefined) {
            row = length;
        } else if (row < 0) {
            row = 0;
        } else if (row >= length) {
            row = length - 1;
            column = undefined;
        }
        var line = this.getLine(row);
        if (column == undefined)
            column = line.length;
        column = Math.min(Math.max(column, 0), line.length);
        return {row: row, column: column};
    };

    this.clonePos = function(pos) {
        return {row: pos.row, column: pos.column};
    };

    this.pos = function(row, column) {
        return {row: row, column: column};
    };

    this.$clipPosition = function(position) {
        var length = this.getLength();
        if (position.row >= length) {
            position.row = Math.max(0, length - 1);
            position.column = this.getLine(length - 1).length;
        } else {
            position.row = Math.max(0, position.row);
            position.column = Math.min(Math.max(position.column, 0), this.getLine(position.row).length);
        }
        return position;
    };
    this.insertFullLines = function(row, lines) {
        row = Math.min(Math.max(row, 0), this.getLength());
        var column = 0;
        if (row < this.getLength()) {
            lines = lines.concat([""]);
            column = 0;
        } else {
            lines = [""].concat(lines);
            row--;
            column = this.$lines[row].length;
        }
        this.insertMergedLines({row: row, column: column}, lines);
    };
    this.insertMergedLines = function(position, lines) {
        var start = this.clippedPos(position.row, position.column);
        var end = {
            row: start.row + lines.length - 1,
            column: (lines.length == 1 ? start.column : 0) + lines[lines.length - 1].length
        };

        this.applyDelta({
            start: start,
            end: end,
            action: "insert",
            lines: lines
        });

        return this.clonePos(end);
    };
    this.remove = function(range) {
        var start = this.clippedPos(range.start.row, range.start.column);
        var end = this.clippedPos(range.end.row, range.end.column);
        this.applyDelta({
            start: start,
            end: end,
            action: "remove",
            lines: this.getLinesForRange({start: start, end: end})
        });
        return this.clonePos(start);
    };
    this.removeInLine = function(row, startColumn, endColumn) {
        var start = this.clippedPos(row, startColumn);
        var end = this.clippedPos(row, endColumn);

        this.applyDelta({
            start: start,
            end: end,
            action: "remove",
            lines: this.getLinesForRange({start: start, end: end})
        }, true);

        return this.clonePos(start);
    };
    this.removeFullLines = function(firstRow, lastRow) {
        firstRow = Math.min(Math.max(0, firstRow), this.getLength() - 1);
        lastRow  = Math.min(Math.max(0, lastRow ), this.getLength() - 1);
        var deleteFirstNewLine = lastRow == this.getLength() - 1 && firstRow > 0;
        var deleteLastNewLine  = lastRow  < this.getLength() - 1;
        var startRow = ( deleteFirstNewLine ? firstRow - 1                  : firstRow                    );
        var startCol = ( deleteFirstNewLine ? this.getLine(startRow).length : 0                           );
        var endRow   = ( deleteLastNewLine  ? lastRow + 1                   : lastRow                     );
        var endCol   = ( deleteLastNewLine  ? 0                             : this.getLine(endRow).length );
        var range = new Range(startRow, startCol, endRow, endCol);
        var deletedLines = this.$lines.slice(firstRow, lastRow + 1);

        this.applyDelta({
            start: range.start,
            end: range.end,
            action: "remove",
            lines: this.getLinesForRange(range)
        });
        return deletedLines;
    };
    this.removeNewLine = function(row) {
        if (row < this.getLength() - 1 && row >= 0) {
            this.applyDelta({
                start: this.pos(row, this.getLine(row).length),
                end: this.pos(row + 1, 0),
                action: "remove",
                lines: ["", ""]
            });
        }
    };
    this.replace = function(range, text) {
        if (!(range instanceof Range))
            range = Range.fromPoints(range.start, range.end);
        if (text.length === 0 && range.isEmpty())
            return range.start;
        if (text == this.getTextRange(range))
            return range.end;

        this.remove(range);
        var end;
        if (text) {
            end = this.insert(range.start, text);
        }
        else {
            end = range.start;
        }

        return end;
    };
    this.applyDeltas = function(deltas) {
        for (var i=0; i<deltas.length; i++) {
            this.applyDelta(deltas[i]);
        }
    };
    this.revertDeltas = function(deltas) {
        for (var i=deltas.length-1; i>=0; i--) {
            this.revertDelta(deltas[i]);
        }
    };
    this.applyDelta = function(delta, doNotValidate) {
        var isInsert = delta.action == "insert";
        if (isInsert ? delta.lines.length <= 1 && !delta.lines[0]
            : !Range.comparePoints(delta.start, delta.end)) {
            return;
        }

        if (isInsert && delta.lines.length > 20000)
            this.$splitAndapplyLargeDelta(delta, 20000);
        applyDelta(this.$lines, delta, doNotValidate);
        this._signal("change", delta);
    };

    this.$splitAndapplyLargeDelta = function(delta, MAX) {
        var lines = delta.lines;
        var l = lines.length;
        var row = delta.start.row;
        var column = delta.start.column;
        var from = 0, to = 0;
        do {
            from = to;
            to += MAX - 1;
            var chunk = lines.slice(from, to);
            if (to > l) {
                delta.lines = chunk;
                delta.start.row = row + from;
                delta.start.column = column;
                break;
            }
            chunk.push("");
            this.applyDelta({
                start: this.pos(row + from, column),
                end: this.pos(row + to, column = 0),
                action: delta.action,
                lines: chunk
            }, true);
        } while(true);
    };
    this.revertDelta = function(delta) {
        this.applyDelta({
            start: this.clonePos(delta.start),
            end: this.clonePos(delta.end),
            action: (delta.action == "insert" ? "remove" : "insert"),
            lines: delta.lines.slice()
        });
    };
    this.indexToPosition = function(index, startRow) {
        var lines = this.$lines || this.getAllLines();
        var newlineLength = this.getNewLineCharacter().length;
        for (var i = startRow || 0, l = lines.length; i < l; i++) {
            index -= lines[i].length + newlineLength;
            if (index < 0)
                return {row: i, column: index + lines[i].length + newlineLength};
        }
        return {row: l-1, column: lines[l-1].length};
    };
    this.positionToIndex = function(pos, startRow) {
        var lines = this.$lines || this.getAllLines();
        var newlineLength = this.getNewLineCharacter().length;
        var index = 0;
        var row = Math.min(pos.row, lines.length);
        for (var i = startRow || 0; i < row; ++i)
            index += lines[i].length + newlineLength;

        return index + pos.column;
    };

}).call(Document.prototype);

exports.Document = Document;
});

define("ace/lib/lang",["require","exports","module"], function(require, exports, module) {
"use strict";

exports.last = function(a) {
    return a[a.length - 1];
};

exports.stringReverse = function(string) {
    return string.split("").reverse().join("");
};

exports.stringRepeat = function (string, count) {
    var result = '';
    while (count > 0) {
        if (count & 1)
            result += string;

        if (count >>= 1)
            string += string;
    }
    return result;
};

var trimBeginRegexp = /^\s\s*/;
var trimEndRegexp = /\s\s*$/;

exports.stringTrimLeft = function (string) {
    return string.replace(trimBeginRegexp, '');
};

exports.stringTrimRight = function (string) {
    return string.replace(trimEndRegexp, '');
};

exports.copyObject = function(obj) {
    var copy = {};
    for (var key in obj) {
        copy[key] = obj[key];
    }
    return copy;
};

exports.copyArray = function(array){
    var copy = [];
    for (var i=0, l=array.length; i<l; i++) {
        if (array[i] && typeof array[i] == "object")
            copy[i] = this.copyObject(array[i]);
        else
            copy[i] = array[i];
    }
    return copy;
};

exports.deepCopy = function deepCopy(obj) {
    if (typeof obj !== "object" || !obj)
        return obj;
    var copy;
    if (Array.isArray(obj)) {
        copy = [];
        for (var key = 0; key < obj.length; key++) {
            copy[key] = deepCopy(obj[key]);
        }
        return copy;
    }
    if (Object.prototype.toString.call(obj) !== "[object Object]")
        return obj;

    copy = {};
    for (var key in obj)
        copy[key] = deepCopy(obj[key]);
    return copy;
};

exports.arrayToMap = function(arr) {
    var map = {};
    for (var i=0; i<arr.length; i++) {
        map[arr[i]] = 1;
    }
    return map;

};

exports.createMap = function(props) {
    var map = Object.create(null);
    for (var i in props) {
        map[i] = props[i];
    }
    return map;
};
exports.arrayRemove = function(array, value) {
  for (var i = 0; i <= array.length; i++) {
    if (value === array[i]) {
      array.splice(i, 1);
    }
  }
};

exports.escapeRegExp = function(str) {
    return str.replace(/([.*+?^${}()|[\]\/\\])/g, '\\$1');
};

exports.escapeHTML = function(str) {
    return str.replace(/&/g, "&#38;").replace(/"/g, "&#34;").replace(/'/g, "&#39;").replace(/</g, "&#60;");
};

exports.getMatchOffsets = function(string, regExp) {
    var matches = [];

    string.replace(regExp, function(str) {
        matches.push({
            offset: arguments[arguments.length-2],
            length: str.length
        });
    });

    return matches;
};
exports.deferredCall = function(fcn) {
    var timer = null;
    var callback = function() {
        timer = null;
        fcn();
    };

    var deferred = function(timeout) {
        deferred.cancel();
        timer = setTimeout(callback, timeout || 0);
        return deferred;
    };

    deferred.schedule = deferred;

    deferred.call = function() {
        this.cancel();
        fcn();
        return deferred;
    };

    deferred.cancel = function() {
        clearTimeout(timer);
        timer = null;
        return deferred;
    };

    deferred.isPending = function() {
        return timer;
    };

    return deferred;
};


exports.delayedCall = function(fcn, defaultTimeout) {
    var timer = null;
    var callback = function() {
        timer = null;
        fcn();
    };

    var _self = function(timeout) {
        if (timer == null)
            timer = setTimeout(callback, timeout || defaultTimeout);
    };

    _self.delay = function(timeout) {
        timer && clearTimeout(timer);
        timer = setTimeout(callback, timeout || defaultTimeout);
    };
    _self.schedule = _self;

    _self.call = function() {
        this.cancel();
        fcn();
    };

    _self.cancel = function() {
        timer && clearTimeout(timer);
        timer = null;
    };

    _self.isPending = function() {
        return timer;
    };

    return _self;
};
});

define("ace/worker/mirror",["require","exports","module","ace/range","ace/document","ace/lib/lang"], function(require, exports, module) {
"use strict";

var Range = require("../range").Range;
var Document = require("../document").Document;
var lang = require("../lib/lang");

var Mirror = exports.Mirror = function(sender) {
    this.sender = sender;
    var doc = this.doc = new Document("");

    var deferredUpdate = this.deferredUpdate = lang.delayedCall(this.onUpdate.bind(this));

    var _self = this;
    sender.on("change", function(e) {
        var data = e.data;
        if (data[0].start) {
            doc.applyDeltas(data);
        } else {
            for (var i = 0; i < data.length; i += 2) {
                if (Array.isArray(data[i+1])) {
                    var d = {action: "insert", start: data[i], lines: data[i+1]};
                } else {
                    var d = {action: "remove", start: data[i], end: data[i+1]};
                }
                doc.applyDelta(d, true);
            }
        }
        if (_self.$timeout)
            return deferredUpdate.schedule(_self.$timeout);
        _self.onUpdate();
    });
};

(function() {

    this.$timeout = 500;

    this.setTimeout = function(timeout) {
        this.$timeout = timeout;
    };

    this.setValue = function(value) {
        this.doc.setValue(value);
        this.deferredUpdate.schedule(this.$timeout);
    };

    this.getValue = function(callbackId) {
        this.sender.callback(this.doc.getValue(), callbackId);
    };

    this.onUpdate = function() {
    };

    this.isPending = function() {
        return this.deferredUpdate.isPending();
    };

}).call(Mirror.prototype);

});

define("ace/mode/jsonata_worker",["require","exports","module","ace/lib/oop","ace/worker/mirror"], function(require, exports, module) {
    "use strict";



    var jsonata = (function() {
        var operators = {
            '.': 75,
            '[': 80,
            ']': 0,
            '{': 70,
            '}': 0,
            '(': 80,
            ')': 0,
            ',': 0,
            '@': 75,
            '#': 70,
            ';': 80,
            ':': 80,
            '?': 20,
            '+': 50,
            '-': 50,
            '*': 60,
            '/': 60,
            '%': 60,
            '|': 20,
            '=': 40,
            '<': 40,
            '>': 40,
            '`': 80,
            '**': 60,
            '..': 20,
            ':=': 10,
            '!=': 40,
            '<=': 40,
            '>=': 40,
            'and': 30,
            'or': 25,
            'in': 40,
            '&': 50,
            '!': 0   // not an operator, but needed as a stop character for name tokens
        };

        var escapes = {  // JSON string escape sequences - see json.org
            '"': '"',
            '\\': '\\',
            '/': '/',
            'b': '\b',
            'f': '\f',
            'n': '\n',
            'r': '\r',
            't': '\t'
        };
        var tokenizer = function (path) {
            var position = 0;
            var length = path.length;

            var create = function (type, value) {
                var obj = {type: type, value: value, position: position};
                return obj;
            };

            var next = function () {
                if (position >= length) return null;
                var currentChar = path.charAt(position);
                while (position < length && ' \t\n\r\v'.indexOf(currentChar) > -1) {
                    position++;
                    currentChar = path.charAt(position);
                }
                if (currentChar === '.' && path.charAt(position + 1) === '.') {
                    position += 2;
                    return create('operator', '..');
                }
                if (currentChar === ':' && path.charAt(position + 1) === '=') {
                    position += 2;
                    return create('operator', ':=');
                }
                if (currentChar === '!' && path.charAt(position + 1) === '=') {
                    position += 2;
                    return create('operator', '!=');
                }
                if (currentChar === '>' && path.charAt(position + 1) === '=') {
                    position += 2;
                    return create('operator', '>=');
                }
                if (currentChar === '<' && path.charAt(position + 1) === '=') {
                    position += 2;
                    return create('operator', '<=');
                }
                if (currentChar === '*' && path.charAt(position + 1) === '*') {
                    position += 2;
                    return create('operator', '**');
                }
                if (operators.hasOwnProperty(currentChar)) {
                    position++;
                    return create('operator', currentChar);
                }
                if (currentChar === '"' || currentChar === "'") {
                    var quoteType = currentChar;
                    position++;
                    var qstr = "";
                    while (position < length) {
                        currentChar = path.charAt(position);
                        if (currentChar === '\\') { // escape sequence
                            position++;
                            currentChar = path.charAt(position);
                            if (escapes.hasOwnProperty(currentChar)) {
                                qstr += escapes[currentChar];
                            } else if (currentChar === 'u') {
                                var octets = path.substr(position + 1, 4);
                                if (/^[0-9a-fA-F]+$/.test(octets)) {
                                    var codepoint = parseInt(octets, 16);
                                    qstr += String.fromCharCode(codepoint);
                                    position += 4;
                                } else {
                                    throw {
                                        message: "The escape sequence \\u must be followed by 4 hex digits at column " + position,
                                        stack: (new Error()).stack,
                                        position: position
                                    };
                                }
                            } else {
                                throw {
                                    message: 'unsupported escape sequence: \\' + currentChar + ' at column ' + position,
                                    stack: (new Error()).stack,
                                    position: position,
                                    token: currentChar
                                };

                            }
                        } else if (currentChar === quoteType) {
                            position++;
                            return create('string', qstr);
                        } else {
                            qstr += currentChar;
                        }
                        position++;
                    }
                    throw {
                        message: 'no terminating quote found in string literal at column ' + position,
                        stack: (new Error()).stack,
                        position: position
                    };
                }
                var numregex = /^-?(0|([1-9][0-9]*))(\.[0-9]+)?([Ee][-+]?[0-9]+)?/;
                var match = numregex.exec(path.substring(position));
                if (match !== null) {
                    var num = parseFloat(match[0]);
                    if (!isNaN(num) && isFinite(num)) {
                        position += match[0].length;
                        return create('number', num);
                    } else {
                        throw {
                            message: 'Number out of range: ' + match[0] + ' at column ' + position,
                            stack: (new Error()).stack,
                            position: position,
                            token: match[0]
                        };
                    }
                }
                var i = position;
                var ch;
                var name;
                for (;;) {
                    ch = path.charAt(i);
                    if (i == length || ' \t\n\r\v'.indexOf(ch) > -1 || operators.hasOwnProperty(ch)) {
                        if (path.charAt(position) === '$') {
                            name = path.substring(position + 1, i);
                            position = i;
                            return create('variable', name);
                        } else {
                            name = path.substring(position, i);
                            position = i;
                            switch (name) {
                                case 'and':
                                case 'or':
                                case 'in':
                                    return create('operator', name);
                                case 'true':
                                    return create('value', true);
                                case 'false':
                                    return create('value', false);
                                case 'null':
                                    return create('value', null);
                                default:
                                    if (position == length && name === '') {
                                        return null;
                                    }
                                    return create('name', name);
                            }
                        }
                    } else {
                        i++;
                    }
                }
            };

            return next;
        };

        var parser = function (source) {
            var node;
            var lexer;

            var symbol_table = {};

            var base_symbol = {
                nud: function () {
                    return this;
                }
            };

            var symbol = function (id, bp) {
                var s = symbol_table[id];
                bp = bp || 0;
                if (s) {
                    if (bp >= s.lbp) {
                        s.lbp = bp;
                    }
                } else {
                    s = Object.create(base_symbol);
                    s.id = s.value = id;
                    s.lbp = bp;
                    symbol_table[id] = s;
                }
                return s;
            };

            var advance = function (id) {
                if (id && node.id !== id) {
                    var msg;
                    if(node.id === '(end)') {
                        msg = "Syntax error: expected '" + id + "' before end of expression";
                    } else {
                        msg = "Syntax error: expected '" + id + "', got '" + node.id + "' at column " + node.position;
                    }
                    throw {
                        message: msg ,
                        stack: (new Error()).stack,
                        position: node.position,
                        token: node.id,
                        value: id
                    };
                }
                var next_token = lexer();
                if (next_token === null) {
                    node = symbol_table["(end)"];
                    return node;
                }
                var value = next_token.value;
                var type = next_token.type;
                var symbol;
                switch (type) {
                    case 'name':
                    case 'variable':
                        symbol = symbol_table["(name)"];
                        break;
                    case 'operator':
                        symbol = symbol_table[value];
                        if (!symbol) {
                            throw {
                                message: "Unknown operator: " + value + " at column " + next_token.position,
                                stack: (new Error()).stack,
                                position: next_token.position,
                                token: value
                            };
                        }
                        break;
                    case 'string':
                    case 'number':
                    case 'value':
                        type = "literal";
                        symbol = symbol_table["(literal)"];
                        break;
                    default:
                        throw {
                            message: "Unexpected token:" + value + " at column " + next_token.position,
                            stack: (new Error()).stack,
                            position: next_token.position,
                            token: value
                        };
                }

                node = Object.create(symbol);
                node.value = value;
                node.type = type;
                node.position = next_token.position;
                return node;
            };
            var expression = function (rbp) {
                var left;
                var t = node;
                advance();
                left = t.nud();
                while (rbp < node.lbp) {
                    t = node;
                    advance();
                    left = t.led(left);
                }
                return left;
            };
            var infix = function (id, bp, led) {
                var bindingPower = bp || operators[id];
                var s = symbol(id, bindingPower);
                s.led = led || function (left) {
                    this.lhs = left;
                    this.rhs = expression(bindingPower);
                    this.type = "binary";
                    return this;
                };
                return s;
            };
            var infixr = function (id, bp, led) {
                var bindingPower = bp || operators[id];
                var s = symbol(id, bindingPower);
                s.led = led || function (left) {
                    this.lhs = left;
                    this.rhs = expression(bindingPower - 1); // subtract 1 from bindingPower for right associative operators
                    this.type = "binary";
                    return this;
                };
                return s;
            };
            var prefix = function (id, nud) {
                var s = symbol(id);
                s.nud = nud || function () {
                    this.expression = expression(70);
                    this.type = "unary";
                    return this;
                };
                return s;
            };

            symbol("(end)");
            symbol("(name)");
            symbol("(literal)");
            symbol(":");
            symbol(";");
            symbol(",");
            symbol(")");
            symbol("]");
            symbol("}");
            symbol(".."); // range operator
            infix("."); // field reference
            infix("+"); // numeric addition
            infix("-"); // numeric subtraction
            infix("*"); // numeric multiplication
            infix("/"); // numeric division
            infix("%"); // numeric modulus
            infix("="); // equality
            infix("<"); // less than
            infix(">"); // greater than
            infix("!="); // not equal to
            infix("<="); // less than or equal
            infix(">="); // greater than or equal
            infix("&"); // string concatenation
            infix("and"); // Boolean AND
            infix("or"); // Boolean OR
            infix("in"); // is member of array
            infixr(":="); // bind variable
            prefix("-"); // unary numeric negation
            prefix('*', function () {
                this.type = "wildcard";
                return this;
            });
            prefix('**', function () {
                this.type = "descendant";
                return this;
            });
            infix("(", operators['('], function (left) {
                this.procedure = left;
                this.type = 'function';
                this.arguments = [];
                if (node.id !== ')') {
                    for (;;) {
                        if (node.type === 'operator' && node.id === '?') {
                            this.type = 'partial';
                            this.arguments.push(node);
                            advance('?');
                        } else {
                            this.arguments.push(expression(0));
                        }
                        if (node.id !== ',') break;
                        advance(',');
                    }
                }
                advance(")");
                if (left.type === 'name' && (left.value === 'function' || left.value === '\u03BB')) {
                    this.arguments.forEach(function (arg, index) {
                        if (arg.type !== 'variable') {
                            throw {
                                message: 'Parameter ' + (index + 1) + ' of function definition must be a variable name (start with $)',
                                stack: (new Error()).stack,
                                position: arg.position,
                                token: arg.value
                            };
                        }
                    });
                    this.type = 'lambda';
                    advance('{');
                    this.body = expression(0);
                    advance('}');
                }
                return this;
            });
            prefix("(", function () {
                var expressions = [];
                while (node.id !== ")") {
                    expressions.push(expression(0));
                    if (node.id !== ";") {
                        break;
                    }
                    advance(";");
                }
                advance(")");
                this.type = 'block';
                this.expressions = expressions;
                return this;
            });
            prefix("{", function () {
                var a = [];
                if (node.id !== "}") {
                    for (;;) {
                        var n = expression(0);
                        advance(":");
                        var v = expression(0);
                        a.push([n, v]); // holds an array of name/value expression pairs
                        if (node.id !== ",") {
                            break;
                        }
                        advance(",");
                    }
                }
                advance("}");
                this.lhs = a;
                this.type = "unary";
                return this;
            });
            prefix("[", function () {
                var a = [];
                if (node.id !== "]") {
                    for (;;) {
                        var item = expression(0);
                        if (node.id === "..") {
                            var range = {type: "binary", value: "..", position: node.position, lhs: item};
                            advance("..");
                            range.rhs = expression(0);
                            item = range;
                        }
                        a.push(item);
                        if (node.id !== ",") {
                            break;
                        }
                        advance(",");
                    }
                }
                advance("]");
                this.lhs = a;
                this.type = "unary";
                return this;
            });
            infix("[", operators['['], function (left) {
                this.lhs = left;
                this.rhs = expression(operators[']']);
                this.type = 'binary';
                advance("]");
                return this;
            });
            infix("{", operators['{'], function (left) {
                this.lhs = left;
                this.rhs = expression(operators['}']);
                this.type = 'binary';
                advance("}");
                return this;
            });
            infix("?", operators['?'], function (left) {
                this.type = 'condition';
                this.condition = left;
                this.then = expression(0);
                if (node.id === ':') {
                    advance(":");
                    this.else = expression(0);
                }
                return this;
            });
            var tail_call_optimize = function(expr) {
                var result;
                if(expr.type === 'function') {
                    var thunk = {type: 'lambda', thunk: true, arguments: [], position: expr.position};
                    thunk.body = expr;
                    result = thunk;
                } else if(expr.type === 'condition') {
                    expr.then = tail_call_optimize(expr.then);
                    expr.else = tail_call_optimize(expr.else);
                    result = expr;
                } else if(expr.type === 'block') {
                    var length = expr.expressions.length;
                    if(length > 0) {
                        expr.expressions[length - 1] = tail_call_optimize(expr.expressions[length - 1]);
                    }
                    result = expr;
                } else {
                    result = expr;
                }
                return result;
            };
            var post_parse = function (expr) {
                var result = [];
                switch (expr.type) {
                    case 'binary':
                        switch (expr.value) {
                            case '.':
                                var step = post_parse(expr.lhs);
                                if (Array.isArray(step)) {
                                    Array.prototype.push.apply(result, step);
                                } else {
                                    result.push(step);
                                }
                                var rest = [post_parse(expr.rhs)];
                                Array.prototype.push.apply(result, rest);
                                result.type = 'path';
                                break;
                            case '[':
                                result = post_parse(expr.lhs);
                                if (typeof result.aggregate !== 'undefined') {
                                    throw {
                                        message: 'A predicate cannot follow an aggregate in a step. Error at column: ' + expr.position,
                                        stack: (new Error()).stack,
                                        position: expr.position
                                    };
                                }
                                if (typeof result.predicate === 'undefined') {
                                    result.predicate = [];
                                }
                                result.predicate.push(post_parse(expr.rhs));
                                break;
                            case '{':
                                result = post_parse(expr.lhs);
                                if (typeof result.aggregate !== 'undefined') {
                                    throw {
                                        message: 'Each step can only have one aggregator. Error at column: ' + expr.position,
                                        stack: (new Error()).stack,
                                        position: expr.position
                                    };
                                }
                                result.aggregate = post_parse(expr.rhs);
                                break;
                            default:
                                result = {type: expr.type, value: expr.value, position: expr.position};
                                result.lhs = post_parse(expr.lhs);
                                result.rhs = post_parse(expr.rhs);
                        }
                        break;
                    case 'unary':
                        result = {type: expr.type, value: expr.value, position: expr.position};
                        if (expr.value === '[') {
                            result.lhs = expr.lhs.map(function (item) {
                                return post_parse(item);
                            });
                        } else if (expr.value === '{') {
                            result.lhs = expr.lhs.map(function (pair) {
                                return [post_parse(pair[0]), post_parse(pair[1])];
                            });
                        } else {
                            result.expression = post_parse(expr.expression);
                            if (expr.value === '-' && result.expression.type === 'literal' && isNumeric(result.expression.value)) {
                                result = result.expression;
                                result.value = -result.value;
                            }
                        }
                        break;
                    case 'function':
                    case 'partial':
                        result = {type: expr.type, name: expr.name, value: expr.value, position: expr.position};
                        result.arguments = expr.arguments.map(function (arg) {
                            return post_parse(arg);
                        });
                        result.procedure = post_parse(expr.procedure);
                        break;
                    case 'lambda':
                        result = {type: expr.type, arguments: expr.arguments, position: expr.position};
                        var body = post_parse(expr.body);
                        result.body = tail_call_optimize(body);
                        break;
                    case 'condition':
                        result = {type: expr.type, position: expr.position};
                        result.condition = post_parse(expr.condition);
                        result.then = post_parse(expr.then);
                        if (typeof expr.else !== 'undefined') {
                            result.else = post_parse(expr.else);
                        }
                        break;
                    case 'block':
                        result = {type: expr.type, position: expr.position};
                        result.expressions = expr.expressions.map(function (item) {
                            return post_parse(item);
                        });
                        break;
                    case 'name':
                    case 'literal':
                    case 'wildcard':
                    case 'descendant':
                    case 'variable':
                        result = expr;
                        break;
                    case 'operator':
                        if (expr.value === 'and' || expr.value === 'or' || expr.value === 'in') {
                            expr.type = 'name';
                            result = post_parse(expr);
                        } else if (expr.value === '?') {
                            result = expr;
                        } else {
                            throw {
                                message: "Syntax error: " + expr.value + " at column " + expr.position,
                                stack: (new Error()).stack,
                                position: expr.position,
                                token: expr.value
                            };
                        }
                        break;
                    default:
                        var reason = "Unknown expression type: " + expr.value + " at column " + expr.position;
                        if (expr.id === '(end)') {
                            reason = "Syntax error: unexpected end of expression";
                        }
                        throw {
                            message: reason,
                            stack: (new Error()).stack,
                            position: expr.position,
                            token: expr.value
                        };
                }
                return result;
            };

            lexer = tokenizer(source);
            advance();
            var expr = expression(0);
            if (node.id !== '(end)') {
                throw {
                    message: "Syntax error: " + node.value + " at column " + node.position,
                    stack: (new Error()).stack,
                    position: node.position,
                    token: node.value
                };
            }
            expr = post_parse(expr);
            if (expr.type === 'name') {
                expr = [expr];
                expr.type = 'path';
            }

            return expr;
        };
        function isNumeric(n) {
            var isNum = false;
            if(typeof n === 'number') {
                var num = parseFloat(n);
                isNum = !isNaN(num);
                if (isNum && !isFinite(num)) {
                    throw {
                        message: "Number out of range",
                        value: n,
                        stack: (new Error()).stack
                    };
                }
            }
            return isNum;
        }
        function isArrayOfNumbers(arg) {
            var result = false;
            if(Array.isArray(arg)) {
                result = (arg.filter(function(item){return !isNumeric(item);}).length == 0);
            }
            return result;
        }
        Number.isInteger = Number.isInteger || function(value) {
            return typeof value === "number" &&
                isFinite(value) &&
                Math.floor(value) === value;
        };
        function evaluate(expr, input, environment) {
            var result;

            var entryCallback = environment.lookup('__evaluate_entry');
            if(entryCallback) {
                entryCallback(expr, input, environment);
            }

            switch (expr.type) {
                case 'path':
                    result = evaluatePath(expr, input, environment);
                    break;
                case 'binary':
                    result = evaluateBinary(expr, input, environment);
                    break;
                case 'unary':
                    result = evaluateUnary(expr, input, environment);
                    break;
                case 'name':
                    result = evaluateName(expr, input, environment);
                    break;
                case 'literal':
                    result = evaluateLiteral(expr, input, environment);
                    break;
                case 'wildcard':
                    result = evaluateWildcard(expr, input, environment);
                    break;
                case 'descendant':
                    result = evaluateDescendants(expr, input, environment);
                    break;
                case 'condition':
                    result = evaluateCondition(expr, input, environment);
                    break;
                case 'block':
                    result = evaluateBlock(expr, input, environment);
                    break;
                case 'function':
                    result = evaluateFunction(expr, input, environment);
                    break;
                case 'variable':
                    result = evaluateVariable(expr, input, environment);
                    break;
                case 'lambda':
                    result = evaluateLambda(expr, input, environment);
                    break;
                case 'partial':
                    result = evaluatePartialApplication(expr, input, environment);
                    break;
            }
            if (expr.hasOwnProperty('predicate')) {
                result = applyPredicates(expr.predicate, result, environment);
            }
            if (expr.hasOwnProperty('aggregate')) {
                result = applyAggregate(expr.aggregate, result, environment);
            }

            var exitCallback = environment.lookup('__evaluate_exit');
            if(exitCallback) {
                exitCallback(expr, input, environment, result);
            }

            return result;
        }
        function evaluatePath(expr, input, environment) {
            var result;
            var inputSequence;
            if (expr[0].type === 'variable') {
                expr[0].absolute = true;
            } else if(expr[0].type === 'unary' && expr[0].value === '[') {
                input = [null];// dummy singleton sequence for first step
            }
            expr.forEach(function (step) {
                var resultSequence = [];
                result = undefined;
                if (step.absolute === true) {
                    inputSequence = [input]; // dummy singleton sequence for first (absolute) step
                } else if (Array.isArray(input)) {
                    inputSequence = input;
                } else {
                    inputSequence = [input];
                }
                if (expr.length > 1 && step.type === 'literal') {
                    step.type = 'name';
                }
                if (step.value === '{') {
                    if(typeof input !== 'undefined') {
                        result = evaluateGroupExpression(step, inputSequence, environment);
                    }
                } else {
                    inputSequence.forEach(function (item) {
                        var res = evaluate(step, item, environment);
                        if (typeof res !== 'undefined') {
                            if (Array.isArray(res)) {
                                res.forEach(function (innerRes) {
                                    if (typeof innerRes !== 'undefined') {
                                        resultSequence.push(innerRes);
                                    }
                                });
                            } else {
                                resultSequence.push(res);
                            }
                        }
                    });
                    if (resultSequence.length == 1) {
                        result = resultSequence[0];
                    } else if (resultSequence.length > 1) {
                        result = resultSequence;
                    }
                }

                input = result;
            });
            return result;
        }
        function applyPredicates(predicates, input, environment) {
            var result;
            var inputSequence = input;

            var results = [];
            predicates.forEach(function (predicate) {
                if (!Array.isArray(inputSequence)) {
                    inputSequence = [inputSequence];
                }
                results = [];
                result = undefined;
                if (predicate.type === 'literal' && isNumeric(predicate.value)) {
                    var index = predicate.value;
                    if (!Number.isInteger(index)) {
                        index = Math.floor(index);
                    }
                    if (index < 0) {
                        index = inputSequence.length + index;
                    }
                    result = inputSequence[index];
                } else {
                    inputSequence.forEach(function (item, index) {
                        var res = evaluate(predicate, item, environment);
                        if (isNumeric(res)) {
                            res = [res];
                        }
                        if(isArrayOfNumbers(res)) {
                            res.forEach(function(ires) {
                                if (!Number.isInteger(ires)) {
                                    ires = Math.floor(ires);
                                }
                                if (ires < 0) {
                                    ires = inputSequence.length + ires;
                                }
                                if (ires == index) {
                                    results.push(item);
                                }
                            });
                        } else if (functionBoolean(res)) { // truthy
                            results.push(item);
                        }
                    });
                }
                if (results.length == 1) {
                    result = results[0];
                } else if (results.length > 1) {
                    result = results;
                }
                inputSequence = result;
            });
            return result;
        }
        function applyAggregate(expr, input, environment) {
            var result = {};
            if (Array.isArray(input)) {
                var aggEnv = createFrame(environment);
                aggEnv.bind('_', input[0]);
                for (var index = 1; index < input.length; index++) {
                    var reduce = evaluate(expr, input[index], aggEnv);
                    aggEnv.bind('_', reduce);
                }
                result = aggEnv.lookup('_');
            } else {
                result = input;
            }
            return result;
        }
        function evaluateBinary(expr, input, environment) {
            var result;

            switch (expr.value) {
                case '+':
                case '-':
                case '*':
                case '/':
                case '%':
                    result = evaluateNumericExpression(expr, input, environment);
                    break;
                case '=':
                case '!=':
                case '<':
                case '<=':
                case '>':
                case '>=':
                    result = evaluateComparisonExpression(expr, input, environment);
                    break;
                case '&':
                    result = evaluateStringConcat(expr, input, environment);
                    break;
                case 'and':
                case 'or':
                    result = evaluateBooleanExpression(expr, input, environment);
                    break;
                case '..':
                    result = evaluateRangeExpression(expr, input, environment);
                    break;
                case ':=':
                    result = evaluateBindExpression(expr, input, environment);
                    break;
                case 'in':
                    result = evaluateIncludesExpression(expr, input, environment);
                    break;
            }
            return result;
        }
        function evaluateUnary(expr, input, environment) {
            var result;

            switch (expr.value) {
                case '-':
                    result = evaluate(expr.expression, input, environment);
                    if (isNumeric(result)) {
                        result = -result;
                    } else {
                        throw {
                            message: "Cannot negate a non-numeric value: " + result + " at column " + expr.position,
                            stack: (new Error()).stack,
                            position: expr.position,
                            token: expr.value,
                            value: result
                        };
                    }
                    break;
                case '[':
                    result = [];
                    expr.lhs.forEach(function (item) {
                        var value = evaluate(item, input, environment);
                        if (typeof value !== 'undefined') {
                            if (item.value === '..') {
                                result = functionAppend(result, value);
                            } else {
                                result.push(value);
                            }
                        }
                    });
                    break;
                case '{':
                    result = evaluateGroupExpression(expr, input, environment);
                    break;

            }
            return result;
        }
        function evaluateName(expr, input, environment) {
            var result;
            if (Array.isArray(input)) {
                var results = [];
                input.forEach(function (item) {
                    var res = evaluateName(expr, item, environment);
                    if (typeof res !== 'undefined') {
                        results.push(res);
                    }
                });
                if (results.length == 1) {
                    result = results[0];
                } else if (results.length > 1) {
                    result = results;
                }
            } else if (input !== null && typeof input === 'object') {
                result = input[expr.value];
            }
            return result;
        }
        function evaluateLiteral(expr) {
            return expr.value;
        }
        function evaluateWildcard(expr, input) {
            var result;
            var results = [];
            if (input !== null && typeof input === 'object') {
                Object.keys(input).forEach(function (key) {
                    var value = input[key];
                    if(Array.isArray(value)) {
                        value = flatten(value);
                        results = functionAppend(results, value);
                    } else {
                        results.push(value);
                    }
                });
            }

            if (results.length == 1) {
                result = results[0];
            } else if (results.length > 1) {
                result = results;
            }
            return result;
        }
        function flatten(arg, flattened) {
            if(typeof flattened === 'undefined') {
                flattened = [];
            }
            if(Array.isArray(arg)) {
                arg.forEach(function (item) {
                    flatten(item, flattened);
                });
            } else {
                flattened.push(arg);
            }
            return flattened;
        }
        function evaluateDescendants(expr, input) {
            var result;
            var resultSequence = [];
            if (typeof input !== 'undefined') {
                recurseDescendants(input, resultSequence);
                if (resultSequence.length == 1) {
                    result = resultSequence[0];
                } else {
                    result = resultSequence;
                }
            }
            return result;
        }
        function recurseDescendants(input, results) {
            if (!Array.isArray(input)) {
                results.push(input);
            }
            if (Array.isArray(input)) {
                input.forEach(function (member) {
                    recurseDescendants(member, results);
                });
            } else if (input !== null && typeof input === 'object') {
                Object.keys(input).forEach(function (key) {
                    recurseDescendants(input[key], results);
                });
            }
        }
        function evaluateNumericExpression(expr, input, environment) {
            var result;

            var lhs = evaluate(expr.lhs, input, environment);
            var rhs = evaluate(expr.rhs, input, environment);

            if (typeof lhs === 'undefined' || typeof rhs === 'undefined') {
                return result;
            }

            if (!isNumeric(lhs)) {
                throw {
                    message: 'LHS of ' + expr.value + ' operator must evaluate to a number at column ' + expr.position,
                    stack: (new Error()).stack,
                    position: expr.position,
                    token: expr.value,
                    value: lhs
                };
            }
            if (!isNumeric(rhs)) {
                throw {
                    message: 'RHS of ' + expr.value + ' operator must evaluate to a number at column ' + expr.position,
                    stack: (new Error()).stack,
                    position: expr.position,
                    token: expr.value,
                    value: rhs
                };
            }

            switch (expr.value) {
                case '+':
                    result = lhs + rhs;
                    break;
                case '-':
                    result = lhs - rhs;
                    break;
                case '*':
                    result = lhs * rhs;
                    break;
                case '/':
                    result = lhs / rhs;
                    break;
                case '%':
                    result = lhs % rhs;
                    break;
            }
            return result;
        }
        function evaluateComparisonExpression(expr, input, environment) {
            var result;

            var lhs = evaluate(expr.lhs, input, environment);
            var rhs = evaluate(expr.rhs, input, environment);

            if (typeof lhs === 'undefined' || typeof rhs === 'undefined') {
                return false;
            }

            switch (expr.value) {
                case '=':
                    result = lhs == rhs;
                    break;
                case '!=':
                    result = (lhs != rhs);
                    break;
                case '<':
                    result = lhs < rhs;
                    break;
                case '<=':
                    result = lhs <= rhs;
                    break;
                case '>':
                    result = lhs > rhs;
                    break;
                case '>=':
                    result = lhs >= rhs;
                    break;
            }
            return result;
        }
        function evaluateIncludesExpression(expr, input, environment) {
            var result = false;

            var lhs = evaluate(expr.lhs, input, environment);
            var rhs = evaluate(expr.rhs, input, environment);

            if (typeof lhs === 'undefined' || typeof rhs === 'undefined') {
                return false;
            }

            if(!Array.isArray(rhs)) {
                rhs = [rhs];
            }

            for(var i = 0; i < rhs.length; i++) {
                if(rhs[i] === lhs) {
                    result = true;
                    break;
                }
            }

            return result;
        }
        function evaluateBooleanExpression(expr, input, environment) {
            var result;

            switch (expr.value) {
                case 'and':
                    result = functionBoolean(evaluate(expr.lhs, input, environment)) &&
                        functionBoolean(evaluate(expr.rhs, input, environment));
                    break;
                case 'or':
                    result = functionBoolean(evaluate(expr.lhs, input, environment)) ||
                        functionBoolean(evaluate(expr.rhs, input, environment));
                    break;
            }
            return result;
        }
        function evaluateStringConcat(expr, input, environment) {
            var result;
            var lhs = evaluate(expr.lhs, input, environment);
            var rhs = evaluate(expr.rhs, input, environment);

            var lstr = '';
            var rstr = '';
            if (typeof lhs !== 'undefined') {
                lstr = functionString(lhs);
            }
            if (typeof rhs !== 'undefined') {
                rstr = functionString(rhs);
            }

            result = lstr.concat(rstr);
            return result;
        }
        function evaluateGroupExpression(expr, input, environment) {
            var result = {};
            var groups = {};
            if (!Array.isArray(input)) {
                input = [input];
            }
            input.forEach(function (item) {
                expr.lhs.forEach(function (pair) {
                    var key = evaluate(pair[0], item, environment);
                    if (typeof  key !== 'string') {
                        throw {
                            message: 'Key in object structure must evaluate to a string. Got: ' + key + ' at column ' + expr.position,
                            stack: (new Error()).stack,
                            position: expr.position,
                            value: key
                        };
                    }
                    var entry = {data: item, expr: pair[1]};
                    if (groups.hasOwnProperty(key)) {
                        groups[key].data = functionAppend(groups[key].data, item);
                    } else {
                        groups[key] = entry;
                    }
                });
            });
            for (var key in groups) {
                var entry = groups[key];
                var value = evaluate(entry.expr, entry.data, environment);
                result[key] = value;
            }
            return result;
        }
        function evaluateRangeExpression(expr, input, environment) {
            var result;

            var lhs = evaluate(expr.lhs, input, environment);
            var rhs = evaluate(expr.rhs, input, environment);

            if (typeof lhs === 'undefined' || typeof rhs === 'undefined') {
                return result;
            }

            if (lhs > rhs) {
                return result;
            }

            if (!Number.isInteger(lhs)) {
                throw {
                    message: 'LHS of range operator (..) must evaluate to an integer at column ' + expr.position,
                    stack: (new Error()).stack,
                    position: expr.position,
                    token: expr.value,
                    value: lhs
                };
            }
            if (!Number.isInteger(rhs)) {
                throw {
                    message: 'RHS of range operator (..) must evaluate to an integer at column ' + expr.position,
                    stack: (new Error()).stack,
                    position: expr.position,
                    token: expr.value,
                    value: rhs
                };
            }

            result = new Array(rhs - lhs + 1);
            for (var item = lhs, index = 0; item <= rhs; item++, index++) {
                result[index] = item;
            }
            return result;
        }
        function evaluateBindExpression(expr, input, environment) {
            var value = evaluate(expr.rhs, input, environment);
            if (expr.lhs.type !== 'variable') {
                throw {
                    message: "Left hand side of := must be a variable name (start with $) at column " + expr.position,
                    stack: (new Error()).stack,
                    position: expr.position,
                    token: expr.value,
                    value: expr.lhs.value
                };
            }
            environment.bind(expr.lhs.value, value);
            return value;
        }
        function evaluateCondition(expr, input, environment) {
            var result;
            var condition = evaluate(expr.condition, input, environment);
            if (functionBoolean(condition)) {
                result = evaluate(expr.then, input, environment);
            } else if (typeof expr.else !== 'undefined') {
                result = evaluate(expr.else, input, environment);
            }
            return result;
        }
        function evaluateBlock(expr, input, environment) {
            var result;
            var frame = createFrame(environment);
            expr.expressions.forEach(function (expression) {
                result = evaluate(expression, input, frame);
            });

            return result;
        }
        function evaluateVariable(expr, input, environment) {
            var result;
            if (expr.value === '') {
                result = input;
            } else {
                result = environment.lookup(expr.value);
            }
            return result;
        }
        function evaluateFunction(expr, input, environment) {
            var result;
            var evaluatedArgs = [];
            expr.arguments.forEach(function (arg) {
                evaluatedArgs.push(evaluate(arg, input, environment));
            });
            var proc = evaluate(expr.procedure, input, environment);

            if (typeof proc === 'undefined' && expr.procedure.type === 'name' && environment.lookup(expr.procedure.value)) {
                throw {
                    message: 'Attempted to invoke a non-function at column ' + expr.position + '. Did you mean \'$' + expr.procedure.value + '\'?',
                    stack: (new Error()).stack,
                    position: expr.position,
                    token: expr.procedure.value
                };
            }
            try {
                result = apply(proc, evaluatedArgs, environment, input);
                while(typeof result === 'object' && result.lambda == true && result.thunk == true) {
                    var next = evaluate(result.body.procedure, result.input, result.environment);
                    evaluatedArgs = [];
                    result.body.arguments.forEach(function (arg) {
                        evaluatedArgs.push(evaluate(arg, result.input, result.environment));
                    });

                    result = apply(next, evaluatedArgs);
                }
            } catch (err) {
                err.position = expr.position;
                err.token = expr.procedure.value;
                throw err;
            }
            return result;
        }
        function apply(proc, args, environment, self) {
            var result;
            if (proc && proc.lambda) {
                result = applyProcedure(proc, args);
            } else if (typeof proc === 'function') {
                result = proc.apply(self, args);
            } else {
                throw {
                    message: 'Attempted to invoke a non-function',
                    stack: (new Error()).stack
                };
            }
            return result;
        }
        function evaluateLambda(expr, input, environment) {
            var procedure = {
                lambda: true,
                input: input,
                environment: environment,
                arguments: expr.arguments,
                body: expr.body
            };
            if(expr.thunk == true) {
                procedure.thunk = true;
            }
            return procedure;
        }
        function evaluatePartialApplication(expr, input, environment) {
            var result;
            var evaluatedArgs = [];
            expr.arguments.forEach(function (arg) {
                if (arg.type === 'operator' && arg.value === '?') {
                    evaluatedArgs.push(arg);
                } else {
                    evaluatedArgs.push(evaluate(arg, input, environment));
                }
            });
            var proc = evaluate(expr.procedure, input, environment);
            if (typeof proc === 'undefined' && expr.procedure.type === 'name' && environment.lookup(expr.procedure.value)) {
                throw {
                    message: 'Attempted to partially apply a non-function at column ' + expr.position + '. Did you mean \'$' + expr.procedure.value + '\'?',
                    stack: (new Error()).stack,
                    position: expr.position,
                    token: expr.procedure.value
                };
            }
            if (proc && proc.lambda) {
                result = partialApplyProcedure(proc, evaluatedArgs);
            } else if (typeof proc === 'function') {
                result = partialApplyNativeFunction(proc, evaluatedArgs);
            } else {
                throw {
                    message: 'Attempted to partially apply a non-function at column ' + expr.position,
                    stack: (new Error()).stack,
                    position: expr.position,
                    token: expr.procedure.value
                };
            }
            return result;
        }
        function applyProcedure(proc, args) {
            var result;
            var env = createFrame(proc.environment);
            proc.arguments.forEach(function (param, index) {
                env.bind(param.value, args[index]);
            });
            if (typeof proc.body === 'function') {
                result = applyNativeFunction(proc.body, env);
            } else {
                result = evaluate(proc.body, proc.input, env);
            }
            return result;
        }
        function partialApplyProcedure(proc, args) {
            var env = createFrame(proc.environment);
            var unboundArgs = [];
            proc.arguments.forEach(function (param, index) {
                var arg = args[index];
                if (arg && arg.type === 'operator' && arg.value === '?') {
                    unboundArgs.push(param);
                } else {
                    env.bind(param.value, arg);
                }
            });
            var procedure = {
                lambda: true,
                input: proc.input,
                environment: env,
                arguments: unboundArgs,
                body: proc.body
            };
            return procedure;
        }
        function partialApplyNativeFunction(native, args) {
            var sigArgs = getNativeFunctionArguments(native);
            sigArgs = sigArgs.map(function (sigArg) {
                return '$' + sigArg.trim();
            });
            var body = 'function(' + sigArgs.join(', ') + '){ _ }';

            var bodyAST = parser(body);
            bodyAST.body = native;

            var partial = partialApplyProcedure(bodyAST, args);
            return partial;
        }
        function applyNativeFunction(proc, env) {
            var sigArgs = getNativeFunctionArguments(proc);
            var args = sigArgs.map(function (sigArg) {
                return env.lookup(sigArg.trim());
            });

            var result = proc.apply(null, args);
            return result;
        }
        function getNativeFunctionArguments(func) {
            var signature = func.toString();
            var sigParens = /\(([^\)]*)\)/.exec(signature)[1]; // the contents of the parens
            var sigArgs = sigParens.split(',');
            return sigArgs;
        }
        function isLambda(arg) {
            var result = false;
            if(arg && typeof arg === 'object' &&
              arg.lambda === true &&
              arg.hasOwnProperty('input') &&
              arg.hasOwnProperty('arguments') &&
              arg.hasOwnProperty('environment') &&
              arg.hasOwnProperty('body')) {
                result = true;
            }

            return result;
        }
        function functionSum(args) {
            var total = 0;

            if (arguments.length != 1) {
                throw {
                    message: 'The sum function expects one argument',
                    stack: (new Error()).stack
                };
            }
            if(typeof args === 'undefined') {
                return undefined;
            }

            if(!Array.isArray(args)) {
                args = [args];
            }
            var nonNumerics = args.filter(function(val) {return (typeof val !== 'number');});
            if(nonNumerics.length > 0) {
                throw {
                    message: 'Type error: argument of sum function must be an array of numbers',
                    stack: (new Error()).stack,
                    value: nonNumerics
                };
            }
            args.forEach(function(num){total += num;});
            return total;
        }
        function functionCount(args) {
            if (arguments.length != 1) {
                throw {
                    message: 'The count function expects one argument',
                    stack: (new Error()).stack
                };
            }
            if(typeof args === 'undefined') {
                return 0;
            }

            if(!Array.isArray(args)) {
                args = [args];
            }

            return args.length;
        }
        function functionMax(args) {
            var max;

            if (arguments.length != 1) {
                throw {
                    message: 'The max function expects one argument',
                    stack: (new Error()).stack
                };
            }
            if(typeof args === 'undefined') {
                return undefined;
            }

            if(!Array.isArray(args)) {
                args = [args];
            }
            var nonNumerics = args.filter(function(val) {return (typeof val !== 'number');});
            if(nonNumerics.length > 0) {
                throw {
                    message: 'Type error: argument of max function must be an array of numbers',
                    stack: (new Error()).stack,
                    value: nonNumerics
                };
            }
            max = Math.max.apply(Math, args);
            return max;
        }
        function functionMin(args) {
            var min;

            if (arguments.length != 1) {
                throw {
                    message: 'The min function expects one argument',
                    stack: (new Error()).stack
                };
            }
            if(typeof args === 'undefined') {
                return undefined;
            }

            if(!Array.isArray(args)) {
                args = [args];
            }
            var nonNumerics = args.filter(function(val) {return (typeof val !== 'number');});
            if(nonNumerics.length > 0) {
                throw {
                    message: 'Type error: argument of min function must be an array of numbers',
                    stack: (new Error()).stack,
                    value: nonNumerics
                };
            }
            min = Math.min.apply(Math, args);
            return min;
        }
        function functionAverage(args) {
            var total = 0;

            if (arguments.length != 1) {
                throw {
                    message: 'The average function expects one argument',
                    stack: (new Error()).stack
                };
            }
            if(typeof args === 'undefined') {
                return undefined;
            }

            if(!Array.isArray(args)) {
                args = [args];
            }
            var nonNumerics = args.filter(function(val) {return (typeof val !== 'number');});
            if(nonNumerics.length > 0) {
                throw {
                    message: 'Type error: argument of average function must be an array of numbers',
                    stack: (new Error()).stack,
                    value: nonNumerics
                };
            }
            args.forEach(function(num){total += num;});
            return total/args.length;
        }
        function functionString(arg) {
            var str;

            if(arguments.length != 1) {
                throw {
                    message: 'The string function expects one argument',
                    stack: (new Error()).stack
                };
            }
            if(typeof arg === 'undefined') {
                return undefined;
            }

            if (typeof arg === 'string') {
                str = arg;
            } else if(typeof arg === 'function' || isLambda(arg)) {
                str = '';
            } else if (typeof arg === 'number' && !isFinite(arg)) {
                throw {
                    message: "Attempting to invoke string function on Infinity or NaN",
                    value: arg,
                    stack: (new Error()).stack
                };
            } else
                str = JSON.stringify(arg, function (key, val) {
                    return (typeof val !== 'undefined' && val !== null && val.toPrecision && isNumeric(val)) ? Number(val.toPrecision(13)) :
                        (val && isLambda(val)) ? '' :
                            (typeof val === 'function') ? '' : val;
                });
            return str;
        }
        function functionSubstring(str, start, length) {
            if(arguments.length != 2 && arguments.length != 3) {
                throw {
                    message: 'The substring function expects two or three arguments',
                    stack: (new Error()).stack
                };
            }
            if(typeof str === 'undefined') {
                return undefined;
            }
            if(typeof str !== 'string') {
                throw {
                    message: 'Type error: first argument of substring function must evaluate to a string',
                    stack: (new Error()).stack,
                    value: str
                };
            }

            if(typeof start !== 'number') {
                throw {
                    message: 'Type error: second argument of substring function must evaluate to a number',
                    stack: (new Error()).stack,
                    value: start
                };
            }

            if(typeof length !== 'undefined' && typeof length !== 'number') {
                throw {
                    message: 'Type error: third argument of substring function must evaluate to a number',
                    stack: (new Error()).stack,
                    value: length
                };
            }

            return str.substr(start, length);
        }
        function functionSubstringBefore(str, chars) {
            if(arguments.length != 2) {
                throw {
                    message: 'The substringBefore function expects two arguments',
                    stack: (new Error()).stack
                };
            }
            if(typeof str === 'undefined') {
                return undefined;
            }
            if(typeof str !== 'string') {
                throw {
                    message: 'Type error: first argument of substringBefore function must evaluate to a string',
                    stack: (new Error()).stack,
                    value: str
                };
            }
            if(typeof chars !== 'string') {
                throw {
                    message: 'Type error: second argument of substringBefore function must evaluate to a string',
                    stack: (new Error()).stack,
                    value: chars
                };
            }

            var pos = str.indexOf(chars);
            if (pos > -1) {
                return str.substr(0, pos);
            } else {
                return str;
            }
        }
        function functionSubstringAfter(str, chars) {
            if(arguments.length != 2) {
                throw {
                    message: 'The substringAfter function expects two arguments',
                    stack: (new Error()).stack
                };
            }
            if(typeof str === 'undefined') {
                return undefined;
            }
            if(typeof str !== 'string') {
                throw {
                    message: 'Type error: first argument of substringAfter function must evaluate to a string',
                    stack: (new Error()).stack,
                    value: str
                };
            }
            if(typeof chars !== 'string') {
                throw {
                    message: 'Type error: second argument of substringAfter function must evaluate to a string',
                    stack: (new Error()).stack,
                    value: chars
                };
            }

            var pos = str.indexOf(chars);
            if (pos > -1) {
                return str.substr(pos + chars.length);
            } else {
                return str;
            }
        }
        function functionLowercase(str) {
            if(arguments.length != 1) {
                throw {
                    message: 'The lowercase function expects one argument',
                    stack: (new Error()).stack
                };
            }
            if(typeof str === 'undefined') {
                return undefined;
            }
            if(typeof str !== 'string') {
                throw {
                    message: 'Type error: argument of lowercase function must evaluate to a string',
                    stack: (new Error()).stack,
                    value: str
                };
            }

            return str.toLowerCase();
        }
        function functionUppercase(str) {
            if(arguments.length != 1) {
                throw {
                    message: 'The uppercase function expects one argument',
                    stack: (new Error()).stack
                };
            }
            if(typeof str === 'undefined') {
                return undefined;
            }
            if(typeof str !== 'string') {
                throw {
                    message: 'Type error: argument of uppercase function must evaluate to a string',
                    stack: (new Error()).stack,
                    value: str
                };
            }

            return str.toUpperCase();
        }
        function functionLength(str) {
            if(arguments.length != 1) {
                throw {
                    message: 'The length function expects one argument',
                    stack: (new Error()).stack
                };
            }
            if(typeof str === 'undefined') {
                return undefined;
            }
            if(typeof str !== 'string') {
                throw {
                    message: 'Type error: argument of length function must evaluate to a string',
                    stack: (new Error()).stack,
                    value: str
                };
            }

            return str.length;
        }
        function functionSplit(str, separator, limit) {
            if(arguments.length != 2 && arguments.length != 3) {
                throw {
                    message: 'The split function expects two or three arguments',
                    stack: (new Error()).stack
                };
            }
            if(typeof str === 'undefined') {
                return undefined;
            }
            if(typeof str !== 'string') {
                throw {
                    message: 'Type error: first argument of split function must evaluate to a string',
                    stack: (new Error()).stack,
                    value: str
                };
            }
            if(typeof separator !== 'string') {
                throw {
                    message: 'Type error: second argument of split function must evaluate to a string',
                    stack: (new Error()).stack,
                    value: separator
                };
            }
            if(typeof limit !== 'undefined' && (typeof limit !== 'number' || limit < 0)) {
                throw {
                    message: 'Type error: third argument of split function must evaluate to a positive number',
                    stack: (new Error()).stack,
                    value: limit
                };
            }

            return str.split(separator, limit);
        }
        function functionJoin(strs, separator) {
            if(arguments.length != 1 && arguments.length != 2) {
                throw {
                    message: 'The join function expects one or two arguments',
                    stack: (new Error()).stack
                };
            }
            if(typeof strs === 'undefined') {
                return undefined;
            }

            if(!Array.isArray(strs)) {
                strs = [strs];
            }
            var nonStrings = strs.filter(function(val) {return (typeof val !== 'string');});
            if(nonStrings.length > 0) {
                throw {
                    message: 'Type error: first argument of join function must be an array of strings',
                    stack: (new Error()).stack,
                    value: nonStrings
                };
            }
            if(typeof separator === 'undefined') {
                separator = "";
            }
            if(typeof separator !== 'string') {
                throw {
                    message: 'Type error: second argument of split function must evaluate to a string',
                    stack: (new Error()).stack,
                    value: separator
                };
            }

            return strs.join(separator);
        }
        function functionNumber(arg) {
            var result;

            if(arguments.length != 1) {
                throw {
                    message: 'The number function expects one argument',
                    stack: (new Error()).stack
                };
            }
            if(typeof arg === 'undefined') {
                return undefined;
            }

            if (typeof arg === 'number') {
                result = arg;
            } else if(typeof arg === 'string' && /^-?(0|([1-9][0-9]*))(\.[0-9]+)?([Ee][-+]?[0-9]+)?$/.test(arg) && !isNaN(parseFloat(arg)) && isFinite(arg)) {
                result = parseFloat(arg);
            } else {
                throw {
                    message: "Unable to cast value to a number",
                    value: arg,
                    stack: (new Error()).stack
                };
            }
            return result;
        }
        function functionBoolean(arg) {

            if(arguments.length != 1) {
                throw {
                    message: 'The boolean function expects one argument',
                    stack: (new Error()).stack
                };
            }
            if(typeof arg === 'undefined') {
                return undefined;
            }

            var result = false;
            if (Array.isArray(arg)) {
                if (arg.length == 1) {
                    result = functionBoolean(arg[0]);
                } else if (arg.length > 1) {
                    var trues = arg.filter(function(val) {return functionBoolean(val);});
                    result = trues.length > 0;
                }
            } else if (typeof arg === 'string') {
                if (arg.length > 0) {
                    result = true;
                }
            } else if (isNumeric(arg)) {
                if (arg != 0) {
                    result = true;
                }
            } else if (arg != null && typeof arg === 'object') {
                if (Object.keys(arg).length > 0) {
                    if (!(isLambda(arg))) {
                        result = true;
                    }
                }
            } else if (typeof arg === 'boolean' && arg == true) {
                result = true;
            }
            return result;
        }
        function functionNot(arg) {
            return !functionBoolean(arg);
        }
        function functionMap(func) {
            var varargs = arguments;
            var result = [];
            var args = [];
            for (var ii = 1; ii < varargs.length; ii++) {
                if (Array.isArray(varargs[ii])) {
                    args.push(varargs[ii]);
                } else {
                    args.push([varargs[ii]]);
                }

            }
            if (args.length > 0) {
                for (var i = 0; i < args[0].length; i++) {
                    var func_args = [];
                    for (var j = 0; j < func.arguments.length; j++) {
                        func_args.push(args[j][i]);
                    }
                    result.push(apply(func, func_args, null, null));
                }
            }
            return result;
        }
        function functionFoldLeft(func, sequence, init) {
            var result;

            if (!(func.length == 2 || func.arguments.length == 2)) {
                throw {
                    message: 'The first argument of the reduce function must be a function of arity 2',
                    stack: (new Error()).stack
                };
            }

            if (!Array.isArray(sequence)) {
                sequence = [sequence];
            }

            var index;
            if (typeof init === 'undefined' && sequence.length > 0) {
                result = sequence[0];
                index = 1;
            } else {
                result = init;
                index = 0;
            }

            while (index < sequence.length) {
                result = apply(func, [result, sequence[index]], null, null);
                index++;
            }

            return result;
        }
        function functionKeys(arg) {
            var result = [];

            if(Array.isArray(arg)) {
                var merge = {};
                arg.forEach(function(item) {
                    var keys = functionKeys(item);
                    if(Array.isArray(keys)) {
                        keys.forEach(function(key) {
                            merge[key] = true;
                        });
                    }
                });
                result = functionKeys(merge);
            } else if(arg != null && typeof arg === 'object' && !(isLambda(arg))) {
                result = Object.keys(arg);
                if(result.length == 0) {
                    result = undefined;
                }
            } else {
                result = undefined;
            }
            return result;
        }
        function functionLookup(object, key) {
            var result = evaluateName({value: key}, object);
            return result;
        }
        function functionAppend(arg1, arg2) {
            if (typeof arg1 === 'undefined') {
                return arg2;
            }
            if (typeof arg2 === 'undefined') {
                return arg1;
            }
            if (!Array.isArray(arg1)) {
                arg1 = [arg1];
            }
            if (!Array.isArray(arg2)) {
                arg2 = [arg2];
            }
            Array.prototype.push.apply(arg1, arg2);
            return arg1;
        }
        function functionExists(arg){
            if (arguments.length != 1) {
                throw {
                    message: 'The exists function expects one argument',
                    stack: (new Error()).stack
                };
            }

            if (typeof arg === 'undefined') {
                return false;
            } else {
                return true;
            }
        }
        function functionSpread(arg) {
            var result = [];

            if(Array.isArray(arg)) {
                arg.forEach(function(item) {
                    result = functionAppend(result, functionSpread(item));
                });
            } else if(arg != null && typeof arg === 'object' && !isLambda(arg)) {
                for(var key in arg) {
                    var obj = {};
                    obj[key] = arg[key];
                    result.push(obj);
                }
            } else {
                result = arg;
            }
            return result;
        }
        function createFrame(enclosingEnvironment) {
            var bindings = {};
            return {
                bind: function (name, value) {
                    bindings[name] = value;
                },
                lookup: function (name) {
                    var value = bindings[name];
                    if (typeof value === 'undefined' && enclosingEnvironment) {
                        value = enclosingEnvironment.lookup(name);
                    }
                    return value;
                }
            };
        }

        var staticFrame = createFrame(null);

        staticFrame.bind('sum', functionSum);
        staticFrame.bind('count', functionCount);
        staticFrame.bind('max', functionMax);
        staticFrame.bind('min', functionMin);
        staticFrame.bind('average', functionAverage);
        staticFrame.bind('string', functionString);
        staticFrame.bind('substring', functionSubstring);
        staticFrame.bind('substringBefore', functionSubstringBefore);
        staticFrame.bind('substringAfter', functionSubstringAfter);
        staticFrame.bind('lowercase', functionLowercase);
        staticFrame.bind('uppercase', functionUppercase);
        staticFrame.bind('length', functionLength);
        staticFrame.bind('split', functionSplit);
        staticFrame.bind('join', functionJoin);
        staticFrame.bind('number', functionNumber);
        staticFrame.bind('boolean', functionBoolean);
        staticFrame.bind('not', functionNot);
        staticFrame.bind('map', functionMap);
        staticFrame.bind('reduce', functionFoldLeft);
        staticFrame.bind('keys', functionKeys);
        staticFrame.bind('lookup', functionLookup);
        staticFrame.bind('append', functionAppend);
        staticFrame.bind('exists', functionExists);
        staticFrame.bind('spread', functionSpread);

        function jsonata(expr) {
            var ast = parser(expr);
            var environment = createFrame(staticFrame);
            return {
                evaluate: function (input, bindings) {
                    if (typeof bindings !== 'undefined') {
                        var exec_env;
                        exec_env = createFrame(environment);
                        for (var v in bindings) {
                            exec_env.bind(v, bindings[v]);
                        }
                    } else {
                        exec_env = environment;
                    }
                    exec_env.bind('$', input);
                    return evaluate(ast, input, exec_env);
                },
                assign: function (name, value) {
                    environment.bind(name, value);
                }
            };
        }

        jsonata.parser = parser;

        return jsonata;

    })();




    var oop = require("../lib/oop");
    var Mirror = require("../worker/mirror").Mirror;

    var JSONataWorker = exports.JSONataWorker = function(sender) {
        Mirror.call(this, sender);
        this.setTimeout(200);
    };

    oop.inherits(JSONataWorker, Mirror);

    (function() {

        this.onUpdate = function() {
            var value = this.doc.getValue();
            var errors = [];
            try {
                if (value)
                    jsonata(value);
            } catch (e) {
                var pos = this.doc.indexToPosition(e.position-1);
                var msg = e.message;
                msg = msg.replace(/ at column \d+/,"");
                errors.push({
                    row: pos.row,
                    column: pos.column,
                    text: msg,
                    type: "error"
                });
            }
            this.sender.emit("annotate", errors);
        };

    }).call(JSONataWorker.prototype);

});

define("ace/lib/es5-shim",["require","exports","module"], function(require, exports, module) {

function Empty() {}

if (!Function.prototype.bind) {
    Function.prototype.bind = function bind(that) { // .length is 1
        var target = this;
        if (typeof target != "function") {
            throw new TypeError("Function.prototype.bind called on incompatible " + target);
        }
        var args = slice.call(arguments, 1); // for normal call
        var bound = function () {

            if (this instanceof bound) {

                var result = target.apply(
                    this,
                    args.concat(slice.call(arguments))
                );
                if (Object(result) === result) {
                    return result;
                }
                return this;

            } else {
                return target.apply(
                    that,
                    args.concat(slice.call(arguments))
                );

            }

        };
        if(target.prototype) {
            Empty.prototype = target.prototype;
            bound.prototype = new Empty();
            Empty.prototype = null;
        }
        return bound;
    };
}
var call = Function.prototype.call;
var prototypeOfArray = Array.prototype;
var prototypeOfObject = Object.prototype;
var slice = prototypeOfArray.slice;
var _toString = call.bind(prototypeOfObject.toString);
var owns = call.bind(prototypeOfObject.hasOwnProperty);
var defineGetter;
var defineSetter;
var lookupGetter;
var lookupSetter;
var supportsAccessors;
if ((supportsAccessors = owns(prototypeOfObject, "__defineGetter__"))) {
    defineGetter = call.bind(prototypeOfObject.__defineGetter__);
    defineSetter = call.bind(prototypeOfObject.__defineSetter__);
    lookupGetter = call.bind(prototypeOfObject.__lookupGetter__);
    lookupSetter = call.bind(prototypeOfObject.__lookupSetter__);
}
if ([1,2].splice(0).length != 2) {
    if(function() { // test IE < 9 to splice bug - see issue #138
        function makeArray(l) {
            var a = new Array(l+2);
            a[0] = a[1] = 0;
            return a;
        }
        var array = [], lengthBefore;

        array.splice.apply(array, makeArray(20));
        array.splice.apply(array, makeArray(26));

        lengthBefore = array.length; //46
        array.splice(5, 0, "XXX"); // add one element

        lengthBefore + 1 == array.length

        if (lengthBefore + 1 == array.length) {
            return true;// has right splice implementation without bugs
        }
    }()) {//IE 6/7
        var array_splice = Array.prototype.splice;
        Array.prototype.splice = function(start, deleteCount) {
            if (!arguments.length) {
                return [];
            } else {
                return array_splice.apply(this, [
                    start === void 0 ? 0 : start,
                    deleteCount === void 0 ? (this.length - start) : deleteCount
                ].concat(slice.call(arguments, 2)))
            }
        };
    } else {//IE8
        Array.prototype.splice = function(pos, removeCount){
            var length = this.length;
            if (pos > 0) {
                if (pos > length)
                    pos = length;
            } else if (pos == void 0) {
                pos = 0;
            } else if (pos < 0) {
                pos = Math.max(length + pos, 0);
            }

            if (!(pos+removeCount < length))
                removeCount = length - pos;

            var removed = this.slice(pos, pos+removeCount);
            var insert = slice.call(arguments, 2);
            var add = insert.length;
            if (pos === length) {
                if (add) {
                    this.push.apply(this, insert);
                }
            } else {
                var remove = Math.min(removeCount, length - pos);
                var tailOldPos = pos + remove;
                var tailNewPos = tailOldPos + add - remove;
                var tailCount = length - tailOldPos;
                var lengthAfterRemove = length - remove;

                if (tailNewPos < tailOldPos) { // case A
                    for (var i = 0; i < tailCount; ++i) {
                        this[tailNewPos+i] = this[tailOldPos+i];
                    }
                } else if (tailNewPos > tailOldPos) { // case B
                    for (i = tailCount; i--; ) {
                        this[tailNewPos+i] = this[tailOldPos+i];
                    }
                } // else, add == remove (nothing to do)

                if (add && pos === lengthAfterRemove) {
                    this.length = lengthAfterRemove; // truncate array
                    this.push.apply(this, insert);
                } else {
                    this.length = lengthAfterRemove + add; // reserves space
                    for (i = 0; i < add; ++i) {
                        this[pos+i] = insert[i];
                    }
                }
            }
            return removed;
        };
    }
}
if (!Array.isArray) {
    Array.isArray = function isArray(obj) {
        return _toString(obj) == "[object Array]";
    };
}
var boxedString = Object("a"),
    splitString = boxedString[0] != "a" || !(0 in boxedString);

if (!Array.prototype.forEach) {
    Array.prototype.forEach = function forEach(fun /*, thisp*/) {
        var object = toObject(this),
            self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
            thisp = arguments[1],
            i = -1,
            length = self.length >>> 0;
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(); // TODO message
        }

        while (++i < length) {
            if (i in self) {
                fun.call(thisp, self[i], i, object);
            }
        }
    };
}
if (!Array.prototype.map) {
    Array.prototype.map = function map(fun /*, thisp*/) {
        var object = toObject(this),
            self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
            length = self.length >>> 0,
            result = Array(length),
            thisp = arguments[1];
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }

        for (var i = 0; i < length; i++) {
            if (i in self)
                result[i] = fun.call(thisp, self[i], i, object);
        }
        return result;
    };
}
if (!Array.prototype.filter) {
    Array.prototype.filter = function filter(fun /*, thisp */) {
        var object = toObject(this),
            self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                    object,
            length = self.length >>> 0,
            result = [],
            value,
            thisp = arguments[1];
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }

        for (var i = 0; i < length; i++) {
            if (i in self) {
                value = self[i];
                if (fun.call(thisp, value, i, object)) {
                    result.push(value);
                }
            }
        }
        return result;
    };
}
if (!Array.prototype.every) {
    Array.prototype.every = function every(fun /*, thisp */) {
        var object = toObject(this),
            self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
            length = self.length >>> 0,
            thisp = arguments[1];
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }

        for (var i = 0; i < length; i++) {
            if (i in self && !fun.call(thisp, self[i], i, object)) {
                return false;
            }
        }
        return true;
    };
}
if (!Array.prototype.some) {
    Array.prototype.some = function some(fun /*, thisp */) {
        var object = toObject(this),
            self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
            length = self.length >>> 0,
            thisp = arguments[1];
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }

        for (var i = 0; i < length; i++) {
            if (i in self && fun.call(thisp, self[i], i, object)) {
                return true;
            }
        }
        return false;
    };
}
if (!Array.prototype.reduce) {
    Array.prototype.reduce = function reduce(fun /*, initial*/) {
        var object = toObject(this),
            self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
            length = self.length >>> 0;
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }
        if (!length && arguments.length == 1) {
            throw new TypeError("reduce of empty array with no initial value");
        }

        var i = 0;
        var result;
        if (arguments.length >= 2) {
            result = arguments[1];
        } else {
            do {
                if (i in self) {
                    result = self[i++];
                    break;
                }
                if (++i >= length) {
                    throw new TypeError("reduce of empty array with no initial value");
                }
            } while (true);
        }

        for (; i < length; i++) {
            if (i in self) {
                result = fun.call(void 0, result, self[i], i, object);
            }
        }

        return result;
    };
}
if (!Array.prototype.reduceRight) {
    Array.prototype.reduceRight = function reduceRight(fun /*, initial*/) {
        var object = toObject(this),
            self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
            length = self.length >>> 0;
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }
        if (!length && arguments.length == 1) {
            throw new TypeError("reduceRight of empty array with no initial value");
        }

        var result, i = length - 1;
        if (arguments.length >= 2) {
            result = arguments[1];
        } else {
            do {
                if (i in self) {
                    result = self[i--];
                    break;
                }
                if (--i < 0) {
                    throw new TypeError("reduceRight of empty array with no initial value");
                }
            } while (true);
        }

        do {
            if (i in this) {
                result = fun.call(void 0, result, self[i], i, object);
            }
        } while (i--);

        return result;
    };
}
if (!Array.prototype.indexOf || ([0, 1].indexOf(1, 2) != -1)) {
    Array.prototype.indexOf = function indexOf(sought /*, fromIndex */ ) {
        var self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                toObject(this),
            length = self.length >>> 0;

        if (!length) {
            return -1;
        }

        var i = 0;
        if (arguments.length > 1) {
            i = toInteger(arguments[1]);
        }
        i = i >= 0 ? i : Math.max(0, length + i);
        for (; i < length; i++) {
            if (i in self && self[i] === sought) {
                return i;
            }
        }
        return -1;
    };
}
if (!Array.prototype.lastIndexOf || ([0, 1].lastIndexOf(0, -3) != -1)) {
    Array.prototype.lastIndexOf = function lastIndexOf(sought /*, fromIndex */) {
        var self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                toObject(this),
            length = self.length >>> 0;

        if (!length) {
            return -1;
        }
        var i = length - 1;
        if (arguments.length > 1) {
            i = Math.min(i, toInteger(arguments[1]));
        }
        i = i >= 0 ? i : length - Math.abs(i);
        for (; i >= 0; i--) {
            if (i in self && sought === self[i]) {
                return i;
            }
        }
        return -1;
    };
}
if (!Object.getPrototypeOf) {
    Object.getPrototypeOf = function getPrototypeOf(object) {
        return object.__proto__ || (
            object.constructor ?
            object.constructor.prototype :
            prototypeOfObject
        );
    };
}
if (!Object.getOwnPropertyDescriptor) {
    var ERR_NON_OBJECT = "Object.getOwnPropertyDescriptor called on a " +
                         "non-object: ";
    Object.getOwnPropertyDescriptor = function getOwnPropertyDescriptor(object, property) {
        if ((typeof object != "object" && typeof object != "function") || object === null)
            throw new TypeError(ERR_NON_OBJECT + object);
        if (!owns(object, property))
            return;

        var descriptor, getter, setter;
        descriptor =  { enumerable: true, configurable: true };
        if (supportsAccessors) {
            var prototype = object.__proto__;
            object.__proto__ = prototypeOfObject;

            var getter = lookupGetter(object, property);
            var setter = lookupSetter(object, property);
            object.__proto__ = prototype;

            if (getter || setter) {
                if (getter) descriptor.get = getter;
                if (setter) descriptor.set = setter;
                return descriptor;
            }
        }
        descriptor.value = object[property];
        return descriptor;
    };
}
if (!Object.getOwnPropertyNames) {
    Object.getOwnPropertyNames = function getOwnPropertyNames(object) {
        return Object.keys(object);
    };
}
if (!Object.create) {
    var createEmpty;
    if (Object.prototype.__proto__ === null) {
        createEmpty = function () {
            return { "__proto__": null };
        };
    } else {
        createEmpty = function () {
            var empty = {};
            for (var i in empty)
                empty[i] = null;
            empty.constructor =
            empty.hasOwnProperty =
            empty.propertyIsEnumerable =
            empty.isPrototypeOf =
            empty.toLocaleString =
            empty.toString =
            empty.valueOf =
            empty.__proto__ = null;
            return empty;
        }
    }

    Object.create = function create(prototype, properties) {
        var object;
        if (prototype === null) {
            object = createEmpty();
        } else {
            if (typeof prototype != "object")
                throw new TypeError("typeof prototype["+(typeof prototype)+"] != 'object'");
            var Type = function () {};
            Type.prototype = prototype;
            object = new Type();
            object.__proto__ = prototype;
        }
        if (properties !== void 0)
            Object.defineProperties(object, properties);
        return object;
    };
}

function doesDefinePropertyWork(object) {
    try {
        Object.defineProperty(object, "sentinel", {});
        return "sentinel" in object;
    } catch (exception) {
    }
}
if (Object.defineProperty) {
    var definePropertyWorksOnObject = doesDefinePropertyWork({});
    var definePropertyWorksOnDom = typeof document == "undefined" ||
        doesDefinePropertyWork(document.createElement("div"));
    if (!definePropertyWorksOnObject || !definePropertyWorksOnDom) {
        var definePropertyFallback = Object.defineProperty;
    }
}

if (!Object.defineProperty || definePropertyFallback) {
    var ERR_NON_OBJECT_DESCRIPTOR = "Property description must be an object: ";
    var ERR_NON_OBJECT_TARGET = "Object.defineProperty called on non-object: "
    var ERR_ACCESSORS_NOT_SUPPORTED = "getters & setters can not be defined " +
                                      "on this javascript engine";

    Object.defineProperty = function defineProperty(object, property, descriptor) {
        if ((typeof object != "object" && typeof object != "function") || object === null)
            throw new TypeError(ERR_NON_OBJECT_TARGET + object);
        if ((typeof descriptor != "object" && typeof descriptor != "function") || descriptor === null)
            throw new TypeError(ERR_NON_OBJECT_DESCRIPTOR + descriptor);
        if (definePropertyFallback) {
            try {
                return definePropertyFallback.call(Object, object, property, descriptor);
            } catch (exception) {
            }
        }
        if (owns(descriptor, "value")) {

            if (supportsAccessors && (lookupGetter(object, property) ||
                                      lookupSetter(object, property)))
            {
                var prototype = object.__proto__;
                object.__proto__ = prototypeOfObject;
                delete object[property];
                object[property] = descriptor.value;
                object.__proto__ = prototype;
            } else {
                object[property] = descriptor.value;
            }
        } else {
            if (!supportsAccessors)
                throw new TypeError(ERR_ACCESSORS_NOT_SUPPORTED);
            if (owns(descriptor, "get"))
                defineGetter(object, property, descriptor.get);
            if (owns(descriptor, "set"))
                defineSetter(object, property, descriptor.set);
        }

        return object;
    };
}
if (!Object.defineProperties) {
    Object.defineProperties = function defineProperties(object, properties) {
        for (var property in properties) {
            if (owns(properties, property))
                Object.defineProperty(object, property, properties[property]);
        }
        return object;
    };
}
if (!Object.seal) {
    Object.seal = function seal(object) {
        return object;
    };
}
if (!Object.freeze) {
    Object.freeze = function freeze(object) {
        return object;
    };
}
try {
    Object.freeze(function () {});
} catch (exception) {
    Object.freeze = (function freeze(freezeObject) {
        return function freeze(object) {
            if (typeof object == "function") {
                return object;
            } else {
                return freezeObject(object);
            }
        };
    })(Object.freeze);
}
if (!Object.preventExtensions) {
    Object.preventExtensions = function preventExtensions(object) {
        return object;
    };
}
if (!Object.isSealed) {
    Object.isSealed = function isSealed(object) {
        return false;
    };
}
if (!Object.isFrozen) {
    Object.isFrozen = function isFrozen(object) {
        return false;
    };
}
if (!Object.isExtensible) {
    Object.isExtensible = function isExtensible(object) {
        if (Object(object) === object) {
            throw new TypeError(); // TODO message
        }
        var name = '';
        while (owns(object, name)) {
            name += '?';
        }
        object[name] = true;
        var returnValue = owns(object, name);
        delete object[name];
        return returnValue;
    };
}
if (!Object.keys) {
    var hasDontEnumBug = true,
        dontEnums = [
            "toString",
            "toLocaleString",
            "valueOf",
            "hasOwnProperty",
            "isPrototypeOf",
            "propertyIsEnumerable",
            "constructor"
        ],
        dontEnumsLength = dontEnums.length;

    for (var key in {"toString": null}) {
        hasDontEnumBug = false;
    }

    Object.keys = function keys(object) {

        if (
            (typeof object != "object" && typeof object != "function") ||
            object === null
        ) {
            throw new TypeError("Object.keys called on a non-object");
        }

        var keys = [];
        for (var name in object) {
            if (owns(object, name)) {
                keys.push(name);
            }
        }

        if (hasDontEnumBug) {
            for (var i = 0, ii = dontEnumsLength; i < ii; i++) {
                var dontEnum = dontEnums[i];
                if (owns(object, dontEnum)) {
                    keys.push(dontEnum);
                }
            }
        }
        return keys;
    };

}
if (!Date.now) {
    Date.now = function now() {
        return new Date().getTime();
    };
}
var ws = "\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003" +
    "\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028" +
    "\u2029\uFEFF";
if (!String.prototype.trim || ws.trim()) {
    ws = "[" + ws + "]";
    var trimBeginRegexp = new RegExp("^" + ws + ws + "*"),
        trimEndRegexp = new RegExp(ws + ws + "*$");
    String.prototype.trim = function trim() {
        return String(this).replace(trimBeginRegexp, "").replace(trimEndRegexp, "");
    };
}

function toInteger(n) {
    n = +n;
    if (n !== n) { // isNaN
        n = 0;
    } else if (n !== 0 && n !== (1/0) && n !== -(1/0)) {
        n = (n > 0 || -1) * Math.floor(Math.abs(n));
    }
    return n;
}

function isPrimitive(input) {
    var type = typeof input;
    return (
        input === null ||
        type === "undefined" ||
        type === "boolean" ||
        type === "number" ||
        type === "string"
    );
}

function toPrimitive(input) {
    var val, valueOf, toString;
    if (isPrimitive(input)) {
        return input;
    }
    valueOf = input.valueOf;
    if (typeof valueOf === "function") {
        val = valueOf.call(input);
        if (isPrimitive(val)) {
            return val;
        }
    }
    toString = input.toString;
    if (typeof toString === "function") {
        val = toString.call(input);
        if (isPrimitive(val)) {
            return val;
        }
    }
    throw new TypeError();
}
var toObject = function (o) {
    if (o == null) { // this matches both null and undefined
        throw new TypeError("can't convert "+o+" to object");
    }
    return Object(o);
};

});
