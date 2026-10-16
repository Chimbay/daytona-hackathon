#!/bin/sh
# Regenerates public/demo/brainstorm.wav from public/demo/brainstorm.txt ("Speaker: line" per row).
# macOS only (say + afconvert). 2 s of silence after each turn so Scribe commits one chunk per line.
set -e
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
i=0
while IFS= read -r row; do
  speaker=${row%%:*}; text=${row#*: }
  case $speaker in Maya) v=Samantha ;; Dev) v=Daniel ;; *) v=Fred ;; esac
  i=$((i + 1))
  say -v "$v" -o "$tmp/$i.aiff" "$text [[slnc 2000]]"
  afconvert -f WAVE -d LEI16@16000 -c 1 "$tmp/$i.aiff" "$tmp/$(printf %02d $i).wav"
done < public/demo/brainstorm.txt
python3 -I - "$tmp" public/demo/brainstorm.wav <<'PY'
import glob, sys, wave
parts = sorted(glob.glob(sys.argv[1] + "/*.wav"))
with wave.open(sys.argv[2], "wb") as out:
    for i, p in enumerate(parts):
        with wave.open(p) as w:
            if i == 0: out.setparams(w.getparams())
            out.writeframes(w.readframes(w.getnframes()))
PY
rm -rf "$tmp"
