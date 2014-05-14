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

    function TwitterNode(n) {
        RED.nodes.createNode(this,n);
        this.screen_name = n.screen_name;
    }
    RED.nodes.registerType("twitter-credentials",TwitterNode);

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
                                            var where = tweet.user.location||"";
                                            var la = tweet.lang || tweet.user.lang;
                                            //console.log(tweet.user.location,"=>",tweet.user.screen_name,"=>",pay);
                                            var msg = { topic:node.topic+"/"+tweet.user.screen_name, payload:tweet.text, location:where, lang:la, tweet:tweet };
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
                                        var msg = { topic:node.topic+"/"+tweet.sender.screen_name, payload:tweet.text, tweet:tweet };
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
                    if ((bits.length > 0) && (bits.length % 4 == 0)) {
                        if ((Number(bits[0]) < Number(bits[2])) && (Number(bits[1]) < Number(bits[3]))) {
                            st = { locations: node.tags };
                        }
                        else {
                            node.warn("twitter: possible bad geo area format. Should be lower-left lon,lat, upper-right lon,lat");
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
                                    //console.log(tweet.user);
                                    if (tweet.user !== undefined) {
                                        var where = tweet.user.location||"";
                                        var la = tweet.lang || tweet.user.lang;
                                        //console.log(tweet.user.location,"=>",tweet.user.screen_name,"=>",pay);
                                        var msg = { topic:node.topic+"/"+tweet.user.screen_name, payload:tweet.text, location:where, lang:la, tweet:tweet };
                                        node.send(msg);
                                    }
                                });
                                stream.on('limit', function(tweet) {
                                    node.log("tweet rate limit hit");
                                });
                                stream.on('error', function(tweet,rc) {
                                    if (rc == 420) {
                                        node.warn("Twitter rate limit hit");
                                    } else {
                                        node.warn("Stream error:"+tweet.toString()+" ("+rc+")");
                                    }
                                    setTimeout(setupStream,10000);
                                });
                                stream.on('destroy', function (response) {
                                    if (this.active) {
                                        node.warn("twitter ended unexpectedly");
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
                this.error("Invalid tag property");
            }
        } else {
            this.error("missing twitter credentials");
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
            }).verifyCredentials(function (err, data) {
                if (err) {
                    node.error("Error verifying credentials: " + err);
                } else {
                    node.on("input", function(msg) {
                        if (msg != null) {
                            if (msg.payload.length > 140) {
                                msg.payload = msg.payload.slice(0,139);
                                node.warn("Tweet greater than 140 : truncated");
                            }
                            twit.updateStatus(msg.payload, function (err, data) {
                                if (err) node.error(err);
                            });
                        }
                    });
                }
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

    var credentials = {};

    RED.httpAdmin.get('/twitter/:id', function(req,res) {
        var credentials = RED.nodes.getCredentials(req.params.id);
        if (credentials) {
            res.send(JSON.stringify({sn:credentials.screen_name}));
        } else {
            res.send(JSON.stringify({}));
        }
    });

    RED.httpAdmin.delete('/twitter/:id', function(req,res) {
        RED.nodes.deleteCredentials(req.params.id);
        res.send(200);
    });

    RED.httpAdmin.get('/twitter/:id/auth', function(req, res){
        var credentials = {};
        oa.getOAuthRequestToken({
                oauth_callback: req.query.callback
        },function(error, oauth_token, oauth_token_secret, results){
            if (error) {
                var resp = '<h2>Oh no!</h2>'+
                '<p>Something went wrong with the authentication process. The following error was returned:<p>'+
                '<p><b>'+error.statusCode+'</b>: '+error.data+'</p>'+
                '<p>One known cause of this type of failure is if the clock is wrong on system running Node-RED.';
                res.send(resp)
            } else {
                credentials.oauth_token = oauth_token;
                credentials.oauth_token_secret = oauth_token_secret;
                res.redirect('https://twitter.com/oauth/authorize?oauth_token='+oauth_token)
                RED.nodes.addCredentials(req.params.id,credentials);
            }
        });
    });

    RED.httpAdmin.get('/twitter/:id/auth/callback', function(req, res, next){
        var credentials = RED.nodes.getCredentials(req.params.id);
        credentials.oauth_verifier = req.query.oauth_verifier;

        oa.getOAuthAccessToken(
            credentials.oauth_token,
            credentials.token_secret,
            credentials.oauth_verifier,
            function(error, oauth_access_token, oauth_access_token_secret, results){
                if (error){
                    console.log(error);
                    res.send("yeah something broke.");
                } else {
                    credentials = {};
                    credentials.access_token = oauth_access_token;
                    credentials.access_token_secret = oauth_access_token_secret;
                    credentials.screen_name = "@"+results.screen_name;
                    RED.nodes.addCredentials(req.params.id,credentials);
                    res.send("<html><head></head><body>Authorised - you can close this window and return to Node-RED</body></html>");
                }
            }
        );
    });
}
