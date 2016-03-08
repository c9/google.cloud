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

/* global describe it before after beforeEach afterEach define */

var chai = require("chai");
var expect = chai.expect;

// begin test ////

var Stream = require("stream").Stream;
var PBLiteStreamReader = require("../lib/PBLiteStreamReader");

var ProtoBuf = require("protobufjs");
var proto2 = ProtoBuf.loadProtoFile(__dirname + "/../test/mock/unittest_lite.proto").build("protobuf_unittest");
var TestAllTypesLite = proto2.TestAllTypesLite;
var Game = ProtoBuf.loadProtoFile(__dirname + "/../test/mock/game.proto").build("Game");
var Car = Game.Cars.Car;

describe("PBLiteStreamReader", function() {
    var stream;

    describe("implements stream", function() {
        before(function() {
            stream = new PBLiteStreamReader(Car);
        });
        it("should be a Stream", function() {
            expect(stream).to.be.instanceOf(Stream);
        });
        it("should be a writable", function() {
            expect(stream.writable).to.be.true;
        });
    });

    describe("reading messages", function() {
        beforeEach(function() {
            stream = new PBLiteStreamReader(Car);
        });

        it("should read a single message in one chunk", function(done) {
            stream.once("data", function(message) {
                expect(message).to.be.instanceOf(Car);
                done();
            });

            stream.write('59\n["Rusty",["Iron Inc.",["US"],["Rusty","Shiny","Golden"]],2]\n');
        });

        it("should read a multiple message in one chunk", function(done) {
            stream.once("data", function(message1) {
                expect(message1).to.be.instanceOf(Car);
                expect(message1.vendor.name).to.equal("Iron Inc.");

                stream.once("data", function(message2) {
                    expect(message2).to.be.instanceOf(Car);

                    expect(message2).to.be.instanceOf(Car);
                    expect(message2.vendor.name).to.equal("Iron");

                    done();
                });
            });

            stream.write('59\n["Rusty",["Iron Inc.",["US"],["Rusty","Shiny","Golden"]],2]\n54\n["Rusty",["Iron",["US"],["Rusty","Shiny","Golden"]],1]\n');
        });

        it("should read multiple messages in partial chunks", function(done) {
            stream.once("data", function(message1) {
                expect(message1).to.be.instanceOf(Car);
                expect(message1.vendor.name).to.equal("Iron Inc.");

                stream.once("data", function(message2) {
                    expect(message2).to.be.instanceOf(Car);
                    expect(message2.vendor.name).to.equal("Iron");
                    done();
                });

                stream.write(',["Iron",["US"],["Rusty","Shiny","Golden"]],1]\n');
            });

            stream.write('59\n["Rusty",["Iron Inc.",["US"],["Rusty","Shiny","Golden"]],2]\n54\n["Rusty"');
        });

        it("should stream partial length chunks", function(done) {
            stream.once("data", function(message) {
                expect(message).to.be.instanceOf(Car);
                done();
            });

            stream.write('5');
            stream.write('9\n["Rusty",["Iron Inc.",["US"],["Rusty","Shiny","Golden"]],2]\n');
        });

        it("should stream partial data chunks", function(done) {
            stream.once("data", function(message) {
                expect(message).to.be.instanceOf(Car);
                done();
            });

            stream.write('59\n["Rusty",["Iron Inc."');
            stream.write(',["US"],["Rusty","Shiny","Golden"]],2]\n');
        });

        it("should emit error if length in header is too big", function(done) {
            stream.on("data", function() {
                done(new Error("should not emit data"));
            });

            stream.once("error", function(err) {
                expect(err).to.be.instanceOf(Error);
                expect(err.message).to.match(/Message length too long/);
                done();
            });

            stream.write("99999999999\nasdfsadf\n");
        });

        it("should emit error if length in header NaN", function(done) {
            stream.on("data", function() {
                done(new Error("should not emit data"));
            });

            stream.once("error", function(err) {
                expect(err).to.be.instanceOf(Error);
                expect(err.message).to.match(/Message length NaN/);
                done();
            });

            stream.write("foo\nasdfsadf\n");
        });

        it("should emit error if header does not contain length in the first 6 byes", function(done) {
            stream.on("data", function() {
                done(new Error("should not emit data"));
            });

            stream.once("error", function(err) {
                expect(err).to.be.instanceOf(Error);
                expect(err.message).to.match(/no newline in the first 6 bytes of the message/);
                done();
            });

            stream.write("123456789");
        });

        it("should emit error if message is missing required fields", function(done) {
            stream.on("data", function() {
                done(new Error("should not emit data"));
            });

            stream.once("error", function(err) {
                expect(err).to.be.instanceOf(Error);
                expect(err.message).to.match(/Missing at least one required field/);
                done();
            });

            stream.write('10\n["Rusty"]\n');
        });
    });

    describe("reading normal JSON", function() {
        it.skip("should deserialize all types", function(done) {
            stream = new PBLiteStreamReader(TestAllTypesLite);

            stream.once("data", function(message) {
                expect(message).to.be.instanceOf(TestAllTypesLite);
                expect(message).to.deep.equal(createPopulatedMessage());

                done();
            });

            stream.write('617\n[101,"102",103,"104",105,"106",107,"108",109,"110",111.5,112.5,1,"test","abcd",[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,111],null,[112],null,null,1,null,null,null,null,null,null,null,null,null,[201,202],[],[],[],[],[],[],[],[],[],[],[],1,["foo","bar"],[],[],null,[],[],[],[],[],[],[],[],null,[],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]\n');
        });

        it("should deserialize undefined inner messages", function(done) {
            stream = new PBLiteStreamReader(Car);

            stream.once("data", function(message) {
                expect(message).to.be.instanceOf(Car);
                expect(message.vendor.name).to.equal("Iron Inc.");
                expect(message.speed).to.equal(Car.Speed.FAST);

                done();
            });

            stream.write('36\n["Rusty",["Iron Inc.",null,[]],null]\n');
        });
    });

    describe("reading compact JSON", function() {
        it.skip("should deserialize all types", function(done) {
            stream = new PBLiteStreamReader(TestAllTypesLite);

            stream.once("data", function(message) {
                expect(message).to.be.instanceOf(TestAllTypesLite);
                expect(message).to.deep.equal(createPopulatedMessage());

                done();
            });

            stream.write('229\n[101,"102",103,"104",105,"106",107,"108",109,"110",111.5,112.5,1,"test","abcd",[,,,,,,,,,,,,,,,,111],,[112],,,1,,,,,,,,,,[201,202],,,,,,,,,,,,1,["foo","bar"],,,,,,,,,,,,,,,,,,,,,,,,,,,,,0,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,]\n');
        });

        it.skip("should deserialize all types when trailing commas are trimmed", function(done) {
            stream = new PBLiteStreamReader(TestAllTypesLite);

            stream.once("data", function(message) {
                expect(message).to.be.instanceOf(TestAllTypesLite);
                expect(message).to.deep.equal(createPopulatedMessage());

                done();
            });

            stream.write('188\n[101,"102",103,"104",105,"106",107,"108",109,"110",111.5,112.5,1,"test","abcd",[,,,,,,,,,,,,,,,,111],,[112],,,1,,,,,,,,,,[201,202],,,,,,,,,,,,1,["foo","bar"],,,,,,,,,,,,,,,,,,,,,,,,,,,,,0]\n');
        });

        it("should deserialize undefined inner messages", function(done) {
            stream = new PBLiteStreamReader(Car);

            stream.once("data", function(message) {
                expect(message).to.be.instanceOf(Car);
                expect(message.vendor.name).to.equal("Iron Inc.");
                expect(message.speed).to.equal(Car.Speed.FAST);

                done();
            });

            stream.write('26\n["Rusty",["Iron Inc.",,],]\n');
        });

        it("should deserialize undefined inner messages when trailing commas are trimmed", function(done) {
            stream = new PBLiteStreamReader(Car);

            stream.once("data", function(message) {
                expect(message).to.be.instanceOf(Car);
                expect(message.vendor.name).to.equal("Iron Inc.");
                expect(message.speed).to.equal(Car.Speed.FAST);

                done();
            });

            stream.write('24\n["Rusty",["Iron Inc."]]\n');
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

//});

