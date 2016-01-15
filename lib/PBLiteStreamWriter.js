var inherits = require("util").inherits;
var Transform = require("stream").Transform;
var ProtoBuf = require("protobufjs");

/**
 * https://github.com/google/closure-library/blob/master/closure/goog/proto2/pbliteserializer.js
 */
function PBLiteStreamWriter(proto, options) {
    options = options || {};
    options.objectMode = true;

    Transform.call(this, options);
}

inherits(PBLiteStreamWriter, Transform);

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

            if (field.type.name === "bool") {
                value = (value ? 1 : 0); // booleans are serialized to numeric form
            }

            if (field.type.name === "enum") {
                value = fieldValue; // enums are serialized to index form
            }

            if (fieldValue && fieldValue.$type && fieldValue.$type instanceof ProtoBuf.Reflect.Message) {
                value = serializeMessage(fieldValue); // recursive
            }

            result[field.id - 1] = value;
        });

        return result;
    };

    var result = serializeMessage(protobufMessage);

    //var msg = require("./CompactJSON").stringify(result);
    var msg = JSON.stringify(result);
    var msgLength = "" + msg.length;

    if (msgLength.length > 5) {
        var error = new Error("Message length too long: " + msgLength);
        return done(error);
    }

    done(null, msgLength + "\n" + msg + "\n");
};

module.exports = PBLiteStreamWriter;
