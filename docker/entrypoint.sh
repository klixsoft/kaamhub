#!/bin/sh
set -e
node ./migrator/migrate.mjs
exec node server.js
