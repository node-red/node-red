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
var util = require("util");
var mqtt = require("mqtt");
var events = require("events");

util.log("[warn] nodes/core/io/lib/mqtt.js is deprecated and will be removed in a future release of Node-RED. Please report this usage to the Node-RED mailing list.");

//var inspect = require("util").inspect;

//var Client = module.exports.Client = function(

var port = 1883;
var host = "localhost";

function MQTTClient(port,host) {
   this.port = port||1883;
   this.host = host||"localhost";
   this.messageId = 1;
   this.pendingSubscriptions = {};
   this.inboundMessages = {};
   this.lastOutbound = (new Date()).getTime();
   this.lastInbound = (new Date()).getTime();
   this.connected = false;

   this._nextMessageId = function() {
      this.messageId += 1;
      if (this.messageId > 0xFFFF) {
         this.messageId = 1;
      }
      return this.messageId;
   }
   events.EventEmitter.call(this);
}
util.inherits(MQTTClient, events.EventEmitter);

MQTTClient.prototype.connect = function(options) {
   if (!this.connected) {
       var self = this;
       options = options||{};
       self.options = options;
       self.options.keepalive = options.keepalive||15;
       self.options.clean = self.options.clean||true;
       self.options.protocolId = 'MQIsdp';
       self.options.protocolVersion = 3;

       self.client = mqtt.createConnection(this.port,this.host,function(err,client) {
             if (err) {
                self.connected = false;
                clearInterval(self.watchdog);
                self.connectionError = true;
                //util.log('[mqtt] ['+self.uid+'] connection error 1 : '+inspect(err));
                self.emit('connectionlost',err);
                return;
             }
             client.on('close',function(e) {
                   //util.log('[mqtt] ['+self.uid+'] on close');
                   clearInterval(self.watchdog);
                   if (!self.connectionError) {
                       if (self.connected) {
                          self.connected = false;
                          self.emit('connectionlost',e);
                       } else {
                          self.emit('disconnect');
                       }
                   }
             });
             client.on('error',function(e) {
                   //util.log('[mqtt] ['+self.uid+'] on error : '+inspect(e));
                   clearInterval(self.watchdog);
                   if (self.connected) {
                      self.connected = false;
                      self.emit('connectionlost',e);
                   }
             });
             client.on('connack',function(packet) {
                   if (packet.returnCode === 0) {
                      self.watchdog = setInterval(function(self) {
                            var now = (new Date()).getTime();

                            //util.log('[mqtt] ['+self.uid+'] watchdog '+inspect({connected:self.connected,connectionError:self.connectionError,pingOutstanding:self.pingOutstanding,now:now,lastOutbound:self.lastOutbound,lastInbound:self.lastInbound}));

                            if (now - self.lastOutbound > self.options.keepalive*500 || now - self.lastInbound > self.options.keepalive*500) {
                               if (self.pingOutstanding) {
                                  //util.log('[mqtt] ['+self.uid+'] watchdog pingOustanding - disconnect');
                                  try {
                                     self.client.disconnect();
                                  } catch (err) {
                                  }
                               } else {
                                  //util.log('[mqtt] ['+self.uid+'] watchdog pinging');
                                  self.lastOutbound = (new Date()).getTime();
                                  self.lastInbound = (new Date()).getTime();
                                  self.pingOutstanding = true;
                                  self.client.pingreq();
                               }
                            }

                      },self.options.keepalive*500,self);
                      self.pingOutstanding = false;
                      self.lastInbound = (new Date()).getTime()
                      self.lastOutbound = (new Date()).getTime()
                      self.connected = true;
                      self.connectionError = false;
                      self.emit('connect');
                   } else {
                      self.connected = false;
                      self.emit('connectionlost');
                   }
             });
             client.on('suback',function(packet) {
                   self.lastInbound = (new Date()).getTime()
                   var topic = self.pendingSubscriptions[packet.messageId];
                   self.emit('subscribe',topic,packet.granted[0]);
                   delete self.pendingSubscriptions[packet.messageId];
             });
             client.on('unsuback',function(packet) {
                   self.lastInbound = (new Date()).getTime()
                   var topic = self.pendingSubscriptions[packet.messageId];
                   self.emit('unsubscribe',topic);
                   delete self.pendingSubscriptions[packet.messageId];
             });
             client.on('publish',function(packet) {
                   self.lastInbound = (new Date()).getTime();
                   if (packet.qos < 2) {
                      var p = packet;
                      self.emit('message',p.topic,p.payload,p.qos,p.retain);
                   } else {
                      self.inboundMessages[packet.messageId] = packet;
                      this.lastOutbound = (new Date()).getTime()
                      self.client.pubrec(packet);
                   }
                   if (packet.qos == 1) {
                      this.lastOutbound = (new Date()).getTime()
                      self.client.puback(packet);
                   }
             });

             client.on('pubrel',function(packet) {
                   self.lastInbound = (new Date()).getTime()
                   var p = self.inboundMessages[packet.messageId];
                   if (p) {
                       self.emit('message',p.topic,p.payload,p.qos,p.retain);
                       delete self.inboundMessages[packet.messageId];
                   }
                   self.lastOutbound = (new Date()).getTime()
                   self.client.pubcomp(packet);
             });

             client.on('puback',function(packet) {
                   self.lastInbound = (new Date()).getTime()
                   // outbound qos-1 complete
             });

             client.on('pubrec',function(packet) {
                   self.lastInbound = (new Date()).getTime()
                   self.lastOutbound = (new Date()).getTime()
                   self.client.pubrel(packet);
             });
             client.on('pubcomp',function(packet) {
                   self.lastInbound = (new Date()).getTime()
                   // outbound qos-2 complete
             });
             client.on('pingresp',function(packet) {
                   //util.log('[mqtt] ['+self.uid+'] received pingresp');
                   self.lastInbound = (new Date()).getTime()
                   self.pingOutstanding = false;
             });

             this.lastOutbound = (new Date()).getTime()
             this.connectionError = false;
             client.connect(self.options);
       });
   }
}

MQTTClient.prototype.subscribe = function(topic,qos) {
   var self = this;
   if (self.connected) {
      var options = {
         subscriptions:[{topic:topic,qos:qos}],
         messageId: self._nextMessageId()
      };
      this.pendingSubscriptions[options.messageId] = topic;
      this.lastOutbound = (new Date()).getTime();
      self.client.subscribe(options);
      self.client.setPacketEncoding('binary');
   }
}
MQTTClient.prototype.unsubscribe = function(topic) {
   var self = this;
   if (self.connected) {
      var options = {
         unsubscriptions:[topic],
         messageId: self._nextMessageId()
      };
      this.pendingSubscriptions[options.messageId] = topic;
      this.lastOutbound = (new Date()).getTime()
      self.client.unsubscribe(options);
   }
}

MQTTClient.prototype.publish = function(topic,payload,qos,retain) {
   var self = this;
   if (self.connected) {

      if (!Buffer.isBuffer(payload)) {
         if (typeof payload === "object") {
            payload = JSON.stringify(payload);
         } else if (typeof payload !== "string") {
            payload = ""+payload;
         }
      }
      var options = {
         topic: topic,
         payload: payload,
         qos: qos||0,
         retain:retain||false
      };
      if (options.qos !== 0) {
         options.messageId = self._nextMessageId();
      }
      this.lastOutbound = (new Date()).getTime()
      self.client.publish(options);
   }
}

MQTTClient.prototype.disconnect = function() {
   var self = this;
   if (this.connected) {
       this.connected = false;
       try {
           this.client.disconnect();
       } catch(err) {
       }
   }
}
MQTTClient.prototype.isConnected = function() {
    return this.connected;
}
module.exports.createClient = function(port,host) {
   var mqtt_client = new MQTTClient(port,host);
   return mqtt_client;
}
