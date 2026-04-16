#!/usr/bin/env bash
# Syncs Cargo.toml versions from their nearest ancestor package.json.
# Uses the same sed-based approach as tylerbutler/actions/update-version-files.
#
# Usage: ./scripts/sync-cargo-versions.sh
#
# Each entry below is a "toml_file:key" pair. The version is read from the
# nearest ancestor package.json.

set -euo pipefail

VERSION_FILES="
packages/repopo/crates/core/Cargo.toml:version
"

while IFS= read -r line; do
	[ -z "$line" ] && continue

	file=$(echo "$line" | cut -d: -f1 | xargs)
	key=$(echo "$line" | cut -d: -f2 | xargs)

	[ -z "$file" ] && continue

	if [ ! -f "$file" ]; then
		echo "error: TOML file not found: $file" >&2
		exit 1
	fi

	# Walk up from the TOML file's directory to find nearest package.json
	search_dir=$(dirname "$file")
	pkg_json=""
	while [ "$search_dir" != "." ] && [ "$search_dir" != "/" ]; do
		if [ -f "${search_dir}/package.json" ]; then
			pkg_json="${search_dir}/package.json"
			break
		fi
		search_dir=$(dirname "$search_dir")
	done

	if [ -z "$pkg_json" ]; then
		echo "error: No package.json found in ancestor directories of $file" >&2
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
