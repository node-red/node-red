describe('MQTT Node', function() {

    let should = require("should");
    let mqttNode = require("nr-test-utils").require("@node-red/nodes/core/io/10-mqtt.js");
    let helper = require("node-red-node-test-helper");

    this.timeout(10000);

    function mockBroker({
        id,
        type,
        z,
        name,
        broker,
        port,
        clientid,
        usetls,
        protocolversion,
        keepalive,
        cleansession,
        birthTopic,
        birthQos,
        birthPayload,
        closeTopic,
        closeQos,
        closePayload,
        willTopic,
        willQos,
        willPayload
    }) {
        return {
            "id": id || "broker",
            "type": "mqtt-broker",
            "z": z || "",
            "name": name || "local",
            "broker": broker || "127.0.0.1",
            "port": port || "11883",
            "clientid": clientid || "",
            "usetls": usetls || false,
            "protocolversion": protocolversion == null ? null : protocolversion || "5",
            "keepalive": keepalive || "60",
            "cleansession": cleansession || true,
            "birthTopic": birthTopic || "",
            "birthQos": birthQos || "0",
            "birthPayload": birthPayload || "",
            "closeTopic": closeTopic || "",
            "closeQos": closeQos || "0",
            "closePayload": closePayload || "",
            "willTopic": willTopic || "",
            "willQos": willQos || "0",
            "willPayload": willPayload || ""
        }
    }

    it('loads up with the correct default mqtt version', async () => {

        let flow = [{
            id: "broker",
            type: "mqtt-broker",
            broker: "127.0.0.1"
        }];
        let mqttBroker = await loadNode(flow, "broker");
        mqttBroker.should.have.property("protocolversion", 3);
        helper.unload();
    });

    it('loads up with the correct mqtt version - specified', async () => {

        let flow = [{
            id: "broker",
            type: "mqtt-broker",
            broker: "127.0.0.1",
            protocolversion: 5
        }];
        let mqttBroker = await loadNode(flow, "broker");
        mqttBroker.should.have.property("protocolversion", 5);
        helper.unload();
    });

    it('gets the correct parameters from the broker - protocol version 3', async () => {

        let id = "broker";
        let protocolversion = 3;
        let broker = mockBroker({
            protocolversion
        });

        let flow = [
            broker,
            {
                id: "n1",
                type: "mqtt in",
                broker: "broker"
            }
        ];

        let mqttNode = await loadNode(flow, "n1");
        mqttNode.brokerConn.options.should.have.property("protocolVersion", 3);
        helper.unload();
    });

    it('gets the correct parameters from the broker - protocol version 5', async () => {

        let id = "broker";
        let protocolversion = 5;
        let broker = mockBroker({
            protocolversion
        });

        let flow = [
            broker,
            {
                id: "n1",
                type: "mqtt in",
                broker: "broker"
            }
        ];

        let mqttNode = await loadNode(flow, "n1");
        mqttNode.brokerConn.options.should.have.property("protocolVersion", 5);
        helper.unload();
    });

    it('tests the broker node is able to connect to an mqtt broker', async () => {

        let flow = [{
            id: "broker",
            type: "mqtt-broker",
            broker: "127.0.0.1",
            protocolversion: 3
        }];
        let mqttServer = await startMQTTServer();
        let mqttBroker = await loadNode(flow, "broker");
        mqttBroker.connected.should.equal(false);
        await connectMqttNode(mqttBroker);
        mqttBroker.client.end();
        helper.unload();
        await stopMQTTServer(mqttServer);
    });

    it('tests the broker node is able to subscribe and publish', async () => {

        let flow = [{
            id: "broker",
            type: "mqtt-broker",
            broker: "127.0.0.1",
            protocolversion: 3
        }];

        let publishMessage = {
            topic: 'test/topic',
            qos: 2,
            payload: {
                test: "payload"
            }
        };

        let mqttServer = await startMQTTServer();
        let publishMessageCloned = JSON.parse(JSON.stringify(publishMessage));
        let mqttBroker = await loadNode(flow, "broker");
        await connectMqttNode(mqttBroker);
        publishMessageCloned.should.eql(publishMessage);
        let result = await subscribeAndPublishMqttBrokerNode(mqttBroker, publishMessage);
        publishMessageCloned.should.eql(publishMessage); //ensure that the subscribe and publish has not modified our publish message
        result.topic.should.eql(publishMessage.topic);
        result.payload.should.eql(publishMessage.payload);
        mqttBroker.client.end();
        helper.unload();
        await stopMQTTServer(mqttServer);
    });

    it.skip('tests the broker node is able to connect, but fail to subscribe', async () => {

        let flow = [{
            id: "broker",
            type: "mqtt-broker",
            broker: "127.0.0.1",
            protocolversion: 3
        }];

        let publishMessage = {
            topic: 'test/topic',
            qos: 2,
            payload: {
                test: "payload"
            }
        };

        let mqttServer = await startMQTTServer();
        let mqttBroker = await loadNode(flow, "broker");
        await connectMqttNode(mqttBroker);
        await stopMQTTServer(mqttServer);//stop the MQTT server

        try{
            let result = await subscribeMqttBrokerNode(mqttBroker, publishMessage);
            //this should not work if we are "connected" to a dead MQTT broker
            throw new Error('unexpected success');
        }catch(e){
            e.message.should.not.equal('unexpected success');
        }

        mqttBroker.client.end();
        helper.unload();
    });

    it.skip('tests the broker node is able to connect, but fail to publish', async () => {

        let flow = [{
            id: "broker",
            type: "mqtt-broker",
            broker: "127.0.0.1",
            protocolversion: 3
        }];

        let publishMessage = {
            topic: 'test/topic',
            qos: 2,
            payload: {
                test: "payload"
            }
        };

        let mqttServer = await startMQTTServer();
        let mqttBroker = await loadNode(flow, "broker");
        await connectMqttNode(mqttBroker);
        await stopMQTTServer(mqttServer);//stop the MQTT server

        try{
            let result = await publishMqttBrokerNode(mqttBroker, publishMessage);
            //this should not work if we are "connected" to a dead MQTT broker
            throw new Error('unexpected success');
        }catch(e){
            e.message.should.not.equal('unexpected success');
        }

        mqttBroker.client.end();
        helper.unload();
    });

    //helper functions

    async function startMQTTServer(){
        return new Promise((resolve, reject)=>{
            let mosca = require('mosca');
            let moscaSettings = {
                port: 1883,
                persistence: {
                    // Needs for retaining messages.
                    factory: mosca.persistence.Memory
                }
            };
            let mqttServer = new mosca.Server(moscaSettings, function(e){
                if (e) {return reject(e);}
                resolve(mqttServer);
            });
        });
    }

    async function stopMQTTServer(mqttServer){
        return new Promise((resolve, reject)=>{
            mqttServer.close(function(e){
                if (e) {
                    return reject(e);
                }
                resolve();
            });
        });
    }

    async function connectMqttNode(mqttBroker) {
        return new Promise(function(resolve, reject) {
            mqttBroker.connect();
            setTimeout(() => {
                try {
                    mqttBroker.connected.should.equal(true);
                    resolve();
                } catch (e) {
                    reject(e);
                }
            }, 1000);
        });
    }

    async function loadNode(flow, returnNode) {
        return new Promise(function(resolve, reject) {
            helper.load(mqttNode, flow, function(e) {
                if (e) {
                    return reject(e);
                }
                resolve(helper.getNode(returnNode));
            });
        })
    }

    async function subscribeAndPublishMqttBrokerNode(mqttBroker, publishMessage) {
        return new Promise((resolve, reject) => {
            let timedOut = setTimeout(() => {
                reject(new Error('subscribeAndPublishMqttBrokerNode timed out'));
            }, 1500);
            mqttBroker.subscribe(publishMessage.topic, publishMessage.qos, (topic, payloadBuffer) => {
                clearTimeout(timedOut);
                let payload = JSON.parse(payloadBuffer.toString());
                resolve({
                    topic,
                    payload
                });
            });
            mqttBroker.publish(publishMessage);
        });
    }

    async function subscribeMqttBrokerNode(mqttBroker, publishMessage) {
        return new Promise((resolve, reject) => {
            try{
                mqttBroker.subscribe(publishMessage.topic, publishMessage.qos, (topic, payloadBuffer) => {

                });
                resolve();
            }catch(e){
                reject(e);
            }
        });
    }

    async function publishMqttBrokerNode(mqttBroker, publishMessage) {
        return new Promise((resolve, reject) => {
            try{
                mqttBroker.publish(publishMessage);
                resolve();
            }catch(e){
                reject(e);
            }
        });
    }
});
