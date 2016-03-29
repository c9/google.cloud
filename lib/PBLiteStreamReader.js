// Copyright 2008 The Closure Library Authors. All Rights Reserved.
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

"use strict";

var inherits = require("util").inherits;
var Transform = require("stream").Transform;
var ProtoBuf = require("protobufjs");
var CompactJSON;

/**
 * @class google.PBLiteStreamReader
 *
 * A stream that reads Google Protocol Buffer 2 messages in the PB-Lite (JSON)
 * format and transforms them into protobuf.js message objects.
 * 
 * ```javascript
 * net.createServer(function(socket) {
 *   var protobufReader = new PBLiteStreamReader(DevShell.CredentialInfoRequest);
 *   protobufReader.on("data", function(message) {
 *     console.log(message);
 *     socket.close();
 *   });
 *   socket.pipe(protobufReader);
 * });
 * ```
 *
 * PB-Lite format is a JSON array where each index corresponds to the
 * associated tag number.
 *
 * For example, a message like so:
 * ```
 * message Foo {
 *   optional int bar = 1;
 *   optional int baz = 2;
 *   optional int bop = 4;
 * }
 * ```
 *
 * would be represented as such:
 * ```
 * [(bar data), (baz data), (nothing), (bop data)]
 * ```
 *
 * @see https://github.com/google/closure-library/blob/master/closure/goog/proto2/pbliteserializer.js
 * @see https://github.com/tdryer/hangups/blob/master/hangups/pblite.py
 * @see https://sites.google.com/a/google.com/jspblite/Home
 *
 * @constructor
 *
 * @param {ProtoBuf.Reflect.Message} proto
 *   the message class prototype to be constructed for each received message
 *
 * @param {Object=} options
 */
function PBLiteStreamReader(proto, options) {
    options = options || {};
    options.objectMode = true;

    Transform.call(this, options);

    if (!proto || !proto.$type || !(proto.$type instanceof ProtoBuf.Reflect.Message)) {
        throw new TypeError("Expected required proto of type ProtoBuf.Reflect.Message");
    }

    this._proto = proto;

    this._buffer = "";
    this._length = null;
}

inherits(PBLiteStreamReader, Transform);

/**
 * Transform the stream. Buffers the given chunk, then parses the buffer for
 * messages, and emits each message using the `data` event.
 */
PBLiteStreamReader.prototype._transform = function(chunk, encoding, done) {
    this._buffer += chunk;

    // scan for header
    if (this._length == null) {
        if (this._buffer.indexOf("\n") !== -1) {
            var len = this._buffer.substring(0, this._buffer.indexOf("\n"));
            var buffer = this._buffer.substring(this._buffer.indexOf("\n") + 1);

            if (len.length > 5) {
                var error = new Error("Message length too long: " + len);
                return done(error);
            }

            len = parseInt(len, 10);

            if (Number.isNaN(len)) {
                var error = new Error("Message length NaN: " + len);
                return done(error);
            }

            this._length = len;
            this._buffer = buffer;
        }
        else if (this._buffer.length > 6) {
            var error = new Error("Received no newline in the first 6 bytes of the message");
            return done(error);
        }
    }

    // parse message
    if (this._length != null && this._buffer.length >= this._length) {
        var data = this._buffer.substring(0, this._length);
        this._buffer = this._buffer.substring(this._length + 1);
        this._length = null;

        var containsCompact = (data.indexOf(",,") !== -1);

        try {
            if (containsCompact) {
                CompactJSON = CompactJSON || require("./CompactJSON"); // lazyload
                data = CompactJSON.parse(data);
            }
            else {
                data = JSON.parse(data);
            }
        } catch (e) {
            return done(e);
        }

        if (!Array.isArray(data)) {
            throw new Error("Expected message to be an array of values");
        }

        var deserializeMessage = function(msg, data) {
            var fields = msg.$type.getChildren(ProtoBuf.Reflect.Message.Field);

            fields.forEach(function(field) {
                var value = data[field.id - 1];

                if (value == null) {
                    if (field.required) {
                        throw new Error("Missing at least one required field for " + field.name);
                    }
                    else if (ProtoBuf.populateDefaults && field.defaultValue !== null) {
                        value = field.defaultValue;
                    }
                    else {
                        return;
                    }
                }

                if (field.repeated && value.length === 0) {
                    return;
                }

                if (field.type.name === "bool") {
                    value = !!value;
                }

                if (field.type.name === "message"
                    || field.type.name === "group"
                ) {
                    value = deserializeMessage(new (field.resolvedType.clazz)(), value);
                }

                msg.set(field.name, value);
            });

            return msg;
        };

        var msg;

        try {
            msg = new (this._proto)();
            deserializeMessage(msg, data);
        } catch (e) {
            return done(e);
        }

        this.push(msg);

        // consume remaining buffer
        return this._transform("", encoding, done);
    }

    done();
};

module.exports = PBLiteStreamReader;
