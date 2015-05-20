/**
 * Copyright 2013 IBM Corp.
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
    "use strict";
    var ntwitter = require('twitter-ng');
    var OAuth= require('oauth').OAuth;
    var request = require('request');

    function TwitterNode(n) {
        RED.nodes.createNode(this,n);
        this.screen_name = n.screen_name;
    }
    RED.nodes.registerType("twitter-credentials",TwitterNode,{
        credentials: {
            screen_name: {type:"text"},
            access_token: {type: "password"},
            access_token_secret: {type:"password"}
        }
    });


    /**
     * Populate msg.location based on data found in msg.tweet.
     */
    function addLocationToTweet(msg) {
        if(msg.tweet) {
            if(msg.tweet.geo) { // if geo is set, always set location from geo
                if(msg.tweet.geo.coordinates && msg.tweet.geo.coordinates.length === 2) {
                    if (!msg.location) { msg.location = {}; }
                    // coordinates[0] is lat, coordinates[1] is lon
                    msg.location.lat = msg.tweet.geo.coordinates[0];
                    msg.location.lon = msg.tweet.geo.coordinates[1];
                    msg.location.icon = "twitter";
                }
            } else if(msg.tweet.coordinates) { // otherwise attempt go get it from coordinates
                if(msg.tweet.coordinates.coordinates && msg.tweet.coordinates.coordinates.length === 2) {
                    if (!msg.location) { msg.location = {}; }
                    // WARNING! coordinates[1] is lat, coordinates[0] is lon!!!
                    msg.location.lat = msg.tweet.coordinates.coordinates[1];
                    msg.location.lon = msg.tweet.coordinates.coordinates[0];
                    msg.location.icon = "twitter";
                }
            } // if none of these found then just do nothing
        } // if no msg.tweet then just do nothing
    }

    function TwitterInNode(n) {
        RED.nodes.createNode(this,n);
        this.active = true;
        this.user = n.user;
        //this.tags = n.tags.replace(/ /g,'');
        this.tags = n.tags;
        this.twitter = n.twitter;
        this.topic = n.topic||"tweets";
        this.twitterConfig = RED.nodes.getNode(this.twitter);
        var credentials = RED.nodes.getCredentials(this.twitter);

        if (credentials && credentials.screen_name == this.twitterConfig.screen_name) {
            var twit = new ntwitter({
                consumer_key: "OKjYEd1ef2bfFolV25G5nQ",
                consumer_secret: "meRsltCktVMUI8gmggpXett7WBLd1k0qidYazoML6g",
                access_token_key: credentials.access_token,
                access_token_secret: credentials.access_token_secret
            });

            //setInterval(function() {
            //        twit.get("/application/rate_limit_status.json",null,function(err,cb) {
            //                console.log("direct_messages:",cb["resources"]["direct_messages"]);
            //        });
            //
            //},10000);

            var node = this;
            if (this.user === "user") {
                node.poll_ids = [];
                node.since_ids = {};
                var users = node.tags.split(",");
                for (var i=0;i<users.length;i++) {
                    var user = users[i].replace(" ","");
                    twit.getUserTimeline({
                            screen_name:user,
                            trim_user:0,
                            count:1
                    },function() {
                        var u = user+"";
                        return function(err,cb) {
                            if (err) {
                                node.error(err);
                                return;
                            }
                            if (cb[0]) {
                                node.since_ids[u] = cb[0].id_str;
                            } else {
                                node.since_ids[u] = '0';
                            }
                            node.poll_ids.push(setInterval(function() {
                                twit.getUserTimeline({
                                        screen_name:u,
                                        trim_user:0,
                                        since_id:node.since_ids[u]
                                },function(err,cb) {
                                    if (cb) {
                                        for (var t=cb.length-1;t>=0;t-=1) {
                                            var tweet = cb[t];
                                            var where = tweet.user.location;
                                            var la = tweet.lang || tweet.user.lang;
                                            var msg = { topic:node.topic+"/"+tweet.user.screen_name, payload:tweet.text, lang:la, tweet:tweet };
                                            if (where) {
                                                msg.location = {place:where};
                                                addLocationToTweet(msg);
                                            }
                                            node.send(msg);
                                            if (t == 0) {
                                                node.since_ids[u] = tweet.id_str;
                                            }
                                        }
                                    }
                                    if (err) {
                                        node.error(err);
                                    }
                                });
                            },60000));
                        }
                    }());
                }
            } else if (this.user === "dm") {
                node.poll_ids = [];
                twit.getDirectMessages({
                        screen_name:node.twitterConfig.screen_name,
                        trim_user:0,
                        count:1
                },function(err,cb) {
                    if (err) {
                        node.error(err);
                        return;
                    }
                    if (cb[0]) {
                        node.since_id = cb[0].id_str;
                    } else {
                        node.since_id = '0';
                    }
                    node.poll_ids.push(setInterval(function() {
                            twit.getDirectMessages({
                                    screen_name:node.twitterConfig.screen_name,
                                    trim_user:0,
                                    since_id:node.since_id
                            },function(err,cb) {
                                if (cb) {
                                    for (var t=cb.length-1;t>=0;t-=1) {
                                        var tweet = cb[t];
                                        var where = tweet.sender.location;
                                        var la = tweet.lang || tweet.sender.lang;
                                        var msg = { topic:node.topic+"/"+tweet.sender.screen_name, payload:tweet.text, lang:la, tweet:tweet };
                                        if (where) {
                                            msg.location = {place:where};
                                            addLocationToTweet(msg);
                                        }
                                        node.send(msg);
                                        if (t == 0) {
                                            node.since_id = tweet.id_str;
                                        }
                                    }
                                }
                                if (err) {
                                    node.error(err);
                                }
                            });
                    },120000));
                });

            } else if (this.tags !== "") {
                try {
                    var thing = 'statuses/filter';
                    if (this.user === "true") { thing = 'user'; }
                    var st = { track: [node.tags] };
                    var bits = node.tags.split(",");
                    if (bits.length == 4) {
                        if ((Number(bits[0]) < Number(bits[2])) && (Number(bits[1]) < Number(bits[3]))) {
                            st = { locations: node.tags };
                        }
                        else {
                            node.log(RED._("twitter.errors.badgeo"));
                        }
                    }

                    var setupStream = function() {
                        if (node.active) {
                            twit.stream(thing, st, function(stream) {
                                //console.log(st);
                                //twit.stream('user', { track: [node.tags] }, function(stream) {
                                //twit.stream('site', { track: [node.tags] }, function(stream) {
                                //twit.stream('statuses/filter', { track: [node.tags] }, function(stream) {
                                node.stream = stream;
                                stream.on('data', function(tweet) {
                                    if (tweet.user !== undefined) {
                                        var where = tweet.user.location;
                                        var la = tweet.lang || tweet.user.lang;
                                        var msg = { topic:node.topic+"/"+tweet.user.screen_name, payload:tweet.text, lang:la, tweet:tweet };
                                        if (where) {
                                            msg.location = {place:where};
                                            addLocationToTweet(msg);
                                        }
                                        node.send(msg);
                                    }
                                });
                                stream.on('limit', function(tweet) {
                                    node.warn(RED._("twitter.errors.ratelimit"));
                                });
                                stream.on('error', function(tweet,rc) {
                                    if (rc == 420) {
                                        node.warn(RED._("twitter.errors.ratelimit"));
                                    } else {
                                        node.warn(RED._("twitter.errors.streamerror")+":"+tweet.toString()+" ("+rc+")");
                                    }
                                    setTimeout(setupStream,10000);
                                });
                                stream.on('destroy', function (response) {
                                    if (this.active) {
                                        node.warn(RED._("twitter.errors.enexpectedend"));
                                        setTimeout(setupStream,10000);
                                    }
                                });
                            });
                        }
                    }
                    setupStream();
                }
                catch (err) {
                    node.error(err);
                }
            } else {
                this.error(RED._("twitter.errors.invalidtag"));
            }
        } else {
            this.error(RED._("twitter.errors.missingcredentials"));
        }

        this.on('close', function() {
            if (this.stream) {
                this.active = false;
                this.stream.destroy();
            }
            if (this.poll_ids) {
                for (var i=0;i<this.poll_ids.length;i++) {
                    clearInterval(this.poll_ids[i]);
                }
            }
        });
    }
    RED.nodes.registerType("twitter in",TwitterInNode);


    function TwitterOutNode(n) {
        RED.nodes.createNode(this,n);
        this.topic = n.topic;
        this.twitter = n.twitter;
        this.twitterConfig = RED.nodes.getNode(this.twitter);
        var credentials = RED.nodes.getCredentials(this.twitter);
        var node = this;

        if (credentials && credentials.screen_name == this.twitterConfig.screen_name) {
            var twit = new ntwitter({
                consumer_key: "OKjYEd1ef2bfFolV25G5nQ",
                consumer_secret: "meRsltCktVMUI8gmggpXett7WBLd1k0qidYazoML6g",
                access_token_key: credentials.access_token,
                access_token_secret: credentials.access_token_secret
            });
            node.on("input", function(msg) {
                if (msg.hasOwnProperty("payload")) {
                    node.status({fill:"blue",shape:"dot",text:RED._("twitter.status.tweeting")});

                    if (msg.payload.length > 140) {
                        msg.payload = msg.payload.slice(0,139);
                        node.warn(RED._("twitter.errors.truncated"));
                    }

                    if (msg.media && Buffer.isBuffer(msg.media)) {
                        var apiUrl = "https://api.twitter.com/1.1/statuses/update_with_media.json";
                        var signedUrl = oa.signUrl(apiUrl,
                            credentials.access_token,
                            credentials.access_token_secret,
                            "POST");

                        var r = request.post(signedUrl,function(err,httpResponse,body) {
                            if (err) {
                                node.error(err,msg);
                                node.status({fill:"red",shape:"ring",text:RED._("twitter.status.failed")});
                            } else {
                                var response = JSON.parse(body);
                                if (response.errors) {
                                    var errorList = response.errors.map(function(er) { return er.code+": "+er.message }).join(", ");
                                    node.error(RED._("twitter.errors.sendfail")+": "+errorList,msg);
                                    node.status({fill:"red",shape:"ring",text:RED._("twitter.status.failed")});
                                } else {
                                    node.status({});
                                }
                            }
                        });
                        var form = r.form();
                        form.append("status",msg.payload);
                        form.append("media[]",msg.media,{filename:"image"});

                    } else {
                        twit.updateStatus(msg.payload, function (err, data) {
                            if (err) {
                                node.status({fill:"red",shape:"ring",text:RED._("twitter.status.failed")});
                                node.error(err,msg);
                            }
                            node.status({});
                        });
                    }
                }
                else { node.warn(RED._("twitter.errors.nopayload")); }
            });
        }
    }
    RED.nodes.registerType("twitter out",TwitterOutNode);

    var oa = new OAuth(
        "https://api.twitter.com/oauth/request_token",
        "https://api.twitter.com/oauth/access_token",
        "OKjYEd1ef2bfFolV25G5nQ",
        "meRsltCktVMUI8gmggpXett7WBLd1k0qidYazoML6g",
        "1.0",
        null,
        "HMAC-SHA1"
    );

    RED.httpAdmin.get('/twitter-credentials/:id/auth', function(req, res){
        var credentials = {};
        oa.getOAuthRequestToken({
                oauth_callback: req.query.callback
        },function(error, oauth_token, oauth_token_secret, results){
            if (error) {
                var error = {statusCode: 401, data: "dummy error"};
                var resp = RED._("twitter.errors.oautherror1")+
                RED._("twitter.errors.oautherror2")+
                RED._("twitter.errors.oautherror3", {statusCode: error.statusCode, errorData: error.data})+
                RED._("twitter.errors.oautherror4");
                res.send(resp)
            } else {
                credentials.oauth_token = oauth_token;
                credentials.oauth_token_secret = oauth_token_secret;
                res.redirect('https://twitter.com/oauth/authorize?oauth_token='+oauth_token)
                RED.nodes.addCredentials(req.params.id,credentials);
            }
        });
    });

    RED.httpAdmin.get('/twitter-credentials/:id/auth/callback', function(req, res, next){
        var credentials = RED.nodes.getCredentials(req.params.id);
        credentials.oauth_verifier = req.query.oauth_verifier;

        oa.getOAuthAccessToken(
            credentials.oauth_token,
            credentials.token_secret,
            credentials.oauth_verifier,
            function(error, oauth_access_token, oauth_access_token_secret, results){
                if (error){
                    RED.log.error(error);
                    res.send(RED._("twitter.errors.oauthbroke"));
                } else {
                    credentials = {};
                    credentials.access_token = oauth_access_token;
                    credentials.access_token_secret = oauth_access_token_secret;
                    credentials.screen_name = "@"+results.screen_name;
                    RED.nodes.addCredentials(req.params.id,credentials);
                    res.send(RED._("twitter.errors.authorized"));
                }
            }
        );
    });
}
