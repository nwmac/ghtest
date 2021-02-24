#!/usr/bin/env bash

echo "Checking"
env

echo "here"
echo $GITHUB_EVENT_PATH

cat $GITHUB_EVENT_PATH