#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

TOKEN=$1

echo "Checking"
env

echo "here"
echo $GITHUB_EVENT_PATH

cat $GITHUB_EVENT_PATH

npm --version
node --version

node ${DIR}/pr.js "${TOKEN}"

