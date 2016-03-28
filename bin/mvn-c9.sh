#!/bin/bash

# Copyright (c) 2016 Cloud9 IDE, Inc.
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

readonly EEMPTY=200
readonly EBADCONFIG=201

set -e

red() {
    echo -e "\e[31m\e[1m$1\e[0m"
}

green() {
    echo -e "\e[33m\e[1m$1\e[0m"
}

gray() {
    echo -e "\e[37m$1\e[0m"
}

ask_clone() {
    local MESSAGE="$1"

    gray "$MESSAGE"
    echo ""
    green "  Get started with a tutorial project"
    echo ""
    echo "  Thanks for trying out Cloud9 for Google App Engine. To get started, clone one of"
    echo "  the supported tutorial projects. You can customize the code to fit your needs."
    echo ""
    echo "  This release of Cloud9 supports the following project configurations:"
    echo ""
    echo -e "  \e[32mjava\e[0m  Java Web Application with JSP, Servlets (run local, deploy)"
    echo "        App Engine Java Managed VM"
    echo "        Maven"
    echo ""
    echo "[?] Which project do you want to run?"
    echo ""
    echo " 1) Java Guestbook"
    gray "    https://github.com/xoob/appengine-java-vm-guestbook"
    #echo ""
    #echo " 2) Java Hello World"
    #gray "    https://github.com/xoob/appengine-java-vm-hello-world"
    #echo ""
    #echo " 3) Java WebSocket Chat"
    #gray "    https://github.com/xoob/appengine-java-vm-websocket-chat"
    echo ""
    read -p "Choose a project (1-3) and hit enter: " PROJECT

    case $PROJECT in
        1)
            git pull https://github.com/xoob/appengine-java-vm-guestbook
            git push origin master
            ;;
        #2)
            #git pull https://github.com/xoob/appengine-java-vm-hello-world
            #git push origin master
            #;;
        #3)
            #git pull https://github.com/xoob/appengine-java-vm-websocket-chat
            #git push origin master
            #;;
        *)
            red "Invalid project number"
            exit $EEMPTY
            ;;
    esac
}

err() {
    local MESSAGE="$1"

    gray "$MESSAGE"
    echo ""
    red  "  Project not supported"
    echo ""
    echo "  Thanks for trying out Cloud9 for Google App Engine. At the moment, only a few"
    echo "  well-known project configurations can be run and deployed through the Cloud9"
    echo "  interface. It looks like this project uses a language or format we do not"
    echo "  understand yet."
    echo ""
    echo "  To get started, delete all files in your project and try again. You can also"
    echo "  create a new and empty Google Cloud Platform project and open it in Cloud9."
    echo ""
    echo "  This release of Cloud9 supports the following project configurations:"
    echo ""
    echo -e "  \e[32mjava\e[0m  Java Web Application with JSP, Servlets (run local, deploy)"
    echo "        App Engine Java Managed VM"
    echo "        Maven"

    exit $EBADCONFIG
}

_check_git() {
    if ! git status >/dev/null; then
        ask_clone "workspace not ready: not a git repository"
    fi

    if [[ "$(git ls-files --others --exclude-standard)" == "" ]] &&
        [[ "$(git ls-files)" == "" || $(git ls-files | sort | tr $'\n' -) =~ ^(.gitignore-)?(LICENSE-)?(README-)?$ ]]
    then
        ask_clone "workspace not ready: empty file tree"
    fi
}

_check_maven() {
    if [[ ! -e pom.xml ]]; then
        err "not a maven project: missing pom.xml"
    fi

    if [[ "$(grep -oP '(?<=<packaging>).*(?=</packaging)' pom.xml)" != "war" ]]; then
        err "not a maven webapp: pom.xml attrib 'packaging' is not 'war'"
    fi

    if [[ "$(grep -oP '<artifactId>appengine-api-1.0-sdk</artifactId' pom.xml)" == "" ]]; then
        # xml element: dependencies/dependency/artifactId=appengine-api-1.0-sdk
        err "not a valid appengine project: pom.xml does not include appengine-api-1.0-sdk
 in dependencies"
    fi

    if [[ "$(grep -oP '<artifactId>gcloud-maven-plugin</artifactId' pom.xml)" == "" ]]; then
        # xml element: build/plugins/plugin/groupId=com.google.appengine/artifactId=gcloud-maven-plugin
        err "not a valid appengine project: pom.xml does not include gcloud-maven-plugin
 in build/plugins"
    fi
}

_check_source() {
    if [[ ! -e src/main/webapp/WEB-INF/web.xml ]]; then
        err "not a java webapp: missing src/main/webapp/WEB-INF/web.xml"
    fi

    if [[ ! -e src/main/webapp/WEB-INF/appengine-web.xml ]]; then
        err "not an appengine webapp: missing src/main/webapp/WEB-INF/appengine-web.xml"
    fi

    if [[ "$(grep -oP '(?<=<vm>).*(?=</vm)' src/main/webapp/WEB-INF/appengine-web.xml)" != "true" ]]; then
        err "not a valid appengine project: appengine-web.xml must declare '<vm>true</vm>'"
    fi
}

_check_git
_check_maven
_check_source

mvn "$@"
