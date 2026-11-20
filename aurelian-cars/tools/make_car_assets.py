"""Cuts the hero car out of a side-profile photo on a plain light-grey background.

    python tools/make_car_assets.py images/source/16-side-profile.png

Writes to images/car/:
  halcyon-body.webp   the whole car with a transparent background and a soft floor shadow
  halcyon-wheel-rear.webp / halcyon-wheel-front.webp
                      round wheel layers (tyre + disc) that the site rotates
  halcyon-paint.png   mask of the green paintwork, used by the configurator to recolour the car
  car.json            wheel positions and sizes as percentages of the body image (for js/config.js)

Assumes: car facing right, light neutral background, bronze disc wheels (they are found by colour).
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "images" / "car"

# The window glass reflects the same grey-green as the paint highlights, so colour alone cannot
# keep it out of the paint mask. Outline the side windows (inside the trim) per photo, in source
# pixels. Leave a photo out of this table and its glass may pick up the configurator paint.
GLASS = {
    "16-side-profile.png": [(358, 292), (400, 262), (450, 231), (500, 222), (600, 216), (700, 212),
                            (800, 215), (900, 232), (950, 254), (990, 275), (1015, 294)],
}


def fit_background(rgb, sample):
    """Least-squares quadratic surface per channel through the known background pixels."""
    h, w, _ = rgb.shape
    yy, xx = np.mgrid[0:h, 0:w]
    x = xx / w
    y = yy / h
    terms = [np.ones_like(x), x, y, x * x, y * y, x * y]
    A = np.stack([t[sample] for t in terms], 1)
    bg = np.zeros_like(rgb)
    for c in range(3):
        coef, *_ = np.linalg.lstsq(A, rgb[..., c][sample], rcond=None)
        bg[..., c] = sum(k * t for k, t in zip(coef, terms))
    return bg


def fill_holes(mask):
    """Everything not reachable from the image border through background becomes car (windows)."""
    h, w = mask.shape
    img = Image.fromarray(np.where(mask, 255, 0).astype(np.uint8))
    pad = Image.new("L", (w + 2, h + 2), 0)
    pad.paste(img, (1, 1))
    ImageDraw.floodfill(pad, (0, 0), 128)
    outside = np.asarray(pad)[1:-1, 1:-1] == 128
    return ~outside


def find_wheels(rgb, top_limit):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    bronze = (r - b > 35) & (r > g) & (g > b) & (r > 90)
    bronze[:top_limit] = False
    h, w = bronze.shape
    ys_all, xs_all = np.nonzero(bronze)
    window = int(w * 0.075)  # half-width of the search window: wider than a disc, narrower than disc-to-grille

    wheels = []
    for x0, x1 in ((0, w // 2), (w // 2, w)):
        # Start at the column with the most bronze nearby (smoothed, so thin grille bars and
        # tail-light reflections lose to the dense disc), then fit the disc's bounding box.
        cols = bronze[:, x0:x1].sum(0).astype(float)
        smooth = np.convolve(cols, np.ones(window) / window, mode="same")
        cx = x0 + int(smooth.argmax())
        for _ in range(3):
            sel = np.abs(xs_all - cx) <= window
            xs, ys = xs_all[sel], ys_all[sel]
            cx = (xs.min() + xs.max()) / 2
        cy = (ys.min() + ys.max()) / 2
        disc_r = ((xs.max() - xs.min()) + (ys.max() - ys.min())) / 4
        wheels.append((cx, cy, disc_r))
    return wheels


def main(src):
    OUT.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert("RGB")
    rgb = np.asarray(im).astype(float)
    h, w, _ = rgb.shape
    lum = rgb.mean(2)

    # 1. Background model from the frame edges (the car never touches them).
    sample = np.zeros((h, w), bool)
    sample[: int(h * 0.18)] = True
    sample[:, : int(w * 0.05)] = True
    sample[:, int(w * 0.95):] = True
    sample[int(h * 0.92):] = True
    bg = fit_background(rgb, sample)
    bg_lum = bg.mean(2)
    dist = np.sqrt(((rgb - bg) ** 2).sum(2))

    # 2. Car core: clearly different from the background, minus the neutral grey floor shadow.
    #    Below the sill, neutral pixels are floor shadow unless they are inside a tyre.
    wheels = find_wheels(rgb, int(h * 0.55))
    yy, xx = np.mgrid[0:h, 0:w]
    in_tyre = np.zeros((h, w), bool)
    for cx, cy, disc_r in wheels:
        in_tyre |= (xx - cx) ** 2 + (yy - cy) ** 2 <= (disc_r * 1.24) ** 2
    spread = rgb.max(2) - rgb.min(2)
    sill = min(cy - disc_r * 0.2 for cx, cy, disc_r in wheels)
    neutral_shadow = (spread < 16) & (lum > 52) & (yy > sill) & ~in_tyre
    core = (dist > 34) & ~neutral_shadow
    core_img = Image.fromarray(np.where(core, 255, 0).astype(np.uint8))
    core_img = core_img.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))  # close gaps
    core_img = core_img.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))  # drop specks
    core = fill_holes(np.asarray(core_img) > 127)
    # Smooth the outline: blur and re-threshold, so pale reflections on the roof do not leave a ragged edge.
    core = np.asarray(Image.fromarray(np.where(core, 255, 0).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.2))) > 120

    # 3. Soft edge + floor shadow as translucent black.
    edge = np.asarray(Image.fromarray(np.where(core, 255, 0).astype(np.uint8))
                      .filter(ImageFilter.MinFilter(3))       # pull the edge in by a pixel
                      .filter(ImageFilter.GaussianBlur(0.9))) / 255.0
    # Edge pixels are a mix of car and grey background. Give them the local average colour of the
    # solid car next to them, so no light halo or noise shows over something dark (the wordmark).
    solid = (edge > 0.98).astype(float)
    def blur(arr, r=3):
        k = np.ones(2 * r + 1) / (2 * r + 1)
        arr = np.apply_along_axis(lambda v: np.convolve(v, k, mode="same"), 0, arr)
        return np.apply_along_axis(lambda v: np.convolve(v, k, mode="same"), 1, arr)
    weight = blur(solid)
    near = np.dstack([blur(rgb[..., c] * solid) for c in range(3)]) / np.maximum(weight, 1e-4)[..., None]
    soft = (edge > 0.02) & (edge <= 0.98) & (weight > 0.02)
    rgb = np.where(soft[..., None], near, rgb)
    shadow = np.clip((bg_lum - lum) / bg_lum * 1.25 - 0.03, 0, 0.82)
    shadow[: int(h * 0.55)] = 0
    # Keep the shadow under the car only, fading out just past the bumpers.
    cxs = np.nonzero(core.any(0))[0]
    cx0, cx1 = cxs.min(), cxs.max()
    fade = np.clip(np.minimum(xx[0] - (cx0 - 0.02 * w), (cx1 + 0.02 * w) - xx[0]) / (0.04 * w), 0, 1)
    shadow *= fade[None, :]
    # ...and fading out a little below the tyres, so no stray band of floor is left at the bottom.
    tyre_bottom = max(cy + disc_r * 1.22 for cx, cy, disc_r in wheels)
    vfade = np.clip(1 - (np.arange(h) - tyre_bottom) / (0.05 * h), 0, 1)
    shadow *= vfade[:, None]
    alpha =np.maximum(edge, shadow * (1 - edge))
    colour = rgb * edge[..., None]  # shadow pixels are black
    rgba = np.dstack([np.clip(colour / np.maximum(alpha, 1e-3)[..., None] * (alpha > 0)[..., None], 0, 255),
                      alpha * 255]).astype(np.uint8)

    # 4. Crop to the car plus shadow, with a small margin.
    ys, xs = np.nonzero(alpha > 0.03)
    m = 6
    x0, x1 = max(xs.min() - m, 0), min(xs.max() + m, w)
    y0, y1 = max(ys.min() - m, 0), min(ys.max() + m, h)
    body = Image.fromarray(rgba).crop((x0, y0, x1, y1))
    body.save(OUT / "halcyon-body.webp", "WEBP", quality=90, method=6)
    bw, bh = body.size

    # 5. Wheel layers: a circle just inside the tyre edge, so only tyre and disc rotate.
    info ={"bodyWidth": bw, "bodyHeight": bh, "wheels": []}
    for name, (cx, cy, disc_r) in zip(("rear", "front"), wheels):
        r = disc_r * 1.19
        size = int(np.ceil(r * 2)) + 2
        left, top = cx - size / 2, cy - size / 2
        tile = im.crop((round(left), round(top), round(left) + size, round(top) + size))
        big = 4
        circle = Image.new("L", (size * big, size * big), 0)
        ImageDraw.Draw(circle).ellipse((big, big, (size - 1) * big, (size - 1) * big), fill=255)
        tile.putalpha(circle.resize((size, size), Image.LANCZOS))
        tile.save(OUT / f"halcyon-wheel-{name}.webp", "WEBP", quality=92, method=6)
        info["wheels"].append({
            "name": name,
            "left": round((round(left) - x0) / bw * 100, 3),
            "top": round((round(top) - y0) / bh * 100, 3),
            "width": round(size / bw * 100, 3),
        })

    # 6. Paint mask: green bodywork only (not glass, bronze, gold coachline, lights or tyres).
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    green = (g > r + 8) & (g + 6 >= b) & (lum < 215) & core
    # Close small gaps (pale reflections on the panels) so the recolour has no green specks.
    closed = Image.fromarray(np.where(green, 255, 0).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))
    green = (np.asarray(closed) > 127) & core
    # ...but keep the gold coachline, window trim and bronze grille out, so they stay gold.
    gold = (r > g + 4) & (r - b > 18) & (lum > 70)
    gold = np.asarray(Image.fromarray(np.where(gold, 255, 0).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 0
    green &= ~gold
    glass_poly = GLASS.get(Path(src).name)
    if glass_poly:
        glass = Image.new("L", (w, h), 0)
        ImageDraw.Draw(glass).polygon(glass_poly, fill=255)
        glass = np.asarray(glass.filter(ImageFilter.MaxFilter(5))) > 0
        green &= ~glass
    paint = Image.fromarray(np.where(green, 255, 0).astype(np.uint8))
    paint = paint.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    paint = paint.crop((x0, y0, x1, y1))
    mask = Image.new("RGBA", paint.size, (255, 255, 255, 0))
    mask.putalpha(paint)
    mask.save(OUT / "halcyon-paint.png", optimize=True)

    (OUT / "car.json").write_text(json.dumps(info, indent=2))
    print(json.dumps(info, indent=2))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else str(ROOT / "images/source/16-side-profile.png"))
