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

def generate_metallic_gold_texture(width, height):
    """Generate luxury 135-degree diagonal multi-stop metallic gold reflection"""
    y_coords, x_coords = np.ogrid[:height, :width]
    diag = (x_coords + y_coords) / float(width + height)
    
    # Luxury metallic gold gradient stops
    # 0.00 -> #FFF6D6 (255, 246, 214) bright highlight
    # 0.20 -> #F7DA8B (247, 218, 139) champagne reflection
    # 0.45 -> #D6AF37 (214, 175, 55)  rich pure gold
    # 0.70 -> #AA7C22 (170, 124, 34)  burnished warm gold
    # 0.88 -> #7D5314 (125, 83, 20)   deep bronze shadow
    # 1.00 -> #A87A1E (168, 122, 30)  soft edge bounce
    def gold_stop(d):
        if d < 0.20:
            t = d / 0.20
            return np.array([255, 246, 214]) * (1 - t) + np.array([247, 218, 139]) * t
        elif d < 0.45:
            t = (d - 0.20) / 0.25
            return np.array([247, 218, 139]) * (1 - t) + np.array([214, 175, 55]) * t
        elif d < 0.70:
            t = (d - 0.45) / 0.25
            return np.array([214, 175, 55]) * (1 - t) + np.array([170, 124, 34]) * t
        elif d < 0.88:
            t = (d - 0.70) / 0.18
            return np.array([170, 124, 34]) * (1 - t) + np.array([125, 83, 20]) * t
        else:
            t = (d - 0.88) / 0.12
            return np.array([125, 83, 20]) * (1 - t) + np.array([168, 122, 30]) * t
            
    lut = np.array([gold_stop(i / 255.0) for i in range(256)], dtype=np.uint8)
    indices = np.clip(diag * 255, 0, 255).astype(np.uint8)
    gold_rgb = lut[indices]
    gold_arr = np.dstack([gold_rgb, np.full((height, width), 255, dtype=np.uint8)])
    return Image.fromarray(gold_arr, 'RGBA')

def generate_midnight_navy_background(width, height):
    """Generate rich midnight navy radial gradient background"""
    y_coords, x_coords = np.ogrid[:height, :width]
    cx, cy = width / 2.0, height / 2.0
    dist = np.sqrt((x_coords - cx)**2 + (y_coords - cy)**2)
    max_d = max(width, height) * 0.72
    norm_d = np.clip(dist / max_d, 0.0, 1.0)
    
    # Center (10, 36, 88) to corners (4, 14, 36)
    r_chan = (10 * (1 - norm_d) + 4 * norm_d).astype(np.uint8)
    g_chan = (36 * (1 - norm_d) + 14 * norm_d).astype(np.uint8)
    b_chan = (88 * (1 - norm_d) + 36 * norm_d).astype(np.uint8)
    a_chan = np.full((height, width), 255, dtype=np.uint8)
    return Image.fromarray(np.dstack([r_chan, g_chan, b_chan, a_chan]), 'RGBA')

def extract_clean_cube_symbol(raw_logo_path):
    """Extract gold 3D cube with ribbon and arrow with pristine alpha transparency"""
    orig = Image.open(raw_logo_path).convert('RGB')
    w, h = orig.size
    arr = np.array(orig, dtype=np.float32)
    r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
    
    # Calculate gold probability via color channels (Gold has high R and G, lower B)
    diff = r - b
    # Alpha mask: transition between dark blue background and gold metal
    alpha = np.clip((diff - 2.0) / 20.0, 0.0, 1.0)
    
    # Focus on cube region
    mask_full = np.zeros((h, w), dtype=np.float32)
    mask_full[150:860, 190:950] = alpha[150:860, 190:950]
    
    cube_arr = np.zeros((h, w, 4), dtype=np.uint8)
    cube_arr[:,:,:3] = arr[:,:,:3].astype(np.uint8)
    cube_arr[:,:,3] = (mask_full * 255).astype(np.uint8)
    
    cube_img = Image.fromarray(cube_arr, 'RGBA')
    bbox = cube_img.getbbox()
    cube_clean = cube_img.crop(bbox)
    return cube_clean

def process_brand_assets():
    workspace = r"c:\Users\AMER\Desktop\projects Antigravity\isttirad"
    raw_logo_path = r"C:\Users\AMER\.gemini\antigravity-ide\brain\efc5dd49-5540-432f-8407-459acbf94db6\.user_uploaded\media_1792161118577.jpg"
    
    if not os.path.exists(raw_logo_path):
        raw_logo_path = os.path.join(workspace, "public", "app-logo.png")
        
    print(f"Extracting clean golden cube symbol from: {raw_logo_path}...")
    clean_cube = extract_clean_cube_symbol(raw_logo_path)
    cw, ch = clean_cube.size
    print(f"Clean cube extracted: {cw}x{ch} px")

    # -------------------------------------------------------------
    # 1. GENERATE MASTER APP LOGO (public/app-logo.png - 1024x1024)
    # -------------------------------------------------------------
    print("1. Generating Master App Logo (1024x1024 with golden frame & balanced symbol)...")
    canvas_size = 1024
    outer_margin = 56
    icon_dim = canvas_size - 2 * outer_margin  # 912x912
    frame_thickness = 30
    corner_radius = 205
    
    # Squircle Background & Golden Frame
    bg_img = generate_midnight_navy_background(icon_dim, icon_dim)
    outer_mask = make_squircle_mask(icon_dim, icon_dim, corner_radius)
    
    inner_dim = icon_dim - 2 * frame_thickness
    inner_radius = max(10, corner_radius - frame_thickness)
    inner_mask_small = make_squircle_mask(inner_dim, inner_dim, inner_radius)
    inner_mask = Image.new('L', (icon_dim, icon_dim), 0)
    inner_mask.paste(inner_mask_small, (frame_thickness, frame_thickness))
    
    frame_arr = np.clip(np.array(outer_mask, dtype=np.int16) - np.array(inner_mask, dtype=np.int16), 0, 255).astype(np.uint8)
    frame_mask = Image.fromarray(frame_arr, 'L')
    gold_img = generate_metallic_gold_texture(icon_dim, icon_dim)
    
    master_icon = Image.new('RGBA', (icon_dim, icon_dim), (0, 0, 0, 0))
    master_icon.paste(bg_img, (0, 0), outer_mask)
    master_icon.paste(gold_img, (0, 0), frame_mask)
    
    # Inner shadow inside golden frame
    inner_shadow_mask = inner_mask.filter(ImageFilter.GaussianBlur(radius=6))
    shadow_arr = np.clip(np.array(inner_mask, dtype=np.int16) - np.array(inner_shadow_mask, dtype=np.int16), 0, 110).astype(np.uint8)
    inner_shadow_arr = np.zeros((icon_dim, icon_dim, 4), dtype=np.uint8)
    inner_shadow_arr[:, :, 3] = shadow_arr
    master_icon.alpha_composite(Image.fromarray(inner_shadow_arr, 'RGBA'))
    
    # Scale Cube Symbol down to ~410px width (luxury proportion requested: 'صغر الرمز')
    target_cube_w = 410
    cube_scale = target_cube_w / float(cw)
    scaled_w, scaled_h = int(cw * cube_scale), int(ch * cube_scale)
    scaled_cube = clean_cube.resize((scaled_w, scaled_h), Image.LANCZOS)
    scaled_cube = scaled_cube.filter(ImageFilter.UnsharpMask(radius=1.2, percent=115, threshold=1))
    
    # Realistic soft drop shadow under cube
    shadow_pad = 30
    cube_shadow = Image.new('RGBA', (scaled_w + shadow_pad*2, scaled_h + shadow_pad*2), (0, 0, 0, 0))
    c_alpha = scaled_cube.split()[3]
    black_cube = Image.new('RGBA', scaled_cube.size, (0, 0, 0, 175))
    cube_shadow.paste(black_cube, (shadow_pad, shadow_pad + 10), c_alpha)
    cube_shadow = cube_shadow.filter(ImageFilter.GaussianBlur(radius=14))
    
    cube_x = (icon_dim - scaled_w) // 2
    cube_y = (icon_dim - scaled_h) // 2
    
    master_icon.alpha_composite(cube_shadow, (cube_x - shadow_pad, cube_y - shadow_pad))
    master_icon.alpha_composite(scaled_cube, (cube_x, cube_y))
    
    # Outer ambient shadow on 1024x1024 canvas
    final_master_logo = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    icon_shadow = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    icon_shadow_layer = Image.new('RGBA', (icon_dim, icon_dim), (0, 0, 0, 115))
    icon_shadow.paste(icon_shadow_layer, (outer_margin, outer_margin + 14), outer_mask)
    icon_shadow = icon_shadow.filter(ImageFilter.GaussianBlur(radius=18))
    
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
        safe_x0 = (dim - safe_size) // 2
        safe_y0 = (dim - safe_size) // 2
        
        fg_frame_thick = max(2, int(safe_size * 0.035))
        fg_radius = int(safe_size * 0.22)
        
        # a) Adaptive Foreground (Squircle Golden Frame for Samsung / One UI / Squircle launchers)
        fg_outer_mask = make_squircle_mask(safe_size, safe_size, fg_radius)
        fg_inner_dim = safe_size - 2 * fg_frame_thick
        fg_inner_radius = max(2, fg_radius - fg_frame_thick)
        fg_inner_mask_small = make_squircle_mask(fg_inner_dim, fg_inner_dim, fg_inner_radius)
        fg_inner_mask = Image.new('L', (safe_size, safe_size), 0)
        fg_inner_mask.paste(fg_inner_mask_small, (fg_frame_thick, fg_frame_thick))
        
        fg_frame_arr = np.clip(np.array(fg_outer_mask, dtype=np.int16) - np.array(fg_inner_mask, dtype=np.int16), 0, 255).astype(np.uint8)
        fg_frame_mask = Image.fromarray(fg_frame_arr, 'L')
        fg_gold_img = generate_metallic_gold_texture(safe_size, safe_size)
        
        fg_img = Image.new('RGBA', (dim, dim), (0, 0, 0, 0))
        fg_img.paste(fg_gold_img, (safe_x0, safe_y0), fg_frame_mask)
        
        # Center scaled cube (45% of safe zone)
        cube_dim = int(safe_size * 0.45)
        cube_s = cube_dim / float(cw)
        sc = clean_cube.resize((int(cw * cube_s), int(ch * cube_s)), Image.LANCZOS)
        
        cx = (dim - sc.width) // 2
        cy = (dim - sc.height) // 2
        
        # Drop shadow for cube in foreground
        s_pad = max(4, int(dim * 0.02))
        s_img = Image.new('RGBA', (sc.width + s_pad*2, sc.height + s_pad*2), (0, 0, 0, 0))
        b_cube = Image.new('RGBA', sc.size, (0, 0, 0, 160))
        s_img.paste(b_cube, (s_pad, s_pad + max(2, int(dim * 0.01))), sc.split()[3])
        s_img = s_img.filter(ImageFilter.GaussianBlur(radius=max(1.5, dim * 0.012)))
        
        fg_img.alpha_composite(s_img, (cx - s_pad, cy - s_pad))
        fg_img.alpha_composite(sc, (cx, cy))
        
        fg_out = os.path.join(target_dir, "ic_launcher_foreground.png")
        fg_img.save(fg_out, format="PNG")
        
        # b) Adaptive Foreground Round (Circular Golden Ring for Pixel / Round launchers)
        fg_round_outer = make_circle_mask(safe_size, safe_size)
        fg_round_inner_small = make_circle_mask(fg_inner_dim, fg_inner_dim)
        fg_round_inner = Image.new('L', (safe_size, safe_size), 0)
        fg_round_inner.paste(fg_round_inner_small, (fg_frame_thick, fg_frame_thick))
        
        fg_round_frame_arr = np.clip(np.array(fg_round_outer, dtype=np.int16) - np.array(fg_round_inner, dtype=np.int16), 0, 255).astype(np.uint8)
        fg_round_frame_mask = Image.fromarray(fg_round_frame_arr, 'L')
        
        fg_round_img = Image.new('RGBA', (dim, dim), (0, 0, 0, 0))
        fg_round_img.paste(fg_gold_img, (safe_x0, safe_y0), fg_round_frame_mask)
        fg_round_img.alpha_composite(s_img, (cx - s_pad, cy - s_pad))
        fg_round_img.alpha_composite(sc, (cx, cy))
        
        fg_round_out = os.path.join(target_dir, "ic_launcher_foreground_round.png")
        fg_round_img.save(fg_round_out, format="PNG")
        
        # c) Legacy Square Icon (ic_launcher.png)
        leg_dim = legacy_sizes[folder]
        leg_frame_thick = max(1, int(leg_dim * 0.035))
        leg_radius = int(leg_dim * 0.22)
        
        leg_bg = generate_midnight_navy_background(leg_dim, leg_dim)
        leg_outer_mask = make_squircle_mask(leg_dim, leg_dim, leg_radius)
        leg_inner_dim = leg_dim - 2 * leg_frame_thick
        leg_inner_radius = max(2, leg_radius - leg_frame_thick)
        leg_inner_mask_small = make_squircle_mask(leg_inner_dim, leg_inner_dim, leg_inner_radius)
        leg_inner_mask = Image.new('L', (leg_dim, leg_dim), 0)
        leg_inner_mask.paste(leg_inner_mask_small, (leg_frame_thick, leg_frame_thick))
        
        leg_frame_arr = np.clip(np.array(leg_outer_mask, dtype=np.int16) - np.array(leg_inner_mask, dtype=np.int16), 0, 255).astype(np.uint8)
        leg_gold = generate_metallic_gold_texture(leg_dim, leg_dim)
        
        leg_img = Image.new('RGBA', (leg_dim, leg_dim), (0, 0, 0, 0))
        leg_img.paste(leg_bg, (0, 0), leg_outer_mask)
        leg_img.paste(leg_gold, (0, 0), Image.fromarray(leg_frame_arr, 'L'))
        
        leg_cube_dim = int(leg_dim * 0.45)
        leg_scale = leg_cube_dim / float(cw)
        leg_sc = clean_cube.resize((int(cw * leg_scale), int(ch * leg_scale)), Image.LANCZOS)
        lx = (leg_dim - leg_sc.width) // 2
        ly = (leg_dim - leg_sc.height) // 2
        leg_img.alpha_composite(leg_sc, (lx, ly))
        
        leg_out = os.path.join(target_dir, "ic_launcher.png")
        leg_img.save(leg_out, format="PNG")
        
        # d) Legacy Round Icon (ic_launcher_round.png)
        round_outer_mask = make_circle_mask(leg_dim, leg_dim)
        round_inner_small = make_circle_mask(leg_inner_dim, leg_inner_dim)
        round_inner_mask = Image.new('L', (leg_dim, leg_dim), 0)
        round_inner_mask.paste(round_inner_small, (leg_frame_thick, leg_frame_thick))
        round_frame_arr = np.clip(np.array(round_outer_mask, dtype=np.int16) - np.array(round_inner_mask, dtype=np.int16), 0, 255).astype(np.uint8)
        
        round_img = Image.new('RGBA', (leg_dim, leg_dim), (0, 0, 0, 0))
        round_img.paste(leg_bg, (0, 0), round_outer_mask)
        round_img.paste(leg_gold, (0, 0), Image.fromarray(round_frame_arr, 'L'))
        round_img.alpha_composite(leg_sc, (lx, ly))
        
        round_out = os.path.join(target_dir, "ic_launcher_round.png")
        round_img.save(round_out, format="PNG")
        
    print("Android mipmap icons (foreground, foreground_round, legacy, round) generated successfully!")
    
    # 4. Update ic_launcher_background.xml
    bg_xml_path = os.path.join(res_dir, "values", "ic_launcher_background.xml")
    with open(bg_xml_path, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#061e47</color>\n</resources>\n')
    print("Updated ic_launcher_background.xml")

    # 5. Update ic_launcher_round.xml in mipmap-anydpi-v26
    round_xml_path = os.path.join(res_dir, "mipmap-anydpi-v26", "ic_launcher_round.xml")
    with open(round_xml_path, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground_round"/>\n</adaptive-icon>\n')
    print("Updated mipmap-anydpi-v26/ic_launcher_round.xml with foreground_round")

    # 6. Preserve the exact agreed splash screens from v1.2.4 (do not alter)
    print("4. Splash screens strictly preserved as per agreed v1.2.4.")
    print("All brand assets processed successfully!")

if __name__ == "__main__":
    process_brand_assets()
