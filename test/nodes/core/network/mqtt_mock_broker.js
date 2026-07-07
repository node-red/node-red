/**
 * An in-memory, dependency-free stand-in for the `mqtt` module's client, backed by a tiny in-process
 * broker. It implements just enough of the mqtt.js client surface that the MQTT nodes in 10-mqtt.js use
 * (connect/subscribe/unsubscribe/publish/end + events) so the node unit tests can run without a real broker.
 *
 * Wire it up in a test by stubbing `mqtt.connect`:
 *
 *     const mqtt = require("mqtt");
 *     const { FakeMqttServer } = require("./mqtt_mock_broker.js");
 *     const server = new FakeMqttServer();
 *     sinon.stub(mqtt, "connect").callsFake((url, options) => server.connect(url, options));
 *
 * A single server instance is shared by every client created during a test, so multiple broker config
 * nodes pointed at it can exchange messages (needed for birth/close/will tests). Reset per test.
 *
 * Deliberately faithful to the behaviours the nodes rely on:
 *  - `connect` emits asynchronously with a CONNACK (v5 clients get an (empty) `properties` object).
 *  - `publish` routes to every client with a matching subscription (across all clients), passing v5
 *    `options.properties` through as `packet.properties`, and delivers `qos = min(publishQoS, subQoS)`.
 *  - `end(true)` (force / no DISCONNECT) triggers the client's Last-Will publish; `end()` / `end(cb)`
 *    (graceful) does not.
 */

"use strict";

/**
 * MQTT topic-filter matching, including `+` (single level) and `#` (multi level) wildcards.
 * @param {string} filter subscription filter
 * @param {string} topic published topic
 * @returns {boolean}
 */
function matchTopic(filter, topic) {
    if (filter === topic) { return true; }
    const f = filter.split("/");
    const t = topic.split("/");
    for (let i = 0; i < f.length; i++) {
        if (f[i] === "#") { return true; } // matches this level and everything below
        if (f[i] === "+") {
            if (t[i] === undefined) { return false; }
            continue;
        }
        if (f[i] !== t[i]) { return false; }
    }
    return f.length === t.length;
}

const { EventEmitter } = require("events");

class FakeMqttClient extends EventEmitter {
    constructor(server, url, options) {
        super();
        this.setMaxListeners(0);
        this._server = server;
        this.url = url;
        this.options = options || {};
        this.connected = false;
        this._ended = false;
        this._subs = []; // [{ filter, qos }]
        this._will = (this.options.will && this.options.will.topic) ? this.options.will : null;
        // mimic the network round-trip: connect asynchronously
        setImmediate(() => {
            if (this._ended) { return; }
            this.connected = true;
            const connack = { cmd: "connack", returnCode: 0, reasonCode: 0, sessionPresent: false };
            if (this.options.protocolVersion === 5) { connack.properties = {}; }
            this.emit("connect", connack);
        });
    }

    subscribe(topic, options, cb) {
        if (typeof options === "function") { cb = options; options = {}; }
        options = options || {};
        const requested = [];
        if (typeof topic === "string") {
            requested.push({ topic, qos: options.qos });
        } else if (Array.isArray(topic)) {
            topic.forEach((t) => requested.push({ topic: t, qos: options.qos }));
        } else if (topic && typeof topic === "object") {
            Object.keys(topic).forEach((t) => {
                const v = topic[t];
                requested.push({ topic: t, qos: (v && typeof v === "object") ? v.qos : v });
            });
        }
        const granted = requested.map(({ topic: filter, qos }) => {
            const q = (qos === undefined || qos === null) ? 0 : qos;
            if (this._server.isSubscribeDenied(filter)) {
                return { topic: filter, qos: 128 }; // 128 = subscription refused (SUBACK failure)
            }
            this._subs.push({ filter, qos: q });
            return { topic: filter, qos: q };
        });
        if (cb) { setImmediate(() => cb(null, granted)); }
        return this;
    }

    unsubscribe(topic, options, cb) {
        if (typeof options === "function") { cb = options; options = {}; }
        const list = Array.isArray(topic) ? topic : [topic];
        this._subs = this._subs.filter((s) => !list.includes(s.filter));
        if (cb) { setImmediate(() => cb(null)); }
        return this;
    }

    publish(topic, payload, options, cb) {
        if (typeof options === "function") { cb = options; options = {}; }
        options = options || {};
        this._server.publish(this, topic, payload, options);
        if (cb) { setImmediate(() => cb(null)); }
        return this;
    }

    end(force, options, cb) {
        if (typeof force === "function") { cb = force; force = false; }
        else if (typeof options === "function") { cb = options; }
        const graceful = !force; // a forced end sends no DISCONNECT, so the broker fires the will
        if (!this._ended) {
            this._ended = true;
            this.connected = false;
            this._server.removeClient(this, graceful);
        }
        setImmediate(() => {
            this.emit("close");
            if (cb) { cb(); }
        });
        return this;
    }

    // the broker calls reconnect() in some paths; emulate a fresh connect
    reconnect() {
        if (this._ended) { return this; }
        setImmediate(() => {
            this.connected = true;
            const connack = { cmd: "connack", returnCode: 0, reasonCode: 0, sessionPresent: false };
            if (this.options.protocolVersion === 5) { connack.properties = {}; }
            this.emit("connect", connack);
        });
        return this;
    }
}

class FakeMqttServer {
    constructor() {
        this.clients = new Set();
        this._denied = new Set(); // filters whose SUBSCRIBE should be refused (to test SUBACK failures)
        this._publishListeners = []; // observers notified of every publish (for test-driven responders)
    }

    connect(url, options) {
        const client = new FakeMqttClient(this, url, options);
        this.clients.add(client);
        return client;
    }

    /** Configure a topic filter so that subscribing to it is refused (granted QoS 128). */
    denySubscribe(filter, deny = true) {
        if (deny) { this._denied.add(filter); } else { this._denied.delete(filter); }
    }
    isSubscribeDenied(filter) { return this._denied.has(filter); }

    removeClient(client, graceful) {
        if (!this.clients.has(client)) { return; }
        this.clients.delete(client);
        // Last Will and Testament: delivered only when the client drops without a clean DISCONNECT
        if (!graceful && client._will && client._will.topic) {
            const w = client._will;
            this.publish(client, w.topic, w.payload, { qos: w.qos, retain: w.retain, properties: w.properties });
        }
    }

    publish(fromClient, topic, payload, options) {
        options = options || {};
        const buf = Buffer.isBuffer(payload) ? payload : Buffer.from(payload === undefined || payload === null ? "" : String(payload));
        const pubQos = options.qos || 0;
        this.clients.forEach((client) => {
            if (client._ended) { return; }
            let matched = false;
            let bestQos = 0;
            for (const s of client._subs) {
                if (matchTopic(s.filter, topic)) {
                    matched = true;
                    bestQos = Math.max(bestQos, s.qos || 0);
                }
            }
            if (!matched) { return; }
            const packet = {
                cmd: "publish",
                topic,
                payload: buf,
                qos: Math.min(pubQos, bestQos),
                retain: !!options.retain,
                dup: false,
            };
            if (options.properties) { packet.properties = Object.assign({}, options.properties); }
            setImmediate(() => {
                if (client._ended) { return; }
                client.emit("message", topic, buf, packet);
            });
        });
        // Notify publish observers on a later tick (after the publisher's own publish callback has run),
        // so a test-driven responder that injects a reply doesn't race ahead of the request node arming
        // its timeout. Listeners receive (topic, payloadBuffer, options, fromClient).
        if (this._publishListeners.length) {
            const listeners = this._publishListeners.slice();
            setImmediate(() => listeners.forEach((fn) => fn(topic, buf, options, fromClient)));
        }
    }

    /** Observe every publish routed through the broker. Handy for building a test responder. */
    onPublish(fn) { this._publishListeners.push(fn); }

    /** Publish a message into the broker from no particular client (e.g. a simulated external responder). */
    inject(topic, payload, options) { this.publish(null, topic, payload, options || {}); }

    destroy() {
        this.clients.forEach((c) => { c._ended = true; });
        this.clients.clear();
        this._denied.clear();
        this._publishListeners = [];
    }
}

module.exports = { FakeMqttServer, FakeMqttClient, matchTopic };
