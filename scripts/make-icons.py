from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1] / "src" / "icons"
root.mkdir(parents=True, exist_ok=True)
font_path = Path("C:/Windows/Fonts/seguisb.ttf")

for size in (16, 48, 128):
    scale = 4
    canvas_size = size * scale
    image = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((0, 0, canvas_size - 1, canvas_size - 1), radius=size * 0.24 * scale, fill="#194b3f")
    font = ImageFont.truetype(str(font_path), int(size * 0.68 * scale))
    draw.text((size * 0.21 * scale, size * 0.06 * scale), "A", font=font, fill="#fffaf0")
    draw.line((size * 0.51 * scale, size * 0.72 * scale, size * 0.79 * scale, size * 0.72 * scale), fill="#f0b64c", width=max(2, int(size * 0.075 * scale)), joint="curve")
    draw.polygon([(size * 0.81 * scale, size * 0.72 * scale), (size * 0.66 * scale, size * 0.63 * scale), (size * 0.66 * scale, size * 0.81 * scale)], fill="#f0b64c")
    image.resize((size, size), Image.Resampling.LANCZOS).save(root / f"icon-{size}.png")
