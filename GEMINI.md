# SITCAD | SabahSprout Project Context & Guidelines

## 1. Project Overview
SabahSprout is a project by the SITCAD team. SabahSprout is an AI-powered kindergarten education management and learning system developed for the Sabah region (this is the region of focus for now). It targets three primary user groups: Teachers, Parents, and Students. The goal is to automate administrative reporting, provide AI-driven lesson suggestions and facilitate early intervention through progress tracking, based on the Malaysian national preschool curriculum as outlined in the Dokumen Standard Kurikulum dan Pentaksiran Semakan 2017, Kurikulum Standard Prasekolah Kebangsaan (DSKP KSPK semakan 2017).

## 2. Technical Stack
### Frontend
- **Framework**: Next.js (App Router)
- **Library**: ReactJS
- **State Management**: React Context / Hooks
- **Styling**: Tailwind CSS

### Backend
- **Framework**: FastAPI (Python 3.12.7)
- **Architecture**: RESTful API
- **Authentication**: Firebase Auth

### Databases & Storage
- **Relational**: PostgreSQL (via Google Cloud SQL) for structured user data and reporting.
- **NoSQL**: MongoDB or Firestore for flexible lesson plans and activity logs.
- **Analytical**: BigQuery for long-term student performance trends.

### Infrastructure (GCP)
- **Compute**: Cloud Run (Backend), Vercel (Frontend).
- **Functions**: Cloud Functions for asynchronous triggers (e.g., generating PDF reports).
- **AI/ML**: Vertex AI Studio (Gemini 1.5 Pro/Flash) for RAG over DSKP documents.

## 3. Domain Logic: DSKP KSPK Integration
All pedagogical suggestions and progress tracking must align with the "Kurikulum Standard Prasekolah Kebangsaan" (KSPK). Key focus areas (Tunjang) include:
- Tunjang Komunikasi
- Tunjang Kerohanian, Sikap dan Nilai
- Tunjang Kemanusiaan
- Tunjang Sains dan Teknologi
- Tunjang Fizikal dan Estetika
- Tunjang Keterampilan Diri

## 4. Coding Standards
- **Pattern**: Maintain a strict separation of concerns between the FastAPI backend and Next.js frontend.
- **Naming**: Use snake_case for Python/FastAPI and camelCase for JavaScript/React.
- **Documentation**: All API endpoints must include Type Hinting and Pydantic schemas for request/response validation.
- **Git**: Follow conventional commits (e.g., feat:, fix:, docs:, refactor:).

## 5. Development Priorities
1. Establish Firebase Authentication and User Role (Teacher/Parent/Admin) logic.
2. Implement RAG pipeline for DSKP document querying.
3. Build the student progress dashboard with PostgreSQL integration.
4. Deploy initial services to Google Cloud Run.