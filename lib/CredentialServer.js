var inherits = require("util").inherits;
var EventEmitter = require("events").EventEmitter;
var net = require("net");
var debug = require("debug-logger")("credentials:server");
var ProtoBuf = require("protobufjs");
var PBLiteStreamReader = require("../lib/PBLiteStreamReader");
var PBLiteStreamWriter = require("../lib/PBLiteStreamWriter");

var proto = require("../lib/proto/credentials");
var DevShell = proto.DevShellCredentials;

function CredentialServer() {
    EventEmitter.call(this);

    this._timeout = 30000;
    this._credentials = null;
}

inherits(CredentialServer, EventEmitter);

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

CredentialServer.prototype.hasCredentials = function() {
    return (this._credentials != null);
};

CredentialServer.prototype.setCredentials = function(userEmail, projectId, accessToken) {
    debug("setting credentials: userEmail=%s, projectId=%s", userEmail, projectId);

    this._credentials = new DevShell.CredentialInfoResponse(
        userEmail,
        projectId,
        accessToken
    );
};

CredentialServer.prototype.clearCredentials = function() {
    this._credentials = null;
};

CredentialServer.prototype.listen = function() {
    var server = net.createServer(this.createHandler());
    return server.listen.apply(server, arguments);
};

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

CredentialServer.prototype.createHandler = function() {
    var _self = this;

    return function(socket) {
        _self.handle(socket);
    };
};

module.exports = CredentialServer;
