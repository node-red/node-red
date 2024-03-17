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

module.exports = function(RED) {
    const csv = require('./lib/csv')

    "use strict";
    function CSVNode(n) {
        RED.nodes.createNode(this,n)
        const node = this
        const RFC4180Mode = n.spec === 'rfc'
        const legacyMode = !RFC4180Mode

        node.status({}) // clear status

        if (legacyMode) {
            this.template = (n.temp || "");
            this.sep = (n.sep || ',').replace(/\\t/g,"\t").replace(/\\n/g,"\n").replace(/\\r/g,"\r");
            this.quo = '"';
            this.ret = (n.ret || "\n").replace(/\\n/g,"\n").replace(/\\r/g,"\r");
            this.winflag = (this.ret === "\r\n");
            this.lineend = "\n";
            this.multi = n.multi || "one";
            this.hdrin = n.hdrin || false;
            this.hdrout = n.hdrout || "none";
            this.goodtmpl = true;
            this.skip = parseInt(n.skip || 0);
            this.store = [];
            this.parsestrings = n.strings;
            this.include_empty_strings = n.include_empty_strings || false;
            this.include_null_values = n.include_null_values || false;
            if (this.parsestrings === undefined) { this.parsestrings = true; }
            if (this.hdrout === false) { this.hdrout = "none"; }
            if (this.hdrout === true) { this.hdrout = "all"; }
            var tmpwarn = true;
            // var node = this;
            var re = new RegExp(node.sep.replace(/[-[\]{}()*+!<=:?.\/\\^$|#\s,]/g,'\\$&') + '(?=(?:(?:[^"]*"){2})*[^"]*$)','g');

            // pass in an array of column names to be trimmed, de-quoted and retrimmed
            var clean = function(col,sep) {
                if (sep) { re = new RegExp(sep.replace(/[-[\]{}()*+!<=:?.\/\\^$|#\s,]/g,'\\$&') +'(?=(?:(?:[^"]*"){2})*[^"]*$)','g'); }
                col = col.trim().split(re) || [""];
                col = col.map(x => x.replace(/"/g,'').trim());
                if ((col.length === 1) && (col[0] === "")) { node.goodtmpl = false; }
                else { node.goodtmpl = true; }
                return col;
            }
            var template = clean(node.template,',');
            var notemplate = template.length === 1 && template[0] === '';
            node.hdrSent = false;

            this.on("input", function(msg, send, done) {
                if (msg.hasOwnProperty("reset")) {
                    node.hdrSent = false;
                }
                if (msg.hasOwnProperty("payload")) {
                    if (typeof msg.payload == "object") { // convert object to CSV string
                        try {
                            if (!(notemplate && (msg.hasOwnProperty("parts") && msg.parts.hasOwnProperty("index") && msg.parts.index > 0))) {
                                template = clean(node.template);
                            }
                            const ou = [];
                            if (!Array.isArray(msg.payload)) { msg.payload = [ msg.payload ]; }
                            if (node.hdrout !== "none" && node.hdrSent === false) {
                                if ((template.length === 1) && (template[0] === '')) {
                                    if (msg.hasOwnProperty("columns")) {
                                        template = clean(msg.columns || "",",");
                                    }
                                    else {
                                        template = Object.keys(msg.payload[0]);
                                    }
                                }
                                ou.push(template.map(v => v.indexOf(node.sep)!==-1 ? '"'+v+'"' : v).join(node.sep));
                                if (node.hdrout === "once") { node.hdrSent = true; }
                            }
                            for (var s = 0; s < msg.payload.length; s++) {
                                if ((Array.isArray(msg.payload[s])) || (typeof msg.payload[s] !== "object")) {
                                    if (typeof msg.payload[s] !== "object") { msg.payload = [ msg.payload ]; }
                                    for (var t = 0; t < msg.payload[s].length; t++) {
                                        if (msg.payload[s][t] === undefined) { msg.payload[s][t] = ""; }
                                        if (msg.payload[s][t].toString().indexOf(node.quo) !== -1) { // add double quotes if any quotes
                                            msg.payload[s][t] = msg.payload[s][t].toString().replace(/"/g, '""');
                                            msg.payload[s][t] = node.quo + msg.payload[s][t].toString() + node.quo;
                                        }
                                        else if (msg.payload[s][t].toString().indexOf(node.sep) !== -1) { // add quotes if any "commas"
                                            msg.payload[s][t] = node.quo + msg.payload[s][t].toString() + node.quo;
                                        }
                                        else if (msg.payload[s][t].toString().indexOf("\n") !== -1) { // add quotes if any "\n"
                                            msg.payload[s][t] = node.quo + msg.payload[s][t].toString() + node.quo;
                                        }
                                    }
                                    ou.push(msg.payload[s].join(node.sep));
                                }
                                else {
                                    if ((template.length === 1) && (template[0] === '') && (msg.hasOwnProperty("columns"))) {
                                        template = clean(msg.columns || "",",");
                                    }
                                    if ((template.length === 1) && (template[0] === '')) {
                                        /* istanbul ignore else */
                                        if (tmpwarn === true) { // just warn about missing template once
                                            node.warn(RED._("csv.errors.obj_csv"));
                                            tmpwarn = false;
                                        }
                                        const row = [];
                                        for (var p in msg.payload[0]) {
                                            /* istanbul ignore else */
                                            if (msg.payload[s].hasOwnProperty(p)) {
                                                /* istanbul ignore else */
                                                if (typeof msg.payload[s][p] !== "object") {
                                                // Fix to honour include null values flag
                                                //if (typeof msg.payload[s][p] !== "object" || (node.include_null_values === true && msg.payload[s][p] === null)) {
                                                    var q = "";
                                                    if (msg.payload[s][p] !== undefined) {
                                                        q += msg.payload[s][p];
                                                    }
                                                    if (q.indexOf(node.quo) !== -1) { // add double quotes if any quotes
                                                        q = q.replace(/"/g, '""');
                                                        row.push(node.quo + q + node.quo);
                                                    }
                                                    else if (q.indexOf(node.sep) !== -1 || p.indexOf("\n") !== -1) { // add quotes if any "commas" or "\n"
                                                        row.push(node.quo + q + node.quo);
                                                    }
                                                    else { row.push(q); } // otherwise just add
                                                }
                                            }
                                        }
                                        ou.push(row.join(node.sep)); // add separator
                                    }
                                    else {
                                        const row = [];
                                        for (var t=0; t < template.length; t++) {
                                            if (template[t] === '') {
                                                row.push('');
                                            }
                                            else {
                                                var tt = template[t];
                                                if (template[t].indexOf('"') >=0 ) { tt = "'"+tt+"'"; }
                                                else { tt = '"'+tt+'"'; }
                                                var p = RED.util.getMessageProperty(msg,'payload["'+s+'"]['+tt+']');
                                                /* istanbul ignore else */
                                                if (p === undefined) { p = ""; }
                                                // fix to honour include null values flag
                                                //if (p === null && node.include_null_values !== true) { p = "";}
                                                p = RED.util.ensureString(p);
                                                if (p.indexOf(node.quo) !== -1) { // add double quotes if any quotes
                                                    p = p.replace(/"/g, '""');
                                                    row.push(node.quo + p + node.quo);
                                                }
                                                else if (p.indexOf(node.sep) !== -1 || p.indexOf("\n") !== -1) { // add quotes if any "commas" or "\n"
                                                    row.push(node.quo + p + node.quo);
                                                }
                                                else { row.push(p); } // otherwise just add
                                            }
                                        }
                                        ou.push(row.join(node.sep)); // add separator
                                    }
                                }
                            }
                            // join lines, don't forget to add the last new line
                            msg.payload = ou.join(node.ret) + node.ret;
                            msg.columns = template.map(v => v.indexOf(',')!==-1 ? '"'+v+'"' : v).join(',');
                            if (msg.payload !== '') {
                                send(msg);
                            }
                            done();
                        }
                        catch(e) { done(e); }
                    }
                    else if (typeof msg.payload == "string") { // convert CSV string to object
                        try {
                            var f = true; // flag to indicate if inside or outside a pair of quotes true = outside.
                            var j = 0; // pointer into array of template items
                            var k = [""]; // array of data for each of the template items
                            var o = {}; // output object to build up
                            var a = []; // output array is needed for multiline option
                            var first = true; // is this the first line
                            var last = false;
                            var line = msg.payload;
                            var linecount = 0;
                            var tmp = "";
                            var has_parts = msg.hasOwnProperty("parts");
                            var reg = /^[-]?(?!E)(?!0\d)\d*\.?\d*(E-?\+?)?\d+$/i;
                            if (msg.hasOwnProperty("parts")) {
                                linecount = msg.parts.index;
                                if (msg.parts.index > node.skip) { first = false; }
                                if (msg.parts.hasOwnProperty("count") && (msg.parts.index+1 >= msg.parts.count)) { last = true; }
                            }

                            // For now we are just going to assume that any \r or \n means an end of line...
                            //   got to be a weird csv that has singleton \r \n in it for another reason...

                            // Now process the whole file/line
                            var nocr = (line.match(/[\r\n]/g)||[]).length;
                            if (has_parts && node.multi === "mult" && nocr > 1) { tmp = ""; first = true; }
                            for (var i = 0; i < line.length; i++) {
                                if (first && (linecount < node.skip)) {
                                    if (line[i] === "\n") { linecount += 1; }
                                    continue;
                                }
                                if ((node.hdrin === true) && first) { // if the template is in the first line
                                    if ((line[i] === "\n")||(line[i] === "\r")||(line.length - i === 1)) { // look for first line break
                                        if (line.length - i === 1) { tmp += line[i]; }
                                        template = clean(tmp,node.sep);
                                        first = false;
                                    }
                                    else { tmp += line[i]; }
                                }
                                else {
                                    if (line[i] === node.quo) { // if it's a quote toggle inside or outside
                                        f = !f;
                                        if (line[i-1] === node.quo) {
                                            if (f === false) { k[j] += '\"'; }
                                        } // if it's a quotequote then it's actually a quote
                                        //if ((line[i-1] !== node.sep) && (line[i+1] !== node.sep)) { k[j] += line[i]; }
                                    }
                                    else if ((line[i] === node.sep) && f) { // if it is the end of the line then finish
                                        if (!node.goodtmpl) { template[j] = "col"+(j+1); }
                                        if ( template[j] && (template[j] !== "") ) {
                                            // if no value between separators ('1,,"3"...') or if the line beings with separator (',1,"2"...') treat value as null
                                            if (line[i-1] === node.sep || line[i-1].includes('\n','\r')) k[j] = null;
                                            if ( (k[j] !== null && node.parsestrings === true) && reg.test(k[j].trim()) ) { k[j] = parseFloat(k[j].trim()); }
                                            if (node.include_null_values && k[j] === null) o[template[j]] = k[j];
                                            if (node.include_empty_strings && k[j] === "") o[template[j]] = k[j];
                                            if (k[j] !== null && k[j] !== "") o[template[j]] = k[j];
                                        }
                                        j += 1;
                                        // if separator is last char in processing string line (without end of line), add null value at the end - example: '1,2,3\n3,"3",'
                                        k[j] = line.length - 1 === i ? null : "";
                                    }
                                    else if (((line[i] === "\n") || (line[i] === "\r")) && f) { // handle multiple lines
                                        //console.log(j,k,o,k[j]);
                                        if (!node.goodtmpl) { template[j] = "col"+(j+1); }
                                        if ( template[j] && (template[j] !== "") ) {
                                            // if separator before end of line, set null value ie. '1,2,"3"\n1,2,\n1,2,3'
                                            if (line[i-1] === node.sep) k[j] = null;
                                            if ( (k[j] !== null && node.parsestrings === true) && reg.test(k[j].trim()) ) { k[j] = parseFloat(k[j].trim()); }
                                            else { if (k[j] !== null) k[j].replace(/\r$/,''); }
                                            if (node.include_null_values && k[j] === null) o[template[j]] = k[j];
                                            if (node.include_empty_strings && k[j] === "") o[template[j]] = k[j];
                                            if (k[j] !== null && k[j] !== "") o[template[j]] = k[j];
                                        }
                                        if (JSON.stringify(o) !== "{}") { // don't send empty objects
                                            a.push(o); // add to the array
                                        }
                                        j = 0;
                                        k = [""];
                                        o = {};
                                        f = true; // reset in/out flag ready for next line.
                                    }
                                    else { // just add to the part of the message
                                        k[j] += line[i];
                                    }
                                }
                            }
                            // Finished so finalize and send anything left
                            if (f === false) { node.warn(RED._("csv.errors.bad_csv")); }
                            if (!node.goodtmpl) { template[j] = "col"+(j+1); }

                            if ( template[j] && (template[j] !== "") ) {
                                if ( (k[j] !== null && node.parsestrings === true) && reg.test(k[j].trim()) ) { k[j] = parseFloat(k[j].trim()); }
                                else { if (k[j] !== null) k[j].replace(/\r$/,''); }
                                if (node.include_null_values && k[j] === null) o[template[j]] = k[j];
                                if (node.include_empty_strings && k[j] === "") o[template[j]] = k[j];
                                if (k[j] !== null && k[j] !== "") o[template[j]] = k[j];
                            }

                            if (JSON.stringify(o) !== "{}") { // don't send empty objects
                                a.push(o); // add to the array
                            }

                            if (node.multi !== "one") {
                                msg.payload = a;
                                if (has_parts && nocr <= 1) {
                                    if (JSON.stringify(o) !== "{}") {
                                        node.store.push(o);
                                    }
                                    if (msg.parts.index + 1 === msg.parts.count) {
                                        msg.payload = node.store;
                                        msg.columns = template.map(v => v.indexOf(',')!==-1 ? '"'+v+'"' : v).filter(v => v).join(',');
                                        delete msg.parts;
                                        send(msg);
                                        node.store = [];
                                    }
                                }
                                else {
                                    msg.columns = template.map(v => v.indexOf(',')!==-1 ? '"'+v+'"' : v).filter(v => v).join(',');
                                    send(msg); // finally send the array
                                }
                            }
                            else {
                                var len = a.length;
                                for (var i = 0; i < len; i++) {
                                    var newMessage = RED.util.cloneMessage(msg);
                                    newMessage.columns = template.map(v => v.indexOf(',')!==-1 ? '"'+v+'"' : v).filter(v => v).join(',');
                                    newMessage.payload = a[i];
                                    if (!has_parts) {
                                        newMessage.parts = {
                                            id: msg._msgid,
                                            index: i,
                                            count: len
                                        };
                                    }
                                    else {
                                        newMessage.parts.index -= node.skip;
                                        newMessage.parts.count -= node.skip;
                                        if (node.hdrin) { // if we removed the header line then shift the counts by 1
                                            newMessage.parts.index -= 1;
                                            newMessage.parts.count -= 1;
                                        }
                                    }
                                    if (last) { newMessage.complete = true; }
                                    send(newMessage);
                                }
                                if (has_parts && last && len === 0) {
                                    send({complete:true});
                                }
                            }
                            node.linecount = 0;
                            done();
                        }
                        catch(e) { done(e); }
                    }
                    else { node.warn(RED._("csv.errors.csv_js")); done(); }
                }
                else {
                    if (!msg.hasOwnProperty("reset")) {
                        node.send(msg); // If no payload and not reset - just pass it on.
                    }
                    done();
                }
            });
        }

        if(RFC4180Mode) {
            node.template = (n.temp || "")
            node.sep = (n.sep || ',').replace(/\\t/g, "\t").replace(/\\n/g, "\n").replace(/\\r/g, "\r")
            node.quo = '"'
            // default to CRLF (RFC4180 Sec 2.1: "Each record is located on a separate line, delimited by a line break (CRLF)")
            node.ret = (n.ret || "\r\n").replace(/\\n/g, "\n").replace(/\\r/g, "\r")
            node.multi = n.multi || "one"
            node.hdrin = n.hdrin || false
            node.hdrout = n.hdrout || "none"
            node.goodtmpl = true
            node.skip = parseInt(n.skip || 0)
            node.store = []
            node.parsestrings = n.strings
            node.include_empty_strings = n.include_empty_strings || false
            node.include_null_values = n.include_null_values || false
            if (node.parsestrings === undefined) { node.parsestrings = true }
            if (node.hdrout === false) { node.hdrout = "none" }
            if (node.hdrout === true) { node.hdrout = "all" }
            const dontSendHeaders = node.hdrout === "none"
            const sendHeadersOnce = node.hdrout === "once"
            const sendHeadersAlways = node.hdrout === "all"
            const sendHeaders = !dontSendHeaders && (sendHeadersOnce || sendHeadersAlways)
            const quoteables = [node.sep, node.quo, "\n", "\r"]
            const templateQuoteables = [',', '"', "\n", "\r"]
            let badTemplateWarnOnce = true

            const columnStringToTemplateArray = function (col, sep) {
                // NOTE: enforce strict column template parsing in RFC4180 mode
                const parsed = csv.parse(col, { separator: sep, quote: node.quo, outputStyle: 'array', strict: true })
                if (parsed.headers.length > 0) { node.goodtmpl = true } else { node.goodtmpl = false }
                return parsed.headers.length ? parsed.headers : null
            }
            const templateArrayToColumnString = function (template, keepEmptyColumns) {
                // NOTE: enforce strict column template parsing in RFC4180 mode
                const parsed = csv.parse('', {headers: template, headersOnly:true, separator: ',', quote: node.quo, outputStyle: 'array', strict: true })
                return keepEmptyColumns
                    ? parsed.headers.map(e => addQuotes(e || '', { separator: ',', quoteables: templateQuoteables}))
                    : parsed.header // exclues empty columns
                    // TODO: resolve inconsistency between CSV->JSON and JSON->CSV
                    // CSV->JSON: empty columns are excluded
                    // JSON->CSV: empty columns are kept in some cases
            }
            function addQuotes(cell, options) {
                options = options || {}
                return csv.quoteCell(cell, {
                    quote: options.quote || node.quo || '"',
                    separator: options.separator || node.sep || ',',
                    quoteables: options.quoteables || quoteables
                })
            }
            const hasTemplate = (t) => t?.length > 0 && !(t.length === 1 && t[0] === '')
            let template
            try {
                template = columnStringToTemplateArray(node.template, ',') || ['']
            } catch (e) {
                node.warn(RED._("csv.errors.bad_template")) // is warning really necessary now we have status?
                node.status({ fill: "red", shape: "dot", text: RED._("csv.errors.bad_template") })
                return // dont hook up the node
            }
            const noTemplate = hasTemplate(template) === false
            node.hdrSent = false

            node.on("input", function (msg, send, done) {
                node.status({}) // clear status
                if (msg.hasOwnProperty("reset")) {
                    node.hdrSent = false
                }
                if (msg.hasOwnProperty("payload")) {
                    let inputData = msg.payload
                    if (typeof inputData == "object") { // convert object to CSV string
                        try {
                            // first determine the payload kind. Array or objects? Array of primitives? Array of arrays? Just an object?
                            // then, if necessary, convert to an array of objects/arrays
                            let isObject = !Array.isArray(inputData) && typeof inputData === 'object'
                            let isArrayOfObjects = Array.isArray(inputData) && inputData.length > 0 && typeof inputData[0] === 'object'
                            let isArrayOfArrays = Array.isArray(inputData) && inputData.length > 0 && Array.isArray(inputData[0])
                            let isArrayOfPrimitives = Array.isArray(inputData) && inputData.length > 0 && typeof inputData[0] !== 'object'

                            if (isObject) {
                                inputData = [inputData]
                                isArrayOfObjects = true
                                isObject = false
                            } else if (isArrayOfPrimitives) {
                                inputData = [inputData]
                                isArrayOfArrays = true
                                isArrayOfPrimitives = false
                            }

                            const stringBuilder = []
                            if (!(noTemplate && (msg.hasOwnProperty("parts") && msg.parts.hasOwnProperty("index") && msg.parts.index > 0))) {
                                template = columnStringToTemplateArray(node.template) || ['']
                            }

                            // build header line
                            if (sendHeaders && node.hdrSent === false) {
                                if (hasTemplate(template) === false) {
                                    if (msg.hasOwnProperty("columns")) {
                                        template = columnStringToTemplateArray(msg.columns || "", ",") || ['']
                                    }
                                    else {
                                        template = Object.keys(inputData[0]) || ['']
                                    }
                                }
                                stringBuilder.push(templateArrayToColumnString(template, true))
                                if (sendHeadersOnce) { node.hdrSent = true }
                            }

                            // build csv lines
                            for (let s = 0; s < inputData.length; s++) {
                                let row = inputData[s]
                                if (isArrayOfArrays) {
                                    /*** row is an array of arrays ***/
                                    const _hasTemplate = hasTemplate(template)
                                    const len = _hasTemplate ? template.length : row.length
                                    const result = []
                                    for (let t = 0; t < len; t++) {
                                        let cell = row[t]
                                        if (cell === undefined) { cell = "" }
                                        if(_hasTemplate) {
                                            const header = template[t]
                                            if (header) {
                                                result[t] = addQuotes(RED.util.ensureString(cell))
                                            }
                                        } else {
                                            result[t] = addQuotes(RED.util.ensureString(cell))
                                        }
                                    }
                                    stringBuilder.push(result.join(node.sep))
                                } else {
                                    /*** row is an object ***/
                                    if (hasTemplate(template) === false && (msg.hasOwnProperty("columns"))) {
                                        template = columnStringToTemplateArray(msg.columns || "", ",")
                                    }
                                    if (hasTemplate(template) === false) {
                                        /*** row is an object but we still don't have a template ***/
                                        if (badTemplateWarnOnce === true) {
                                            node.warn(RED._("csv.errors.obj_csv"))
                                            badTemplateWarnOnce = false
                                        }
                                        const rowData = []
                                        for (let header in inputData[0]) {
                                            if (row.hasOwnProperty(header)) {
                                                const cell = row[header]
                                                if (typeof cell !== "object") {
                                                    let cellValue = ""
                                                    if (cell !== undefined) {
                                                        cellValue += cell
                                                    }
                                                    rowData.push(addQuotes(cellValue))
                                                }
                                            }
                                        }
                                        stringBuilder.push(rowData.join(node.sep))
                                    } else {
                                        /*** row is an object and we have a template ***/
                                        const rowData = []
                                        for (let t = 0; t < template.length; t++) {
                                            if (!template[t]) {
                                                rowData.push('')
                                            }
                                            else {
                                                let cellValue = inputData[s][template[t]]
                                                if (cellValue === undefined) { cellValue = "" }
                                                cellValue = RED.util.ensureString(cellValue)
                                                rowData.push(addQuotes(cellValue))
                                            }
                                        }
                                        stringBuilder.push(rowData.join(node.sep)); // add separator
                                    }
                                }
                            }

                            // join lines, don't forget to add the last new line
                            msg.payload = stringBuilder.join(node.ret) + node.ret
                            msg.columns = templateArrayToColumnString(template)
                            if (msg.payload !== '') { send(msg) }
                            done()
                        }
                        catch (e) { 
                            done(e)
                        }
                    }
                    else if (typeof inputData == "string") { // convert CSV string to object
                        try {
                            let firstLine = true; // is this the first line
                            let last = false
                            let linecount = 0
                            const has_parts = msg.hasOwnProperty("parts")

                            // determine if this is a multi part message and if so what part we are processing
                            if (msg.hasOwnProperty("parts")) {
                                linecount = msg.parts.index
                                if (msg.parts.index > node.skip) { firstLine = false }
                                if (msg.parts.hasOwnProperty("count") && (msg.parts.index + 1 >= msg.parts.count)) { last = true }
                            }

                            // If skip is set, compute the cursor position to start parsing from
                            let _cursor = 0
                            if (node.skip > 0 && linecount < node.skip) {
                                for (; _cursor < inputData.length; _cursor++) {
                                    if (firstLine && (linecount < node.skip)) {
                                        if (inputData[_cursor] === "\r" || inputData[_cursor] === "\n") {
                                            linecount += 1
                                        }
                                        continue
                                    }
                                    break
                                }
                                if (_cursor >= inputData.length) {
                                    return // skip this line
                                }
                            }

                            // count the number of line breaks in the string
                            const noofCR = ((_cursor ? inputData.slice(_cursor) : inputData).match(/[\r\n]/g) || []).length

                            // if we have `parts` and we are outputting multiple objects and we have more than one line
                            // then we need to set firstLine to true so that we process the header line
                            if (has_parts && node.multi === "mult" && noofCR > 1) {
                                firstLine = true
                            }

                            // if we are processing the first line and the node has been set to extract the header line
                            // update the template with the header line
                            if (firstLine && node.hdrin === true) {
                                /** @type {import('./lib/csv/index.js').CSVParseOptions} */
                                const csvOptionsForHeaderRow = {
                                    cursor: _cursor,
                                    separator: node.sep,
                                    quote: node.quo,
                                    dataHasHeaderRow: true,
                                    headersOnly: true,
                                    outputStyle: 'array',
                                    strict: true // enforce strict parsing of the header row
                                }
                                try {
                                    const csvHeader = csv.parse(inputData, csvOptionsForHeaderRow)
                                    template = csvHeader.headers
                                    _cursor = csvHeader.cursor
                                } catch (e) {
                                    // node.warn(RED._("csv.errors.bad_template")) // add warning?
                                    node.status({ fill: "red", shape: "dot", text: RED._("csv.errors.bad_template") })
                                    throw e
                                }
                            }

                            // now we process the data lines
                            /** @type {import('./lib/csv/index.js').CSVParseOptions} */
                            const csvOptions = {
                                cursor: _cursor,
                                separator: node.sep,
                                quote: node.quo,
                                dataHasHeaderRow: false,
                                headers: hasTemplate(template) ? template : null,
                                outputStyle: 'object',
                                includeNullValues: node.include_null_values,
                                includeEmptyStrings: node.include_empty_strings,
                                parseNumeric: node.parsestrings,
                                strict: false // relax the strictness of the parser for data rows
                            }
                            const csvParseResult = csv.parse(inputData, csvOptions)
                            const data = csvParseResult.data

                            // output results
                            if (node.multi !== "one") {
                                if (has_parts && noofCR <= 1) {
                                    if (data.length > 0) {
                                        node.store.push(...data)
                                    }
                                    if (msg.parts.index + 1 === msg.parts.count) {
                                        msg.payload = node.store
                                        msg.columns = csvParseResult.header
                                        // msg._mode = 'RFC4180 mode'
                                        delete msg.parts
                                        send(msg)
                                        node.store = []
                                    }
                                }
                                else {
                                    msg.columns = csvParseResult.header
                                    // msg._mode = 'RFC4180 mode'
                                    msg.payload = data
                                    send(msg); // finally send the array
                                }
                            }
                            else {
                                const len = data.length
                                for (let row = 0; row < len; row++) {
                                    const newMessage = RED.util.cloneMessage(msg)
                                    newMessage.columns = csvParseResult.header
                                    newMessage.payload = data[row]
                                    if (!has_parts) {
                                        newMessage.parts = {
                                            id: msg._msgid,
                                            index: row,
                                            count: len
                                        }
                                    }
                                    else {
                                        newMessage.parts.index -= node.skip
                                        newMessage.parts.count -= node.skip
                                        if (node.hdrin) { // if we removed the header line then shift the counts by 1
                                            newMessage.parts.index -= 1
                                            newMessage.parts.count -= 1
                                        }
                                    }
                                    if (last) { newMessage.complete = true }
                                    // newMessage._mode = 'RFC4180 mode'
                                    send(newMessage)
                                }
                                if (has_parts && last && len === 0) {
                                    // send({complete:true, _mode: 'RFC4180 mode'})
                                    send({ complete: true })
                                }
                            }

                            node.linecount = 0
                            done()
                        }
                        catch (e) {
                            done(e)
                        }
                    }
                    else { 
                        // RFC-vs-legacy mode difference: In RFC mode, we throw catchable errors and provide a status message
                        const err = new Error(RED._("csv.errors.csv_js"))
                        node.status({ fill: "red", shape: "dot", text: err.message })
                        done(err)
                    }
                }
                else {
                    if (!msg.hasOwnProperty("reset")) {
                        node.send(msg); // If no payload and not reset - just pass it on.
                    }
                    done()
                }
            })
        }
    }

    RED.nodes.registerType("csv",CSVNode)
}
