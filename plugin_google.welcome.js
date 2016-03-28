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
        "Plugin", "tabManager", "settings"
    ];
    main.provides = ["google.welcome"];
    return main;

    function main(options, imports, register) {
        var Plugin = imports["Plugin"];
        var settings = imports.settings;
        var tabs = imports.tabManager;
        var plugin = new Plugin("Cloud9", main.consumes);

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
