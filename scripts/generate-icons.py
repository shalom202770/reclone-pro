#!/usr/bin/env python3
"""
Generate multi-resolution macOS .icns, Windows .ico, and high-res .png app icons
from the amber-orange cloud squircle design.
"""
import os
import subprocess
from collections import deque
from PIL import Image, ImageFilter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
RESOURCES_DIR = os.path.join(PROJECT_ROOT, 'resources')
SOURCE_IMG = '/Users/slwm/.gemini/antigravity-ide/brain/968fcbca-e0d8-44ae-bf03-8da0e7208608/.user_uploaded/media_1792880650453.png'

def generate_icons():
    if not os.path.exists(SOURCE_IMG):
        print(f"Source image not found: {SOURCE_IMG}")
        return

    src = Image.open(SOURCE_IMG).convert('RGBA')
    w, h = src.size
    pixels = src.load()

    # Flood fill white background from borders
    visited = set()
    q = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))

    outside = set()
    while q:
        x, y = q.popleft()
        if (x, y) in visited:
            continue
        visited.add((x, y))
        r, g, b, a = pixels[x, y]
        if b > 210 and g > 210 and r > 210:
            outside.add((x, y))
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                    q.append((nx, ny))

    for (x, y) in outside:
        pixels[x, y] = (0, 0, 0, 0)

    # De-matte boundary pixels
    for y in range(h):
        for x in range(w):
            if (x, y) not in outside:
                is_near = any(
                    pixels[x + dx, y + dy][3] == 0
                    for dx in range(-2, 3)
                    for dy in range(-2, 3)
                    if 0 <= x + dx < w and 0 <= y + dy < h
                )
                if is_near:
                    r, g, b, a = pixels[x, y]
                    if b > 40:
                        alpha = max(0.0, min(1.0, (255.0 - b) / (255.0 - 36.0)))
                        if alpha > 0.05:
                            pixels[x, y] = (227, 101, 36, int(alpha * 255))
                        else:
                            pixels[x, y] = (0, 0, 0, 0)

    bbox = src.getbbox()
    squircle = src.crop(bbox)

    # Standard macOS 1024x1024 canvas with 830x830 squircle & subtle drop shadow
    mac_canvas = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    squircle_resized = squircle.resize((830, 830), Image.Resampling.LANCZOS)

    shadow_mask = squircle_resized.split()[3]
    shadow_layer = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    shadow_layer.paste((0, 0, 0, 65), (97, 111), mask=shadow_mask)
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(14))

    mac_canvas = Image.alpha_composite(shadow_layer, mac_canvas)
    mac_canvas.paste(squircle_resized, (97, 97), mask=squircle_resized.split()[3])

    os.makedirs(RESOURCES_DIR, exist_ok=True)
    png_path = os.path.join(RESOURCES_DIR, 'icon.png')
    mac_canvas.save(png_path, 'PNG')
    print(f"Generated {png_path}")

    # Generate .iconset for macOS
    iconset_dir = '/tmp/reclone.iconset'
    os.makedirs(iconset_dir, exist_ok=True)
    sizes = [
        (16, 'icon_16x16.png'),
        (32, 'icon_16x16@2x.png'),
        (32, 'icon_32x32.png'),
        (64, 'icon_32x32@2x.png'),
        (128, 'icon_128x128.png'),
        (256, 'icon_128x128@2x.png'),
        (256, 'icon_256x256.png'),
        (512, 'icon_256x256@2x.png'),
        (512, 'icon_512x512.png'),
        (1024, 'icon_512x512@2x.png'),
    ]
    for s, name in sizes:
        resized = mac_canvas.resize((s, s), Image.Resampling.LANCZOS)
        resized.save(os.path.join(iconset_dir, name), 'PNG')

    icns_path = os.path.join(RESOURCES_DIR, 'icon.icns')
    subprocess.run(['iconutil', '-c', 'icns', iconset_dir, '-o', icns_path], check=True)
    print(f"Generated {icns_path}")

    # Generate Windows .ico
    win_canvas = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    win_squircle = squircle.resize((960, 960), Image.Resampling.LANCZOS)
    win_canvas.paste(win_squircle, (32, 32), mask=win_squircle.split()[3])
    ico_path = os.path.join(RESOURCES_DIR, 'icon.ico')
    win_canvas.save(ico_path, format='ICO', sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print(f"Generated {ico_path}")

if __name__ == '__main__':
    generate_icons()
