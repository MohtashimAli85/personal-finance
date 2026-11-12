#!/usr/bin/env bash
set -euo pipefail

tag=$1
prev=$(git describe --tags --abbrev=0 "$tag^" 2>/dev/null || true)
range=${prev:+$prev..}$tag
repo=${GITHUB_REPOSITORY:-MohtashimAli85/personal-finance}

commits() {
  git log --no-merges --format='%s (%h)' "$range" | grep -vE '^chore\(release\)' || true
}

section() {
  local lines
  lines=$(commits | grep -E "^$1(\([^)]*\))?!?: " | sed -E 's/^[a-z]+(\(([^)]*)\))?!?: /- **\2:** /; s/\*\*:\*\* //' || true)
  if [ -n "$lines" ]; then printf '## %s\n\n%s\n\n' "$2" "$lines"; fi
}

section feat "Features"
section fix "Fixes"
section perf "Performance"
others=$(commits | grep -vE '^(feat|fix|perf)(\([^)]*\))?!?: ' | sed 's/^/- /' || true)
if [ -n "$others" ]; then printf '## Other changes\n\n%s\n\n' "$others"; fi

cat <<NOTES
## Downloads

| Platform | File |
| --- | --- |
| Windows (installer) | \`Personal.Finance.Setup.${tag#v}.exe\` |
| Windows (portable) | \`Personal.Finance.${tag#v}.exe\` |
| macOS Apple Silicon | \`Personal.Finance-${tag#v}-arm64.dmg\` |
| macOS Intel | \`Personal.Finance-${tag#v}.dmg\` |
| Linux | \`Personal.Finance-${tag#v}.AppImage\` or \`personal-finance_${tag#v}_amd64.deb\` |

The app is not code-signed yet:
- **Windows:** on the SmartScreen prompt, click **More info → Run anyway**.
- **macOS:** after moving the app to Applications, run \`xattr -cr "/Applications/Personal Finance.app"\`.

NOTES
if [ -n "$prev" ]; then
  echo "**Full Changelog**: https://github.com/$repo/compare/$prev...$tag"
fi
