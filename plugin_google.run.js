define(function(require, exports, module) {
    main.consumes = [
        "Plugin", "menus", "ui", "c9", "run", "build", "tabManager", "util",
        "google.cloud",
    ];
    main.provides = ["google.run"];
    return main;

    function main(options, imports, register) {
        /*
         * Imports
         */
        var Plugin = imports["Plugin"];
        var c9 = imports["c9"];
        var run = imports["run"];
        var build = imports["build"];
        var tabManager = imports["tabManager"];
        var util = imports["util"];
        var googlecloud = imports["google.cloud"];

        var _ = require("lodash");
        var async = require("async");

        /*
         * Local variables
         */
        var loaded;

        /*
         * Plugin declaration
         */
        var plugin = new Plugin("Cloud9 IDE, Inc.", main.consumes);

        function debug() {
            if (1 || c9.debug) console.info.apply(console, arguments);
        }

        function noop() {
            if (1 || c9.debug) console.info.apply(console, arguments);
        }

        function load() {
            if (loaded) return;
            loaded = true;

            run.addRunner("Google: mvn gcloud:run",
                JSON.parse(require("text!./runners/mvn_gcloud_run.run")),
                plugin);

            run.addRunner("Google: mvn gcloud:deploy",
                JSON.parse(require("text!./runners/mvn_gcloud_deploy.run")),
                plugin);

            build.addBuilder("Google: mvn install",
                JSON.parse(require("text!./builders/mvn_install.build")),
                plugin);
        }

        function unload() {
            loaded = false;
        }

        plugin.on("load", load);
        plugin.on("unload", unload);

        /**
         * Helper methods for runners on `gcloud` workspaces.
         */
        plugin.freezePublicAPI({
            /**
             * Authenticate and configure the `gcloud` utility
             */
            init: function(accountEmail) {
                accountEmail = accountEmail || "alex+google1@c9_io";

                googlecloud.getProjectId(function(err, projectId) {
                    tabManager.open({
                        editorType: "output", 
                        active: true,
                        document: {output: {id: "google_run_init"}}
                    }, function() {});

                    var process = run.run({
                        "cmd": [
                            "bash", "--login", "-c",
                            "gcloud config set project " + util.escapeShell(projectId) + " "
                                + "&& gcloud auth login"
                        ],
                        "info": "[alpha workaround] Initializing gcloud credentials...",
                        "working_dir": "$project_path",
                    }, {}, "google_run_init", function(err, pid) {
                        if (err) throw err;
                    });
                });
            },

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

                run.getRunner("Google: mvn gcloud:run", false, function(err, runner) {
                    if (err) throw err;
                    var process = run.run(runner, {
                    }, "google_run_run", function(err, pid) {
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

                run.getRunner("Google: mvn gcloud:deploy", false, function(err, runner) {
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

