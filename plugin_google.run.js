// Copyright (c) 2016 Cloud9 IDE, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

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

