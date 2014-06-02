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
    var FeedParser = require("feedparser");
    var request = require("request");

    function FeedParseNode(n) {
        RED.nodes.createNode(this,n);
        this.url = n.url;
        this.interval = (parseInt(n.interval)||15)*60000;
        var node = this;
        this.interval_id = null;
        this.seen = {};
        if (this.url !== "") {
            var getFeed = function() {
                request(node.url,function(err) {
                        if (err) node.error(err);
                })
                    .pipe(new FeedParser({feedurl:node.url}))
                    .on('error', function(error) {
                            node.error(error);
                    })
                    .on('meta', function (meta) {})
                    .on('readable', function () {
                            var stream = this, article;
                            while (article = stream.read()) {
                                if (!(article.guid in node.seen) || ( node.seen[article.guid] != 0 && node.seen[article.guid] != article.date.getTime())) {
                                    node.seen[article.guid] = article.date?article.date.getTime():0;
                                    var msg = {
                                        topic:article.origlink||article.link,
                                        payload: article.description,
                                        article: article
                                    };
                                    node.send(msg);
                                }
                            }
                    })
                    .on('end', function () {
                    });
            };
            this.interval_id = setInterval(getFeed,node.interval);
            getFeed();

        } else {
            this.error("Invalid url");
        }
    }

    RED.nodes.registerType("feedparse",FeedParseNode);

    FeedParseNode.prototype.close = function() {
        if (this.interval_id != null) {
            clearInterval(this.interval_id);
        }
    }
}
