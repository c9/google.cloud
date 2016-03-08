# Cloud9 IDE Plugins for Google Cloud Platform

This project contains the Cloud9 IDE plugins to integrate with Google Cloud
Platform.

 - Default runners for building, running, and deploying to App Engine Managed VM.
 - Custom project menu with deep link to Developers Console.
 - Demo project can be downloaded to the workspace on first run.
 - **lib/CredentialServer.js**: A server process that forwards API credentials
   from the IDE to the `gcloud` command line utility.
 - **lib/PBLiteStreamReader.js** and **lib/PBLiteStreamWriter.js**: Stream
   classes that read and write Google Protocol Buffer 2 messages in the PB-Lite
   (JSON) format and transforms them into `protobuf.js` message objects.
 - `git-credential-c9-gcloud.sh` helper to wait for CredentialServer and block
   git commands until ready.

For information about Cloud9 for Google Cloud Platform, see
https://docs.c9.io/docs/google

## Known Issues

 - The output window for __deploy__ has no stop button and its output can
   become detached.
 - Attempting to deploy a new project can lead to an error if the project is
   not connected to a Billing Account. This error message is combined with
   others and hard to find. Cloud9 should run a pre-check an warn the user if
   the current project is not configured for Billing.

## Pending Features

 - Extend terminal monitor to reload live preview when it sees certain messages
 - Render Java package tree instead of directory/file tree
 - Integrate Google Cloud Debugger for Java debugging
 - Integrate `git commit; git push` into deployment flow
 - Add `hello-world` and `websocket-chat` demo projects
 - Expose App Engine admin panel on port `:8081`
   https://github.com/GoogleCloudPlatform/gcloud-maven-plugin/pull/74
