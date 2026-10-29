import argparse
import shutil
import sys
from pathlib import Path
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import comfy_clips as c

SCRATCH_DIR = Path('/tmp/claude-1001/-home-caveman-Desktop-icecave-hunker-bunker/911307b3-0178-4638-b25d-6fed675c9966/scratchpad')
OUT_RESTYLE = SCRATCH_DIR / 'restyle'
OUT_RESTYLE.mkdir(parents=True, exist_ok=True)
BRAIN_DIR = Path('/home/caveman/.gemini/antigravity-ide/brain/d5fac86d-4971-45b2-b0c5-12da8afcd847')

JOBS = [
    'opening-launch-scout',
    'opening-launch-tank',
    'opening-launch-engineer',
    'opening-flight-scout',
    'opening-crash-tank',
    'kaelen_diagnostic_cradle',
    'val_hearth_warmth',
    'sleep-camp-scout'
]

def render_lasts():
    for idx, job_id in enumerate(JOBS):
        folder = c.job_dir(job_id)
        print(f"\n[{idx+1}/{len(JOBS)}] Generating decoupled last frame for {job_id}...", flush=True)
        c.cmd_last(argparse.Namespace(job=job_id, takes=1, seed=5500 + idx, model='flux', lora=None))
        last = max((p for p in folder.glob('last_*.png') if p.stem.split('_')[-1].isdigit()), key=lambda p: int(p.stem.split('_')[-1]))
        shutil.copy(last, folder / 'last_frame.png')
        shutil.copy(last, OUT_RESTYLE / f'{job_id}_last.png')
        print(f"[{idx+1}/{len(JOBS)}] Staged {job_id}: {last.name} -> last_frame.png", flush=True)

def build_contact_sheet():
    print("\nAssembling master restyle sheet (2560x1440)...", flush=True)
    canvas = Image.new('RGB', (2560, 1440), (12, 16, 20))
    draw = ImageDraw.Draw(canvas)
    
    # 4 rows x 2 cols
    # In each cell, first frame on left, last frame on right
    # cell_w = 1280, cell_h = 360
    # sub_w = 640, sub_h = 360
    grid = [
        ['opening-launch-scout', 'opening-launch-tank'],
        ['opening-launch-engineer', 'opening-flight-scout'],
        ['opening-crash-tank', 'kaelen_diagnostic_cradle'],
        ['val_hearth_warmth', 'sleep-camp-scout']
    ]
    
    for row_idx, row in enumerate(grid):
        for col_idx, job_id in enumerate(row):
            folder = c.job_dir(job_id)
            first_path = folder / 'first_frame.png'
            last_path = folder / 'last_frame.png'
            
            if not first_path.exists():
                stills = [p for p in folder.glob('still_*.png') if p.stem.split('_')[-1].isdigit()]
                if stills:
                    first_path = max(stills, key=lambda p: int(p.stem.split('_')[-1]))
            
            x_base = col_idx * 1280
            y_base = row_idx * 360
            
            if first_path.exists():
                im_f = Image.open(first_path).resize((640, 360), Image.Resampling.LANCZOS)
                canvas.paste(im_f, (x_base, y_base))
                draw.text((x_base + 12, y_base + 10), f"{job_id} first", fill=(240, 240, 240))
                
            if last_path.exists():
                im_l = Image.open(last_path).resize((640, 360), Image.Resampling.LANCZOS)
                canvas.paste(im_l, (x_base + 640, y_base))
                draw.text((x_base + 652, y_base + 10), f"{job_id} last", fill=(0, 229, 255))
            
            # Create individual high-res pair for carousel
            if first_path.exists() and last_path.exists():
                pair = Image.new('RGB', (1920, 540))
                pair.paste(Image.open(first_path).resize((960, 540), Image.Resampling.LANCZOS), (0, 0))
                pair.paste(Image.open(last_path).resize((960, 540), Image.Resampling.LANCZOS), (960, 0))
                p_draw = ImageDraw.Draw(pair)
                p_draw.text((16, 16), f"{job_id} FIRST", fill=(255, 255, 255))
                p_draw.text((976, 16), f"{job_id} LAST (PAYOFF)", fill=(0, 229, 255))
                pair.save(BRAIN_DIR / f'pair_{job_id}.jpg', quality=90)

    sheet_scratch = SCRATCH_DIR / 'restyle_sheet.jpg'
    canvas.save(sheet_scratch, quality=92)
    sheet_brain = BRAIN_DIR / 'restyle_sheet.jpg'
    canvas.save(sheet_brain, quality=92)
    print(f"Saved: {sheet_scratch} & {sheet_brain}", flush=True)

if __name__ == '__main__':
    render_lasts()
    build_contact_sheet()
    print("\n[restyle] All 8 dynamic last frames rendered and sheets updated successfully!")
