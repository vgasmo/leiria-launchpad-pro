---
name: Program Support Materials Upload
description: Consultors upload PPT/PDF support materials per program; founders see them under Documents → "Materiais do Programa" sub-tab
type: feature
---
Consultors can upload program-scoped support materials (slides, PDFs, etc.) via `UploadSupportMaterialDialog` from `SupportMaterialsTab`. Materials are stored in the private `support-materials` Supabase Storage bucket with the path convention `<program_id|'global'>/<material_id>/<filename>`.

**Visibility rule:** founders see materials in their workspace via `ProgramMaterialsPanel`, rendered as the `program` sub-tab inside `DocumentsTab`. The hook `useSupportMaterials({ programId })` returns globals (program_id IS NULL) ∪ materials of the workspace's program; pass `requireProgram: true` to exclude globals.

**Storage RLS:** staff can upload/delete; select is allowed for staff and for users whose `workspace.program_id` matches the first folder segment of the object path. Files are served via short-lived (5-min) signed URLs from `useSupportMaterialDownloadUrl`.

**Upload flow:** create row (status='approved') → upload file under `<program>/<material_id>/...` → patch row with `file_path`. Always set status='approved' for consultor uploads so founders see them immediately (per `mem://security/support-materials-visibility`).
