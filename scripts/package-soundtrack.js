import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const configPath = path.join(rootDir, 'public', 'audio', 'soundtrack-config.json');
const distDir = path.join(rootDir, 'dist_soundtrack');

function packageSoundtrack() {
    console.log('--- Starting Soundtrack Packaging ---');
    
    if (!fs.existsSync(configPath)) {
        console.error(`Error: Configuration file not found at ${configPath}`);
        process.exit(1);
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log(`Album: ${config.album}`);
    console.log(`Artist: ${config.artist}\n`);
    
    // Clean and recreate dist_soundtrack/
    if (fs.existsSync(distDir)) {
        console.log(`Cleaning existing directory: ${distDir}`);
        fs.rmSync(distDir, { recursive: true, force: true });
    }
    fs.mkdirSync(distDir, { recursive: true });
    
    // Copy cover art
    if (config.cover) {
        const coverSrc = path.join(rootDir, 'public', 'audio', config.cover);
        const coverDest = path.join(distDir, config.cover);
        if (fs.existsSync(coverSrc)) {
            console.log(`Copying cover art: ${config.cover}`);
            fs.copyFileSync(coverSrc, coverDest);
        } else {
            console.warn(`Warning: Cover art not found at ${coverSrc}`);
        }
    }
    
    // Copy tracks and rename them
    const manifestLines = [
        `======================================================================`,
        `  ${config.album.toUpperCase()}`,
        `======================================================================`,
        `Artist:      ${config.artist}`,
        `Year:        ${config.year}`,
        `Genre:       ${config.genre}`,
        `Description: ${config.description}`,
        ``,
        `TRACKLIST:`,
        `----------`
    ];
    
    config.tracks.forEach(track => {
        const numStr = String(track.track_number).padStart(2, '0');
        // Clean title for filename (replace any invalid chars)
        const cleanTitle = track.title.replace(/[^a-zA-Z0-9\s-_()]/g, '');
        const extension = path.extname(track.filename);
        const destFilename = `${numStr} - ${cleanTitle}${extension}`;
        
        const srcPath = path.join(rootDir, 'public', 'audio', track.filename);
        const destPath = path.join(distDir, destFilename);
        
        console.log(`Processing Track ${track.track_number}: "${track.title}"`);
        if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, destPath);
            console.log(`  -> Copied to: ${destFilename}`);
        } else {
            console.error(`  -> Error: Source file not found at ${srcPath}`);
        }
        
        manifestLines.push(`${numStr}. ${track.title}`);
        if (track.description) {
            manifestLines.push(`    Description: ${track.description}`);
        }
        manifestLines.push(``);
    });
    
    // Write metadata file
    const metadataText = manifestLines.join('\n');
    fs.writeFileSync(path.join(distDir, 'TRACKLIST.txt'), metadataText, 'utf8');
    console.log('\nGenerated: TRACKLIST.txt');
    
    // Embed ID3v2 tags and album artwork into MP3 files
    try {
        console.log('\n--- Embedding ID3 Tags & Album Cover Art into MP3 files ---');
        execSync('python3 scripts/tag_mp3_files.py', { cwd: rootDir, stdio: 'inherit' });
    } catch (err) {
        console.warn(`Warning: Could not embed ID3 tags: ${err.message}`);
    }
    
    // Zip the files
    const zipFilename = 'hunker-bunker-soundtrack.zip';
    const zipPath = path.join(rootDir, zipFilename);
    if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
    }
    
    try {
        console.log(`\nZipping pack into ${zipFilename}...`);
        // Navigate into dist_soundtrack so the zip doesn't contain the full folder path
        execSync(`zip -r ../${zipFilename} .`, { cwd: distDir, stdio: 'inherit' });
        
        // Move zip file into dist_soundtrack for a clean distribution structure
        fs.renameSync(zipPath, path.join(distDir, zipFilename));
        console.log(`\nSuccess! Soundtrack zip package created at: dist_soundtrack/${zipFilename}`);
    } catch (err) {
        console.error(`Error zipping files: ${err.message}`);
    }
}

packageSoundtrack();
