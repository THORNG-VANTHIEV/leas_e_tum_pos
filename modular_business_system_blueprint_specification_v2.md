# Modular Business System Blueprint — Version 2.0
## Corrected Architecture, Data Integrity & Implementation Specification

| Metadata | Specification |
|---|---|
| **Document Purpose** | Reusable architecture and implementation specification; examples are reference designs and must pass the acceptance gates below before production use |
| **Origin Reference** | Derived and generalized from `JERNG KRANN` (Standalone Invoice Re-entry System) |
| **Target Systems** | Transaction re-entry, POS reconciliation, billing & invoicing, clinical encounter recording, workshop job ticketing, warehouse transfer ledgers, back-office audit accounting |
| **Core Stack** | Laravel 13+ (Modular Monolith), Inertia.js 3+, React 19+, TypeScript, Tailwind CSS 4, shadcn/ui, MySQL 8+ |
| **Local / Test Database** | MySQL 8 authoritative; SQLite supported for zero-configuration testing and CI |
| **Financial Integrity** | Decimal-string input, integer-cents calculation, bounded `DECIMAL(12,2)` persistence; no float arithmetic in the domain layer |
| **Concurrency & Audit** | MySQL transactions and row locks, enforced optimistic version checks, atomic one-time approval consumption, append-only application audit events |

---

> **Version 2.0 status:** This is a corrected implementation specification, not proof that any implementation is production-ready. Code blocks are reference patterns and must be adapted, tested, and reviewed in the target repository. MySQL is authoritative for concurrency-sensitive behavior. SQLite is suitable for fast tests, but cannot prove MySQL locking semantics.

### V2.0 change log

- Made the financial calculation contract explicit: `grand_total = subtotal + tax_amount - discount_amount`; reconciliation compares the source total to the grand total.
- Removed floating-point values from the money-domain API and bounded calculations to the database precision.
- Added a foreign-key relationship from products to the units master table and defined period-level settings snapshots.
- Made approval validation, target/payload matching, locking, mutation, and consumption one atomic operation.
- Enforced purge-versus-void invariants inside domain actions, not only in controllers or UI.
- Reframed backup restore as a coordinated, recoverable database-and-files workflow; a SQL transaction alone cannot make filesystem changes atomic.
- Defined server-side authorization, concurrent-edit handling, print-event semantics, testing gates, and safer local deployment modes.
- Added explicit assumptions and acceptance tests to expose decisions that must be confirmed for each business domain.

### Normative language

The words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** indicate requirement strength. If examples and prose conflict, the normative requirements in this V2.0 document take precedence. Domain-specific requirements (for example, healthcare privacy, stock movement, taxation, or legal invoice rules) require an explicit domain extension before use.

### Contents

1. [Executive Overview & Design Philosophy](#1-executive-overview--design-philosophy)
2. [Production Rules and Non-Negotiable Invariants](#2-production-rules-and-non-negotiable-invariants)
3. [Domain Archetype & Concept Mapping](#3-domain-archetype--concept-mapping)
4. [Technology Stack & Design Decisions](#4-technology-stack--design-decisions)
5. [Directory Layout & Folder Structure](#5-directory-layout--folder-structure)
6. [Authoritative Database Schema Blueprint](#6-authoritative-database-schema-blueprint)
7. [Strict Financial & Mathematics Engine](#7-strict-financial--mathematics-engine)
8. [Deterministic Sequence Numbering & Period Lifecycle](#8-deterministic-sequence-numbering--period-lifecycle)
9. [Exception Governance & One-Time Approvals](#9-exception-governance--one-time-approvals)
10. [Deletion, Purge vs. Void Rules](#10-deletion-purge-vs-void-rules)
11. [Full-Data Backup and Recoverable Restore](#11-full-data-backup-and-recoverable-restore)
12. [Printing, Hardware Formats & Typography Engine](#12-printing-hardware-formats--typography-engine)
13. [Frontend Architecture & High-Speed Entry UX](#13-frontend-architecture--high-speed-entry-ux)
14. [Deployment Profiles, Portable Operation & Launchers](#14-deployment-profiles-portable-operation--launchers)
15. [Testing, Security Verification & Release Gates](#15-testing-security-verification--release-gates)
16. [Phased Implementation Roadmap](#16-phased-implementation-roadmap)
17. [AI Agent Prompt Templates](#17-ai-agent-prompt-templates)
18. [Definition of Done Checklist](#18-definition-of-done-checklist)
- [Appendix A. Explicit assumptions](#appendix-a-explicit-assumptions-requiring-confirmation-per-project)

---

## 1. Executive Overview & Design Philosophy

This document defines a reusable blueprint for building high-reliability business systems using the **Laravel + Inertia + React + TypeScript** modular monolith pattern. It is a design specification; production readiness is established only by passing the verification gates in Section 15 and the Definition of Done in Section 18.

Modern operational software (such as POS re-entry, clinical billing, workshop ticketing, or warehouse ledgers) often fails when implemented like generic CRUD apps. These systems require:
1. **Deterministic, gapless document numbering** within discrete accounting periods.
2. **Strict mathematical reconciliation** with physical source documents or legacy systems.
3. **Immutable historical records** unaffected by future price, product, or catalog changes.
4. **Governed exception handling** where edits, price overrides, voids, and period re-openings require expiring, single-use administrative approvals.
5. **Direct hardware printing** (thermal 80mm receipts and A5 invoices) with complex script rendering.
6. **Offline-capable and portable operation**, including local asset bundling, desktop launchers where appropriate, and a recoverable backup/restore procedure. A single SQL transaction cannot atomically commit both database rows and filesystem changes; restore therefore uses staging and compensating recovery.

This V2.0 specification generalizes the original reference application's architecture and implementation patterns. It is intended to help engineers and AI agents build similar systems in bounded, verifiable phases; it does not assert that every pattern has already been validated in the target project.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CORE SYSTEM ARCHITECTURE                        │
└────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────┐           ┌──────────────────────────────┐
  │   React 19 + TypeScript │           │    Administrative Console    │
  │   High-Speed Data Entry │           │    Approvals & Settings      │
  └────────────┬────────────┘           └──────────────┬───────────────┘
               │                                       │
               ▼                                       ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │             Inertia.js Protocol (Session Auth, Zero API)           │
  └────────────────────────────────┬───────────────────────────────────┘
                                   │
                                   ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │             Laravel 13 Feature-Sliced Modular Monolith             │
  │                                                                    │
  │  ┌───────────────┐  ┌───────────────┐  ┌────────────────────────┐  │
  │  │   Documents   │  │    Periods    │  │   One-Time Approvals   │  │
  │  │ (Draft/Final) │  │  (Batches)    │  │   (Single-use Guard)   │  │
  │  └───────┬───────┘  └───────┬───────┘  └───────────┬────────────┘  │
  │          │                  │                      │               │
  │  ┌───────┴───────┐  ┌───────┴───────┐  ┌───────────┴────────────┐  │
  │  │  Money Engine │  │ Master Catalog│  │   Polymorphic Audit    │  │
  │  │ (Integer Cent)│  │   & Units     │  │   (Full Snapshot JSON) │  │
  │  └───────────────┘  └───────────────┘  └────────────────────────┘  │
  └────────────────────────────────┬───────────────────────────────────┘
                                   │
                                   ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │         MySQL 8 Engine (Pessimistic Locks & Strict Types)          │
  └────────────────────────────────────────────────────────────────────┘
```

---

## 2. Production Rules and Non-Negotiable Invariants

These requirements apply regardless of UI behavior or controller implementation. Enforce them in domain actions/services and, where practical, at the database layer.

### 2.1 Document deletion and immutable history

- A **draft** may be hard-purged only if it has no official `sequence_no`, no `document_number`, no revision history, and no official print logs. The purge action MUST lock and re-check these conditions inside a transaction.
- Before purging, record an audit snapshot containing the document header, all line items, and relevant child records/identifiers. The audit write and purge MUST be in the same database transaction.
- A **finalized** document MUST NOT be deleted or have its official number reused. A void operation changes its status to `void`, preserves the number and history, records a mandatory reason, and applies the configured approval policy.
- Catalog records used historically SHOULD be inactivated instead of deleted. If a product is purged, historical document lines remain readable from copied snapshots and `product_id` may become null. Units and categories referenced by active products MUST NOT be deleted.
- Audit logs are append-only from the application's perspective. Normal application roles MUST NOT update or delete audit rows. Retention or archival is a separate, audited administrative procedure. This does not make logs tamper-proof against a database administrator or compromised database credentials; deployments requiring stronger assurance SHOULD use database permissions/triggers or an external append-only audit sink.

### 2.2 Source-total reconciliation

`business_settings.entry_settings.require_source_total` controls the policy captured when a period is activated. Store the relevant entry-control settings in `periods.entry_settings_snapshot`; later global setting changes MUST NOT silently change an already active period's rules.

- When reconciliation is required, the operator supplies a source total. The server recalculates the grand total and rejects saving/finalization if the source total differs from the calculated grand total. The saved `source_total_verified` is true only when an actual source total was checked and matched exactly.
- When reconciliation is disabled, the server sets `source_total = grand_total` and `source_total_verified = false`. This means “not independently verified,” not “verified at zero variance.”
- Finalization MUST re-check totals from persisted data, regardless of client validation. If the period snapshot requires source verification, unverified documents block finalization.
- `source_total`, `subtotal`, `tax_amount`, `discount_amount`, and `grand_total` are stored as decimal database values but computed as integer cents.

### 2.3 Measurement units are normalized

- `products.unit_id` MUST reference `units.id`; never accept arbitrary free-text units as the product's authoritative unit.
- A document line copies the unit label into `unit_snapshot` when entered. Historical labels must not change if a unit is renamed or inactivated.
- A unit referenced by products or historical records SHOULD be inactivated rather than hard-deleted.

### 2.4 Coordinated backup and recovery

- The ZIP manifest includes a format version, application/schema version, generated timestamp, explicit table allowlist, per-table row counts, per-file sizes and checksums, and a total archive inventory.
- The archive includes all required business tables and all referenced durable assets. Framework tables are included only according to an explicit policy; authentication sessions and transient caches SHOULD be cleared, not restored.
- Validate archive paths, contents, checksums, supported schema version, sizes, row structure, allowed table names, and foreign-key relationships before touching live data. Never trust ZIP entry paths.
- Stage and verify assets before restoring. Preserve a pre-restore recovery point. Restore database rows in an explicit dependency order, with children deleted before parents and parents inserted before children.
- A SQL transaction protects database operations only. The combined database/files workflow MUST use a journaled staged process and a documented compensating recovery path if either side fails. The UI MUST NOT claim success until database and assets are verified.
- Test recovery from interrupted restore, invalid archives, disk-full errors, missing files, and database constraint failures.

### 2.5 Deterministic document numbering

- Provisional order is editable only while a period is in `active` or `review` status as permitted by role policy; official numbers are assigned only inside the finalization transaction.
- Lock the period row before allocating numbers, then lock eligible documents and sort by `business_date`, `event_time`, `provisional_order`, and `id`.
- The sequence must be contiguous within the period's assigned range. A voided issued document retains its sequence permanently; a sequence that was officially issued MUST NOT be reused.
- Enforce both `UNIQUE(period_id, sequence_no)` and globally unique `document_number`.
- The finalization action re-checks period status, document state, reconciliation policy, lock versions, and whether any eligible document already has an official number. All changes roll back together on failure.

### 2.6 Approvals must be atomically consumed

An approved exception is a short-lived, single-use authorization bound to an exact request type, target, and approved payload. Validation, protected mutation, and marking the approval as used MUST happen in one transaction while the approval and target rows are locked. Missing expiry, expired approval, mismatched target/payload, rejected/pending request, or already-used request MUST fail closed.

### 2.7 Server is authoritative

React may calculate previews for responsiveness, but MUST NOT be trusted for prices, totals, roles, target IDs, reconciliation status, or permissions. Resolve product prices and business policy on the server; recalculate every derived financial value on every mutation. Hide actions in the UI for usability, but enforce access with policies and query scoping on the server.

---

## 3. Domain Archetype & Concept Mapping

To build a new application using this blueprint, replace domain nouns while keeping 100% of the underlying engine:

| Core Engine Concept | Buffet Re-entry (Reference App) | Clinical Encounter System | Workshop Job System | Warehouse Transfer Ledger |
|---|---|---|---|---|
| **Batch / Container** | `Period` (P01, P02) | `ClinicSession` (CS-2026-08) | `ShiftBatch` (SH-MORN-01) | `TransferRun` (TR-202608) |
| **Transaction Header** | `Invoice` | `PatientEncounter` | `WorkOrder` | `TransferManifest` |
| **Line Item** | `InvoiceItem` | `TreatmentItem` | `ServiceOrPartItem` | `ManifestItem` |
| **Master Item** | `Product` | `MedicalService / Drug` | `Service / SparePart` | `SKU / InventoryItem` |
| **Master Category** | `ProductCategory` | `ServiceDepartment` | `JobCategory` | `CommodityClass` |
| **Measurement Unit** | `Unit` (`person`, `can`) | `Unit` (`visit`, `vial`) | `Unit` (`hour`, `set`) | `Unit` (`carton`, `kg`) |
| **Source Reference** | `source_total` (Old POS) | `triage_slip_total` | `manual_estimate_total` | `dispatch_slip_total` |
| **Official Number** | `INV-P01-0001` | `ENC-202608-0001` | `WO-MORN-0001` | `TR-202608-0001` |
| **Exception Approvals** | Price override, void, edit | Fee waiver, void visit | Discount override, void | Quantity discrepancy override |

---

## 4. Technology Stack & Design Decisions

### 4.1 Confirmed Stack Decisions

| Component | Standard Choice | Justification |
|---|---|---|
| **Backend Framework** | Laravel 13+ | Full-featured robust ORM, transactional migrations, robust session security, FormRequests, and Policies. |
| **Architecture** | Feature-Sliced Modular Monolith | Co-locates Actions, Requests, Services, and ViewModels by business domain under `app/Features/`. |
| **Frontend Protocol** | Inertia.js 3+ | Eliminates client-side state duplication, API token management, and redundant serialization layers. Server routes remain authoritative. |
| **Frontend Framework** | React 19+ & TypeScript | Strict type safety, clean component hierarchy, fast UI rendering with zero client-side routing overhead. |
| **Styling & Components** | Tailwind CSS 4 & shadcn/ui | Clean, tokenized utility styling with accessible, headless UI primitives. |
| **Primary Database** | MySQL 8+ (InnoDB) | Authoritative for transactions, unique constraints, and row-locking behavior. Pin and test the exact supported minor version. |
| **Fast Test Database** | SQLite (in-memory or file) | Useful for quick unit/feature tests, but not a substitute for MySQL concurrency and integration tests. |
| **Money Handling** | Integer Cents Engine | Decimal strings at boundaries; integer cents for arithmetic; persist as `DECIMAL(12,2)`; reject out-of-range results. |
| **Audit Strategy** | Append-Only Polymorphic Log | Records actor, action, target, snapshots, reason, request/correlation ID, and relevant metadata; avoid logging secrets or unnecessary personal data. |
| **Printing Strategy** | Dual Engine (CSS & Headless) | Browser `@media print` for direct thermal/A5 hardware printing + headless PDF generation for archival export. |

---

## 5. Directory Layout & Folder Structure

```text
├── app/
│   ├── Concerns/                      # Reusable traits (HasUuid, OptimisticLocking)
│   ├── Enums/                         # Backed string enums for all domain states
│   │   ├── ApprovalStatus.php         # pending, approved, rejected, expired, used
│   │   ├── ApprovalType.php           # edit_finalized, price_override, void, reopen_period
│   │   ├── DocumentStatus.php         # draft, review, finalized, void
│   │   ├── PeriodStatus.php           # draft, active, review, closed
│   │   └── UserRole.php               # admin, cashier, supervisor
│   ├── Features/                      # Domain features (vertical slices)
│   │   ├── Approvals/                 # One-time exception authorization
│   │   │   ├── Http/Controllers/
│   │   │   ├── Http/Requests/
│   │   │   └── Services/              # ApprovalPermission, TargetGuard
│   │   ├── Backups/                   # ZIP export and recoverable restore
│   │   │   ├── Actions/               # CreateBackup, RestoreBackup
│   │   │   ├── DTOs/
│   │   │   ├── Http/
│   │   │   └── Services/              # BackupArchiveReader, ManifestValidator
│   │   ├── Catalog/                   # Categories, items, and units
│   │   ├── Documents/                 # Primary business entity (Invoices / Orders)
│   │   │   ├── Actions/               # CreateDraft, UpdateDocument, VoidDocument, PurgeDocument
│   │   │   ├── Http/Controllers/
│   │   │   ├── Http/Requests/
│   │   │   ├── Rules/
│   │   │   └── Services/              # Calculator, Formatter, SequencePlanner, PrintRecorder
│   │   ├── Periods/                   # Accounting periods & batch controls
│   │   │   ├── Actions/               # FinalizePeriod, ReopenPeriod
│   │   │   ├── Http/
│   │   │   └── Services/
│   │   ├── Reports/                   # Operational and financial exports
│   │   └── Users/                     # User management and archival
│   ├── Http/
│   │   ├── Controllers/               # Shared root controllers (Dashboard, Auth)
│   │   └── Middleware/                # ActiveUserCheck, RoleGuard
│   ├── Models/                        # Eloquent models (lightweight, relationship-focused)
│   ├── Policies/                      # Authorization policies (view, create, update, void)
│   └── Support/                       # Cross-cutting infrastructure
│       ├── Audit/                     # AuditService (centralized snapshot logger)
│       ├── Money/                     # Money utility class (decimal strings and integer cents only)
│       └── Printing/                  # Print formats and typography handlers
│
├── database/
│   ├── migrations/                    # Strict typed migrations with indexes
│   └── seeders/                       # Deterministic baseline & demo data seeders
│
├── resources/js/
│   ├── actions/                       # Inertia helper utilities
│   ├── components/
│   │   ├── app/                       # Application navigation, topbar, status pills
│   │   ├── forms/                     # Accessible inputs, select pickers, buttons
│   │   ├── money/                     # Formatted currency display component
│   │   ├── tables/                    # Data tables with sorting and pagination
│   │   └── ui/                        # shadcn/ui components (Dialog, Dropdown, Card, Toast)
│   ├── features/                      # Complex feature widgets
│   │   ├── approvals/                 # Approvals inbox card & decision dialog
│   │   ├── documents/                 # Rapid keypad data entry grid & preview
│   │   └── reports/                   # Filter panel and export buttons
│   ├── hooks/                         # useKeyboardShortcuts, useDebounce, useCurrency
│   ├── layouts/
│   │   ├── app-layout.tsx             # Main authenticated shell with sidebar
│   │   ├── auth-layout.tsx            # Login screen container
│   │   └── print-layout.tsx           # Clean, navigation-free CSS print canvas
│   ├── lib/                           # Formatting, permissions check, date utilities
│   ├── pages/                         # Inertia page views
│   │   ├── auth/                      # Login.tsx
│   │   ├── dashboard.tsx              # Role-aware statistics & operational status
│   │   ├── documents/                 # Index.tsx, Create.tsx, Show.tsx
│   │   ├── periods/                   # Index.tsx, Review.tsx
│   │   ├── approvals/                 # Index.tsx (Admin approval queue)
│   │   ├── reports/                   # Index.tsx, PeriodSummary.tsx
│   │   └── settings/                  # System, Catalog, Units, Printing, Backup tabs
│   └── types/                         # TypeScript interfaces matching backend models & props
│
├── routes/
│   └── web.php                        # Session-authenticated web routes (No REST API)
│
└── scripts/
    ├── launcher/
    │   └── preflight.php              # Zero-dependency environment & port validator
    ├── browser-smoke.mjs              # Headless Chrome integration smoke test
    ├── Start JERNG KRANN.command      # macOS desktop double-click launcher
    └── Start JERNG KRANN.bat          # Windows desktop double-click launcher
```

---

## 6. Authoritative Database Schema Blueprint

### 6.1 System Settings & Locations

```sql
-- Authentication table for the single-business / multi-location deployment model.
-- If using a different Laravel authentication schema, adapt model/provider names consistently.
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(180) NOT NULL,
    username VARCHAR(80) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,                 -- Laravel password hash only
    role VARCHAR(30) NOT NULL,                      -- admin, cashier, supervisor
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    archived_at TIMESTAMP NULL,
    archived_reason TEXT NULL,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX users_active_role (is_active, role)
);

CREATE TABLE business_settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    business_name_primary VARCHAR(180) NOT NULL,
    business_name_secondary VARCHAR(180) NULL,
    address_primary TEXT NULL,
    address_secondary TEXT NULL,
    phone VARCHAR(40) NULL,
    logo_path VARCHAR(500) NULL,
    tax_identifier VARCHAR(40) NULL,          -- e.g. VAT TIN, displayed for identity only
    currency_code CHAR(3) NOT NULL DEFAULT 'USD',
    currency_symbol VARCHAR(5) NOT NULL DEFAULT '$',
    decimal_places TINYINT UNSIGNED NOT NULL DEFAULT 2,
    timezone VARCHAR(60) NOT NULL DEFAULT 'Asia/Phnom_Penh',
    document_language VARCHAR(20) NOT NULL DEFAULT 'bilingual',
    document_footer TEXT NULL,
    print_settings JSON NULL,                  -- Output layout, receipt header/footer toggles
    entry_settings JSON NULL,                  -- Data entry controls: require_source_total, time_entry
    font_settings JSON NULL,                   -- Bundled font families per script
    approval_expiry_minutes INT UNSIGNED NOT NULL DEFAULT 30,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);

CREATE TABLE locations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name_primary VARCHAR(150) NOT NULL,
    name_secondary VARCHAR(150) NULL,
    address TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Users may be assigned to one or several locations. Policies must enforce this mapping.
CREATE TABLE user_locations (
    user_id BIGINT UNSIGNED NOT NULL,
    location_id BIGINT UNSIGNED NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NULL,
    PRIMARY KEY (user_id, location_id),
    INDEX user_locations_location (location_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT
);
```

### 6.2 Catalog, Measurement Units & Batch Periods

```sql
CREATE TABLE units (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    name_primary VARCHAR(150) NOT NULL,
    name_secondary VARCHAR(150) NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);

CREATE TABLE product_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    name_primary VARCHAR(150) NOT NULL,
    name_secondary VARCHAR(150) NULL,
    category_type VARCHAR(30) NOT NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);

CREATE TABLE products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT UNSIGNED NOT NULL,
    sku VARCHAR(60) NULL UNIQUE,
    name_primary VARCHAR(180) NOT NULL,
    name_secondary VARCHAR(180) NULL,
    unit_id BIGINT UNSIGNED NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    is_primary_package BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX products_category_active (category_id, is_active),
    FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE periods (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    location_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    document_prefix VARCHAR(20) NOT NULL DEFAULT 'INV',
    starting_sequence INT UNSIGNED NOT NULL DEFAULT 1,
    last_sequence_no INT UNSIGNED NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, active, review, closed
    revision INT UNSIGNED NOT NULL DEFAULT 1,
    entry_settings_snapshot JSON NULL,                -- immutable policy snapshot at activation
    print_settings_snapshot JSON NULL,                -- immutable print policy snapshot at activation
    created_by BIGINT UNSIGNED NOT NULL,
    activated_by BIGINT UNSIGNED NULL,
    activated_at TIMESTAMP NULL,
    closed_by BIGINT UNSIGNED NULL,
    closed_at TIMESTAMP NULL,
    reopen_reason TEXT NULL,
    lock_version INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX periods_location_status (location_id, status),
    INDEX periods_dates (start_date, end_date),
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (activated_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE SET NULL
);
```

### 6.3 Document Header & Immutable Line Item Snapshots

```sql
CREATE TABLE documents (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    period_id BIGINT UNSIGNED NOT NULL,
    provisional_order INT UNSIGNED NOT NULL,       -- Stable order during draft entry
    sequence_no INT UNSIGNED NULL,                 -- Assigned ONLY upon period finalization
    document_number VARCHAR(60) NULL UNIQUE,       -- Formatted e.g. INV-P01-0001
    business_date DATE NOT NULL,
    event_time TIME NOT NULL,
    reference_identifier VARCHAR(30) NULL,         -- Table #, Room #, Work-Bay #
    unit_count INT UNSIGNED NOT NULL DEFAULT 0,    -- Guests, Patients, Units
    source_total DECIMAL(12,2) NOT NULL,
    source_total_verified BOOLEAN NOT NULL DEFAULT FALSE,
    subtotal DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    grand_total DECIMAL(12,2) NOT NULL,
    amount_received DECIMAL(12,2) NOT NULL,
    change_amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'cash',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',   -- draft, review, finalized, void
    note TEXT NULL,
    print_settings_snapshot JSON NULL,
    entry_settings_snapshot JSON NULL,                -- effective controls used for this document
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NOT NULL,
    finalized_by BIGINT UNSIGNED NULL,
    finalized_at TIMESTAMP NULL,
    lock_version INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    UNIQUE KEY uq_period_sequence (period_id, sequence_no),
    INDEX idx_period_status_date (period_id, status, business_date),
    INDEX idx_created_by_date (created_by, created_at),
    FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (finalized_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE document_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NULL,               -- Can be null if catalog item is later purged
    line_position INT UNSIGNED NOT NULL,
    category_type_snapshot VARCHAR(30) NOT NULL,
    product_name_primary_snapshot VARCHAR(180) NOT NULL,
    product_name_secondary_snapshot VARCHAR(180) NULL,
    unit_snapshot VARCHAR(40) NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    master_price_at_entry DECIMAL(12,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    line_total DECIMAL(12,2) NOT NULL,
    is_primary_package_snapshot BOOLEAN NOT NULL DEFAULT FALSE,
    is_price_override BOOLEAN NOT NULL DEFAULT FALSE,
    override_reason TEXT NULL,
    override_approved_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    UNIQUE KEY uq_document_line (document_id, line_position),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (override_approved_by) REFERENCES users(id) ON DELETE SET NULL
);
```

### 6.4 Approvals, Revisions, Audit & Print Logs

```sql
CREATE TABLE approval_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT UNSIGNED NULL,
    request_type VARCHAR(30) NOT NULL,             -- edit_finalized, price_override, void, reopen_period
    target_type VARCHAR(40) NOT NULL,              -- document, document_item, period
    target_id BIGINT UNSIGNED NOT NULL,
    requested_by BIGINT UNSIGNED NOT NULL,
    reason TEXT NOT NULL,
    requested_changes JSON NULL,                   -- e.g. {"requested_price": "12.50"}
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, expired, used
    reviewed_by BIGINT UNSIGNED NULL,
    review_note TEXT NULL,
    reviewed_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    used_at TIMESTAMP NULL,
    used_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_status_type_created (status, request_type, created_at),
    INDEX idx_target (target_type, target_id),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Add after approval_requests exists so the item can retain a link to the exact consumed exception.
ALTER TABLE document_items
    ADD COLUMN override_approval_request_id BIGINT UNSIGNED NULL,
    ADD CONSTRAINT fk_document_item_override_approval
        FOREIGN KEY (override_approval_request_id) REFERENCES approval_requests(id) ON DELETE SET NULL;

CREATE TABLE document_revisions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT UNSIGNED NOT NULL,
    revision_no INT UNSIGNED NOT NULL,
    approval_request_id BIGINT UNSIGNED NULL,
    before_payload JSON NOT NULL,
    after_payload JSON NOT NULL,
    reason TEXT NOT NULL,
    changed_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_document_revision (document_id, revision_no),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE RESTRICT,
    FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id) ON DELETE SET NULL,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    actor_id BIGINT UNSIGNED NULL,
    action VARCHAR(100) NOT NULL,
    auditable_type VARCHAR(100) NOT NULL,
    auditable_id BIGINT UNSIGNED NOT NULL,
    request_id CHAR(36) NULL,                      -- request/correlation identifier
    reason TEXT NULL,                              -- populated for governed exceptions
    old_values JSON NULL,
    new_values JSON NULL,
    metadata JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_action (action),
    INDEX idx_auditable (auditable_type, auditable_id),
    INDEX idx_audit_request (request_id),
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE print_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT UNSIGNED NOT NULL,
    format VARCHAR(20) NOT NULL,                   -- 80mm, a5, pdf
    print_type VARCHAR(20) NOT NULL,               -- original, reprint
    request_id CHAR(36) NOT NULL UNIQUE,           -- UUID idempotency key for this print action
    requested_by BIGINT UNSIGNED NOT NULL,         -- requester, not proof of physical output
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    document_checksum VARCHAR(64) NULL,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE RESTRICT,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE report_exports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    period_id BIGINT UNSIGNED NULL,
    report_type VARCHAR(60) NOT NULL,
    format VARCHAR(20) NOT NULL,                   -- pdf, excel
    filters JSON NOT NULL,
    version INT UNSIGNED NOT NULL DEFAULT 1,
    is_superseded BOOLEAN NOT NULL DEFAULT FALSE,
    file_path VARCHAR(500) NOT NULL,
    exported_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE SET NULL,
    FOREIGN KEY (exported_by) REFERENCES users(id) ON DELETE RESTRICT
);
```

The baseline assumes one `business_settings` row for a single business with multiple locations. Enforce singleton access in a settings service (or model it with an explicit tenant/business key if multiple businesses are required). Never infer multi-tenant isolation from `locations` alone. Non-admin users must be assigned to one or more locations through `user_locations`; `UserPolicy`/query scopes must verify that the user's permitted location set contains the target period's `location_id`.

> **Schema completeness requirements:** Include every additional framework table enabled by the chosen Laravel configuration (for example, database sessions, password-reset tokens, jobs, and failed jobs) in migrations. Document backup policy for each. Session and transient queue/cache records should normally be cleared during restore rather than revived. Configure `users.username` authentication explicitly if the default Laravel scaffold expects email. Add database constraints where supported, but always enforce domain invariants in application actions too.

### 6.5 Complete Route Specifications & Middleware Matrix

The baseline application communicates over HTTP session-authenticated Inertia routes. No public REST API or token mechanism is exposed. Standard web security still applies: CSRF protection, authorization policies, throttling, output escaping, and secure session configuration are mandatory.

| HTTP Verb | Path | Middleware | Controller & Method | Route Name | Purpose |
|---|---|---|---|---|---|
| `GET` | `/` | None | `Redirect` | `home` | Redirects guest to `/login`, authenticated to `/dashboard` |
| `GET` | `/login` | `guest` | `AuthenticatedSessionController@create` | `login` | Renders Login screen |
| `POST` | `/login` | `guest`, `throttle:5,1` | `AuthenticatedSessionController@store` | `login.store` | Authenticates session with active status check |
| `POST` | `/logout` | `auth` | `AuthenticatedSessionController@destroy` | `logout` | Invalidates session and CSRF token |
| `GET` | `/dashboard` | `auth`, `active` | `DashboardController@__invoke` | `dashboard` | Renders role-aware operational dashboard |
| `GET` | `/invoices` | `auth`, `active` | `InvoiceController@index` | `invoices.index` | Filtered, searchable, paginated document list |
| `GET` | `/invoices/create` | `auth`, `active` | `InvoiceController@create` | `invoices.create` | High-speed keyboard data entry screen |
| `POST` | `/invoices` | `auth`, `active` | `InvoiceController@store` | `invoices.store` | Validates, calculates and stores draft document |
| `GET` | `/invoices/print-range/preview` | `auth`, `active` | `InvoicePrintController@previewRange` | `invoices.print-range.preview` | Preview range of contiguous printed documents |
| `GET` | `/invoices/print-range` | `auth`, `active` | `InvoicePrintController@printRange` | `invoices.print-range` | Read-only print-ready range view; no logging side effect |
| `POST` | `/invoices/print-range/print-requests` | `auth`, `active`, `throttle:print` | `PrintRequestController@storeRange` | `invoices.print-range.requests` | Records idempotent print-request events for authorized range |
| `GET` | `/invoices/{invoice}` | `auth`, `active` | `InvoiceController@show` | `invoices.show` | Document details, line items & revision history |
| `GET` | `/invoices/{invoice}/edit` | `auth`, `active` | `InvoiceController@edit` | `invoices.edit` | Edit screen (drafts direct; finalized requires approval) |
| `PATCH` | `/invoices/{invoice}` | `auth`, `active` | `InvoiceController@update` | `invoices.update` | Saves edits, creates revision diff in JSON |
| `DELETE` | `/invoices/{invoice}` | `auth`, `active` | `InvoiceController@destroy` | `invoices.destroy` | Hard purges draft document and logs full snapshot |
| `POST` | `/invoices/{invoice}/submit-review`| `auth`, `active` | `InvoiceController@submitReview` | `invoices.submit-review` | Marks draft ready for period review |
| `POST` | `/invoices/{invoice}/request-edit` | `auth`, `active`, `throttle:20,1` | `InvoiceController@requestEdit` | `invoices.request-edit` | Submits approval request to edit finalized document |
| `POST` | `/invoices/{invoice}/request-void` | `auth`, `active`, `throttle:20,1` | `InvoiceController@requestVoid` | `invoices.request-void` | Submits approval request to void finalized document |
| `POST` | `/invoices/{invoice}/void` | `auth`, `active`, `throttle:20,1` | `InvoiceController@void` | `invoices.void` | Voids a finalized document after approval consumption or an explicitly enabled, audited admin bypass |
| `POST` | `/invoices/{invoice}/items/{item}/request-price-override` | `auth`, `active`, `throttle:20,1` | `InvoiceController@requestPriceOverride` | `invoice-items.request-price-override` | Requests one-time item price override |
| `GET` | `/invoices/{invoice}/preview/80mm` | `auth`, `active` | `InvoicePrintController@previewThermal`| `invoices.preview.thermal`| Renders 80mm thermal receipt in browser |
| `GET` | `/invoices/{invoice}/preview/a5` | `auth`, `active` | `InvoicePrintController@previewA5` | `invoices.preview.a5` | Renders A5 commercial invoice in browser |
| `GET` | `/invoices/{invoice}/print/80mm` | `auth`, `active` | `InvoicePrintController@thermal` | `invoices.print.thermal` | Read-only thermal print-ready view; no logging side effect |
| `GET` | `/invoices/{invoice}/print/a5` | `auth`, `active` | `InvoicePrintController@a5` | `invoices.print.a5` | Read-only A5 print-ready view; no logging side effect |
| `GET` | `/invoices/{invoice}/pdf` | `auth`, `active` | `InvoicePrintController@pdf` | `invoices.pdf` | Streams downloadable A5 PDF document |
| `POST` | `/invoices/{invoice}/print-requests` | `auth`, `active`, `throttle:print` | `PrintRequestController@store` | `invoices.print-requests.store` | Records an authorized, idempotent print request; does not guarantee physical output |
| `GET` | `/reports` | `auth`, `active`, `can:view-reports` | `ReportController@index` | `reports.index` | Main operational reports panel |
| `GET` | `/reports/periods/{period}` | `auth`, `active`, `can:view-reports` | `ReportController@period` | `reports.period` | Period register report with cashier breakdown |
| `POST` | `/reports/export/pdf` | `auth`, `active`, `can:export-reports`| `ReportController@exportPdf`| `reports.export.pdf` | Generates official PDF report register |
| `POST` | `/reports/export/excel` | `auth`, `active`, `can:export-reports`| `ReportController@exportExcel`| `reports.export.excel` | Generates multi-sheet XLSX workbook |
| `GET` | `/my-approval-requests` | `auth`, `active` | `ApprovalRequestController@mine` | `approval-requests.mine` | Lists only the current user’s own submitted requests |
| `GET` | `/approvals` | `auth`, `active`, `role:admin` | `ApprovalController@index` | `approvals.index` | Admin inbox for pending exception approvals |
| `POST` | `/approvals/{approval}/approve` | `auth`, `active`, `role:admin`, `throttle:20,1` | `ApprovalController@approve` | `approvals.approve` | Approves request, sets expiration timestamp |
| `POST` | `/approvals/{approval}/reject` | `auth`, `active`, `role:admin`, `throttle:20,1` | `ApprovalController@reject` | `approvals.reject` | Rejects request with administrative note |
| `GET` | `/settings` | `auth`, `active`, `role:admin` | `SettingsController@index` | `settings.index` | Admin master control panel |
| `POST` | `/settings/backup` | `auth`, `active`, `role:admin`, `throttle:backup-download` | `BackupController@__invoke` | `settings.backup.download` | Generates and downloads password-confirmed ZIP |
| `POST` | `/settings/backup/inspect`| `auth`, `active`, `role:admin`, `throttle:backup-inspect`| `BackupRestoreController@inspect`| `settings.backup.inspect`| Inspects ZIP manifest before restore |
| `POST` | `/settings/backup/restore`| `auth`, `active`, `role:admin`, `throttle:backup-restore`| `BackupRestoreController@restore`| `settings.backup.restore`| Executes staged, journaled, verified restore with a recovery point |
| `PATCH`| `/settings/business` | `auth`, `active`, `role:admin` | `SettingsController@updateBusiness` | `settings.business.update` | Updates business name, address, VAT TIN, logo |
| `PATCH`| `/settings/entry-controls`| `auth`, `active`, `role:admin` | `SettingsController@updateEntryControls`| `settings.entry-controls.update`| Toggles required source total verification |
| `PATCH`| `/settings/void-invoice` | `auth`, `active`, `role:admin` | `SettingsController@updateVoidSetting` | `settings.void-invoice.update` | Configures void approval policy |
| `PATCH`| `/settings/fonts` | `auth`, `active`, `role:admin` | `SettingsController@updateFonts` | `settings.fonts.update` | Configures UI & print typography |
| `GET` | `/settings/print/preview`| `auth`, `active`, `role:admin` | `PrintSettingsPreviewController@__invoke`| `settings.print.preview`| Live preview of print layouts |
| `PATCH`| `/settings/print` | `auth`, `active`, `role:admin` | `SettingsController@updatePrintSettings`| `settings.print.update` | Toggles Guest Count vs Item Quantity |
| `POST/PATCH`| `/settings/locations` | `auth`, `active`, `role:admin` | `SettingsController@storeLocation / updateLocation` | `settings.locations.*` | Manages branches/locations |
| `POST/PATCH/DELETE`| `/settings/units` | `auth`, `active`, `role:admin` | `SettingsController@*Unit` | `settings.units.*` | Manages measurement units |
| `POST/PATCH/DELETE`| `/settings/categories` | `auth`, `active`, `role:admin` | `SettingsController@*Category` | `settings.categories.*`| Manages product categories |
| `POST/PATCH/DELETE`| `/settings/products` | `auth`, `active`, `role:admin` | `SettingsController@*Product` | `settings.products.*` | Manages catalog items & master pricing |
| `POST/PATCH`| `/settings/users` | `auth`, `active`, `role:admin` | `SettingsController@*User` | `settings.users.*` | Manages staff accounts, roles & passwords |
| `POST` | `/settings/users/{user}/archive`| `auth`, `active`, `role:admin`| `SettingsController@archiveUser`| `settings.users.archive`| Archives resigned staff (never hard-deletes) |
| `POST` | `/settings/users/{user}/restore`| `auth`, `active`, `role:admin`| `SettingsController@restoreUser`| `settings.users.restore`| Restores archived staff as inactive |
| `GET` | `/settings/periods` | `auth`, `active`, `role:admin` | `PeriodController@index` | `periods.index` | Period lifecycle manager |
| `POST` | `/settings/periods` | `auth`, `active`, `role:admin` | `PeriodController@store` | `periods.store` | Creates draft period with starting sequence |
| `POST` | `/settings/periods/{period}/activate`| `auth`, `active`, `role:admin`| `PeriodController@activate`| `periods.activate`| Opens period for cashier data entry |
| `POST` | `/settings/periods/{period}/review` | `auth`, `active`, `role:admin`| `PeriodController@review` | `periods.review` | Locks entry, begins variance review |
| `PATCH`| `/settings/periods/{period}/reorder`| `auth`, `active`, `role:admin`| `PeriodController@reorder`| `periods.reorder` | Adjusts provisional ordering of drafts |
| `POST` | `/settings/periods/{period}/finalize`| `auth`, `active`, `role:admin`| `PeriodController@finalize`| `periods.finalize` | Atomically assigns gapless sequential numbers |
| `POST` | `/settings/periods/{period}/request-reopen`| `auth`, `active`, `role:admin`| `PeriodController@requestReopen`| `periods.request-reopen`| Creates a reopen approval request with mandatory reason |
| `POST` | `/settings/periods/{period}/reopen/{approval}` | `auth`, `active`, `role:admin`, `throttle:20,1` | `PeriodController@reopen` | `periods.reopen` | Reopens only after validating and atomically consuming the matching approved request |
| `DELETE`| `/settings/periods/{period}`| `auth`, `active`, `role:admin`| `PeriodController@destroy`| `periods.destroy` | Hard deletes empty draft period |

---

### 6.6 Authoritative Form Request Validation Rules Matrix

All mutations MUST use dedicated Form Request classes and domain actions. Form Request validation checks shape and range; domain actions additionally enforce business state, permissions, server-resolved prices, approvals, and period rules.

#### Document requests

- `period_id`: required integer, existing and accessible period.
- `business_date`: valid `Y-m-d`, inside the selected period's date range unless a specifically audited policy allows otherwise.
- `event_time`: `H:i`; `reference_identifier`: nullable string, maximum 30 characters.
- `source_total` and `amount_received`: decimal **strings** matching `^\d{1,10}(\.\d{1,2})?$`; reject floats, exponent notation, commas, whitespace inside the value, and out-of-range amounts.
- `items`: required array with at least one item; `product_id` required integer; `quantity` integer 1–9999; `line_position` is server-assigned and unique within the document.
- The browser MUST NOT submit trusted `subtotal`, `tax_amount`, `discount_amount`, `grand_total`, `change_amount`, `variance`, `unit_count`, `source_total_verified`, `sequence_no`, `document_number`, `status`, or audit fields.
- Resolve the active product, unit, category, and current master price on the server. A submitted price differing from the master price is accepted only through the governed override flow; the exact approved price and target item must match.
- `note`: nullable string maximum 1000. For price override, reason is mandatory and at most 500 characters.
- For update operations, require `lock_version` or another explicit version token and reject stale submissions with a conflict response.

#### Period requests

- `location_id`: integer and existing location the actor is authorized to manage.
- `code`: unique, 1–20 characters, restricted to the agreed code alphabet; `name`: 1–150 characters.
- `start_date` and `end_date`: valid dates, with `end_date >= start_date`.
- `document_prefix`: 1–10 characters matching an agreed safe identifier format.
- `starting_sequence`: integer 1–9999. Do not permit changing it after official numbers have been assigned.
- Period transitions are performed by specific actions, not by accepting `status` from the client.

#### Approval requests

- `request_type` must be a valid `ApprovalType` enum; `target_type` must be allowlisted (`document`, `document_item`, `period`); target must exist and be in a state where the request makes sense.
- `reason` is mandatory, 5–1000 characters. `requested_changes` is a schema-validated, allowlisted object; reject arbitrary keys and nested payloads that are not supported for the requested action.
- The server determines requester ID, status, review fields, expiry, use fields, and target ownership. Never accept those privileged fields from the client.

#### Business settings and uploads

- Validate timezone against supported IANA identifiers and language against `primary`, `secondary`, or `bilingual`.
- The current money engine supports two decimal places only; `decimal_places` MUST equal 2 until a fully tested currency-specific implementation is added.
- Logo uploads: allowlisted raster formats, maximum 2 MB, verify MIME/content rather than trusting the filename, generate server-side names, store outside executable paths, and never allow uploaded content to overwrite arbitrary files.
- `approval_expiry_minutes`: integer 5–1440. Security-sensitive settings changes are audited.

#### Database and state rules

A Form Request is not an authorization boundary by itself. Policies/actions MUST verify authenticated active user, role, location scope, target state, period state, allowed transition, price override permission, and required approvals before changing data.

---

## 7. Strict Financial & Mathematics Engine

All monetary values enter the server as validated decimal strings. Domain calculations use integer cents, and persisted values are formatted decimal strings compatible with `DECIMAL(12,2)`. Domain code MUST NOT accept or calculate money using PHP or JavaScript floating-point values.

### 7.1 Money contract

- Supported persistence range: `-9,999,999,999.99` through `9,999,999,999.99` for signed calculation values; business prices, received amounts, taxes, discounts, and source totals are non-negative unless a particular operation explicitly permits a signed adjustment.
- The maximum absolute stored amount is `9,999,999,999.99` (`999,999,999,999` cents). Reject any input or result outside that range before database persistence.
- Monetary request values must be strings (for example, `"12.50"`). Reject `12.5` as a JSON numeric value at the API/form normalization boundary when strict string representation is required. Never parse exponent notation or locale-specific comma formatting.
- Use a single formatting and validation implementation on the server. JavaScript previews may use safe integers in cents, but the server recalculates before saving.

### 7.2 Reference `Money` helper

```php
<?php

namespace App\Support\Money;

use InvalidArgumentException;

final class Money
{
    public const MAX_CENTS = 999_999_999_999;
    private const PATTERN = '/^-?\\d{1,10}(?:\\.\\d{1,2})?$/D';

    public static function toCents(string $amount): int
    {
        $amount = trim($amount);
        if (! preg_match(self::PATTERN, $amount)) {
            throw new InvalidArgumentException('Invalid monetary amount.');
        }

        $negative = str_starts_with($amount, '-');
        $unsigned = $negative ? substr($amount, 1) : $amount;
        [$whole, $fraction] = array_pad(explode('.', $unsigned, 2), 2, '');
        $cents = ((int) $whole * 100) + (int) str_pad($fraction, 2, '0');

        if ($cents > self::MAX_CENTS) {
            throw new InvalidArgumentException('Monetary amount exceeds DECIMAL(12,2) range.');
        }

        return $negative ? -$cents : $cents;
    }

    public static function fromCents(int $cents): string
    {
        if (abs($cents) > self::MAX_CENTS) {
            throw new InvalidArgumentException('Monetary result exceeds DECIMAL(12,2) range.');
        }

        $sign = $cents < 0 ? '-' : '';
        $absolute = abs($cents);
        return sprintf('%s%d.%02d', $sign, intdiv($absolute, 100), $absolute % 100);
    }
}
```

The domain layer should pass strings into `Money::toCents`. Do not add a float overload or use `number_format()` to normalize a float into a supposedly exact monetary value.

### 7.3 Authoritative totals contract

For the current invoice-style model:

1. `line_total = quantity × unit_price` in integer cents.
2. `subtotal = sum(line_total)`.
3. `grand_total = subtotal + tax_amount - discount_amount`.
4. `variance = grand_total - source_total` when a source total was supplied.
5. For cash payment, `amount_received` must be greater than or equal to `grand_total`; `change_amount = amount_received - grand_total`.
6. For payment methods other than cash, the specific settlement rule must be documented. Until partial/split payments are implemented, require the received amount to equal the grand total and set change to zero.
7. `unit_count` is the sum of quantities for line items whose snapshotted `is_primary_package_snapshot` is true.

Tax and discount policy must be explicit. The client never determines an authoritative tax or discount amount. Tax must be computed by a server-side policy/service with documented rate, scope, and rounding rules; if no tax policy has been approved, tax defaults to zero. A discount must be authorized by the configured discount policy and cannot exceed the subtotal. Reject a negative line price, tax, discount, source total, or amount received.

The current generic blueprint assumes two decimal places and header-level `discount_amount`. Per-line discounts, compound taxes, tax-inclusive pricing, foreign exchange, refunds, and split payments are out of scope until added as explicit requirements with their own tests.

### 7.4 Reference `DocumentCalculator`

The calculator is pure domain logic: no database reads, no client authority, and no side effects. Price resolution, override authorization, and tax/discount policy happen before calling it. Pass `null` for `sourceTotal` when reconciliation is disabled; the caller then stores the calculated grand total in `source_total` and marks it unverified.

```php
<?php

namespace App\Features\Documents\Services;

use App\Support\Money\Money;
use DomainException;

final class DocumentCalculator
{
    public function calculate(
        array $items,
        ?string $sourceTotal,
        string $amountReceived,
        string $taxAmount = '0.00',
        string $discountAmount = '0.00',
        string $paymentMethod = 'cash',
    ): array {
        if ($items === []) {
            throw new DomainException('A document requires at least one line item.');
        }

        $subtotal = 0;
        $unitCount = 0;
        $lineTotals = [];

        foreach ($items as $index => $item) {
            $quantity = $item['quantity'] ?? null;
            if (! is_int($quantity) || $quantity < 1 || $quantity > 9999) {
                throw new DomainException('Quantity must be an integer from 1 to 9999.');
            }

            $unitPrice = Money::toCents($item['unit_price']);
            if ($unitPrice < 0) {
                throw new DomainException('Unit price cannot be negative.');
            }
            if ($unitPrice > intdiv(Money::MAX_CENTS, $quantity)) {
                throw new DomainException('Line total exceeds the supported monetary range.');
            }

            $lineTotal = $quantity * $unitPrice;
            $subtotal += $lineTotal;
            if ($subtotal > Money::MAX_CENTS) {
                throw new DomainException('Subtotal exceeds the supported monetary range.');
            }

            $lineTotals[$index] = Money::fromCents($lineTotal);
            if (($item['is_primary_package'] ?? false) === true) {
                $unitCount += $quantity;
            }
        }

        $tax = Money::toCents($taxAmount);
        $discount = Money::toCents($discountAmount);
        $received = Money::toCents($amountReceived);

        if ($tax < 0 || $discount < 0 || $received < 0) {
            throw new DomainException('Tax, discount, and received amount cannot be negative.');
        }
        if ($discount > $subtotal) {
            throw new DomainException('Discount cannot exceed subtotal in the current policy.');
        }

        $grandTotal = $subtotal + $tax - $discount;
        if ($grandTotal < 0 || $grandTotal > Money::MAX_CENTS) {
            throw new DomainException('Grand total is outside the supported monetary range.');
        }
        if ($paymentMethod === 'cash' && $received < $grandTotal) {
            throw new DomainException('Cash received must cover the grand total.');
        }
        if ($paymentMethod !== 'cash' && $received !== $grandTotal) {
            throw new DomainException('Non-cash payment must equal the grand total under the current policy.');
        }

        $sourceCents = $sourceTotal === null ? null : Money::toCents($sourceTotal);
        if ($sourceCents !== null && $sourceCents < 0) {
            throw new DomainException('Source total cannot be negative.');
        }
        $effectiveSource = $sourceCents ?? $grandTotal;
        $variance = $grandTotal - $effectiveSource;

        return [
            'subtotal' => Money::fromCents($subtotal),
            'tax_amount' => Money::fromCents($tax),
            'discount_amount' => Money::fromCents($discount),
            'grand_total' => Money::fromCents($grandTotal),
            'source_total' => Money::fromCents($effectiveSource),
            'source_total_verified' => $sourceCents !== null && $variance === 0,
            'variance' => Money::fromCents($variance),
            'amount_received' => Money::fromCents($received),
            'payment_method' => $paymentMethod,
            'change_amount' => Money::fromCents($paymentMethod === 'cash' ? $received - $grandTotal : 0),
            'unit_count' => $unitCount,
            'line_totals' => $lineTotals,
        ];
    }
}
```

**Required caller checks:** If the active period snapshot requires source verification, reject the mutation unless a source total was supplied, `source_total_verified === true`, and `variance === '0.00'`. If reconciliation is disabled, call the calculator with `sourceTotal: null`; do not mark the auto-filled total as verified. Persist only server-calculated return values.

---

## 8. Deterministic Sequence Numbering & Period Lifecycle

### 8.1 Lifecycle and state transitions

| State | Meaning | Allowed next states | Required control |
|---|---|---|---|
| `draft` | Period configuration is incomplete or not active | `active` | Admin validation; dates and location locked after activation except through an audited correction path |
| `active` | Operators can enter drafts | `review` | Period policy snapshot stored at activation; mutations checked against that snapshot |
| `review` | Entry is locked; admin reviews and reorders drafts | `active`, `closed` | Return to active requires reason and audit event; finalization runs atomically |
| `closed` | Official document numbers are assigned and period is closed | `review` only through approved reopen workflow | Numbers already issued remain reserved; reopening cannot reuse numbers |

Period transitions MUST be explicit domain actions; clients cannot PATCH a `status` field directly. The activation action snapshots entry/print settings. Every document mutation checks that its parent period is in a state permitting that mutation.

### 8.2 Finalization invariants

Finalization is a single transaction and MUST:

1. Lock the period row and re-check that it is in `review` state.
2. Load the period's policy snapshot and lock eligible draft/review documents.
3. Recalculate or validate persisted totals and enforce reconciliation policy.
4. Select only documents with `sequence_no IS NULL` and no official number.
5. Sort by `business_date`, `event_time`, `provisional_order`, then `id`.
6. Allocate numbers starting at `max(last_sequence_no, starting_sequence - 1) + 1`.
7. Set status, number, finalizer, timestamp, and version for each document; write audit events.
8. Update `last_sequence_no`, close the period, and write a period audit event.
9. Commit all changes together. Any failure rolls back all sequence assignments and state changes.

The four-digit formatting is a minimum width, not a maximum; values above 9999 continue to use all digits. Do not silently wrap or truncate.

### 8.3 Reference finalization action

```php
<?php

namespace App\Features\Periods\Actions;

use App\Enums\DocumentStatus;
use App\Enums\PeriodStatus;
use App\Features\Documents\Services\DocumentCalculator;
use App\Models\Document;
use App\Models\Period;
use App\Support\Audit\AuditService;
use App\Support\Money\Money;
use DomainException;
use Illuminate\Support\Facades\DB;

final class FinalizePeriodDocuments
{
    public function __construct(private readonly AuditService $audit) {}

    public function handle(int $periodId, int $adminId): Period
    {
        return DB::transaction(function () use ($periodId, $adminId): Period {
            $period = Period::query()->lockForUpdate()->findOrFail($periodId);
            if ($period->status !== PeriodStatus::Review) {
                throw new DomainException('Only a period under review can be finalized.');
            }

            $requireSource = (bool) data_get(
                $period->entry_settings_snapshot,
                'require_source_total',
                true,
            );

            $documents = Document::query()
                ->where('period_id', $period->id)
                ->whereNull('sequence_no')
                ->whereIn('status', [DocumentStatus::Draft->value, DocumentStatus::Review->value])
                ->orderBy('business_date')
                ->orderBy('event_time')
                ->orderBy('provisional_order')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            if ($documents->isEmpty() && $period->last_sequence_no === 0) {
                throw new DomainException('An empty period cannot be finalized.');
            }

            $calculator = app(DocumentCalculator::class);
            foreach ($documents as $document) {
                if ($document->document_number !== null) {
                    throw new DomainException('A document with an existing official number cannot be re-sequenced.');
                }

                $items = $document->items()->orderBy('line_position')->get();
                $calculated = $calculator->calculate(
                    $items->map(fn ($item) => [
                        'quantity' => (int) $item->quantity,
                        'unit_price' => (string) $item->unit_price,
                        'is_primary_package' => (bool) $item->is_primary_package_snapshot,
                    ])->all(),
                    $document->source_total_verified ? (string) $document->source_total : null,
                    (string) $document->amount_received,
                    (string) $document->tax_amount,
                    (string) $document->discount_amount,
                    (string) $document->payment_method,
                );

                foreach (['subtotal', 'tax_amount', 'discount_amount', 'grand_total', 'source_total', 'amount_received', 'change_amount'] as $field) {
                    if (Money::toCents((string) $document->{$field}) !== Money::toCents($calculated[$field])) {
                        throw new DomainException("Stored {$field} does not match the authoritative calculation.");
                    }
                }
                if ((int) $document->unit_count !== (int) $calculated['unit_count']
                    || (bool) $document->source_total_verified !== (bool) $calculated['source_total_verified']) {
                    throw new DomainException('Stored document counters or reconciliation status are inconsistent.');
                }
                foreach ($items->values() as $position => $item) {
                    if (Money::toCents((string) $item->line_total)
                        !== Money::toCents($calculated['line_totals'][$position])) {
                        throw new DomainException('A stored line total does not match the authoritative calculation.');
                    }
                }
                if ($requireSource && ! $document->source_total_verified) {
                    throw new DomainException('Every document requires verified source-total reconciliation.');
                }
            }

            $sequence = max($period->last_sequence_no, $period->starting_sequence - 1);
            foreach ($documents as $document) {
                $sequence++;
                $number = sprintf('%s-%s-%04d', $period->document_prefix, $period->code, $sequence);
                $document->forceFill([
                    'sequence_no' => $sequence,
                    'document_number' => $number,
                    'status' => DocumentStatus::Finalized,
                    'finalized_by' => $adminId,
                    'finalized_at' => now(),
                    'lock_version' => $document->lock_version + 1,
                ])->save();

                $this->audit->record('document.finalized', $document, null, [
                    'document_number' => $number,
                    'sequence_no' => $sequence,
                ], actorId: $adminId);
            }

            $period->forceFill([
                'last_sequence_no' => $sequence,
                'status' => PeriodStatus::Closed,
                'closed_by' => $adminId,
                'closed_at' => now(),
                'lock_version' => $period->lock_version + 1,
            ])->save();

            $this->audit->record('period.closed', $period, null, [
                'last_sequence_no' => $sequence,
                'assigned_count' => $documents->count(),
            ], actorId: $adminId);

            return $period->refresh();
        }, 3);
    }
}
```

The example assumes `Money` is imported from `App\Support\Money\Money`; add that import in a runnable implementation. The action must also apply the application's Policy/authorization checks before entering the transaction. MySQL feature tests MUST verify behavior under concurrent finalization requests.

---

## 9. Exception Governance & One-Time Approvals

Approvals authorize a narrowly scoped action; they are not generic permission flags. Each request binds to a specific request type, target type/ID, and immutable `requested_changes` payload. Any material difference between the approved payload and the attempted mutation causes rejection.

### 9.1 Approval lifecycle

1. **Requested:** Authenticated active user submits an allowlisted request type, target, reason, and structured requested change. Server fills requester, status, timestamps, and identifiers.
2. **Reviewed:** An authorized reviewer approves or rejects with a review note. Default policy prohibits self-approval for governed exceptions. If a deployment permits a different rule, it must be explicit and audited.
3. **Approved:** Server assigns `expires_at` from a validated policy and approved status. An approval with null expiry is unusable.
4. **Consumed:** The protected operation locks the approval and target rows, validates status/expiry/target/payload, executes the mutation, and sets `status = used`, `used_at`, and `used_by` inside the same transaction.
5. **Expired/rejected:** An expired or rejected request cannot be revived or used. A new request is required.

### 9.2 Atomic consumption contract

The protected action MUST perform these steps in one `DB::transaction`:

- Lock the approval row with `lockForUpdate()`.
- Require status `approved`, a non-null future `expires_at`, and both `used_at IS NULL` and status not `used`.
- Compare exact `request_type`, `target_type`, `target_id`, and the server-normalized payload to the approved values.
- Lock the target record and re-check its current state, version, and permissions.
- Apply the protected change and any revision/audit snapshots.
- Mark the approval used and set `used_at`/`used_by`.
- Commit both the business mutation and approval consumption together.

Never implement “check approval, then mutate later” as two independent requests or transactions. If the business mutation fails, consumption must roll back too.

### 9.3 Example guard predicate

```php
public function assertUsable(
    ApprovalRequest $approval,
    ApprovalType $type,
    string $targetType,
    int $targetId,
    array $normalizedApprovedPayload,
): void {
    if ($approval->status !== ApprovalStatus::Approved
        || $approval->expires_at === null
        || ! $approval->expires_at->isFuture()
        || $approval->used_at !== null
        || $approval->request_type !== $type
        || $approval->target_type !== $targetType
        || (int) $approval->target_id !== $targetId
        || ($approval->requested_changes ?? []) !== $normalizedApprovedPayload) {
        throw new DomainException('Approval is invalid, expired, consumed, or mismatched.');
    }
}
```

This is only a predicate: call it after locking the approval inside the same transaction that performs the mutation and marks it used. Normalize decimal strings and payload key structure consistently before comparison; do not compare raw, ambiguously formatted client data.

### 9.4 Policy defaults

- Price override: approval required for a non-admin operator; target is a specific document item and exact price/reason.
- Edit finalized document: approval required; after execution, append a `document_revisions` record containing before/after payloads and reason.
- Void finalized document: approval required by default. A direct administrator bypass is allowed only if explicitly enabled in settings, requires a reason, and produces a distinct high-severity audit event.
- Reopen period: separate approval required, reason mandatory, second authorized reviewer by default. Reopening never frees already issued sequence numbers.
- Approval reviewer access is distinct from the ability to execute the approved operation. The executing user must still be authorized for the target.

---

## 10. Deletion, Purge vs. Void Rules

| Record state | Allowed action | Required invariant | Result |
|---|---|---|---|
| Draft document | Purge | No official number, no finalized timestamp, no revision history, no official print log; actor authorized; parent period permits purge | Header and items removed; complete snapshot kept in audit log in the same transaction |
| Finalized document | Void only | Reason present; approval consumed atomically or audited admin bypass explicitly enabled | Record and official number retained; status becomes `void` |
| Closed period | Reopen only through approved action | Approval is valid and unused; reason recorded; all historical numbers remain allocated | Period re-enters review/active state according to policy; no sequence reuse |
| Product | Prefer inactivation | No mutation of historical snapshots | Historical item labels/prices remain unchanged |
| Unit/category | Inactivate if referenced | FK references must remain valid | Existing products and historical documents remain readable |

### 10.1 Safe draft purge action contract

The following is the required behavior, not a drop-in implementation. Use one database transaction and lock the document before evaluating eligibility.

```php
DB::transaction(function () use ($documentId, $actorId): void {
    $document = Document::query()->lockForUpdate()->findOrFail($documentId);

    if ($document->status !== DocumentStatus::Draft
        || $document->sequence_no !== null
        || $document->document_number !== null
        || $document->finalized_at !== null) {
        throw new DomainException('Only an unnumbered draft may be purged.');
    }

    if ($document->revisions()->exists() || $document->printLogs()->exists()) {
        throw new DomainException('A document with revision or official print history cannot be purged.');
    }

    $snapshot = [
        'document' => $document->toArray(),
        'items' => $document->items()->orderBy('line_position')->get()->toArray(),
    ];

    // Approval requests targeting this draft must be retained as history.
    // Their nullable document_id is set to null; target_type/target_id remain historical identifiers.
    ApprovalRequest::query()
        ->where('document_id', $document->id)
        ->orWhere(fn ($query) => $query
            ->where('target_type', 'document')
            ->where('target_id', $document->id))
        ->update(['document_id' => null]);
    $document->items()->delete();
    $document->delete();

    app(AuditService::class)->record(
        'document.draft_purged', $document, $snapshot, null,
        ['document_id' => $document->id], actorId: $actorId,
    );
});
```

Ensure the transaction is used on a database engine/table configuration that supports transactional rollback. Revisions or print logs must not be silently cascaded away. If a project chooses a different child-record policy, document it and test that all deleted child data survives in the audit snapshot.

---

## 11. Full-Data Backup and Recoverable Restore

### 11.1 Backup ZIP format

```text
backup-YYYY-MM-DD-HHMMSS.zip
├── manifest.json
├── tables/                         # allowlisted JSON tables in explicit dependency inventory (including user_locations)
├── storage/                        # durable business assets, never executable uploads
└── reports/                        # durable exported reports if these are retained by policy
```

`manifest.json` MUST include: archive format version, application version, schema version, generation timestamp and timezone, table allowlist, per-table row counts, per-file byte size and SHA-256 checksum, and a complete file inventory. Do not include credentials, `.env`, app keys, passwords in plaintext, caches, or live authentication sessions. Database dumps must preserve decimal precision, timestamps, nulls, and JSON values without lossy serialization.

Backup creation SHOULD use a consistent database snapshot or maintenance/locking strategy so the tables describe one coherent point in time. Include all business data tables and durable assets; keep an explicit inventory that is updated whenever migrations add persistent data.

### 11.2 Restore workflow and atomicity boundary

A database transaction cannot atomically commit filesystem changes. Therefore this system MUST NOT describe its combined restore as “fully transactional” unless it implements a genuine cross-resource transaction (normally unavailable for ordinary MySQL plus filesystem storage). The required behavior is **staged, journaled, verified, and recoverable**:

1. **Authorize and confirm:** require an active administrator, recent password confirmation, maintenance mode, and explicit acknowledgement that live data will be replaced.
2. **Inspect archive:** validate ZIP paths against traversal, allowlisted table names, format/schema compatibility, size/count limits, checksums, required entries, JSON shape, and dependency inventory before touching live data.
3. **Prepare recovery point:** create and verify a fresh backup of the current database and durable assets; abort if this cannot be completed.
4. **Stage assets:** extract to a new temporary directory outside any public executable path; reject symlinks, absolute paths, `..` path segments, excessive expansion ratios, and unexpected file types. Validate all staged asset checksums.
5. **Stage database:** validate rows and foreign-key relationships. Restore into a staging database/schema where operationally available, or use a journaled target restore under maintenance mode and a reliable pre-restore recovery point. The restore journal MUST live outside the target database being replaced and survive process/host restart; record the current step, recovery point, staged asset path, and verification result.
6. **Verify:** compare row counts/checksums, foreign keys, critical totals, sequence uniqueness, expected settings, and references from records to staged files.
7. **Commit/reconcile:** switch to or commit the staged data using the deployment's documented swap strategy; promote the verified assets. If either operation fails after the other succeeds, follow the recovery journal to restore the pre-restore database and assets. Do not delete the recovery point until verification completes.
8. **Post-restore security:** clear old sessions, rotate or invalidate restoration-sensitive credentials/tokens as required, rebuild caches, verify storage permissions, write a durable restore event, then exit maintenance mode.
9. **Report:** return archive name/version, tables and rows restored, assets restored, verification result, and recovery-point identifier. Never report success on partial completion.

### 11.3 Foreign-key order

Use an explicit, reviewed dependency list—not alphabetical guessing. Delete child tables before parent tables; insert parents before children. Typical order includes users, business settings, locations, user-location assignments, units/categories, products, periods, documents, approval requests, document items (because they reference approvals for price overrides), revisions, audit logs, print logs, and report exports, adjusted to the actual foreign-key graph. Preserve primary keys where required and reset auto-increment counters safely after import.

### 11.4 Archive threat model

- Apply upload size limits and bounded decompression; reject archive bombs.
- Only allow table names compiled into the application; never build SQL table names directly from manifest input.
- Never extract paths from the archive without canonical path validation.
- Checksums detect corruption but do not establish who created an archive. Consider signing manifests or using an authenticated encryption format if backup provenance matters.
- Protect backups at rest and in transit; they may contain financial, staff, and customer information.
- Test restore on a disposable environment regularly. A backup is not proven until a restore test succeeds.

---

## 12. Printing, Hardware Formats & Typography Engine

### 12.1 Supported Document Outputs
1. **80mm Thermal Receipt (`/preview/80mm`, `/print/80mm`):**
   - Clean, high-contrast POS receipt format rendered as a print-ready browser view.
   - Fixed CSS styling with `@media print { @page { margin: 0; size: 80mm auto; } }`.
   - Automatic scaling to fit thermal continuous paper without pagination breaks.
2. **A5 Standard Invoice (`/preview/a5`, `/print/a5`, `/pdf`):**
   - Formal commercial invoice with double-bordered tables, configured seller/tax identity, payment labels, and signature blocks.
   - Renderable directly in browser print dialog or generated via headless PDF engine.
3. **Continuous Range Printing (`/invoices/print-range`):**
   - Build a deterministic print batch (e.g. `0001` through `0050`) from finalized, non-void documents only.
   - Record a print-request event for each document and batch correlation ID. The browser cannot reliably prove that physical paper came out of the printer, so the application MUST label this as a print request/attempt rather than guaranteed physical completion.

**Print event semantics:** GET preview/print-ready routes MUST be read-only. Do not create a new print log on every page refresh. Use an authenticated, CSRF-protected POST to record a print request with a UUID idempotency key generated for that user action; retries with the same key return the existing event rather than creating duplicates. The server also records a request/correlation ID for diagnostics, then returns the print-ready URL. Track `original` versus `reprint` based on persisted history. Do not claim direct, silent hardware printing unless a separately installed, explicitly supported local print agent exists.

### 12.2 Dual Typography & Script Support
* For deployments in multilingual regions (e.g., English + Khmer), browser default fonts often fail or clip complex diacritics.
* **Architecture:** Bundle local WOFF2/TTF fonts in `public/fonts/` (e.g. Siemreap, Battambang, Moul, Inter).
* Allow the administrator to select primary and heading fonts in `Settings -> Typography`. Fonts are injected via CSS variables (`--font-primary`, `--font-heading`) driving both the React UI and the print layout.

---

## 13. Frontend Architecture & High-Speed Entry UX

### 13.1 Keypad-Driven Data Entry (`resources/js/pages/documents/create.tsx`)
Cashiers entering hundreds of physical documents daily require zero-mouse operation:
- **Search & Filter:** Category tabs selectable via `Alt+1` .. `Alt+9` or debounced search field (`/`).
- **Arrow Navigation:** `Up` and `Down` arrow keys navigate search results; `Enter` adds the item to the order grid.
- **Quantity & Price Modifiers:** `+` and `-` keys adjust quantity; `Tab` jumps to Amount Received.
- **Fast Save:** `F2` or `Ctrl+Enter` submits the form.
- **Error Preservation:** If server-side validation fails (e.g. source total mismatch), all entered line items, quantities, and inputs are preserved intact in Inertia form state.

### 13.2 Real-Time Client Validation with Authoritative Server Recalculation
- React calculates preliminary line totals in integer cents for instant visual feedback; enforce JavaScript safe-integer bounds before rendering any intermediate result.
- **Security Rule:** The client MUST NOT submit trusted `grand_total`, `change_amount`, `variance`, status, verification flags, sequence, authoritative prices, or permission decisions. The server resolves prices/policy and recalculates totals through `DocumentCalculator` before persisting.

### 13.3 Complete Screen & UI View Specifications

Every application implementing this blueprint must deliver these exact screens with verified user interactions:

#### 1. Authentication (`resources/js/pages/auth/login.tsx`)
- Displays business logo, primary business name, and localized title.
- Username and password inputs with accessible validation errors.
- Active user check: Displays clean error if account is archived or inactive.

#### 2. Operational Dashboard (`resources/js/pages/dashboard.tsx`)
- **Key Metrics Cards:** Gross Revenue ($), Total Documents Count, Guest / Unit Count, Void Count.
- **Role Awareness:** Cashiers see strictly their own daily performance figures; Administrators see store-wide figures.
- **Active Period Banner:** Prominently displays currently open Period code, start/end dates, and quick link to enter documents.
- **Recent Activity Table:** Latest 10 documents with status badges and quick-action links.

#### 3. Document Register & Search Grid (`resources/js/pages/documents/index.tsx`)
- **Real-Time Filtering:** Debounced text search (document #, table/reference #), date range picker, status filter (`Draft`, `Review`, `Finalized`, `Void`), and cashier filter (Admin only).
- **Deterministic Sort:** Allows sorting official document numbers A–Z or Z–A.
- **Drafts-Last Guarantee:** Unfinalized drafts always remain at the bottom of the list regardless of chronological sort so cashiers can locate pending work immediately.
- **Row Actions:** View details, edit eligible drafts, request approved changes to finalized documents, request print-ready output for finalized documents, download PDF, request void, or purge an eligible draft.

#### 4. High-Speed Document Entry (`resources/js/pages/documents/create.tsx`)
- **Two-Column Layout:** Left catalog picker (category tabs, quick search, item cards); right document tray.
- **Keypad Entry:** Item quantities adjustable via keyboard; Enter adds item; Tab advances to Cash Received.
- **Live Reconciliation Indicator:** Shows Calculated Total vs Source Total with visual variance pill:
  - Green `$0.00`: Balanced.
  - Red `+$X.XX` / `-$X.XX`: Discrepancy detected (save blocked if reconciliation required).
- **Cash Change Calculator:** Computes Change Due in real-time as cashier enters amount received.

#### 5. Document Details & Revision History (`resources/js/pages/documents/show.tsx`)
- Read-only visual representation of the receipt/invoice.
- Immutable line items list showing snapshots of item names, units, quantities, and prices.
- **Print Request History:** Displays print-request events from `print_logs` (format, requester, timestamp, request ID, original/reprint indicator); it does not claim physical print confirmation.
- **Revision Timeline:** Shows JSON diffs of past edits with who modified it and approved reason.

#### 6. Accounting Period Review Screen (`resources/js/pages/periods/review.tsx`)
- Displayed before finalization. Lists all draft documents in their planned sequential order.
- **Variance Assertion Banner:** Highlights any draft with outstanding reconciliation variance.
- **Reordering Handle:** Allows administrator to adjust provisional ordering before official sequence numbers are stamped.
- **Atomic Finalize Action:** Opens confirmation dialog that executes `FinalizePeriodDocuments`.

#### 7. Administrative Approvals Inbox (`resources/js/pages/approvals/index.tsx`)
- Tabbed interface: `Pending`, `Approved`, `Rejected`.
- Each card details: Requester name, target document, reason, before/after values, and expiration timer.
- Action dialog for Admin to approve (sets the configured expiry window) or reject with mandatory review note; apply the separation-of-duties policy.

#### 8. Master Settings Hub (`resources/js/pages/settings/index.tsx`)
Tabbed administration workspace:
- **Business Profile:** Names (primary/secondary), address, phone, VAT/tax identifier, 2MB logo upload with live preview.
- **Entry Controls:** Toggle required source total reconciliation, toggle sale time display.
- **Typography:** Local bundled font family selection for primary text and headings.
- **Print Layouts:** Toggle between Guest Count vs Total Item Quantity on receipts, with live preview renderer.
- **Locations & Branches:** Add/edit branch locations.
- **Units Master:** Manage measurement units (`code`, `name_primary`, `name_secondary`, `sort_order`).
- **Product Categories & Catalog:** Manage categories, items, SKUs, and default prices.
- **Users & Access Control:** Manage staff accounts, reset passwords, toggle active status, archive resigned staff with reason, restore archived staff.
- **Full Backup & Disaster Recovery:** One-click password-confirmed ZIP download; staged, preflight-inspected ZIP restore with an explicit recovery point and status report.

#### 9. Operational Reports & Exports (`resources/js/pages/reports/index.tsx`)
- Filter by Period, date range, or cashier.
- Summary cards: Gross sales, net sales, cash collected, total units.
- Cashier breakdown table: Cashier name, document count, gross sales, change sum.
- Export actions: Instant official PDF register download and structured multi-sheet XLSX export.

---

### 13.4 Strict Role-Based Scoping & Privacy Rules

The system enforces server-side authorization by authenticated role, document ownership, and permitted location. `user_locations` is the source of location membership for non-admin users. Controllers must scope index/search/report queries before filtering and pagination; do not fetch arbitrary records and hide them after loading. An administrator's wider scope is granted by Policy, not by omitting authorization checks. Supervisor capabilities must be explicitly defined; unconfigured permissions default to deny.

| Feature / Data Scope | Cashier / Operator Role | Administrator Role |
|---|---|---|
| **Dashboard Metrics** | Scoped strictly to `created_by = auth()->id()` | Full business-wide totals |
| **Documents Index** | Scoped strictly to `created_by = auth()->id()` | Full store-wide document register |
| **Create / Edit Documents** | Can create drafts; finalized-document edits require approved exception | Can create/edit drafts; finalized-document edits use the same approval workflow by default |
| **Print / Reprint** | Can request printing of own finalized documents; repeat requests logged | Can request printing of any authorized finalized document |
| **Reports & Registers** | Sees only own cashier sales summary | Full period register & cashier breakdowns |
| **Approvals Queue** | Own submitted requests only (`/my-approval-requests`) | Full inbox: can approve or reject, subject to separation-of-duties policy |
| **Period Management** | ❌ No access (hidden from navigation) | Full access: create, activate, review, close |
| **Master Settings** | ❌ No access (hidden from navigation) | Full access: business, catalog, users, backup |

* **Self-Protection Guard:** An administrator cannot deactivate/archive their own currently logged-in account or remove the last active administrator. Enforce this on the server under a transaction, not only by disabling the UI control.

---

### 13.5 Reporting & Export Generation Engine

The export engine generates immutable financial and operational registers without external reporting services. Baseline formulas for finalized, non-void documents are:

- **Gross sales:** sum of `subtotal`.
- **Discounts:** sum of `discount_amount`.
- **Net sales:** gross sales minus discounts; tax excluded.
- **Tax collected:** sum of recorded `tax_amount` (subject to the approved tax policy).
- **Invoiced total:** sum of `grand_total`.
- **Cash tendered:** sum of `amount_received` for cash-method documents.
- **Change given:** sum of `change_amount` for cash-method documents.
- **Net cash received:** cash tendered minus change given.
- **Voids:** count and value reported separately; voided documents are excluded from sales totals but their sequence and history remain visible.
- **Reconciliation:** compare `source_total` with `grand_total`; report unverified documents separately and never treat an auto-populated source total as independently verified.

These formulas are the baseline reporting contract and must be approved against the actual accounting policy before go-live.

1. **Multi-Sheet Excel Workbook (`ReportController@exportExcel`):**
   - Built using a supported XLSX library. CSV may be offered separately, but is not a multi-sheet XLSX workbook.
   - **Sheet 1 (Summary):** Business details, period code, date range, gross sales, discounts, net sales, tax, invoiced total, void count, unverified-source count, document count, and unit count.
   - **Sheet 2 (Document Register):** Sequence number, date, time, table/reference, subtotal, discount, tax, grand total, source total, variance, verification status, cashier, and document status.
   - **Sheet 3 (Item Sales Breakdown):** Snapshot item name, snapshot unit, total quantity sold, recorded unit price, and line total.
2. **Archival PDF Document Register (`ReportController@exportPdf`):**
   - Formatted in landscape A4.
   - Includes business letterhead, configured tax identifier, and sequential register. Record a cryptographic file checksum in `report_exports`; a checksum establishes file identity, not legal authenticity by itself.

---

## 14. Deployment Profiles, Portable Operation & Launchers

Choose the deployment profile explicitly. A local PC deployment may be offline-capable, but runtime independence requires PHP extensions, Composer dependencies, built frontend assets, fonts, and database service to be present locally.

### 14.1 Supported profiles

- **Development/demo:** `php artisan serve` is acceptable for local development and demonstrations. Do not describe Laravel's development server as a production multi-user server.
- **Single-workstation controlled deployment:** use a documented local web-server/service configuration, bind only to the intended interface, protect the database, and run with production environment settings. If `artisan serve` is used for a strictly local, low-risk deployment, explicitly accept that operational limitation and do not expose it to a LAN/public network.
- **Multi-user LAN or production deployment:** use a supported production web-server setup (for example, Nginx/Apache with PHP-FPM or an equivalent managed service), secure database access, TLS where credentials/data cross a network, least-privilege OS/database accounts, and scheduled verified backups.
- **Air-gapped deployment:** build assets and install dependencies before disconnecting. Do not require CDNs, external font downloads, telemetry, remote API calls, or online license checks during normal use unless explicitly approved.

### 14.2 Preflight checker

`scripts/launcher/preflight.php` may use plain PHP to:
- Parse only the required `.env` values safely without printing secrets.
- Verify PHP version/extensions, writable storage/cache directories, expected built assets, and database reachability.
- Detect port conflicts and report the process/next action without killing arbitrary processes.
- Verify required directories and local fonts exist.
- Return clear exit codes and redact passwords/keys from logs.

Do not implement a fragile custom `.env` parser for values with complex quoting without tests. Prefer reading required configuration through the framework where possible; if preflight must be framework-independent, constrain and document the accepted `.env` format.

### 14.3 Desktop launchers

- **macOS (`Start App.command`):** checks prerequisites, starts the configured local service, polls a health endpoint with a bounded timeout, opens the default browser, and provides a clear stop/status action.
- **Windows (`Start App.bat` or a signed launcher):** runs the same preflight checks, starts or connects to the configured service, waits for health readiness, and opens the default browser.
- Launchers MUST NOT embed secrets. They MUST avoid exposing the service to the network accidentally, log useful errors without credentials, and provide a graceful shutdown path.

### 14.4 Production configuration checklist

- `APP_ENV=production`, `APP_DEBUG=false`, correct `APP_URL`, secure session/cookie settings, CSRF enabled, and a stable secret key.
- Correct filesystem ownership/permissions; `storage/` and cache writable only by the runtime account; uploads not executable.
- Database account restricted to the required schema; no root database credentials in application config.
- HTTPS/TLS for networked deployments, rate limits for authentication and sensitive operations, and monitoring/log rotation.
- Document installation, schema migration, rollback/recovery, backup schedule, restore drill, and supported upgrade path.

---

## 15. Testing, Security Verification & Release Gates

A clean build is necessary but not sufficient. The test suite MUST run against the actual supported dependency lockfile and must include MySQL integration tests for concurrency-sensitive features.

### 15.1 Backend verification

```bash
php artisan test
composer types:check
./vendor/bin/pint --test
```

Required unit tests include:
- `MoneyTest`: decimal parsing, negative policy, malformed/exponent/locale input rejection, maximum/minimum supported amount, formatting, and overflow.
- `DocumentCalculatorTest`: empty items, invalid quantity, line/subtotal overflow, tax/discount formula, discount greater than subtotal, received amount, change, source variance, and verification flag.
- `ApprovalPermissionTest`: missing/expired expiry, wrong action/target/payload, rejected/pending/used status, and normalized decimal mismatch.
- `DocumentStateTest`: illegal transitions, draft-purge guards, finalized void behavior, and version conflicts.

Required backend feature/integration tests include:
- Draft creation resolves price server-side and persists line-item snapshots.
- Updating catalog labels/prices does not change historical document lines.
- Strict source-total policy blocks mismatches; disabled policy auto-fills source total but keeps `source_total_verified=false`.
- Period activation snapshots settings; later setting changes do not change the active period's policy.
- Finalization sorts by all required keys, creates contiguous numbers, preserves voided numbers, and rolls back on injected failure.
- MySQL concurrency test: two simultaneous finalization attempts yield one valid close and no duplicate or partial numbering.
- MySQL concurrency test: two simultaneous attempts to consume one approval allow at most one protected mutation.
- Unauthorized roles cannot view or mutate another user's documents, approvals, reports, settings, or location-scoped data.
- Purging a draft captures header and item snapshot plus audit event in the same transaction and refuses finalized/revisioned/officially printed documents.
- Backup/restore tests cover invalid checksum, path traversal, unknown table, oversized archive, FK failure, filesystem failure, interrupted recovery, and successful post-restore integrity verification.

### 15.2 Frontend verification

```bash
npm run test:frontend
npm run types:check
npm run lint:check
npm run format:check
npm run build
```

Test keyboard navigation, focus handling, form-state preservation, accessibility labels, server error display, stale-version conflict UX, print layouts, and responsive behavior. Do not use client-only tests as evidence for server-side authorization or financial integrity.

### 15.3 Browser smoke and end-to-end tests

`scripts/browser-smoke.mjs` may use headless Chrome/Chromium to verify login, session persistence, Inertia page loading, built assets, and a minimal document-entry flow in a test environment. Use test-only credentials and never capture real customer/staff data in CI screenshots.

### 15.4 Release gates

Do not deploy unless:
- Migrations run on the supported MySQL version from an empty database.
- Automated tests pass in CI and the MySQL integration suite passes.
- Static analysis, lint, formatting, and production build pass.
- Backup and restore drill succeeds on a separate test instance.
- Authorization checks, CSRF, upload validation, logging redaction, and production configuration have been reviewed.
- Critical flows have an operator-tested acceptance checklist and a recovery procedure.

Avoid claims such as “100% tested” or “zero warnings” unless an objectively defined, reproducible gate supports them.

---

## 16. Phased Implementation Roadmap

Do not generate the entire application in one prompt. Each phase must result in reviewed, testable changes and a small working increment. Phase 0 is mandatory: resolve domain assumptions and invariants before code generation.

```
Phase 0: Confirm domain scope, assumptions, state diagrams, and acceptance tests
   ↓
Phase 1: Foundation, authentication, authorization, settings, audit framework
   ↓
Phase 2: Catalog, normalized units, locations, and immutable snapshots
   ↓
Phase 3: Money engine, calculator, source reconciliation, rapid draft entry
   ↓
Phase 4: Period lifecycle, provisional ordering, finalization and MySQL locks
   ↓
Phase 5: Approvals, revisions, voiding, guarded purge, optimistic concurrency
   ↓
Phase 6: Print-ready views, print-request logs, PDF/XLSX reports
   ↓
Phase 7: Backup archive, restore journal, disaster-recovery drill
   ↓
Phase 8: Desktop/deployment scripts, full security regression and release gates
```

### Required output at the end of each phase

1. Migrations/models/actions/controllers/UI changes within scope.
2. Tests for normal paths, invalid input, permission failures, and relevant failure paths.
3. Updated route inventory and data-contract/type definitions.
4. Migration/run instructions and a brief changelog.
5. A concise report stating implemented, tested, not implemented, and known limitations. Do not claim tests were run unless tool output confirms they were run.

### Dependency management

Commit `composer.lock` and the frontend lockfile. Pin compatible major versions; verify Laravel, Inertia, React, TypeScript, Tailwind, and shadcn/ui compatibility before installing upgrades. Do not upgrade framework dependencies during a feature phase unless the phase explicitly targets that upgrade.

---

## 17. AI Agent Prompt Templates

Use one bounded prompt per phase. Require the coding agent to inspect the actual repository and current dependency versions before changing files. The agent must not invent missing project conventions or claim unrun tests.

### Prompt 0 — Specification reconciliation

```text
Goal: Prepare the project for implementation using this V2.0 specification.

Tasks:
1. Inspect the repository and compare its current state to V2.0.
2. Create a requirements checklist for every invariant, state transition, table, route, authorization rule, and acceptance test.
3. Identify assumptions requiring a product-owner decision (tax policy, payment methods, location scope, direct admin void policy, retention rules, deployment profile).
4. Do not implement application features yet. Propose only the smallest necessary corrections to this specification and list unresolved decisions.

Done when: Each requirement is mapped to code/test locations or marked as an explicit open decision. No claim of completion without evidence.
```

### Prompt 1 — Foundation and access control

```text
Implement Phase 1 only. Use the repository's pinned Laravel/Inertia/React versions.
Create migrations/models for users, business_settings, locations, and audit logs; implement session authentication, active-account checks, role/policy authorization, audit recording, and production-safe defaults.
Do not build document entry, finalization, printing, or restore yet. Do not expose a token/REST API unless separately approved.
Tests must cover login throttling, inactive users, role denial, self-deactivation/last-admin protection, and audit behavior. Run the relevant test/type/lint commands and report actual results.
```

### Prompt 2 — Catalog and financial engine

```text
Implement Phase 2 and the money-engine portion of Phase 3 only.
Create normalized units, categories, products, and their relationships. Implement Money using decimal-string inputs and integer cents only, then implement DocumentCalculator using V2.0 formulas and bounds.
Tax/discount amounts must be supplied by server-side policy, not trusted from the client. Add exhaustive unit tests for parsing, overflow, subtotal, tax, discount, grand total, source variance, amount received, and change.
Do not create finalization or approval workflows yet. Use MySQL-compatible migrations and run the test suite.
```

### Prompt 3 — Draft entry and snapshots

```text
Implement draft document creation/editing and the keyboard-first React entry page.
Resolve products, units, categories, and prices on the server. Persist immutable item snapshots. Snapshot effective entry/print controls from the parent period. Recalculate every derived value on the server and reject client-supplied authoritative totals/status/sequence fields.
Implement optimistic lock/version handling for updates. Add tests for inactive products, period state, source reconciliation enabled/disabled, stale updates, and catalog changes not mutating saved snapshots.
```

### Prompt 4 — Period finalization

```text
Implement the period lifecycle and FinalizePeriodDocuments action from V2.0.
Use DB::transaction, lock the period row, lock eligible documents, enforce the period's captured reconciliation policy, sort by business_date/event_time/provisional_order/id, assign unique contiguous official numbers, audit every change, and roll everything back on failure.
Run concurrency integration tests on MySQL. SQLite test success alone is insufficient evidence for lock correctness.
```

### Prompt 5 — Approvals and lifecycle protections

```text
Implement approval requests, atomic approval consumption, revision history, finalized-document voiding, period reopening, and guarded draft purge.
Approval validation, target/payload matching, protected mutation, and mark-used must happen in one transaction with row locks. Missing expiry and replay attempts must fail closed.
Purge is allowed only for an unnumbered draft without revision or official print history; audit snapshot and purge must share a transaction. Add permission, race-condition, replay, and rollback tests.
```

### Prompt 6 — Printing and reporting

```text
Implement read-only 80mm/A5 print-ready views, PDF/XLSX report exports, bundled font configuration, and print-request logs.
GET render/preview routes must be side-effect free. Log print requests using an authenticated POST and idempotency/request ID; do not claim that the browser can prove paper physically printed. Define report inclusion rules for voids, discounts, taxes, change, and unverified source totals. Test Khmer/English scripts and pagination.
```

### Prompt 7 — Backup and restore

```text
Implement full backup plus staged, journaled, recoverable restore as described in V2.0 Section 11.
Use an explicit table allowlist and dependency graph; validate archive paths, counts, checksums, sizes, schema compatibility, row structure, and FK relationships before touching live data. Stage files outside public executable paths; create and verify a pre-restore recovery point; clear sessions after restore.
Do not claim the DB transaction alone makes files + database atomic. Add tests for corrupt archives, path traversal, oversized archives, missing assets, failures mid-restore, successful recovery, and post-restore integrity.
```

### Prompt 8 — Final hardening and deployment

```text
Run the V2.0 release gate. Verify migrations from a clean MySQL database; run backend, frontend, static analysis, lint, formatting, build, browser, authorization, concurrency, backup/restore, and print layout tests.
Review production settings, secrets handling, upload safety, CSRF, rate limits, logs, backup retention, TLS/network exposure, local launcher behavior, and documented recovery.
Do not suppress tests, lower type-check levels, or claim commands passed without running them. Report failures and unresolved risks explicitly.
```

---

## 18. Definition of Done Checklist

A system built from this blueprint is complete only when the applicable items below are verified. Mark an item complete only with test/build/operational evidence.

### Architecture and access

- [ ] Feature-sliced modular monolith is implemented with clear domain actions and server-side policies.
- [ ] Session authentication, CSRF, login throttling, active-account checks, and role/location query scoping are verified.
- [ ] No privileged action relies solely on a hidden/disabled UI control.
- [ ] Last-active-admin and self-deactivation protections are enforced server-side.

### Financial and document integrity

- [ ] Monetary input accepts validated decimal strings; the domain layer performs integer-cents arithmetic only.
- [ ] `grand_total = subtotal + tax_amount - discount_amount`; reconciliation compares `source_total` against `grand_total`.
- [ ] Amount bounds and line/subtotal overflow are checked before persistence.
- [ ] Tax, discount, payment-method, rounding, and report inclusion policies are explicitly documented.
- [ ] Source reconciliation enabled/disabled behavior is tested; automatic source totals remain marked unverified.
- [ ] Line items preserve immutable product/category/unit/price snapshots.
- [ ] Product `unit_id` references the units master table; historical unit labels are snapshotted.
- [ ] Period state transitions and period-level settings snapshots are enforced.
- [ ] Official numbering is contiguous within the assigned range, transactionally allocated, globally unique by document number, and never reused after issuance/void.
- [ ] MySQL concurrency tests prove finalization and approval consumption are race-safe.
- [ ] Stale updates are rejected or explicitly reconciled using optimistic concurrency.

### Approvals, audit, and deletion

- [ ] Approval requires approved status, non-null/unexpired expiry, exact target/payload, unused status, and authorized actor.
- [ ] Approval validation, operation, and consumption occur in the same transaction.
- [ ] Finalized documents are voided rather than deleted, retaining their official numbers.
- [ ] Draft purge is re-validated inside a transaction and preserves a complete snapshot in audit history.
- [ ] Audit logs are append-only from normal application paths and avoid secrets/unnecessary personal data.

### Backup, restore, deployment, and printing

- [ ] Backup manifest inventories all required data/assets and verifies counts/checksums.
- [ ] Restore validates archive contents before modification and has a tested recovery path for both database and filesystem failures.
- [ ] A restore drill succeeds on a separate test instance; sessions/caches are handled safely after restore.
- [ ] GET preview/print-ready routes have no logging side effects; print requests use authenticated, idempotent logging.
- [ ] 80mm, A5, PDF, and XLSX outputs are checked for layout, Khmer/English fonts, totals, void handling, and audit fields.
- [ ] Deployment profile is explicit; Laravel's development server is not represented as production multi-user infrastructure.
- [ ] Secrets are not embedded in launchers; uploads are non-executable; network exposure and TLS are configured for the deployment.

### Verification

- [ ] Migrations run against the supported MySQL version from an empty database.
- [ ] Backend unit/feature/integration tests pass, including MySQL concurrency tests.
- [ ] Frontend tests, TypeScript typecheck, lint, formatting, and production build pass.
- [ ] Browser smoke/E2E tests cover login and a critical document workflow.
- [ ] Backup/restore, authorization, failure-injection, and operator acceptance checks pass.
- [ ] Known limitations and unresolved product decisions are documented; no test results are claimed without evidence.

---

## Appendix A. Explicit assumptions requiring confirmation per project

This reusable blueprint does not silently define the following domain-specific policies. Resolve them before go-live:

1. Tax jurisdiction, rates, tax-inclusive/exclusive pricing, tax rounding, exemptions, and invoice legal requirements.
2. Supported payment methods, partial/split payments, refunds, payment reversals, and change calculation rules.
3. Whether cashiers may see only their own records or records at a shared location; multi-location authorization model.
4. Whether administrator bypasses are allowed for voids, price changes, or period reopening; reviewer separation-of-duties rules.
5. How “gapless numbering” is legally/operationally interpreted for issued-but-void documents and reopened periods.
6. Data retention and export rules for audits, revisions, approvals, backups, and reports.
7. Deployment mode: one workstation, local multi-user LAN, or hosted environment; expected concurrency and availability.
8. Whether this is a single business with locations or a true multi-tenant SaaS. Tenant isolation is not implemented by this baseline.
9. Khmer/English document requirements, business identity/tax fields, printer models, and PDF engine choice.
10. Domain-specific safety/privacy requirements for clinical, warehouse, or other specialized workflows.
