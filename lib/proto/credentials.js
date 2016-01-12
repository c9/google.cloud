module.exports = require("protobufjs").newBuilder({})['import']({
    "package": "DevShellCredentials",
    "messages": [
        {
            "name": "CredentialInfoRequest",
            "fields": []
        },
        {
            "name": "CredentialInfoResponse",
            "fields": [
                {
                    "rule": "required",
                    "type": "string",
                    "name": "user_email",
                    "id": 1
                },
                {
                    "rule": "optional",
                    "type": "string",
                    "name": "project_id",
                    "id": 2
                },
                {
                    "rule": "optional",
                    "type": "string",
                    "name": "access_token",
                    "id": 3
                }
            ]
        }
    ],
    "services": [
        {
            "name": "CredentialService",
            "options": {},
            "rpc": {
                "GetCredentialInfo": {
                    "request": "CredentialInfoRequest",
                    "response": "CredentialInfoResponse",
                    "options": {}
                }
            }
        }
    ]
}).build();
