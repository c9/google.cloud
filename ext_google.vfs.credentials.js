module.exports = function(vfs, options, register) {
    function noop() {}

    var CredentialServer = require(options.packageDir + "/lib/CredentialServer");

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
