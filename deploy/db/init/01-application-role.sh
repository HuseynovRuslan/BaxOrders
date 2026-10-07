#!/bin/bash
# Runs once, on the first start of an empty cluster.
#
# The application does not connect as the superuser. It gets its own role and its own database, so a mistake in
# the application cannot reach anything else in the cluster — and the cluster holds nothing else anyway, because
# this stack's database is its own container.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username postgres --dbname postgres <<-SQL
	CREATE ROLE "${APP_DB_USER}" LOGIN PASSWORD '${APP_DB_PASSWORD}';
	CREATE DATABASE "${APP_DB_NAME}" OWNER "${APP_DB_USER}";
SQL

# The restore brings the schema with it, so the role owns what it will later read and write.
psql -v ON_ERROR_STOP=1 --username postgres --dbname "${APP_DB_NAME}" <<-SQL
	GRANT ALL ON SCHEMA public TO "${APP_DB_USER}";
SQL
