#!/bin/bash --login

# Copyright 2016 Cloud9 IDE, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS-IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

readonly ENOAUTH=100
readonly ENOPROJECT=101

##
# Check that `gcloud` has a credentialed account and is ready to execute other
# commands.
#
# Returns: `$ENOAUTH` if not authenticated,
#          `$ENOPROJECT` if no project configured,
#          `0` otherwise
##
_gcloud_check() {
    local CONFIG="$(gcloud config list)"

    if [[ "$(echo "$CONFIG" | grep 'account = ')" == "" ]]; then
        return $ENOAUTH
    fi

    if [[ "$(echo "$CONFIG" | grep 'project = ')" == "" ]]; then
        return $ENOPROJECT
    fi

    return 0
}

while ! _gcloud_check; do
    WAITED=1
    echo "[git-credential-c9-gcloud] waiting for credentials" >&2
    sleep 1
done

if [[ $WAITED ]]; then
    echo "[git-credential-c9-gcloud] running git..." >&2
fi

git-credential-gcloud.sh "$@"
