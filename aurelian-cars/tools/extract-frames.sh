#!/usr/bin/env bash
# Turn a video into the numbered frames the scroll journey plays.
#
#   tools/extract-frames.sh my-drive.mp4            -> 120 frames, 1600 px wide
#   tools/extract-frames.sh my-drive.mp4 150 1920   -> 150 frames, 1920 px wide
#
# Needs ffmpeg on your PATH. Afterwards set frames.count in js/config.js to the number printed.
set -euo pipefail

IN="${1:?Usage: tools/extract-frames.sh input.mp4 [frame-count] [width]}"
COUNT="${2:-120}"
WIDTH="${3:-1600}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/frames"

DUR="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")"
FPS="$(awk -v c="$COUNT" -v d="$DUR" 'BEGIN { printf "%.5f", c / d }')"

mkdir -p "$OUT"
rm -f "$OUT"/*.webp

ffmpeg -v error -i "$IN" -vf "fps=$FPS,scale=$WIDTH:-2" -frames:v "$COUNT" \
  -c:v libwebp -quality 70 "$OUT/%03d.webp"

echo "Wrote $(ls "$OUT" | wc -l) frames to $OUT"
echo "Now set  frames: { count: $(ls "$OUT" | wc -l) }  in js/config.js"
