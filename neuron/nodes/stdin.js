const { HederaAccountService } = require('./neuron-registration/dist/core/hedera/AccountService.js');
// Load environment variables with configurable path
const fs = require('fs');
const path = require('path');
const envPath = process.env.NEURON_ENV_PATH || path.resolve(__dirname, '../../.env');
require('dotenv').config({
    path: envPath
});


module.exports = function (RED) {
    function StdinNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        let hederaService = null;

        // Initialize Hedera service
        try {
            hederaService = new HederaAccountService({
                network: process.env.HEDERA_NETWORK || 'testnet',
                operatorId: process.env.HEDERA_OPERATOR_ID,
                operatorKey: process.env.HEDERA_OPERATOR_KEY,
                contracts: {
                    "adsb": process.env.CONTRACT_ID,
                    "mcp": process.env.MCP_CONTRACT_ID,
                    "weather": process.env.WEATHER_CONTRACT_ID,
                    "radiation": process.env.RADIATION_CONTRACT_ID
                }
            });

            let targetNode = null;
            RED.nodes.eachNode(function(n) {
                if (n.id === config.selectedNode) {
                    targetNode = n;
                }
            });
            //console.log(targetNode);
            const nodeName = targetNode ? targetNode.name || config.selectedNode : config.selectedNode;
            node.status({ fill: "green", shape: "dot", text: "initialized for " + nodeName });
        } catch (err) {
            node.error("Service initialization failed: " + err.message);
            node.status({ fill: "red", shape: "ring", text: "init failed" });
            return;
        }

        node.on('input', async function (msg) {
            if (!hederaService) {
                node.error("Hedera service not initialized");
                return;
            }

            if (!config.selectedNode) {
                node.error("No node selected");
                node.status({ fill: "red", shape: "ring", text: "no node selected" });
                return;
            }

            try {
                node.status({ fill: "blue", shape: "dot", text: "sending..." });

                // Get device info from persisted file
                const deviceInfoPath = path.join(__dirname, 'devices', config.selectedNode + '.json');
                let deviceInfo;

                try {
                    const deviceInfoData = fs.readFileSync(deviceInfoPath, 'utf8');
                    deviceInfo = JSON.parse(deviceInfoData);
                } catch (err) {
                    node.error("Failed to read device info: " + err.message);
                    return;
                }

                if (!deviceInfo || !deviceInfo.topics || !deviceInfo.topics.length) {
                    node.error("Invalid device info or no topics found");
                    return;
                }

            
                const messages = await hederaService.getTopicMessages(
                    deviceInfo.topics[0],
                    1,
                    config.numMessages
                );

               // console.log(messages);

                node.status({ fill: "green", shape: "dot", text: new Date().toLocaleTimeString() + " received " + messages.length + " messages from topic " + deviceInfo.topics[0] });
                node.send({ payload: messages });
            } catch (err) {
                node.error("Failed to send message to topic: " + err.message);
                node.status({ fill: "red", shape: "ring", text: "error" });
            }
        });

        node.on('close', function () {
            // Cleanup if needed
        });
    }

    RED.nodes.registerType("stdin", StdinNode);
}; 