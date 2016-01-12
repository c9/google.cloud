var inherits = require("util").inherits;
var Transform = require("stream").Transform;
var ProtoBuf = require("protobufjs");

/**
 * https://github.com/google/closure-library/blob/master/closure/goog/proto2/pbliteserializer.js
 */
function PBLiteStreamWriter(options) {
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

        fields.forEach(function(field) {
            //console.log("field", field);

            var value = msg.get(field.name);

            if (field.type.name === "bool") {
                value = (value ? 1 : 0); // booleans are serialized to numeric form
            }

            if (value && value.$type && value.$type instanceof ProtoBuf.Reflect.Message) {
                value = serializeMessage(value); // recursive
            }

            result[field.id - 1] = value;
        });

        return result;
    };

    var result = serializeMessage(protobufMessage);

    var msg = JSON.stringify(result);
    var msgLength = "" + msg.length;

    if (msgLength.length > 5) {
        throw new Error("Message length too long: " + msgLength);
    }

    //console.log("write", msgLength, msg);

    done(null, msgLength + "\n" + msg + "\n");
};

module.exports = PBLiteStreamWriter;
