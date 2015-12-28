define(function(require, exports, module) {
    main.consumes = [
        "Plugin", "menus", "ui", "c9", 
        "google.cloud", "google.run",
    ];
    main.provides = ["google.menu"];
    return main;

    function main(options, imports, register) {
        /*
         * Imports
         */
        var Plugin = imports["Plugin"];
        var menus = imports["menus"];
        var ui = imports["ui"];
        var c9 = imports["c9"];
        var googlecloud = imports["google.cloud"];
        var googlerun = imports["google.run"];

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

        function load() {
            if (loaded) return;
            loaded = true;

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

            menus.addItemByPath("google.cloud/initialize workspace", new ui.item({
                onclick: function() {
                    googlerun.init();
                }
            }), 70, plugin);
            menus.addItemByPath("google.cloud/pull template", null, 71, plugin);
            menus.addItemByPath("google.cloud/pull template/github.com:xoob:appengine-java-vm-guestbook", new ui.item({
                onclick: function() {
                    googlerun.template("https://github.com/xoob/appengine-java-vm-guestbook.git");
                }
            }), 72, plugin);
            menus.addItemByPath("google.cloud/run locally", new ui.item({
                onclick: function() {
                    googlerun.run();
                }
            }), 80, plugin);
            menus.addItemByPath("google.cloud/deploy", new ui.item({
                onclick: function() {
                    googlerun.deploy();
                }
            }), 81, plugin);

            menus.addItemByPath("google.cloud/~", new ui.divider(), 89, plugin);

            menus.addItemByPath("google.cloud/Developers Console ↗︎", new ui.item({
                onclick: function() {
                    googlecloud.getProjectId(function(err, projectId) {
                        window.open("https://console.developers.google.com/home/dashboard?project="
                            + encodeURIComponent(projectId));
                    });
                }
            }), 100, plugin);

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
                buttonMenu.setCaption("Google: Connection Failed");
                buttonMenu.$html.style = "background-color: #E73B3B; color: #fff;";
            });
        }

        function unload() {
            loaded = false;
        }

        plugin.on("load", load);
        plugin.on("unload", unload);

        /**
         * Render the Google Cloud Platform menu.
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

