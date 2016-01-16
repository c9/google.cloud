"use strict";

var inherits = require("util").inherits;
var EventEmitter = require("events").EventEmitter;
var net = require("net");
var debug = require("debug-logger")("credentials:server");
var ProtoBuf = require("protobufjs");
var PBLiteStreamReader = require("../lib/PBLiteStreamReader");
var PBLiteStreamWriter = require("../lib/PBLiteStreamWriter");

var proto = require("../lib/proto/credentials");
var DevShell = proto.DevShellCredentials;

/**
 * @class google.CredentialServer
 *
 * Server to expose credentials to the `gcloud` utility of the Google Cloud SDK.
 *
 * The credential service is based on the developer shell environment.
 * It listens on a well known port and forwards email, project ID, and
 * access tokens using the PB-Lite / Protocol Buffer format.
 * 
 * ```javascript
 * var app = new CredentialServer();
 *
 * setTimeout(function() {
 *   app.setCredentials("alex+google1@c9.io", "other-project-1159", "ya29.ZwJ000000000000000000000000000000000");
 * }, 5000);
 *
 * var server = app.listen(33939, function() {
 *     var host = server.address().address;
 *     var port = server.address().port;
 * 
 *     console.log("credential server listening on tcp://%s:%s", host, port);
 * });
 * ```
 *
 * When a client connects, the server expects to receive a PB message with the
 * request.  It will then check if credentials are currently known. If not, the
 * socket will stay open for a maximum of `options.timeout` while the server
 * waits for credentials. If the timeout exceeds, the connection is destroyed
 * without a response. Otherwise a PB message containing the credentials is
 * sent.
 *
 * For testing, you can interact with the service using netcat or `gcloud`:
 *
 * ```
 * $ nc localhost 33939
 * 2
 * []
 * 110
 * ["alex+google1@c9.io","other-project-1159","ya29.ZwJ000000000000000000000000000000000"]
 * ```
 *
 * ```
 * $ DEVSHELL_CLIENT_PORT=33939 gcloud auth list
 * Credentialed accounts:
 * - alex+google1@c9.io (active)
 * ```
 *
 * @constructor
 *
 * @param {Object=} options
 * @param {boolean} [options.timeout=30000]
 *   the maximum time in milliseconds to wait for credentials to be set 
 *
 */
function CredentialServer(options) {
    EventEmitter.call(this);

    options = options || {};

    this._timeout = options.timeout || 10000;
    this._credentials = null;
}

inherits(CredentialServer, EventEmitter);

/**
 * @event request
 * Emitted when a request has been received from a connected client.
 *
 * @param {DevShell.CredentialInfoRequest} request
 */

/**
 * @event response
 * Emitted when a response is sent to a connected client.
 *
 * @param {DevShell.CredentialInfoResponse} response
 */

/**
 * @event clientError
 * Emitted when a client connection emits an error.
 *
 * @param {Error} err
 *   the error
 * @param {net.Socket} socket
 *   the client socket that the error originated from
 */

/**
 * Get the known credentials. If no credentials are known, wait for a maximum
 * of `options.timeout` milliseconds.
 *
 * @param {Function} callback
 * @param {Error=}   err
 * @param {Object}   credentials
 */
CredentialServer.prototype.getCredentials = function(callback) {
    var _self = this;

    var tryGetCredentials = function(timeout) {
        if (_self.hasCredentials()) {
            debug("getting credentials");
            return callback(null, _self._credentials);
        }

        if (timeout <= 0) {
            debug.error("timeout waiting for credentials");
            var error = new Error("timeout waiting for credentials");
            return callback(error);
        }

        debug("waiting for credentials...");

        setTimeout(function() {
            tryGetCredentials(timeout - 1000);
        }, 1000);
    };

    tryGetCredentials(this._timeout);
};

/**
 * Check if credentials are known.
 *
 * @return {boolean}
 */
CredentialServer.prototype.hasCredentials = function() {
    return (this._credentials != null);
};

/**
 * Set the known credentials.
 *
 * @param {String} userEmail
 * @param {String} projectId
 * @param {String} accessToken
 */
CredentialServer.prototype.setCredentials = function(userEmail, projectId, accessToken) {
    debug("setting credentials: userEmail=%s, projectId=%s", userEmail, projectId);

    this._credentials = new DevShell.CredentialInfoResponse(
        userEmail,
        projectId,
        accessToken
    );
};

/**
 * Clear the known credentials.
 */
CredentialServer.prototype.clearCredentials = function() {
    this._credentials = null;
};

/**
 * Listen for connections. A `net.Server` is returned with this application as
 * the callback. This method accepts the same parameters as
 * `net.Server.listen()`.
 *
 * ```
 * var server = app.listen(33939, "localhost", function() {
 *     var host = server.address().address;
 *     var port = server.address().port;
 * 
 *     console.log("credential server listening on tcp://%s:%s", host, port);
 *
 *     server.close();
 * });
 * ```
 *
 * @return {net.Server}
 */
CredentialServer.prototype.listen = function() {
    var server = net.createServer(this.createHandler());
    return server.listen.apply(server, arguments);
};

/**
 * Handle a connection on `net.Server#connection`
 * @param {net.Socket} socket
 * @private
 */
CredentialServer.prototype.handle = function(socket) {
    var _self = this;

    this.emit("connection", socket);

    var protobufWriter = new PBLiteStreamWriter(DevShell.CredentialInfoResponse);
    var protobufReader = new PBLiteStreamReader(DevShell.CredentialInfoRequest);

    function onError(err) {
        debug.error("socket error:", err);
        _self.emit("clientError", err, socket);
        socket.destroy();
    }
    socket.once("error", onError);

    function onStreamError(err) {
        socket.emit("error", err);
    }
    protobufWriter.once("error", onStreamError);
    protobufReader.once("error", onStreamError);

    function onResponse(err, res) {
        if (err) {
            socket.emit("error", err);
            return;
        }

        _self.emit("response", res);
        protobufWriter.end(res);
    }

    function onRequest(req) {
        _self.emit("request", req);
        _self.getCredentials(onResponse);
    }
    protobufReader.once("data", onRequest);

    protobufWriter.pipe(socket);
    socket.pipe(protobufReader); 
};

/**
 * Create a connection handler for `net.Server`
 * @private
 */
CredentialServer.prototype.createHandler = function() {
    var _self = this;

    return function(socket) {
        _self.handle(socket);
    };
};

module.exports = CredentialServer;
