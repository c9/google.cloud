define(function(require, exports, module) {
    main.consumes = [
        "Plugin", "debugger", "util", "c9", "google.cloud"
    ];
    main.provides = ["googleCloudDebugger"];
    return main;
    
    function main(options, imports, register) {
        var googleCloud = imports["google.cloud"];
        var Plugin = imports.Plugin;
        var util = imports.util;
        var debug = imports["debugger"];
        var c9 = imports.c9;
        var async = require("async");
        
        var Frame = debug.Frame;
        var Source = debug.Source;
        var Breakpoint = debug.Breakpoint;
        var Variable = debug.Variable;
        var Scope = debug.Scope;
        
        /***** Initialization *****/
        
        var plugin = new Plugin("Ajax.org", main.consumes);
        var emit = plugin.getEmitter();
        emit.setMaxListeners(1000);

        var breakpointQueue = [];
        
        var TYPE = "googleCloudDebugger";
        
        var attached = false;
        var state, activeFrame, sources, socket, snapshots, activeSnapshot;
        
        var accessToken = "";
        var projectId = "";
        var projectNumber = "";
        
        var clouddebugger, gapi;
        
        /***** gce api *****/
        
        function getCloudDebugger(cb) {
            if (clouddebugger) return cb(null, clouddebugger);
            if (!gapi) {
                require(["https://apis.google.com/js/client.js"], function() {
                    gapi = window.gapi;
                    gapi.load("client",{callback:setCredentials});
                });
            } else {
                setCredentials();
            }
            function setCredentials() {
                googleCloud.getCredentials(function(err, data) {
                    if (err)
                        return cb(err);
                    accessToken = data.accessToken;
                    projectId = data.projectId;
                    projectNumber = data.projectNumber;
        
                    window.gapi.client.load("clouddebugger", "v2").then(function() {                
                        gapi.auth.setToken({
                            access_token: accessToken
                        });
                        clouddebugger = gapi.client.clouddebugger;
                        cb(null, clouddebugger);
                    });
                });
            }
        }
        
        function listDebugees() {
            clouddebugger.debugger.debuggees.list({
                project: projectNumber,
            }).then(function(res) {
                return res.result.debuggees;
            }, function(err) {
                accessToken = clouddebugger = null;
                console.log("Error: " + err.result.error.message, err);
            }).then(function(debuggees) {
                return debuggees[debuggees.length - 1];
            });
        }
        
        function listRemoteBreakpoints(debuggee) {
            // fields: "breakpoints(action,condition,createTime,evaluatedExpressions,expressions,finalTime,id,isFinalState,location,logLevel,logMessageFormat,stackFrames,status,userEmail,variableTable),nextWaitToken,waitExpired"
            return clouddebugger.debugger.debuggees.breakpoints.list({
                debuggeeId: debugee.id,
                includeAllUsers: true,
                includeInactive: true,
                fields: "breakpoints(action,condition,createTime,finalTime,id,isFinalState,location,logLevel,logMessageFormat,status,userEmail),nextWaitToken"
            });
        }
        
        function getRemoteBreakpoint(debuggee, bpId) {
            return clouddebugger.debugger.debuggees.breakpoints.list({
                debuggeeId: debugee.id,
                breakpointId: bpId,
                includeAllUsers: true,
                includeInactive: true
            });
        }
        
        function setRemoteBreakpoint(debugee, bp) {
            return clouddebugger.debugger.debuggees.breakpoints.set({
                debuggeeId: debugee.id,
                action: "CAPTURE", // "LOG",               
                location: {
                    line: bp.line,
                    path: bp.path
                }
            });
        }
        
        function removeRemoteBreakpoint(debugee, bpId) {
            return clouddebugger.debugger.debuggees.breakpoints.delete({
                debuggeeId: debugee.id,
                breakpointId: bpId
            });
        }


        /***** Helper Functions *****/
        
        function mockTakeSnapshot(bp) {
            var id =  Date.now().toString(16).slice(-6);
            var data = {
                "breakpoint": {
                    "id": "527071f6c6885-ebdc-c431e",
                    "location": {
                        "path": "SystemViewerServlet.java",
                        "line": bp ? bp.line + 1 : 60
                    },
                    "isFinalState": true,
                    "stackFrames": [{
                        "function": "x" + id,
                        "location": {
                            "path": "SystemViewerServlet.java",
                            "line": bp ? bp.line + 1 : 60
                        },
                        "arguments": [{
                            "name": "this",
                            "varTableIndex": 1
                        }, {
                            "name": "request",
                            "varTableIndex": 2
                        }, {
                            "name": "response",
                            "varTableIndex": 3
                        }],
                        "locals": [{
                            "name": "random_id",
                            "value": id,
                            "type": "long"
                        }, {
                            "name": "keys",
                            "varTableIndex": 4
                        }, {
                            "name": "out",
                            "varTableIndex": 5
                        }]
                    }, {
                        "function": "com.google.appengine.demos.guestbook.SystemViewerServlet.doGet",
                        "location": {
                            "path": "SystemViewerServlet.java",
                            "line": 93
                        },
                        "arguments": [{
                            "name": "this",
                            "varTableIndex": 1
                        }, {
                            "name": "request",
                            "varTableIndex": 2
                        }, {
                            "name": "response",
                            "varTableIndex": 3
                        }]
                    }],
                    "variableTable": [{
                        "status": {
                            "isError": true,
                            "refersTo": "VARIABLE_VALUE",
                            "description": {
                                "format": "Buffer full"
                            }
                        }
                    }, {
                        "members": [{
                            "name": "config",
                            "varTableIndex": 7
                        }],
                        "type": "com.google.appengine.demos.guestbook.SystemViewerServlet"
                    }, {
                        "members": [{
                            "name": "_channel",
                            "varTableIndex": 8
                        }, {
                            "name": "_fields",
                            "varTableIndex": 9
                        }, {
                            "name": "_requestAttributeListeners",
                            "varTableIndex": 10
                        }, {
                            "name": "_input",
                            "varTableIndex": 11
                        }, {
                            "name": "_timeStamp",
                            "value": "1450286465745",
                            "type": "long"
                        }, {
                            "name": "_multiPartInputStream",
                            "value": "null"
                        }, {
                            "name": "_async",
                            "value": "null"
                        }],
                        "type": "org.eclipse.jetty.server.Request"
                    }, {
                        "members": [{
                            "name": "response",
                            "varTableIndex": 22
                        }, {
                            "name": "mode",
                            "varTableIndex": 23
                        }, {
                            "name": "writer",
                            "varTableIndex": 5
                        }, {
                            "name": "pending",
                            "value": "null"
                        }, {
                            "name": "output",
                            "varTableIndex": 24
                        }],
                        "type": "com.google.apphosting.vmruntime.CommitDelayingResponse"
                    }, {
                        "members": [{
                            "name": "table",
                            "varTableIndex": 25
                        }, {
                            "name": "index",
                            "value": "91",
                            "type": "int"
                        }, {
                            "name": "entry",
                            "varTableIndex": 26
                        }, {
                            "name": "lastReturned",
                            "value": "null"
                        }, {
                            "name": "type",
                            "value": "0",
                            "type": "int"
                        }, {
                            "name": "iterator",
                            "value": "true",
                            "type": "boolean"
                        }, {
                            "name": "expectedModCount",
                            "value": "75",
                            "type": "int"
                        }, {
                            "name": "this$0",
                            "varTableIndex": 27
                        }],
                        "type": "java.util.Hashtable.Enumerator"
                    }, {
                        "members": [{
                            "name": "writeBuffer",
                            "value": "null"
                        }, {
                            "name": "writeBufferSize",
                            "value": "1024",
                            "type": "int"
                        }, {
                            "name": "lock",
                            "varTableIndex": 28
                        }, {
                            "name": "out",
                            "varTableIndex": 28
                        }, {
                            "name": "autoFlush",
                            "value": "false",
                            "type": "boolean"
                        }, {
                            "name": "trouble",
                            "value": "false",
                            "type": "boolean"
                        }, {
                            "name": "formatter",
                            "value": "null"
                        }, {
                            "name": "psOut",
                            "value": "null"
                        }, {
                            "name": "lineSeparator",
                            "value": "\"\n\"",
                            "type": "String"
                        }],
                        "type": "java.io.PrintWriter"
                    }, {
                        "members": [{
                            "name": "_listeners",
                            "varTableIndex": 29
                        }, {
                            "name": "_lock",
                            "varTableIndex": 30
                        }, {
                            "name": "_state",
                            "value": "2",
                            "type": "int"
                        }, {
                            "name": "_stopTimeout",
                            "value": "30000",
                            "type": "long"
                        }, {
                            "name": "_source",
                            "varTableIndex": 31
                        }, {
                            "name": "_class",
                            "varTableIndex": 32
                        }, {
                            "name": "_className",
                            "value": "\"com.google.appengine.demos.guestbook.SystemViewerServlet\"",
                            "type": "String"
                        }, {
                            "name": "_extInstance",
                            "value": "false",
                            "type": "boolean"
                        }, {
                            "name": "_servletHandler",
                            "varTableIndex": 33
                        }, {
                            "name": "_initParams",
                            "varTableIndex": 34
                        }, {
                            "name": "_displayName",
                            "value": "null"
                        }, {
                            "name": "_asyncSupported",
                            "value": "false",
                            "type": "boolean"
                        }, {
                            "name": "_name",
                            "value": "\"systemviewer\"",
                            "type": "String"
                        }, {
                            "name": "_servlet",
                            "varTableIndex": 1
                        }, {
                            "name": "_config",
                            "varTableIndex": 7
                        }, {
                            "name": "_unavailable",
                            "value": "0",
                            "type": "long"
                        }, {
                            "name": "_enabled",
                            "value": "true",
                            "type": "boolean"
                        }, {
                            "name": "_unavailableEx",
                            "value": "null"
                        }],
                        "type": "org.eclipse.jetty.servlet.ServletHolder"
                    }, {
                        "members": [{
                            "name": "this$0",
                            "varTableIndex": 6
                        }, {
                            "name": "this$0",
                            "varTableIndex": 6
                        }],
                        "type": "org.eclipse.jetty.servlet.ServletHolder.Config"
                    }, {
                        "members": [{
                            "name": "_request",
                            "varTableIndex": 2
                        }, {
                            "name": "_response",
                            "varTableIndex": 22
                        }, {
                            "name": "_expect",
                            "value": "false",
                            "type": "boolean"
                        }, {
                            "name": "_expect100Continue",
                            "value": "false",
                            "type": "boolean"
                        }, {
                            "name": "_expect102Processing",
                            "value": "false",
                            "type": "boolean"
                        }],
                        "type": "org.eclipse.jetty.server.HttpConnection.HttpChannelOverHttp"
                    }],
                    "createTime": "2015-12-16T17:20:29.000Z",
                    "finalTime": "2015-12-16T17:21:05.000Z",
                    "userEmail": "alex+google1@c9.io"
                }
            };

            setTimeout(function() {
                if (bp) {
                    bp.enabled = false;
                    emit("breakpointUpdate", {breakpoint: bp});
                }
                if (!snapshots) snapshots = [];
                snapshots.unshift({
                    caption: "Snapshot " + id,
                    data: data.breakpoint
                });
                emit("snapshotUpdate", {
                    snapshots: snapshots
                });
            }, 1000);
        }
        
        /**
         * Syncs the debug state to the client
         */
        function sync(breakpoints, reconnect, callback) {
            attached = true;
            state = "running";
            emit("attach", { breakpoints: breakpoints });
            emit("stateChange", { state: state });
            
            updateBreakpoints(breakpoints, reconnect, function(err, remoteBreakpoints) {
                if (!err && remoteBreakpoints.length) {
                    emit("snapshotUpdate", {});
                    mockTakeSnapshot();
                }
                callback();
            });
        }
        
        function updateBreakpoints(breakpoints, reconnect, callback) {
            
            getCloudDebugger(function(e, a) {
                debugger
            });
            
            callback(null, breakpoints);
        }
        
        /**
         * Returns the unique id of a frame
         */
        function getFrameId(frame) {
            return frame.function;
        }
        
        function selectSnapshot(s) {
            activeSnapshot = s;
        }
    
        function formatType(value) {
            switch (value.type) {
                case "undefined":
                case "null":
                    return value.type;
                
                case "error":
                    return value.value || "[Error]";
                    
                case "regexp":
                    return value.text;
    
                case "boolean":
                case "number":
                    return value.value + "";
                    
                case "string":
                    return JSON.stringify(value.value);
    
                case "object":
                    // text: "#<Student>"
                    var name = value.className || (value.text 
                        ? value.text.replace(/#<(.*)>/, "$1") 
                        : "Object");
                    return "[" + name + "]";
    
                case "function":
                    return "function " + value.inferredName + "()";
    
                default:
                    return value.type;
            }
        }

        function frameToString(frame) {
            var str = [];
            var args = frame.arguments;
            var argsStr = [];
    
            str.push(frame.function);
            for (var i = 0, l = args.length; i < l; i++) {
                var arg = args[i];
                if (!arg.name)
                    continue;
                argsStr.push(arg.name);
            }
            str.push(argsStr.join(", "), ")");
            return str.join("");
        }
        
        function toLocalPath(path) {
            return "/" + path;
        }
        
        function createFrame(options, script) {
            var frame = new Frame({
                index: options.index,
                name: frameToString(options),
                column: options.column,
                id: getFrameId(options),
                line: options.location.line - 1,
                path: toLocalPath(options.location.path),
            });
            
            var vars = [];
            
            // Arguments
            options.arguments && options.arguments.forEach(function(arg) {
                vars.push(createVariable(arg, null, "arguments"));
            });
            
            // Local variables
            options.locals && options.locals.forEach(function(local) {
                if (local.name !== ".arguments")
                    vars.push(createVariable(local, null, "locals"));
            });
            
            // // Adding the local object as this
            // vars.push(createVariable({
            //     name: "this",
            //     value: options.receiver,
            //     kind: "this"
            // }));
            
            frame.variables = vars;
            
             /*
             0: Global
             1: Local
             2: With
             3: Closure
             4: Catch >,
                if (scope.type > 1) {*/
            
            // frame.scopes = options.scopes.filter(function(scope) {
            //     return scope.type != 1;
            // }).reverse().map(function(scope) {
            //     return new Scope({
            //         index: scope.index,
            //         type: scopeTypes[scope.type],
            //         frameIndex: frame.index
            //     });
            // });
            
            return frame;
        }
        
        function createVariable(options, name, scope, variable) {
            var value = activeSnapshot.variableTable[options.varTableIndex] || options;
            
            if (variable) {
                variable.value = formatType(options);
                variable.type = options.type;
            }
            else {
                variable = new Variable({
                    name: name || options.name,
                    scope: scope,
                    value: options.value || formatType(value),
                    type: value.type,
                    ref: typeof value.ref == "number" 
                        ? value.ref 
                        : value.handle,
                    children: value.members
                });
            }
            
            if (value.prototypeObject)
                variable.prototype = new Variable({
                    tagName: "prototype",
                    name: "prototype", 
                    type: "object",
                    ref: value.prototypeObject.ref
                });
            if (value.protoObject)
                variable.proto = new Variable({ 
                    tagName: "proto",
                    name: "proto", 
                    type: "object",
                    ref: value.protoObject.ref
                });
            if (value.constructorFunction)
                variable.constructorFunction = new Variable({ 
                    tagName: "constructor", 
                    name: "constructor", 
                    type: "function",
                    ref: value.constructorFunction.ref
                });
            return variable;
        }
        
        /***** Event Handler *****/
    
        function onChangeFrame(frame, silent) {
            activeFrame = frame;
            if (!silent)
                emit("frameActivate", { frame: frame });
        }
    
        /***** Methods *****/
        
        function getProxySource(process){
            return debug.proxySource
                .replace(/\/\/.*/g, "")
                .replace(/[\n\r]/g, "")
                .replace(/\{PORT\}/, (process.runner[0] || process.runner).debugport);
        }
        
        function attach(s, reconnect, callback) {
            socket = s;
            
            // socket.on("back", function(err) {
            //     sync(emit("getBreakpoints"), true, callback);
            // }, plugin);
            // socket.on("error", function(err) {
            //     emit("error", err);
            // }, plugin);
            
            sync(emit("getBreakpoints"), true, callback);
        }
    
        function detach() {
            onChangeFrame(null);
            socket = null;
            attached = false;
            
            emit("detach");
        }
        
        function getSources(callback) {
            // sources = [];
            // callback(null, sources);
            
            // emit("sources", {sources: sources});
            callback(Error("Not Implemented"), null);
        }
        
        function getSource(source, callback) {
            // lookup from git
            // callback(null, source);
            callback(Error("Not Implemented"), null);
        }
        
        function getFrames(callback, silent) {
            var frames = [];
            if (activeSnapshot && activeSnapshot.stackFrames) {
                activeSnapshot.stackFrames.map(function(frame) {
                    frames.push(createFrame(frame));
                });
    
                var topFrame = frames[0];
                if (topFrame)
                    topFrame.istop = true;
            }
            
            emit("getFrames", { frames: frames });
            callback(null, frames);
        }
        
        function getScope(frame, scope, callback) {
            // v8dbg.scope(scope.index, frame.index, true, function(body, refs, error) {
            //     if (error)
            //         return callback(error);
                
            //     var variables = body.object.properties.map(function(prop) {
            //         return createVariable(prop);
            //     });
                
            //     scope.variables = variables;
                
            //     callback(null, variables, scope, frame);
            // });
        }
        
        function getProperties(variable, callback) {
            var properties = variable.data.children.map(function(prop) { 
                return createVariable(prop);
            });
            variable.properties = properties;
            callback(null, properties, variable);
        }
            
        function setBreakpoint(bp, callback) {
            var sm = bp.sourcemap || {};
            var path = sm.source || bp.path;
            var line = sm.line || bp.line;
            var column = sm.column || bp.column;
            
            if (!path) {
                // TODO find out why this happens
                callback && callback(new Error("Ignoring breakpoint with invalid path."));
                return false;
            }
            
            mockTakeSnapshot(bp);
            
            // if (info.actual_locations) {
            //     bp.actual = info.actual_locations[0];
            //     emit("breakpointUpdate", {breakpoint: bp});
            // }
            // callback && callback(null, bp, info);
            
            return true;
        }
        
        function changeBreakpoint(bp, callback) {
            
        }
        
        function clearBreakpoint(bp, callback) {
            
        }
        
        function listBreakpoints(callback) {
            
        }
        
        function serializeVariable(variable, callback) {
            
        }

        /***** Lifecycle *****/
        
        plugin.on("load", function(){
            debug.registerDebugger(TYPE, plugin);
        });
        plugin.on("unload", function(){
            debug.unregisterDebugger(TYPE, plugin);
            
            breakpointQueue = null;
            attached = false;
            state = null;
            activeFrame = null;
            sources = null;
            socket = null;
            activeSnapshot = null;
            snapshots = null;
            
            accessToken = "";
            projectId = "";
            projectNumber = "";
            
            clouddebugger = null;
            gapi = null;
        });
        
        /***** Register and define API *****/
        
        /**
         * Debugger implementation for Cloud9. When you are implementing a 
         * custom debugger, implement this API. If you are looking for the
         * debugger interface of Cloud9, check out the {@link debugger}.
         * 
         * This interface is defined to be as stateless as possible. By 
         * implementing these methods and events you'll be able to hook your
         * debugger seamlessly into the Cloud9 debugger UI.
         * 
         * See also {@link debugger#registerDebugger}.
         * 
         * @class debugger.implementation
         */
        plugin.freezePublicAPI({
            /**
             * Specifies the features that this debugger implementation supports
             * @property {Object} features
             * @property {Boolean} features.scripts                 Able to download code (disable the scripts button)
             * @property {Boolean} features.conditionalBreakpoints  Able to have conditional breakpoints (disable menu item)
             * @property {Boolean} features.liveUpdate              Able to update code live (don't do anything when saving)
             * @property {Boolean} features.updateWatchedVariables  Able to edit variables in watches (don't show editor)
             * @property {Boolean} features.updateScopeVariables    Able to edit variables in variables panel (don't show editor)
             * @property {Boolean} features.setBreakBehavior        Able to configure break behavior (disable break behavior button)
             * @property {Boolean} features.executeCode             Able to execute code (disable REPL)
             * @property {Boolean} features.snapshotDebugger        Only able to take snapshots (disable pause/continue buttons)
             */
            features: {
                scripts: false,
                conditionalBreakpoints: true,
                liveUpdate: false,
                updateWatchedVariables: false,
                updateScopeVariables: false,
                setBreakBehavior: false,
                executeCode: false,
                snapshotDebugger: true
            },
            /**
             * The type of the debugger implementation. This is the identifier 
             * with which the runner selects the debugger implementation.
             * @property {String} type
             * @readonly
             */
            type: TYPE,
            /**
             * @property {null|"running"|"stopped"} state  The state of the debugger process
             * <table>
             * <tr><td>Value</td><td>      Description</td></tr>
             * <tr><td>null</td><td>       process doesn't exist</td></tr>
             * <tr><td>"stopped"</td><td>  paused on breakpoint</td></tr>
             * <tr><td>"running"</td><td>  process is running</td></tr>
             * </table>
             * @readonly
             */
            get state(){ return state; },
            /**
             * 
             */
            get attached(){ return attached; },
            
            _events: [
                /**
                 * Fires when the debugger is attached.
                 * @event attach
                 * @param {Object}  e
                 * @param {debugger.Breakpoint[]}   e.breakpoints        A list of breakpoints that is set in the running process
                 */
                "attach",
                /**
                 * Fires when the debugger is detached.
                 * @event detach
                 */
                "detach",
                /**
                 * Fires when execution is suspended (paused)
                 * @event suspend
                 */
                "suspend",
                /**
                 * Fires when the source of a file is updated
                 * @event setScriptSource
                 * @param {Object} e
                 */
                "setScriptSource",
                /**
                 * Fires when the socket experiences an error
                 * @event error
                 */
                "error",
                /**
                 * Fires when the current list of breakpoints is needed
                 * @event getBreakpoints
                 */
                "getBreakpoints",
                /**
                 * Fires when a breakpoint is updated. This can happen when it
                 * is set at a location which is not an expression. Certain
                 * debuggers (such as v8) will move the breakpoint location to
                 * the first expression that's next in source order.
                 * @event breakpointUpdate
                 * @param {Object}               e
                 * @param {debugger.Breakpoint}  e.breakpoint  
                 */
                "breakpointUpdate",
                /**
                 * Fires when the debugger hits a breakpoint.
                 * @event break
                 * @param {Object}           e
                 * @param {debugger.Frame}   e.frame        The frame where the debugger has breaked at.
                 * @param {debugger.Frame[]} [e.frames]     The callstack frames.
                 */
                "break",
                /**
                 * Fires when the {@link #state} property changes
                 * @event stateChange
                 * @param {Object}          e
                 * @param {debugger.Frame}  e.state  The new value of the state property.
                 */
                "stateChange",
                /**
                 * Fires when the debugger hits an exception.
                 * @event exception
                 * @param {Object}          e
                 * @param {debugger.Frame}  e.frame      The frame where the debugger has breaked at.
                 * @param {Error}           e.exception  The exception that the debugger breaked at.
                 */
                "exception",
                /**
                 * Fires when a frame becomes active. This happens when the debugger
                 * hits a breakpoint, or when it starts running again.
                 * @event frameActivate
                 * @param {Object}          e
                 * @param {debugger.Frame/null}  e.frame  The current frame or null if there is no active frame.
                 */
                "frameActivate",
                /**
                 * Fires when the result of the {@link #method-getFrames} call comes in.
                 * @event getFrames
                 * @param {Object}            e
                 * @param {debugger.Frame[]}  e.frames  The frames that were retrieved.
                 */
                "getFrames",
                /**
                 * Fires when the result of the {@link #getSources} call comes in.
                 * @event sources
                 * @param {Object}            e
                 * @param {debugger.Source[]} e.sources  The sources that were retrieved.
                 */
                "sources",
                /**
                 * Fires when a source file is (re-)compiled. In your event 
                 * handler, make sure you check against the sources you already 
                 * have collected to see if you need to update or add your source.
                 * @event sourcesCompile 
                 * @param {Object}          e
                 * @param {debugger.Source} e.file  the source file that is compiled.
                 **/
                "sourcesCompile"
            ],
            
            /**
             * Attaches the debugger to the started process.
             * @param {Object}                runner        A runner as specified by {@link run#run}.
             * @param {debugger.Breakpoint[]} breakpoints   The set of breakpoints that should be set from the start
             */
            attach: attach,
            
            /**
             * Detaches the debugger from the started process.
             */
            detach: detach,
            
            /**
             * Loads all the active sources from the process
             * 
             * @param {Function}          callback          Called when the sources are retrieved.
             * @param {Error}             callback.err      The error object if an error occured.
             * @param {debugger.Source[]} callback.sources  A list of the active sources.
             * @fires sources
             */
            getSources: getSources,
            
            
            selectSnapshot: selectSnapshot,
            /**
             * Retrieves the contents of a source file
             * @param {debugger.Source} source             The source to retrieve the contents for
             * @param {Function}        callback           Called when the contents is retrieved
             * @param {Error}           callback.err       The error object if an error occured.
             * @param {String}          callback.contents  The contents of the source file
             */
            getSource: getSource,
            
            /**
             * Retrieves the current stack of frames (aka "the call stack") 
             * from the debugger.
             * @param {Function}          callback          Called when the frame are retrieved.
             * @param {Error}             callback.err      The error object if an error occured.
             * @param {debugger.Frame[]}  callback.frames   A list of frames, where index 0 is the frame where the debugger has breaked in.
             * @fires getFrames
             */
            getFrames: getFrames,
            
            /**
             * Retrieves the variables from a scope.
             * @param {debugger.Frame}      frame               The frame to which the scope is related.
             * @param {debugger.Scope}      scope               The scope from which to load the variables.
             * @param {Function}            callback            Called when the variables are loaded
             * @param {Error}               callback.err        The error object if an error occured.
             * @param {debugger.Variable[]} callback.variables  A list of variables defined in the `scope`.
             * @param {debugger.Scope}      callback.scope      The scope to which these variables belong
             * @param {debugger.Frame}      callback.frame      The frame related to the scope.
             */
            getScope: getScope,
            
            /**
             * Retrieves and sets the properties of a variable.
             * @param {debugger.Variable}   variable             The variable for which to retrieve the properties.
             * @param {Function}            callback             Called when the properties are loaded
             * @param {Error}               callback.err         The error object if an error occured.
             * @param {debugger.Variable[]} callback.properties  A list of properties of the variable.
             * @param {debugger.Variable}   callback.variable    The variable to which the properties belong.
             */
            getProperties: getProperties,
            
            /**
             * Adds a breakpoint to a line in a source file.
             * @param {debugger.Breakpoint} breakpoint           The breakpoint to add.
             * @param {Function}            callback             Called after the expression has executed.
             * @param {Error}               callback.err         The error if any error occured.
             * @param {debugger.Breakpoint} callback.breakpoint  The added breakpoint
             * @param {Object}              callback.data        Additional debugger specific information.
             */
            setBreakpoint: setBreakpoint,
            
            /**
             * Updates properties of a breakpoint
             * @param {debugger.Breakpoint} breakpoint  The breakpoint to update.
             * @param {Function}            callback             Called after the expression has executed.
             * @param {Error}               callback.err         The error if any error occured.
             * @param {debugger.Breakpoint} callback.breakpoint  The updated breakpoint
             */
            changeBreakpoint: changeBreakpoint,
            
            /**
             * Removes a breakpoint from a line in a source file.
             * @param {debugger.Breakpoint} breakpoint  The breakpoint to remove.
             * @param {Function}            callback             Called after the expression has executed.
             * @param {Error}               callback.err         The error if any error occured.
             * @param {debugger.Breakpoint} callback.breakpoint  The removed breakpoint
             */
            clearBreakpoint: clearBreakpoint,
            
            /**
             * Retrieves a list of all the breakpoints that are set in the 
             * debugger.
             * @param {Function}              callback              Called when the breakpoints are retrieved.
             * @param {Error}                 callback.err          The error if any error occured.
             * @param {debugger.Breakpoint[]} callback.breakpoints  A list of breakpoints
             */
            listBreakpoints: listBreakpoints,
            
            /**
             * Retrieve the value of a variable
             * @param {debugger.Variable} variable       The variable for which to retrieve the value
             * @param {Function}          callback
             * @param {Function}          callback       Called when the value is retrieved
             * @param {String}            callback.value The value of the variable
             */
            serializeVariable: serializeVariable,
            
            /**
             * Returns the source of the proxy
             */
            getProxySource: getProxySource,
        });
        
        register(null, {
            googleCloudDebugger : plugin
        });
    }
});