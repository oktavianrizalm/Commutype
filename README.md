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

## 📜 Changelog

### v1.3.0 - Blind Test Mode & Accordion UI (Current)
* 🙈 **Mode Baru (Blind Test)**: Tantangan baru untuk mengetik rute KRL secara buta (tanpa petunjuk teks di layar) untuk menguji hafalan urutan stasiun para pengguna. Nama stasiun di peta disembunyikan dan baru akan terbuka perlahan seiring keberhasilan mengetik.
* 🗂️ **UI Accordion**: Perombakan menu pemilihan Mode Game (*Single Player*, *Lawan Bot*, *Blind Test*) menjadi tata letak *accordion* yang jauh lebih rapi, terorganisir, dan menghemat ruang dengan sentuhan animasi Svelte (*slide transition*) yang sangat halus.
* 💅 **UI Polish**: Penyempurnaan konsistensi desain tombol "Mulai", di mana setiap tombol dari seluruh mode permainan kini seragam menggunakan *border* biru ramping bergaya *outline* elegan.
* 🗺️ **Penyempurnaan Tooltip Peta**: Perbaikan posisi label teks nama stasiun (*tooltip*) pada peta Leaflet agar berada rapi di sisi kanan node (titik) stasiun untuk menghindari teks yang melayang.

### v1.2.0 - Mobile Optimization & UX Polish
* 📱 **Optimasi Layar Sentuh**: Perombakan tata letak CSS skala besar (melalui *media queries*) untuk memastikan game tampil sempurna, tidak terpotong, dan simetris di layar *smartphone* tipe apa pun.
* 📏 **Perbaikan Teks Panjang**: Kata yang panjang (seperti "Universitas Indonesia") kini otomatis turun ke baris baru (*word wrap*) tanpa memutus *box* kursor pengetikan.
* 🧹 **Pembersihan UI**: Menghapus teks instruksi stasiun tujuan yang redundan pada "Mode Stasiun" untuk menghemat ruang vertikal layar yang berharga.

### v1.1.0 - KBBI Mode & UI Polish
* 📖 **Fitur Baru**: Menambahkan "Mode Kata KBBI" dengan koleksi lebih dari 25.000 kata dasar acak untuk tantangan mengetik ekstra.
* ⚖️ **Penyesuaian Bot**: Memperlambat dan menyempurnakan kecepatan gerak Bot sesuai dengan metrik *Words Per Minute* (WPM) di tingkat Mudah, Normal, dan Sulit.
* 💅 **UI/UX**: Memperbaiki tata letak (alignment) elemen pengaturan pada Menu Utama (*Glassmorphism*) menjadi simetris dan mengganti *text-logo* dengan *image-logo* kustom berbentuk kapsul.

### v1.0.0 - Major Overhaul & Initial Release
* 🚀 **Perombakan Sistem**: Beralih sepenuhnya dari SVG ke **Peta Leaflet (CartoDB)** dengan fitur *Auto-Pan*.
* 🚄 **Rute Baru**: Penambahan fitur cabang "Lin Nambo".
* ⌨️ **Mekanik Monkeytype**: Implementasi fitur perbaikan *typo* wajib menggunakan tombol `Backspace`.
* 💎 **Desain Antarmuka**: Peluncuran desain layar penuh *Glassmorphism* dengan elemen kartu-kartu statis (menggantikan elemen dropdown).

<div align="center">
  Dibuat dengan ❤️ untuk para komuter Jabodetabek. Selamat Mengetik!
</div>