"""Joins the journey clips into one drive and turns it into the scroll frames.

    python tools/build_journey.py                 # uses images/source/journey-01.mp4, -02, ... in order
    python tools/build_journey.py --fps 8         # frames per second of footage (default 8)

What it does:
  1. Reads every images/source/journey-NN.mp4 in number order (audio is dropped).
  2. Joins them with a short cross-fade at each join, so small mismatches between the last frame of one
     clip and the first frame of the next do not show as a jump.
  3. Writes the joined drive to images/source/journey-joined.mp4 (for checking by eye).
  4. Extracts frames (8 per second of footage, at the clips' own resolution, lightly sharpened) to
     frames/001.webp, 002.webp ... and sets frames.count in js/config.js. The site blends between
     neighbouring frames and streams them in progressively, so this density scrubs smoothly.

The first time it runs, the old drawn placeholder frames are moved to frames-placeholder/ (kept, not deleted).
Needs ffmpeg and ffprobe on the PATH.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "images" / "source"
FRAMES = ROOT / "frames"
CONFIG = ROOT / "js" / "config.js"
JOIN_FADE = 0.4   # seconds of cross-fade at each join between clips
MAX_WIDTH = 1920  # frames keep the clips' own resolution (never upscaled: that only adds blur)


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)],
                         capture_output=True, text=True, check=True).stdout
    return float(json.loads(out)["format"]["duration"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fps", type=float, default=8, help="frames per second of footage")
    ap.add_argument("--quality", type=int, default=72)
    ap.add_argument("--upscaler", help="path to realesrgan-ncnn-vulkan.exe: AI-upscale every frame 2x before encoding")
    ap.add_argument("--width", type=int, default=1920, help="frame width when upscaling")
    ap.add_argument("--skip-join", action="store_true", help="reuse images/source/journey-joined.mp4")
    args = ap.parse_args()

    clips = sorted(SRC.glob("journey-[0-9][0-9].mp4"))
    if not clips:
        sys.exit("No clips found: put them in images/source/ as journey-01.mp4, journey-02.mp4 ...")
    print("Clips in order:", ", ".join(c.name for c in clips))

    # 1-3. Join with xfade. Each clip is normalised to the same size and frame rate first.
    joined = SRC / "journey-joined.mp4"
    cmd = ["ffmpeg", "-v", "error", "-y"]
    for c in clips:
        cmd += ["-i", str(c)]
    parts, total = [], 0.0
    for i, c in enumerate(clips):
        parts.append(f"[{i}:v]fps=24,scale='min({MAX_WIDTH},iw)':-2:flags=lanczos,setsar=1,format=yuv420p[v{i}]")
    last = "v0"
    total = duration(clips[0])
    for i in range(1, len(clips)):
        offset = total - JOIN_FADE
        out = f"x{i}"
        parts.append(f"[{last}][v{i}]xfade=transition=fade:duration={JOIN_FADE}:offset={offset:.3f}[{out}]")
        last = out
        total = offset + duration(clips[i])
    cmd += ["-filter_complex", ";".join(parts), "-map", f"[{last}]", "-an",
            "-c:v", "libx264", "-crf", "16", "-preset", "slow", str(joined)]
    if args.skip_join and joined.exists():
        total = duration(joined)
        print(f"Reusing {joined.relative_to(ROOT)} ({total:.1f} s)")
    else:
        subprocess.run(cmd, check=True)
        print(f"Joined drive: {joined.relative_to(ROOT)} ({total:.1f} s)")

    # 4. Frames are built in a staging folder first, so the site keeps working if this is interrupted.
    stage = ROOT / "frames-new"
    if stage.exists():
        shutil.rmtree(stage)
    stage.mkdir()
    if args.upscaler:
        # AI upscale: raw frames out, Real-ESRGAN (video model, 2x), then sized and encoded.
        from PIL import Image
        exe = Path(args.upscaler)
        work = SRC / "journey-work"
        raw, big = work / "raw", work / "up"
        for d in (raw, big):
            if d.exists():
                shutil.rmtree(d)
            d.mkdir(parents=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(joined), "-vf", f"fps={args.fps}",
                        str(raw / "%03d.png")], check=True)
        n = len(list(raw.glob("*.png")))
        print(f"Upscaling {n} frames (about 5 s each)...", flush=True)
        subprocess.run([str(exe), "-i", str(raw), "-o", str(big), "-n", "realesr-animevideov3-x2", "-s", "2",
                        "-m", str(exe.parent / "models")], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for p in sorted(big.glob("*.png")):
            im = Image.open(p).convert("RGB")
            im = im.resize((args.width, round(im.height * args.width / im.width)), Image.LANCZOS)
            im.save(stage / (p.stem + ".webp"), "WEBP", quality=args.quality, method=6)
        shutil.rmtree(work)
    else:
        # A light denoise, then sharpen: removes the AI video's noise (smaller files) and restores crispness.
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(joined),
                        "-vf", f"fps={args.fps},hqdn3d=1.5:1.5:3:3,unsharp=5:5:0.5:5:5:0",
                        "-c:v", "libwebp", "-quality", str(args.quality), "-compression_level", "6",
                        str(stage / "%03d.webp")], check=True)

    # Swap the new frames in. Keep the old drawn placeholders once; after that, replace our own frames.
    placeholder = ROOT / "frames-placeholder"
    if FRAMES.exists() and not placeholder.exists():
        shutil.move(str(FRAMES), str(placeholder))
        print("Old placeholder frames moved to frames-placeholder/")
    FRAMES.mkdir(exist_ok=True)
    for old in FRAMES.glob("[0-9][0-9][0-9].webp"):
        old.unlink()
    for f in sorted(stage.glob("*.webp")):
        shutil.move(str(f), str(FRAMES / f.name))
    stage.rmdir()
    count = len(list(FRAMES.glob("[0-9][0-9][0-9].webp")))

    cfg = CONFIG.read_text(encoding="utf-8")
    cfg, n = re.subn(r"(frames:\s*\{[^}]*count:\s*)\d+", rf"\g<1>{count}", cfg, count=1)
    if n:
        CONFIG.write_text(cfg, encoding="utf-8")
    print(f"{count} frames written to frames/ and frames.count set in js/config.js")


if __name__ == "__main__":
    main()
