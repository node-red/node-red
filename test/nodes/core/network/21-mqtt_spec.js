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

const should = require("should");
const helper = require("node-red-node-test-helper");
const mqttNodes = require("nr-test-utils").require("@node-red/nodes/core/network/10-mqtt.js");
const server = process.env.MQTT_BROKER_SERVER || "localhost";
const port = process.env.MQTT_BROKER_PORT || 1883;
const skipTests = process.env.MQTT_SKIP_TESTS == "true";

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
        } catch (error) {
        }
    });

    it('should be loaded and have default values', function (done) {
        this.timeout = 1000;
        const brokerName = "mqtt_broker", brokerId = "mqtt.broker", brokerOptions = { autoConnect: false };
        const inName = "mqtt_in", inId = "mqtt.in";
        const outName = "mqtt_out", outId = "mqtt.out";
        const flow = [
            buildMQTTInNode(inId, inName, brokerId, "test/in", {}, [outId]),
            buildMQTTOutNode(outId, outName, brokerId, "test/out", {}),
            buildMQTTBrokerNode(brokerId, brokerName, server, port, brokerOptions),
        ];
        helper.load(mqttNodes, flow, function () {
            try {
                const mqttIn = helper.getNode(inId);
                const mqttOut = helper.getNode(outId);
                const mqttBroker = helper.getNode(brokerId);

                should(mqttIn).be.type("object", "mqtt in node should be an object")
                mqttIn.should.have.property('broker', brokerId);
                mqttIn.should.have.property('datatype', 'utf8'); //default: 'utf8'
                mqttIn.should.have.property('isDynamic', false);  //default: false
                mqttIn.should.have.property('inputs', 0); //default: 0 
                mqttIn.should.have.property('qos', 2); //default: 2
                mqttIn.should.have.property('wires', [[outId]]);

                should(mqttOut).be.type("object", "mqtt out node should be an object")
                mqttOut.should.have.property('broker', brokerId);

                should(mqttBroker).be.type("object", "mqtt broker node should be an object")
                mqttBroker.should.have.property('broker', server);
                mqttBroker.should.have.property('port', port);
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
    itConditional('should send and receive string (auto)', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 1000;
        const msg = {
            topic: nextTopic(),
            payload: "hello",
            qos: 0
        }
        const expectMsg = Object.assign({}, msg);
        testSendRecv({}, { datatype: "auto", topicType: "static" }, {}, msg, expectMsg, done);
    });
    itConditional('should send JSON and receive string (auto)', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 1000;
        const msg = {
            topic: nextTopic(),
            payload: '{"prop":"value1", "num":1}',
            qos: 1
        }
        const expectMsg = Object.assign({}, msg);
        testSendRecv({}, { datatype: "auto", topicType: "static" }, {}, msg, expectMsg, done);
    });
    itConditional('should send JSON and receive string (utf8)', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 1000;
        const msg = {
            topic: nextTopic(),
            payload: '{"prop":"value2", "num":2}',
            qos: 2
        }
        const expectMsg = Object.assign({}, msg);
        testSendRecv({}, { datatype: "utf8", topicType: "static" }, {}, msg, expectMsg, done);
    });
    itConditional('should send JSON and receive Object (json)', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 1000;
        const msg = {
            topic: nextTopic(),
            payload: '{"prop":"value3", "num":3}'// send a string ...
        }
        const expectMsg = Object.assign({}, msg, {payload: {"prop":"value3", "num":3}});//expect an object
        testSendRecv({}, { datatype: "json", topicType: "static" }, {}, msg, expectMsg, done);
    });
    itConditional('should send String and receive Buffer (buffer)', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 1000;
        const msg = {
            topic: nextTopic(),
            payload: "a b c" //send string ...
        }
        const expectMsg = Object.assign({}, msg, {payload: Buffer.from(msg.payload)});//expect Buffer.from(msg.payload)
        testSendRecv({}, { datatype: "buffer", topicType: "static"}, {}, msg, expectMsg, done);
    });
    itConditional('should send utf8 Buffer and receive String (auto)', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 1000;
        const msg = {
            topic: nextTopic(),
            payload: Buffer.from([0x78, 0x20, 0x79, 0x20, 0x7a]) // "x y z"
        }
        const expectMsg = Object.assign({}, msg, {payload: "x y z"});//set expected payload to "x y z"
        testSendRecv({}, { datatype: "auto", topicType: "static"}, {}, msg, expectMsg, done);
    });
    itConditional('should send non utf8 Buffer and receive Buffer (auto)', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 1000;
        const msg = {
            topic: nextTopic(),
            payload: Buffer.from([0xC0, 0xC1, 0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD, 0xFE, 0xFF]) //non valid UTF8
        }
        const expectMsg = Object.assign({}, msg);
        testSendRecv({}, { datatype: "auto", topicType: "static" }, {}, msg, expectMsg, done);
    });
    itConditional('should send/receive all v5 flags and settings', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 1000;
        const t = nextTopic();
        const msg = {
            topic: t + "/command",
            payload: Buffer.from("v5"),
            qos: 1,
            retain: true,
            responseTopic: t + "/response",
            userProperties: { prop1: "val1" },
            contentType: "application/json",
            correlationData: Buffer.from([1, 2, 3]),
            payloadFormatIndicator: true,
            messageExpiryInterval: 2000,
        }
        const expectMsg = Object.assign({}, msg);
        expectMsg.payload = expectMsg.payload.toString(); //auto mode + payloadFormatIndicator should make a string
        delete expectMsg.payloadFormatIndicator; //Seems mqtt.js only publishes payloadFormatIndicator the will msg
        const inOptions = {
            datatype: "auto", topicType: "static",
            qos: 1,  nl: false, rap: true, rh: 1,
            subscriptionIdentifier: 333
        }
        testSendRecv({ protocolVersion: 5 }, inOptions, {}, msg, expectMsg, done);
    });
    itConditional('should subscribe dynamically via action', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 1000;
        const msg = {
            topic: nextTopic(),
            payload: "abc"
        }
        const expectMsg = Object.assign({}, msg);
        testSendRecv({ protocolVersion: 5 }, { datatype: "utf8", topicType: "dynamic" }, {}, msg, expectMsg, done);
    });
    //#endregion  BASIC TESTS

    //#region ################### ADVANCED TESTS ################### #//
    itConditional('should connect via "connect" action', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 1000;
        const {flow, nodes} = buildBasicMQTTSendRecvFlow("mqtt.broker", "mqtt_broker", { autoConnect: false }, "mqtt.in", "mqtt_in", {}, null, null, null, {});
        flow.push({ "id": "status_node", "type": "status", "name": "status-node", "scope": ["mqtt.in"], "wires": [["helper.node"]] });

        helper.load(mqttNodes, flow, function () {
            const helperNode = helper.getNode("helper.node");
            const mqttIn = helper.getNode("mqtt.in");
            const mqttBroker = helper.getNode("mqtt.broker");
            try {
                mqttBroker.should.have.property("autoConnect", false);
                mqttBroker.should.have.property("connecting", false);//should not attempt to connect (autoConnect:false)
            } catch (error) {
                done(error)
            }
            mqttIn.receive({ "action": "connect" });
            waitConnection();
            function waitConnection() {
                if (!mqttBroker.connected) {
                    setTimeout(waitConnection, 15);
                    return;
                }
                done();//if we got here, it connected!
            }
        });
    });
    itConditional('should disconnect via "disconnect" action', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 1000;
        const {flow, nodes} = buildBasicMQTTSendRecvFlow("mqtt.broker", "mqtt_broker", {}, null, null, null, "mqtt.out", "mqtt_out", {}, {});
        flow.push({ "id": "statusnode", "type": "status", "name": "status-node", "scope": ["mqtt.out"], "wires": [["helper.node"]] });//add status node to watch mqtt_out

        helper.load(mqttNodes, flow, function () {
            const helperNode = helper.getNode("helper.node");
            const mqttOut = helper.getNode("mqtt.out");
            const mqttBroker = helper.getNode("mqtt.broker");
            try {
                mqttBroker.should.have.property("autoConnect", true);
                mqttBroker.should.have.property("connecting", true);//should be trying to connect (autoConnect:true)
            } catch (error) {
                done(error)
            }
            waitConnection();
            function waitConnection() {
                if (!mqttBroker.connected) {
                    setTimeout(waitConnection, 15);
                    return;
                }
                //connected - add the on handler and call to disconnect
                helperNode.on("input", function (msg) {
                    try {
                        msg.status.should.have.property("text");
                        msg.status.text.should.containEql('disconnect');
                        done();
                    } catch (error) {
                        done(error)
                    }
                })
                mqttOut.receive({ "action": "disconnect" });
            }
        });
    });
    itConditional('should publish birth message', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 1000;
        const baseTopic = nextTopic();
        const brokerOptions = {
            protocolVersion: 4,
            birthTopic: baseTopic + "/birth",
            birthPayload: "broker connected",
            birthQos: 2,
        }
        const msg = { topic: baseTopic + "/ignoreme"}
        const expectMsg ={
            topic: brokerOptions.birthTopic,
            payload: brokerOptions.birthPayload,
            qos: brokerOptions.birthQos
        };
        testSendRecv(brokerOptions, { topic: brokerOptions.birthTopic }, {}, msg, expectMsg, done);
    });
    itConditional('should publish close message', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 1000;
        const baseTopic = nextTopic();
        const broker1Options = { id: "mqtt.broker1", name: "mqtt_broker1" }
        const broker2Options = { id: "mqtt.broker2", name: "mqtt_broker2", closeTopic: baseTopic + "/close", closePayload: "broker disconnected", closeQos: 2,}

        const {flow} = buildBasicMQTTSendRecvFlow(
            broker1Options.id, broker1Options.name || "mqtt_broker", broker1Options,
            "mqtt.in", "mqtt_in", {broker: broker1Options.id, topic: broker2Options.closeTopic}, //should receive close msg of broker2
            "mqtt.out", "mqtt_out", {broker: broker2Options.id},
        )
        flow.push(buildMQTTBrokerNode(broker2Options.id, broker2Options.name, server, port, broker2Options))

        helper.load(mqttNodes, flow, function () {
            const helperNode = helper.getNode("helper.node");
            const mqttOut = helper.getNode("mqtt.out");
            const mqttIn = helper.getNode("mqtt.in");
            const mqttBroker1 = helper.getNode("mqtt.broker1");
            const mqttBroker2 = helper.getNode("mqtt.broker2");
            waitConnection();
            function waitConnection() {
                if (!mqttBroker1.connected || !mqttBroker2.connected) {
                    setTimeout(waitConnection, 15);
                    return;
                }
                //connected - add the on handler and call to disconnect
                helperNode.on("input", function (msg) {
                    try {
                        msg.should.have.property("topic", broker2Options.closeTopic);
                        msg.should.have.property('payload', broker2Options.closePayload);
                        msg.should.have.property('qos', broker2Options.closeQos);
                        done();
                    } catch (error) {
                        done(error)
                    }
                })
                mqttOut.receive({ "action": "disconnect" });
            }
        });
    });
    itConditional('should publish will message', function (done) {
        if (skipTests) { return this.skip() }
        this.timeout = 1000;
        const baseTopic = nextTopic();
        //Broker 1 - stays connected to receive the will message when broker 2 is killed
        const broker1Options = { id: "mqtt.broker1", name: "mqtt_broker1" } 
        //Broker 2 - connects to same broker but has a LWT message. Broker 2 gets killed shortly after connection so that the will message is sent from broker
        const broker2Options = { id: "mqtt.broker2", name: "mqtt_broker2", willTopic: baseTopic + "/will", willPayload: '{"msg":"will"}', willQos: 1,}
        const expectMsg ={
            topic: broker2Options.willTopic,
            payload: JSON.parse(broker2Options.willPayload),
            qos: broker2Options.willQos
        };

        const {flow} = buildBasicMQTTSendRecvFlow(
            broker1Options.id, broker1Options.name || "mqtt_broker", broker1Options,
            "mqtt.in", "mqtt_in", {broker: broker1Options.id, topic: broker2Options.willTopic, datatype: "json"}, //should receive will msg of broker2
            "mqtt.out", "mqtt_out", {broker: broker2Options.id},
        )
        //add second broker
        flow.push(buildMQTTBrokerNode(broker2Options.id, broker2Options.name, server, port, broker2Options))

        helper.load(mqttNodes, flow, function () {
            const helperNode = helper.getNode("helper.node");
            const mqttBroker1 = helper.getNode("mqtt.broker1");
            const mqttBroker2 = helper.getNode("mqtt.broker2");
            waitConnection();
            function waitConnection() {
                if (!mqttBroker1.connected || !mqttBroker2.connected) {
                    setTimeout(waitConnection, 15);
                    return;
                }
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
            }
        });
    });
    itConditional('should publish will message with V5 properties', function (done) {
        if (skipTests) { return this.skip() }
        // return this.skip(); //Issue receiving v5 props on will msg. Issue raised here: https://github.com/mqttjs/MQTT.js/issues/1455
        this.timeout = 1000;
        const baseTopic = nextTopic();
        //Broker 1 - stays connected to receive the will message when broker 2 is killed
        const broker1Options = { id: "mqtt.broker1", name: "mqtt_broker1", protocolVersion: 5, datatype: "utf8"}
        //Broker 2 - connects to same broker but has a LWT message. Broker 2 gets killed shortly after connection so that the will message is sent from broker
        const broker2Options = {
            id: "mqtt.broker2", name: "mqtt_broker2", protocolVersion: 5,
            willTopic: baseTopic + "/will",
            willPayload: '{"msg":"will"}',
            willQos: 2,
            willMsg: {
                contentType: 'application/json' ,
                userProps: {"will":"value"},
                respTopic: baseTopic+"/resp",
                correl: Buffer.from("abc"),
                expiry: 2000,
                payloadFormatIndicator: true
            }
        }
        const expectMsg ={
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
        const {flow} = buildBasicMQTTSendRecvFlow(
            broker1Options.id, broker1Options.name || "mqtt_broker", broker1Options,
            "mqtt.in", "mqtt_in", {broker: broker1Options.id, topic: broker2Options.willTopic}, //should receive will msg of broker2
            "mqtt.out", "mqtt_out", {broker: broker2Options.id},
        )
        //add second broker with will msg set
        flow.push(buildMQTTBrokerNode(broker2Options.id, broker2Options.name, server, port, broker2Options))

        helper.load(mqttNodes, flow, function () {
            const helperNode = helper.getNode("helper.node");
            const mqttBroker1 = helper.getNode("mqtt.broker1");
            const mqttBroker2 = helper.getNode("mqtt.broker2");
            waitConnection();
            function waitConnection() {
                if (!mqttBroker1.connected || !mqttBroker2.connected) {
                    setTimeout(waitConnection, 15);
                    return;
                }
                //connected - add the on handler and call to disconnect
                helperNode.on("input", function (msg) {
                    try {
                        compareMsgToExpected(msg, expectMsg);
                        done();
                    } catch (error) {
                        done(error)
                    }
                });
                mqttBroker2.client.end(true); //force closure of broker 2 to cause will msg
            }
        });
    });
    //#endregion  ADVANCED TESTS
});

//#region ################### HELPERS ################### #//

/**
 * A basic unit test that builds a flow containg 1 broker, 1 mqtt-in, one mqtt-out and a helper.  
 *  It performs the following steps: builds flow, loads flow, waits for connection, sends `sendMsg`, 
 *  waits for msg then compares `sendMsg` to `expectMsg`, and finally calls `done`
 * @param {object} brokerOptions anything that can be set in an MQTTBrokerNode (e.g. id, name, url, broker, server, port, protocolVersion, ...)
 * @param {object} inNodeOptions anything that can be set in an MQTTInNode (e.g. id, name, broker, topic, rh, nl, rap, ... )
 * @param {object} outNodeOptions anything that can be set in an MQTTOutNode (e.g. id, name, broker, ...)
 * @param {object} sendMsg the msg to send to broker
 * @param {object} expectMsg the msg to send to broker
 * @param {function} done the test runner `done` callback
 */
function testSendRecv(brokerOptions, inNodeOptions, outNodeOptions, sendMsg, expectMsg, done, customTests) {
    sendMsg = sendMsg || {};
    brokerOptions = brokerOptions || {};
    inNodeOptions = inNodeOptions || {};
    outNodeOptions = outNodeOptions || {};
    brokerOptions.id = brokerOptions.id || "mqtt.broker";
    inNodeOptions.id = inNodeOptions.id || "mqtt.in";
    outNodeOptions.id = outNodeOptions.id || "mqtt.out";
    inNodeOptions.brokerId = inNodeOptions.brokerId || brokerOptions.id;
    outNodeOptions.id = outNodeOptions.id || brokerOptions.id;
    sendMsg.topic = sendMsg.topic || nextTopic();
    
    if(inNodeOptions.topicType != "dynamic" ) {
        inNodeOptions.topic = inNodeOptions.topic || sendMsg.topic;
    }
    outNodeOptions.topic = outNodeOptions.topic ? outNodeOptions.topic : sendMsg.topic;

    const {flow} = buildBasicMQTTSendRecvFlow(
        brokerOptions.id, brokerOptions.name || "mqtt_broker", brokerOptions,
        inNodeOptions.id, inNodeOptions.name, inNodeOptions,
        outNodeOptions.id, outNodeOptions.name, outNodeOptions,
    )
 
    expectMsg = expectMsg || Object.assign({}, sendMsg);
    expectMsg.payload = inNodeOptions.payload === undefined ? expectMsg.payload : inNodeOptions.payload;

    helper.load(mqttNodes, flow, function () {
        try {
            const helperNode = helper.getNode("helper.node");
            const mqttBroker = helper.getNode(brokerOptions.id);
            const mqttIn = helper.getNode(inNodeOptions.id);
            const mqttOut = helper.getNode(outNodeOptions.id);

            helperNode.on("input", function (msg) {
                try {
                    if (customTests) {
                        customTests(msg, helperNode, mqttBroker, mqttIn, mqttOut)
                    } else {
                        compareMsgToExpected(msg, expectMsg);
                    }
                    done();
                } catch (err) {
                    done(err);
                }
            });
            waitConnection();
            function waitConnection() {
                if (!mqttBroker.connected) {
                    setTimeout(waitConnection, 15);
                    return;
                }
                //finally, connected!
                if (mqttIn.isDynamic) {
                    mqttIn.receive({ "action": "subscribe", "topic": sendMsg.topic })
                }
                mqttOut.receive(sendMsg);
            }
        } catch (error) {
            done(error)
        }
    });
}

/**
 * Builds a flow from an array of {type:string, id:string, name:string, options:object, wires:[string]}
 * @param {[{type:string, id:string, name:string, options:object, wires:[string]}]} nodes 
 * @returns {{[flow: [], nodes: {}]}} Returns `{[flow: [], nodes: {}]}`
 */
function buildFlow(nodes) {
    const result = {flow: [], nodes: {}};
    nodes.forEach(node => {
        //const flow = [ { "id": "helper.node", "type": "helper", "wires": [] } ];
        node.options = node.options || {};
        switch (node.type) {
            case "mqtt-broker":
                result.nodes[node.id] = buildMQTTBrokerNode(node.id, node.name, node.options.server, node.options.port, node.options);
                break;
            case "mqtt in":
                result.nodes[node.id] = buildMQTTInNode(node.id, node.name, node.options.brokerId, node.options.topic, node.options);
                break;
            case "mqtt out":
                result.nodes[node.id] = buildMQTTOutNode(node.id, node.name, node.options.brokerId, node.options.topic, node.options);
                break;
            default:
                result.nodes[node.id] = buildNode(node.type, node.id, node.name, node.options);
                break;
        }
        if (node.wires && Array.isArray(node.wires)) {
            result.nodes[node.id].wires[0] = [...node.wires];
        }
        result.flow.push(result.nodes[node.id]);
    })
    return result;
}

/** 
 * Builds a flow containing 2 parts. Part1: MQTT Out node.  Part2: MQTT In node --> helper node
 * If inXxx is excluded, there will be no in node 
 * If outXxx is excluded, there will be no out node 
*/
function buildBasicMQTTSendRecvFlow(brokerId, brokerName, brokerOptions, inId, inName, inOptions, outId, outName, outOptions) {
    var nodes = [];
    brokerOptions = brokerOptions || {};
    outOptions = outOptions || {};
    inOptions = inOptions || {};
    
    brokerOptions.server = brokerOptions.server || server;
    brokerOptions.port = brokerOptions.port || port;
    brokerOptions.autoConnect = String(brokerOptions.autoConnect) == "false" ? false : true;

    outOptions.broker = outOptions.broker || brokerId;
    inOptions.broker = inOptions.broker || brokerId;

    nodes.push({type:"mqtt-broker", id: brokerId, name: brokerName, options: brokerOptions});
    if(inId) { nodes.push({type:"mqtt in", id: inId, name: inName, options: inOptions, wires: ["helper.node"]}); }
    if(outId) { nodes.push({type:"mqtt out", id: outId, name: outName, options: outOptions}); }
    nodes.push({type:"helper", id: "helper.node", name: "helper_node", options: {}});
    return buildFlow(nodes);
}

function buildMQTTBrokerNode(id, name, server, port, options) {
    // url,broker,port,clientid,autoConnect,usetls,usews,verifyservercert,compatmode,protocolVersion,keepalive,
    //cleansession,sessionExpiry,topicAliasMaximum,maximumPacketSize,receiveMaximum,userProperties,userPropertiesType,autoUnsubscribe
    options = options || {};
    const node = buildNode("mqtt-broker", id, name, options);
    node.broker = server; 
    node.port = port; 
    node.url = options.url;
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
    const node = buildNode("mqtt in", id, name, options);
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
    const node = buildNode("mqtt out", id, name, options);
    node.topic = topic || "";
    node.broker = brokerId;
    updateNodeOptions(node, options, null);
    return node;
}

function buildNode(type, id, name, options, wires) {
    //{ "id": "mqtt.in", "type": "mqtt in", "name": "mqtt_in", "topic": "test/in", "qos": "2", "datatype": "auto", "broker": "mqtt.broker", "nl": false, "rap": true, "rh": 0, "inputs": 0, "wires": [["mqtt.out"]] }
    options = options || {};
    const ts = String(Date.now());
    const node = {
        "id": id || (type + "." + ts),
        "type": type,
        "name": name || (type.replace(/[\W]/g,"_") + "_" + ts),
        "wires": []
    }
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