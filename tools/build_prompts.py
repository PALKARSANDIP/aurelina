"""Builds the Aurelian AI image/video prompt pack (version 2).

Edit CAR_BIBLE / STYLE_BIBLE / CAR_TAG once, then run:
    python tools/build_prompts.py
Writes prompts/aurelian-prompt-pack.md and prompts/aurelian-prompts.csv.
Every prompt is assembled from the same bible text, so the car and style
wording are byte-identical in every prompt.

Version 2 changes: the first round of Gemini images came out as a
Rolls-Royce Phantom (tall vertical grille, bonnet mascot, RR monograms,
upright three-box body). The car is now described with features that pull
AWAY from that car: fastback roof, low horizontal grille, light-line
headlamps, closed disc wheels, single-colour body. Words that strongly
pull toward it (British, limousine, coachbuilt, starlight, lambswool,
coach doors) are kept out of the prompts.
"""
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "prompts"

# STEP 1: CAR BIBLE (paste verbatim into every image prompt)
CAR_BIBLE = (
    "The Aurelian Halcyon, an original grand saloon design that resembles no existing car brand: a long, low "
    "four-door fastback with a very long smooth bonnet, a roofline that slopes in one unbroken curve into a "
    "short tapered tail, and flush hidden door handles. Single-colour deep bottle-green metallic paint, "
    "mirror gloss, with one fine gold coachline along the shoulder. Low, wide horizontal grille of fine "
    "satin-bronze bars, wider than it is tall, linked to the headlamps by one thin full-width light line. "
    "Bronze closed-disc wheels with fine radial fluting. Unbadged: plain grille, plain wheel centres, "
    "nothing on the bonnet. Interior: cognac-tan leather, dark walnut, brushed bronze."
)

# Short reminder for video prompts (the input image carries the full look).
CAR_TAG = (
    "the same bottle-green Aurelian Halcyon fastback saloon with its low horizontal bronze grille, "
    "thin light-line headlamps, gold coachline and bronze disc wheels, unchanged in every frame"
)

# STEP 2: STYLE BIBLE. The studio look is taken from the first round,
# which was the best part of it.
STYLE_BIBLE = (
    "Photorealistic high-end automotive campaign photography, full-frame cinema camera. 35mm lens for wide "
    "and environmental shots, 85mm for three-quarters and details, camera low near headlamp height unless "
    "stated. Studio shots: dark charcoal studio with one large rectangular light panel overhead, long soft "
    "gradient reflections along the bodywork, polished dark floor. Location shots: golden hour, blue hour or "
    "night with warm practical lights. Colour grade: deep greens, inky shadows, warm gold highlights, soft "
    "atmospheric mist, fine film grain, restrained saturation. Mood: calm, quiet, expensive. 2K, 16:9 unless "
    "stated. Blank number plates. No text, no lettering, no logos, no badges, no monograms, no watermark, "
    "no people's faces."
)

NEGATIVE = (
    "text, letters, numbers, logo, badge, monogram, emblem, bonnet mascot, hood ornament, tall vertical grille, "
    "two-tone silver bonnet, rear-hinged doors, multi-spoke wheels, readable number plate, watermark, "
    "people's faces, extra or missing wheels, warped wheels, distorted bodywork, cartoon, CGI look, oversaturated"
)

VIDEO_RULES = (
    "One continuous uncut shot. No cuts, no dissolves, no text, no camera shake, no zoom jumps. "
    "The car never morphs: same shape, paint, grille, wheels and lights throughout. "
    "Audio: quiet ambient sound only, no music, no voices."
)

# STEP 3: STILLS. (id, website use, shot description, aspect)
STILLS = [
    ("S01", "Hero: transparent cut-out behind the wordmark (images/hero-car.png, set heroCarImage in js/config.js). Configurator base image.",
     "Exact pure side profile, the car facing right with its nose pointing to the right edge of the frame. Camera "
     "at wheel-centre height, 85mm from far away so there is no perspective distortion. Both wheels fully visible, "
     "front wheels straight, the whole car in frame with generous empty margin on every side. Plain seamless "
     "light-grey studio background instead of the dark studio, even shadowless light, only a faint soft contact "
     "shadow under the tyres, no floor reflection, nothing else in frame. Lightly tinted windows.",
     "21:9 (fallback 16:9)"),
    ("S02", "Collection carousel card and configurator preview.",
     "Front three-quarter view from the front-left corner at about 30 degrees, nose toward the lower right of the "
     "frame, 85mm, camera at headlamp height. The light line and grille glowing softly, one long unbroken "
     "highlight along the shoulder and bonnet from the overhead panel, soft mirror reflection on the floor.",
     "16:9"),
    ("S03", "Collection card (alternate view) and booking section side image.",
     "Rear three-quarter view from the rear-left corner at about 35 degrees, nose toward the left of the frame, "
     "85mm. The fastback roof flowing into the short tapered tail, one thin full-width tail-light line glowing "
     "red across a plain tail with no lettering, long soft highlight along the rear haunch.",
     "16:9"),
    ("S04", "Atelier statement 1 (design). Start frame for loop L1.",
     "Tight detail shot, 85mm, slight three-quarter front angle, frame filled by the left half of the grille and "
     "the left headlamp: fine horizontal satin-bronze bars with crisp shadows between them, the thin light line "
     "glowing warm white, fine beads of mist on the green paint, very shallow depth of field, dark background.",
     "16:9 (crop 4:5 for mobile)"),
    ("S05", "Configurator wheel thumbnail and atelier statement 2.",
     "Low close-up of the front-left wheel, camera at wheel-centre height, 85mm, wheel square to camera filling "
     "most of the frame: bronze closed-disc wheel with fine radial fluting, plain centre with no logo, tyre "
     "sidewall with no readable text, green bodywork arching over the top of the frame, one soft specular streak "
     "across the disc.",
     "1:1"),
    ("S06", "Interior feature panel (driver's cabin).",
     "Interior wide shot from the rear centre between the front seats at shoulder height, 35mm, looking forward: "
     "two cognac-tan leather front seats with fine horizontal ribbing and plain headrests, a long low floating "
     "dashboard in dark open-pore walnut with one slim brushed-bronze strip running door to door, a thin-rimmed "
     "steering wheel with a plain smooth centre, black screens switched off, soft daylight through the windscreen.",
     "16:9"),
    ("S07", "Interior feature panel (rear comfort).",
     "Rear cabin seen through the open rear door from outside at seat height, 35mm: two individual reclining "
     "cognac-tan lounge seats with plain headrests, a walnut centre console with a bronze-trimmed tray holding two "
     "cut-crystal tumblers, soft cream carpets, warm lamplight glow, everything still. Conventional front-hinged "
     "rear door.",
     "16:9"),
    ("S08", "Interior night detail / tall accent image beside the intro statement.",
     "Looking up from the rear seat at the cabin ceiling at night, 35mm: a deep forest-green leather ceiling with "
     "hundreds of tiny warm points of light arranged as real constellations, the top of a plain cognac headrest "
     "and a strip of walnut catching the glow at the bottom of the frame, everything else in deep shadow.",
     "4:5"),
    ("S09", "Booking section background.",
     "Blue-hour dusk outside a grand white-stucco hotel entrance with tall columns, warm brass lanterns and a "
     "glowing glass door. The car at the kerb in front-left three-quarter view, rear door open to the warm "
     "cognac cabin. A doorman seen only from behind and out of focus, no faces. Wet pavement reflecting the "
     "lanterns, 35mm, waist height, no readable signs.",
     "16:9 (crop 4:5 for mobile)"),
    ("S10", "Intro statement background / full-width break.",
     "Rolling tracking shot from a camera car alongside at the same speed, 35mm, slow shutter: the car drives left "
     "to right on a winding cliff-top coastal road above the sea, car pin sharp, wheels and road motion-blurred, "
     "low golden-hour sun warming the paint, sea mist in the coves below, green headlands into the distance.",
     "21:9"),
    ("S11", "Journey end card / reduced-motion fallback for the night scene.",
     "Parked on a quiet cobbled city street at night in light rain, front three-quarter from a low angle, 35mm: "
     "light line on, rain beading on the paint, the green body and bronze grille reflecting warm shop-window and "
     "street-lamp light, long reflections across wet stones, elegant townhouses blurred behind, no readable signs.",
     "16:9"),
    ("S12", "Configurator top view / specifications section.",
     "Perfect top-down overhead view, camera pointing straight down, the car centred and horizontal with its nose "
     "to the right, whole car in frame with even margins, on a plain light-grey floor with a soft even shadow. "
     "Long bonnet, fastback roof and gold coachline clearly readable.",
     "16:9"),
    # New in v2: extra shots chosen for impact on the page.
    ("S13", "Preloader / hero alternative: the most dramatic image on the site.",
     "Front three-quarter view in an almost completely dark studio, the overhead panel switched off. The car is "
     "drawn only by thin rim light tracing the roofline, shoulder and wheel arches, and by the glowing full-width "
     "light line and softly lit bronze grille. Deep black background, faint reflection on the floor.",
     "16:9"),
    ("S14", "Atelier 'Painted for you, coat by coat'.",
     "Macro close-up of the shoulder of the car, 85mm macro: deep green metallic flake visible under the clear "
     "coat, the fine hand-painted gold coachline crossing the frame diagonally, a single water droplet on the "
     "paint reflecting the overhead light panel, extremely shallow depth of field.",
     "4:5"),
    ("S15", "Atelier 'Delivered by the person who built it' / craft panel.",
     "Close-up of a craftsperson's hands only, no face, in a warm workshop: stitching cognac-tan leather with "
     "waxed thread and two needles at a wooden bench, offcuts of walnut veneer and a small bronze tool nearby, "
     "soft window light from the left, shallow depth of field.",
     "4:5"),
    ("S16", "Interior detail strip / configurator trim option.",
     "Detail of the centre console: knurled brushed-bronze rotary control and a row of small bronze toggle "
     "switches set into open-pore dark walnut, cognac leather edge with fine stitching, soft warm light raking "
     "across the wood grain, very shallow depth of field.",
     "16:9"),
    ("S17", "Rear comfort feature (the shot you liked from round one, made original).",
     "High three-quarter view of the rear centre console between two cognac-tan rear seats: a walnut tray with "
     "brushed-bronze edges sliding out of the console, two cut-crystal tumblers in it, a small bronze control "
     "panel with plain unlabelled buttons, soft cream carpet below, warm low lamplight.",
     "16:9"),
    ("S18", "Collection section banner / social share image.",
     "High aerial drone view looking down at about 45 degrees: the car small in the frame driving along a single "
     "winding road through a vast empty mountain valley, purple heather and dark lochs, low golden morning light "
     "and long shadows, mist in the valley floor, 35mm.",
     "21:9"),
    ("S19", "Booking section alternative (arrival).",
     "Blue hour at a quiet private airfield: the car parked in front-left three-quarter view on wet tarmac, a "
     "sleek private jet softly out of focus behind it with warm cabin windows glowing, runway lights in a line to "
     "the horizon, faint mist, 35mm, low angle.",
     "16:9"),
    ("S20", "Hero background behind the cut-out car / section divider.",
     "Empty location plate with no car: a long straight estate driveway of pale gravel at dawn, lined with tall "
     "clipped yew hedges, dense low mist, a grand stone country house faint in the distance, soft pink-gold light, "
     "35mm, camera low at bonnet height.",
     "21:9"),
]

# STEP 4A: JOURNEY KEYFRAMES. Same chase-camera framing in all six so the
# clips between them only have to change the world, not the composition.
KF_CAMERA = (
    "Drone chase camera about 6 metres behind and 3 metres above the car, rear three-quarter view, the car "
    "centred in the lower third of the frame driving away from the camera along the road, 35mm."
)
KEYFRAMES = [
    ("KF1", "Journey frame 1: 06:00, scene 'Before the engine wakes'.",
     "Dawn at 06:00: a narrow country lane through low rolling fields under dense ground mist, hedgerows either "
     "side, a pale pink-and-gold sky, headlamps on and cutting softly through the mist."),
    ("KF2", "Journey: 08:00, forest stretch.",
     "Morning at 08:00: the road winds through a tall beech forest, shafts of low sunlight through the canopy, "
     "light haze between the trunks, dappled light on the paint, headlamps off."),
    ("KF3", "Journey: 12:00, scene 'Seen in full light'.",
     "Midday at 12:00 in bright soft overcast light: a long pale gravel driveway lined with clipped dark yew "
     "hedges leading to a grand country house, manicured lawns either side."),
    ("KF4", "Journey: 18:30, scene 'The hour it was made for'.",
     "Sunset at 18:30: a road along the shore of a still mountain lake, the golden sun low over dark hills, the "
     "sky mirrored in the water, warm light catching the gold coachline."),
    ("KF5", "Journey: 20:45, city dusk.",
     "Blue hour at 20:45: a wide riverside boulevard entering a historic city, lit stone facades and warm windows, "
     "street lamps glowing, the car's light lines on, reflections on damp tarmac."),
    ("KF6", "Journey last frame: 23:30, scene 'After the city sleeps'.",
     "Night at 23:30: an empty moorland road under a clear sky full of stars and the Milky Way, headlamp beams "
     "reaching far ahead, a faint warm city glow on the horizon behind."),
]

# STEP 4B: TRANSITION CLIPS (image-to-video, first frame + last frame).
TRANSITIONS = [
    ("V1", "KF1", "KF2",
     "The camera starts from rest with a gentle ease-in, then holds a constant forward speed. The mist thins, the "
     "open fields give way to beech trees that rise and close overhead, and the light warms from pink dawn to "
     "golden morning; the headlamps fade off."),
    ("V2", "KF2", "KF3",
     "Constant speed, no easing. The forest opens up, the trees fall away behind, the tarmac turns to pale gravel "
     "and the yew-lined driveway and country house rise into view as the light becomes bright and even."),
    ("V3", "KF3", "KF4",
     "Constant speed, no easing. The car passes the house and the drive becomes a lakeside road; the hills rise, "
     "the water spreads out to one side and the light deepens steadily into golden sunset."),
    ("V4", "KF4", "KF5",
     "Constant speed, no easing. The sun drops below the hills, the lake narrows into a river, stone buildings "
     "and street lamps appear along the banks and the sky shifts to deep blue as the headlamps come on."),
    ("V5", "KF5", "KF6",
     "Constant speed, then a gentle ease-out to a slow glide at the very end. The city falls behind, the road "
     "climbs onto open moorland, the sky darkens to black and fills with stars and the Milky Way."),
]

# STEP 4C: LOOPS AND HERO CLIPS. (id, use, motion, note, tool type)
LOOPS = [
    ("L1", "Atelier section background loop (design statement).",
     "Input image: S04. Locked-off tripod move: an extremely slow, perfectly smooth push-in toward the grille bars "
     "and light line, about 3 percent closer over 6 seconds. The light line breathes very slightly brighter and "
     "back. Nothing else moves.",
     "Loop with ping-pong (forward then reversed) or a 0.5 s crossfade; a push-in cannot end on its first frame.",
     "Video (image-to-video, loop, 6 s)"),
    ("L2", "Hero or collection background loop.",
     "Input image: S13 (dark studio), used as BOTH first and last frame. The camera is completely still. A single "
     "long soft strip light glides slowly from left to right above the car, its reflection travelling along the "
     "bonnet, shoulder and roof, revealing the green paint and gold coachline, then leaves the frame.",
     "Truly seamless: first and last frames are identical (light off-frame at both ends).",
     "Video (image-to-video, loop, 6 s)"),
    ("L3", "Booking or night-section background loop.",
     "Interior view from the driver's seat looking out through the windscreen at night, the walnut and bronze "
     "dashboard edge at the bottom of the frame, soft bokeh of warm city lights beyond the glass. Raindrops land "
     "and run slowly down the windscreen. Wipers parked, the car stationary, the camera locked off.",
     "Rain is random, so join the ends with a 0.5 s crossfade; use the same image as first and last frame.",
     "Video (image-to-video, loop, 6 s)"),
    ("V6", "Hero intro: the car drives into place on page load (replaces the code animation).",
     "Input image: S01 as the LAST frame; first frame is the same empty light-grey studio with no car. Locked-off "
     "camera. The car glides in from the left edge at a calm speed, wheels turning, and eases to a smooth stop "
     "exactly in the S01 position, then holds still for the final second.",
     "Cut the car out of every frame (or film on the grey background and key it) for the transparent hero.",
     "Video (image-to-video, first + last frame, 8 s)"),
    ("V7", "Configurator / hero scroll-scrub: a 360-degree turntable the visitor rotates by scrolling.",
     "Input image: S02. The car sits on a slowly rotating turntable in the dark studio and turns one full 360 "
     "degrees at perfectly constant speed, ending exactly where it started. Locked-off camera at headlamp height, "
     "the overhead light panel fixed so highlights slide over the body as it turns.",
     "Use S02 as both first and last frame. Extract at 12 fps for about 96 scroll frames.",
     "Video (image-to-video, first + last frame, 8 s)"),
]

CHECKLIST = [
    "Start a NEW Gemini chat for version 2. The old chat remembers the Phantom images and will keep drifting back to them.",
    "Never upload the reference images in images/reference/ as input. They will carry the Phantom design into every new image.",
    "Generate S01 (side profile) first and iterate until it is clearly original: fastback roof, low horizontal grille, disc wheels, nothing on the bonnet. It becomes the master reference.",
    "If a result shows a tall vertical grille, a bonnet mascot or a logo, do not edit it. Reply in the same chat with: 'Make the grille low and wide with horizontal bars, remove anything on the bonnet, remove all logos.' Regenerate if it persists.",
    "Then make S02 and S03 by uploading the approved S01 and asking for the new angle. Approve these three as the reference set.",
    "Attach the reference set to every later still and keyframe, and paste the car and style bibles exactly as written.",
    "Use one tool and model for the whole set. Note the settings of every approved image.",
    "Check every result: fastback roof, low horizontal bronze grille, light-line headlamps, bronze disc wheels, gold coachline, single-colour body, no logos anywhere (grille, wheels, steering wheel, headrests).",
    "Make the six keyframes (KF1-KF6) TODAY as images, so tomorrow's video work only animates approved frames.",
    "Video: use image-to-video from approved stills only. For V1-V7 use a tool with first + last frame mode (in Google's tools this is Flow, 'Frames to Video').",
    "Chain the journey clips: export the real last frame of V1 and use it as the first frame of V2, and so on. This makes the joins match exactly.",
    "When joining clips, drop the duplicated frame at each join. Keep speed constant across joins (ease only at the start of V1 and end of V5).",
    "Final files must have no visible watermark. Use a plan or tool that exports without one rather than cropping or painting it out.",
    "Grade every final image and clip with the same LUT or preset so colours match across the site.",
]


def still_prompt(shot):
    return f"{CAR_BIBLE} {shot} {STYLE_BIBLE}"


def rows():
    out = []
    for sid, use, shot, ar in STILLS:
        # S20 is an empty background plate, so it skips the car bible.
        prompt = f"{shot} {STYLE_BIBLE}" if sid == "S20" else still_prompt(shot)
        out.append((sid, use, prompt, ar, "Image"))
    for kid, use, scene in KEYFRAMES:
        out.append((kid, use, still_prompt(f"{scene} {KF_CAMERA}"), "16:9", "Image (keyframe, make today)"))
    for vid, a, b, motion in TRANSITIONS:
        p = (f"First frame: {a}. Last frame: {b}. 8 seconds. A single continuous drone-style glide following "
             f"{CAR_TAG}, at a constant height and distance behind it, wheels turning. {motion} The final frame "
             f"must match {b} exactly. {VIDEO_RULES}")
        out.append((vid, f"Journey video: {a} to {b} (scroll sequence).", p, "16:9", "Video (image-to-video, first + last frame, 8 s)"))
    for lid, use, motion, note, tool in LOOPS:
        length = "6-second seamless loop" if lid.startswith("L") else "8-second clip"
        p = f"{length} of {CAR_TAG}. {motion} {VIDEO_RULES} Note: {note}"
        out.append((lid, use, p, "16:9", tool))
    return out


def md_cell(s):
    return s.replace("|", "/").replace("\n", " ")


def build():
    OUT.mkdir(exist_ok=True)
    data = rows()

    with open(OUT / "aurelian-prompts.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["ID", "Website use", "Prompt", "Aspect ratio", "Tool type"])
        w.writerows(data)

    lines = [
        "# Aurelian prompt pack (version 2)",
        "",
        "Fictional marque. No real brands, logos, badges, mascots or monograms. Generated by `tools/build_prompts.py`; edit that file, not this one.",
        "",
        "Version 2 redesigns the car so image tools stop drifting to a Rolls-Royce Phantom (see `images/reference/README.txt`).",
        "",
        "## Step 1: Car bible",
        "",
        f"> {CAR_BIBLE}",
        "",
        f"Short version for video prompts: *{CAR_TAG}*",
        "",
        "## Step 2: Style bible",
        "",
        f"> {STYLE_BIBLE}",
        "",
        "## Order of work",
        "",
        "1. Today: S01, then S02 and S03 (reference set), then KF1-KF6, then the other stills.",
        "2. Tomorrow: V1-V5 (journey), V6 and V7 (hero clips), L1-L3 (loops).",
        "",
        "## Steps 3 to 5: All prompts",
        "",
        "S = stills, KF = journey keyframes, V = 8 s clips, L = 6 s background loops.",
        "",
        "| ID | Website use | Prompt | Aspect ratio | Tool type |",
        "|---|---|---|---|---|",
    ]
    for r in data:
        lines.append("| " + " | ".join(md_cell(c) for c in r) + " |")
    lines += [
        "",
        "## Joining the journey clips for this site",
        "",
        "5 clips x 8 s = 40 s. `js/config.js` expects 120 frames, so extract at 3 fps:",
        "",
        "```bat",
        'ffmpeg -i journey.mp4 -vf "fps=3,scale=1600:-2" -c:v libwebp -quality 70 frames\\%03d.webp',
        "```",
        "",
        "## Consistency checklist",
        "",
    ]
    lines += [f"- [ ] {c}" for c in CHECKLIST]
    lines += ["", "## Negative prompt (for tools that support one)", "", f"> {NEGATIVE}", ""]
    (OUT / "aurelian-prompt-pack.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {len(data)} prompts to {OUT}")
    print(f"Car bible: {len(CAR_BIBLE.split())} words")


if __name__ == "__main__":
    build()
