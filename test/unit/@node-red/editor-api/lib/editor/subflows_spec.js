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

var should = require("should");
var request = require('supertest');
var express = require('express');
var bodyParser = require("body-parser");
var sinon = require('sinon');

var NR_TEST_UTILS = require("nr-test-utils");

var subflows = NR_TEST_UTILS.require("@node-red/editor-api/lib/editor/subflows");

describe('api/editor/subflows', function() {
    var app;

    before(function() {
        app = express();
        app.use(bodyParser.json());
        
        app.post('/subflows/module', subflows.createSubflow);
        subflows.init({
            subflows: {
                createSubflow: (opts) => {
                    const meta = opts.meta;
                    const flow = opts.flow;
                    return Promise.resolve([meta.module, flow[0].id]);
                }
            }
        });
    });

    it('creates subflow',function(done) {
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

        request(app)
            .post("/subflows/module")
            .send({
                meta: meta,
                flow: flow
            })
            .expect(200)
            .end(function(err,res) {
                if (err) {
                    done(err);
                } else {
                    try {
                        res.body[0].should.equal(meta.module);
                        res.body[1].should.equal(flow[0].id);
                        done();
                    } catch(e) {
                        done(e);
                    }
                }
            })
    });

});
