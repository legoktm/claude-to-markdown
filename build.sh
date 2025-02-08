#!/bin/bash

VERSION=$(cat manifest.json | jq -r '.version')

zip -r -FS "../claude-to-markdown-${VERSION}.zip" * --exclude '*.git*' \
    --exclude build.sh
