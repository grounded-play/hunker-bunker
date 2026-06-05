import os
import wave
import struct
import math
import random

def write_wav(filename, samples, sample_rate=44100):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with wave.open(filename, 'w') as f:
        f.setnchannels(1)  # mono
        f.setsampwidth(2)  # 16-bit PCM
        f.setframerate(sample_rate)
        for s in samples:
            # Clamp sample to [-1.0, 1.0]
            val = max(-1.0, min(1.0, s))
            int_val = int(val * 32767)
            f.writeframesraw(struct.pack('<h', int_val))
    print(f"Synthesized: {filename} ({len(samples)} samples)")

def generate_weapon_fire(filename, start_freq, end_freq, duration, sample_rate=44100):
    num_samples = int(duration * sample_rate)
    samples = []
    phase = 0.0
    for i in range(num_samples):
        t = i / sample_rate
        # Exponential frequency sweep down
        f = start_freq * ((end_freq / start_freq) ** (t / duration))
        phase += 2.0 * math.pi * f / sample_rate
        
        # Triangle wave (nice warm chip tune sound)
        val = 2.0 * abs(2.0 * ((phase / (2.0 * math.pi)) % 1.0) - 1.0) - 1.0
        
        # Noise burst layer for crackle/punch
        noise = random.uniform(-1.0, 1.0)
        noise_env = math.exp(-t * 140.0)  # decays extremely fast
        val = val * (1.0 - 0.3 * noise_env) + noise * 0.3 * noise_env
        
        # Volume Envelope
        vol_env = math.exp(-t * 24.0)
        samples.append(val * vol_env * 0.75)
    write_wav(filename, samples, sample_rate)

def generate_weapon_reload(filename, click1_time, click2_time, duration, sample_rate=44100):
    num_samples = int(duration * sample_rate)
    samples = []
    for i in range(num_samples):
        t = i / sample_rate
        val = 0.0
        
        # Click 1
        if t >= click1_time:
            dt1 = t - click1_time
            env1 = math.exp(-dt1 * 200.0)
            if env1 > 0.001:
                freq = 1900.0 * math.exp(-dt1 * 70.0)
                osc = math.sin(2.0 * math.pi * freq * dt1)
                noise = random.uniform(-1.0, 1.0)
                val += (osc * 0.45 + noise * 0.55) * env1
        
        # Click 2
        if t >= click2_time:
            dt2 = t - click2_time
            env2 = math.exp(-dt2 * 140.0)
            if env2 > 0.001:
                freq = 1300.0 * math.exp(-dt2 * 50.0)
                osc = math.sin(2.0 * math.pi * freq * dt2)
                noise = random.uniform(-1.0, 1.0)
                val += (osc * 0.35 + noise * 0.65) * env2 * 0.95
                
        samples.append(val * 0.65)
    write_wav(filename, samples, sample_rate)

def generate_player_hit(filename, start_freq, end_freq, duration, sample_rate=44100):
    num_samples = int(duration * sample_rate)
    samples = []
    phase = 0.0
    prev_noise = 0.0
    for i in range(num_samples):
        t = i / sample_rate
        # Linear pitch sweep
        f = start_freq + (end_freq - start_freq) * (t / duration)
        phase += 2.0 * math.pi * f / sample_rate
        osc = math.sin(phase)
        
        # Lowpass filtered noise for organic impact/grunt
        raw_noise = random.uniform(-1.0, 1.0)
        noise = prev_noise + 0.09 * (raw_noise - prev_noise)
        prev_noise = noise
        
        val = osc * 0.65 + noise * 0.35
        # Envelope with fast attack and exponential decay
        if t < 0.01:
            env = t / 0.01
        else:
            env = math.exp(-(t - 0.01) * 16.0)
            
        samples.append(val * env * 0.8)
    write_wav(filename, samples, sample_rate)

def generate_player_death(filename, sample_rate=44100):
    duration = 1.6
    num_samples = int(duration * sample_rate)
    samples = []
    phase = 0.0
    prev_noise = 0.0
    for i in range(num_samples):
        t = i / sample_rate
        val = 0.0
        
        # 1. Main deep crash/explosion sweep (first 0.6s)
        if t < 0.6:
            f = 190.0 * (15.0 / 190.0) ** (t / 0.6)
            phase += 2.0 * math.pi * f / sample_rate
            osc = math.sin(phase)
            env_crash = math.exp(-t * 5.0)
            val += osc * env_crash * 0.55
        
        # 2. Decompressing suit static (noise fading over 1.6s)
        raw_noise = random.uniform(-1.0, 1.0)
        noise = prev_noise + 0.06 * (raw_noise - prev_noise)
        prev_noise = noise
        env_static = math.exp(-t * 2.2)
        val += noise * env_static * 0.3
        
        # 3. Flashing vital alarm (three short beeps at 880Hz)
        beep_active = False
        beep_t = 0.0
        if 0.32 <= t < 0.40:
            beep_active = True
            beep_t = t - 0.32
        elif 0.72 <= t < 0.80:
            beep_active = True
            beep_t = t - 0.72
        elif 1.12 <= t < 1.20:
            beep_active = True
            beep_t = t - 1.12
            
        if beep_active:
            beep_env = 1.0
            if beep_t < 0.01:
                beep_env = beep_t / 0.01
            elif beep_t > 0.07:
                beep_env = (0.08 - beep_t) / 0.01
            beep_osc = math.sin(2.0 * math.pi * 880.0 * t)
            val += beep_osc * beep_env * 0.15
            
        samples.append(val * 0.8)
    write_wav(filename, samples, sample_rate)

def generate_enemy_hit_soft(filename, start_freq, end_freq, duration, sample_rate=44100):
    num_samples = int(duration * sample_rate)
    samples = []
    phase = 0.0
    prev_noise = 0.0
    for i in range(num_samples):
        t = i / sample_rate
        f = start_freq * ((end_freq / start_freq) ** (t / duration))
        phase += 2.0 * math.pi * f / sample_rate
        osc = math.sin(phase)
        
        # High-pass / noisy click
        raw_noise = random.uniform(-1.0, 1.0)
        noise = raw_noise - prev_noise
        prev_noise = raw_noise * 0.5
        
        val = osc * 0.45 + noise * 0.55
        env = math.exp(-t * 36.0)
        samples.append(val * env * 0.7)
    write_wav(filename, samples, sample_rate)

def generate_enemy_death_snail(filename, start_freq, end_freq, lfo_freq, duration, sample_rate=44100):
    num_samples = int(duration * sample_rate)
    samples = []
    phase = 0.0
    prev_noise = 0.0
    for i in range(num_samples):
        t = i / sample_rate
        lfo = math.sin(2.0 * math.pi * lfo_freq * t)
        f = start_freq + (end_freq - start_freq) * (t / duration)
        # Modulate frequency with LFO for a bubbly feel
        f_mod = f * (1.0 + 0.35 * lfo)
        phase += 2.0 * math.pi * f_mod / sample_rate
        osc = math.sin(phase)
        
        raw_noise = random.uniform(-1.0, 1.0)
        noise = prev_noise + 0.16 * (raw_noise - prev_noise)
        prev_noise = noise
        
        val = osc * 0.5 + noise * 0.5
        env = math.exp(-t * 9.0)
        samples.append(val * env * 0.6)
    write_wav(filename, samples, sample_rate)

def generate_enemy_death_crawler(filename, start_freq, end_freq, duration, sample_rate=44100):
    num_samples = int(duration * sample_rate)
    samples = []
    phase = 0.0
    prev_noise = 0.0
    for i in range(num_samples):
        t = i / sample_rate
        f = start_freq * ((end_freq / start_freq) ** (t / duration))
        phase += 2.0 * math.pi * f / sample_rate
        osc = math.sin(phase)
        
        raw_noise = random.uniform(-1.0, 1.0)
        noise = prev_noise + 0.28 * (raw_noise - prev_noise)
        prev_noise = noise
        
        val = osc * 0.35 + noise * 0.65
        env = math.exp(-t * 14.0)
        samples.append(val * env * 0.65)
    write_wav(filename, samples, sample_rate)

def generate_ui_upgrade_weapon(filename, sample_rate=44100):
    duration = 0.85
    num_samples = int(duration * sample_rate)
    samples = [0.0] * num_samples
    
    # Pentatonic Major notes arpeggio
    notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]
    note_delay = 0.075
    note_dur = 0.32
    
    for idx, freq in enumerate(notes):
        start_time = idx * note_delay
        start_sample = int(start_time * sample_rate)
        for i in range(int(note_dur * sample_rate)):
            pos = start_sample + i
            if pos >= num_samples:
                break
            t_note = i / sample_rate
            # Mix sine wave with a little triangle
            triangle = 2.0 * abs(2.0 * ((freq * t_note) % 1.0) - 1.0) - 1.0
            osc = 0.65 * math.sin(2.0 * math.pi * freq * t_note) + 0.35 * triangle
            env = math.exp(-t_note * 11.0)
            samples[pos] += osc * env * 0.18
            
    write_wav(filename, samples, sample_rate)

if __name__ == "__main__":
    out_dir = "/home/caveman/Desktop/icecave/hunker-bunker/public/audio/vg2"
    
    # Weapon fire variations
    generate_weapon_fire(f"{out_dir}/weapon_fire_sidearm1.wav", start_freq=1400, end_freq=120, duration=0.11)
    generate_weapon_fire(f"{out_dir}/weapon_fire_sidearm2.wav", start_freq=1600, end_freq=145, duration=0.12)
    generate_weapon_fire(f"{out_dir}/weapon_fire_sidearm3.wav", start_freq=1500, end_freq=105, duration=0.13)
    
    # Weapon reload variations
    generate_weapon_reload(f"{out_dir}/weapon_reload1.wav", click1_time=0.0, click2_time=0.13, duration=0.23)
    generate_weapon_reload(f"{out_dir}/weapon_reload2.wav", click1_time=0.0, click2_time=0.16, duration=0.26)
    
    # Player hit variations
    generate_player_hit(f"{out_dir}/player_hit1.wav", start_freq=150, end_freq=45, duration=0.14)
    generate_player_hit(f"{out_dir}/player_hit2.wav", start_freq=165, end_freq=40, duration=0.15)
    generate_player_hit(f"{out_dir}/player_hit3.wav", start_freq=135, end_freq=35, duration=0.16)
    
    # Player death
    generate_player_death(f"{out_dir}/player_death1.wav")
    
    # Enemy hit variations
    generate_enemy_hit_soft(f"{out_dir}/enemy_hit_soft1.wav", start_freq=800, end_freq=250, duration=0.07)
    generate_enemy_hit_soft(f"{out_dir}/enemy_hit_soft2.wav", start_freq=950, end_freq=350, duration=0.08)
    generate_enemy_hit_soft(f"{out_dir}/enemy_hit_soft3.wav", start_freq=850, end_freq=200, duration=0.09)
    
    # Enemy death (snail) variations
    generate_enemy_death_snail(f"{out_dir}/enemy_death_snail1.wav", start_freq=260, end_freq=50, lfo_freq=22, duration=0.38)
    generate_enemy_death_snail(f"{out_dir}/enemy_death_snail2.wav", start_freq=320, end_freq=65, lfo_freq=28, duration=0.42)
    generate_enemy_death_snail(f"{out_dir}/enemy_death_snail3.wav", start_freq=280, end_freq=40, lfo_freq=16, duration=0.45)
    
    # Enemy death (crawler) variations
    generate_enemy_death_crawler(f"{out_dir}/enemy_death_crawler1.wav", start_freq=1100, end_freq=300, duration=0.23)
    generate_enemy_death_crawler(f"{out_dir}/enemy_death_crawler2.wav", start_freq=1300, end_freq=450, duration=0.27)
    
    # UI upgrade weapon
    generate_ui_upgrade_weapon(f"{out_dir}/ui_upgrade_weapon1.wav")
    
    print("All audio assets synthesized successfully!")
