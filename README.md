# Smart QR Hub

> A modern, full-featured QR code management platform with generation, scanning, and user authentication capabilities.

---

## 📋 Project Overview

**Project Type:** Full Stack Web Application  
**Purpose:** Smart QR Hub is a comprehensive QR code management solution that allows users to generate various types of QR codes (WiFi credentials, payment links, contact cards, URLs) and scan existing QR codes through camera or image upload. The platform includes user authentication to maintain a personalized history of generated and scanned codes.

**Problem Statement:** Most QR code tools are fragmented—requiring separate apps for generation and scanning. Smart QR Hub consolidates these features into one seamless platform with persistent user data and advanced QR code types.

---

## 🛠️ Tech Stack

**Frontend:**
- React 
- Tailwind CSS
- Vite (Build Tool)
- Lucide React (Icons)

**Backend/Services:**
- Clerk Authentication (User Management)

**Core Libraries:**
- qrcode.react - QR code generation
- qr-scanner - QR code scanning
- jsqr - QR code decoding

---

## ✨ Key Features

- **Multi-Type QR Generation:** Create QR codes for URLs, WiFi passwords, vCards, payment links, WhatsApp messages, YouTube videos, and maps
- **Dual Scanning Modes:** Scan QR codes via live camera feed or uploaded images
- **User Authentication:** Secure login and signup system powered by Clerk
- **History Management:** Track previously generated and scanned QR codes
- **Responsive Design:** Mobile-first approach with Tailwind CSS
- **Fast Performance:** Optimized with Vite for instant hot module replacement

---

## 👤 User Roles

- **Guest Users:** Can generate and scan QR codes without authentication
- **Registered Users:** Access to personal dashboard, history tracking, and saved QR codes Manage users and monitor platform analytics

---

## 🏗️ Project Architecture
```
User Interface (React)
        ↓
   User Actions
   ├── Generate QR Code → qrcode.react Library → Display/Download
   ├── Scan QR Code → qr-scanner/jsqr → Decode & Display Result
   └── Authentication → Clerk Service → User Session Management
        ↓
   Local Storage (Browser)
   └── Store user preferences and history
```

**Flow:**
1. User interacts with React frontend
2. QR generation/scanning uses dedicated libraries
3. Clerk handles authentication and user sessions
4. Data persists in browser local storage
5. Static deployment on GitHub Pages

---

## 📸 Screenshots & Demo

**Live Demo:** https://smart-qr-hub.vercel.app/
**GitHub Repository:** https://github.com/Abhi930941/smart-qr-hub                                                                 
**Screenshots:**
<table>
  <tr>
    <td><img src="screenshots/Screenshot 2026-02-22 070308.png" alt="Home" /></td>
    <td><img src="screenshots/Screenshot 2026-02-22 071007.png" alt="QR code Generate Page" /></td>
    <td><img src="screenshots/Screenshot 2026-02-22 071240.png" alt="QR code Scan Page" /></td>
  </tr>
  <tr>
    <td align="center">Home</td>
    <td align="center">QR code Generate Page</td>
    <td align="center">QR code Scan Page</td>
  </tr>
</table>

---

## 💼 Why This Project Matters

This project provides an all-in-one QR solution with secure login, data saving, third-party integration, and real-world uses like payments, WiFi sharing, and digital business cards.

---

## 👨‍💻 Developer

**Developer:** Abhishek Sahani

**LinkedIn:** [linkedin.com/in/abhishek-sahani-447851341](https://www.linkedin.com/in/abhishek-sahani-447851341)

**Portfolio:** [abhi930941.github.io/Portfolio](https://abhi930941.github.io/Portfolio/)

**Email:** abhishek242443@gmail.com

