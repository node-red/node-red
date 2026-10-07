/* eslint-disable no-undef */
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

const assert = require("assert");
const csvNode = require("nr-test-utils").require("@node-red/nodes/core/parsers/70-CSV.js");
const helper = require("node-red-node-test-helper");

describe("CSV leading empty columns (Legacy Mode)", function() {
    before(function(done) {
        helper.startServer(done);
    });
    after(function(done) {
        helper.stopServer(done);
    });
    afterEach(function() {
        return helper.unload();
    });

    function checkCSV(config, payload, expected, done) {
        const flow = [Object.assign({
            id: "n1", type: "csv", spec: "legacy", temp: "a,b,c",
            multi: "mult", include_empty_strings: false, wires: [["n2"]]
        }, config), {id: "n2", type: "helper"}];
        helper.load(csvNode, flow, function() {
            const n1 = helper.getNode("n1");
            const n2 = helper.getNode("n2");
            n1.on("call:error", function(call) {
                const error = call.args[0];
                done(error instanceof Error ? error : new Error(String(error)));
            });
            n2.on("input", function(msg) {
                try {
                    assert.deepStrictEqual(msg.payload, expected);
                    done();
                } catch (error) {
                    done(error);
                }
            });
            n1.receive({payload});
        });
    }

    for (const sep of [",", "\t"]) {
        for (const ending of ["\n", "\r\n", "\r"]) {
            for (const includeNulls of [true, false]) {
                it("handles a leading " + JSON.stringify(sep) +
                    " with line ending " + JSON.stringify(ending) +
                    " and include_null_values=" + includeNulls, function(done) {
                    const expected = [{b: 1, c: 2}, {b: 3, c: 4}];
                    if (includeNulls) {
                        expected.forEach(row => { row.a = null; });
                    }
                    const payload = sep + "1" + sep + "2" + ending +
                        sep + "3" + sep + "4" + ending;
                    checkCSV({sep, include_null_values: includeNulls},
                        payload, expected, done);
                });
            }
        }
    }

    it("handles a leading delimiter without a final newline", function(done) {
        checkCSV({include_null_values: true}, ",1,2",
            [{a: null, b: 1, c: 2}], done);
    });

    it("handles consecutive empty columns", function(done) {
        checkCSV({include_null_values: true}, ",,2\n",
            [{a: null, b: null, c: 2}], done);
    });

    it("does not turn a missing first field into an empty string", function(done) {
        checkCSV({include_null_values: false, include_empty_strings: true},
            ",1,2", [{b: 1, c: 2}], done);
    });

    it("keeps a quoted empty first field as an empty string", function(done) {
        checkCSV({include_null_values: true, include_empty_strings: true},
            '"",1,2', [{a: "", b: 1, c: 2}], done);
    });

    it("omits a quoted empty field when empty strings are disabled", function(done) {
        checkCSV({include_null_values: true, include_empty_strings: false},
            '"",1,2\n', [{b: 1, c: 2}], done);
    });
});
