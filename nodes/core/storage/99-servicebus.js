/**
 * Copyright 2014 Paolo Patierno
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
 
	// required "Windows Azure Client Library for node"
	var azure = require('azure');
	
	// objects for sending and receiving message to/from queue
	var queueSender;
	var queueReceiver;
	// objects for sending message to topic
	var topicClient;
	// object for receiving message from a subscription
	var subscriptionClient;
	
	/**
	* Node for configuring Service Bus endpoint
	**/
	function ServiceBusEndpointNode(n) {
		// create the node
		RED.nodes.createNode(this, n);
		
		// get endpoint connection string
		this.connString = n.connString;
	}
	
	// register node by name
	RED.nodes.registerType("sb-endpoint", ServiceBusEndpointNode);
	
	/**
	* Node for sending message to a queue on Service Bus
	**/
	function ServiceBusQueueOutNode(n) {
		// create the node
		RED.nodes.createNode(this, n);
		
		// get endpoint configuration
		this.endpoint = n.endpoint;
		this.endpointConfig = RED.nodes.getNode(this.endpoint);
		
		var node = this;
		// node is waiting to send message from flow to a queue
		this.status({fill:"red",shape:"ring",text:"waiting"});
		
		if (this.endpointConfig) {
			// get all other configuration
			this.queueName = n.queueName;
			this.queueCreate = n.queueCreate;
			
			// create sender
			queueSender = azure.createServiceBusService(this.endpointConfig.connString);
			
			// check if queue creation is needed
			if (this.queueCreate) {
				queueSender.createQueueIfNotExists(this.queueName, function(error, queueCreated, response){
					if (!error) {
						// queue created or already exists
						if (queueCreated)
							console.log("Queue created");
						else
							console.log("Queue already exists");
					} else {
						console.log("Queue error");
					}
				});
			}
			
			// on receiving message from the flow
			this.on("input", function(msg) {
			
				// msg.payload could be :
				// - string : azure will put it in the "body" of brokered message
				// - brokered message : JSON object with body, customProperties and brokerProperties
				var message = msg.payload;
				
				// node is sending message from flow to queue
				this.status({fill:"green",shape:"dot",text:"sending"});
				queueSender.sendQueueMessage(this.queueName, message, function(error) {
					if (!error) {
						console.log("Message Sent");
					} else {
						console.log("Error sending message");
					}
					// node is waiting to send message from flow to a queue 
					node.status({fill:"red",shape:"ring",text:"waiting"});
				});
			});
		} else {
			console.log("Service Bus missing Endpoint");
		}
	}
	
	// register node by name
	RED.nodes.registerType("sb queue out", ServiceBusQueueOutNode);
	
	/**
	* Node for receiving message from a queue on Service Bus
	**/
	function ServiceBusQueueInNode(n) {
		// create the node
		RED.nodes.createNode(this, n);
		
		// get endpoint configuration
		this.endpoint = n.endpoint;
		this.endpointConfig = RED.nodes.getNode(this.endpoint);
		
		var node = this;
		// node is waiting to start pump for receiving message from queue
		this.status({fill:"red",shape:"ring",text:"waiting"});
		
		if (this.endpointConfig) {
			// get all other configuration
			this.queueName = n.queueName;
			this.timeout = n.timeout; // for underneath HTTP request in the azure package
			this.isPeekLock = (n.isPeekLock == "true");
			
			// create receiver
			queueReceiver = azure.createServiceBusService(this.endpointConfig.connString);
			
			// node started pump for receiving message from queue
			node.status({fill:"green",shape:"dot",text:"running"});
			// start message pump
			messagePumpOnQueue(node);
		} else {
			console.log("Service Bus missing Endpoint");
		}
	}
	
	/**
	* Message pump for receiving message from a queue
	**/
	function messagePumpOnQueue(node) {
	
		var options = { isPeekLock: node.isPeekLock, timeoutIntervalInS: node.timeout };
		
		queueReceiver.receiveQueueMessage(node.queueName, options, function(error, message){
			if(!error){
				// Process the message
				console.log("Message Received : payload [" + message.body + "]");
				// msg.payload will be the brokered message, JSON object with body, customProperties and brokerProperties
				var msg = { payload: message };
				node.send(msg);
				
				console.log("options.isPeekLock = " + options.isPeekLock);
				// received and locked
				if (options.isPeekLock == true) {
					console.log("deleting message");
					queueReceiver.deleteMessage(message, function(deleteError) {
						if (!deleteError) {
							console.log("Message deleted");
						} else {
							console.log("Error deleting message");
						}
					});
				}
			} else {
				console.log("Message Received error");
			}
			
			// re-start message pump
			messagePumpOnQueue(node);
		});
	}
	
	// register node by name
	RED.nodes.registerType("sb queue in", ServiceBusQueueInNode);
	
	/**
	* Node for sending message to a topic on Service Bus
	**/
	function ServiceBusTopicNode(n) {
		// create the node
		RED.nodes.createNode(this, n);
		
		// get endpoint configuration
		this.endpoint = n.endpoint;
		this.endpointConfig = RED.nodes.getNode(this.endpoint);
		
		var node = this;
		// node is waiting to send message from flow to a topic
		this.status({fill:"red",shape:"ring",text:"waiting"});
		
		if (this.endpointConfig) {
			// get all other configuration
			this.topicName = n.topicName;
			this.topicCreate = n.topicCreate;
			
			// create topic client
			topicClient = azure.createServiceBusService(this.endpointConfig.connString);
			
			// check if topic creation is needed
			if (this.topicCreate) {
				topicClient.createTopicIfNotExists(this.topicName, function(error, topicCreated, response){
					if (!error) {
						// topic created or already exists
						if (topicCreated)
							console.log("Topic created");
						else
							console.log("Topic already exists");
					} else {
						console.log("Topic error");
					}
				});
			}
			
			// on receiving message from the flow
			this.on("input", function(msg) {
			
				// msg.payload could be :
				// - string : azure will put it in the "body" of brokered message
				// - brokered message : JSON object with body, customProperties and brokerProperties
				var message = msg.payload;
				
				// node is sending message from flow to topic
				this.status({fill:"green",shape:"dot",text:"sending"});
				topicClient.sendTopicMessage(this.topicName, message, function(error) {
					if (!error) {
						console.log("Message Sent");
					} else {
						console.log("Error sending message");
					}
					// node is waiting to send message from flow to a topic 
					node.status({fill:"red",shape:"ring",text:"waiting"});
				});
			});
		} else {
			console.log("Service Bus missing Endpoint");
		}
	}
	
	// register node by name
	RED.nodes.registerType("sb topic", ServiceBusTopicNode);
	
	/**
	* Node for receiving message from a subscription on Service Bus
	**/
	function ServiceBusSubscriptionNode(n) {
		// create the node
		RED.nodes.createNode(this, n);
		
		// get endpoint configuration
		this.endpoint = n.endpoint;
		this.endpointConfig = RED.nodes.getNode(this.endpoint);
		
		var node = this;
		// node is waiting to start pump for receiving message from subscription
		this.status({fill:"red",shape:"ring",text:"waiting"});
		
		if (this.endpointConfig) {
			// get all other configuration
			this.topicName = n.topicName;
			this.subscriptionName = n.subscriptionName;
			this.timeout = n.timeout; // for underneath HTTP request in the azure package
			this.isPeekLock = (n.isPeekLock == "true");
			this.filterType = n.filterType;
			this.filterExpression = n.filterExpression;			
			
			// create subscription client
			subscriptionClient = azure.createServiceBusService(this.endpointConfig.connString);
			
			// create subscription
			subscriptionClient.createSubscription(this.topicName, this.subscriptionName, function(error, createsubscriptionresult) {
				if (!error) {
					// no error, subscription created
					console.log("createSubscription !error " + createsubscriptionresult);
				} else {
					// error, subscription may already exist
					console.log("createSubscription error");
					console.log(error);
				}
				
				// create only a "node-rule" for the subscription
				rule.create(node.topicName, node.subscriptionName, "node-rule", node.filterType, node.filterExpression);
				
				// node started pump for receiving message from subscription
				node.status({fill:"green",shape:"dot",text:"running"});
				// start message pump
				messagePumpOnSubscription(node);
			});
		} else {
			console.log("Service Bus missing Endpoint");
		}
	}
	
	/**
	* Message pump for receiving message from a subscription
	**/
	function messagePumpOnSubscription(node) {
	
		var options = { isPeekLock: node.isPeekLock, timeoutIntervalInS: node.timeout };

		subscriptionClient.receiveSubscriptionMessage(node.topicName, node.subscriptionName, options, function(error, message){
			if(!error){
				// Process the message
				console.log("Message Received : payload [" + message.body + "]");
				// msg.payload will be the brokered message, JSON object with body, customProperties and brokerProperties
				var msg = { payload: message };
				node.send(msg);
				
				console.log("options.isPeekLock = " + options.isPeekLock);
				// received and locked
				if (options.isPeekLock == true) {
					console.log("deleting message");
					queueReceiver.deleteMessage(message, function(deleteError) {
						if (!deleteError) {
							console.log("Message deleted");
						} else {
							console.log("Error deleting message");
						}
					});
				}
			} else {
				console.log('Message Received error');
			}
			
			// re-start message pump
			messagePumpOnSubscription(node);
		});
	}
	
	// register node by name
	RED.nodes.registerType("sb subscription", ServiceBusSubscriptionNode);
	
	var rule = {
	
		create: function(topicName, subscriptionName, ruleName, filterType, filterExpression) {
			
			var ruleOptions = {};
			
			switch (filterType) {
				case "sqlExpressionFilter":
					ruleOptions.sqlExpressionFilter = filterExpression;
					break;
				case "correlationIdFilter":
					ruleOptions.correlationIdFilter = filterExpression;
					break;
				case "trueFilter":
					ruleOptions.trueFilter = "1 = 1";
					break;
				case "falseFilter":
					ruleOptions.falseFilter = "1 = 0";
					break;
			}
			
			console.log("create rule on " + topicName + "/" + subscriptionName + " [" + ruleName + "," + filterType + "," + filterExpression + "]");
			console.log(ruleOptions);
			
			// delete default rule
			subscriptionClient.deleteRule(topicName, subscriptionName, azure.Constants.ServiceBusConstants.DEFAULT_RULE_NAME, function(error) {
				if (!error) {
					console.log("deleted rule " + azure.Constants.ServiceBusConstants.DEFAULT_RULE_NAME + " on " + topicName + "/" + subscriptionName);
				} else {
					console.log("Error deleting rule " + azure.Constants.ServiceBusConstants.DEFAULT_RULE_NAME + " on " + topicName + "/" + subscriptionName);
					console.log(error);
				}
			});
			
			// delete rule with name specified if it exists (for updating)
			subscriptionClient.deleteRule(topicName, subscriptionName,  ruleName, function(error) {
				if (!error) {
					console.log("deleted rule " + ruleName + " on " + topicName + "/" + subscriptionName);
				} else {
					console.log("Error deleting rule " + ruleName + " on " + topicName + "/" + subscriptionName);
					console.log(error);
				}
				
				// create rule
				subscriptionClient.createRule(topicName, subscriptionName, ruleName, ruleOptions, function(error, createruleresult) {
					if (!error) {
						console.log("created rule on " + topicName + "/" + subscriptionName + " [" + ruleName + "," + filterType + "," + filterExpression + "]");
					} else {
						console.log("Error creating rule on " + topicName + "/" + subscriptionName + " [" + ruleName + "," + filterType + "," + filterExpression + "]");
						console.log(error);
					}
				});
			});	
		},
		
		handleError: function(error) {
			if (error) {
				console.log(error);
			}
		}
	}
 }
