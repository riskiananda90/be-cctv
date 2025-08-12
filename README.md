# CCTV Monitoring System - Banda Aceh Smart City

Sistem ini adalah aplikasi untuk memonitor CCTV yang terpasang di Kota Banda Aceh. Sistem ini menggunakan **Node.js** untuk backend, **MongoDB** untuk database, dan **HTML, CSS, dan JavaScript** untuk frontend. Aplikasi ini memberikan kemudahan untuk memantau status CCTV secara langsung dengan peta interaktif yang menunjukkan lokasi CCTV, serta memungkinkan pengguna untuk menambah, mengedit, atau menghapus data CCTV.

## Fitur
- **Peta Interaktif**: Menampilkan lokasi CCTV pada peta menggunakan Leaflet.
- **Status CCTV**: Menampilkan status CCTV, apakah online atau offline.
- **Login & Register**: Pengguna dapat login dan mendaftar untuk mengakses fitur tambahan.
- **CRUD CCTV**: Admin dapat menambah, mengedit, dan menghapus CCTV.
- **Streaming CCTV**: Menampilkan aliran langsung (live stream) dari CCTV yang online.

## Teknologi yang Digunakan
- **Backend**:
  - Node.js
  - MongoDB
- **Frontend**:
  - HTML
  - CSS
  - JavaScript
  - Leaflet.js (untuk peta interaktif)
- **API**:
  - RESTful API untuk manajemen data CCTV

## Prasyarat
Sebelum menjalankan aplikasi ini, pastikan Anda sudah menginstal:
1. [Node.js](https://nodejs.org/) (termasuk `npm` atau `yarn`)
2. [MongoDB](https://www.mongodb.com/try/download/community)

## Cara Menjalankan Aplikasi

### 1. Clone Repository
Clone repository ini ke mesin lokal Anda menggunakan perintah berikut:
```bash
git clone https://github.com/username/repository-name.git
cd repository-name```

### 2. Instalasi Dependencies
Setelah clone repository, instal dependensi yang diperlukan dengan menjalankan
```bash
npm-install``

### 3. Menjalankan Backend
Setelah konfigurasi selesai, jalankan server menggunakan perintah:
```bash
npm run dev

## 4. Menjalankan Frontend
Akses file public/index.html pada browser Anda. Anda bisa membuka file tersebut langsung di browser atau menggunakan server lokal (misalnya menggunakan live-server atau http-server).

## 4. Login
Login menggunakan akun yang telah terdaftar. Untuk admin, Anda bisa menambah CCTV melalui antarmuka peta.

## Penutup
Dengan sistem ini, Anda dapat dengan mudah memantau status CCTV yang terpasang di seluruh Kota Banda Aceh. Sistem ini juga menyediakan peta interaktif yang memudahkan dalam melihat lokasi setiap CCTV, serta memungkinkan admin untuk mengelola data CCTV secara langsung.

Jika Anda menemui masalah atau memiliki pertanyaan mengenai penggunaan atau pengembangan lebih lanjut, jangan ragu untuk membuka issue atau membuat pull request di GitHub repository ini.

Terima kasih telah menggunakan **CCTV Monitoring System - Banda Aceh Smart City**. Kami berharap sistem ini dapat membantu dalam meningkatkan keamanan dan manajemen kota.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

