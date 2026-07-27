import os
import zipfile
from PIL import Image

icon_dir = os.path.join("steam", "store", "soundtrack", "icons")
os.makedirs(icon_dir, exist_ok=True)

cover_path = os.path.join("dist_soundtrack", "cover.png")
cover_img = Image.open(cover_path).convert("RGBA")

# 1. Shortcut Icon (512x512 PNG)
sc_512 = cover_img.resize((512, 512), Image.Resampling.LANCZOS)
sc_512_path = os.path.join(icon_dir, "soundtrack_shortcut_icon_512x512.png")
sc_512.save(sc_512_path, "PNG")
print("Saved Shortcut Icon (512x512):", sc_512_path)

# 2. Shortcut Icon (256x256 PNG)
sc_256 = cover_img.resize((256, 256), Image.Resampling.LANCZOS)
sc_256_path = os.path.join(icon_dir, "soundtrack_shortcut_icon_256x256.png")
sc_256.save(sc_256_path, "PNG")
print("Saved Shortcut Icon (256x256):", sc_256_path)

# 3. App Icon (184x184 JPG)
app_184 = cover_img.resize((184, 184), Image.Resampling.LANCZOS).convert("RGB")
app_184_path = os.path.join(icon_dir, "soundtrack_app_icon_184x184.jpg")
app_184.save(app_184_path, "JPEG", quality=95)
print("Saved App Icon (184x184 JPG):", app_184_path)

# 4. Linux Icons (.zip containing 16, 24, 32, 48, 64, 96, 128, 256 pngs)
linux_zip_path = os.path.join(icon_dir, "soundtrack_linux_icons.zip")
sizes = [16, 24, 32, 48, 64, 96, 128, 256]

with zipfile.ZipFile(linux_zip_path, 'w') as zipf:
    for size in sizes:
        resized = cover_img.resize((size, size), Image.Resampling.LANCZOS)
        temp_filename = f"icon_{size}x{size}.png"
        temp_path = os.path.join(icon_dir, temp_filename)
        resized.save(temp_path, "PNG")
        zipf.write(temp_path, arcname=temp_filename)
        os.remove(temp_path)

print("Saved Linux Icons ZIP:", linux_zip_path)
