// Copyright (c) 2016 Cloud9 IDE, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

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
