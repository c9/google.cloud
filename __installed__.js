define(function(require, exports, module) {
    /*
     * List module paths that should be loaded by the IDE,
     * if loaded without `?debug=2`
     */
     return [
         "plugins/google.cloud/plugin_google.cloud",
         "plugins/google.cloud/plugin_google.vfs.credentials",
         "plugins/google.cloud/plugin_google.menu",
         "plugins/google.cloud/plugin_google.run",
         "plugins/google.cloud/plugin_google.welcome",
         "plugins/google.cloud/cloud_debugger",
     ];
});