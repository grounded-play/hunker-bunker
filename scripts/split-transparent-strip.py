#!/usr/bin/env python3
"""Split a transparent horizontal character strip at fully empty columns."""

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


def component_runs(alpha, expected):
    width, height = alpha.size
    pixels = alpha.load()
    occupied = bytearray(width * height)
    for y in range(height):
        offset = y * width
        for x in range(width):
            if pixels[x, y] > 160:
                occupied[offset + x] = 1

    components = []
    for y in range(height):
        for x in range(width):
            start = y * width + x
            if not occupied[start]:
                continue
            occupied[start] = 0
            queue = deque([(x, y)])
            left = right = x
            top = bottom = y
            area = 0
            while queue:
                cx, cy = queue.popleft()
                area += 1
                left = min(left, cx)
                right = max(right, cx)
                top = min(top, cy)
                bottom = max(bottom, cy)
                for nx, ny in (
                    (cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1),
                    (cx - 1, cy - 1), (cx + 1, cy - 1),
                    (cx - 1, cy + 1), (cx + 1, cy + 1)
                ):
                    if 0 <= nx < width and 0 <= ny < height:
                        index = ny * width + nx
                        if occupied[index]:
                            occupied[index] = 0
                            queue.append((nx, ny))
            if area > 500:
                components.append((area, left, top, right + 1, bottom + 1))

    components = sorted(components, reverse=True)[:expected]
    if len(components) != expected:
        return []
    return sorted(
        [(max(0, left - 3), min(width, right + 3), top, bottom)
         for _, left, top, right, bottom in components],
        key=lambda item: item[0]
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--prefix", required=True)
    parser.add_argument("--expected", type=int, default=8)
    args = parser.parse_args()

    image = Image.open(args.input).convert("RGBA")
    alpha = image.getchannel("A")
    runs = []
    start = None

    for x in range(image.width):
        occupied = alpha.crop((x, 0, x + 1, image.height)).getbbox() is not None
        if occupied and start is None:
            start = x
        elif not occupied and start is not None:
            runs.append((start, x))
            start = None

    if start is not None:
        runs.append((start, image.width))

    component_boxes = []
    if len(runs) != args.expected:
        component_boxes = component_runs(alpha, args.expected)
        if len(component_boxes) != args.expected:
            # Some generated strips place adjacent boots close enough for the
            # soft chroma matte to connect silhouettes. Fall back to the
            # model-requested equal slots, then trim inside each slot.
            slot_width = image.width / args.expected
            component_boxes = [
                (
                    round(index * slot_width),
                    round((index + 1) * slot_width),
                    0,
                    image.height
                )
                for index in range(args.expected)
            ]

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    boxes = component_boxes or [(left, right, 0, image.height) for left, right in runs]
    for index, (left, right, top, bottom) in enumerate(boxes):
        frame = image.crop((left, top, right, bottom))
        bbox = frame.getbbox()
        if bbox is None:
            raise SystemExit(f"{args.input}: frame {index} is empty")
        frame.crop(bbox).save(output_dir / f"{args.prefix}-{index}.png")


if __name__ == "__main__":
    main()
