<div align="center">
  <img src="static/logo.png" alt="CommuType Logo" width="300"/>
  <h1>CommuType</h1>
  <p><strong>Uji Kecepatan Mengetik Anda Melintasi Jalur KRL Jabodetabek!</strong></p>
  
  [![Svelte](https://img.shields.io/badge/Svelte-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)](https://svelte.dev/)
  [![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
</div>

---

## 🚆 Tentang CommuType
**CommuType** adalah sebuah permainan *web browser* interaktif bergaya *typing-test* (seperti Monkeytype atau Typeracer), namun dengan sentuhan lokal yang unik: **Rute Kereta Rel Listrik (KRL) Commuter Line Jabodetabek!**

Setiap kata yang Anda ketik akan menggerakkan kereta Anda maju dari satu stasiun ke stasiun berikutnya melintasi peta geografis asli kota Jakarta dan sekitarnya.

## ✨ Fitur Utama
* 🗺️ **Peta Interaktif Layar Penuh (Leaflet + CartoDB)**: Latar belakang permainan menggunakan peta OpenStreetMap interaktif yang mengikuti pergerakan kereta Anda secara otomatis (*Auto-Pan*). Mendukung Mode Gelap dan Terang.
* 🚉 **Rute KRL Asli**: Pilih dari berbagai rute komuter favorit Anda:
  * 🔴 Lin Bogor (24 Stasiun)
  * 🔴 Lin Nambo (24 Stasiun)
  * 🔵 Lin Cikarang (20 Stasiun)
  * 🟢 Lin Rangkasbitung (17 Stasiun)
  * 🟤 Lin Tangerang (11 Stasiun)
  * 🩷 Lin Tanjung Priuk (4 Stasiun)
* ⌨️ **Mekanik Ketik *Hardcore***: Tidak ada ampun untuk *typo*! Anda diwajibkan menggunakan *Backspace* untuk memperbaiki setiap kesalahan huruf yang Anda buat. Mendukung perhitungan metrik *Words Per Minute* (WPM) dan persentase akurasi.
* 🤖 **Mode Balapan (Vs Bot)**: Bosan bermain sendiri? Tantang Bot dengan 3 tingkat kesulitan (Mudah ~30WPM, Normal ~60WPM, Sulit ~90WPM) dalam balapan epik mencapai stasiun akhir.
* 💎 **Desain Antarmuka Glassmorphism**: Elemen UI berwujud panel kaca *blur* tembus pandang yang memberikan kesan modern dan *immersive*.

## 🚀 Instalasi & Cara Bermain

1. **Klon Repositori ini:**
   ```bash
   git clone https://github.com/oktavianrizalm/Commutype.git
   cd Commutype
   ```

2. **Instal Dependensi:**
   Pastikan Anda memiliki [Node.js](https://nodejs.org/) terinstal.
   ```bash
   npm install
   ```

3. **Jalankan *Development Server*:**
   ```bash
   npm run dev
   ```

4. **Buka di Browser:**
   Akses `http://localhost:5173/` di *browser* Anda dan bersiaplah untuk mengetik!

## 🛠️ Teknologi yang Digunakan
* **Frontend Framework**: SvelteKit / Svelte 5 (menggunakan *Runes* & *Reactive Stores*)
* **Styling**: Vanilla CSS (CSS Variables & Animasi Keyframe)
* **Peta Geografis**: Leaflet.js
* **Sumber Data Rute**: Data koordinat GeoJSON dan JSON stasiun komuter khusus yang diekstrak dan diotomatisasi melalui skrip generator (*Node.js*).

---

<div align="center">
  Dibuat dengan ❤️ untuk para komuter Jabodetabek. Selamat Mengetik!
</div>