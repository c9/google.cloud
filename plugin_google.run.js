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
        "Plugin", "menus", "ui", "c9", "run", "build", "tabManager", "util",
        "google.cloud",
    ];
    main.provides = ["google.run"];
    return main;

    function main(options, imports, register) {
        //
        // Imports
        //

        var Plugin = imports["Plugin"];
        var c9 = imports["c9"];
        var run = imports["run"];
        var build = imports["build"];
        var tabManager = imports["tabManager"];
        var util = imports["util"];
        var googlecloud = imports["google.cloud"];

        //
        // Plugin declaration
        //

        var plugin = new Plugin("Cloud9 IDE, Inc.", main.consumes);

        function debug() {
            if (1 || c9.debug) console.info.apply(console, arguments);
        }

        function noop() {
            if (1 || c9.debug) console.info.apply(console, arguments);
        }

        function load() {
            run.addRunner("Java Managed VM: mvn gcloud:run",
                JSON.parse(require("text!./runners/mvn_gcloud_run.run")),
                plugin);

            run.addRunner("Java Managed VM: mvn gcloud:run (watch)",
                JSON.parse(require("text!./runners/mvn_gcloud_watch.run")),
                plugin);

            run.addRunner("Java Managed VM: mvn gcloud:deploy",
                JSON.parse(require("text!./runners/mvn_gcloud_deploy.run")),
                plugin);
        }

        function unload() {
        }

        plugin.on("load", load);
        plugin.on("unload", unload);

        //
        // Public API declaration
        //

        /**
         * Helper methods for runners on `gcloud` workspaces.
         */
        plugin.freezePublicAPI({
            /**
             * Pull a project template into the workspace by running `git pull ...`
             */
            template: function(repoUrl) {
                repoUrl = repoUrl || "https://github.com/xoob/appengine-java-vm-guestbook.git";

                tabManager.open({
                    editorType: "output", 
                    active: true,
                    document: {output: {id: "google_run_clone_template"}}
                }, function() {});

                var process = run.run({
                    "cmd": ["git", "pull", repoUrl],
                    "info": "Cloning project template...",
                    "working_dir": "$project_path",
                }, {
                    path: repoUrl,
                }, "google_run_clone_template", function(err, pid) {
                    if (err) throw err;
                });
            },

            run: function() {
                tabManager.open({
                    editorType: "output", 
                    active: true,
                    document: {output: {id: "google_run_run"}}
                }, function() {});

                run.getRunner("Java Managed VM: mvn gcloud:run", false, function(err, runner) {
                    if (err) throw err;
                    var process = run.run(runner, {
                    }, "google_run_run", function(err, pid) {
                        if (err) throw err;
                    });
                });
            },

            watch: function() {
                tabManager.open({
                    editorType: "output", 
                    active: true,
                    document: {output: {id: "google_run_watch"}}
                }, function() {});

                run.getRunner("Java Managed VM: mvn gcloud:run (watch)", false, function(err, runner) {
                    if (err) throw err;
                    var process = run.run(runner, {
                    }, "google_run_watch", function(err, pid) {
                        if (err) throw err;
                    });
                });
            },

            deploy: function() {
                tabManager.open({
                    editorType: "output", 
                    active: true,
                    document: {output: {id: "google_run_deploy"}}
                }, function() {});

                run.getRunner("Java Managed VM: mvn gcloud:deploy", false, function(err, runner) {
                    if (err) throw err;
                    var process = run.run(runner, {
                    }, "google_run_deploy", function(err, pid) {
                        if (err) throw err;
                    });
                });
            },
        });

        register(null, {
            "google.run": plugin
        });
    }
});

