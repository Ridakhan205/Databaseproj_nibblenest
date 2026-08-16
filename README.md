# 🍽️ NibbleNest — Restaurant Management System (RMS)

A full-stack, role-based **Restaurant Management System** built with **Spring Boot**, **Thymeleaf**, and **Microsoft SQL Server**. Designed to run an entire restaurant's digital operations — from the kitchen to the cashier counter to the customer's table — through dedicated dashboards for every role, backed by a real-time relational database.

> 🎓 Academic Project — 4th Semester (Software Engineering)

![Java](https://img.shields.io/badge/Java-17%2B-orange)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-brightgreen)
![SQL Server](https://img.shields.io/badge/Database-SQL%20Server-red)
![Maven](https://img.shields.io/badge/Build-Maven-blue)
![Status](https://img.shields.io/badge/Status-Active%20Development-yellow)

### 🎥 Demo Video
> **Coming Soon**

---

## 📑 Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Software Design & Architecture](#-software-design--architecture)
- [Project / Folder Structure](#-project--folder-structure)
- [Database](#-database)
- [Getting Started (How to Run)](#-getting-started-how-to-run)
- [Configuration](#-configuration)
- [File Uploads](#-file-uploads)
- [Author](#-author)

---

## 📖 About the Project

NibbleNest RMS is a **role-based, multi-dashboard restaurant management platform**. Instead of one generic interface, every type of user — Admin, Manager, Chef, Cashier, and Customer — gets a dedicated dashboard scoped to exactly what they need, with data flowing through a single, real-time SQL Server database. Server-rendered pages (Thymeleaf) are paired with dedicated JavaScript per dashboard for live, dynamic updates — so an order placed by a customer can reflect instantly in the kitchen and at the billing counter.

---

## ✨ Key Features

### 🛡️ Admin Dashboard
- Full system control — the "master" role
- Manage staff accounts (add/edit/remove Managers, Chefs, Cashiers)
- Full control and visibility over **every other dashboard**
- Manage menu items, categories, and pricing
- View system-wide reports, orders, and activity logs

### 🧑‍💼 Manager Dashboard
- Oversee daily restaurant operations
- Manage staff schedules and performance
- Monitor orders, inventory, and sales in real time
- Generate operational reports

### 👨‍🍳 Chef Dashboard
- Live, real-time incoming kitchen order queue
- Update order/preparation status (Pending → Preparing → Ready)
- View dish-specific order details

### 💵 Cashier Dashboard
- Handle billing and payment processing
- Generate and view receipts/invoices
- Real-time view of completed orders ready for checkout

### 🧑‍🍽️ Customer Portal
- Browse the digital menu (with dish images)
- Place orders and customize items
- Track live order status
- View order history

### 🔐 Security
- Role-based authentication & authorization via **Spring Security**
- Each role is restricted strictly to its own dashboard and permissions

### ⚡ Real-Time Data
- All actions (orders, status changes, billing) are persisted **live** to SQL Server via Spring Data JPA/Hibernate, keeping every dashboard in sync.

---

## 🧰 Tech Stack

| Layer            | Technology                                      |
|-------------------|-------------------------------------------------|
| Language          | Java                                             |
| Framework         | Spring Boot                                      |
| Web / MVC         | Spring MVC + Thymeleaf (server-side templates)   |
| Security          | Spring Security (role-based access control)      |
| Data Access       | Spring Data JPA (Hibernate)                       |
| Database          | Microsoft SQL Server (`mssql-jdbc`)               |
| JSON Handling     | Jackson (`jackson-databind`, `jackson-core`)      |
| Frontend          | HTML, CSS, Vanilla JS (per-dashboard scripts)     |
| Build Tool        | Maven                                             |
| IDE               | IntelliJ IDEA                                     |

---

## 🏗️ Software Design & Architecture

This project follows a clean **layered architecture** with clear separation of concerns:

```
Controller  →  Service  →  Repository  →  Entity (Database)
                 ↑
                DTO  (data transfer between layers / API)
```

**Patterns & Principles used:**

| Pattern / Principle       | Where it's used |
|----------------------------|------------------|
| **MVC (Model-View-Controller)** | Controllers ↔ Thymeleaf views ↔ Entities |
| **Layered Architecture**   | `controller` → `service` → `repository` → `entity` |
| **DTO Pattern**            | `dto/` package — decouples internal entities from data sent over the wire |
| **Repository Pattern**     | `repository/` — Spring Data JPA interfaces abstract DB access |
| **Dependency Injection / IoC** | Spring-managed beans throughout (`@Service`, `@Repository`, `@Controller`) |
| **Validator Pattern**      | `validator/` — centralized input validation logic |
| **Centralized Configuration** | `config/` — security config, app-wide beans/settings |
| **Utility Layer**          | `util/` — shared helper/utility classes |

---

## 📂 Project / Folder Structure

> ⚠️ **Note:** If you're browsing this repo's files individually (e.g., via direct file upload/download), the folders may appear **flattened or scattered** in a single list. The actual structure on disk — and how it should be reconstructed — is exactly as below.

```
restaurant_management_system/
│
├── .idea/                         # IntelliJ IDEA project settings
├── .mvn/                          # Maven wrapper
│
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/rmsproject/restaurant_management_system/
│   │   │       ├── config/                # Security & app-wide configuration
│   │   │       ├── controller/            # REST/MVC controllers (routes per role)
│   │   │       ├── dto/                   # Data Transfer Objects
│   │   │       ├── entity/                # JPA entities (DB tables)
│   │   │       ├── repository/            # Spring Data JPA repositories
│   │   │       ├── service/               # Business logic layer
│   │   │       ├── util/                  # Utility/helper classes
│   │   │       ├── validator/             # Input validation logic
│   │   │       └── RestaurantManagementSystemApplication.java   # Main entry point
│   │   │
│   │   └── resources/
│   │       ├── static/
│   │       │   ├── css/                   # Stylesheets
│   │       │   ├── js/
│   │       │   │   └── dashboards JS/      # Dashboard-specific JS (Admin, Chef, Cashier, etc.)
│   │       │   └── images/                # Static images/icons
│   │       ├── templates/                 # Thymeleaf HTML views
│   │       └── application.properties     # DB & app configuration
│   │
│   └── test/                      # Unit/integration tests
│
├── uploads/                        # Runtime file storage (outside src)
│   └── dishes/                     # Uploaded dish images
│
├── target/                         # Compiled build output
└── pom.xml                         # Maven dependencies
```

**Quick map — where things live:**

| You're looking for...        | Go to |
|-------------------------------|-------|
| Routes / endpoints             | `controller/` |
| Business logic                 | `service/` |
| Database queries                | `repository/` |
| Database table models           | `entity/` |
| Request/response shapes         | `dto/` |
| Security setup                  | `config/` |
| HTML pages                      | `resources/templates/` |
| Stylesheets                     | `resources/static/css/` |
| Dashboard JavaScript             | `resources/static/js/dashboards JS/` |
| Uploaded dish photos             | `uploads/dishes/` |

---

## 🗄️ Database

- **Engine:** Microsoft SQL Server
- **Connectivity:** `mssql-jdbc` driver via `spring.datasource.*` properties in `application.properties`
- **ORM:** Spring Data JPA + Hibernate — entities in `entity/` map directly to SQL Server tables
- **Behavior:** All CRUD operations (orders, menu, staff, billing) are committed **live** — changes made on one dashboard (e.g., a new order) are immediately reflected in the database and visible on connected dashboards (e.g., Chef's kitchen queue).

---

## 🚀 Getting Started (How to Run)

### ✅ Prerequisites
- Java JDK 17+
- Maven (or use the included Maven Wrapper `.mvn`)
- Microsoft SQL Server / SQL Server Express (with a named instance, e.g. `SQLEXPRESS01`)
- **SQL Server Management Studio (SSMS)** — to create the database and login
- IntelliJ IDEA (recommended — this project was built and run in IntelliJ)

### 🔧 Step-by-Step Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd restaurant_management_system
   ```

2. **Create the database and login** in SSMS:
   ```sql
   CREATE DATABASE rms_db;

   CREATE LOGIN rms_user WITH PASSWORD = 'YourStrongPassword';
   CREATE USER rms_user FOR LOGIN rms_user;
   ALTER ROLE db_owner ADD MEMBER rms_user;
   ```
   Make sure **SQL Server Authentication** (not just Windows Authentication) is enabled on the instance, and that **TCP/IP** is enabled via SQL Server Configuration Manager if connecting remotely.

3. **Configure `application.properties`** — see [Configuration](#-configuration) below with your own SQL Server credentials.

4. **Open in IntelliJ IDEA**
   - `File → Open` → select the project root folder
   - Let Maven auto-import all dependencies from `pom.xml`

5. **Run the application**
   - Locate `RestaurantManagementSystemApplication.java`
   - Use the pre-configured **Run/Debug Configuration** (Spring Boot application, e.g. `rmsApplication`) from the top toolbar dropdown
   - Click ▶️ **Run**

   Or via terminal:
   ```bash
   mvn clean install
   mvn spring-boot:run
   ```

6. **Open your browser**
   ```
   http://localhost:8080
   ```

---

## ⚙️ Configuration

`src/main/resources/application.properties`:

```properties
spring.application.name=restaurant_management_system

# Pagination (records per page across list views)
app.page-size=10

# SQL Server Database Connection (named instance, e.g. SQL Server Express)
spring.datasource.url=jdbc:sqlserver://localhost\\SQLEXPRESS01;databaseName=rms_db;encrypt=true;trustServerCertificate=true
spring.datasource.username=YOUR_DB_USERNAME
spring.datasource.password=YOUR_DB_PASSWORD
spring.datasource.driver-class-name=com.microsoft.sqlserver.jdbc.SQLServerDriver

# JPA / Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

# File Upload Limits (dish images, future media)
spring.servlet.multipart.max-file-size=50MB
spring.servlet.multipart.max-request-size=50MB

# Embedded Tomcat
server.tomcat.basedir=.
server.tomcat.accesslog.enabled=false
```

> 🔑 `YOUR_DB_USERNAME` / `YOUR_DB_PASSWORD` are placeholders here on purpose — never commit real database credentials to a public repo. Keep your actual `application.properties` out of version control (add it to `.gitignore`) or move secrets to environment variables.

**Notes on the setup above:**
- The datasource URL uses SQL Server's **named-instance format** (`localhost\SQLEXPRESS01`) rather than a plain host:port — this is how SQL Server Express typically registers itself. The backslash is escaped (`\\`) since it's inside a Java properties file.
- `app.page-size=10` drives pagination across list views (e.g. order history, menu items) so dashboards don't load the entire table at once.
- The multipart limits (50MB) exist because dish images — and eventually other media — are uploaded through the app itself, not just linked externally.
- `server.tomcat.accesslog.enabled=false` keeps the embedded Tomcat server quiet in logs during development.

### 📦 Core Dependencies (`pom.xml`)

| Dependency | Purpose |
|---|---|
| `spring-boot-starter-web` | REST/MVC web layer (also brings in Jackson for JSON, transitively) |
| `spring-boot-starter-thymeleaf` | Server-side HTML templating |
| `spring-boot-starter-data-jpa` | ORM / database access |
| `spring-boot-starter-security` | Authentication & role-based access |
| `mssql-jdbc` | SQL Server JDBC driver |
| `jackson-databind`, `jackson-core` | Explicit version pins for JSON (de)serialization — used whenever a controller returns JSON to dashboard JS via fetch/AJAX |
| `spring-boot-starter-test` | Testing framework |

---

## 🖼️ File Uploads

Dish images uploaded through the app (e.g., by Admin/Manager when adding menu items) are stored on disk at:

```
restaurant_management_system/uploads/dishes/
```

This folder lives **outside** `src`, at the project root, alongside `pom.xml` — so it persists independently of the build output.

---

## 👤 Author

Built as a 4th Semester full-stack academic project — combining backend engineering (Spring Boot, layered architecture, security, real-time SQL persistence) with a multi-role frontend experience.

---

⭐ If you found this project structure or approach helpful, consider giving it a star!
