/**
 * Copyright 2014 IBM Corp.
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

var BearerStrategy = require('passport-http-bearer').Strategy;
var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;

var crypto = require("crypto");

var tokens = require("./tokens");
var users = require("./users");
var clients = require("./clients");

var bearerStrategy = function (accessToken, done) {
    // is this a valid token?
    tokens.get(accessToken).then(function(token) {
        if (token) {
            users.get(token.user).then(function(user) {
                if (user) {
                    done(null,user,{scope:token.scope});
                } else {
                    done(null,false);
                }
            });
        } else {
            done(null,false);
        }
    });
}
bearerStrategy.BearerStrategy = new BearerStrategy(bearerStrategy);

var clientPasswordStrategy = function(clientId, clientSecret, done) {
    clients.get(clientId).then(function(client) {
        if (client && client.secret == clientSecret) {
            done(null,client);
        } else {
            done(null,false);
        }
    });
}
clientPasswordStrategy.ClientPasswordStrategy = new ClientPasswordStrategy(clientPasswordStrategy);

var passwordTokenExchange = function(client, username, password, scope, done) {
  users.get(username).then(function(user) {
      if (user && user.password == crypto.createHash('md5').update(password,'utf8').digest('hex')) {
          tokens.create(username,client.id,scope).then(function(token) {
              done(null,token);
          });
      } else {
          done(new Error("Invalid"),false);
      }
  });
}

module.exports = {
    bearerStrategy: bearerStrategy,
    clientPasswordStrategy: clientPasswordStrategy,
    passwordTokenExchange: passwordTokenExchange
}
