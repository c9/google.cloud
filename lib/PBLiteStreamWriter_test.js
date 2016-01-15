"use strict";

/* global describe it before after beforeEach afterEach define */

var chai = require("chai");
var expect = chai.expect;

// begin test ////

var Stream = require("stream").Stream;
var PBLiteStreamWriter = require("../lib/PBLiteStreamWriter");
var CompactJSON = require("../lib/CompactJSON");

var ProtoBuf = require("protobufjs");
var proto2 = ProtoBuf.loadProtoFile(__dirname + "/../test/mock/unittest_lite.proto").build("protobuf_unittest");
var TestAllTypesLite = proto2.TestAllTypesLite;
var Game = ProtoBuf.loadProtoFile(__dirname + "/../test/mock/game.proto").build("Game");
var Car = Game.Cars.Car;

/*
 * Based on
 * https://github.com/google/closure-library/blob/master/closure/goog/proto2/pbliteserializer_test.js
 */

describe("PBLiteStreamWriter", function() {
    var stream;

    describe("implements stream", function() {
        before(function() {
            stream = new PBLiteStreamWriter(TestAllTypesLite);
        });
        it("should be a Stream", function() {
            expect(stream).to.be.instanceOf(Stream);
        });
        it("should be a writable", function() {
            expect(stream.writable).to.be.true;
        });
    });

    describe("writing normal JSON", function() {
        beforeEach(function() {
            stream = new PBLiteStreamWriter(TestAllTypesLite);
        });

        it("should send a header with the message length", function(done) {
            var message = new TestAllTypesLite(100);

            stream.once("data", function(data) {
                expect(data).to.be.a('string');

                var parts = data.split("\n");
                expect(parts[0]).to.match(/[0-9]+/);
                expect(parts[0]).to.equal("" + parts[1].length);

                done();
            });

            stream.write(message);
        });

        it("should serialize multiple messages", function(done) {
            var message1 = new TestAllTypesLite(10001);
            var message2 = new TestAllTypesLite(10002);

            stream.once("data", function(data1) {
                expect(data1).to.be.a('string');
                expect(data1).to.contain("10001");
                expect(data1).to.not.contain("10002");

                stream.once("data", function(data2) {
                    expect(data2).to.be.a('string');
                    expect(data2).to.contain("10002");
                    expect(data2).to.not.contain("10001");

                    done();
                });

                stream.write(message2);
            });

            stream.write(message1);
        });

        it("should fail to serialize a message larger than 99999 bytes", function(done) {
            stream.on("data", function() {
                done(new Error("should not emit data"));
            });

            stream.once("error", function(err) {
                expect(err).to.be.instanceOf(Error);
                expect(err.message).to.match(/Message length too long/);
                done();
            });

            var message = new TestAllTypesLite(100);
            message.setOptionalBytes(Array(100000).fill("x").join(""));

            stream.write(message);
        });

        it("should serialize all types", function(done) {
            var message = createPopulatedMessage();

            stream.once("data", function(data) {
                expect(data).to.be.a('string');
                expect(data).to.equal('617\n[101,"102",103,"104",105,"106",107,"108",109,"110",111.5,112.5,1,"test","abcd",[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,111],null,[112],null,null,1,null,null,null,null,null,null,null,null,null,[201,202],[],[],[],[],[],[],[],[],[],[],[],1,["foo","bar"],[],[],null,[],[],[],[],[],[],[],[],null,[],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]\n');

                var parts = data.split("\n");
                data = JSON.parse(parts[1]);
                expect(data).to.be.an('array');

                var assertEquals = function(expected, actual) {
                    expect(actual).to.equal(expected);
                }

                var assertTrue = function(actual) {
                    expect(actual).to.be.true;
                }

                assertEquals(101, data[0]);
                assertEquals('102', data[1]);
                assertEquals(103, data[2]);
                assertEquals('104', data[3]);
                assertEquals(105, data[4]);
                assertEquals('106', data[5]);
                assertEquals(107, data[6]);
                assertEquals('108', data[7]);
                assertEquals(109, data[8]);
                assertEquals('110', data[9]);
                assertEquals(111.5, data[10]);
                assertEquals(112.5, data[11]);
                assertEquals(1, data[12]); // true is serialized as 1
                assertEquals('test', data[13]);
                assertEquals('abcd', data[14]);

                assertEquals(111, data[15][16]);
                assertEquals(112, data[17][0]);

                expect(data[18]).to.not.exist;
                expect(data[19]).to.not.exist;

                assertEquals(proto2.TestAllTypesLite.NestedEnum.FOO, data[20]);

                assertEquals(201, data[30][0]);
                assertEquals(202, data[30][1]);
                assertEquals('foo', data[43][0]);
                assertEquals('bar', data[43][1]);

                done();
            });

            stream.write(message);
        });

        it("should serialize inner messages", function(done) {
            var car = new Car({
                "model": "Rusty",
                "vendor": {
                    "name": "Iron Inc.",
                    "address": {
                        "country": "US"
                    },
                    "models": [
                        "Rusty", "Shiny", "Golden",
                    ],
                },
                "speed": "SUPERFAST"
            });

            stream.once("data", function(data) {
                expect(data).to.equal('59\n["Rusty",["Iron Inc.",["US"],["Rusty","Shiny","Golden"]],2]\n');
                done();
            });

            stream.write(car);
        });

        it("should serialize undefined inner messages", function(done) {
            var car = new Car({
                "model": "Rusty",
                "vendor": {
                    "name": "Iron Inc.",
                },
            });

            stream.once("data", function(data) {
                expect(data).to.equal('36\n["Rusty",["Iron Inc.",null,[]],null]\n');
                done();
            });

            stream.write(car);
        });
    });

    describe("writing compact JSON", function() {
        beforeEach(function() {
            stream = new PBLiteStreamWriter(Car, {compact: true});
        });

        it("should serialize all types", function(done) {
            var message = createPopulatedMessage();

            stream.once("data", function(data) {
                expect(data).to.be.a('string');
                expect(data).to.equal('229\n[101,"102",103,"104",105,"106",107,"108",109,"110",111.5,112.5,1,"test","abcd",[,,,,,,,,,,,,,,,,111],,[112],,,1,,,,,,,,,,[201,202],,,,,,,,,,,,1,["foo","bar"],,,,,,,,,,,,,,,,,,,,,,,,,,,,,0,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,]\n');

                var parts = data.split("\n");
                data = CompactJSON.parse(parts[1]);
                expect(data).to.be.an('array');

                var assertEquals = function(expected, actual) {
                    expect(actual).to.equal(expected);
                }

                var assertTrue = function(actual) {
                    expect(actual).to.be.true;
                }

                assertEquals(101, data[0]);
                assertEquals('102', data[1]);
                assertEquals(103, data[2]);
                assertEquals('104', data[3]);
                assertEquals(105, data[4]);
                assertEquals('106', data[5]);
                assertEquals(107, data[6]);
                assertEquals('108', data[7]);
                assertEquals(109, data[8]);
                assertEquals('110', data[9]);
                assertEquals(111.5, data[10]);
                assertEquals(112.5, data[11]);
                assertEquals(1, data[12]); // true is serialized as 1
                assertEquals('test', data[13]);
                assertEquals('abcd', data[14]);

                assertEquals(111, data[15][16]);
                assertEquals(112, data[17][0]);

                expect(data[18]).to.not.exist;
                expect(data[19]).to.not.exist;

                assertEquals(proto2.TestAllTypesLite.NestedEnum.FOO, data[20]);

                assertEquals(201, data[30][0]);
                assertEquals(202, data[30][1]);
                assertEquals('foo', data[43][0]);
                assertEquals('bar', data[43][1]);

                done();
            });

            stream.write(message);
        });

        it("should serialize inner messages", function(done) {
            var car = new Car({
                "model": "Rusty",
                "vendor": {
                    "name": "Iron Inc.",
                    "address": {
                        "country": "US"
                    },
                    "models": [
                        "Rusty", "Shiny", "Golden",
                    ],
                },
                "speed": "SUPERFAST"
            });

            stream.once("data", function(data) {
                expect(data).to.equal('59\n["Rusty",["Iron Inc.",["US"],["Rusty","Shiny","Golden"]],2]\n');
                done();
            });

            stream.write(car);
        });

        it("should serialize undefined inner messages", function(done) {
            var car = new Car({
                "model": "Rusty",
                "vendor": {
                    "name": "Iron Inc.",
                },
            });

            stream.once("data", function(data) {
                expect(data).to.equal('26\n["Rusty",["Iron Inc.",,],]\n');
                done();
            });

            stream.write(car);
        });
    });
});

function createPopulatedMessage() {
    var message = new proto2.TestAllTypesLite();

    // Set the fields.
    // Singular.
    message.setOptionalInt32(101);
    message.setOptionalInt64('102');
    message.setOptionalUint32(103);
    message.setOptionalUint64('104');
    message.setOptionalSint32(105);
    message.setOptionalSint64('106');
    message.setOptionalFixed32(107);
    message.setOptionalFixed64('108');
    message.setOptionalSfixed32(109);
    message.setOptionalSfixed64('110');
    message.setOptionalFloat(111.5);
    message.setOptionalDouble(112.5);
    message.setOptionalBool(true);
    message.setOptionalString('test');
    message.setOptionalBytes('abcd');

    var group = new proto2.TestAllTypesLite.OptionalGroup();
    group.setA(111);

    message.setOptionalgroup(group);

    var nestedMessage = new proto2.TestAllTypesLite.NestedMessage();
    nestedMessage.setBb(112);

    message.setOptionalNestedMessage(nestedMessage);

    message.setOptionalNestedEnum(proto2.TestAllTypesLite.NestedEnum.FOO);

    // Repeated.
    message.add("repeated_int32", 201);
    message.add("repeated_int32", 202);

    // Skip a few repeated fields so we can test how null array values are
    // handled.
    message.add("repeated_string", 'foo');
    message.add("repeated_string", 'bar');

    return message;
}

// end test ////

if (typeof onload !== "undefined")
    onload();
