#!/usr/bin/env python3
"""
Generate app icon: full solid orange square + cloud outline.
macOS applies the squircle mask automatically — no white bg needed.
"""
import subprocess
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    subprocess.run(["pip3", "install", "pillow", "-q"], check=True)
    from PIL import Image, ImageDraw

SIZE = 1024
OUT = Path("/Users/slwm/Desktop/reclone pro/resources")
BG  = (232, 84, 26)   # #E8541A solid orange

# --- Source image: crop cloud from AI-generated image ---
SRC = Path("/Users/slwm/.gemini/antigravity-ide/brain/968fcbca-e0d8-44ae-bf03-8da0e7208608/app_icon_perfect_1792881332381.jpg")
src = Image.open(SRC).convert("RGB")
W, H = src.size

# Find squircle bounds (non-white pixels)
top, bottom, left, right = H, 0, W, 0
for y in range(H):
    for x in range(W):
        r, g, b = src.getpixel((x, y))
        if not (r > 230 and g > 230 and b > 230):
            top    = min(top,    y)
            bottom = max(bottom, y)
            left   = min(left,   x)
            right  = max(right,  x)

# Square crop of squircle content
side = max(bottom - top, right - left)
cx = (left + right) // 2
cy = (top + bottom) // 2
half = side // 2
sq = src.crop((cx-half, cy-half, cx+half, cy+half)).resize((SIZE, SIZE), Image.LANCZOS)

# --- Build final icon: solid orange canvas, paste cloud outline only ---
# Extract cloud outline mask: white pixels from the cropped squircle image
final = Image.new("RGB", (SIZE, SIZE), BG)  # full orange canvas

sq_arr = sq.load()
final_arr = final.load()

for y in range(SIZE):
    for x in range(SIZE):
        r, g, b = sq_arr[x, y]
        # White stroke pixels → keep white; orange pixels → keep BG orange
        if r > 220 and g > 200 and b > 190:
            final_arr[x, y] = (255, 255, 255)
        # else stays orange (BG)

# Save
icon_png = OUT / "icon.png"
final.save(icon_png, "PNG")
print(f"✅ {icon_png}")

# Generate iconset
iconset = OUT / "icon.iconset"
iconset.mkdir(exist_ok=True)
for sz, scale in [(16,1),(16,2),(32,1),(32,2),(64,1),(64,2),(128,1),(128,2),(256,1),(256,2),(512,1),(512,2),(1024,1)]:
    px = sz * scale
    name = f"icon_{sz}x{sz}.png" if scale == 1 else f"icon_{sz}x{sz}@2x.png"
    final.resize((px, px), Image.LANCZOS).save(iconset / name, "PNG")

r = subprocess.run(["iconutil", "-c", "icns", str(iconset), "-o", str(OUT / "icon.icns")], capture_output=True, text=True)
print("✅ icon.icns" if r.returncode == 0 else f"❌ {r.stderr}")

frames = [final.resize((s,s), Image.LANCZOS).convert("RGBA") for s in [16,32,48,64,128,256]]
frames[0].save(OUT/"icon.ico", format="ICO", sizes=[(s,s) for s in [16,32,48,64,128,256]], append_images=frames[1:])
print("✅ icon.ico")
