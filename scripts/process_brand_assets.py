import os
import math
from PIL import Image, ImageFilter, ImageOps, ImageDraw

def process_brand_assets():
    workspace = r"c:\Users\AMER\Desktop\projects Antigravity\isttirad"
    raw_logo_path = r"C:\Users\AMER\.gemini\antigravity-ide\brain\efc5dd49-5540-432f-8407-459acbf94db6\.user_uploaded\media_1792161118577.jpg"
    raw_header_path = os.path.join(workspace, "public", "header-logo.png")
    
    print("1. Processing App Logo...")
    if not os.path.exists(raw_logo_path):
        raw_logo_path = os.path.join(workspace, "public", "app-logo.png")
    
    orig_logo = Image.open(raw_logo_path).convert("RGBA")
    w, h = orig_logo.size
    
    # Locate cube bounding box
    # Background color is around (6, 35, 79)
    bg_r, bg_g, bg_b = 6, 35, 79
    min_x, min_y, max_x, max_y = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b, _ = orig_logo.getpixel((x, y))
            if abs(r - bg_r) > 35 or abs(g - bg_g) > 35 or abs(b - bg_b) > 35:
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y
                
    print(f"Cube bounds: ({min_x}, {min_y}) to ({max_x}, {max_y}), size: {max_x - min_x}x{max_y - min_y}")
    cube_crop = orig_logo.crop((min_x, min_y, max_x + 1, max_y + 1))
    
    # Make a clean square canvas 1024x1024
    # The user says: "المربع الذهبي كبير لا يظهر كله, عدله وصغره حتى يظهر كله كسائر لوغوات التطبيقات, وحسن جودته"
    # To be visible inside Android's circle/squircle mask (safe zone is ~62-66%),
    # the cube should have target size ~600px inside 1024x1024 canvas.
    target_cube_size = 620
    cw, ch = cube_crop.size
    scale = target_cube_size / max(cw, ch)
    new_cw, new_ch = int(cw * scale), int(ch * scale)
    scaled_cube = cube_crop.resize((new_cw, new_ch), Image.LANCZOS)
    
    # Sharpen slightly for ultra crispness
    scaled_cube = scaled_cube.filter(ImageFilter.UnsharpMask(radius=1.5, percent=120, threshold=2))
    
    # Create final 1024x1024 full app logo with dark midnight blue background
    # Background gradient / rich navy: #061e47
    logo_1024 = Image.new("RGBA", (1024, 1024), (6, 30, 71, 255))
    paste_x = (1024 - new_cw) // 2
    paste_y = (1024 - new_ch) // 2
    logo_1024.paste(scaled_cube, (paste_x, paste_y), scaled_cube if scaled_cube.mode == "RGBA" else None)
    
    # Save public/app-logo.png
    public_logo_path = os.path.join(workspace, "public", "app-logo.png")
    logo_1024.save(public_logo_path, format="PNG", quality=95)
    print("Saved public/app-logo.png")
    
    # 2. Generate Android Mipmap Icons
    print("2. Generating Android Mipmap Icons...")
    res_dir = os.path.join(workspace, "android", "app", "src", "main", "res")
    
    # Android Adaptive Foreground sizes (108dp canvas with safe zone 72dp)
    # The foreground should have a transparent background and the cube scaled to ~60% of canvas
    fg_sizes = {
        "mipmap-mdpi": 108,
        "mipmap-hdpi": 162,
        "mipmap-xhdpi": 216,
        "mipmap-xxhdpi": 324,
        "mipmap-xxxhdpi": 432
    }
    
    # Android legacy ic_launcher sizes (full icon with background)
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
        
        # Adaptive Foreground (transparent bg, cube in center ~60% size)
        fg_img = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
        fg_cube_size = int(dim * 0.60)
        fg_scale = fg_cube_size / max(cw, ch)
        scaled_fg_cube = cube_crop.resize((int(cw * fg_scale), int(ch * fg_scale)), Image.LANCZOS)
        cx = (dim - scaled_fg_cube.width) // 2
        cy = (dim - scaled_fg_cube.height) // 2
        fg_img.paste(scaled_fg_cube, (cx, cy), scaled_fg_cube)
        
        fg_out = os.path.join(target_dir, "ic_launcher_foreground.png")
        fg_img.save(fg_out, format="PNG")
        
        # Legacy square and round icons
        leg_dim = legacy_sizes[folder]
        leg_img = Image.new("RGBA", (leg_dim, leg_dim), (6, 30, 71, 255))
        leg_cube_size = int(leg_dim * 0.72)
        leg_scale = leg_cube_size / max(cw, ch)
        scaled_leg_cube = cube_crop.resize((int(cw * leg_scale), int(ch * leg_scale)), Image.LANCZOS)
        lx = (leg_dim - scaled_leg_cube.width) // 2
        ly = (leg_dim - scaled_leg_cube.height) // 2
        leg_img.paste(scaled_leg_cube, (lx, ly), scaled_leg_cube)
        
        # Save ic_launcher.png
        leg_out = os.path.join(target_dir, "ic_launcher.png")
        leg_img.save(leg_out, format="PNG")
        
        # Circular mask for ic_launcher_round.png
        mask = Image.new("L", (leg_dim, leg_dim), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, leg_dim, leg_dim), fill=255)
        round_img = Image.new("RGBA", (leg_dim, leg_dim), (0, 0, 0, 0))
        round_img.paste(leg_img, (0, 0), mask)
        round_out = os.path.join(target_dir, "ic_launcher_round.png")
        round_img.save(round_out, format="PNG")
        
    print("Android mipmap launcher icons generated successfully!")
    
    # 3. Update ic_launcher_background.xml
    bg_xml_path = os.path.join(res_dir, "values", "ic_launcher_background.xml")
    with open(bg_xml_path, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#061e47</color>\n</resources>\n')
    print("Updated ic_launcher_background.xml with #061e47")
    
    # 4. Generate Native Android Splash Screens
    print("3. Generating Splash Screens for Android drawables...")
    # Splash sizes:
    # Port:
    splash_port_sizes = {
        "drawable-port-mdpi": (320, 480),
        "drawable-port-hdpi": (480, 800),
        "drawable-port-xhdpi": (720, 1280),
        "drawable-port-xxhdpi": (960, 1600),
        "drawable-port-xxxhdpi": (1280, 1920),
    }
    # Land:
    splash_land_sizes = {
        "drawable-land-mdpi": (480, 320),
        "drawable-land-hdpi": (800, 480),
        "drawable-land-xhdpi": (1280, 720),
        "drawable-land-xxhdpi": (1600, 960),
        "drawable-land-xxxhdpi": (1920, 1280),
    }
    
    def create_splash_image(width, height):
        # Create dark gradient background #040c1e
        splash = Image.new("RGBA", (width, height), (4, 12, 30, 255))
        # Place centered cube with appropriate size
        s_cube_dim = int(min(width, height) * 0.35)
        sc_scale = s_cube_dim / max(cw, ch)
        sc = cube_crop.resize((int(cw * sc_scale), int(ch * sc_scale)), Image.LANCZOS)
        sx = (width - sc.width) // 2
        sy = (height - sc.height) // 2 - int(height * 0.04) # slightly above center
        splash.paste(sc, (sx, sy), sc)
        return splash

    # Main drawable/splash.png (default 720x1280)
    main_splash = create_splash_image(720, 1280)
    main_splash.save(os.path.join(res_dir, "drawable", "splash.png"), format="PNG")
    main_splash.save(os.path.join(workspace, "public", "splash-screen.png"), format="PNG")

    for folder, (sw, sh) in splash_port_sizes.items():
        sdir = os.path.join(res_dir, folder)
        os.makedirs(sdir, exist_ok=True)
        img = create_splash_image(sw, sh)
        img.save(os.path.join(sdir, "splash.png"), format="PNG")
        
    for folder, (sw, sh) in splash_land_sizes.items():
        sdir = os.path.join(res_dir, folder)
        os.makedirs(sdir, exist_ok=True)
        img = create_splash_image(sw, sh)
        img.save(os.path.join(sdir, "splash.png"), format="PNG")
        
    print("All native splash screens updated to match AppSplashScreen!")
    
    # 5. Process Header Logo
    # Crop white side space and make background transparent
    print("4. Processing header-logo.png...")
    header_img = Image.open(raw_header_path).convert("RGBA")
    hw, hh = header_img.size
    
    # Non-white bbox: from previous analysis x=[156, 857], y=[40, 223]
    # Add a slight 4px padding
    crop_x1 = max(0, 156 - 4)
    crop_y1 = max(0, 40 - 4)
    crop_x2 = min(hw, 857 + 4)
    crop_y2 = min(hh, 223 + 4)
    
    cropped_header = header_img.crop((crop_x1, crop_y1, crop_x2, crop_y2))
    chw, chh = cropped_header.size
    
    # Make white background transparent
    # Soft alpha transparency for pixels with high brightness
    transparent_header = Image.new("RGBA", (chw, chh))
    for y in range(chh):
        for x in range(chw):
            r, g, b, a = cropped_header.getpixel((x, y))
            # Calculate brightness
            brightness = (r + g + b) / 3.0
            
            if brightness >= 248:
                transparent_header.putpixel((x, y), (r, g, b, 0))
            elif brightness > 210:
                # Smooth antialiasing gradient
                alpha = int(255 * (1.0 - (brightness - 210) / 38.0))
                transparent_header.putpixel((x, y), (r, g, b, alpha))
            else:
                transparent_header.putpixel((x, y), (r, g, b, 255))
                
    transparent_header.save(os.path.join(workspace, "public", "header-logo.png"), format="PNG")
    print("Saved public/header-logo.png with transparent background and cropped padding!")

if __name__ == "__main__":
    process_brand_assets()
