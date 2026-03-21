# AI CRIMINAL SKETCH GENERATOR - Next Execution Plan

## Current Status Summary

### What is working now
- Flask backend is running and responds on health endpoint.
- Flask-served frontend is running at root and can submit description-based generation requests.
- Voice-to-text flow works through Groq transcription and returns text to the UI.
- Image generation works through Hugging Face provider adapter.
- Generated images are uploaded to Supabase Storage with signed URL access.
- Pencil-only mode can be enforced with PENCIL_ONLY=true.

### What is already done in Supabase
- Supabase project URL and keys are configured in environment.
- Database URL format is corrected for connection usage.
- Core tables were created in Supabase SQL Editor:
  - users
  - cases
  - sketches
  - refinements

### What is not yet implemented in app code
- No RLS policy-aware data access flow in app logic.

## Execution Goal
Deliver a secure case-based criminal sketch application where each authenticated user can create, manage, and refine sketches inside isolated cases.

## Delivery Phases

## Progress Snapshot (March 19, 2026)
- Phase 1: Completed in code (backend auth endpoints, JWT guard, frontend auth UI/session token flow).
- Phase 2: In progress (database repository layer + case APIs + case-aware generation metadata write + auth-first Flask UI).
- Phase 3: Completed in code (case-first workflow, versioned sketch/refinement APIs, timeline rendering).
- Phase 4: Completed in code (Supabase Storage uploads, versioned object paths, signed URL rendering).
- Phase 5: In progress (request-id tracing, structured error model, endpoint rate limits, smoke test suite, deployment check script).

### Current Implementation Delta
- Backend refactored from one large edge_api app file into focused middleware, route blueprints, utility helpers, and database repositories.
- New case endpoints are active:
  - POST /cases/create
  - GET /cases/list
  - GET /cases/{case_id}
- Phase 3 endpoints are active:
  - POST /sketch/generate
  - POST /refine/add
  - GET /cases/{case_id}/timeline
- Generation and refinement now enforce case ownership checks before writes.
- Storage migration is active:
  - artifacts upload to Supabase Storage bucket
  - case path conventions are enforced for sketch/refinement versions
  - signed image URLs are returned and rendered by UI
- Reliability and security hardening is active:
  - request-id context and X-Request-Id response headers
  - structured error model for middleware and global error handlers
  - configurable rate limits on expensive endpoints
  - smoke test coverage for auth/cases/generate/refine
  - deployment smoke check script for env + health validation
- Frontend migrated from Streamlit to Flask templates + static JS/CSS.
- Active frontend switched to forensic-canvas (Lovable React/Vite) served by Flask.
- forensic-canvas is wired to backend auth/cases/sketch/refine/timeline endpoints.
- Root page now enforces auth-first UI flow before showing the app workspace.
- Frontend now supports case creation/selection, base sketch generation, refinement submission, and chronological timeline rendering.

### Frontend Organization + Integration Update (March 19, 2026)
- forensic-canvas frontend routing was normalized with shared route constants to reduce hardcoded path drift across pages/components.
- API access was consolidated behind a single request helper in `src/lib/api.ts`:
  - common error parsing
  - optional authenticated request mode
  - request-id capture from backend error envelopes/headers
  - configurable base URL support through `VITE_API_BASE_URL`
- Local development connectivity was simplified:
  - Vite proxy now forwards `/auth`, `/cases`, `/sketch`, `/refine`, and `/health`
  - proxy target is controlled by `VITE_BACKEND_ORIGIN` (default `http://127.0.0.1:5000`)
- Added `forensic-canvas/.env.example` to standardize frontend-backend connection setup for new environments.
- Result: frontend can run in same-origin Flask mode or standalone Vite mode with minimal config changes.

### Backend Phase 2 + 3 Update (March 19, 2026)
- Added lightweight request validation schema layer at `backend/schemas/requests.py` and wired it into:
  - `POST /auth/signup`
  - `POST /auth/login`
  - `POST /auth/password-reset`
  - `POST /cases/create`
  - `POST /generate-image-api`
  - `POST /sketch/generate`
  - `POST /refine/add`
- Added safe SQL request logging in `backend/services/database/client.py`:
  - request-id correlated logs
  - method/path/status/duration visibility
  - parameter/body key logging only (no secret or payload value logging)
  - controlled by `DB_QUERY_LOG_ENABLED` (default true)
- Added DB hardening SQL script at `backend/services/database/phase2_phase3_hardening.sql`:
  - required composite indexes for case/sketch/refinement timelines
  - unique case-version sketch index
  - RLS enablement and ownership policies for users/cases/sketches/refinements
  - policy logic aligned to case ownership (`auth.uid()`) for multi-tenant isolation

## Phase 1 - Authentication Foundation (Auth First)

### Scope
- Add auth service layer in backend.
- Add JWT validation middleware for protected routes.
- Add auth endpoints:
  - POST /auth/signup
  - POST /auth/login
  - POST /auth/password-reset
- Add frontend auth screens and session handling.

### Backend tasks
- Create backend/services/auth/supabase_auth.py for auth operations.
- Implement token verification helper using Supabase JWT settings.
- Add request guard decorator for protected endpoints.
- Keep GET /health public.

### Frontend tasks
- Add frontend login/signup form.
- Persist access token in client session storage.
- Attach bearer token to protected API calls.

### Acceptance checks
- Unauthenticated call to protected endpoint returns 401.
- Valid token allows endpoint access.
- Signup/login/password-reset all return expected responses.

## Phase 2 - Database Integration and Data Services

### Scope
- Add a database service layer and repository-style CRUD.
- Wire Supabase Postgres operations into Flask endpoints.
- Enforce ownership checks using authenticated user id.

### Backend tasks
- Create backend/services/database/client.py for DB connection lifecycle.
- Create modules:
  - backend/services/database/users_repo.py
  - backend/services/database/cases_repo.py
  - backend/services/database/sketches_repo.py
  - backend/services/database/refinements_repo.py
- Add lightweight request validation schemas for payloads.
- Add SQL query logging with request id (no secret logging).

### Database hardening tasks
- Confirm indexes exist for high-traffic filters:
  - cases(user_id, created_at)
  - sketches(case_id, created_at)
  - refinements(case_id, created_at)
- Add or confirm RLS policies for per-user isolation.

### Acceptance checks
- App can create/read case records for the authenticated user.
- App cannot read another user cases.
- Sketch and refinement records write successfully with foreign key integrity.

## Phase 3 - Case Workspace and Feature Organization

### Scope
- Restructure UX around case-first flow.
- Every sketch generation/refinement must happen inside a selected case.

### API endpoints to implement
- POST /cases/create
- GET /cases/list
- GET /cases/{case_id}
- POST /sketch/generate
- POST /refine/add

### Frontend workflow
1. User logs in.
2. User creates or selects case.
3. User enters description or voice transcript.
4. User generates base sketch.
5. User adds refinements and sees version timeline.

### Data rules
- Each generated image creates a sketches row with incremented version.
- Each refinement action creates a refinements row and new sketch version.
- All reads and writes are filtered by case ownership.

### Acceptance checks
- Case list displays only user-owned cases.
- Generation endpoint requires case_id.
- Refinements append version history in chronological order.

## Phase 4 - Storage Migration and Versioned Assets

### Scope
- Move artifact storage from local disk to Supabase Storage.
- Keep local temp only for short processing windows.

### Tasks
- Create storage adapter backend/services/storage/supabase_storage.py.
- Use object paths:
  - cases/{case_id}/sketches/sketch_{version}.png
  - cases/{case_id}/refinements/refine_{version}.png
- Store signed URL or storage path in sketches table.

### Acceptance checks
- New images are uploaded to Supabase Storage.
- UI renders image from signed URL.
- No persistent dependency on local data/images.

## Phase 5 - Reliability, Security, and Release Readiness

### Tasks
- Add structured error model and request id tracing.
- Add rate limits for expensive generation endpoints.
- Add smoke tests for auth, cases, generate, refine flows.
- Add deployment checks for backend and frontend services.

### Acceptance checks
- Core smoke suite passes in staging.
- Unauthorized and cross-user access is blocked.
- End-to-end case workflow completes without manual DB intervention.

## Implementation Order (Concrete)
1. Build auth middleware and auth endpoints.
2. Integrate database repositories and protected CRUD.
3. Implement case-first frontend and required API endpoints.
4. Switch image persistence to Supabase Storage.
5. Add tests, hardening, and deployment validation.

## Definition of Done
- Auth is enforced on all non-health endpoints.
- Case-based workflow is the default and only working path.
- Sketches and refinements are versioned and queryable per case.
- Storage and metadata are persisted in Supabase-backed services.
- Basic automated smoke tests protect the core user journey.
