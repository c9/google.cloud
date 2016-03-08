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

define(function(require, exports, module) {
    main.consumes = [
        "Plugin", "dialog.error", "dialog.confirm",
        "c9", "linked-services", "api",
    ];
    main.provides = ["google.cloud"];
    return main;

    function main(options, imports, register) {
        //
        // Imports
        //

        var Plugin = imports["Plugin"];
        var showError = imports["dialog.error"].show;
        var showConfirm = imports["dialog.confirm"].show;
        var linkedServices = imports["linked-services"];
        var c9 = imports["c9"];
        var api = imports["api"];

        var _ = require("lodash");
        var async = require("async");

        //
        // Constants
        //

        var STATUS_NEW = "new";
        var STATUS_LOADING = "loading";
        var STATUS_READY = "ready";
        var STATUS_ERROR = "error";

        //
        // Local variables
        //

        var repo;
        var account;
        var accessToken;
        var status = STATUS_NEW;

        //
        // Plugin declaration
        //

        var plugin = new Plugin("Cloud9", main.consumes);
        var emit = plugin.getEmitter();

        function debug() {
            if (1 || c9.debug) console.info.apply(console, arguments);
        }

        function noop() {
            if (1 || c9.debug) console.info.apply(console, arguments);
        }

        function load() {
            if (c9.connected) {
                authenticate();
            }
            else {
                c9.once("connect", authenticate, plugin);
            }
        }

        function unload() {
            repo = null;
            account = null;
            accessToken = null;
            status = STATUS_NEW;
        }

        plugin.on("load", load);
        plugin.on("unload", unload);

        //
        // Helpers
        //

        function authenticate(callback) {
            callback = callback || noop;

            if (status === STATUS_NEW) {
                debug("authenticating");

                status = STATUS_LOADING;

                async.auto({
                    project: [function(next, ctx) {
                        debug("fetching project metadata");
                        api.project.get("", function(err, res) {
                            next(err, res);
                        });
                    }],

                    repo: ["project", function(next, ctx) {
                        debug("fetching repo metadata for scmurl:",
                              ctx.project.scmurl);

                        if (!ctx.project.scmurl)
                            throw new Error("Missing `scmurl` for project");

                        api.user.get("services/repo", {
                            query: {url: ctx.project.scmurl},
                        }, function(err, res) {
                            if (err) return next(err);

                            if (!res || !res.repo || !res.repo.googleProject) {
                                var error = new Error("Could not fetch Google Cloud repository configuration. Please contact support.");
                                return next(error);
                            }

                            next(null, res.repo);
                        });
                    }],

                    account: [function(next, ctx) {
                        linkedServices.getServices(function(err, services) {
                            if (!services.google) {
                                var error = new Error("No Google account associated with your workspace. Please contact support.");
                                return next(error);
                            }

                            var account = _.find(services.google.accounts, function(account) {
                                return _.some(account.projects, { id: c9.projectId });
                            });

                            if (!account) {
                                var error = new Error("This workspace is not linked to a Google account. Please recreate your workspace.");
                                return next(error);
                            }

                            next(null, account);
                        });
                    }],

                    accessToken: ["account", function(next, ctx) {
                        linkedServices.getAccessToken(ctx.account.id, function(err, result) {
                            //accessToken = result;

                            //if (accessToken && !accessToken.expires_in) {
                                //accessToken.timeout = setTimeout(function() {
                                    //accessToken = null;
                                //}, 30 * 60 * 1000);
                            //}

                            next(err, result);
                        });
                    }],
                }, function(err, results) {
                    debug(err, results);

                    if (err) {
                        if (err.code === 0)
                            err.code = "EDISCONNECT";

                        if (!err.message)
                            err.message = "Could not load your Google account. Please try reloading your workspace.";

                        status = STATUS_ERROR;
                        emit("error", err, plugin);
                        throw err;
                    }

                    repo = results && results.repo;
                    account = results && results.account;
                    accessToken = results && results.accessToken;

                    status = STATUS_READY;
                    emit.sticky("ready", {}, plugin);
                });
            }

            plugin.once("ready", function() {
                callback(null);
            });
        }

        //
        // Public API declaration
        //

        /**
         * Access information about the Google Cloud Platform project linked to
         * this workspace.
         */
        plugin.freezePublicAPI({
            STATUS_NEW: STATUS_NEW,
            STATUS_LOADING: STATUS_LOADING,
            STATUS_READY: STATUS_READY,
            STATUS_ERROR: STATUS_ERROR,

            _events: [
                "loading",
                "ready",
                "error",
            ],

            get status() {
                return status;
            },

            authenticate: function(callback) {
                callback = callback || noop;

                authenticate(function(err) {
                    callback(err, plugin);
                });
            },

            getAccountInfo: function() {
                return {
                    "localId": string,
                    "email": string,
                    "emailVerified": boolean,
                    "displayName": string,
                    "providerUserInfo": [
                        {
                            "providerId": "google.com",
                            "displayName": string,
                            "photoUrl": string,
                            "federatedId": string
                        }
                    ],
                    "photoUrl": string,
                    "passwordHash": bytes,
                    "salt": bytes,
                    "version": integer,
                    "passwordUpdatedAt": double
                };
            },

            getCredentials: function(callback) {
                callback = callback || noop;

                authenticate(function(err) {
                    if (err) return callback(err);
                    callback(null, {
                        "email": account.metadata.email,
                        "projectId": repo.googleProject.projectId,
                        "accessToken": accessToken.google_access_token,
                    });
                });
            },

            getProject: function(callback) {
                async.auto({
                    project: [function(next, ctx) {
                        api.project.get("", function(err, res) {
                            next(err, res);
                        });
                    }],

                    repo: ["project", function(next, ctx) {
                        api.user.get("services/repo", {
                            query: {url: ctx.project.scmurl},
                        }, function(err, res) {
                            next(err, res && res.repo);
                        });
                    }],
                }, function(err, results) {
                    if (err) return callback(err);
                    callback(null, results);
                });
            },

            /**
             * Get the Google project ID. This is the default identifier for
             * most API requests.
             *
             * Returns the unique, user-assigned ID of the project. It must be
             * 6 to 30 lowercase letters, digits, or hyphens. It must start
             * with a letter. Trailing hyphens are prohibited.
             *
             * @param {Function} callback
             * @param {Error=}   callback.err
             * @param {String}   callback.projectId
             *
             * ```
             * "silver-treat-115214"
             * ```
             */
            getProjectId: function(callback) {
                callback = callback || noop;

                authenticate(function(err) {
                    if (err) return callback(err);
                    callback(null, repo.googleProject.projectId);
                });
            },

            /**
             * Get the numeric Google project number
             *
             * @param {Function} callback
             * @param {Error=}   callback.err
             * @param {String}   callback.projectNumber
             *
             * ```
             * "516032198007"
             * ```
             */
            getProjectNumber: function(callback) {
                callback = callback || noop;

                authenticate(function(err) {
                    if (err) return callback(err);
                    callback(null, repo.googleProject.projectNumber);
                });
            },

            /**
             * Get the display name of the Google project
             *
             * @param {Function} callback
             * @param {Error=}   callback.err
             * @param {String}   callback.name
             *
             * ```
             * "My Project"
             * ```
             */
            getProjectName: function(callback) {
                callback = callback || noop;

                authenticate(function(err) {
                    if (err) return callback(err);
                    callback(null, repo.googleProject.name);
                });
            },

            /**
             * Get the ID of the App Engine module
             *
             * @param {Function} callback
             * @param {Error=}   callback.err
             * @param {String}   callback.moduleId
             *
             * ```
             * "default"
             * ```
             */
            getModuleId: function(callback) {
                callback = callback || noop;

                authenticate(function(err) {
                    if (err) return callback(err);
                    callback(null,
                        repo.googleProject.appEngine.module && repo.googleProject.appEngine.module.id);
                });
            },

            /**
             * Get the IDs of the App Engine module versions
             *
             * @param {Function} callback
             * @param {Error=}   callback.err
             * @param {String[]} callback.versionIds
             *
             * ```
             * ["20151209t160454", "20151214t153409", "ah-builtin-datastoreservice"]
             * ```
             */
            getVersionIds: function(callback) {
                callback = callback || noop;

                authenticate(function(err) {
                    if (err) return callback(err);
                    callback(null, _.pluck(repo.googleProject.appEngine.versions, "id"));
                });
            },
        });

        register(null, {
            "google.cloud": plugin
        });
    }
});

