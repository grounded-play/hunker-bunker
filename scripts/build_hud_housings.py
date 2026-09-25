#!/usr/bin/env python3
"""Build HUD housing assets in Nordic Cathedral Biomech style.

Renders 9 clean panels (SCOUT, TANK, ENGINEER x MAP, HEALTH, GUN) and SCOUT
state variants (_blood, _frost, _damage1) on pure #00FF00 chroma green.
Follows:
  - docs/planning/hud-housing-prompts-2026-09-25.md
  - docs/planning/hud-lower-dock-plan-2026-09-25.md §3A / §4D
  - docs/design/art-style-bible.md
"""

import math
import os
import random
import sys
import cairo
import numpy as np
from PIL import Image, ImageFilter

CANVAS_W = 2048
CANVAS_H = 1152
MARGIN_X = 64
PANEL_W_PX = CANVAS_W - (2 * MARGIN_X)  # 1920 px (3.125% margin each side)

GLASS_COLOR = (7 / 255.0, 8 / 255.0, 8 / 255.0)  # Near-black #070808
INK_BLACK = (6 / 255.0, 7 / 255.0, 8 / 255.0)


def create_cairo_surface():
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, CANVAS_W, CANVAS_H)
    ctx = cairo.Context(surface)
    # 1. Fill entire canvas with pure Chroma Green #00FF00
    ctx.set_source_rgb(0.0, 1.0, 0.0)
    ctx.paint()
    return surface, ctx


def surface_to_pil(surface):
    buf = surface.get_data()
    arr = np.ndarray(shape=(CANVAS_H, CANVAS_W, 4), dtype=np.uint8, buffer=buf)
    # Cairo is BGRA on little-endian
    rgba = arr[..., [2, 1, 0, 3]]
    return Image.fromarray(rgba, 'RGBA').convert('RGB')


class PanelGeometry:
    def __init__(self, panel_type, panel_class):
        self.panel_type = panel_type
        self.panel_class = panel_class

        if panel_type == 'map':
            self.u_w = 220.0
            self.u_h = 64.0
        elif panel_type == 'health':
            self.u_w = 520.0
            self.u_h = 64.0
        elif panel_type == 'gun':
            self.u_w = 380.0
            self.u_h = 64.0

        self.scale = PANEL_W_PX / self.u_w
        self.h_px = self.u_h * self.scale
        self.x0 = MARGIN_X
        # Center vertically
        if panel_type == 'health':
            # Extra room for the top crest
            self.y0 = (CANVAS_H - self.h_px) / 2.0 + 20.0
        else:
            self.y0 = (CANVAS_H - self.h_px) / 2.0

    def pt(self, ux, uy):
        return (self.x0 + ux * self.scale, self.y0 + uy * self.scale)

    def val(self, u):
        return u * self.scale


def draw_diagonal_streak(ctx, x, y, w, h):
    """Faint diagonal reflection streak across glass window."""
    ctx.save()
    ctx.rectangle(x, y, w, h)
    ctx.clip()
    grad = cairo.LinearGradient(x, y, x + w, y + h)
    grad.add_color_stop_rgba(0.0, 1.0, 1.0, 1.0, 0.0)
    grad.add_color_stop_rgba(0.38, 1.0, 1.0, 1.0, 0.0)
    grad.add_color_stop_rgba(0.42, 1.0, 1.0, 1.0, 0.045)
    grad.add_color_stop_rgba(0.46, 1.0, 1.0, 1.0, 0.015)
    grad.add_color_stop_rgba(0.50, 1.0, 1.0, 1.0, 0.0)
    grad.add_color_stop_rgba(1.0, 1.0, 1.0, 1.0, 0.0)
    ctx.set_source(grad)
    ctx.rectangle(x, y, w, h)
    ctx.fill()
    ctx.restore()


def draw_empty_glass_rect(ctx, x, y, w, h, corner_r=0):
    ctx.save()
    if corner_r > 0:
        ctx.new_sub_path()
        ctx.arc(x + w - corner_r, y + corner_r, corner_r, -math.pi / 2, 0)
        ctx.arc(x + w - corner_r, y + h - corner_r, corner_r, 0, math.pi / 2)
        ctx.arc(x + corner_r, y + h - corner_r, corner_r, math.pi / 2, math.pi)
        ctx.arc(x + corner_r, y + corner_r, corner_r, math.pi, 3 * math.pi / 2)
        ctx.close_path()
    else:
        ctx.rectangle(x, y, w, h)
    ctx.set_source_rgb(*GLASS_COLOR)
    ctx.fill_preserve()
    # Inner subtle rim shadow
    ctx.set_source_rgba(0.0, 0.0, 0.0, 0.6)
    ctx.set_line_width(2.5)
    ctx.stroke()
    ctx.restore()
    draw_diagonal_streak(ctx, x, y, w, h)


def draw_empty_glass_circle(ctx, cx, cy, radius):
    ctx.save()
    ctx.arc(cx, cy, radius, 0, 2 * math.pi)
    ctx.set_source_rgb(*GLASS_COLOR)
    ctx.fill_preserve()
    ctx.set_source_rgba(0.0, 0.0, 0.0, 0.6)
    ctx.set_line_width(2.5)
    ctx.stroke()
    ctx.restore()
    draw_diagonal_streak(ctx, cx - radius, cy - radius, radius * 2, radius * 2)


# ==============================================================================
# SCOUT RENDERER ("Frost Lantern" - Slender blackened iron, bone ribs, teal)
# ==============================================================================

def render_scout(geom, ctx):
    x0, y0 = geom.x0, geom.y0
    w_px, h_px = geom.PANEL_W_PX if hasattr(geom, 'PANEL_W_PX') else PANEL_W_PX, geom.h_px
    scale = geom.scale

    teal = (113 / 255.0, 205 / 255.0, 223 / 255.0)
    iron_dark = (20 / 255.0, 21 / 255.0, 22 / 255.0)
    iron_mid = (38 / 255.0, 41 / 255.0, 43 / 255.0)
    iron_edge = (60 / 255.0, 64 / 255.0, 67 / 255.0)
    bone_hi = (205 / 255.0, 198 / 255.0, 176 / 255.0)
    bone_mid = (167 / 255.0, 159 / 255.0, 134 / 255.0)
    bone_shadow = (86 / 255.0, 84 / 255.0, 75 / 255.0)

    # 1. Outer Frame Path: shallow arched top with small central keystone
    arch_rise = geom.val(3.5)
    keystone_w = geom.val(14.0)

    ctx.save()
    ctx.new_path()
    # Bottom left to bottom right
    ctx.move_to(x0, y0 + h_px)
    ctx.line_to(x0 + w_px, y0 + h_px)
    # Right edge
    ctx.line_to(x0 + w_px, y0 + arch_rise)
    # Top arched edge with keystone notch
    mid_x = x0 + w_px / 2.0
    ctx.curve_to(x0 + w_px * 0.75, y0, mid_x + keystone_w / 2.0, y0 - arch_rise * 0.8, mid_x + keystone_w / 2.0, y0 - arch_rise)
    ctx.line_to(mid_x - keystone_w / 2.0, y0 - arch_rise)
    ctx.curve_to(mid_x - keystone_w / 2.0, y0 - arch_rise * 0.8, x0 + w_px * 0.25, y0, x0, y0 + arch_rise)
    ctx.close_path()

    # Dark silhouette ink contour (Rule 5)
    ctx.set_source_rgb(*INK_BLACK)
    ctx.set_line_width(6.0)
    ctx.stroke_preserve()

    # Base iron fill
    pat = cairo.LinearGradient(x0, y0 - arch_rise, x0, y0 + h_px)
    pat.add_color_stop_rgb(0.0, *iron_edge)
    pat.add_color_stop_rgb(0.3, *iron_mid)
    pat.add_color_stop_rgb(0.8, *iron_dark)
    pat.add_color_stop_rgb(1.0, *iron_dark)
    ctx.set_source(pat)
    ctx.fill()
    ctx.restore()

    # Leaded panes along border (woodcut/etching hatching texture)
    ctx.save()
    border_t = geom.val(3.0)
    ctx.set_source_rgba(*iron_edge, 0.45)
    ctx.set_line_width(1.5)
    for i in range(0, int(w_px), int(geom.val(5.0))):
        ctx.move_to(x0 + i, y0 + h_px - border_t)
        ctx.line_to(x0 + i + geom.val(3.0), y0 + h_px)
        ctx.move_to(x0 + i, y0 + border_t)
        ctx.line_to(x0 + i + geom.val(3.0), y0)
    ctx.stroke()
    ctx.restore()

    # Keystone ornament
    ctx.save()
    mid_x = x0 + w_px / 2.0
    ctx.rectangle(mid_x - keystone_w / 2.0, y0 - arch_rise - geom.val(1.5), keystone_w, arch_rise + geom.val(4.0))
    ctx.set_source_rgb(*iron_mid)
    ctx.fill_preserve()
    ctx.set_source_rgb(*INK_BLACK)
    ctx.set_line_width(2.0)
    ctx.stroke()
    # Carved bone center on keystone
    ctx.rectangle(mid_x - keystone_w * 0.25, y0 - arch_rise, keystone_w * 0.5, arch_rise + geom.val(1.0))
    ctx.set_source_rgb(*bone_mid)
    ctx.fill()
    ctx.restore()

    # Class decorations
    if geom.panel_type == 'map':
        # Bone finial like an antler tine rising from top-left holding tiny unlit lantern
        fx = x0 + geom.val(6.0)
        fy = y0 - geom.val(1.0)
        ctx.save()
        ctx.new_path()
        ctx.move_to(fx, fy)
        ctx.curve_to(fx - geom.val(4.0), fy - geom.val(8.0), fx + geom.val(2.0), fy - geom.val(16.0), fx - geom.val(2.0), fy - geom.val(22.0))
        ctx.curve_to(fx + geom.val(6.0), fy - geom.val(15.0), fx + geom.val(2.0), fy - geom.val(7.0), fx + geom.val(6.0), fy)
        ctx.close_path()
        ctx.set_source_rgb(*bone_hi)
        ctx.fill_preserve()
        ctx.set_source_rgb(*INK_BLACK)
        ctx.set_line_width(2.0)
        ctx.stroke()

        # Miniature unlit frost-glass lantern hanging from tine
        lx = fx - geom.val(2.0)
        ly = fy - geom.val(20.0)
        ctx.set_source_rgb(*iron_mid)
        ctx.rectangle(lx - geom.val(3.0), ly + geom.val(4.0), geom.val(6.0), geom.val(9.0))
        ctx.set_source_rgba(100 / 255.0, 130 / 255.0, 145 / 255.0, 0.7)  # Cold unlit frost glass
        ctx.fill_preserve()
        ctx.set_source_rgb(*iron_dark)
        ctx.set_line_width(1.5)
        ctx.stroke()
        # Lantern roof cap
        ctx.move_to(lx - geom.val(4.0), ly + geom.val(4.0))
        ctx.line_to(lx + geom.val(4.0), ly + geom.val(4.0))
        ctx.line_to(lx, ly + geom.val(1.0))
        ctx.close_path()
        ctx.set_source_rgb(*iron_edge)
        ctx.fill()
        ctx.restore()

    elif geom.panel_type == 'health':
        # Small crest at top centre holding 5 tiny unlit frost-glass lanterns in a row
        cx = x0 + w_px / 2.0
        crest_w = geom.val(70.0)
        crest_h = geom.val(8.5)
        cy = y0 - arch_rise
        ctx.save()
        # Crest plate
        ctx.rectangle(cx - crest_w / 2.0, cy - crest_h, crest_w, crest_h)
        ctx.set_source_rgb(*iron_mid)
        ctx.fill_preserve()
        ctx.set_source_rgb(*INK_BLACK)
        ctx.set_line_width(2.0)
        ctx.stroke()

        # 5 lanterns
        spacing = crest_w / 6.0
        for i in range(1, 6):
            lx = (cx - crest_w / 2.0) + i * spacing
            ly = cy - crest_h * 0.7
            ctx.rectangle(lx - geom.val(2.5), ly, geom.val(5.0), geom.val(5.0))
            ctx.set_source_rgba(110 / 255.0, 140 / 255.0, 155 / 255.0, 0.8)  # Unlit frost glass
            ctx.fill_preserve()
            ctx.set_source_rgb(*iron_edge)
            ctx.set_line_width(1.0)
            ctx.stroke()
        ctx.restore()

    # Glass apertures with contained cold teal seam glow
    def draw_teal_seam_glow(rx, ry, rw, rh, r_circle=None):
        ctx.save()
        if r_circle:
            cx, cy = rx, ry
            rad = r_circle + geom.val(2.5)
            glow = cairo.RadialGradient(cx, cy, r_circle, cx, cy, rad)
            glow.add_color_stop_rgba(0.0, *teal, 0.7)
            glow.add_color_stop_rgba(1.0, *teal, 0.0)
            ctx.set_source(glow)
            ctx.arc(cx, cy, rad, 0, 2 * math.pi)
            ctx.fill()
        else:
            ctx.set_source_rgba(*teal, 0.4)
            ctx.set_line_width(geom.val(1.5))
            ctx.rectangle(rx - geom.val(1.0), ry - geom.val(1.0), rw + geom.val(2.0), rh + geom.val(2.0))
            ctx.stroke()
        ctx.restore()

    # Cut glass apertures per panel type
    if geom.panel_type == 'map':
        # 1. Circle at left: cx=32, cy=32, rad=28
        ccx, ccy = geom.pt(32.0, 32.0)
        crad = geom.val(26.0)
        draw_teal_seam_glow(ccx, ccy, 0, 0, r_circle=crad)
        draw_empty_glass_circle(ctx, ccx, ccy, crad)

        # Bone rib ring framing circle
        ctx.save()
        ctx.arc(ccx, ccy, crad + geom.val(2.5), 0, 2 * math.pi)
        ctx.set_source_rgb(*bone_mid)
        ctx.set_line_width(geom.val(1.8))
        ctx.stroke()
        ctx.restore()

        # 2. Rectangle filling the rest
        rx, ry = geom.pt(68.0, 6.0)
        rw, rh = geom.val(146.0), geom.val(52.0)
        draw_teal_seam_glow(rx, ry, rw, rh)
        draw_empty_glass_rect(ctx, rx, ry, rw, rh, corner_r=geom.val(2.0))

    elif geom.panel_type == 'health':
        # Wide rectangle left (2/3 width)
        rx1, ry1 = geom.pt(10.0, 6.0)
        rw1, rh1 = geom.val(330.0), geom.val(52.0)
        draw_teal_seam_glow(rx1, ry1, rw1, rh1)
        draw_empty_glass_rect(ctx, rx1, ry1, rw1, rh1, corner_r=geom.val(2.0))

        # Narrow vertical slot (infection)
        rx2, ry2 = geom.pt(348.0, 6.0)
        rw2, rh2 = geom.val(12.0), geom.val(52.0)
        draw_teal_seam_glow(rx2, ry2, rw2, rh2)
        draw_empty_glass_rect(ctx, rx2, ry2, rw2, rh2, corner_r=geom.val(2.0))

        # Rectangle right (loot)
        rx3, ry3 = geom.pt(368.0, 6.0)
        rw3, rh3 = geom.val(144.0), geom.val(52.0)
        draw_teal_seam_glow(rx3, ry3, rw3, rh3)
        draw_empty_glass_rect(ctx, rx3, ry3, rw3, rh3, corner_r=geom.val(2.0))

        # Thin bone ribs between windows
        for sep_x in [rx2 - geom.val(4.0), rx3 - geom.val(4.0)]:
            ctx.save()
            ctx.rectangle(sep_x, ry1, geom.val(2.5), rh1)
            ctx.set_source_rgb(*bone_mid)
            ctx.fill()
            ctx.restore()

    elif geom.panel_type == 'gun':
        # Left rectangle (weapon)
        rx1, ry1 = geom.pt(8.0, 6.0)
        rw1, rh1 = geom.val(118.0), geom.val(52.0)
        draw_teal_seam_glow(rx1, ry1, rw1, rh1)
        draw_empty_glass_rect(ctx, rx1, ry1, rw1, rh1, corner_r=geom.val(2.0))

        # Middle rectangle (ammo)
        rx2, ry2 = geom.pt(134.0, 6.0)
        rw2, rh2 = geom.val(110.0), geom.val(52.0)
        draw_teal_seam_glow(rx2, ry2, rw2, rh2)
        draw_empty_glass_rect(ctx, rx2, ry2, rw2, rh2, corner_r=geom.val(2.0))

        # Tile socket 1
        rx3, ry3 = geom.pt(252.0, 6.0)
        rw3, rh3 = geom.val(56.0), geom.val(52.0)
        draw_teal_seam_glow(rx3, ry3, rw3, rh3)
        draw_empty_glass_rect(ctx, rx3, ry3, rw3, rh3, corner_r=geom.val(2.0))

        # Tile socket 2
        rx4, ry4 = geom.pt(316.0, 6.0)
        rw4, rh4 = geom.val(56.0), geom.val(52.0)
        draw_teal_seam_glow(rx4, ry4, rw4, rh4)
        draw_empty_glass_rect(ctx, rx4, ry4, rw4, rh4, corner_r=geom.val(2.0))


# ==============================================================================
# TANK RENDERER ("Granite Bastion" - Stepped granite, heavy bolts, amber glow)
# ==============================================================================

def render_tank(geom, ctx):
    x0, y0 = geom.x0, geom.y0
    w_px, h_px = PANEL_W_PX, geom.h_px
    scale = geom.scale

    amber = (249 / 255.0, 148 / 255.0, 21 / 255.0)
    granite_dark = (59 / 255.0, 61 / 255.0, 62 / 255.0)
    granite_mid = (90 / 255.0, 92 / 255.0, 91 / 255.0)
    granite_lit = (138 / 255.0, 140 / 255.0, 134 / 255.0)
    iron_strap = (20 / 255.0, 21 / 255.0, 22 / 255.0)
    rust = (146 / 255.0, 83 / 255.0, 43 / 255.0)

    # 1. Stepped granite outer contour
    step_w = geom.val(16.0)
    step_h = geom.val(3.0)
    arch_h = geom.val(4.5)

    ctx.save()
    ctx.new_path()
    ctx.move_to(x0, y0 + h_px)
    ctx.line_to(x0 + w_px, y0 + h_px)
    ctx.line_to(x0 + w_px, y0 + step_h * 2)
    ctx.line_to(x0 + w_px - step_w, y0 + step_h * 2)
    ctx.line_to(x0 + w_px - step_w, y0 + step_h)
    ctx.line_to(x0 + w_px - step_w * 2, y0 + step_h)
    # Deep keystone arch top
    mid_x = x0 + w_px / 2.0
    ctx.curve_to(x0 + w_px * 0.65, y0 - arch_h, mid_x + geom.val(18.0), y0 - arch_h * 1.5, mid_x + geom.val(18.0), y0 - arch_h * 1.8)
    ctx.line_to(mid_x - geom.val(18.0), y0 - arch_h * 1.8)
    ctx.curve_to(mid_x - geom.val(18.0), y0 - arch_h * 1.5, x0 + w_px * 0.35, y0 - arch_h, x0 + step_w * 2, y0 + step_h)
    ctx.line_to(x0 + step_w, y0 + step_h)
    ctx.line_to(x0 + step_w, y0 + step_h * 2)
    ctx.line_to(x0, y0 + step_h * 2)
    ctx.close_path()

    # Dark ink contour (Rule 5)
    ctx.set_source_rgb(*INK_BLACK)
    ctx.set_line_width(6.5)
    ctx.stroke_preserve()

    # Granite block gradient
    pat = cairo.LinearGradient(x0, y0 - arch_h * 1.8, x0, y0 + h_px)
    pat.add_color_stop_rgb(0.0, *granite_lit)
    pat.add_color_stop_rgb(0.4, *granite_mid)
    pat.add_color_stop_rgb(1.0, *granite_dark)
    ctx.set_source(pat)
    ctx.fill()
    ctx.restore()

    # Carved hazard chevron banding along bottom lip
    ctx.save()
    band_h = geom.val(3.5)
    chev_w = geom.val(7.0)
    by = y0 + h_px - band_h
    ctx.set_source_rgba(*INK_BLACK, 0.6)
    ctx.set_line_width(2.0)
    for cx in range(int(x0), int(x0 + w_px), int(chev_w * 2)):
        ctx.move_to(cx, y0 + h_px)
        ctx.line_to(cx + chev_w, by)
        ctx.line_to(cx + chev_w * 2, y0 + h_px)
    ctx.stroke()
    ctx.restore()

    # Heavy blackened-iron straps and large bolts
    def draw_iron_strap(sx, sy, sw, sh):
        ctx.save()
        ctx.rectangle(sx, sy, sw, sh)
        ctx.set_source_rgb(*iron_strap)
        ctx.fill_preserve()
        ctx.set_source_rgb(*INK_BLACK)
        ctx.set_line_width(2.0)
        ctx.stroke()
        # Large round industrial bolts
        bolt_r = min(sw, sh) * 0.28
        for b_pos in [0.25, 0.75]:
            if sw < sh:
                bx = sx + sw / 2.0
                by = sy + sh * b_pos
            else:
                bx = sx + sw * b_pos
                by = sy + sh / 2.0
            ctx.arc(bx, by, bolt_r, 0, 2 * math.pi)
            ctx.set_source_rgb(45 / 255.0, 48 / 255.0, 50 / 255.0)
            ctx.fill_preserve()
            ctx.set_source_rgb(*INK_BLACK)
            ctx.set_line_width(1.5)
            ctx.stroke()
            # Rust bleed from bolt
            ctx.move_to(bx, by + bolt_r)
            ctx.line_to(bx, by + bolt_r + geom.val(5.0))
            ctx.set_source_rgba(*rust, 0.65)
            ctx.set_line_width(geom.val(1.0))
            ctx.stroke()
        ctx.restore()

    # Straps wrapping ends
    strap_w = geom.val(7.0)
    draw_iron_strap(x0, y0 + geom.val(5.0), strap_w, h_px - geom.val(5.0))
    draw_iron_strap(x0 + w_px - strap_w, y0 + geom.val(5.0), strap_w, h_px - geom.val(5.0))

    # Top crest for Tank Health
    if geom.panel_type == 'health':
        cx = x0 + w_px / 2.0
        crest_w = geom.val(80.0)
        crest_h = geom.val(10.0)
        cy = y0 - arch_h * 1.8
        ctx.save()
        ctx.rectangle(cx - crest_w / 2.0, cy - crest_h, crest_w, crest_h)
        ctx.set_source_rgb(*iron_strap)
        ctx.fill_preserve()
        ctx.set_source_rgb(*INK_BLACK)
        ctx.set_line_width(2.0)
        ctx.stroke()
        # 5 caged iron lanterns
        spacing = crest_w / 7.0
        for i in range(1, 6):
            lx = (cx - crest_w / 2.0) + i * spacing
            ly = cy - crest_h * 0.75
            ctx.rectangle(lx - geom.val(3.0), ly, geom.val(6.0), geom.val(6.0))
            ctx.set_source_rgb(25 / 255.0, 27 / 255.0, 28 / 255.0)  # Caged dark iron
            ctx.fill_preserve()
            ctx.set_source_rgb(*INK_BLACK)
            ctx.set_line_width(1.0)
            ctx.stroke()
            # Cage mesh cross
            ctx.move_to(lx - geom.val(3.0), ly + geom.val(3.0))
            ctx.line_to(lx + geom.val(3.0), ly + geom.val(3.0))
            ctx.move_to(lx, ly)
            ctx.line_to(lx, ly + geom.val(6.0))
            ctx.stroke()
        # 2 chunky toggle switches on sides
        for sw_x in [cx - crest_w * 0.42, cx + crest_w * 0.42]:
            ctx.rectangle(sw_x - geom.val(2.0), cy - crest_h * 0.6, geom.val(4.0), geom.val(5.0))
            ctx.set_source_rgb(*granite_lit)
            ctx.fill_preserve()
            ctx.set_source_rgb(*INK_BLACK)
            ctx.stroke()
        ctx.restore()

    # Glass apertures with warm amber glow
    def draw_amber_glow(rx, ry, rw, rh, r_circle=None):
        ctx.save()
        if r_circle:
            glow = cairo.RadialGradient(rx, ry, r_circle, rx, ry, r_circle + geom.val(3.0))
            glow.add_color_stop_rgba(0.0, *amber, 0.7)
            glow.add_color_stop_rgba(1.0, *amber, 0.0)
            ctx.set_source(glow)
            ctx.arc(rx, ry, r_circle + geom.val(3.0), 0, 2 * math.pi)
            ctx.fill()
        else:
            ctx.set_source_rgba(*amber, 0.45)
            ctx.set_line_width(geom.val(1.8))
            ctx.rectangle(rx - geom.val(1.0), ry - geom.val(1.0), rw + geom.val(2.0), rh + geom.val(2.0))
            ctx.stroke()
        ctx.restore()

    if geom.panel_type == 'map':
        ccx, ccy = geom.pt(32.0, 32.0)
        crad = geom.val(26.0)
        # Heavy iron ring with bolts around circle
        ctx.save()
        ctx.arc(ccx, ccy, crad + geom.val(5.0), 0, 2 * math.pi)
        ctx.set_source_rgb(*iron_strap)
        ctx.fill_preserve()
        ctx.set_source_rgb(*INK_BLACK)
        ctx.set_line_width(2.0)
        ctx.stroke()
        # Bolts around ring
        for a in range(0, 360, 45):
            rad_ang = math.radians(a)
            bx = ccx + (crad + geom.val(2.5)) * math.cos(rad_ang)
            by = ccy + (crad + geom.val(2.5)) * math.sin(rad_ang)
            ctx.arc(bx, by, geom.val(1.2), 0, 2 * math.pi)
            ctx.set_source_rgb(50 / 255.0, 52 / 255.0, 54 / 255.0)
            ctx.fill()
        ctx.restore()

        draw_amber_glow(ccx, ccy, 0, 0, r_circle=crad)
        draw_empty_glass_circle(ctx, ccx, ccy, crad)

        rx, ry = geom.pt(68.0, 6.0)
        rw, rh = geom.val(146.0), geom.val(52.0)
        draw_amber_glow(rx, ry, rw, rh)
        draw_empty_glass_rect(ctx, rx, ry, rw, rh)

    elif geom.panel_type == 'health':
        rx1, ry1 = geom.pt(10.0, 6.0)
        rw1, rh1 = geom.val(330.0), geom.val(52.0)
        draw_amber_glow(rx1, ry1, rw1, rh1)
        draw_empty_glass_rect(ctx, rx1, ry1, rw1, rh1)

        rx2, ry2 = geom.pt(348.0, 6.0)
        rw2, rh2 = geom.val(12.0), geom.val(52.0)
        draw_amber_glow(rx2, ry2, rw2, rh2)
        draw_empty_glass_rect(ctx, rx2, ry2, rw2, rh2)

        rx3, ry3 = geom.pt(368.0, 6.0)
        rw3, rh3 = geom.val(144.0), geom.val(52.0)
        draw_amber_glow(rx3, ry3, rw3, rh3)
        draw_empty_glass_rect(ctx, rx3, ry3, rw3, rh3)

        # Heavy iron dividers between windows
        for div_x in [rx2 - geom.val(5.0), rx3 - geom.val(5.0)]:
            draw_iron_strap(div_x, ry1, geom.val(4.0), rh1)

    elif geom.panel_type == 'gun':
        rx1, ry1 = geom.pt(8.0, 6.0)
        rw1, rh1 = geom.val(118.0), geom.val(52.0)
        # Deep arched niche framing left glass
        ctx.save()
        ctx.rectangle(rx1 - geom.val(3.0), ry1 - geom.val(3.0), rw1 + geom.val(6.0), rh1 + geom.val(6.0))
        ctx.set_source_rgb(*granite_dark)
        ctx.fill_preserve()
        ctx.set_source_rgb(*INK_BLACK)
        ctx.set_line_width(2.0)
        ctx.stroke()
        ctx.restore()
        draw_amber_glow(rx1, ry1, rw1, rh1)
        draw_empty_glass_rect(ctx, rx1, ry1, rw1, rh1)

        rx2, ry2 = geom.pt(134.0, 6.0)
        rw2, rh2 = geom.val(110.0), geom.val(52.0)
        draw_amber_glow(rx2, ry2, rw2, rh2)
        draw_empty_glass_rect(ctx, rx2, ry2, rw2, rh2)

        rx3, ry3 = geom.pt(252.0, 6.0)
        rw3, rh3 = geom.val(56.0), geom.val(52.0)
        draw_amber_glow(rx3, ry3, rw3, rh3)
        draw_empty_glass_rect(ctx, rx3, ry3, rw3, rh3)

        rx4, ry4 = geom.pt(316.0, 6.0)
        rw4, rh4 = geom.val(56.0), geom.val(52.0)
        draw_amber_glow(rx4, ry4, rw4, rh4)
        draw_empty_glass_rect(ctx, rx4, ry4, rw4, rh4)


# ==============================================================================
# ENGINEER RENDERER ("Forge Altar" - Bronze pipes, heat fins, orange forge glow)
# ==============================================================================

def render_engineer(geom, ctx):
    x0, y0 = geom.x0, geom.y0
    w_px, h_px = PANEL_W_PX, geom.h_px
    scale = geom.scale

    forge_orange = (242 / 255.0, 120 / 255.0, 12 / 255.0)
    bronze_base = (148 / 255.0, 112 / 255.0, 71 / 255.0)
    bronze_hi = (184 / 255.0, 137 / 255.0, 74 / 255.0)
    bronze_shadow = (75 / 255.0, 54 / 255.0, 32 / 255.0)
    iron_dark = (22 / 255.0, 23 / 255.0, 24 / 255.0)
    teal_glass = (113 / 255.0, 205 / 255.0, 223 / 255.0)

    # 1. Stacked bronze pipes rising behind top edge like organ pipes
    pipe_w = geom.val(3.5)
    pipe_max_h = geom.val(12.0)
    ctx.save()
    num_pipes = int(w_px / (pipe_w * 1.5))
    for i in range(num_pipes):
        px = x0 + i * (pipe_w * 1.5)
        # Undulating organ pipe profile
        ph = geom.val(4.0) + pipe_max_h * 0.5 * (1.0 + math.sin(i * 0.25))
        py = y0 - ph
        # Cylindrical bronze gradient
        pgrad = cairo.LinearGradient(px, py, px + pipe_w, py)
        pgrad.add_color_stop_rgb(0.0, *bronze_shadow)
        pgrad.add_color_stop_rgb(0.4, *bronze_hi)
        pgrad.add_color_stop_rgb(1.0, *bronze_base)
        ctx.rectangle(px, py, pipe_w, ph + geom.val(2.0))
        ctx.set_source(pgrad)
        ctx.fill_preserve()
        ctx.set_source_rgb(*INK_BLACK)
        ctx.set_line_width(1.0)
        ctx.stroke()
    ctx.restore()

    # 2. Main chassis body
    arch_rise = geom.val(2.5)
    ctx.save()
    ctx.rectangle(x0, y0, w_px, h_px)
    ctx.set_source_rgb(*INK_BLACK)
    ctx.set_line_width(6.0)
    ctx.stroke_preserve()

    b_grad = cairo.LinearGradient(x0, y0, x0, y0 + h_px)
    b_grad.add_color_stop_rgb(0.0, *bronze_hi)
    b_grad.add_color_stop_rgb(0.3, *bronze_base)
    b_grad.add_color_stop_rgb(0.9, *bronze_shadow)
    ctx.set_source(b_grad)
    ctx.fill()
    ctx.restore()

    # Heat fin crown along top lip
    ctx.save()
    fin_w = geom.val(2.0)
    fin_h = geom.val(3.5)
    ctx.set_source_rgb(*bronze_shadow)
    for fx in range(int(x0), int(x0 + w_px), int(fin_w * 2)):
        ctx.rectangle(fx, y0 - fin_h, fin_w, fin_h)
        ctx.fill()
    ctx.restore()

    # Iron-bound tool rail along bottom
    rail_h = geom.val(4.0)
    ctx.save()
    ctx.rectangle(x0, y0 + h_px - rail_h, w_px, rail_h)
    ctx.set_source_rgb(*iron_dark)
    ctx.fill_preserve()
    ctx.set_source_rgb(*INK_BLACK)
    ctx.set_line_width(1.5)
    ctx.stroke()
    # Tool rail pins
    pin_spacing = geom.val(16.0)
    for px in range(int(x0 + pin_spacing), int(x0 + w_px), int(pin_spacing)):
        ctx.arc(px, y0 + h_px - rail_h / 2.0, geom.val(1.2), 0, 2 * math.pi)
        ctx.set_source_rgb(*bronze_hi)
        ctx.fill()
    ctx.restore()

    # Engineer Health Crest: 5 bronze lamp-cups with teal glass caps
    if geom.panel_type == 'health':
        cx = x0 + w_px / 2.0
        crest_w = geom.val(75.0)
        crest_h = geom.val(9.0)
        cy = y0
        ctx.save()
        ctx.rectangle(cx - crest_w / 2.0, cy - crest_h, crest_w, crest_h)
        ctx.set_source_rgb(*bronze_base)
        ctx.fill_preserve()
        ctx.set_source_rgb(*INK_BLACK)
        ctx.set_line_width(2.0)
        ctx.stroke()

        spacing = crest_w / 6.0
        for i in range(1, 6):
            lx = (cx - crest_w / 2.0) + i * spacing
            ly = cy - crest_h * 0.8
            # Bronze cup
            ctx.rectangle(lx - geom.val(3.0), ly + geom.val(2.0), geom.val(6.0), geom.val(4.5))
            ctx.set_source_rgb(*bronze_shadow)
            ctx.fill_preserve()
            ctx.set_source_rgb(*INK_BLACK)
            ctx.stroke()
            # Teal glass cap (unlit)
            ctx.arc(lx, ly + geom.val(2.0), geom.val(2.5), math.pi, 0)
            ctx.set_source_rgba(*teal_glass, 0.75)
            ctx.fill_preserve()
            ctx.set_source_rgb(*INK_BLACK)
            ctx.stroke()
        ctx.restore()

    # Glass apertures with orange forge seam glow
    def draw_forge_glow(rx, ry, rw, rh, r_circle=None):
        ctx.save()
        if r_circle:
            glow = cairo.RadialGradient(rx, ry, r_circle, rx, ry, r_circle + geom.val(3.0))
            glow.add_color_stop_rgba(0.0, *forge_orange, 0.7)
            glow.add_color_stop_rgba(1.0, *forge_orange, 0.0)
            ctx.set_source(glow)
            ctx.arc(rx, ry, r_circle + geom.val(3.0), 0, 2 * math.pi)
            ctx.fill()
        else:
            ctx.set_source_rgba(*forge_orange, 0.45)
            ctx.set_line_width(geom.val(1.8))
            ctx.rectangle(rx - geom.val(1.0), ry - geom.val(1.0), rw + geom.val(2.0), rh + geom.val(2.0))
            ctx.stroke()
        ctx.restore()

    if geom.panel_type == 'map':
        ccx, ccy = geom.pt(32.0, 32.0)
        crad = geom.val(26.0)
        # Bronze ring
        ctx.save()
        ctx.arc(ccx, ccy, crad + geom.val(4.0), 0, 2 * math.pi)
        ctx.set_source_rgb(*bronze_base)
        ctx.fill_preserve()
        ctx.set_source_rgb(*INK_BLACK)
        ctx.set_line_width(2.0)
        ctx.stroke()
        ctx.restore()

        draw_forge_glow(ccx, ccy, 0, 0, r_circle=crad)
        draw_empty_glass_circle(ctx, ccx, ccy, crad)

        rx, ry = geom.pt(68.0, 6.0)
        rw, rh = geom.val(146.0), geom.val(52.0)
        draw_forge_glow(rx, ry, rw, rh)
        draw_empty_glass_rect(ctx, rx, ry, rw, rh)

    elif geom.panel_type == 'health':
        rx1, ry1 = geom.pt(10.0, 6.0)
        rw1, rh1 = geom.val(330.0), geom.val(52.0)
        draw_forge_glow(rx1, ry1, rw1, rh1)
        draw_empty_glass_rect(ctx, rx1, ry1, rw1, rh1)

        rx2, ry2 = geom.pt(348.0, 6.0)
        rw2, rh2 = geom.val(12.0), geom.val(52.0)
        draw_forge_glow(rx2, ry2, rw2, rh2)
        draw_empty_glass_rect(ctx, rx2, ry2, rw2, rh2)

        rx3, ry3 = geom.pt(368.0, 6.0)
        rw3, rh3 = geom.val(144.0), geom.val(52.0)
        draw_forge_glow(rx3, ry3, rw3, rh3)
        draw_empty_glass_rect(ctx, rx3, ry3, rw3, rh3)

    elif geom.panel_type == 'gun':
        rx1, ry1 = geom.pt(8.0, 6.0)
        rw1, rh1 = geom.val(118.0), geom.val(52.0)
        draw_forge_glow(rx1, ry1, rw1, rh1)
        draw_empty_glass_rect(ctx, rx1, ry1, rw1, rh1)

        rx2, ry2 = geom.pt(134.0, 6.0)
        rw2, rh2 = geom.val(110.0), geom.val(52.0)
        draw_forge_glow(rx2, ry2, rw2, rh2)
        draw_empty_glass_rect(ctx, rx2, ry2, rw2, rh2)

        rx3, ry3 = geom.pt(252.0, 6.0)
        rw3, rh3 = geom.val(56.0), geom.val(52.0)
        draw_forge_glow(rx3, ry3, rw3, rh3)
        draw_empty_glass_rect(ctx, rx3, ry3, rw3, rh3)

        rx4, ry4 = geom.pt(316.0, 6.0)
        rw4, rh4 = geom.val(56.0), geom.val(52.0)
        draw_forge_glow(rx4, ry4, rw4, rh4)
        draw_empty_glass_rect(ctx, rx4, ry4, rw4, rh4)


# ==============================================================================
# STATE VARIANTS OVERLAYS (Applied on clean render)
# ==============================================================================

def apply_blood_state(ctx, geom):
    """Add fresh dark-red blood spatter and drips on frame/edges, never covering glass center."""
    random.seed(42)
    blood_dark = (112 / 255.0, 10 / 255.0, 15 / 255.0)
    blood_bright = (138 / 255.0, 14 / 255.0, 20 / 255.0)

    x0, y0 = geom.x0, geom.y0
    w_px, h_px = PANEL_W_PX, geom.h_px

    ctx.save()
    # Spatters along perimeter frame
    for _ in range(60):
        # Pick a point on the frame (top, bottom, left, right)
        side = random.choice(['top', 'bottom', 'left', 'right', 'margin'])
        if side == 'top':
            bx = random.uniform(x0, x0 + w_px)
            by = random.uniform(y0 - geom.val(3.0), y0 + geom.val(6.0))
        elif side == 'bottom':
            bx = random.uniform(x0, x0 + w_px)
            by = random.uniform(y0 + h_px - geom.val(8.0), y0 + h_px)
        elif side == 'left':
            bx = random.uniform(x0, x0 + geom.val(8.0))
            by = random.uniform(y0, y0 + h_px)
        elif side == 'right':
            bx = random.uniform(x0 + w_px - geom.val(8.0), x0 + w_px)
            by = random.uniform(y0, y0 + h_px)
        else:
            bx = random.uniform(x0 + geom.val(60.0), x0 + geom.val(140.0))
            by = y0 + geom.val(4.0)

        rad = random.uniform(geom.val(0.8), geom.val(3.2))
        ctx.arc(bx, by, rad, 0, 2 * math.pi)
        ctx.set_source_rgb(*random.choice([blood_dark, blood_bright]))
        ctx.fill()

        # Drip
        if random.random() < 0.35:
            drip_len = random.uniform(geom.val(3.0), geom.val(12.0))
            ctx.move_to(bx, by)
            ctx.line_to(bx, by + drip_len)
            ctx.set_line_width(random.uniform(1.2, 2.4))
            ctx.stroke()
    ctx.restore()


def apply_frost_state(ctx, geom):
    """Add white-blue frost creeping from corners along panes, small icicles."""
    random.seed(101)
    frost_white = (232 / 255.0, 244 / 255.0, 252 / 255.0)
    frost_blue = (168 / 255.0, 204 / 255.0, 235 / 255.0)

    x0, y0 = geom.x0, geom.y0
    w_px, h_px = PANEL_W_PX, geom.h_px

    ctx.save()
    # Frost crust creeping from corners
    corners = [(x0, y0), (x0 + w_px, y0), (x0, y0 + h_px), (x0 + w_px, y0 + h_px)]
    for cx, cy in corners:
        for _ in range(80):
            ang = random.uniform(0, 2 * math.pi)
            dist = random.uniform(geom.val(2.0), geom.val(35.0))
            fx = cx + dist * math.cos(ang)
            fy = cy + dist * math.sin(ang)
            frad = random.uniform(geom.val(0.8), geom.val(2.5))
            ctx.arc(fx, fy, frad, 0, 2 * math.pi)
            ctx.set_source_rgba(*random.choice([frost_white, frost_blue]), 0.65)
            ctx.fill()

    # Small icicles hanging from bottom edge
    for ix in range(int(x0 + geom.val(10.0)), int(x0 + w_px - geom.val(10.0)), int(geom.val(14.0))):
        if random.random() < 0.6:
            ilen = random.uniform(geom.val(3.0), geom.val(10.0))
            ctx.move_to(ix - geom.val(1.5), y0 + h_px)
            ctx.line_to(ix + geom.val(1.5), y0 + h_px)
            ctx.line_to(ix, y0 + h_px + ilen)
            ctx.close_path()
            ctx.set_source_rgba(*frost_white, 0.85)
            ctx.fill()
    ctx.restore()


def apply_damage1_state(ctx, geom):
    """Add single impact crack running along the leaded glass."""
    random.seed(777)
    crack_color = (200 / 255.0, 224 / 255.0, 234 / 255.0)

    x0, y0 = geom.x0, geom.y0
    w_px, h_px = PANEL_W_PX, geom.h_px

    ctx.save()
    # Impact center on one window edge
    if geom.panel_type == 'map':
        ix, iy = geom.pt(68.0, 16.0)
    elif geom.panel_type == 'health':
        ix, iy = geom.pt(120.0, 6.0)
    else:
        ix, iy = geom.pt(40.0, 6.0)

    # Spidering impact crack lines
    for angle in [-0.8, -0.2, 0.4, 1.2]:
        cx, cy = ix, iy
        for step in range(6):
            nx = cx + geom.val(random.uniform(5.0, 10.0)) * math.cos(angle)
            ny = cy + geom.val(random.uniform(5.0, 10.0)) * math.sin(angle)
            ctx.move_to(cx, cy)
            ctx.line_to(nx, ny)
            ctx.set_source_rgba(*crack_color, 0.9)
            ctx.set_line_width(max(1.0, geom.val(0.4) - step * 0.05))
            ctx.stroke()
            cx, cy = nx, ny
    # Impact chip
    ctx.arc(ix, iy, geom.val(2.0), 0, 2 * math.pi)
    ctx.set_source_rgba(1.0, 1.0, 1.0, 0.7)
    ctx.fill()
    ctx.restore()


# ==============================================================================
# MAIN RENDER PIPELINE
# ==============================================================================

def build_all_assets():
    base_dir = "public/ui/suit"
    classes = ['scout', 'tank', 'engineer']
    panels = ['map', 'health', 'gun']

    for c in classes:
        os.makedirs(os.path.join(base_dir, c), exist_ok=True)

    print("=== Rendering 9 clean panels ===")
    for c in classes:
        for p in panels:
            surf, ctx = create_cairo_surface()
            geom = PanelGeometry(p, c)

            if c == 'scout':
                render_scout(geom, ctx)
            elif c == 'tank':
                render_tank(geom, ctx)
            elif c == 'engineer':
                render_engineer(geom, ctx)

            out_path = os.path.join(base_dir, c, f"{p}.png")
            img = surface_to_pil(surf)
            img.save(out_path, format="PNG")
            print(f"Generated clean panel: {out_path} ({img.size[0]}x{img.size[1]})")

    print("\n=== Rendering SCOUT state variants (_blood, _frost, _damage1) ===")
    for p in panels:
        # 1. _blood
        surf, ctx = create_cairo_surface()
        geom = PanelGeometry(p, 'scout')
        render_scout(geom, ctx)
        apply_blood_state(ctx, geom)
        out_path = os.path.join(base_dir, 'scout', f"{p}_blood.png")
        img = surface_to_pil(surf)
        img.save(out_path, format="PNG")
        print(f"Generated state variant: {out_path}")

        # 2. _frost
        surf, ctx = create_cairo_surface()
        geom = PanelGeometry(p, 'scout')
        render_scout(geom, ctx)
        apply_frost_state(ctx, geom)
        out_path = os.path.join(base_dir, 'scout', f"{p}_frost.png")
        img = surface_to_pil(surf)
        img.save(out_path, format="PNG")
        print(f"Generated state variant: {out_path}")

        # 3. _damage1
        surf, ctx = create_cairo_surface()
        geom = PanelGeometry(p, 'scout')
        render_scout(geom, ctx)
        apply_damage1_state(ctx, geom)
        out_path = os.path.join(base_dir, 'scout', f"{p}_damage1.png")
        img = surface_to_pil(surf)
        img.save(out_path, format="PNG")
        print(f"Generated state variant: {out_path}")

    print("\nAsset generation complete.")


if __name__ == '__main__':
    build_all_assets()
