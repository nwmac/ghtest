#!/usr/bin/env bash

TOKEN=$1

echo "Checking"
env

echo "here"
echo $GITHUB_EVENT_PATH

cat $GITHUB_EVENT_PATH

npm --version
node --version

node ./pr.js "${TOKEN}"

