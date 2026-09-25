# 🚀 QuickCert

**QuickCert** is a modern, multi-tenant Business Document Generation and Verification Platform. It empowers organizations to dynamically generate, issue, and cryptographically verify official documents (such as certificates, inspection records, and employee letters) in bulk.

![QuickCert Dashboard](https://img.shields.io/badge/Status-Active_Development-success)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Prisma](https://img.shields.io/badge/Prisma-ORM-blue)

## ✨ Key Features

- 🏢 **Multi-Tenant Architecture:** Support for multiple organizations (schools, businesses, hospitals) with role-based access control.
- 📄 **Dynamic Data Schemas:** Create custom data models for your specific needs (e.g., "Student", "Employee", "Quality Record").
- 🎨 **Custom Document Templates:** Upload background images and precisely map data fields directly onto your documents.
- ⚡ **Bulk Import & Generation:** Import hundreds of records via Excel/CSV and generate pixel-perfect PDFs in seconds.
- 🔒 **Instant QR Verification:** Every document gets a unique QR code linking to a secure public verification page to instantly prove authenticity and prevent forgery.
- 📜 **Full Lifecycle Management:** Issue, revoke, and track version histories with an immutable audit log.

## 🛠️ Tech Stack

- **Frontend / Framework:** [Next.js](https://nextjs.org/) (React)
- **Styling:** Tailwind CSS
- **Database:** Prisma ORM 
- **PDF Engine:** `pdf-lib` for dynamic client/server-side PDF manipulation
- **Authentication:** Custom Role-Based Access Control (RBAC)

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js (v18+) and npm installed on your machine.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/rakesh-itnal/QuickCert_Project.git
   cd QuickCert_Project
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up the database:**
   Ensure your `.env` file is configured properly, then run:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open the app:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Quick Workflow Guide
1. **Create an Organization:** Set up your tenant workspace and business profile.
2. **Define a Schema:** Tell the system what data you want to collect (e.g. Name, Grade, Date).
3. **Upload a Template:** Add a blank certificate background and map your schema fields to X/Y coordinates.
4. **Import Data:** Upload a CSV/Excel file containing your raw records.
5. **Generate:** Hit generate to create verifiable PDF documents for every row of data instantly!

---
*Built with ❤️ to solve modern document management.*
