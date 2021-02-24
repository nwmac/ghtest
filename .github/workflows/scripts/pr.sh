#!/usr/bin/env bash

echo "Checking"
env

echo $github_event_path

ls $github_event_path
cat github_event_path/workflow/event.json