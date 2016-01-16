#!/bin/bash --login

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
