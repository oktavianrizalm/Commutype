import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wordsPath = path.resolve(__dirname, '../node_modules/generate-passphrase-id/dist/words.txt');
const destPath = path.resolve(__dirname, '../src/lib/data/kbbi.json');

try {
    const data = fs.readFileSync(wordsPath, 'utf8');
    const words = data
        .split('\n')
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length > 2 && /^[a-z]+$/.test(w)); // Only lowercase alphabets, length > 2

    // Remove duplicates
    const uniqueWords = [...new Set(words)];

    fs.writeFileSync(destPath, JSON.stringify(uniqueWords));
    console.log(`Berhasil mengekstrak ${uniqueWords.length} kata KBBI ke ${destPath}`);
} catch (e) {
    console.error("Gagal membaca atau menulis file:", e);
}
