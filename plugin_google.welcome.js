define(function(require, exports, module) {
    main.consumes = [
        "Plugin", "tabManager", "settings"
    ];
    main.provides = ["google.welcome"];
    return main;

    function main(options, imports, register) {
        var Plugin = imports["Plugin"];
        var settings = imports.settings;
        var tabs = imports.tabManager;
        var plugin = new Plugin("Cloud9 IDE, Inc.", main.consumes);

        function load() {
            tabs.once("ready", function() {
                if (settings.getBool("user/welcome/@first_google"))
                    return;
                
                settings.set("user/welcome/@first_google", true);
                tabs.open({
                    editorType: "preview",
                    active: true,
                    document: {
                        preview: { path: "https://docs.c9.io/v1.0/docs/google" }
                    }
                });
            });
        }
        
        plugin.on("load", load);
        plugin.on("unload", function() {});

        register(null, {
            "google.welcome": plugin
        });
    }
    
});