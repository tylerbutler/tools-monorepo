#!/usr/bin/env bash
# Syncs Cargo.toml versions from a specified package.json.
# Uses the same sed-based approach as tylerbutler/actions/update-version-files.
#
# Usage: ./scripts/sync-cargo-versions.sh
#
# Each entry below is a "toml_file:key:package_json" triple. The version is
# read from the specified package.json.

set -euo pipefail

VERSION_FILES="
packages/repopo-core/Cargo.toml:version:packages/repopo/package.json
"

while IFS= read -r line; do
	[ -z "$line" ] && continue

	file=$(echo "$line" | cut -d: -f1 | xargs)
	key=$(echo "$line" | cut -d: -f2 | xargs)
	pkg_json=$(echo "$line" | cut -d: -f3 | xargs)

	[ -z "$file" ] && continue

	if [ ! -f "$file" ]; then
		echo "error: TOML file not found: $file" >&2
		exit 1
	fi

	if [ ! -f "$pkg_json" ]; then
		echo "error: package.json not found: $pkg_json" >&2
		exit 1
	fi

	version=$(node -p "JSON.parse(require('fs').readFileSync('${pkg_json}','utf8')).version")
	if [ -z "$version" ]; then
		echo "error: Could not read version from $pkg_json" >&2
		exit 1
	fi

	sed -i "s/^${key} = \".*\"/${key} = \"${version}\"/" "$file"
	echo "Updated ${file}: ${key} = \"${version}\" (from ${pkg_json})"
done <<< "$VERSION_FILES"
