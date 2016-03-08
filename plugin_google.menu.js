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
        "Plugin", "menus", "ui", "c9", "layout", "dialog.alert", "dialog.error",
        "google.cloud", "google.run",
    ];
    main.provides = ["google.menu"];
    return main;

    function main(options, imports, register) {
        //
        // Imports
        //

        var Plugin = imports["Plugin"];
        var menus = imports["menus"];
        var ui = imports["ui"];
        var c9 = imports["c9"];
        var layout = imports["layout"];
        var showAlert = imports["dialog.alert"].show;
        var showError = imports["dialog.error"].show;
        var googlecloud = imports["google.cloud"];
        var googlerun = imports["google.run"];

        //
        // Plugin declaration
        //

        var plugin = new Plugin("Cloud9", main.consumes);

        function load() {
            var buttonMenu;
            var itemProjectId;
            var itemProjectNumber;

            // initialize menus

            menus.addItemByPath("google.cloud", null, 0, plugin);
            menus.addItemByPath("google.cloud/Project ID",
                (itemProjectId = new ui.item({disabled: true})), 50, plugin);
            menus.addItemByPath("google.cloud/Project Number",
                (itemProjectNumber = new ui.item({disabled: true})), 51, plugin);

            menus.addItemByPath("google.cloud/~", new ui.divider(), 55, plugin);

            menus.addItemByPath("google.cloud/Developers Console ↗︎", new ui.item({
                onclick: function() {
                    googlecloud.getProjectId(function(err, projectId) {
                        window.open("https://console.developers.google.com/home/dashboard?project="
                            + encodeURIComponent(projectId));
                    });
                }
            }), 100, plugin);

            // initialize deploy button

            var menuBarTools = layout.findParent({name: "run.gui"});

            var buttonDeploy = ui.insertByIndex(menuBarTools, new ui.button({
                id: "googleBtnDeploy",
                skin: "c9-toolbarbutton-glossy",
                caption: "Deploy",
                class: "google deploybtn stopped",
                onclick: function(e) {
                    googlerun.deploy();
                },
            }), 300, plugin);

            // bind menu captions

            buttonMenu = menus.get("google.cloud").item;

            buttonMenu.setCaption("Loading…");
            buttonMenu.$html.style = "background-color: #3B78E7; color: #fff;";

            googlecloud.on("ready", function() {
                googlecloud.getProjectName(function(err, projectName) {
                    buttonMenu.setCaption(projectName);
                });
                googlecloud.getProjectId(function(err, projectId) {
                    itemProjectId.setAttribute("caption", projectId);
                });
                googlecloud.getProjectNumber(function(err, projectNumber) {
                    itemProjectNumber.setAttribute("caption", "(#" + projectNumber + ")");
                });
            }, plugin);

            googlecloud.on("error", function(err) {
                showError(err.message || err);

                if (err.message.match(/unauthorized_client/) || err.message.match(/invalid_grant/)) {
                    showAlert(
                        "Google Cloud Platform",
                        "Authentication expired, please sign in again and reload this workspace.",
                        "",
                        function() {
                            window.open("https://c9.io/auth/google");
                        }
                    );
                }

                buttonMenu.setCaption("Google: Connection Failed");
                buttonMenu.$html.style = "background-color: #E73B3B; color: #fff;";
            });
        }

        function unload() {
        }

        plugin.on("load", load);
        plugin.on("unload", unload);

        //
        // Public API declaration
        //

        /**
         * Render the Google Cloud Platform menus and buttons.
         */
        plugin.freezePublicAPI({
            getMenu: function() {
                return menus.get("google.cloud");
            },
        });

        register(null, {
            "google.menu": plugin
        });
    }
});

