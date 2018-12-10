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
RED.text.format = (function() {

    var TextSegment = (function() {
        var TextSegment = function (obj) {
            this.content = "";
            this.actual = "";
            this.textDirection = "";
            this.localGui = "";
            this.isVisible = true;
            this.isSeparator = false;
            this.isParsed = false;
            this.keep = false;
            this.inBounds = false;
            this.inPoints = false;
            var prop = "";
            for (prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    this[prop] = obj[prop];
                }
            }
        };
        return TextSegment;
    })();

    var tools = (function() {
        function initBounds(bounds) {
            if (!bounds) {
                return false;
            }
            if (typeof(bounds.start) === "undefined") {
                bounds.start = "";
            }
            if (typeof(bounds.end) === "undefined") {
                bounds.end = "";
            }
            if (typeof(bounds.startAfter) !== "undefined") {
                bounds.start = bounds.startAfter;
                bounds.after = true;
            } else {
                bounds.after = false;
            }
            if (typeof(bounds.endBefore) !== "undefined") {
                bounds.end = bounds.endBefore;
                bounds.before = true;
            } else {
                bounds.before = false;
            }
            var startPos = parseInt(bounds.startPos, 10);
            if (!isNaN(startPos)) {
                bounds.usePos = true;
            } else {
                bounds.usePos = false;
            }
            var bLength = parseInt(bounds.length, 10);
            if (!isNaN(bLength)) {
                bounds.useLength = true;
            } else {
                bounds.useLength = false;
            }
            bounds.loops = typeof(bounds.loops) !== "undefined" ? !!bounds.loops : true;
            return true;
        }

        function getBounds(segment, src) {
            var bounds = {};
            for (var prop in src) {
                if (src.hasOwnProperty(prop)) {
                    bounds[prop] = src[prop];
                }
            }
            var content = segment.content;
            var usePos = bounds.usePos && bounds.startPos < content.length;
            if (usePos) {
                bounds.start = "";
                bounds.loops = false;
            }
            bounds.bStart = usePos ? bounds.startPos : bounds.start.length > 0 ? content.indexOf(bounds.start) : 0;
            var useLength = bounds.useLength && bounds.length > 0 && bounds.bStart + bounds.length < content.length;
            if (useLength) {
                bounds.end = "";
            }
            bounds.bEnd = useLength ? bounds.bStart + bounds.length : bounds.end.length > 0 ?
                    content.indexOf(bounds.end, bounds.bStart + bounds.start.length) + 1 : content.length;
            if (!bounds.after) {
                bounds.start = "";
            }
            if (!bounds.before) {
                bounds.end = "";
            }
            return bounds;
        }

        return {
            handleSubcontents: function (segments, args, subs, origContent, locale) { // jshint unused: false
                if (!subs.content || typeof(subs.content) !== "string" || subs.content.length === 0) {
                    return segments;
                }
                var sLoops = true;
                if (typeof(subs.loops) !== "undefined") {
                    sLoops = !!subs.loops;
                }
                for (var j = 0; true; j++) {
                    if (j >= segments.length) {
                        break;
                    }
                    if (segments[j].isParsed || segments.keep || segments[j].isSeparator) {
                        continue;
                    }
                    var content = segments[j].content;
                    var start = content.indexOf(subs.content);
                    if (start < 0) {
                        continue;
                    }
                    var end;
                    var length = 0;
                    if (subs.continued) {
                        do {
                            length++;
                            end = content.indexOf(subs.content, start + length * subs.content.length);
                        } while (end === 0);
                    } else {
                        length = 1;
                    }
                    end = start + length * subs.content.length;
                    segments.splice(j, 1);
                    if (start > 0) {
                        segments.splice(j, 0, new TextSegment({
                            content: content.substring(0, start),
                            localGui: args.dir,
                            keep: true
                        }));
                        j++;
                    }
                    segments.splice(j, 0, new TextSegment({
                        content: content.substring(start, end),
                        textDirection: subs.subDir,
                        localGui: args.dir
                    }));
                    if (end < content.length) {
                        segments.splice(j + 1, 0, new TextSegment({
                            content: content.substring(end, content.length),
                            localGui: args.dir,
                            keep: true
                        }));
                    }
                    if (!sLoops) {
                        break;
                    }
                }
            },

            handleBounds: function (segments, args, aBounds, origContent, locale) {
                for (var i = 0; i < aBounds.length; i++) {
                    if (!initBounds(aBounds[i])) {
                        continue;
                    }
                    for (var j = 0; true; j++) {
                        if (j >= segments.length) {
                            break;
                        }
                        if (segments[j].isParsed || segments[j].inBounds || segments.keep || segments[j].isSeparator) {
                            continue;
                        }
                        var bounds = getBounds(segments[j], aBounds[i]);
                        var start = bounds.bStart;
                        var end = bounds.bEnd;
                        if (start < 0 || end < 0) {
                            continue;
                        }
                        var content = segments[j].content;

                        segments.splice(j, 1);
                        if (start > 0) {
                            segments.splice(j, 0, new TextSegment({
                                content: content.substring(0, start),
                                localGui: args.dir,
                                keep: true
                            }));
                            j++;
                        }
                        if (bounds.start) {
                            segments.splice(j, 0, new TextSegment({
                                content: bounds.start,
                                localGui: args.dir,
                                isSeparator: true
                            }));
                            j++;
                        }
                        segments.splice(j, 0, new TextSegment({
                            content: content.substring(start + bounds.start.length, end - bounds.end.length),
                            textDirection: bounds.subDir,
                            localGui: args.dir,
                            inBounds: true
                        }));
                        if (bounds.end) {
                            j++;
                            segments.splice(j, 0, new TextSegment({
                                content: bounds.end,
                                localGui: args.dir,
                                isSeparator: true
                            }));
                        }
                        if (end + bounds.end.length < content.length) {
                            segments.splice(j + 1, 0, new TextSegment({
                                content: content.substring(end + bounds.end.length, content.length),
                                localGui: args.dir,
                                keep: true
                            }));
                        }
                        if (!bounds.loops) {
                            break;
                        }
                    }
                }
                for (i = 0; i < segments.length; i++) {
                    segments[i].inBounds = false;
                }
                return segments;
            },

            handleCases: function (segments, args, cases, origContent, locale) {
                if (cases.length === 0) {
                    return segments;
                }
                var hArgs = {};
                for (var prop in args) {
                    if (args.hasOwnProperty(prop)) {
                        hArgs[prop] = args[prop];
                    }
                }
                for (var i =  0; i < cases.length; i++) {
                    if (!cases[i].handler || typeof(cases[i].handler.handle) !== "function") {
                        cases[i].handler = args.commonHandler;
                    }
                    if (cases[i].args) {
                        hArgs.cases = cases[i].args.cases;
                        hArgs.points = cases[i].args.points;
                        hArgs.bounds = cases[i].args.bounds;
                        hArgs.subs = cases[i].args.subs;
                    } else {
                        hArgs.cases = [];
                        hArgs.points = [];
                        hArgs.bounds = [];
                        hArgs.subs = {};
                    }
                    cases[i].handler.handle(origContent, segments, hArgs, locale);
                }
                return segments;
            },

            handlePoints: function (segments, args, points, origContent, locale) { //jshint unused: false
                for (var i = 0; i < points.length; i++) {
                    for (var j = 0; true; j++) {
                        if (j >= segments.length) {
                            break;
                        }
                        if (segments[j].isParsed || segments[j].keep || segments[j].isSeparator) {
                            continue;
                        }
                        var content = segments[j].content;
                        var pos = content.indexOf(points[i]);
                        if (pos >= 0) {
                            segments.splice(j, 1);
                            if (pos > 0) {
                                segments.splice(j, 0, new TextSegment({
                                    content: content.substring(0, pos),
                                    textDirection: args.subDir,
                                    localGui: args.dir,
                                    inPoints: true
                                }));
                                j++;
                            }
                            segments.splice(j, 0, new TextSegment({
                                content: points[i],
                                localGui: args.dir,
                                isSeparator: true
                            }));
                            if (pos + points[i].length + 1 <= content.length) {
                                segments.splice(j + 1, 0, new TextSegment({
                                    content: content.substring(pos + points[i].length),
                                    textDirection: args.subDir,
                                    localGui: args.dir,
                                    inPoints: true
                                }));
                            }
                        }
                    }
                }
                for (i = 0; i < segments.length; i++) {
                    if (segments[i].keep) {
                        segments[i].keep = false;
                    } else if(segments[i].inPoints){
                        segments[i].isParsed = true;
                        segments[i].inPoints = false;
                    }
                }
                return segments;
            }
        };
    })();

    var common = (function() {
        return {
            handle: function (content, segments, args, locale) {
                var cases = [];
                if (Array.isArray(args.cases)) {
                    cases = args.cases;
                }
                var points = [];
                if (typeof(args.points) !== "undefined") {
                    if (Array.isArray(args.points)) {
                        points = args.points;
                    } else if (typeof(args.points) === "string") {
                        points = args.points.split("");
                    }
                }
                var subs = {};
                if (typeof(args.subs) === "object") {
                    subs = args.subs;
                }
                var aBounds = [];
                if (Array.isArray(args.bounds)) {
                    aBounds = args.bounds;
                }

                tools.handleBounds(segments, args, aBounds, content, locale);
                tools.handleSubcontents(segments, args, subs, content, locale);
                tools.handleCases(segments, args, cases, content, locale);
                tools.handlePoints(segments, args, points, content, locale);
                return segments;
            }
        };
    })();

    var misc = (function() {
        var isBidiLocale = function (locale) {
            var lang = !locale ? "" : locale.split("-")[0];
            if (!lang || lang.length < 2) {
                return false;
            }
            return ["iw", "he", "ar", "fa", "ur"].some(function (bidiLang) {
                return bidiLang === lang;
            });
        };
        var LRE = "\u202A";
        var RLE = "\u202B";
        var PDF = "\u202C";
        var LRM = "\u200E";
        var RLM = "\u200F";
        var LRO = "\u202D";
        var RLO = "\u202E";

        return {
            LRE: LRE,
            RLE: RLE,
            PDF: PDF,
            LRM: LRM,
            RLM: RLM,
            LRO: LRO,
            RLO: RLO,

            getLocaleDetails: function (locale) {
                if (!locale) {
                    locale = typeof navigator === "undefined" ? "" :
                        (navigator.language ||
                        navigator.userLanguage ||
                        "");
                }
                locale = locale.toLowerCase();
                if (isBidiLocale(locale)) {
                    var full = locale.split("-");
                    return {lang: full[0], country: full[1] ? full[1] : ""};
                }
                return {lang: "not-bidi"};
            },

            removeUcc: function (text) {
                if (text) {
                    return text.replace(/[\u200E\u200F\u202A-\u202E]/g, "");
                }
                return text;
            },

            removeTags: function (text) {
                if (text) {
                    return text.replace(/<[^<]*>/g, "");
                }
                return text;
            },

            getDirection: function (text, dir, guiDir, checkEnd) {
                if (dir !== "auto" && (/^(rtl|ltr)$/i).test(dir)) {
                    return dir;
                }
                guiDir = (/^(rtl|ltr)$/i).test(guiDir) ? guiDir : "ltr";
                var txt = !checkEnd ? text : text.split("").reverse().join("");
                var fdc = /[A-Za-z\u05d0-\u065f\u066a-\u06ef\u06fa-\u07ff\ufb1d-\ufdff\ufe70-\ufefc]/.exec(txt);
                return fdc ? (fdc[0] <= "z" ? "ltr" : "rtl") : guiDir;
            },

            hasArabicChar: function (text) {
                var fdc = /[\u0600-\u065f\u066a-\u06ef\u06fa-\u07ff\ufb1d-\ufdff\ufe70-\ufefc]/.exec(text);
                return !!fdc;
            },

            showMarks: function (text, guiDir) {
                var result = "";
                for (var i = 0; i < text.length; i++) {
                    var c = "" + text.charAt(i);
                    switch (c) {
                    case LRM:
                        result += "<LRM>";
                        break;
                    case RLM:
                        result += "<RLM>";
                        break;
                    case LRE:
                        result += "<LRE>";
                        break;
                    case RLE:
                        result += "<RLE>";
                        break;
                    case LRO:
                        result += "<LRO>";
                        break;
                    case RLO:
                        result += "<RLO>";
                        break;
                    case PDF:
                        result += "<PDF>";
                        break;
                    default:
                        result += c;
                    }
                }
                var mark = typeof(guiDir) === "undefined" || !((/^(rtl|ltr)$/i).test(guiDir)) ? "" :
                    guiDir === "rtl" ? RLO : LRO;
                return mark + result + (mark === "" ? "" : PDF);
            },

            hideMarks: function (text) {
                var txt = text.replace(/<LRM>/g, this.LRM).replace(/<RLM>/g, this.RLM).replace(/<LRE>/g, this.LRE);
                return txt.replace(/<RLE>/g, this.RLE).replace(/<LRO>/g, this.LRO).replace(/<RLO>/g, this.RLO).replace(/<PDF>/g, this.PDF);
            },

            showTags: function (text) {
                return "<xmp>" + text + "</xmp>";
            },

            hideTags: function (text) {
                return text.replace(/<xmp>/g,"").replace(/<\/xmp>/g,"");
            }
        };
    })();

    var stext = (function() {
        var stt = {};

        // args
        //   handler: main handler (default - dbidi/stt/handlers/common)
        //   guiDir: GUI direction (default - "ltr")
        //   dir: main stt direction (default - guiDir)
        //   subDir: direction of subsegments
        //   points: array of delimiters (default - [])
        //   bounds: array of definitions of bounds in which handler works
        //   subs: object defines special handling for some substring if found
        //   cases: array of additional modules with their args for handling special cases (default - [])
        function parseAndDisplayStructure(content, fArgs, isHtml, locale) {
            if (!content || !fArgs) {
                return content;
            }
            return displayStructure(parseStructure(content, fArgs, locale), fArgs, isHtml);
        }

        function checkArguments(fArgs, fullCheck) {
            var args = Array.isArray(fArgs)? fArgs[0] : fArgs;
            if (!args.guiDir) {
                args.guiDir = "ltr";
            }
            if (!args.dir) {
                args.dir = args.guiDir;
            }
            if (!fullCheck) {
                return args;
            }
            if (typeof(args.points) === "undefined") {
                args.points = [];
            }
            if (!args.cases) {
                args.cases = [];
            }
            if (!args.bounds) {
                args.bounds = [];
            }
            args.commonHandler = common;
            return args;
        }

        function parseStructure(content, fArgs, locale) {
            if (!content || !fArgs) {
                return new TextSegment({content: ""});
            }
            var args = checkArguments(fArgs, true);
            var segments = [new TextSegment(
                {
                    content: content,
                    actual: content,
                    localGui: args.dir
                })];
            var parse = common.handle;
            if (args.handler && typeof(args.handler) === "function") {
                parse = args.handler.handle;
            }
            parse(content, segments, args, locale);
            return segments;
        }

        function displayStructure(segments, fArgs, isHtml) {
            var args = checkArguments(fArgs, false);
            if (isHtml) {
                return getResultWithHtml(segments, args);
            }
            else {
                return getResultWithUcc(segments, args);
            }
        }

        function getResultWithUcc(segments, args, isHtml) {
            var result = "";
            var checkedDir = "";
            var prevDir = "";
            var stop = false;
            for (var i = 0; i < segments.length; i++) {
                if (segments[i].isVisible) {
                    var dir = segments[i].textDirection;
                    var lDir = segments[i].localGui;
                    if (lDir !== "" && prevDir === "") {
                        result += (lDir === "rtl" ? misc.RLE : misc.LRE);
                    }
                    else if(prevDir !== "" && (lDir === "" || lDir !== prevDir || stop)) {
                        result += misc.PDF + (i == segments.length - 1 && lDir !== ""? "" : args.dir === "rtl" ? misc.RLM : misc.LRM);
                        if (lDir !== "") {
                            result += (lDir === "rtl" ? misc.RLE : misc.LRE);
                        }
                    }
                    if (dir === "auto") {
                        dir = misc.getDirection(segments[i].content, dir, args.guiDir);
                    }
                    if ((/^(rtl|ltr)$/i).test(dir)) {
                        result += (dir === "rtl" ? misc.RLE : misc.LRE) + segments[i].content + misc.PDF;
                        checkedDir = dir;
                    }
                    else {
                        result += segments[i].content;
                        checkedDir = misc.getDirection(segments[i].content, dir, args.guiDir, true);
                    }
                    if (i < segments.length - 1) {
                        var locDir = lDir && segments[i+1].localGui? lDir : args.dir;
                        result += locDir === "rtl" ? misc.RLM : misc.LRM;
                    }
                    else if(prevDir !== "") {
                        result += misc.PDF;
                    }
                    prevDir = lDir;
                    stop = false;
                }
                else {
                    stop = true;
                }
            }
            var sttDir = args.dir === "auto" ? misc.getDirection(segments[0].actual, args.dir, args.guiDir) : args.dir;
            if (sttDir !== args.guiDir) {
                result = (sttDir === "rtl" ? misc.RLE : misc.LRE) + result + misc.PDF;
            }
            return result;
        }

        function getResultWithHtml(segments, args, isHtml) {
            var result = "";
            var checkedDir = "";
            var prevDir = "";
            for (var i = 0; i < segments.length; i++) {
                if (segments[i].isVisible) {
                    var dir = segments[i].textDirection;
                    var lDir = segments[i].localGui;
                    if (lDir !== "" && prevDir === "") {
                        result += "<bdi dir='" + (lDir === "rtl" ? "rtl" : "ltr") + "'>";
                    }
                    else if(prevDir !== "" && (lDir === "" || lDir !== prevDir || stop)) {
                        result += "</bdi>" + (i == segments.length - 1 && lDir !== ""? "" : "<span style='unicode-bidi: embed; direction: " + (args.dir === "rtl" ? "rtl" : "ltr") + ";'></span>");
                        if (lDir !== "") {
                            result += "<bdi dir='" + (lDir === "rtl" ? "rtl" : "ltr") + "'>";
                        }
                    }

                    if (dir === "auto") {
                        dir = misc.getDirection(segments[i].content, dir, args.guiDir);
                    }
                    if ((/^(rtl|ltr)$/i).test(dir)) {
                        //result += "<span style='unicode-bidi: embed; direction: " + (dir === "rtl" ? "rtl" : "ltr") + ";'>" + segments[i].content + "</span>";
                        result += "<bdi dir='" + (dir === "rtl" ? "rtl" : "ltr") + "'>" + segments[i].content + "</bdi>";
                        checkedDir = dir;
                    }
                    else {
                        result += segments[i].content;
                        checkedDir = misc.getDirection(segments[i].content, dir, args.guiDir, true);
                    }
                    if (i < segments.length - 1) {
                        var locDir = lDir && segments[i+1].localGui? lDir : args.dir;
                        result += "<span style='unicode-bidi: embed; direction: " + (locDir === "rtl" ? "rtl" : "ltr") + ";'></span>";
                    }
                    else if(prevDir !== "") {
                        result += "</bdi>";
                    }
                    prevDir = lDir;
                    stop = false;
                }
                else {
                    stop = true;
                }
            }
            var sttDir = args.dir === "auto" ? misc.getDirection(segments[0].actual, args.dir, args.guiDir) : args.dir;
            if (sttDir !== args.guiDir) {
                result = "<bdi dir='" + (sttDir === "rtl" ? "rtl" : "ltr") + "'>" + result + "</bdi>";
            }
            return result;
        }

        //TBD ?
        function restore(text, isHtml) {
            return text;
        }

        stt.parseAndDisplayStructure = parseAndDisplayStructure;
        stt.parseStructure = parseStructure;
        stt.displayStructure = displayStructure;
        stt.restore = restore;

        return stt;
    })();

    var breadcrumb = (function() {
        return {
            format: function (text, args, isRtl, isHtml, locale, parseOnly) {
                var fArgs =
                {
                        guiDir: isRtl ? "rtl" : "ltr",
                        dir: args.dir ? args.dir : isRtl ? "rtl" : "ltr",
                        subs: {
                            content: ">",
                            continued: true,
                            subDir: isRtl ? "rtl" : "ltr"
                        },
                        cases: [{
                            args: {
                                subs: {
                                    content: "<",
                                    continued: true,
                                    subDir: isRtl ? "ltr" : "rtl"
                                }
                            }
                        }]
                };

                if (!parseOnly) {
                    return stext.parseAndDisplayStructure(text, fArgs, !!isHtml, locale);
                }
                else {
                    return stext.parseStructure(text, fArgs, !!isHtml, locale);
                }
            }
        };
    })();

    var comma = (function() {
        return {
            format: function (text, args, isRtl, isHtml, locale, parseOnly) {
                var fArgs =
                {
                        guiDir: isRtl ? "rtl" : "ltr",
                        dir: "ltr",
                        points: ","
                };
                if (!parseOnly) {
                    return stext.parseAndDisplayStructure(text, fArgs, !!isHtml, locale);
                }
                else {
                    return stext.parseStructure(text, fArgs, !!isHtml, locale);
                }
            }
        };
    })();

    var email = (function() {
        function getDir(text, locale) {
            if (misc.getLocaleDetails(locale).lang !== "ar") {
                return "ltr";
            }
            var ind = text.indexOf("@");
            if (ind > 0 && ind < text.length - 1) {
                return misc.hasArabicChar(text.substring(ind + 1)) ? "rtl" : "ltr";
            }
            return "ltr";
        }

        return {
            format: function (text, args, isRtl, isHtml, locale, parseOnly) {
                var fArgs =
                {
                        guiDir: isRtl ? "rtl" : "ltr",
                        dir: getDir(text, locale),
                        points: "<>.:,;@",
                        cases: [{
                            handler: common,
                            args: {
                                bounds: [{
                                    startAfter: "\"",
                                    endBefore: "\""
                                },
                                {
                                    startAfter: "(",
                                    endBefore: ")"
                                }
                                ],
                                points: ""
                            }
                        }]
                };
                if (!parseOnly) {
                    return stext.parseAndDisplayStructure(text, fArgs, !!isHtml, locale);
                }
                else {
                    return stext.parseStructure(text, fArgs, !!isHtml, locale);
                }
            }
        };
    })();

    var filepath = (function() {
        return {
            format: function (text, args, isRtl, isHtml, locale, parseOnly) {
                var fArgs =
                {
                        guiDir: isRtl ? "rtl" : "ltr",
                        dir: "ltr",
                        points: "/\\:."
                };
                if (!parseOnly) {
                    return stext.parseAndDisplayStructure(text, fArgs, !!isHtml, locale);
                }
                else {
                    return stext.parseStructure(text, fArgs, !!isHtml, locale);
                }
            }
        };
    })();

    var formula = (function() {
        return {
            format: function (text, args, isRtl, isHtml, locale, parseOnly) {
                var fArgs =
                {
                        guiDir: isRtl ? "rtl" : "ltr",
                        dir: "ltr",
                        points: " /%^&[]<>=!?~:.,|()+-*{}",
                };
                if (!parseOnly) {
                    return stext.parseAndDisplayStructure(text, fArgs, !!isHtml, locale);
                }
                else {
                    return stext.parseStructure(text, fArgs, !!isHtml, locale);
                }
            }
        };
    })();


    var sql = (function() {
        return {
            format: function (text, args, isRtl, isHtml, locale, parseOnly) {
                var fArgs =
                {
                        guiDir: isRtl ? "rtl" : "ltr",
                        dir: "ltr",
                        points: "\t!#%&()*+,-./:;<=>?|[]{}",
                        cases: [{
                            handler: common,
                            args: {
                                bounds: [{
                                    startAfter: "/*",
                                    endBefore: "*/"
                                },
                                {
                                    startAfter: "--",
                                    end: "\n"
                                },
                                {
                                    startAfter: "--"
                                }
                                ]
                            }
                        },
                        {
                            handler: common,
                            args: {
                                subs: {
                                    content: " ",
                                    continued: true
                                }
                            }
                        },
                        {
                            handler: common,
                            args: {
                                bounds: [{
                                    startAfter: "'",
                                    endBefore: "'"
                                },
                                {
                                    startAfter: "\"",
                                    endBefore: "\""
                                }
                                ]
                            }
                        }
                        ]
                };
                if (!parseOnly) {
                    return stext.parseAndDisplayStructure(text, fArgs, !!isHtml, locale);
                }
                else {
                    return stext.parseStructure(text, fArgs, !!isHtml, locale);
                }
            }
        };
    })();

    var underscore = (function() {
        return {
            format: function (text, args, isRtl, isHtml, locale, parseOnly) {
                var fArgs =
                {
                        guiDir: isRtl ? "rtl" : "ltr",
                        dir: "ltr",
                        points: "_"
                };
                if (!parseOnly) {
                    return stext.parseAndDisplayStructure(text, fArgs, !!isHtml, locale);
                }
                else {
                    return stext.parseStructure(text, fArgs, !!isHtml, locale);
                }
            }
        };
    })();

    var url = (function() {
        return {
            format: function (text, args, isRtl, isHtml, locale, parseOnly) {
                var fArgs =
                {
                        guiDir: isRtl ? "rtl" : "ltr",
                        dir: "ltr",
                        points: ":?#/@.[]="
                };
                if (!parseOnly) {
                    return stext.parseAndDisplayStructure(text, fArgs, !!isHtml, locale);
                }
                else {
                    return stext.parseStructure(text, fArgs, !!isHtml, locale);
                }
            }
        };
    })();

    var word = (function() {
        return {
            format: function (text, args, isRtl, isHtml, locale, parseOnly) {
                var fArgs =
                {
                        guiDir: isRtl ? "rtl" : "ltr",
                        dir: args.dir ? args.dir : isRtl ? "rtl" : "ltr",
                        points: " ,.!?;:",
                };
                if (!parseOnly) {
                    return stext.parseAndDisplayStructure(text, fArgs, !!isHtml, locale);
                }
                else {
                    return stext.parseStructure(text, fArgs, !!isHtml, locale);
                }
            }
        };
    })();

    var xpath = (function() {
        return {
            format: function (text, args, isRtl, isHtml, locale, parseOnly) {
                var fArgs =
                {
                        guiDir: isRtl ? "rtl" : "ltr",
                        dir: "ltr",
                        points: " /[]<>=!:@.|()+-*",
                        cases: [{
                            handler: common,
                            args: {
                                bounds: [{
                                    startAfter: "\"",
                                    endBefore: "\""
                                },
                                {
                                    startAfter: "'",
                                    endBefore: "'"
                                }
                                ],
                                points: ""
                            }
                        }
                        ]
                };
                if (!parseOnly) {
                    return stext.parseAndDisplayStructure(text, fArgs, !!isHtml, locale);
                }
                else {
                    return stext.parseStructure(text, fArgs, !!isHtml, locale);
                }
            }
        };
    })();

    var custom = (function() {
        return {
            format: function (text, args, isRtl, isHtml, locale, parseOnly) {
                var hArgs = {};
                var prop = "";
                var sArgs = Array.isArray(args)? args[0] : args;
                for (prop in sArgs) {
                    if (sArgs.hasOwnProperty(prop)) {
                        hArgs[prop] = sArgs[prop];
                    }
                }
                hArgs.guiDir = isRtl ? "rtl" : "ltr";
                hArgs.dir = hArgs.dir ? hArgs.dir : hArgs.guiDir;
                if (!parseOnly) {
                    return stext.parseAndDisplayStructure(text, hArgs, !!isHtml, locale);
                }
                else {
                    return stext.parseStructure(text, hArgs, !!isHtml, locale);
                }
            }
        };
    })();

    var message = (function() {
        var params = {msgLang: "en", msgDir: "", phLang: "", phDir: "", phPacking: ["{","}"], phStt: {type: "none", args: {}}, guiDir: ""};
        var parametersChecked = false;

        function getDirectionOfLanguage(lang) {
            if (lang === "he" || lang === "iw" || lang === "ar") {
                return "rtl";
            }
            return "ltr";
        }

        function checkParameters(obj) {
            if (obj.msgDir.length === 0) {
                obj.msgDir = getDirectionOfLanguage(obj.msgLang);
            }
            obj.msgDir = obj.msgDir !== "ltr" && obj.msgDir !== "rtl" && obj.msgDir != "auto"? "ltr" : obj.msgDir;
            if (obj.guiDir.length === 0) {
                obj.guiDir = obj.msgDir;
            }
            obj.guiDir = obj.guiDir !== "rtl"? "ltr" : "rtl";
            if (obj.phDir.length === 0) {
                obj.phDir = obj.phLang.length === 0? obj.msgDir : getDirectionOfLanguage(obj.phLang);
            }
            obj.phDir = obj.phDir !== "ltr" && obj.phDir !== "rtl" && obj.phDir != "auto"? "ltr" : obj.phDir;
            if (typeof (obj.phPacking) === "string") {
                obj.phPacking = obj.phPacking.split("");
            }
            if (obj.phPacking.length < 2) {
                obj.phPacking = ["{","}"];
            }
        }

        return {
            setDefaults: function (args) {
                for (var prop in args) {
                    if (params.hasOwnProperty(prop)) {
                        params[prop] = args[prop];
                    }
                }
                checkParameters(params);
                parametersChecked = true;
            },

            format: function (text) {
                if (!parametersChecked) {
                    checkParameters(params);
                    parametersChecked = true;
                }
                var isHtml = false;
                var hasHtmlArg = false;
                var spLength = params.phPacking[0].length;
                var epLength = params.phPacking[1].length;
                if (arguments.length > 0) {
                    var last = arguments[arguments.length-1];
                    if (typeof (last) === "boolean") {
                        isHtml = last;
                        hasHtmlArg = true;
                    }
                }
                //Message
                var re = new RegExp(params.phPacking[0] + "\\d+" + params.phPacking[1]);
                var m;
                var tSegments = [];
                var offset = 0;
                var txt = text;
                while ((m = re.exec(txt)) != null) {
                    var lastIndex = txt.indexOf(m[0]) + m[0].length;
                    if (lastIndex > m[0].length) {
                        tSegments.push({text: txt.substring(0, lastIndex - m[0].length), ph: false});
                    }
                    tSegments.push({text: m[0], ph: true});
                    offset += lastIndex;
                    txt = txt.substring(lastIndex, txt.length);
                }
                if (offset < text.length) {
                    tSegments.push({text: text.substring(offset, text.length), ph: false});
                }
                //Parameters
                var tArgs = [];
                for (var i = 1; i < arguments.length - (hasHtmlArg? 1 : 0); i++) {
                    var arg = arguments[i];
                    var checkArr = arg;
                    var inLoop = false;
                    var indArr = 0;
                    if (Array.isArray(checkArr)) {
                        arg = checkArr[0];
                        if (typeof(arg) === "undefined") {
                            continue;
                        }
                        inLoop = true;
                    }
                    do {
                        if (typeof (arg) === "string") {
                            tArgs.push({text: arg, dir: params.phDir, stt: params.stt});
                        }
                        else if(typeof (arg) === "boolean") {
                            isHtml = arg;
                        }
                        else if(typeof (arg) === "object") {
                            tArgs.push(arg);
                            if (!arg.hasOwnProperty("text")) {
                                tArgs[tArgs.length-1].text = "{???}";
                            }
                            if (!arg.hasOwnProperty("dir") || arg.dir.length === 0) {
                                tArgs[tArgs.length-1].dir = params.phDir;
                            }
                            if (!arg.hasOwnProperty("stt") || (typeof (arg.stt) === "string" && arg.stt.length === 0) ||
                                (typeof (arg.stt) === "object" && Object.keys(arg.stt).length === 0)) {
                                tArgs[tArgs.length-1].stt = params.phStt;
                            }
                        }
                        else {
                            tArgs.push({text: "" + arg, dir: params.phDir, stt: params.phStt});
                        }
                        if (inLoop) {
                            indArr++;
                            if (indArr == checkArr.length) {
                                inLoop = false;
                            }
                            else {
                                arg = checkArr[indArr];
                            }
                        }
                    } while(inLoop);
                }
                //Indexing
                var segments = [];
                for (i = 0; i < tSegments.length; i++) {
                    var t = tSegments[i];
                    if (!t.ph) {
                        segments.push(new TextSegment({content: t.text, textDirection: params.msgDir}));
                    }
                    else {
                        var ind = parseInt(t.text.substring(spLength, t.text.length - epLength));
                        if (isNaN(ind) || ind >= tArgs.length) {
                            segments.push(new TextSegment({content: t.text, textDirection: params.msgDir}));
                            continue;
                        }
                        var sttType = "none";
                        if (!tArgs[ind].stt) {
                            tArgs[ind].stt = params.phStt;
                        }
                        if (tArgs[ind].stt) {
                            if (typeof (tArgs[ind].stt) === "string") {
                                sttType = tArgs[ind].stt;
                            }
                            else if(tArgs[ind].stt.hasOwnProperty("type")) {
                                sttType = tArgs[ind].stt.type;
                            }
                        }
                        if (sttType.toLowerCase() !== "none") {
                            var sttSegs =  getHandler(sttType).format(tArgs[ind].text, tArgs[ind].stt.args || {},
                                    params.msgDir === "rtl", false, params.msgLang, true);
                            for (var j = 0; j < sttSegs.length; j++) {
                                segments.push(sttSegs[j]);
                            }
                            segments.push(new TextSegment({isVisible: false}));
                        }
                        else {
                            segments.push(new TextSegment({content: tArgs[ind].text, textDirection: (tArgs[ind].dir? tArgs[ind].dir : params.phDir)}));
                        }
                    }
                }
                var result =  stext.displayStructure(segments, {guiDir: params.guiDir, dir: params.msgDir}, isHtml);
                return result;
            }
        };
    })();

    var event = null;

    function getHandler(type) {
        switch (type) {
        case "breadcrumb" :
            return breadcrumb;
        case "comma" :
            return comma;
        case "email" :
            return email;
        case "filepath" :
            return filepath;
        case "formula" :
            return formula;
        case "sql" :
            return sql;
        case "underscore" :
            return underscore;
        case "url" :
            return url;
        case "word" :
            return word;
        case "xpath" :
            return xpath;
        default:
            return custom;
        }
    }

    function isInputEventSupported(element) {
        var agent = window.navigator.userAgent;
        if (agent.indexOf("MSIE") >=0 || agent.indexOf("Trident") >=0 || agent.indexOf("Edge") >=0) {
            return false;
        }
        var checked = document.createElement(element.tagName);
        checked.contentEditable = true;
        var isSupported = ("oninput" in checked);
        if (!isSupported) {
          checked.setAttribute('oninput', 'return;');
          isSupported = typeof checked['oninput'] == 'function';
        }
        checked = null;
        return isSupported;
    }

    function attachElement(element, type, args, isRtl, locale) {
        //if (!element || element.nodeType != 1 || !element.isContentEditable)
        if (!element || element.nodeType != 1) {
            return false;
        }
        if (!event) {
            event = document.createEvent('Event');
            event.initEvent('TF', true, true);
        }
        element.setAttribute("data-tf-type", type);
        var sArgs = args === "undefined"? "{}" : JSON.stringify(Array.isArray(args)? args[0] : args);
        element.setAttribute("data-tf-args", sArgs);
        var dir = "ltr";
        if (isRtl === "undefined") {
            if (element.dir) {
                dir = element.dir;
            }
            else if(element.style && element.style.direction) {
                dir = element.style.direction;
            }
            isRtl = dir.toLowerCase() === "rtl";
        }
        element.setAttribute("data-tf-dir", isRtl);
        element.setAttribute("data-tf-locale", misc.getLocaleDetails(locale).lang);
        if (isInputEventSupported(element)) {
            var ehandler = element.oninput;
            element.oninput = function(event) {
                displayWithStructure(event.target);
            };
        }
        else {
            element.onkeyup = function(e) {
                displayWithStructure(e.target);
                element.dispatchEvent(event);
            };
            element.onmouseup = function(e) {
                displayWithStructure(e.target);
                element.dispatchEvent(event);
            };
        }
        displayWithStructure(element);

        return true;
    }

    function detachElement(element) {
        if (!element || element.nodeType != 1) {
            return;
        }
        element.removeAttribute("data-tf-type");
        element.removeAttribute("data-tf-args");
        element.removeAttribute("data-tf-dir");
        element.removeAttribute("data-tf-locale");
        element.innerHTML = element.textContent || "";
    }

    function displayWithStructure(element) {
        var txt = element.textContent || "";
        var selection = document.getSelection();
        if (txt.length === 0 || !selection || selection.rangeCount <= 0) {
            element.dispatchEvent(event);
            return;
        }

        var range = selection.getRangeAt(0);
        var tempRange = range.cloneRange(), startNode, startOffset;
        startNode = range.startContainer;
        startOffset = range.startOffset;
        var textOffset = 0;
        if (startNode.nodeType === 3) {
            textOffset += startOffset;
        }
        tempRange.setStart(element,0);
        tempRange.setEndBefore(startNode);
        var div = document.createElement('div');
        div.appendChild(tempRange.cloneContents());
        textOffset += div.textContent.length;

        element.innerHTML = getHandler(element.getAttribute("data-tf-type")).
            format(txt, JSON.parse(element.getAttribute("data-tf-args")), (element.getAttribute("data-tf-dir") === "true"? true : false),
            true, element.getAttribute("data-tf-locale"));
        var parent = element;
        var node = element;
        var newOffset = 0;
        var inEnd = false;
        selection.removeAllRanges();
        range.setStart(element,0);
        range.setEnd(element,0);
        while (node) {
            if (node.nodeType === 3) {
                if (newOffset + node.nodeValue.length >= textOffset) {
                    range.setStart(node, textOffset - newOffset);
                    break;
                }
                else {
                    newOffset += node.nodeValue.length;
                    node = node.nextSibling;
                }
            }
            else if(node.hasChildNodes()) {
                parent = node;
                node = parent.firstChild;
                continue;
            }
            else {
                node = node.nextSibling;
            }
            while (!node) {
                if (parent === element) {
                    inEnd = true;
                    break;
                }
                node = parent.nextSibling;
                parent = parent.parentNode;
            }
            if (inEnd) {
                break;
            }
        }

        selection.addRange(range);
        element.dispatchEvent(event);
    }

    return {
        /*!
        * Returns the HTML representation of a given structured text
        * @param text - the structured text
        * @param type - could be one of filepath, url, email
        * @param args - pass additional arguments to the handler. generally null.
        * @param isRtl - indicates if the GUI is mirrored
        * @param locale - the browser locale
        */
        getHtml: function (text, type, args, isRtl, locale) {
            return getHandler(type).format(text, args, isRtl, true, locale);
        },
        /*!
        * Handle Structured text correct display for a given HTML element.
        * @param element - the element  : should be of type div contenteditable=true
        * @param type - could be one of filepath, url, email
        * @param args - pass additional arguments to the handler. generally null.
        * @param isRtl - indicates if the GUI is mirrored
        * @param locale - the browser locale
        */
        attach: function (element, type, args, isRtl, locale) {
            return attachElement(element, type, args, isRtl, locale);
        }
    };
})();
