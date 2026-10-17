import os
import math
import numpy as np
from PIL import Image, ImageFilter, ImageOps, ImageDraw

def draw_rounded_rect(draw, bbox, r, fill):
    """Draw a smooth rounded rectangle with arcs and rects (compatible with all Pillow versions)"""
    x0, y0, x1, y1 = bbox
    r = min(r, (x1 - x0) // 2, (y1 - y0) // 2)
    if r <= 0:
        draw.rectangle(bbox, fill=fill)
        return
    draw.rectangle([x0 + r, y0, x1 - r, y1], fill=fill)
    draw.rectangle([x0, y0 + r, x1, y1 - r], fill=fill)
    draw.pieslice([x0, y0, x0 + 2*r, y0 + 2*r], 180, 270, fill=fill)
    draw.pieslice([x1 - 2*r, y0, x1, y0 + 2*r], 270, 360, fill=fill)
    draw.pieslice([x0, y1 - 2*r, x0 + 2*r, y1], 90, 180, fill=fill)
    draw.pieslice([x1 - 2*r, y1 - 2*r, x1, y1], 0, 90, fill=fill)

def make_squircle_mask(width, height, radius):
    """4x supersampled smooth anti-aliased squircle mask"""
    scale = 4
    sw, sh, sr = width * scale, height * scale, radius * scale
    mask = Image.new('L', (sw, sh), 0)
    draw = ImageDraw.Draw(mask)
    draw_rounded_rect(draw, (0, 0, sw, sh), sr, 255)
    return mask.resize((width, height), Image.LANCZOS)

def make_circle_mask(width, height):
    """4x supersampled smooth anti-aliased circle mask"""
    scale = 4
    sw, sh = width * scale, height * scale
    mask = Image.new('L', (sw, sh), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, sw, sh), fill=255)
    return mask.resize((width, height), Image.LANCZOS)

def extract_flat_purple_cube(raw_logo_path):
    """Extract cube symbol at high resolution and map to crisp modern flat purple tones"""
    orig = Image.open(raw_logo_path).convert('RGB')
    w, h = orig.size
    arr = np.array(orig, dtype=np.float32)
    r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
    
    # Extract alpha from original gold symbol on dark background
    diff = r - b
    alpha = np.clip((diff - 2.0) / 20.0, 0.0, 1.0)
    
    mask_full = np.zeros((h, w), dtype=np.float32)
    mask_full[150:860, 190:950] = alpha[150:860, 190:950]
    
    cube_arr = np.zeros((h, w, 4), dtype=np.uint8)
    cube_arr[:,:,:3] = arr[:,:,:3].astype(np.uint8)
    cube_arr[:,:,3] = (mask_full * 255).astype(np.uint8)
    
    cube_img = Image.fromarray(cube_arr, 'RGBA')
    bbox = cube_img.getbbox()
    cube_clean = cube_img.crop(bbox)
    
    # Flat Purple Tone Mapping:
    # Transforms 3D metallic gold luminance into authentic Jiibha flat purple brand shades
    c_arr = np.array(cube_clean, dtype=np.float32)
    c_rgb = c_arr[:, :, :3]
    c_alpha = c_arr[:, :, 3]
    
    lum = (0.299 * c_rgb[:,:,0] + 0.587 * c_rgb[:,:,1] + 0.114 * c_rgb[:,:,2]) / 255.0
    lum_masked = np.where(c_alpha > 20, lum, 0)
    min_l = np.percentile(lum_masked[c_alpha > 50], 2)
    max_l = np.percentile(lum_masked[c_alpha > 50], 98)
    norm_lum = np.clip((lum_masked - min_l) / (max_l - min_l + 1e-5), 0.0, 1.0)
    
    # Rich Jiibha Purple Palette (#3d0c8c / #450ea1 / #6e25e3):
    # Deep shadow: #22054a (RGB 34, 5, 74)
    # Bright highlight: #6e25e3 (RGB 110, 37, 227)
    c_r = (34 * (1 - norm_lum) + 110 * norm_lum).astype(np.uint8)
    c_g = (5 * (1 - norm_lum) + 37 * norm_lum).astype(np.uint8)
    c_b = (74 * (1 - norm_lum) + 227 * norm_lum).astype(np.uint8)
    
    purple_arr = np.dstack([c_r, c_g, c_b, c_alpha.astype(np.uint8)])
    purple_cube = Image.fromarray(purple_arr, 'RGBA')
    return purple_cube

def process_brand_assets():
    workspace = r"c:\Users\AMER\Desktop\projects Antigravity\isttirad"
    raw_logo_path = r"C:\Users\AMER\.gemini\antigravity-ide\brain\efc5dd49-5540-432f-8407-459acbf94db6\.user_uploaded\media_1792161118577.jpg"
    
    if not os.path.exists(raw_logo_path):
        raw_logo_path = os.path.join(workspace, "scripts", "purple_option_a.png")
        
    print(f"Extracting high-definition flat purple cube symbol...")
    clean_cube = extract_flat_purple_cube(raw_logo_path)
    cw, ch = clean_cube.size
    print(f"Clean flat purple cube ready: {cw}x{ch} px")

    # ---------------------------------------------------------------------------------
    # 1. GENERATE MASTER APP LOGO (public/app-logo.png - 1024x1024 on White Squircle)
    # ---------------------------------------------------------------------------------
    print("1. Generating Master App Logo (1024x1024 with pure white background & enlarged purple cube)...")
    canvas_size = 1024
    outer_margin = 56
    icon_dim = canvas_size - 2 * outer_margin  # 912x912
    corner_radius = 210
    
    # Pure White Squircle Background
    white_bg = Image.new('RGBA', (icon_dim, icon_dim), (255, 255, 255, 255))
    outer_mask = make_squircle_mask(icon_dim, icon_dim, corner_radius)
    
    master_icon = Image.new('RGBA', (icon_dim, icon_dim), (0, 0, 0, 0))
    master_icon.paste(white_bg, (0, 0), outer_mask)
    
    # Enlarged Purple Cube like Play Store logo proportion (~72% of squircle)
    target_cube_w = int(icon_dim * 0.72)  # ~656 px width
    cube_scale = target_cube_w / float(cw)
    scaled_w, scaled_h = int(cw * cube_scale), int(ch * cube_scale)
    scaled_cube = clean_cube.resize((scaled_w, scaled_h), Image.LANCZOS)
    scaled_cube = scaled_cube.filter(ImageFilter.UnsharpMask(radius=1.2, percent=110, threshold=1))
    
    cube_x = (icon_dim - scaled_w) // 2
    cube_y = (icon_dim - scaled_h) // 2
    master_icon.alpha_composite(scaled_cube, (cube_x, cube_y))
    
    # Subtle ambient drop shadow on 1024x1024 canvas for crisp presentation
    final_master_logo = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    icon_shadow = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    icon_shadow_layer = Image.new('RGBA', (icon_dim, icon_dim), (0, 0, 0, 45))
    icon_shadow.paste(icon_shadow_layer, (outer_margin, outer_margin + 12), outer_mask)
    icon_shadow = icon_shadow.filter(ImageFilter.GaussianBlur(radius=16))
    
    final_master_logo.alpha_composite(icon_shadow)
    final_master_logo.alpha_composite(master_icon, (outer_margin, outer_margin))
    
    public_logo_path = os.path.join(workspace, "public", "app-logo.png")
    final_master_logo.save(public_logo_path, format="PNG", quality=95)
    print("Saved public/app-logo.png successfully!")
    
    # -------------------------------------------------------------
    # 2. GENERATE WEB FAVICONS (favicon.png, favicon.ico)
    # -------------------------------------------------------------
    print("2. Generating Favicons...")
    fav_img = master_icon.resize((64, 64), Image.LANCZOS)
    fav_img.save(os.path.join(workspace, "public", "favicon.png"), format="PNG")
    fav_img.resize((32, 32), Image.LANCZOS).save(os.path.join(workspace, "public", "favicon.ico"), format="ICO")
    print("Saved public/favicon.png and public/favicon.ico")

    # -------------------------------------------------------------
    # 3. GENERATE ANDROID MIPMAP LAUNCHER ICONS
    # -------------------------------------------------------------
    print("3. Generating Android Mipmap Icons (Adaptive & Legacy)...")
    res_dir = os.path.join(workspace, "android", "app", "src", "main", "res")
    
    # Adaptive Foreground canvas (108dp canvas with safe zone 72dp)
    fg_sizes = {
        "mipmap-mdpi": 108,
        "mipmap-hdpi": 162,
        "mipmap-xhdpi": 216,
        "mipmap-xxhdpi": 324,
        "mipmap-xxxhdpi": 432
    }
    
    # Legacy ic_launcher canvas
    legacy_sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192
    }
    
    for folder, dim in fg_sizes.items():
        target_dir = os.path.join(res_dir, folder)
        os.makedirs(target_dir, exist_ok=True)
        
        # Safe zone is 72dp out of 108dp
        safe_size = int(dim * (288.0 / 432.0))
        
        # a) Adaptive Foreground (Centered enlarged purple cube on transparent canvas)
        # Scaled to 70% of safe zone (prominent like Play Store, zero clipping in circle mode)
        cube_dim = int(safe_size * 0.70)
        cube_s = cube_dim / float(cw)
        sc = clean_cube.resize((int(cw * cube_s), int(ch * cube_s)), Image.LANCZOS)
        
        cx = (dim - sc.width) // 2
        cy = (dim - sc.height) // 2
        
        fg_img = Image.new('RGBA', (dim, dim), (0, 0, 0, 0))
        fg_img.alpha_composite(sc, (cx, cy))
        
        fg_out = os.path.join(target_dir, "ic_launcher_foreground.png")
        fg_img.save(fg_out, format="PNG")
        
        # Foreground round
        fg_round_out = os.path.join(target_dir, "ic_launcher_foreground_round.png")
        fg_img.save(fg_round_out, format="PNG")
        
        # b) Legacy Square Icon (ic_launcher.png on pure white squircle)
        leg_dim = legacy_sizes[folder]
        leg_radius = int(leg_dim * 0.22)
        
        leg_outer_mask = make_squircle_mask(leg_dim, leg_dim, leg_radius)
        leg_img = Image.new('RGBA', (leg_dim, leg_dim), (0, 0, 0, 0))
        leg_white = Image.new('RGBA', (leg_dim, leg_dim), (255, 255, 255, 255))
        leg_img.paste(leg_white, (0, 0), leg_outer_mask)
        
        leg_cube_dim = int(leg_dim * 0.70)
        leg_scale = leg_cube_dim / float(cw)
        leg_sc = clean_cube.resize((int(cw * leg_scale), int(ch * leg_scale)), Image.LANCZOS)
        lx = (leg_dim - leg_sc.width) // 2
        ly = (leg_dim - leg_sc.height) // 2
        leg_img.alpha_composite(leg_sc, (lx, ly))
        
        leg_out = os.path.join(target_dir, "ic_launcher.png")
        leg_img.save(leg_out, format="PNG")
        
        # c) Legacy Round Icon (ic_launcher_round.png on pure white circle)
        round_outer_mask = make_circle_mask(leg_dim, leg_dim)
        round_img = Image.new('RGBA', (leg_dim, leg_dim), (0, 0, 0, 0))
        round_img.paste(leg_white, (0, 0), round_outer_mask)
        round_img.alpha_composite(leg_sc, (lx, ly))
        
        round_out = os.path.join(target_dir, "ic_launcher_round.png")
        round_img.save(round_out, format="PNG")
        
    print("Android mipmap icons generated successfully!")
    
    # 4. Update ic_launcher_background.xml to Pure White #ffffff
    bg_xml_path = os.path.join(res_dir, "values", "ic_launcher_background.xml")
    with open(bg_xml_path, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#ffffff</color>\n</resources>\n')
    print("Updated ic_launcher_background.xml to #ffffff")

    # 5. Update ic_launcher_round.xml in mipmap-anydpi-v26
    round_xml_path = os.path.join(res_dir, "mipmap-anydpi-v26", "ic_launcher_round.xml")
    with open(round_xml_path, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground_round"/>\n</adaptive-icon>\n')
    print("Updated mipmap-anydpi-v26/ic_launcher_round.xml")

    # 6. Splash screens strictly preserved as per agreed v1.2.4
    print("Splash screens strictly preserved as per agreed v1.2.4.")
    print("All brand assets processed successfully!")

if __name__ == "__main__":
    process_brand_assets()
