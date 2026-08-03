# Market Pro POS — نظام  بيع للسوبرماركت

<div align="center">

![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?style=flat-square&logo=dotnet)
![Angular](https://img.shields.io/badge/Angular-20-DD0031?style=flat-square&logo=angular)
![SQL Server](https://img.shields.io/badge/SQL_Server-2022-CC2927?style=flat-square&logo=microsoftsqlserver)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**A full-stack Point-of-Sale system for Arabic supermarkets, built with Clean Architecture.**

[Quick Start (Docker)](#-quick-start-docker) · [Local Setup](#-local-development) · [API Docs](#-api-endpoints) · [Architecture](#-architecture)

</div>

---

## 📋 Overview

Market Pro POS is a production-grade cashier system designed for the Arabic/Saudi retail market. It provides:

- A premium **RTL dark Arabic UI** for cashiers
- **ZATCA Phase-1** compliant e-invoicing (Saudi QR standard)
- Full **Clean Architecture** backend (.NET 10)
- **Docker Compose** one-command deployment

The POS module is fully functional end-to-end. Product management, inventory, customers, and reports have complete backend APIs — frontend UI screens are scaffolded and ready for extension.

---

## ✨ Features

### ✅ Fully Implemented

| Feature | Details |
|---|---|
| **Authentication** | JWT Bearer + BCrypt password hashing, role-based (Admin / Cashier) |
| **POS Terminal** | Product search by name / SKU / barcode, category filters, real-time stock badges |
| **Cart** | Add / remove / quantity adjust, per-item discount, global invoice discount |
| **Tax Calculation** | Per-product VAT rate (default 15%), automatic subtotal / tax / total / change |
| **Payment Methods** | Cash, Card, Credit (Deferred) |
| **Invoice Generation** | Sequential `INV-yyyyMMdd-####` numbering, server-side stock validation |
| **Inventory Movements** | Auto-deducts stock on sale, logs before/after quantities |
| **ZATCA QR Code** | Phase-1 TLV-encoded base64 (seller name, VAT no., timestamp, total, VAT) |
| **Thermal Receipt** | 58mm print-optimized, iframe-isolated printing, Arabic RTL layout |
| **Keyboard Shortcuts** | `F2` checkout · `F4` clear cart · `F8` focus search · `Esc` close receipt |
| **Products API** | Full CRUD with pagination, SKU uniqueness, low-stock filtering |
| **Inventory API** | Analytics, stock overview, movement history, restock, manual adjust |
| **Customers API** | CRUD with pagination, credit balance tracking |
| **Reports API** | Sales report, product sales, customer debt, inventory status |
| **Dashboard API** | Today's KPIs, 7-day chart, top products, low-stock alerts |
| **Soft Delete** | Global EF Core query filter on all entities (`IsDeleted`) |
| **Logging** | Serilog structured request logging with configurable sinks |
| **Error Handling** | Global exception middleware, stable JSON error envelope |
| **Docker** | Multi-stage builds, 3-service compose (SQL Server + API + Nginx) |
| **DB Seeder** | 50+ realistic Arabic products, categories, demo sales, admin/cashier users |

---

## 🛠️ Technology Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| ASP.NET Core | 10.0 | Web API framework |
| Entity Framework Core | 10.0 | ORM (Code-First) |
| SQL Server | 2022 | Database |
| Serilog | 8.0 | Structured logging |
| BCrypt.Net-Next | 4.0.3 | Password hashing |
| Swashbuckle | 6.8.1 | Swagger / OpenAPI |
| Microsoft.AspNetCore.Authentication.JwtBearer | 10.0 | JWT authentication |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Angular | 20 | SPA framework (standalone components) |
| Angular Signals | 20 | Reactive state management |
| SCSS | — | Premium dark RTL design system |
| qrcode | 1.5.4 | ZATCA QR rendering |
| Nginx | alpine | Production static server |

---

## 🏛️ Architecture

This project follows **Clean Architecture** with strict dependency inversion:

```
┌──────────────────────────────────────────────────────────────┐
│                        MarketPro.Api                         │
│          Controllers · Middleware · JWT · Swagger            │
└────────────────────────┬─────────────────────────────────────┘
                         │ depends on
┌────────────────────────▼─────────────────────────────────────┐
│                    MarketPro.Application                     │
│    Services · DTOs · Interfaces · Result<T> · Settings       │
└──────────┬─────────────────────────────────┬─────────────────┘
           │ depends on                      │ depends on
┌──────────▼──────────┐          ┌───────────▼──────────────────┐
│  MarketPro.Domain   │          │  MarketPro.Infrastructure    │
│  Entities · Enums   │          │  EF Core · DbContext · Seeder│
│  BaseEntity         │          │  Configurations              │
└─────────────────────┘          └──────────────────────────────┘
```

**Key design decisions:**
- `IAppDbContext` interface decouples Application from EF Core
- `Result<T>` / `PagedResult<T>` for consistent service-layer responses
- `AddApplication()` / `AddInfrastructure()` DI extension methods
- Global soft-delete filter via Expression Trees (zero per-query boilerplate)
- Product name snapshot in `SaleItem` preserves audit integrity
- ZATCA TLV QR built byte-by-byte per the Saudi e-invoicing specification

---

## 📁 Folder Structure

```
market-pro/
├── .env.example              ← Copy to .env and fill values
├── .gitignore
├── LICENSE
├── README.md
├── docker-compose.yml
├── install.sh                ← Linux/macOS quick install
├── install.bat               ← Windows quick install
│
├── backend/
│   ├── Dockerfile
│   ├── MarketPro.sln
│   └── src/
│       ├── MarketPro.Domain/          # Entities, Enums, BaseEntity
│       ├── MarketPro.Application/     # Services, DTOs, Interfaces
│       │   ├── Common/                # Result<T>, IAppDbContext, Settings
│       │   ├── Pos/                   # POS service + ZATCA QR
│       │   ├── Products/
│       │   ├── Inventory/
│       │   ├── Customers/
│       │   ├── Reports/
│       │   └── Dashboard/
│       ├── MarketPro.Infrastructure/  # EF Core, DbContext, Seeder
│       │   └── Persistence/
│       │       └── Configurations/    # Fluent entity config
│       └── MarketPro.Api/             # Controllers, Middleware
│           ├── Controllers/
│           ├── Middleware/
│           └── Properties/
│
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── angular.json
    ├── package.json
    └── src/app/
        ├── core/       # Auth service, interceptor, API clients, receipt, toast
        ├── layout/     # Shell + sidebar navigation
        └── features/
            ├── auth/       # Login page
            ├── pos/        # ★ POS terminal (complete)
            ├── dashboard/  # Scaffold (backend ready)
            ├── products/   # Scaffold (backend ready)
            ├── inventory/  # Scaffold (backend ready)
            ├── customers/  # Scaffold (backend ready)
            └── reports/    # Scaffold (backend ready)
```

---

## 🚀 Quick Start (Docker)

> **Requires:** Docker Desktop

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/market-pro-pos.git
cd market-pro-pos

# 2. Configure environment
cp .env.example .env
# Edit .env — set a strong SQL_SA_PASSWORD and JWT_SECRET_KEY

# 3. Start all services
docker compose up --build
```

| Service | URL |
|---|---|
| **Angular UI** | http://localhost:8081 |
| **API + Swagger** | http://localhost:5001/swagger |
| **SQL Server** | localhost,14333 (user: `sa`) |

---

## 💻 Local Development

### Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- SQL Server Express / LocalDB (included with Visual Studio)

### Quick Install

**Linux / macOS**
```bash
chmod +x install.sh
./install.sh
```

**Windows**
```bat
install.bat
```

### Running Manually

**Backend**
```bash
# Set secrets via User Secrets (recommended for development)
dotnet user-secrets set "Jwt:Key" "your-dev-secret-min-32-chars-here" \
  --project backend/src/MarketPro.Api/MarketPro.Api.csproj

dotnet run --project backend/src/MarketPro.Api/MarketPro.Api.csproj
# API: http://localhost:5001
# Swagger: http://localhost:5001/swagger
```

**Frontend**
```bash
cd frontend
npm install --legacy-peer-deps
npm start
# UI: http://localhost:4200
```

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and set the following:

| Variable | Description | Example |
|---|---|---|
| `SQL_SA_PASSWORD` | SQL Server SA password (strong, 8+ chars) | `MyStr0ng!Pass` |
| `JWT_SECRET_KEY` | JWT signing key (min 32 chars, random) | `openssl rand -base64 48` |

**For local development**, use [.NET User Secrets](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets) instead of `.env`:

```bash
dotnet user-secrets set "Jwt:Key" "YOUR_SECRET" \
  --project backend/src/MarketPro.Api/MarketPro.Api.csproj

dotnet user-secrets set "ConnectionStrings:Default" "YOUR_CONNECTION_STRING" \
  --project backend/src/MarketPro.Api/MarketPro.Api.csproj
```

> ⚠️ **Never commit `.env` or any file containing real secrets.**

---

## 👤 Demo Credentials

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Admin |
| `cashier` | `cashier123` | Cashier |

> These are seeded automatically on first run. Change them in production.

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | ❌ | Login and receive JWT |
| `GET` | `/api/store` | ❌ | Store branding info |
| `GET` | `/api/pos/categories` | ✅ | Categories with product count |
| `GET` | `/api/pos/products?q=&categoryId=` | ✅ | Search products |
| `GET` | `/api/pos/products/by-barcode/{code}` | ✅ | Lookup by barcode |
| `POST` | `/api/pos/sales` | ✅ | Create invoice + deduct stock |
| `GET` | `/api/products` | ✅ | Paginated product list |
| `POST` | `/api/products` | ✅ | Create product |
| `PUT` | `/api/products/{id}` | ✅ | Update product |
| `DELETE` | `/api/products/{id}` | ✅ | Soft-delete product |
| `GET` | `/api/inventory` | ✅ | Stock overview (paginated) |
| `POST` | `/api/inventory/restock` | ✅ | Add stock (purchase) |
| `POST` | `/api/inventory/adjust` | ✅ | Manual stock adjustment |
| `GET` | `/api/customers` | ✅ | Customer list (paginated) |
| `POST` | `/api/customers` | ✅ | Create customer |
| `GET` | `/api/reports/sales` | ✅ | Sales report (date range) |
| `GET` | `/api/reports/products` | ✅ | Product profitability report |
| `GET` | `/api/reports/customer-debt` | ✅ | Customer credit report |
| `GET` | `/api/reports/inventory` | ✅ | Inventory valuation report |
| `GET` | `/api/dashboard` | ✅ | KPIs + charts data |
| `GET` | `/health` | ❌ | Health check |

Full interactive documentation: **http://localhost:5001/swagger**

---

## 📝 Implementation Notes

- **Stock validation** is performed server-side before the invoice is confirmed.
- **Every sale** generates an `InventoryMovement` record (before/after quantities).
- **Invoice numbers** follow the pattern `INV-yyyyMMdd-####` (sequential per day).
- **Soft delete** is applied to all entities — no data is ever hard-deleted.
- **ZATCA QR** is a 5-tag TLV base64 string: seller name, VAT number, timestamp, total, VAT amount.
- **Product name snapshot** in `SaleItem` preserves receipt accuracy if a product is later renamed.
- **Currency** defaults to `ر.س` (SAR) — configurable via `Store` settings.

---

## 🔮 Future Improvements

- [ ] EF Core Migrations (replace `EnsureCreated`)
- [ ] Unit & integration tests (xUnit + Moq)
- [ ] Complete frontend UI for Products, Inventory, Customers, Reports
- [ ] Refresh token endpoint
- [ ] Rate limiting on `/api/auth/login`
- [ ] Role-based route guards (Admin-only pages)
- [ ] Export reports to PDF / Excel

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
