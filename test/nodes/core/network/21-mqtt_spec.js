/**
 * Copyright JS Foundation and other contributors, mqtt://js.foundation
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

/* These tests are only supposed to be executed at development time (for now)*/

"use strict";
const should = require("should");
const helper = require("node-red-node-test-helper");
const mqttNodes = require("nr-test-utils").require("@node-red/nodes/core/network/10-mqtt.js");
const BROKER_HOST = process.env.MQTT_BROKER_SERVER || "localhost";
const BROKER_PORT = process.env.MQTT_BROKER_PORT || 1883;
const skipTests = process.env.CI == "true" || process.env.CI == "1"; //CI Env - skip MQTT tests

describe('MQTT Nodes', function () {

    before(function (done) {
        helper.startServer(done);
    });

    after(function (done) {
        helper.stopServer(done);
    });

    afterEach(function () {
        try {
            helper.unload();
        } catch (error) { }
    });

    it('should be loaded and have default values', function (done) {
        this.timeout = 2000;
        const { flow, nodes } = buildBasicMQTTSendRecvFlow({ id: "mqtt.broker", name: "mqtt_broker", autoConnect: false }, { id: "mqtt.in", topic: "in_topic" }, { id: "mqtt.out", topic: "out_topic" });
        helper.load(mqttNodes, flow, function () {
            try {
                const mqttIn = helper.getNode("mqtt.in");
                const mqttOut = helper.getNode("mqtt.out");
                const mqttBroker = helper.getNode("mqtt.broker");

                should(mqttIn).be.type("object", "mqtt in node should be an object")
                mqttIn.should.have.property('broker', nodes.mqtt_broker.id); //should be the id of the broker node
                mqttIn.should.have.property('datatype', 'utf8'); //default: 'utf8'
                mqttIn.should.have.property('isDynamic', false);  //default: false
                mqttIn.should.have.property('inputs', 0); //default: 0 
                mqttIn.should.have.property('qos', 2); //default: 2
                mqttIn.should.have.property('topic', "in_topic");
                mqttIn.should.have.property('wires', [["helper.node"]]);

                should(mqttOut).be.type("object", "mqtt out node should be an object")
                mqttOut.should.have.property('broker', nodes.mqtt_broker.id); //should be the id of the broker node
                mqttOut.should.have.property('topic', "out_topic");

                should(mqttBroker).be.type("object", "mqtt broker node should be an object")
                mqttBroker.should.have.property('broker', BROKER_HOST);
                mqttBroker.should.have.property('port', BROKER_PORT);
                mqttBroker.should.have.property('brokerurl');
                // mqttBroker.should.have.property('autoUnsubscribe', true);//default: true 
                mqttBroker.should.have.property('autoConnect', false);//Set "autoConnect:false" in brokerOptions 
                mqttBroker.should.have.property('options');
                mqttBroker.options.should.have.property('clean', true);
                mqttBroker.options.should.have.property('clientId');
                mqttBroker.options.clientId.should.containEql('nodered_');
                mqttBroker.options.should.have.property('keepalive').type("number");
                mqttBroker.options.should.have.property('reconnectPeriod').type("number");
                done();
            } catch (error) {
                done(error)
            }
        });
    });

    if (skipTests) {
        it('should skip following MQTT tests (no broker available)', function (done) {
            done();
        });
    }

    /** Conditional test runner (only run if skipTests=false) */
    function itConditional(title, test) {
        return !skipTests ? it(title, test) : it.skip(title, test);
    }

    //#region ################### BASIC TESTS ################### #//

    itConditional('basic send and receive tests', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 2000;
        const options = {}
        options.sendMsg = {
            topic: nextTopic(),
            payload: "hello",
            qos: 0
        }
        options.expectMsg = Object.assign({}, options.sendMsg);
        testSendRecv({}, { datatype: "auto", topicType: "static" }, {}, options, { done: done });
    });
    itConditional('should send JSON and receive string (auto)', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 2000;
        const options = {}
        options.sendMsg = {
            topic: nextTopic(),
            payload: '{"prop":"value1", "num":1}',
            qos: 1
        }
        options.expectMsg = Object.assign({}, options.sendMsg);
        testSendRecv({}, { datatype: "auto", topicType: "static" }, {}, options, { done: done });
    })
    itConditional('should send JSON and receive string (utf8)', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 2000;
        const options = {}
        options.sendMsg = {
            topic: nextTopic(),
            payload: '{"prop":"value2", "num":2}',
            qos: 2
        }
        options.expectMsg = Object.assign({}, options.sendMsg);
        testSendRecv({}, { datatype: "utf8", topicType: "static" }, {}, options, { done: done });
    });
    itConditional('should send JSON and receive Object (json)', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 2000;
        const options = {}
        options.sendMsg = {
            topic: nextTopic(),
            payload: '{"prop":"value3", "num":3}'// send a string ...
        }
        options.expectMsg = Object.assign({}, options.sendMsg, { payload: { "prop": "value3", "num": 3 } });//expect an object
        testSendRecv({}, { datatype: "json", topicType: "static" }, {}, options, { done: done });
    });
    itConditional('should send String and receive Buffer (buffer)', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 2000;
        const options = {}
        options.sendMsg = {
            topic: nextTopic(),
            payload: "a b c" //send string ...
        }
        options.expectMsg = Object.assign({}, options.sendMsg, { payload: Buffer.from(options.sendMsg.payload) });//expect Buffer.from(msg.payload)
        testSendRecv({}, { datatype: "buffer", topicType: "static" }, {}, options, { done: done });
    });
    itConditional('should send utf8 Buffer and receive String (auto)', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 2000;
        const options = {}
        options.sendMsg = {
            topic: nextTopic(),
            payload: Buffer.from([0x78, 0x20, 0x79, 0x20, 0x7a]) // "x y z"
        }
        options.expectMsg = Object.assign({}, options.sendMsg, { payload: "x y z" });//set expected payload to "x y z"
        testSendRecv({}, { datatype: "auto", topicType: "static" }, {}, options, { done: done });
    });
    itConditional('should send non utf8 Buffer and receive Buffer (auto)', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 2000;
        const options = {}
        const hooks = { done: done, beforeLoad: null, afterLoad: null, afterConnect: null }
        options.sendMsg = {
            topic: nextTopic(),
            payload: Buffer.from([0xC0, 0xC1, 0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD, 0xFE, 0xFF]) //non valid UTF8
        }
        options.expectMsg = Object.assign({}, options.sendMsg);
        testSendRecv({}, { datatype: "auto", topicType: "static" }, {}, options, hooks);
    });
    itConditional('should send/receive all v5 flags and settings', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 2000;
        const t = nextTopic();
        const options = {}
        const hooks = { done: done, beforeLoad: null, afterLoad: null, afterConnect: null }
        options.sendMsg = {
            topic: t + "/command", payload: Buffer.from("v5"), qos: 1, retain: true,
            responseTopic: t + "/response",
            userProperties: { prop1: "val1" },
            contentType: "application/json",
            correlationData: Buffer.from([1, 2, 3]),
            payloadFormatIndicator: true,
            messageExpiryInterval: 2000,
        }
        options.expectMsg = Object.assign({}, options.sendMsg);
        options.expectMsg.payload = options.expectMsg.payload.toString(); //auto mode + payloadFormatIndicator should make a string
        delete options.expectMsg.payloadFormatIndicator; //Seems mqtt.js only publishes payloadFormatIndicator the will msg
        const inOptions = {
            datatype: "auto", topicType: "static",
            qos: 1, nl: false, rap: true, rh: 1
        }
        testSendRecv({ protocolVersion: 5 }, inOptions, {}, options, hooks);
    });
    itConditional('should subscribe dynamically via action', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 2000;
        const options = {}
        const hooks = { done: done, beforeLoad: null, afterLoad: null, afterConnect: null }
        options.sendMsg = {
            topic: nextTopic(), payload: "abc"
        }
        options.expectMsg = Object.assign({}, options.sendMsg);
        testSendRecv({ protocolVersion: 5 }, { datatype: "utf8", topicType: "dynamic" }, {}, options, hooks);
    });
    //#endregion  BASIC TESTS

    //#region ################### ADVANCED TESTS ################### #//
    itConditional('should connect via "connect" action', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 2000;
        const options = {}
        const hooks = { done: null, beforeLoad: null, afterLoad: null, afterConnect: null }
        hooks.afterLoad = (helperNode, mqttBroker, mqttIn, mqttOut) => {
            mqttBroker.should.have.property("autoConnect", false);
            mqttBroker.should.have.property("connecting", false);//should not attempt to connect (autoConnect:false)
            mqttIn.receive({ "action": "connect" }); //now request connect action
            return true; //handled
        }
        hooks.afterConnect = (helperNode, mqttBroker, mqttIn, mqttOut) => {
            done();//if we got here, it connected :)
            return true;
        }
        testSendRecv({ protocolVersion: 5, autoConnect: false }, { datatype: "utf8", topicType: "dynamic" }, {}, options, hooks);
    });
    itConditional('should disconnect via "disconnect" action', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 2000;
        const options = {}
        const hooks = { done: done, beforeLoad: null, afterLoad: null, afterConnect: null }
        hooks.beforeLoad = (flow) => { //add a status node pointed at MQTT Out node (to watch for connection status change)
            flow.push({ "id": "status.node", "type": "status", "name": "status_node", "scope": ["mqtt.out"], "wires": [["helper.node"]] });//add status node to watch mqtt_out
        }
        hooks.afterLoad = (helperNode, mqttBroker, mqttIn, mqttOut) => {
            mqttBroker.should.have.property("autoConnect", true);
            mqttBroker.should.have.property("connecting", true);//should be trying to connect (autoConnect:true)
            return true; //handled
        }
        hooks.afterConnect = (helperNode, mqttBroker, mqttIn, mqttOut) => {
            //connected - now add the "on" handler then send "disconnect" action
            helperNode.on("input", function (msg) {
                try {
                    msg.should.have.property("status");
                    msg.status.should.have.property("text");
                    msg.status.text.should.containEql('disconnect');
                    done(); //it disconnected - yey!
                } catch (error) {
                    done(error)
                }
            })
            mqttOut.receive({ "action": "disconnect" });
            return true; //handed
        }
        testSendRecv({ protocolVersion: 5 }, null, {}, options, hooks);
    });
    itConditional('should publish birth message', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 2000;
        const baseTopic = nextTopic();
        const brokerOptions = {
            protocolVersion: 4,
            birthTopic: baseTopic + "/birth",
            birthPayload: "broker connected",
            birthQos: 2,
        }
        const options = {};
        const hooks = { done: done, beforeLoad: null, afterLoad: null, afterConnect: null };
        options.expectMsg = {
            topic: brokerOptions.birthTopic,
            payload: brokerOptions.birthPayload,
            qos: brokerOptions.birthQos
        };
        testSendRecv(brokerOptions, { topic: brokerOptions.birthTopic }, {}, options, hooks);
    });
    itConditional('should publish close message', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 2000;
        const baseTopic = nextTopic();
        const broker1Options = { id: "mqtt.broker1" }//Broker 1 - stays connected to receive the close message
        const broker2Options = { id: "mqtt.broker2", closeTopic: baseTopic + "/close", closePayload: '{"msg":"close"}', closeQos: 1, }//Broker 2 - connects to same broker but has a LWT message.
        const { flow } = buildBasicMQTTSendRecvFlow(broker1Options, { broker: broker1Options.id, topic: broker2Options.closeTopic, datatype: "json" }, { broker: broker2Options.id })
        flow.push(buildMQTTBrokerNode(broker2Options.id, broker2Options.name, BROKER_HOST, BROKER_PORT, broker2Options)); //add second broker
        helper.load(mqttNodes, flow, function () {
            const helperNode = helper.getNode("helper.node");
            const mqttOut = helper.getNode("mqtt.out");
            const mqttBroker1 = helper.getNode("mqtt.broker1");
            const mqttBroker2 = helper.getNode("mqtt.broker2");
            waitBrokerConnect([mqttBroker1, mqttBroker2], function connected() {
                //connected - add the on handler and call to disconnect
                helperNode.on("input", function (msg) {
                    try {
                        msg.should.have.property("topic", broker2Options.closeTopic);
                        msg.should.have.property('payload', JSON.parse(broker2Options.closePayload));
                        msg.should.have.property('qos', broker2Options.closeQos);
                        done();
                    } catch (error) {
                        done(error)
                    }
                })
                mqttOut.receive({ "action": "disconnect" });//close broker2
            })
        });
    });
    itConditional('should publish will message', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 2000;
        const baseTopic = nextTopic();
        const broker1Options = { id: "mqtt.broker1" }//Broker 1 - stays connected to receive the will message
        const broker2Options = { id: "mqtt.broker2", willTopic: baseTopic + "/will", willPayload: '{"msg":"will"}', willQos: 2, }//Broker 2 - connects to same broker but has a LWT message.
        const { flow } = buildBasicMQTTSendRecvFlow(broker1Options, { broker: broker1Options.id, topic: broker2Options.willTopic, datatype: "utf8" }, { broker: broker2Options.id })
        flow.push(buildMQTTBrokerNode(broker2Options.id, broker2Options.name, BROKER_HOST, BROKER_PORT, broker2Options)); //add second broker

        helper.load(mqttNodes, flow, function () {
            const helperNode = helper.getNode("helper.node");
            const mqttBroker1 = helper.getNode("mqtt.broker1");
            const mqttBroker2 = helper.getNode("mqtt.broker2");
            waitBrokerConnect([mqttBroker1, mqttBroker2], function connected() {
                //connected - add the on handler and call to disconnect
                helperNode.on("input", function (msg) {
                    try {
                        msg.should.have.property("topic", broker2Options.willTopic);
                        msg.should.have.property('payload', broker2Options.willPayload);
                        msg.should.have.property('qos', broker2Options.willQos);
                        done();
                    } catch (error) {
                        done(error)
                    }
                });
                mqttBroker2.client.end(true); //force closure
            })
        });
    });
    itConditional('should publish will message with V5 properties', function (done) {
        if (skipTests) { return this.skip() }
        // return this.skip(); //Issue receiving v5 props on will msg. Issue raised here: https://github.com/mqttjs/MQTT.js/issues/1455
        this.timeout = 2000;
        const baseTopic = nextTopic();
        //Broker 1 - stays connected to receive the will message when broker 2 is killed
        const broker1Options = { id: "mqtt.broker1", name: "mqtt_broker1", protocolVersion: 5, datatype: "utf8" }
        //Broker 2 - connects to same broker but has a LWT message. Broker 2 gets killed shortly after connection so that the will message is sent from broker
        const broker2Options = {
            id: "mqtt.broker2", name: "mqtt_broker2", protocolVersion: 5,
            willTopic: baseTopic + "/will",
            willPayload: '{"msg":"will"}',
            willQos: 2,
            willMsg: {
                contentType: 'application/json',
                userProps: { "will": "value" },
                respTopic: baseTopic + "/resp",
                correl: Buffer.from("abc"),
                expiry: 2000,
                payloadFormatIndicator: true
            }
        }
        const expectMsg = {
            topic: broker2Options.willTopic,
            payload: broker2Options.willPayload,
            qos: broker2Options.willQos,
            contentType: broker2Options.willMsg.contentType,
            userProperties: broker2Options.willMsg.userProps,
            responseTopic: broker2Options.willMsg.respTopic,
            correlationData: broker2Options.willMsg.correl,
            messageExpiryInterval: broker2Options.willMsg.expiry,
            // payloadFormatIndicator: broker2Options.willMsg.payloadFormatIndicator,
        };
        const { flow, nodes } = buildBasicMQTTSendRecvFlow(broker1Options, { broker: broker1Options.id, topic: broker2Options.willTopic, datatype: "utf8" }, { broker: broker2Options.id })
        flow.push(buildMQTTBrokerNode(broker2Options.id, broker2Options.name, nodes.mqtt_broker1.broker, nodes.mqtt_broker1.port, broker2Options)) //add second broker with will msg set
        helper.load(mqttNodes, flow, function () {
            const helperNode = helper.getNode("helper.node");
            const mqttBroker1 = helper.getNode("mqtt.broker1");
            const mqttBroker2 = helper.getNode("mqtt.broker2");
            waitBrokerConnect([mqttBroker1, mqttBroker2], function connected() {
                //connected - add the on handler and call to disconnect
                helperNode.on("input", function (msg) {
                    try {
                        compareMsgToExpected(msg, expectMsg);
                        done();
                    } catch (error) {
                        done(error)
                    }
                });
                mqttBroker2.client.end(true); //force closure
            })
        });
    });
    //#endregion  ADVANCED TESTS
});

//#region ################### HELPERS ################### #//

/**
 * A basic unit test that builds a flow containing 1 broker, 1 mqtt-in, one mqtt-out and a helper.  
 *  It performs the following steps: builds flow, loads flow, waits for connection, sends `sendMsg`, 
 *  waits for msg then compares `sendMsg` to `expectMsg`, and finally calls `done`
 * @param {object} brokerOptions anything that can be set in an MQTTBrokerNode (e.g. id, name, url, broker, server, port, protocolVersion, ...)
 * @param {object} inNodeOptions anything that can be set in an MQTTInNode (e.g. id, name, broker, topic, rh, nl, rap, ... )
 * @param {object} outNodeOptions anything that can be set in an MQTTOutNode (e.g. id, name, broker, ...)
 * @param {object} options an object for passing in test properties like `sendMsg` and `expectMsg`
 * @param {object} hooks an object containing hook functions...
 *   * [fn] `done()` - the tests done function. If excluded, an error will be thrown upon test error
 *   * [fn] `beforeLoad(flow)` - provides opportunity to adjust the flow JSON before loading into runtime
 *   * [fn] `afterLoad(helperNode, mqttBroker, mqttIn, mqttOut)` - called before connection attempt
 *   * [fn] `afterConnect(helperNode, mqttBroker, mqttIn, mqttOut)` - called before connection attempt
 */
function testSendRecv(brokerOptions, inNodeOptions, outNodeOptions, options, hooks) {
    options = options || {};
    brokerOptions = brokerOptions || {};
    inNodeOptions = inNodeOptions || {};
    outNodeOptions = outNodeOptions || {};
    const sendMsg = options.sendMsg || {};
    sendMsg.topic = sendMsg.topic || nextTopic();
    const expectMsg = options.expectMsg || Object.assign({}, sendMsg);
    expectMsg.payload = inNodeOptions.payload === undefined ? expectMsg.payload : inNodeOptions.payload;
    if (inNodeOptions.topicType != "dynamic") {
        inNodeOptions.topic = inNodeOptions.topic || sendMsg.topic;
    }

    const { flow, nodes } = buildBasicMQTTSendRecvFlow(brokerOptions, inNodeOptions, outNodeOptions);
    if (hooks.beforeLoad) { hooks.beforeLoad(flow) }
    helper.load(mqttNodes, flow, function () {
        try {
            const helperNode = helper.getNode("helper.node");
            const mqttBroker = helper.getNode(brokerOptions.id);
            const mqttIn = helper.getNode(nodes.mqtt_in.id);
            const mqttOut = helper.getNode(nodes.mqtt_out.id);
            let afterLoadHandled = false;
            if (hooks.afterLoad) {
                afterLoadHandled = hooks.afterLoad(helperNode, mqttBroker, mqttIn, mqttOut)
            }
            if (!afterLoadHandled) {
                helperNode.on("input", function (msg) {
                    try {
                        compareMsgToExpected(msg, expectMsg);
                        if (hooks.done) { hooks.done(); }
                    } catch (err) {
                        if (hooks.done) { hooks.done(err); }
                        else { throw err; }
                    }
                });
            }
            waitBrokerConnect(mqttBroker, function () {
                //finally, connected!
                if (hooks.afterConnect) {
                    let handled = hooks.afterConnect(helperNode, mqttBroker, mqttIn, mqttOut);
                    if (handled) { return }
                }
                if (mqttIn.isDynamic) {
                    mqttIn.receive({ "action": "subscribe", "topic": sendMsg.topic })
                }
                mqttOut.receive(sendMsg);
            })
        } catch (err) {
            if (hooks.done) { hooks.done(err); }
            else { throw err; }
        }
    });
}

/** 
 * Builds a flow containing 2 parts.  
 * * 1: MQTT Out node (with broker configured).  
 * * 2: MQTT In node (with broker configured) --> helper node `id:helper.node` 
*/
function buildBasicMQTTSendRecvFlow(brokerOptions, inOptions, outOptions) {
    brokerOptions = brokerOptions || {};
    brokerOptions.broker = brokerOptions.broker || BROKER_HOST;
    brokerOptions.port = brokerOptions.port || BROKER_PORT;
    brokerOptions.autoConnect = String(brokerOptions.autoConnect) == "false" ? false : true;
    const broker = buildMQTTBrokerNode(brokerOptions.id, brokerOptions.name, brokerOptions.broker, brokerOptions.port, brokerOptions);
    const inNode = buildMQTTInNode(inOptions.id, inOptions.name, inOptions.broker || broker.id, inOptions.topic, inOptions, ["helper.node"]);
    const outNode = buildMQTTOutNode(outOptions.id, outOptions.name, outOptions.broker || broker.id, outOptions.topic, outOptions);
    const helper = buildNode("helper", "helper.node", "helper_node", {});
    return {
        nodes: {
            [broker.name]: broker,
            [inNode.name]: inNode,
            [outNode.name]: outNode,
            [helper.name]: helper,
        },
        flow: [broker, inNode, outNode, helper]
    }
}

function buildMQTTBrokerNode(id, name, brokerHost, brokerPort, options) {
    // url,broker,port,clientid,autoConnect,usetls,usews,verifyservercert,compatmode,protocolVersion,keepalive,
    //cleansession,sessionExpiry,topicAliasMaximum,maximumPacketSize,receiveMaximum,userProperties,userPropertiesType,autoUnsubscribe
    options = options || {};
    const node = buildNode("mqtt-broker", id || "mqtt.broker", name || "mqtt_broker", options);
    node.url = options.url;
    node.broker = brokerHost || options.broker || BROKER_HOST;
    node.port = brokerPort || options.port || BROKER_PORT;
    node.clientid = options.clientid || "";
    node.cleansession = String(options.cleansession) == "false" ? false : true;
    node.autoUnsubscribe = String(options.autoUnsubscribe) == "false" ? false : true;
    node.autoConnect = String(options.autoConnect) == "false" ? false : true;

    if (options.birthTopic) {
        node.birthTopic = options.birthTopic;
        node.birthQos = options.birthQos || "0";
        node.birthPayload = options.birthPayload || "";
    }
    if (options.closeTopic) {
        node.closeTopic = options.closeTopic;
        node.closeQos = options.closeQos || "0";
        node.closePayload = options.closePayload || "";
    }
    if (options.willTopic) {
        node.willTopic = options.willTopic;
        node.willQos = options.willQos || "0";
        node.willPayload = options.willPayload || "";
    }
    updateNodeOptions(options, node);
    return node;
}

function buildMQTTInNode(id, name, brokerId, topic, options, wires) {
    //{ "id": "mqtt.in", "type": "mqtt in", "name": "mqtt_in", "topic": "test/in", "qos": "2", "datatype": "auto", "broker": "mqtt.broker", "nl": false, "rap": true, "rh": 0, "inputs": 0, "wires": [["mqtt.out"]] }
    options = options || {};
    options.broker = options.broker || "mqtt.broker";
    const node = buildNode("mqtt in", id || "mqtt.in", name || "mqtt_in", options);
    node.topic = topic || "";
    node.broker = brokerId;
    node.topicType = options.topicType == "dynamic" ? "dynamic" : "static",
        node.inputs = options.topicType == "dynamic" ? 1 : 0,
        updateNodeOptions(node, options, wires);
    return node;
}

function buildMQTTOutNode(id, name, brokerId, topic, options) {
    //{ "id": "mqtt.out", "type": "mqtt out", "name": "mqtt_out", "topic": "test/out", "qos": "", "retain": "", "respTopic": "", "contentType": "", "userProps": "", "correl": "", "expiry": "", "broker": brokerId, "wires": [] },
    options = options || {};
    options.broker = options.broker || "mqtt.broker";
    const node = buildNode("mqtt out", id || "mqtt.out", name || "mqtt_out", options);
    node.topic = topic || "";
    node.broker = brokerId;
    updateNodeOptions(node, options, null);
    return node;
}

function buildNode(type, id, name, options, wires) {
    //{ "id": "mqtt.in", "type": "mqtt in", "name": "mqtt_in", "topic": "test/in", "qos": "2", "datatype": "auto", "broker": "mqtt.broker", "nl": false, "rap": true, "rh": 0, "inputs": 0, "wires": [["mqtt.out"]] }
    options = options || {};
    const node = {
        "id": id || (type.replace(/[\W]/g, ".")),
        "type": type,
        "name": name || (type.replace(/[\W]/g, "_")),
        "wires": []
    }
    if (node.id.indexOf(".") == -1) { node.is += ".node" }
    updateNodeOptions(node, options, wires);
    return node;
}

function updateNodeOptions(node, options, wires) {
    let keys = Object.keys(options);
    for (let index = 0; index < keys.length; index++) {
        const key = keys[index];
        const val = options[key];
        if (node[key] === undefined) {
            node[key] = val;
        }
    }
    if (wires && Array.isArray(wires)) {
        node.wires[0] = [...wires];
    }
}

function compareMsgToExpected(msg, expectMsg) {
    msg.should.have.property("topic", expectMsg.topic);
    msg.should.have.property("payload", expectMsg.payload);
    if (hasProperty(expectMsg, "retain")) { msg.retain.should.eql(expectMsg.retain); }
    if (hasProperty(expectMsg, "qos")) {
        msg.qos.should.eql(expectMsg.qos);
    } else {
        msg.qos.should.eql(0);
    }
    if (hasProperty(expectMsg, "userProperties")) { msg.should.have.property("userProperties", expectMsg.userProperties); }
    if (hasProperty(expectMsg, "contentType")) { msg.should.have.property("contentType", expectMsg.contentType); }
    if (hasProperty(expectMsg, "correlationData")) { msg.should.have.property("correlationData", expectMsg.correlationData); }
    if (hasProperty(expectMsg, "responseTopic")) { msg.should.have.property("responseTopic", expectMsg.responseTopic); }
    if (hasProperty(expectMsg, "payloadFormatIndicator")) { msg.should.have.property("payloadFormatIndicator", expectMsg.payloadFormatIndicator); }
    if (hasProperty(expectMsg, "messageExpiryInterval")) { msg.should.have.property("messageExpiryInterval", expectMsg.messageExpiryInterval); }
}

function waitBrokerConnect(broker, callback, timeLimit) {
    timeLimit = timeLimit || 2000;
    const brokers = Array.isArray(broker) ? broker : [broker];
    wait();
    function wait() {
        if (brokers.every(e => e.connected == true)) {
            callback(); //yey - connected!
        } else {
            timeLimit = timeLimit - 15;
            if (timeLimit <= 0) {
                throw new Error("Timeout waiting broker connect")
            }
            setTimeout(wait, 15);
            return;
        }
    }
}

function hasProperty(obj, propName) {
    return Object.prototype.hasOwnProperty.call(obj, propName);
}

const base_topic = "nr" + Date.now().toString() + "/";
let topicNo = 0;
function nextTopic(topic) {
    topicNo++;
    if (!topic) { topic = "unittest" }
    if (topic.startsWith("/")) { topic = topic.substring(1); }
    if (topic.startsWith(base_topic)) { return topic + String(topicNo) }
    return (base_topic + topic + String(topicNo));
}

//#endregion HELPERS 