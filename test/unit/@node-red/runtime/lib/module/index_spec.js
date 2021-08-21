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

const should = require("should");

const NR_TEST_UTILS = require("nr-test-utils");
const index = NR_TEST_UTILS.require("@node-red/runtime/lib/module/index")

describe("runtime/module", function() {
    describe("createSubflow", function() {
        before(function() {
            index.init({
                settings: {}
            });
        });
        it('create NPM packaged SUBFLOW', function() {
            const meta = {
                module: 'node-red-contrib-sf',
                type: 'SF',
                version: '1.0.0',
                author: 'john.smith@xyz.com',
                desc: 'Test SF',
                keywords: 'Node-RED,test',
                encoding: 'none',
                license: 'GPL-2.0'
            };
            const flow = [
                {
                    id: 'd4c3f1f6b56e8f8c',
                    type: 'subflow',
                    name: 'SF',
                    info: 'Sample Subflow for test case',
                    category: '',
                        in: [ [Object] ],
                    out: [ [Object] ],
                    env: [],
                    meta: {
                        module: 'node-red-contrib-sf',
                        type: 'SF',
                        version: '1.0.0',
                        author: 'john.smith@xyz.com',
                        desc: 'Test SF',
                        keywords: 'Node-RED,test',
                        encoding: 'none',
                        license: 'GPL-2.0'
                    },
                    color: '#3FADB5',
                    icon: 'font-awesome/fa-bug'
                },
                {
                    id: 'e6781d1f15c38c18',
                    type: 'function',
                    z: 'd4c3f1f6b56e8f8c',
                    name: 'Func',
                    func: '\nreturn msg;',
                    outputs: 1,
                    noerr: 0,
                    initialize: '',
                    finalize: '',
                    libs: [],
                    x: 190,
                    y: 80,
                    wires: [ [] ]
                }
            ];
            const mod = index.createSubflow(meta, flow);
            mod.then((data) => {
                // result string should be updated if template changed
                data.should.equal("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");
            });
        });
    });
});
