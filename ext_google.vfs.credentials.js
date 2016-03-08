// Copyright 2016 Cloud9 IDE, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

module.exports = function(vfs, options, register) {
    function noop() {}

    try {
        var CredentialServer = require(options.packageDir + "/lib/CredentialServer");
    }
    catch (e) {
        return register(e);
    }

    var app = new CredentialServer();
    var server;

    var port = options.port || 33939;
    var host = options.host || "localhost";

    register(null, {
        listen: function(callback) {
            callback = callback || noop;

            if (server) {
                server.close();
                server = null;
            }

            try {
                server = app.listen(port, host, function() {
                    var host = server.address().address;
                    var port = server.address().port;

                    console.log("credential server listening on tcp://%s:%s", host, port);

                    callback(null, {arguments: [port, host]});
                });
            } catch (e) {
                callback(e);
            }
        },

        close: function(callback) {
            callback = callback || noop;
            server.close(function(err) {
                callback(err);
            });
            server = null;
        },

        hasCredentials: function(callback) {
            callback = callback || noop;
            callback(null, {arguments: [app.hasCredentials()]});
        },

        setCredentials: function(userEmail, projectId, accessToken, callback) {
            callback = callback || noop;
            app.setCredentials(userEmail, projectId, accessToken);
            callback();
        },

        clearCredentials: function(callback) {
            callback = callback || noop;
            app.clearCredentials();
            callback();
        },
    });
};
