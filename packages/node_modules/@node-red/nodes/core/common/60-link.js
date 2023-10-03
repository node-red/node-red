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

/**
 * @typedef LinkTarget
 * @type {object}
 * @property {string} id - ID of the target node.
 * @property {string} name - Name of target Node
 * @property {number} flowId - ID of flow where the target node exists
 * @property {string} flowName - Name of flow where the target node exists
 * @property {boolean} isSubFlow - True if the link-in node exists in a subflow instance
 */


module.exports = function(RED) {
    "use strict";
    const crypto = require("crypto");
    const targetCache = (function () {
        let registry = { id: {}, name: {} }
        function getIndex (/** @type {[LinkTarget]} */ targets, id) {
            for (let index = 0; index < (targets || []).length; index++) {
                const element = targets[index]
                if (element.id === id) {
                    return index
                }
            }
            return -1
        }
        /**
         * Generate a target object from a node
         * @param {LinkInNode} node
         * @returns {LinkTarget} a link target object
         */
        function generateTarget (node) {
            const isSubFlow = node._flow.TYPE === 'subflow'
            return {
                id: node.id,
                name: node.name || node.id,
                flowId: node._flow.flow.id,
                flowName: isSubFlow ? node._flow.subflowDef.name : node._flow.flow.label,
                isSubFlow: isSubFlow
            }
        }
        return {
            /**
             * Get a list of targets registerd to this name
             * @param {string} name Name of the target
             * @param {boolean} [excludeSubflows] set `true` to exclude
             * @returns {[LinkTarget]} Targets registerd to this name.
             */
            getTargets (name, excludeSubflows) {
                const targets = registry.name[name] || []
                if (excludeSubflows) {
                    return targets.filter(e => e.isSubFlow !== true)
                }
                return targets
            },
            /**
             * Get a single target by registered name.
             * To restrict to a single flow, include the `flowId`
             * If there is no targets OR more than one target, null is returned
             * @param {string} name Name of the node
             * @param {string} [flowId]
             * @returns {LinkTarget} target
             */
            getTarget (name, flowId) {
                /** @type {[LinkTarget]} */
                let possibleTargets = this.getTargets(name)
                /** @type {LinkTarget} */
                let target
                if (possibleTargets.length && flowId) {
                    possibleTargets = possibleTargets.filter(e => e.flowId === flowId)
                }
                if (possibleTargets.length === 1) {
                    target = possibleTargets[0]
                }
                return target
            },
            /**
             * Get a target by node ID
             * @param {string} nodeId ID of the node
             * @returns {LinkTarget} target
             */
            getTargetById (nodeId) {
                return registry.id[nodeId]
            },
            register (/** @type {LinkInNode} */ node) {
                const target = generateTarget(node)
                const tByName = this.getTarget(target.name, target.flowId)
                if (!tByName || tByName.id !== target.id) {
                    registry.name[target.name] = registry.name[target.name] || []
                    registry.name[target.name].push(target)
                }
                registry.id[target.id] = target
                return target
            },
            remove (node) {
                const target = generateTarget(node)
                const targs = this.getTargets(target.name)
                const idx = getIndex(targs, target.id)
                if (idx > -1) {
                    targs.splice(idx, 1)
                }
                if (targs.length === 0) {
                    delete registry.name[target.name]
                }
                delete registry.id[target.id]
            },
            clear () {
                registry = { id: {}, name: {} }
            }
        }
    })()

    function LinkInNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        var event = "node:"+n.id;
        var handler = function(msg) {
            msg._event = n.event;
            node.receive(msg);
        }
        targetCache.register(node);
        RED.events.on(event,handler);
        this.on("input", function(msg, send, done) {
            send(msg);
            done();
        });
        this.on("close",function() {
            targetCache.remove(node);
            RED.events.removeListener(event,handler);
        });
    }

    RED.nodes.registerType("link in",LinkInNode);

    function LinkOutNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        var mode = n.mode || "link";

        var event = "node:"+n.id;
        this.on("input", function(msg, send, done) {
            msg._event = event;
            RED.events.emit(event,msg)

            if (mode === "return") {
                if (Array.isArray(msg._linkSource) && msg._linkSource.length > 0) {
                    var messageEvent = msg._linkSource.pop();
                    var returnNode = RED.nodes.getNode(messageEvent.node);
                    if (returnNode && returnNode.returnLinkMessage) {
                        returnNode.returnLinkMessage(messageEvent.id, msg);
                    } else {
                        node.warn(RED._("link.errors.missingReturn"));
                    }
                } else {
                    node.warn(RED._("link.errors.missingReturn"));
                }
                done();
            } else if (mode === "link") {
                send(msg);
                done();
            }
        });
    }
    RED.nodes.registerType("link out",LinkOutNode);


    function LinkCallNode(n) {
        RED.nodes.createNode(this,n);
        const node = this;
        const staticTarget = typeof n.links === "string" ? n.links : n.links[0];
        const linkType = n.linkType;
        const messageEvents = {};

        let timeout = parseFloat(n.timeout || "30") * 1000;
        if (isNaN(timeout)) {
            timeout = 30000;
        }
        function getTargetNode(msg) {
            const dynamicMode = linkType === "dynamic";
            const target = dynamicMode ? msg.target : staticTarget

            ////1st see if the target is a direct node id
            let foundNode;
            if (targetCache.getTargetById(target)) {
                foundNode = RED.nodes.getNode(target)
            }
            if (target && !foundNode && dynamicMode) {
                //next, look in **this flow only** for the node
                let cachedTarget = targetCache.getTarget(target, node._flow.flow.id);
                if (!cachedTarget) {
                    //single target node not found in registry! 
                    //get all possible targets from regular flows (exclude subflow instances)
                    const possibleTargets = targetCache.getTargets(target, true);
                    if (possibleTargets.length === 1) {
                        //only 1 link-in found with this name - good, lets use it
                        cachedTarget = possibleTargets[0];
                    } else if (possibleTargets.length > 1) {
                        //more than 1 link-in has this name, raise an error
                        throw new Error(`Multiple link-in nodes named '${target}' found`);
                    }
                }
                if (cachedTarget) {
                    foundNode = RED.nodes.getNode(cachedTarget.id);
                }
            }
            if (foundNode instanceof LinkInNode) {
                return foundNode;
            }
            throw new Error(`target link-in node '${target || ""}' not found`);
        }
        this.on("input", function (msg, send, done) {
            try {
                const targetNode = getTargetNode(msg);
                if (targetNode instanceof LinkInNode) {
                    msg._linkSource = msg._linkSource || [];
                    const messageEvent = {
                        id: crypto.randomBytes(14).toString('hex'),
                        node: node.id,
                    }
                    messageEvents[messageEvent.id] = {
                        msg: RED.util.cloneMessage(msg),
                        send,
                        done,
                        ts: setTimeout(function () {
                            timeoutMessage(messageEvent.id)
                        }, timeout)
                    };
                    msg._linkSource.push(messageEvent);
                    targetNode.receive(msg);
                }
            } catch (error) {
                node.error(error, msg);
            }
        });

        this.on("close", function () {
            for (const event of Object.values(messageEvents)) {
                if (event.ts) {
                    clearTimeout(event.ts)
                }
            }
        })

        this.returnLinkMessage = function(eventId, msg) {
            if (Array.isArray(msg._linkSource) && msg._linkSource.length === 0) {
                delete msg._linkSource;
            }
            const messageEvent = messageEvents[eventId];
            if (messageEvent) {
                clearTimeout(messageEvent.ts);
                delete messageEvents[eventId];
                messageEvent.send(msg);
                messageEvent.done();
            } else {
                node.send(msg);
            }
        }

        function timeoutMessage(eventId) {
            const messageEvent = messageEvents[eventId];
            if (messageEvent) {
                delete messageEvents[eventId];
                node.error("timeout",messageEvent.msg);
            }
        }

    }
    RED.nodes.registerType("link call",LinkCallNode);


}
