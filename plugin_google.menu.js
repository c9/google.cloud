define(function(require, exports, module) {
    main.consumes = [
        "Plugin", "menus", "ui", "c9", "layout", 
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
        var layout = imports["layout"];
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

            // initialize preview/run buttons

            var canRun = false;
            var canDeploy = false;

            canRun = canDeploy = true;

            var menuBarTools = layout.findParent({name: "run.gui"});

            var buttonRun, submenuRun, msgRun1, msgRun2, msgRun3;
            submenuRun = new ui.menu({
                "onprop.visible": function(e) {
                    msgRun1.setAttribute("visible", !canRun);
                    msgRun2.setAttribute("visible", !canRun);
                    msgRun3.setAttribute("visible", !canRun);
                }
            });
            menus.addItemByPath("Google/Run/", submenuRun, 1000, plugin);
            menus.addItemByPath("Google/Run/NotAvailable1", msgRun1 = new ui.item({
                disabled: true,
            }), 101, plugin);
            menus.addItemByPath("Google/Run/NotAvailable2", msgRun2 = new ui.item({
                disabled: true,
            }), 102, plugin);
            menus.addItemByPath("Google/Run/NotAvailable3", msgRun3 = new ui.item({
                disabled: true,
            }), 103, plugin);
            msgRun1.setAttribute("caption", "Oops! Your type of project is not yet supported by Cloud9 for Google Cloud Platform.");
            msgRun2.setAttribute("caption", "Try out the example projects that use Java on App Engine Managed VMs");
            msgRun3.setAttribute("caption", "or run 'dev_appserver.py' manually in the terminal.");
            buttonRun = ui.insertByIndex(menuBarTools, new ui.button({
                id: "googleBtnRun",
                skin: "c9-toolbarbutton-glossy",
                caption: "Run",
                //disabled: true,
                class: "google runbtn stopped",
                icon: "run.png",
                submenu: submenuRun,
                onclick: function(e) {
                    if (canRun) {
                        googlerun.watch();
                    }
                },
                onmouseover: function(e) {
                    if (!canRun) {
                        this.showMenu();
                        this.setValue(true);
                    }
                },
                onmouseout: function(e) {
                    if (!canRun) {
                        this.hideMenu();
                        this.setValue(false);
                        return false;
                    }
                },
            }), 200, plugin);

            var buttonDeploy, submenuDeploy, msgDeploy1, msgDeploy2, msgDeploy3;
            submenuDeploy = new ui.menu({
                "onprop.visible": function(e) {
                    msgDeploy1.setAttribute("visible", !canDeploy);
                    msgDeploy2.setAttribute("visible", !canDeploy);
                    msgDeploy3.setAttribute("visible", !canDeploy);
                }
            });
            menus.addItemByPath("Google/Deploy/", submenuDeploy, 1000, plugin);
            menus.addItemByPath("Google/Deploy/NotAvailable1", msgDeploy1 = new ui.item({
                disabled: true,
            }), 101, plugin);
            menus.addItemByPath("Google/Deploy/NotAvailable2", msgDeploy2 = new ui.item({
                disabled: true,
            }), 102, plugin);
            menus.addItemByPath("Google/Deploy/NotAvailable3", msgDeploy3 = new ui.item({
                disabled: true,
            }), 103, plugin);
            msgDeploy1.setAttribute("caption", "Oops! Your type of project is not yet supported by Cloud9 for Google Cloud Platform.");
            msgDeploy2.setAttribute("caption", "Try out the example projects that use Java on App Engine Managed VMs");
            msgDeploy3.setAttribute("caption", "or run 'gcloud' manually in the terminal.");
            buttonDeploy = ui.insertByIndex(menuBarTools, new ui.button({
                id: "googleBtnDeploy",
                skin: "c9-toolbarbutton-glossy",
                caption: "Deploy",
                //disabled: true,
                class: "google deploybtn stopped",
                submenu: submenuDeploy,
                onclick: function(e) {
                    if (canDeploy) {
                        googlerun.deploy();
                    }
                },
                onmouseover: function(e) {
                    if (!canDeploy) {
                        this.showMenu();
                        this.setValue(true);
                    }
                },
                onmouseout: function(e) {
                    if (!canDeploy) {
                        this.hideMenu();
                        this.setValue(false);
                        return false;
                    }
                },
            }), 300, plugin);

            //debugger;
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

