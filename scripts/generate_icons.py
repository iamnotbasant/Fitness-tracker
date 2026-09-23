import os
import math
from PIL import Image, ImageDraw

def create_fitness_icon(size):
    # Create image with RGBA
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    scale = size / 512.0
    corner_radius = int(110 * scale)
    
    # Background rounded rectangle
    # Draw dark rounded rectangle with sleek border
    bg_box = [int(16 * scale), int(16 * scale), int((512 - 16) * scale), int((512 - 16) * scale)]
    draw.rounded_rectangle(bg_box, radius=corner_radius, fill=(13, 13, 15, 255), outline=(39, 39, 42, 255), width=int(3 * scale))
    
    # Subtle inner glow / gradient circle
    center = size / 2.0
    glow_radius = int(160 * scale)
    for r in range(glow_radius, 0, -4):
        alpha = int(25 * (1 - r / glow_radius))
        draw.ellipse([center - r, center - r, center + r, center + r], fill=(234, 56, 76, alpha))
        
    # Draw stylized dumbbell symbol
    # Angle in radians: 45 degrees
    angle = math.radians(45)
    cos_a = math.cos(angle)
    sin_a = math.sin(angle)
    
    def rotate_pt(x, y):
        # Rotate around center
        rx = cos_a * (x - center) - sin_a * (y - center) + center
        ry = sin_a * (x - center) + cos_a * (y - center) + center
        return (rx, ry)
    
    # We define dumbbell components along horizontal axis before rotation
    # Bar: width 180, height 24
    # Inner plates: width 22, height 120
    # Outer plates: width 26, height 160
    # Collars: width 12, height 50
    
    bar_w = 180 * scale
    bar_h = 24 * scale
    draw_polygon = draw.polygon
    
    def get_rotated_rect(cx, cy, w, h):
        pts = [
            (cx - w/2, cy - h/2),
            (cx + w/2, cy - h/2),
            (cx + w/2, cy + h/2),
            (cx - w/2, cy + h/2),
        ]
        return [rotate_pt(px, py) for px, py in pts]
    
    # Center bar
    draw.polygon(get_rotated_rect(center, center, bar_w, bar_h), fill=(255, 255, 255, 240))
    
    # Left inner collar
    draw.polygon(get_rotated_rect(center - 55 * scale, center, 12 * scale, 50 * scale), fill=(245, 158, 11, 255))
    # Right inner collar
    draw.polygon(get_rotated_rect(center + 55 * scale, center, 12 * scale, 50 * scale), fill=(245, 158, 11, 255))
    
    # Left inner plate (Amber/Flame)
    draw.polygon(get_rotated_rect(center - 76 * scale, center, 22 * scale, 120 * scale), fill=(234, 56, 76, 255))
    # Right inner plate
    draw.polygon(get_rotated_rect(center + 76 * scale, center, 22 * scale, 120 * scale), fill=(234, 56, 76, 255))
    
    # Left outer plate (Coral Red)
    draw.polygon(get_rotated_rect(center - 105 * scale, center, 26 * scale, 160 * scale), fill=(255, 255, 255, 255))
    # Right outer plate
    draw.polygon(get_rotated_rect(center + 105 * scale, center, 26 * scale, 160 * scale), fill=(255, 255, 255, 255))
    
    # Outer end caps
    draw.polygon(get_rotated_rect(center - 124 * scale, center, 10 * scale, 70 * scale), fill=(234, 56, 76, 255))
    draw.polygon(get_rotated_rect(center + 124 * scale, center, 10 * scale, 70 * scale), fill=(234, 56, 76, 255))
    
    # Center energy flame icon / lightning diamond
    diamond_pts = [
        rotate_pt(center, center - 22 * scale),
        rotate_pt(center + 14 * scale, center),
        rotate_pt(center, center + 22 * scale),
        rotate_pt(center - 14 * scale, center),
    ]
    draw.polygon(diamond_pts, fill=(234, 56, 76, 255))

    return img

def main():
    public_dir = os.path.join(os.path.dirname(__file__), "..", "public")
    app_dir = os.path.join(os.path.dirname(__file__), "..", "src", "app")
    
    sizes = {
        "icon-512.png": 512,
        "icon-192.png": 192,
        "placeholder-logo.png": 512,
        "apple-icon.png": 180,
    }
    
    for filename, sz in sizes.items():
        path = os.path.join(public_dir, filename)
        icon = create_fitness_icon(sz)
        icon.save(path, "PNG", optimize=True)
        print(f"Generated {filename} ({sz}x{sz}) at {path}")
        
    # Also save app icon
    app_icon_path = os.path.join(app_dir, "icon.png")
    app_icon = create_fitness_icon(512)
    app_icon.save(app_icon_path, "PNG", optimize=True)
    print(f"Generated Next.js app icon at {app_icon_path}")

if __name__ == "__main__":
    main()
