// Copyright 2016 Cloud9 IDE, Inc.
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
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
 * @class google.PBLiteStreamWriter
 *
 * A stream that writes `protobuf.js` message objects and transforms them into
 * Google Protocol Buffer 2 messages in the PB-Lite (JSON) format.
 * 
 * ```javascript
 * net.createServer(function(socket) {
 *   var protobufWriter = new PBLiteStreamReader(DevShell.CredentialInfoResponse);
 *   protobufWriter.pipe(socket);
 *   protobufWriter.end(new DevShell.CredentialInfoResponse("foo@bar.com", null, "foobar"));
 * });
 * ```
 *
 * PB-Lite format is a JSON array where each index corresponds to the
 * associated tag number.
 *
 * The message above would be represented as:
 * ```
 * 32
 * ["foo@bar.com",null,"foobar"]
 * ```
 *
 * Or with the `CompactJSON` message format:
 * ```
 * 28
 * ["foo@bar.com",,"foobar"]
 * ```
 *
 * The maximum serialized message length can be 99999 bytes.
 *
 * @see https://github.com/google/closure-library/blob/master/closure/goog/proto2/pbliteserializer.js
 * @see https://github.com/tdryer/hangups/blob/master/hangups/pblite.py
 * @see https://sites.google.com/a/google.com/jspblite/Home
 *
 * @constructor
 *
 * @param {ProtoBuf.Reflect.Message} proto
 *   the message class prototype each message is expected to represent
 *
 * @param {Object=} options
 * @param {boolean} [options.compact=false]
 *   whether the output should be formatted in compact JSON or
 *   standard-compliant JSON
 */
function PBLiteStreamWriter(proto, options) {
    options = options || {};
    options.objectMode = true;

    this._isCompact = options.compact || false;

    Transform.call(this, options);
}

inherits(PBLiteStreamWriter, Transform);

/**
 * Transform the stream. Serializes the given message to the PB-Lite protocol
 * and emits it using the `data` event.
 */
PBLiteStreamWriter.prototype._transform = function(protobufMessage, encoding, done) {
    var _self = this;

    var serializeMessage = function(msg) {
        if (!msg || !msg.$type || !(msg.$type instanceof ProtoBuf.Reflect.Message)) {
            throw new TypeError("Expected msg.$type to be ProtoBuf.Reflect.Message");
        }

        var result = [];
        var fields = msg.$type.getChildren(ProtoBuf.Reflect.Message.Field);
        var raw = msg.toRaw(true, true);

        fields.forEach(function(field) {
            var value = raw[field.name];
            var fieldValue = msg.get(field.name);

            // FIXME: handle repeated values:

            if (field.type.name === "bool") {
                value = (value ? 1 : 0); // booleans are serialized to numeric form
            }

            if (field.type.name === "enum") {
                value = fieldValue; // enums are serialized to index form
            }

            if (field.repeated && value.length === 0 && _self._isCompact) {
                value = null; // compact empty repeated fields
            }

            if (fieldValue && fieldValue.$type && fieldValue.$type instanceof ProtoBuf.Reflect.Message) {
                value = serializeMessage(fieldValue); // recursive
            }

            result[field.id - 1] = value;
        });

        return result;
    };

    var result = serializeMessage(protobufMessage);

    var msg;
    if (this._isCompact) {
        CompactJSON = CompactJSON || require("./CompactJSON"); // lazyload
        msg = CompactJSON.stringify(result);
    }
    else {
        msg = JSON.stringify(result);
    }

    var msgLength = "" + msg.length;
    if (msgLength.length > 5) {
        var error = new Error("Message length too long: " + msgLength);
        return done(error);
    }

    done(null, msgLength + "\n" + msg + "\n");
};

module.exports = PBLiteStreamWriter;
