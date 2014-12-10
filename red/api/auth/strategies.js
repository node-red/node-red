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
var passport = require("passport");

var crypto = require("crypto");
var util = require("util");
var Tokens = require("./tokens");
var Users = require("./users");
var Clients = require("./clients");

var bearerStrategy = function (accessToken, done) {
    // is this a valid token?
    Tokens.get(accessToken).then(function(token) {
        if (token) {
            Users.get(token.user).then(function(user) {
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
    Clients.get(clientId).then(function(client) {
        if (client && client.secret == clientSecret) {
            done(null,client);
        } else {
            done(null,false);
        }
    });
}
clientPasswordStrategy.ClientPasswordStrategy = new ClientPasswordStrategy(clientPasswordStrategy);

var passwordTokenExchange = function(client, username, password, scope, done) {
  Users.authenticate(username,password).then(function(user) {
      if (user) {
          Tokens.create(username,client.id,scope).then(function(token) {
              done(null,token);
          });
      } else {
          done(null,false);
      }
  });
}


function AnonymousStrategy() {
  passport.Strategy.call(this);
  this.name = 'anon';
}
util.inherits(AnonymousStrategy, passport.Strategy);
AnonymousStrategy.prototype.authenticate = function(req) {
    var authorization = req.headers['authorization'];
    var self = this;
    Users.anonymous().then(function(anon) {
        if (anon) {
            self.success(anon);
        } else {
            self.fail(401);
        }
    });
}

module.exports = {
    bearerStrategy: bearerStrategy,
    clientPasswordStrategy: clientPasswordStrategy,
    passwordTokenExchange: passwordTokenExchange,
    anonymousStrategy: new AnonymousStrategy()
}
