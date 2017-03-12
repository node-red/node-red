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
    define("ace/mode/jsonata_worker",["require","exports","ace/lib/oop","ace/worker/mirror"], function(require, exports) {
        var oop = require("../lib/oop");
        var Mirror = require("../worker/mirror").Mirror;

        var jsonata=function(){"use strict";function e(e){for(var n=1,t=[],r={},a=r;n<e.length;){var o=e.charAt(n);if(":"===o)break;var i=function(){t.push(r),a=r,r={}},s=function(e,n,t,r){for(var a=1,i=n;i<e.length;)if(i++,o=e.charAt(i),o===r){if(a--,0===a)break}else o===t&&a++;return i};switch(o){case"s":case"n":case"b":case"l":case"o":r.regex="["+o+"m]",r.type=o,i();break;case"a":r.regex="[asnblfom]",r.type=o,r.array=!0,i();break;case"f":r.regex="f",r.type=o,i();break;case"j":r.regex="[asnblom]",r.type=o,i();break;case"x":r.regex="[asnblfom]",r.type=o,i();break;case"-":a.context=!0,a.contextRegex=new RegExp(a.regex),a.regex+="?";break;case"?":case"+":a.regex+=o;break;case"(":var u=s(e,n,"(",")"),f=e.substring(n+1,u);if(f.indexOf("<")!==-1)throw{code:"S0402",stack:(new Error).stack,value:f,offset:n};r.regex="["+f+"m]",r.type="("+f+")",n=u,i();break;case"<":if("a"!==a.type&&"f"!==a.type)throw{code:"S0401",stack:(new Error).stack,value:a.type,offset:n};var c=s(e,n,"<",">");a.subtype=e.substring(n+1,c),n=c}n++}var p="^"+t.map(function(e){return"("+e.regex+")"}).join("")+"$",l=new RegExp(p),d=function(e){var n;if(T(e))n="f";else{var t=typeof e;switch(t){case"string":n="s";break;case"number":n="n";break;case"boolean":n="b";break;case"object":n=null===e?"l":Array.isArray(e)?"a":"o";break;case"undefined":n="m"}}return n},h=function(e,n){for(var r="^",a=0,o=0;o<t.length;o++){r+=t[o].regex;var i=n.match(r);if(null===i)throw{code:"T0410",stack:(new Error).stack,value:e[a],index:a+1};a=i[0].length}throw{code:"T0410",stack:(new Error).stack,value:e[a],index:a+1}};return{definition:e,validate:function(e,n){var r="";e.forEach(function(e){r+=d(e)});var a=l.exec(r);if(a){var o=[],i=0;return t.forEach(function(t,r){var s=e[i],u=a[r+1];if(""===u)if(t.context){var f=d(n);if(!t.contextRegex.test(f))throw{code:"T0411",stack:(new Error).stack,value:n,index:i+1};o.push(n)}else o.push(s),i++;else u.split("").forEach(function(n){if("a"===t.type){if("m"===n)s=void 0;else{s=e[i];var r=!0;if("undefined"!=typeof t.subtype)if("a"!==n&&u!==t.subtype)r=!1;else if("a"===n&&s.length>0){var a=d(s[0]);if(a!==t.subtype.charAt(0))r=!1;else{var f=s.filter(function(e){return d(e)!==a});r=0===f.length}}if(!r)throw{code:"T0412",stack:(new Error).stack,value:s,index:i+1,type:t.subtype};"a"!==n&&(s=[s])}o.push(s),i++}else o.push(s),i++})}),o}h(e,r)}}}function n(e){var n=!1;if("number"==typeof e){var t=parseFloat(e);if(n=!isNaN(t),n&&!isFinite(t))throw{code:"D1001",value:e,stack:(new Error).stack}}return n}function t(e){var t=!1;return Array.isArray(e)&&(t=0===e.filter(function(e){return!n(e)}).length),t}function r(e,n,t){var r,p=t.lookup("__evaluate_entry");switch(p&&p(e,n,t),e.type){case"path":r=a(e,n,t);break;case"binary":r=i(e,n,t);break;case"unary":r=s(e,n,t);break;case"name":r=u(e,n,t);break;case"literal":r=f(e,n,t);break;case"wildcard":r=c(e,n,t);break;case"descendant":r=l(e,n,t);break;case"condition":r=x(e,n,t);break;case"block":r=E(e,n,t);break;case"regex":r=A(e,n,t);break;case"function":r=O(e,n,t);break;case"variable":r=S(e,n,t);break;case"lambda":r=$(e,n,t);break;case"partial":r=I(e,n,t)}e.hasOwnProperty("predicate")&&(r=o(e.predicate,r,t)),e.hasOwnProperty("group")&&(r=k(e.group,r,t));var d=t.lookup("__evaluate_exit");return d&&d(e,n,t,r),r}function a(e,n,t){var a,o,i=!1;"variable"===e[0].type?e[0].absolute=!0:"unary"===e[0].type&&"["===e[0].value&&(n=[null]);for(var s=0;s<e.length;s++){var u=e[s];u.keepArray===!0&&(i=!0);var f=[];if(a=void 0,o=u.absolute===!0?[n]:Array.isArray(n)?n:[n],e.length>1&&"literal"===u.type&&(u.type="name"),o.forEach(function(e){var n=r(u,e,t);"undefined"!=typeof n&&(Array.isArray(n)&&"["!==u.value?n.forEach(function(e){"undefined"!=typeof e&&f.push(e)}):f.push(n))}),1===f.length?a=i?f:f[0]:f.length>1&&(a=f),"undefined"==typeof a)break;n=a}return a}function o(e,a,o){var i,s=a,u=[];return e.forEach(function(e){if(Array.isArray(s)||(s=[s]),u=[],i=void 0,"literal"===e.type&&n(e.value)){var a=e.value;Number.isInteger(a)||(a=Math.floor(a)),a<0&&(a=s.length+a),i=s[a]}else s.forEach(function(a,i){var f=r(e,a,o);n(f)&&(f=[f]),t(f)?f.forEach(function(e){Number.isInteger(e)||(e=Math.floor(e)),e<0&&(e=s.length+e),e===i&&u.push(a)}):ie(f)&&u.push(a)});1===u.length?i=u[0]:u.length>1&&(i=u),s=i}),i}function i(e,n,t){var r;switch(e.value){case"+":case"-":case"*":case"/":case"%":r=h(e,n,t);break;case"=":case"!=":case"<":case"<=":case">":case">=":r=v(e,n,t);break;case"&":r=g(e,n,t);break;case"and":case"or":r=b(e,n,t);break;case"..":r=m(e,n,t);break;case":=":r=w(e,n,t);break;case"in":r=y(e,n,t);break;case"~>":r=j(e,n,t)}return r}function s(e,t,a){var o;switch(e.value){case"-":if(o=r(e.expression,t,a),!n(o))throw{code:"D1002",stack:(new Error).stack,position:e.position,token:e.value,value:o};o=-o;break;case"[":o=[],e.lhs.forEach(function(e){var n=r(e,t,a);"undefined"!=typeof n&&("["===e.value?o.push(n):o=le(o,n))});break;case"{":o=k(e,t,a)}return o}function u(e,n,t){var r;if(Array.isArray(n)){var a=[];n.forEach(function(n){var r=u(e,n,t);"undefined"!=typeof r&&a.push(r)}),1===a.length?r=a[0]:a.length>1&&(r=a)}else null!==n&&"object"==typeof n&&(r=n[e.value]);return r}function f(e){return e.value}function c(e,n){var t,r=[];return null!==n&&"object"==typeof n&&Object.keys(n).forEach(function(e){var t=n[e];Array.isArray(t)?(t=p(t),r=le(r,t)):r.push(t)}),1===r.length?t=r[0]:r.length>1&&(t=r),t}function p(e,n){return"undefined"==typeof n&&(n=[]),Array.isArray(e)?e.forEach(function(e){p(e,n)}):n.push(e),n}function l(e,n){var t,r=[];return"undefined"!=typeof n&&(d(n,r),t=1===r.length?r[0]:r),t}function d(e,n){Array.isArray(e)||n.push(e),Array.isArray(e)?e.forEach(function(e){d(e,n)}):null!==e&&"object"==typeof e&&Object.keys(e).forEach(function(t){d(e[t],n)})}function h(e,t,a){var o,i=r(e.lhs,t,a),s=r(e.rhs,t,a);if("undefined"==typeof i||"undefined"==typeof s)return o;if(!n(i))throw{code:"T2001",stack:(new Error).stack,position:e.position,token:e.value,value:i};if(!n(s))throw{code:"T2002",stack:(new Error).stack,position:e.position,token:e.value,value:s};switch(e.value){case"+":o=i+s;break;case"-":o=i-s;break;case"*":o=i*s;break;case"/":o=i/s;break;case"%":o=i%s}return o}function v(e,n,t){var a,o=r(e.lhs,n,t),i=r(e.rhs,n,t);if("undefined"==typeof o||"undefined"==typeof i)return!1;switch(e.value){case"=":a=o===i;break;case"!=":a=o!==i;break;case"<":a=o<i;break;case"<=":a=o<=i;break;case">":a=o>i;break;case">=":a=o>=i}return a}function y(e,n,t){var a=!1,o=r(e.lhs,n,t),i=r(e.rhs,n,t);if("undefined"==typeof o||"undefined"==typeof i)return!1;Array.isArray(i)||(i=[i]);for(var s=0;s<i.length;s++)if(i[s]===o){a=!0;break}return a}function b(e,n,t){var a;switch(e.value){case"and":a=ie(r(e.lhs,n,t))&&ie(r(e.rhs,n,t));break;case"or":a=ie(r(e.lhs,n,t))||ie(r(e.rhs,n,t))}return a}function g(e,n,t){var a,o=r(e.lhs,n,t),i=r(e.rhs,n,t),s="",u="";return"undefined"!=typeof o&&(s=J(o)),"undefined"!=typeof i&&(u=J(i)),a=s.concat(u)}function k(e,n,t){var a={},o={};Array.isArray(n)||(n=[n]),n.forEach(function(n){e.lhs.forEach(function(a){var i=r(a[0],n,t);if("string"!=typeof i)throw{code:"T1003",stack:(new Error).stack,position:e.position,value:i};var s={data:n,expr:a[1]};o.hasOwnProperty(i)?o[i].data=le(o[i].data,n):o[i]=s})});for(var i in o){var s=o[i],u=r(s.expr,s.data,t);a[i]=u}return a}function m(e,n,t){var a,o=r(e.lhs,n,t),i=r(e.rhs,n,t);if("undefined"==typeof o||"undefined"==typeof i)return a;if(o>i)return a;if(!Number.isInteger(o))throw{code:"T2003",stack:(new Error).stack,position:e.position,token:e.value,value:o};if(!Number.isInteger(i))throw{code:"T2004",stack:(new Error).stack,position:e.position,token:e.value,value:i};a=new Array(i-o+1);for(var s=o,u=0;s<=i;s++,u++)a[u]=s;return a}function w(e,n,t){var a=r(e.rhs,n,t);if("variable"!==e.lhs.type)throw{code:"D2005",stack:(new Error).stack,position:e.position,token:e.value,value:"path"===e.lhs.type?e.lhs[0].value:e.lhs.value};return t.bind(e.lhs.value,a),a}function x(e,n,t){var a,o=r(e.condition,n,t);return ie(o)?a=r(e.then,n,t):"undefined"!=typeof e.else&&(a=r(e.else,n,t)),a}function E(e,n,t){var a,o=ve(t);return e.expressions.forEach(function(e){a=r(e,n,o)}),a}function A(e){e.value.lastIndex=0;var n=function(t){var r,a=e.value,o=a.exec(t);if(null!==o){if(r={match:o[0],start:o.index,end:o.index+o[0].length,groups:[]},o.length>1)for(var i=1;i<o.length;i++)r.groups.push(o[i]);r.next=function(){if(!(a.lastIndex>=t.length)){var r=n(t);if(r&&""===r.match&&a.lastIndex===e.value.lastIndex)throw{code:"D1004",stack:(new Error).stack,position:e.position,value:e.value.source};return r}}}return r};return n}function S(e,n,t){var r;return r=""===e.value?n:t.lookup(e.value)}function j(e,n,t){var a,o=r(e.lhs,n,t);if("function"===e.rhs.type)a=O(e.rhs,n,t,{context:o});else{var i=r(e.rhs,n,t);if(!T(i))throw{code:"T2006",stack:(new Error).stack,position:e.position,value:i};a=T(o)?D(Ee,[o,i],t,null):D(i,[o],t,null)}return a}function T(e){return e&&(e._jsonata_function===!0||e._jsonata_lambda===!0)||"function"==typeof e}function _(e){return e&&e._jsonata_lambda===!0}function O(e,n,t,a){var o,i=[];e.arguments.forEach(function(e){i.push(r(e,n,t))}),a&&i.unshift(a.context);var s=r(e.procedure,n,t);if("undefined"==typeof s&&"path"===e.procedure.type&&t.lookup(e.procedure[0].value))throw{code:"T1005",stack:(new Error).stack,position:e.position,token:e.procedure[0].value};try{var u=i;s&&(u=F(s.signature,i,n)),o=D(s,u,n)}catch(n){throw n.position=e.position,n.token="path"===e.procedure.type?e.procedure[0].value:e.procedure.value,n}return o}function D(e,n,t){var a;for(a=N(e,n,t);_(a)&&a.thunk===!0;){var o=r(a.body.procedure,a.input,a.environment),i=[];a.body.arguments.forEach(function(e){i.push(r(e,a.input,a.environment))}),a=N(o,i,t)}return a}function N(e,n,t){var r;if(_(e))r=M(e,n);else if(e&&e._jsonata_function===!0)r=e.implementation.apply(t,n);else{if("function"!=typeof e)throw{code:"T1006",stack:(new Error).stack};r=e.apply(t,n)}return r}function $(e,n,t){var r={_jsonata_lambda:!0,input:n,environment:t,arguments:e.arguments,signature:e.signature,body:e.body};return e.thunk===!0&&(r.thunk=!0),r}function I(e,n,t){var a,o=[];e.arguments.forEach(function(e){"operator"===e.type&&"?"===e.value?o.push(e):o.push(r(e,n,t))});var i=r(e.procedure,n,t);if("undefined"==typeof i&&"path"===e.procedure.type&&t.lookup(e.procedure[0].value))throw{code:"T1007",stack:(new Error).stack,position:e.position,token:e.procedure[0].value};if(_(i))a=P(i,o);else if(i&&i._jsonata_function===!0)a=R(i.implementation,o);else{if("function"!=typeof i)throw{code:"T1008",stack:(new Error).stack,position:e.position,token:"path"===e.procedure.type?e.procedure[0].value:e.procedure.value};a=R(i,o)}return a}function F(e,n,t){if("undefined"==typeof e)return n;var r=e.validate(n,t);return r}function M(e,n){var t,a=ve(e.environment);return e.arguments.forEach(function(e,t){a.bind(e.value,n[t])}),t="function"==typeof e.body?C(e.body,a):r(e.body,e.input,a)}function P(e,n){var t=ve(e.environment),r=[];e.arguments.forEach(function(e,a){var o=n[a];o&&"operator"===o.type&&"?"===o.value?r.push(e):t.bind(e.value,o)});var a={_jsonata_lambda:!0,input:e.input,environment:t,arguments:r,body:e.body};return a}function R(e,n){var t=U(e);t=t.map(function(e){return"$"+e.trim()});var r="function("+t.join(", ")+"){ _ }",a=we(r);a.body=e;var o=P(a,n);return o}function C(e,n){var t=U(e),r=t.map(function(e){return n.lookup(e.trim())}),a=e.apply(null,r);return a}function U(e){var n=e.toString(),t=/\(([^\)]*)\)/.exec(n)[1],r=t.split(",");return r}function H(n,t){var r={_jsonata_function:!0,implementation:n};return"undefined"!=typeof t&&(r.signature=e(t)),r}function L(e){if("undefined"!=typeof e){var n=0;return e.forEach(function(e){n+=e}),n}}function q(e){return"undefined"==typeof e?0:e.length}function z(e){if("undefined"!=typeof e&&0!==e.length)return Math.max.apply(Math,e)}function G(e){if("undefined"!=typeof e&&0!==e.length)return Math.min.apply(Math,e)}function B(e){if("undefined"!=typeof e&&0!==e.length){var n=0;return e.forEach(function(e){n+=e}),n/e.length}}function J(e){if("undefined"!=typeof e){var t;if("string"==typeof e)t=e;else if(T(e))t="";else{if("number"==typeof e&&!isFinite(e))throw{code:"D3001",value:e,stack:(new Error).stack};t=JSON.stringify(e,function(e,t){return"undefined"!=typeof t&&null!==t&&t.toPrecision&&n(t)?Number(t.toPrecision(13)):t&&T(t)?"":t})}return t}}function K(e,n,t){if("undefined"!=typeof e)return e.substr(n,t)}function Q(e,n){if("undefined"!=typeof e){var t=e.indexOf(n);return t>-1?e.substr(0,t):e}}function V(e,n){if("undefined"!=typeof e){var t=e.indexOf(n);return t>-1?e.substr(t+n.length):e}}function W(e){if("undefined"!=typeof e)return e.toLowerCase()}function X(e){if("undefined"!=typeof e)return e.toUpperCase()}function Y(e){if("undefined"!=typeof e)return e.length}function Z(e){if("undefined"!=typeof e){var n=e.replace(/[ \t\n\r]+/gm," ");return" "===n.charAt(0)&&(n=n.substring(1))," "===n.charAt(n.length-1)&&(n=n.substring(0,n.length-1)),n}}function ee(e,n){if("undefined"!=typeof e){var t;if("string"==typeof n)t=e.indexOf(n)!==-1;else{var r=n(e);t="undefined"!=typeof r}return t}}function ne(e,n,t){if("undefined"!=typeof e){if(t<0)throw{stack:(new Error).stack,value:t,code:"D3040",index:3};var r=[];if("undefined"==typeof t||t>0){var a=0,o=n(e);if("undefined"!=typeof o)for(;"undefined"!=typeof o&&("undefined"==typeof t||a<t);)r.push({match:o.match,index:o.start,groups:o.groups}),o=o.next(),a++}return r}}function te(e,n,t,r){if("undefined"!=typeof e){if(""===n)throw{code:"D3010",stack:(new Error).stack,value:n,index:2};if(r<0)throw{code:"D3011",stack:(new Error).stack,value:r,index:4};var a;a="string"==typeof t?function(e){for(var n="",r=0,a=t.indexOf("$",r);a!==-1&&r<t.length;){n+=t.substring(r,a),r=a+1;var o=t.charAt(r);if("$"===o)n+="$",r++;else if("0"===o)n+=e.match,r++;else{var i;if(i=0===e.groups.length?1:Math.floor(Math.log(e.groups.length)*Math.LOG10E)+1,a=parseInt(t.substring(r,r+i),10),i>1&&a>e.groups.length&&(a=parseInt(t.substring(r,r+i-1),10)),isNaN(a))n+="$";else{if(e.groups.length>0){var s=e.groups[a-1];"undefined"!=typeof s&&(n+=s)}r+=a.toString().length}}a=t.indexOf("$",r)}return n+=t.substring(r)}:t;var o="",i=0;if("undefined"==typeof r||r>0){var s=0;if("string"==typeof n){for(var u=e.indexOf(n,i);u!==-1&&("undefined"==typeof r||s<r);)o+=e.substring(i,u),o+=t,i=u+n.length,s++,u=e.indexOf(n,i);o+=e.substring(i)}else{var f=n(e);if("undefined"!=typeof f){for(;"undefined"!=typeof f&&("undefined"==typeof r||s<r);){o+=e.substring(i,f.start);var c=D(a,[f],null);if("string"!=typeof c)throw{code:"D3012",stack:(new Error).stack,value:c};o+=c,i=f.start+f.match.length,s++,f=f.next()}o+=e.substring(i)}else o=e}}else o=e;return o}}function re(e,n,t){if("undefined"!=typeof e){if(t<0)throw{code:"D3020",stack:(new Error).stack,value:t,index:3};var r=[];if("undefined"==typeof t||t>0)if("string"==typeof n)r=e.split(n,t);else{var a=0,o=n(e);if("undefined"!=typeof o){for(var i=0;"undefined"!=typeof o&&("undefined"==typeof t||a<t);)r.push(e.substring(i,o.start)),i=o.end,o=o.next(),a++;("undefined"==typeof t||a<t)&&r.push(e.substring(i))}else r=[e]}return r}}function ae(e,n){if("undefined"!=typeof e)return"undefined"==typeof n&&(n=""),e.join(n)}function oe(e){var n;if("undefined"!=typeof e){if("number"==typeof e)n=e;else{if("string"!=typeof e||!/^-?(0|([1-9][0-9]*))(\.[0-9]+)?([Ee][-+]?[0-9]+)?$/.test(e)||isNaN(parseFloat(e))||!isFinite(e))throw{code:"D3030",value:e,stack:(new Error).stack,index:1};n=parseFloat(e)}return n}}function ie(e){if("undefined"!=typeof e){var t=!1;if(Array.isArray(e)){if(1===e.length)t=ie(e[0]);else if(e.length>1){var r=e.filter(function(e){return ie(e)});t=r.length>0}}else"string"==typeof e?e.length>0&&(t=!0):n(e)?0!==e&&(t=!0):null!==e&&"object"==typeof e?Object.keys(e).length>0&&(_(e)||e._jsonata_function||(t=!0)):"boolean"==typeof e&&e===!0&&(t=!0);return t}}function se(e){return!ie(e)}function ue(e,n){var t=arguments,r=[],a=n;a=[];for(var o=1;o<t.length;o++)a.push(t[o]);for(var i=0;i<a[0].length;i++){for(var s=[],u="function"==typeof e?e.length:e._jsonata_function===!0?e.implementation.length:e.arguments.length,f=0;f<u;f++)s.push(a[f][i]);r.push(D(e,s,null))}return r}function fe(e,n,t){var r;if(2!==e.length&&(e._jsonata_function!==!0||2!==e.implementation.length)&&2!==e.arguments.length)throw{stack:(new Error).stack,code:"D3050",index:1};var a;for("undefined"==typeof t&&n.length>0?(r=n[0],a=1):(r=t,a=0);a<n.length;)r=D(e,[r,n[a]],null),a++;return r}function ce(e){var n=[];if(Array.isArray(e)){var t={};e.forEach(function(e){var n=ce(e);Array.isArray(n)&&n.forEach(function(e){t[e]=!0})}),n=ce(t)}else null===e||"object"!=typeof e||_(e)?n=void 0:(n=Object.keys(e),0===n.length&&(n=void 0));return n}function pe(e,n){var t=u({value:n},e);return t}function le(e,n){return"undefined"==typeof e?n:"undefined"==typeof n?e:(Array.isArray(e)||(e=[e]),Array.isArray(n)||(n=[n]),Array.prototype.push.apply(e,n),e)}function de(e){return"undefined"!=typeof e}function he(e){var n=[];if(Array.isArray(e))e.forEach(function(e){n=le(n,he(e))});else if(null===e||"object"!=typeof e||_(e))n=e;else for(var t in e){var r={};r[t]=e[t],n.push(r)}return n}function ve(e){var n={};return{bind:function(e,t){n[e]=t},lookup:function(t){var r;return n.hasOwnProperty(t)?r=n[t]:e&&(r=e.lookup(t)),r}}}function ye(e){var n="Unknown error";"undefined"!=typeof e.message&&(n=e.message);var t=Ae[e.code];return"undefined"!=typeof t&&(n=t.replace(/\{\{([^}]+)}}/g,function(){return e[arguments[1]]})),n}function be(e){var n;try{n=we(e)}catch(e){throw e.message=ye(e),e}var t=ve(xe);return{evaluate:function(e,a){if("undefined"!=typeof a){var o;o=ve(t);for(var i in a)o.bind(i,a[i])}else o=t;o.bind("$",e);var s;try{s=r(n,e,o)}catch(e){throw e.message=ye(e),e}return s},assign:function(e,n){t.bind(e,n)},registerFunction:function(e,n,r){var a=H(n,r);t.bind(e,a)}}}var ge={".":75,"[":80,"]":0,"{":70,"}":0,"(":80,")":0,",":0,"@":75,"#":70,";":80,":":80,"?":20,"+":50,"-":50,"*":60,"/":60,"%":60,"|":20,"=":40,"<":40,">":40,"`":80,"**":60,"..":20,":=":10,"!=":40,"<=":40,">=":40,"~>":40,and:30,or:25,in:40,"&":50,"!":0,"~":0},ke={'"':'"',"\\":"\\","/":"/",b:"\b",f:"\f",n:"\n",r:"\r",t:"\t"},me=function(e){var n=0,t=e.length,r=function(e,t){var r={type:e,value:t,position:n};return r},a=function(){for(var r,a,o=n,i=0;n<t;){var s=e.charAt(n);if("/"===s&&"\\"!==e.charAt(n-1)&&0===i){if(r=e.substring(o,n),""===r)throw{code:"S0301",stack:(new Error).stack,position:n};for(n++,s=e.charAt(n),o=n;"i"===s||"m"===s;)n++,s=e.charAt(n);return a=e.substring(o,n)+"g",new RegExp(r,a)}"("!==s&&"["!==s&&"{"!==s||"\\"===e.charAt(n-1)||i++,")"!==s&&"]"!==s&&"}"!==s||"\\"===e.charAt(n-1)||i--,n++}throw{code:"S0302",stack:(new Error).stack,position:n}},o=function(o){if(n>=t)return null;for(var i=e.charAt(n);n<t&&" \t\n\r\v".indexOf(i)>-1;)n++,i=e.charAt(n);if(o!==!0&&"/"===i)return n++,r("regex",a());if("."===i&&"."===e.charAt(n+1))return n+=2,r("operator","..");if(":"===i&&"="===e.charAt(n+1))return n+=2,r("operator",":=");if("!"===i&&"="===e.charAt(n+1))return n+=2,r("operator","!=");if(">"===i&&"="===e.charAt(n+1))return n+=2,r("operator",">=");if("<"===i&&"="===e.charAt(n+1))return n+=2,r("operator","<=");if("*"===i&&"*"===e.charAt(n+1))return n+=2,r("operator","**");if("~"===i&&">"===e.charAt(n+1))return n+=2,r("operator","~>");if(ge.hasOwnProperty(i))return n++,r("operator",i);if('"'===i||"'"===i){var s=i;n++;for(var u="";n<t;){if(i=e.charAt(n),"\\"===i)if(n++,i=e.charAt(n),ke.hasOwnProperty(i))u+=ke[i];else{if("u"!==i)throw{code:"S0103",stack:(new Error).stack,position:n,token:i};var f=e.substr(n+1,4);if(!/^[0-9a-fA-F]+$/.test(f))throw{code:"S0104",stack:(new Error).stack,position:n};var c=parseInt(f,16);u+=String.fromCharCode(c),n+=4}else{if(i===s)return n++,r("string",u);u+=i}n++}throw{code:"S0101",stack:(new Error).stack,position:n}}var p=/^-?(0|([1-9][0-9]*))(\.[0-9]+)?([Ee][-+]?[0-9]+)?/,l=p.exec(e.substring(n));if(null!==l){var d=parseFloat(l[0]);if(!isNaN(d)&&isFinite(d))return n+=l[0].length,r("number",d);throw{code:"S0102",stack:(new Error).stack,position:n,token:l[0]}}for(var h,v,y=n;;)if(h=e.charAt(y),y===t||" \t\n\r\v".indexOf(h)>-1||ge.hasOwnProperty(h)){if("$"===e.charAt(n))return v=e.substring(n+1,y),n=y,r("variable",v);switch(v=e.substring(n,y),n=y,v){case"or":case"in":case"and":return r("operator",v);case"true":return r("value",!0);case"false":return r("value",!1);case"null":return r("value",null);default:return n===t&&""===v?null:r("name",v)}}else y++};return o},we=function(t){var r,a,o={},i={nud:function(){return this}},s=function(e,n){var t=o[e];return n=n||0,t?n>=t.lbp&&(t.lbp=n):(t=Object.create(i),t.id=t.value=e,t.lbp=n,o[e]=t),t},u=function(e,n){if(e&&r.id!==e){var i;throw i="(end)"===r.id?"S0203":"S0202",{code:i,stack:(new Error).stack,position:r.position,token:r.id,value:e}}var s=a(n);if(null===s)return r=o["(end)"],r.position=t.length,r;var u,f=s.value,c=s.type;switch(c){case"name":case"variable":u=o["(name)"];break;case"operator":if(u=o[f],!u)throw{code:"S0204",stack:(new Error).stack,position:s.position,token:f};break;case"string":case"number":case"value":c="literal",u=o["(literal)"];break;case"regex":c="regex",u=o["(regex)"];break;default:throw{code:"S0205",stack:(new Error).stack,position:s.position,token:f}}return r=Object.create(u),r.value=f,r.type=c,r.position=s.position,r},f=function(e){var n,t=r;for(u(null,!0),n=t.nud();e<r.lbp;)t=r,u(),n=t.led(n);return n},c=function(e,n,t){var r=n||ge[e],a=s(e,r);return a.led=t||function(e){return this.lhs=e,this.rhs=f(r),this.type="binary",this},a},p=function(e,n,t){var r=n||ge[e],a=s(e,r);return a.led=t||function(e){return this.lhs=e,this.rhs=f(r-1),this.type="binary",this},a},l=function(e,n){var t=s(e);return t.nud=n||function(){return this.expression=f(70),this.type="unary",this},t};s("(end)"),s("(name)"),s("(literal)"),s("(regex)"),s(":"),s(";"),s(","),s(")"),s("]"),s("}"),s(".."),c("."),c("+"),c("-"),c("*"),c("/"),c("%"),c("="),c("<"),c(">"),c("!="),c("<="),c(">="),c("&"),c("and"),c("or"),c("in"),p(":="),l("-"),c("~>"),l("*",function(){return this.type="wildcard",this}),l("**",function(){return this.type="descendant",this}),c("(",ge["("],function(n){if(this.procedure=n,this.type="function",this.arguments=[],")"!==r.id)for(;"operator"===r.type&&"?"===r.id?(this.type="partial",this.arguments.push(r),u("?")):this.arguments.push(f(0)),","===r.id;)u(",");if(u(")",!0),"name"===n.type&&("function"===n.value||"λ"===n.value)){if(this.arguments.forEach(function(e,n){if("variable"!==e.type)throw{code:"S0208",stack:(new Error).stack,position:e.position,token:e.value,value:n+1}}),this.type="lambda","<"===r.id){for(var t=r.position,a=1,o="<";a>0&&"{"!==r.id&&"(end)"!==r.id;){var i=u();">"===i.id?a--:"<"===i.id&&a++,o+=i.value}u(">");try{this.signature=e(o)}catch(e){throw e.position=t+e.offset,e}}u("{"),this.body=f(0),u("}")}return this}),l("(",function(){for(var e=[];")"!==r.id&&(e.push(f(0)),";"===r.id);)u(";");return u(")",!0),this.type="block",this.expressions=e,this}),l("[",function(){var e=[];if("]"!==r.id)for(;;){var n=f(0);if(".."===r.id){var t={type:"binary",value:"..",position:r.position,lhs:n};u(".."),t.rhs=f(0),n=t}if(e.push(n),","!==r.id)break;u(",")}return u("]",!0),this.lhs=e,this.type="unary",this}),c("[",ge["["],function(e){if("]"===r.id){for(var n=e;n&&"binary"===n.type&&"["===n.value;)n=n.lhs;return n.keepArray=!0,u("]"),e}return this.lhs=e,this.rhs=f(ge["]"]),this.type="binary",u("]",!0),this});var d=function(e){var n=[];if("}"!==r.id)for(;;){var t=f(0);u(":");var a=f(0);if(n.push([t,a]),","!==r.id)break;u(",")}return u("}",!0),"undefined"==typeof e?(this.lhs=n,this.type="unary"):(this.lhs=e,this.rhs=n,this.type="binary"),this};l("{",d),c("{",ge["{"],d),c("?",ge["?"],function(e){return this.type="condition",this.condition=e,this.then=f(0),":"===r.id&&(u(":"),this.else=f(0)),this});var h=function(e){var n;if("function"===e.type){var t={type:"lambda",thunk:!0,arguments:[],position:e.position};t.body=e,n=t}else if("condition"===e.type)e.then=h(e.then),e.else=h(e.else),n=e;else if("block"===e.type){var r=e.expressions.length;r>0&&(e.expressions[r-1]=h(e.expressions[r-1])),n=e}else n=e;return n},v=function(e){var t=[];switch(e.type){case"binary":switch(e.value){case".":var r=v(e.lhs);"path"===r.type?Array.prototype.push.apply(t,r):t.push(r);var a=v(e.rhs);"path"!==a.type&&(a=[a]),Array.prototype.push.apply(t,a),t.type="path";break;case"[":t=v(e.lhs);var o=t;if("path"===t.type&&(o=t[t.length-1]),"undefined"!=typeof o.group)throw{code:"S0209",stack:(new Error).stack,position:e.position};"undefined"==typeof o.predicate&&(o.predicate=[]),o.predicate.push(v(e.rhs));break;case"{":if(t=v(e.lhs),"undefined"!=typeof t.group)throw{code:"S0210",stack:(new Error).stack,position:e.position};t.group={lhs:e.rhs.map(function(e){return[v(e[0]),v(e[1])]}),position:e.position};break;default:t={type:e.type,value:e.value,position:e.position},t.lhs=v(e.lhs),t.rhs=v(e.rhs)}break;case"unary":t={type:e.type,value:e.value,position:e.position},"["===e.value?t.lhs=e.lhs.map(function(e){return v(e)}):"{"===e.value?t.lhs=e.lhs.map(function(e){return[v(e[0]),v(e[1])]}):(t.expression=v(e.expression),"-"===e.value&&"literal"===t.expression.type&&n(t.expression.value)&&(t=t.expression,t.value=-t.value));break;case"function":case"partial":t={type:e.type,name:e.name,value:e.value,position:e.position},t.arguments=e.arguments.map(function(e){return v(e)}),t.procedure=v(e.procedure);break;case"lambda":t={type:e.type,arguments:e.arguments,signature:e.signature,position:e.position};var i=v(e.body);t.body=h(i);break;case"condition":t={type:e.type,position:e.position},t.condition=v(e.condition),t.then=v(e.then),"undefined"!=typeof e.else&&(t.else=v(e.else));break;case"block":t={type:e.type,position:e.position},t.expressions=e.expressions.map(function(e){return v(e)});break;case"name":t=[e],t.type="path";break;case"literal":case"wildcard":case"descendant":case"variable":case"regex":t=e;break;case"operator":if("and"===e.value||"or"===e.value||"in"===e.value)e.type="name",t=v(e);else{if("?"!==e.value)throw{code:"S0201",stack:(new Error).stack,position:e.position,token:e.value};t=e}break;default:var s="S0206";throw"(end)"===e.id&&(s="S0207"),{code:s,stack:(new Error).stack,position:e.position,token:e.value}}return t};a=me(t),u();var y=f(0);if("(end)"!==r.id)throw{code:"S0201",stack:(new Error).stack,position:r.position,token:r.value};return y=v(y)},xe=ve(null);Number.isInteger=Number.isInteger||function(e){return"number"==typeof e&&isFinite(e)&&Math.floor(e)===e};var Ee=r(we("function($f, $g) { function($x){ $g($f($x)) } }"),null,xe);xe.bind("sum",H(L,"<a<n>:n>")),xe.bind("count",H(q,"<a:n>")),xe.bind("max",H(z,"<a<n>:n>")),xe.bind("min",H(G,"<a<n>:n>")),xe.bind("average",H(B,"<a<n>:n>")),xe.bind("string",H(J,"<x-:s>")),xe.bind("substring",H(K,"<s-nn?:s>")),xe.bind("substringBefore",H(Q,"<s-s:s>")),xe.bind("substringAfter",H(V,"<s-s:s>")),xe.bind("lowercase",H(W,"<s-:s>")),xe.bind("uppercase",H(X,"<s-:s>")),xe.bind("length",H(Y,"<s-:n>")),xe.bind("trim",H(Z,"<s-:s>")),xe.bind("match",H(ne,"<s-f<s:o>n?:a<o>>")),xe.bind("contains",H(ee,"<s-(sf):b>")),xe.bind("replace",H(te,"<s-(sf)(sf)n?:s>")),xe.bind("split",H(re,"<s-(sf)n?:a<s>>")),xe.bind("join",H(ae,"<a<s>s?:s>")),xe.bind("number",H(oe,"<(ns)-:n>")),xe.bind("boolean",H(ie,"<x-:b>")),xe.bind("not",H(se,"<x-:b>")),xe.bind("map",H(ue,"<fa+>")),xe.bind("reduce",H(fe,"<faj?:j>")),xe.bind("keys",H(ce,"<x-:a<s>>")),xe.bind("lookup",H(pe,"<x-s:x>")),xe.bind("append",H(le,"<xx:a>")),xe.bind("exists",H(de,"<x:b>")),xe.bind("spread",H(he,"<x-:a<o>>"));var Ae={S0101:"No terminating quote found in string literal",S0102:"Number out of range: {{token}}",S0103:"unsupported escape sequence: \\{{token}}",S0104:"The escape sequence \\u must be followed by 4 hex digits",S0203:"Syntax error: expected '{{value}}' before end of expression",S0202:"Syntax error: expected '{{value}}', got '{{token}}'",S0204:"Unknown operator: {{token}}",S0205:"Unexpected token: {{token}}",S0208:"Parameter {{value}} of function definition must be a variable name (start with $)",S0209:"A predicate cannot follow a grouping expression in a step.",S0210:"Each step can only have one grouping expression.",S0201:"Syntax error: {{token}}",S0206:"Unknown expression type: {{token}}",S0207:"Syntax error: unexpected end of expression",S0301:"Empty regular expressions are not allowed",S0302:"No terminating / in regular expression",S0402:"Choice groups containing parameterized types not supported",S0401:"Type parameters can only be applied to functions and arrays",T0410:"Argument {{index}} of function '{{token}}' does not match function signature",T0411:"Context value is not a compatible type with argument {{index}} of function '{{token}}'",T0412:"Argument {{index}} of function '{{token}}' must be an array of {{type}}",D1001:"Number out of range: {{value}}",D1002:"Cannot negate a non-numeric value: {{value}}",T2001:"LHS of {{token}} operator must evaluate to a number",T2002:"RHS of {{token}} operator must evaluate to a number",T1003:"Key in object structure must evaluate to a string. Got: {{value}}",T2003:"LHS of range operator (..) must evaluate to an integer",T2004:"RHS of range operator (..) must evaluate to an integer",D2005:"Left hand side of := must be a variable name (start with $)",D1004:"Regular expression matches zero length string",T2006:"RHS of function application operator ~> is not a function",T1005:"Attempted to invoke a non-function. Did you mean '${{token}}'?",T1006:"Attempted to invoke a non-function",T1007:"Attempted to partially apply a non-function. Did you mean '${{token}}'?",T1008:"Attempted to partially apply a non-function",D3001:"Attempting to invoke string function on Infinity or NaN",D3010:"Second argument of replace function cannot be an empty string",D3011:"Forth argument of replace function must evaluate to a positive number",D3012:"Attempted to replace a matched string with a non-string value",D3020:"Third argument of split function must evaluate to a positive number",D3030:"Unable to cast value to a number: {{value}}"};return be.parser=we,be}();"undefined"!=typeof module&&(module.exports=jsonata);

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
                    if (value) {
                        jsonata(value);
                    }
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
