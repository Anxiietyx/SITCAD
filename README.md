# SabahSprout (SITCAD)

AI-powered kindergarten education management and learning system developed for the Sabah region.

## 🚀 Project Overview
SabahSprout is an AI-driven platform designed to automate administrative reporting, provide AI-driven lesson suggestions, and facilitate early intervention through progress tracking. It aligns with the Malaysian national preschool curriculum (**DSKP KSPK Semakan 2026**).

### Targeted Users
- **Teachers**: Manage classrooms, track student progress, and generate AI-assisted lesson plans.
- **Parents**: Monitor their child's development and communicate with teachers.
- **Admins**: Manage users and view system-wide analytics.

## 🛠️ Technical Stack
### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (App Router) / [React](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Components**: Radix UI / Shadcn UI
- **State Management**: React Context / Hooks
- **Authentication**: [Firebase Auth](https://firebase.google.com/docs/auth)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12+)
- **ORM**: [SQLAlchemy](https://www.sqlalchemy.org/)
- **Database**: PostgreSQL (Google Cloud SQL)
- **Auth SDK**: Firebase Admin SDK
- **AI/ML**: Vertex AI

## 📖 Domain Logic: DSKP KSPK
The system integrates pedagogical suggestions based on:
- Tunjang Komunikasi
- Tunjang Kerohanian, Sikap dan Nilai
- Tunjang Kemanusiaan
- Tunjang Sains dan Teknologi
- Tunjang Fizikal dan Estetika
- Tunjang Keterampilan Diri

## 🗺️ Roadmap
- [x] Firebase Authentication and User Role logic.
- [ ] RAG pipeline for DSKP document querying.
- [ ] Student progress dashboard with PostgreSQL integration.
- [ ] Deployment to Google Cloud Run.
