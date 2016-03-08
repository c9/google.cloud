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
                        preview: { path: "https://docs.c9.io/v1.0/docs/google", trusted: true  }
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
