#!/usr/bin/env node

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

"use strict";

process.env["DEBUG_LEVEL"] = process.env["DEBUG_LEVEL"] || "info";
process.env["DEBUG"] = process.env["DEBUG"] || "*";

require("debug-logger").inspectOptions = {
    colors: true,
    depth: 8
};

var program = require("commander");
var debug = require("debug-logger")("credentials:cli");
var CredentialServer = require("../lib/CredentialServer");

program
    .description("Cloud9 credential service for Google Cloud SDK (gcloud)")
    .option("--host <host>", "host the credential service listens on (default: localhost)", "localhost")
    .option("--port <port>", "port the credential service listens on (default: DEVSHELL_CLIENT_PORT)", process.env["DEVSHELL_CLIENT_PORT"])
    .option("--debug-email <email>", "debug: set the user email")
    .option("--debug-project <project>", "debug: set the project ID")
    .option("--debug-token <access_token>", "debug: set the access token")
    .option("--debug-wait <seconds>", "debug: wait before settings credentials", 0)
;

program.on('--help', function() {
    console.log("  Environment variables:");
    console.log("");
    console.log("    DEVSHELL_CLIENT_PORT  port the credential service listens on");
    console.log("");
});

program.parse(process.argv);

var options = program;

var host = options.host;
var port = parseInt(options.port, 10);

if (Number.isNaN(port)) {
    throw new Error("Missing environment variable DEVSHELL_CLIENT_PORT");
}

var app = new CredentialServer();

if (options.debugEmail || options.debugProject || options.debugToken) {
    debug.warn("will override normal credentials with --debug");

    setTimeout(function() {
        app.setCredentials(
            options.debugEmail,
            options.debugProject,
            options.debugToken
        );
    }, options.debugWait * 1000);
}

var server = app.listen(port, host, function() {
    var host = server.address().address;
    var port = server.address().port;

    debug.info("credential server listening on tcp://%s:%s", host, port);
});
