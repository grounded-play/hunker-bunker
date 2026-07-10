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
            val = max(-1.0, min(1.0, s))
            int_val = int(val * 32767)
            f.writeframesraw(struct.pack('<h', int_val))
    print(f"Synthesized SFX: {filename} ({len(samples)} samples)")

# 1. Camp fire loop
def generate_camp_fire_loop(filename, duration=2.0, sample_rate=44100):
    num_samples = int(duration * sample_rate)
    samples = []
    # Low pass noise filter states
    prev_noise = 0.0
    for i in range(num_samples):
        t = i / sample_rate
        # Low frequency rumble
        raw_noise = random.uniform(-1.0, 1.0)
        noise = prev_noise + 0.08 * (raw_noise - prev_noise)
        prev_noise = noise
        
        # Fire crackle pop hits
        pop = 0.0
        if random.random() < 0.0018:
            # Trigger a tiny pop
            pop_dur = random.uniform(0.005, 0.02)
            pop_freq = random.uniform(800.0, 1800.0)
            pop_samples = int(pop_dur * sample_rate)
            for j in range(pop_samples):
                t_pop = j / sample_rate
                pop_val = math.sin(2.0 * math.pi * pop_freq * t_pop) * math.exp(-t_pop * 180.0)
                if i + j < num_samples:
                    pop += pop_val
                    
        val = noise * 0.15 + pop * 0.5
        samples.append(val * 0.7)
    write_wav(filename, samples, sample_rate)

# 2. Camp fire douse (steam hiss)
def generate_camp_fire_douse(filename, duration=1.2, sample_rate=44100):
    num_samples = int(duration * sample_rate)
    samples = []
    prev_noise = 0.0
    for i in range(num_samples):
        t = i / sample_rate
        # High pass noise filter
        raw_noise = random.uniform(-1.0, 1.0)
        noise = raw_noise - prev_noise
        prev_noise = raw_noise * 0.4
        
        # Sweep frequency down
        env = math.exp(-t * 3.5)
        samples.append(noise * env * 0.42)
    write_wav(filename, samples, sample_rate)

# 3. Lockdown alarm
def generate_lockdown_alarm(filename, duration=1.5, sample_rate=44100):
    num_samples = int(duration * sample_rate)
    samples = []
    for i in range(num_samples):
        t = i / sample_rate
        # Alternating tones every 0.25s
        freq = 520.0 if (int(t * 4) % 2 == 0) else 690.0
        val = math.sin(2.0 * math.pi * freq * t)
        # Pulse amplitude
        amp = 0.35 * (1.0 - (t % 0.25) / 0.25)
        samples.append(val * amp)
    write_wav(filename, samples, sample_rate)

# 4. Lockdown chains rattle
def generate_lockdown_chains(filename, duration=0.8, sample_rate=44100):
    num_samples = int(duration * sample_rate)
    samples = [0.0] * num_samples
    # Spawn multiple metal clicks/rattles
    for idx in range(12):
        start_t = idx * 0.06
        start_idx = int(start_t * sample_rate)
        click_dur = random.uniform(0.04, 0.08)
        click_samples = int(click_dur * sample_rate)
        freq = random.uniform(1800.0, 3200.0)
        for j in range(click_samples):
            pos = start_idx + j
            if pos >= num_samples:
                break
            t_click = j / sample_rate
            noise = random.uniform(-1.0, 1.0)
            osc = math.sin(2.0 * math.pi * freq * t_click)
            samples[pos] += (osc * 0.4 + noise * 0.6) * math.exp(-t_click * 90.0) * 0.22
    write_wav(filename, samples, sample_rate)

# 5. Eggs hum
def generate_eggs_hum(filename, duration=2.0, sample_rate=44100):
    num_samples = int(duration * sample_rate)
    samples = []
    for i in range(num_samples):
        t = i / sample_rate
        lfo = 1.0 + 0.28 * math.sin(2.0 * math.pi * 1.3 * t)
        freq = 55.0 * lfo
        val = math.sin(2.0 * math.pi * freq * t)
        # Add a subtle organic wet bubble pop
        pop = 0.0
        if random.random() < 0.0006:
            pop_t = random.uniform(0.01, 0.03)
            pop_s = int(pop_t * sample_rate)
            for j in range(pop_s):
                tj = j / sample_rate
                pv = math.sin(2.0 * math.pi * 800.0 * tj) * math.exp(-tj * 250.0)
                if i + j < num_samples:
                    pop += pv
        samples.append((val * 0.45 + pop * 0.3) * 0.6)
    write_wav(filename, samples, sample_rate)

# 6. Eggs hatch
def generate_eggs_hatch(filename, duration=0.6, sample_rate=44100):
    num_samples = int(duration * sample_rate)
    samples = []
    phase = 0.0
    for i in range(num_samples):
        t = i / sample_rate
        # Wet squish sweep down
        f = 240.0 * ((80.0 / 240.0) ** (t / duration))
        phase += 2.0 * math.pi * f / sample_rate
        osc = math.sin(phase)
        # Crack click
        click = random.uniform(-1.0, 1.0) * math.exp(-t * 220.0)
        
        env = math.exp(-t * 7.0)
        samples.append((osc * 0.65 + click * 0.35) * env * 0.7)
    write_wav(filename, samples, sample_rate)

# 7. Spore puff
def generate_spore_puff(filename, duration=1.0, sample_rate=44100):
    num_samples = int(duration * sample_rate)
    samples = []
    prev_noise = 0.0
    for i in range(num_samples):
        t = i / sample_rate
        # Band pass filtered noise
        raw_noise = random.uniform(-1.0, 1.0)
        noise = prev_noise + 0.15 * (raw_noise - prev_noise)
        prev_noise = noise
        
        # Soft attack and decay
        if t < 0.15:
            env = t / 0.15
        else:
            env = math.exp(-(t - 0.15) * 4.0)
            
        samples.append(noise * env * 0.45)
    write_wav(filename, samples, sample_rate)

# 8. Sticky webs
def generate_sticky_webs(filename, duration=0.5, sample_rate=44100):
    num_samples = int(duration * sample_rate)
    samples = [0.0] * num_samples
    # Create multiple tiny tearing snaps
    for idx in range(16):
        start_t = random.uniform(0.0, duration - 0.08)
        start_idx = int(start_t * sample_rate)
        snap_dur = random.uniform(0.005, 0.015)
        snap_samples = int(snap_dur * sample_rate)
        for j in range(snap_samples):
            pos = start_idx + j
            if pos >= num_samples:
                break
            t_snap = j / sample_rate
            noise = random.uniform(-1.0, 1.0)
            samples[pos] += noise * math.exp(-t_snap * 350.0) * 0.18
    write_wav(filename, samples, sample_rate)

# 9. Queen's Throne rumble
def generate_queen_throne(filename, duration=2.0, sample_rate=44100):
    num_samples = int(duration * sample_rate)
    samples = []
    for i in range(num_samples):
        t = i / sample_rate
        # Breathing LFO
        lfo = 0.75 + 0.25 * math.sin(2.0 * math.pi * 0.65 * t)
        # Deep triangle wave
        val = 2.0 * abs(2.0 * ((38.0 * t) % 1.0) - 1.0) - 1.0
        samples.append(val * lfo * 0.55)
    write_wav(filename, samples, sample_rate)

# 10. Wounded hive dripping
def generate_wounded_hive_drip(filename, duration=0.8, sample_rate=44100):
    num_samples = int(duration * sample_rate)
    samples = [0.0] * num_samples
    # Three drip drops
    drips = [0.05, 0.28, 0.52]
    for start_t in drips:
        start_idx = int(start_t * sample_rate)
        drip_dur = 0.08
        drip_samples = int(drip_dur * sample_rate)
        phase = 0.0
        for j in range(drip_samples):
            pos = start_idx + j
            if pos >= num_samples:
                break
            tj = j / sample_rate
            # rapid sine pitch sweep up (classic drip sound)
            f = 800.0 + (1600.0 - 800.0) * (tj / drip_dur)
            phase += 2.0 * math.pi * f / sample_rate
            samples[pos] += math.sin(phase) * math.exp(-tj * 95.0) * 0.28
    write_wav(filename, samples, sample_rate)

# 11. Scout sprint whoosh
def generate_sprint_whoosh(filename, duration=0.6, sample_rate=44100):
    num_samples = int(duration * sample_rate)
    samples = []
    prev_noise = 0.0
    for i in range(num_samples):
        t = i / sample_rate
        raw_noise = random.uniform(-1.0, 1.0)
        # Lowpass filter sweeping up then down
        cutoff = 0.05 + 0.25 * math.sin(math.pi * (t / duration))
        noise = prev_noise + cutoff * (raw_noise - prev_noise)
        prev_noise = noise
        
        env = math.sin(math.pi * (t / duration))
        samples.append(noise * env * 0.45)
    write_wav(filename, samples, sample_rate)

# 12. Tank shockwave stomp
def generate_shockwave_stomp(filename, duration=1.0, sample_rate=44100):
    num_samples = int(duration * sample_rate)
    samples = []
    phase = 0.0
    prev_noise = 0.0
    for i in range(num_samples):
        t = i / sample_rate
        # Deep explosion pitch sweep
        f = 180.0 * ((30.0 / 180.0) ** (t / duration))
        phase += 2.0 * math.pi * f / sample_rate
        osc = math.sin(phase)
        
        raw_noise = random.uniform(-1.0, 1.0)
        noise = prev_noise + 0.12 * (raw_noise - prev_noise)
        prev_noise = noise
        
        env = math.exp(-t * 5.0)
        samples.append((osc * 0.55 + noise * 0.45) * env * 0.8)
    write_wav(filename, samples, sample_rate)

# 13. Engineer sparks
def generate_engineer_sparks(filename, duration=1.0, sample_rate=44100):
    num_samples = int(duration * sample_rate)
    samples = [0.0] * num_samples
    # Crackling spark impulses
    for idx in range(32):
        start_t = random.uniform(0.0, duration - 0.05)
        start_idx = int(start_t * sample_rate)
        spark_samples = int(0.04 * sample_rate)
        freq = random.uniform(1200.0, 3600.0)
        for j in range(spark_samples):
            pos = start_idx + j
            if pos >= num_samples:
                break
            tj = j / sample_rate
            noise = random.uniform(-1.0, 1.0)
            osc = math.sin(2.0 * math.pi * freq * tj)
            samples[pos] += (osc * 0.5 + noise * 0.5) * math.exp(-tj * 180.0) * 0.15
    write_wav(filename, samples, sample_rate)

# 14. Level Up chime
def generate_levelup_chime(filename, sample_rate=44100):
    duration = 1.5
    num_samples = int(duration * sample_rate)
    samples = [0.0] * num_samples
    
    # Ascending chord notes (C4, E4, G4, C5, E5, G5)
    notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]
    note_delay = 0.09
    note_dur = 0.45
    
    for idx, freq in enumerate(notes):
        start_time = idx * note_delay
        start_sample = int(start_time * sample_rate)
        for j in range(int(note_dur * sample_rate)):
            pos = start_sample + j
            if pos >= num_samples:
                break
            t_note = j / sample_rate
            osc = math.sin(2.0 * math.pi * freq * t_note)
            env = math.exp(-t_note * 8.0)
            samples[pos] += osc * env * 0.16
            
    write_wav(filename, samples, sample_rate)

# 15. Achievement unlocked chime
def generate_achievement_chime(filename, sample_rate=44100):
    duration = 1.5
    num_samples = int(duration * sample_rate)
    samples = [0.0] * num_samples
    
    # Major 5th interval chime (C5, G5, C6)
    notes = [523.25, 783.99, 1046.50]
    note_delay = 0.05
    note_dur = 0.65
    
    for idx, freq in enumerate(notes):
        start_time = idx * note_delay
        start_sample = int(start_time * sample_rate)
        for j in range(int(note_dur * sample_rate)):
            pos = start_sample + j
            if pos >= num_samples:
                break
            t_note = j / sample_rate
            osc = 0.7 * math.sin(2.0 * math.pi * freq * t_note) + 0.3 * math.sin(2.0 * math.pi * (freq * 2) * t_note)
            env = math.exp(-t_note * 5.0)
            samples[pos] += osc * env * 0.15
            
    write_wav(filename, samples, sample_rate)

if __name__ == "__main__":
    out_dir = "/home/caveman/Desktop/icecave/hunker-bunker/public/audio/vg2"
    
    # Generate all Wave 2 SFXs
    generate_camp_fire_loop(f"{out_dir}/camp_fire_loop.wav")
    generate_camp_fire_douse(f"{out_dir}/camp_fire_douse.wav")
    generate_lockdown_alarm(f"{out_dir}/camp_lockdown_alarm.wav")
    generate_lockdown_chains(f"{out_dir}/camp_lockdown_chains.wav")
    
    generate_eggs_hum(f"{out_dir}/hive_eggs_hum.wav")
    generate_eggs_hatch(f"{out_dir}/hive_eggs_hatch.wav")
    generate_spore_puff(f"{out_dir}/hive_spores_puff.wav")
    generate_sticky_webs(f"{out_dir}/hive_webs_sticky.wav")
    generate_queen_throne(f"{out_dir}/hive_queen_throne.wav")
    generate_wounded_hive_drip(f"{out_dir}/hive_wounded_drip.wav")
    
    generate_sprint_whoosh(f"{out_dir}/fx_scout_sprint.wav")
    generate_shockwave_stomp(f"{out_dir}/fx_tank_shockwave.wav")
    generate_engineer_sparks(f"{out_dir}/fx_engineer_turret.wav")
    generate_levelup_chime(f"{out_dir}/fx_levelup.wav")
    generate_achievement_chime(f"{out_dir}/fx_achievement.wav")
    
    print("All Wave 2 audio assets synthesized successfully!")
