var inherits = require("util").inherits;
var Transform = require("stream").Transform;
var ProtoBuf = require("protobufjs");

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

PBLiteStreamReader.prototype._transform = function(chunk, encoding, done) {
    this._buffer += chunk;

    // scan for header
    if (this._length == null) {
        var parts = this._buffer.split("\n", 2);

        if (parts.length === 2) {
            var len = parseInt(parts[0], 10);

            if (Number.isNaN(len)) {
                var error = new Error("Message length NaN: " + parts[0]);
                return done(error);
            }

            this._length = len;
            this._buffer = parts[1];

            //console.log("length", this._length);
        }
        else if (this._buffer.length > 6) {
            var error = new Error("Received no newline in the first 6 bytes of the message");
            return done(error);
        }
    }

    // parse message
    if (this._length != null && this._buffer.length >= this._length) {
        var data = this._buffer.substring(0, this._length);
        this._buffer = this._buffer.substring(this._length);
        this._length = null;

        //console.log("data", data);

        try {
            // FIXME: handle [,,,12]
            data = JSON.parse(data);
        } catch (e) {
            return done(e);
        }

        if (!Array.isArray(data)) {
            var error = new Error("Expected message to be an array of values");
            return done(error);
        }

        var msg = new this._proto();
        var fields = msg.$type.getChildren(ProtoBuf.Reflect.Message.Field);

        if (fields.length > data.length) {
            var error = new Error("Expected message to contain at least " + fields.length + " values");
            return done(error);
        }

        fields.forEach(function(field) {
            //console.log("field", field);

            var value = data[field.id - 1];

            if (field.type.name === "bool") {
                value = !!value;
            }

            // TODO: recurse

            msg.set(field.name, value);
        });

        //console.log("read", msg);

        return done(null, msg);
    }

    done();
};

module.exports = PBLiteStreamReader;
