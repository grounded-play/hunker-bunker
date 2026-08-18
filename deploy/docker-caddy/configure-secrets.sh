#!/usr/bin/env bash
set -euo pipefail

server_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
env_file="${server_dir}/backend.env"
tmp_file="$(mktemp "${server_dir}/.backend.env.XXXXXX")"
trap 'rm -f "$tmp_file"' EXIT

if [[ ! -f "$env_file" ]]; then
    if [[ -f "${server_dir}/backend.env.example" ]]; then
        echo "Creating ${env_file} from template..."
        cp "${server_dir}/backend.env.example" "$env_file"
        chmod 600 "$env_file"
    else
        echo "Missing ${env_file}" >&2
        exit 1
    fi
fi

read -r -s -p "Steamworks Publisher Web API key (hidden): " publisher_key
printf '\n'

if [[ ! "$publisher_key" =~ ^[[:xdigit:]]{32}$ ]]; then
    echo "Expected a 32-character hexadecimal Steamworks publisher key." >&2
    exit 1
fi

existing_leaderboard_ids="$(
    sed -n 's/^HB_STEAM_LEADERBOARD_IDS=//p' "$env_file" | head -n 1
)"
read -r -p "Leaderboard ID mapping (Enter keeps current value): " leaderboard_ids
if [[ -z "$leaderboard_ids" ]]; then
    leaderboard_ids="$existing_leaderboard_ids"
fi

session_secret="$(openssl rand -hex 48)"

awk \
    -v allowed_origins="https://steam.tuesdaycinema.club,https://tuesdaycinema.club,https://www.tuesdaycinema.club" \
    -v leaderboard_ids="$leaderboard_ids" '
    BEGIN {
        getline publisher_key < "/dev/fd/3"
        getline session_secret < "/dev/fd/3"
        close("/dev/fd/3")
        replacements["HB_STEAM_PUBLISHER_KEY"] = publisher_key
        replacements["HB_SESSION_SECRET"] = session_secret
        replacements["HB_ALLOWED_ORIGINS"] = allowed_origins
        replacements["HB_STEAM_LEADERBOARD_IDS"] = leaderboard_ids
    }
    {
        line = $0
        key = line
        sub(/=.*/, "", key)
        if (key in replacements) {
            print key "=" replacements[key]
            seen[key] = 1
        } else {
            print line
        }
    }
    END {
        for (key in replacements) {
            if (!(key in seen)) print key "=" replacements[key]
        }
    }
    ' "$env_file" 3<<<"${publisher_key}"$'\n'"${session_secret}" > "$tmp_file"

chmod 600 "$tmp_file"
mv "$tmp_file" "$env_file"
trap - EXIT

unset publisher_key session_secret

docker compose --project-directory "$server_dir" up -d --force-recreate hunker-bunker-backend

echo "Secrets saved to protected backend.env and backend restarted."
echo "Checking public health without displaying any secret..."
for attempt in {1..30}; do
    if health="$(curl --fail --silent --show-error \
        https://steam.tuesdaycinema.club/health 2>/dev/null)"; then
        printf '%s\n' "$health"
        exit 0
    fi
    sleep 1
done

echo "Backend did not become publicly healthy within 30 seconds." >&2
docker compose --project-directory "$server_dir" ps >&2
exit 1
