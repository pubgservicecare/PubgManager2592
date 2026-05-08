# Overview

This project is a pnpm workspace monorepo utilizing TypeScript, designed to build a multi-seller marketplace called `pubg-manager`. The marketplace allows sellers to register, list items, and manage their inventory, while administrators can review applications, manage sellers, and oversee listings. The core business vision is to provide a secure and verified platform for premium PUBG accounts.

Key capabilities include:
- Seller self-registration with CNIC verification.
- Admin approval and management of seller accounts.
- Listing management for sellers (create, edit, delete).
- Customer-facing listings with privacy controls.
- Admin dashboards for insights and activity logging.
- Integrated chat system for admin-customer and admin-seller communication.
- Installments management: per-payment due dates (manual), scheduled vs paid payments, edit & non-destructive reverse, overdue/due-soon alerts on admin dashboard, customer portal `/my/installments`, downloadable PDF receipts (pdfkit) with business branding.

The project emphasizes a robust backend using Express 5, PostgreSQL with Drizzle ORM, and Zod for validation, coupled with OpenAPI for API specification and code generation.

# User Preferences

I prefer concise and accurate responses. Please prioritize functionality and security in development. For any major architectural changes or significant feature implementations, I would like to be consulted before execution. Ensure that all database interactions are handled with Drizzle ORM.

# System Architecture

The project is structured as a pnpm workspace monorepo.

**Monorepo Structure:**
- `artifacts/`: Deployable applications, currently containing `api-server`.
- `lib/`: Shared libraries including `api-spec`, `api-client-react`, `api-zod`, and `db`.
- `scripts/`: Utility scripts for various tasks.

**Technology Stack:**
- **Monorepo Tool**: pnpm workspaces
- **Node.js**: 24
- **Package Manager**: pnpm
- **TypeScript**: 5.9 (all packages extend `tsconfig.base.json` with `composite: true`)
- **API Framework**: Express 5
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API Codegen**: Orval (from OpenAPI spec)
- **Build Tool**: esbuild (CJS bundle)

**Core Architectural Decisions:**
- **Type Checking**: Full monorepo type-checking is enforced from the root using `tsc --build --emitDeclarationOnly`, leveraging TypeScript's project references for correct dependency resolution and efficient build processes.
- **API Design**: An OpenAPI 3.1 specification (`openapi.yaml`) drives API client and schema generation, ensuring consistency between frontend and backend.
- **Data Persistence**: Drizzle ORM is used for all database interactions, with schema definitions and migrations managed within the `lib/db` package.
- **Validation**: Zod schemas are generated from the OpenAPI spec (`lib/api-zod`) and used by the `api-server` for request and response validation.
- **UI/UX (Implicit)**:
    - Account images support `text[]` for multiple images, with the first as cover.
    - Status lifecycle for listings (active, reserved, under_review, hidden, sold, installment) with admin control.
    - Soft delete mechanism for accounts using `deletedAt` timestamps.
    - Activity logging with actor, action, entity, and message for auditability.
    - Comprehensive admin settings for site configuration.
    - Public visibility of listings is restricted to `active` status only.
    - Customer privacy is maintained by stripping sensitive seller/customer data from public API responses.
    - Unified authentication pages for customer and seller login/signup.
    - Marketplace polish including verified badges, clear pricing, and enhanced CTAs.
    - Signup flow enforces customer-first registration before becoming a seller.
    - Seller suspension/deletion cascades to hide/soft-delete associated listings.

**Feature Specifications:**
- **Multi-Seller Marketplace**:
    - `/seller/signup`: Seller registration with CNIC verification.
    - `/admin/sellers`: Admin review and management of seller applications.
    - `/seller/dashboard`: Seller listing management (create, edit, delete).
    - Listings display seller name to customers.
    - Listing media handled via object storage with presigned URLs.
    - Account image handling for cover and gallery.
    - Listing status lifecycle for admin approval and sales flow.
    - Soft deletion of listings.
    - Activity logs for system actions.
    - Customizable site settings via admin UI.
    - Printable admin manual (`/admin/docs`).
    - Customer privacy: Public account responses exclude sensitive seller/customer data.
    - Seller pricing: `purchasePrice` and `priceForSale` visible only to sellers and admins.
    - Admin "listed by" view for filtering listings.
    - Per-seller dashboard with stats for admins.
    - Case-insensitive email normalization for seller login/signup.
    - Unified authentication pages (`UnifiedLogin`, `UnifiedSignup`) for customer/seller.
    - Marketplace homepage enhancements with clear CTAs and trust elements.
    - Signup flow revamped: customer-first, then "Become a Seller" via CNIC verification.
    - Seller suspend/delete cascade to associated listings.
- **Admin↔Seller Chat**:
    - Customers can only contact admin.
    - Admin can initiate chat with sellers from account/seller detail pages.
    - Seller dashboard includes "Chat with Admin" panel.
    - `chat_sessions.seller_id` and `chat_messages.sender` enum extended.
    - Chat authorization logic restricts access based on user role and session ID.
    - Endpoints for `seller/chat-status`, `customer/chat-status`, and `admin/chat/sessions`.

# External Dependencies

- **PostgreSQL**: Primary database for all data persistence.
- **Orval**: Used for generating API clients and Zod schemas from an OpenAPI specification.
- **esbuild**: Employed for bundling the API server into a CJS format.
- **CORS**: Express middleware for handling Cross-Origin Resource Sharing.
- **PG**: PostgreSQL client library used by Drizzle ORM.