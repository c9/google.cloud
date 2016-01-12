define(function(require, exports, module) {
    main.consumes = [
        "Plugin", "c9", "ext",
        "google.cloud",
    ];
    main.provides = ["google.vfs.credentials"];
    return main;

    function main(options, imports, register) {
        //
        // Imports
        //

        var Plugin = imports["Plugin"];
        var c9 = imports["c9"];
        var ext = imports["ext"];
        var googlecloud = imports["google.cloud"];

        //
        // Local variables
        //

        var remote;

        //
        // Plugin declaration
        //

        var plugin = new Plugin("Cloud9", main.consumes);
        var emit = plugin.getEmitter();

        function noop() {
            if (1 || c9.debug) console.info.apply(console, arguments);
        }

        function load() {
            if (c9.connected) {
                plugin.loadVfsExtension(function() {
                    plugin.loadCredentials();
                });
            }

            c9.on("connect", function() {
                plugin.loadVfsExtension(function() {
                    plugin.loadCredentials();
                });
            }, plugin);

            c9.on("disconnect", function() {
                // remote = null;
            }, plugin);
        }

        function unload() {
            remote = null;
        }

        plugin.on("load", load);
        plugin.on("unload", unload);

        //
        // Helpers
        //

        /**
         * Bind the given method and parameters to the connected VFS extension.
         *
         * The resulting wrapper function will forward calls to the VFS proxy
         * object and back.
         *
         * The last arguments must be a callback.
         *
         * @param {String} methodName
         *   the name of the method to call on the VFS extension
         *
         * @param {String[]} argsDef
         *   a list of arguments required for the VFS extension
         *
         * @return {Function}
         *   the wrapper function
         */
        function bindRemote(methodName, argsDef) {
            if (argsDef == null) {
                argsDef = ["callback"];
            }

            return function() {
                if (argsDef.length > 1
                    && arguments.length !== argsDef.length
                    && arguments.length !== argsDef.length - 1
                ) {
                    throw new TypeError("Expected arguments: " + argsDef.join(", "));
                }

                var args = new Array(argsDef.length);

                for (var i = 0; i < args.length; ++i) {
                    args[i] = arguments[i];
                }

                if (typeof args[args.length - 1] !== "function") {
                    args[args.length - 1] = noop;
                }

                var callback = args[args.length - 1];

                if (!remote) {
                    var error = new Error("Extension not loaded");
                    return callback(error);
                }

                var callbackWrapper = function(err, meta) {
                    if (meta && meta.arguments !== undefined
                        && Object.keys(meta).length === 1
                    ) {
                        callback.apply(null, [err].concat(meta.arguments));
                    }
                    else {
                        callback(err, meta);
                    }
                }

                args[args.length - 1] = callbackWrapper;

                remote[methodName].apply(remote, args);
            };
        }

        //
        // Public API declaration
        //

        /**
         * Manages the VFS extension for the `gcloud` credential service.
         *
         * The credential service is based on the developer shell environment.
         * It listens on a well known port and forwards email, project ID, and
         * access token to the `gcloud` CLI utility when connected.
         *
         * To set the credentials manually, call `#setCredentials()`.
         *
         * Call `#loadCredentials()` to synchronize the credentials returned by
         * `google.cloud#getCredentials()`.
         *
         * ```
         * $ nc localhost 33939
         * 2
         * []
         * 110
         * ["alex+google1@c9.io","other-project-1159","ya29.ZwJ000000000000000000000000000000000"]
         * ```
         */
        plugin.freezePublicAPI({
            _events: [
            ],

            /**
             * Load the VFS extension and start listening.
             *
             * If the extension is already loaded, the previous instance is
             * reused automatically.
             *
             * @param {Function} callback
             * @param {Error=}   callback.err
             * @param {Object}   callback.remote  the remote API proxy object
             */
            loadVfsExtension: function(callback) {
                callback = callback || noop;

                if (remote) {
                    return callback(null, remote);
                }

                ext.loadRemotePlugin("google.vfs.credentials", {
                    code: require("text!./ext_google.vfs.credentials.js"),
                    packageDir: options.packageDir,
                }, function(err, remote_) {
                    remote = remote_;

                    if (!err) {
                        // start listening, if ext was freshly loaded
                        remote.listen(function(err) {
                            callback(err, remote);
                        });
                    }
                    else if (err.code === "EEXIST") {
                        // ignore "Extension API already defined for ext" warning
                        callback(null, remote);
                    }
                    else {
                        callback(err);
                    }
                });
            },

            /**
             * Unload the VFS extension and stop listening.
             *
             * @param {Function} callback
             * @param {Error=}   callback.err
             */
            unloadVfsExtension: function(callback) {
                callback = callback || noop;

                if (!remote) {
                    var error = new Error("Extension not loaded");
                    return callback(error);
                }

                plugin.close(function(err) {
                    if (err) return callback(err);

                    ext.unloadRemotePlugin("google.vfs.credentials", {}, function(err) {
                        remote = null;
                        callback(err);
                    });
                });
            },

            /**
             * Fetch the credentials from `google.cloud#getCredentials()` and
             * update the credential service.
             *
             * @param {Function} callback
             * @param {Error=}   callback.err
             */
            loadCredentials: function(callback) {
                callback = callback || noop;

                googlecloud.getCredentials(function(err, credentials) {
                    if (err) {
                        return callback(err);
                    }

                    plugin.setCredentials(
                        credentials.email,
                        credentials.projectId,
                        credentials.accessToken,
                        callback
                    );
                });
            },

            /**
             * Start listening for incoming connections.
             *
             * @param {Function} callback
             * @param {Error=}   callback.err
             * @param {Number}   callback.port
             *   the port that the server is bound to.
             * @param {String}   callback.host
             *   the hostname or IP address that the server is bound to.
             */
            listen: bindRemote("listen", [
                "port", "host", "callback"
            ]),

            /**
             * Stop listening for incoming connections.
             *
             * @param {Function} callback
             * @param {Error=}   callback.err
             */
            close: bindRemote("close", [
                "callback"
            ]),

            /**
             * Set the credentials forwarded by the service.
             *
             * @param {String} userEmail
             *   the account email address 
             *
             * @param {String} projectId
             *   the project ID
             *
             * @param {String} accessToken
             *   the OAuth 2.0 access token
             *
             * @param {Function} callback
             * @param {Error=}   callback.err
             */
            setCredentials: bindRemote("setCredentials", [
                "userEmail", "projectId", "accessToken", "callback"
            ]), 

            /**
             * Check if the service has known credentials.
             *
             * @param {Function} callback
             * @param {Error=}   callback.err
             * @param {boolean}  callback.hasCredentials
             */
            hasCredentials: bindRemote("hasCredentials", [
                "callback"
            ]),


            /**
             * Clear credentials known by the service.
             *
             * @param {Function} callback
             * @param {Error=}   callback.err
             */
            clearCredentials: bindRemote("clearCredentials", [
                "callback"
            ]),
        });

        register(null, {
            "google.vfs.credentials": plugin
        });
    }
});


