# PixelQubed studio and S&box handbook

The studio uses pre-rendered HTML, locally bundled JavaScript and one shared presentation stylesheet. Node.js runs the development server, website build and private portfolio editor. The S&box reference exporter remains a separate Python tool: existing snapshot records, stable identities and public filtering are preserved.

## Continuous development

From `P:/Git/pixelqubed.github.io`, with Node.js 22.12+ (the verified local runtime is Node 24.19):

```powershell
npm ci --ignore-scripts
npm run dev
```

Open **http://127.0.0.1:5173/** and leave it open. Vite 8.2.2 updates website styles and modules on save, and reloads ordinary scripts/HTML. Reference template edits refresh four representative handbook pages, not the entire corpus. The representative CameraComponent.RenderToTexture entry and landing SceneTrace.Run lens use real exported records. Other handbook routes fall back to the existing full public export.

The current defaults in `dev.mjs` point to this local task's reference worktree, public export and ignored preview directory. Override them with `PIXELQUBED_REFERENCE_WORKTREE`, `PIXELQUBED_HANDBOOK_EXPORT`, `PIXELQUBED_PREVIEW_DIR`, `PIXELQUBED_LIBRARY` and `PIXELQUBED_PYTHON` when moving the checkout. Python is used only for the reference template projection; the website servers and build are Node.js.

Shared presentation source: `P:/Git/bottled-up/.sbox-reference/design-worktree/tools/sbox_reference/presentation/design.css`. Its emitted website copy is `assets/design.css`. Edit the shared source; the running watcher keeps both presentations in sync. The website remains a multi-page site; no replacement application framework or runtime CDN is used.

## Build a complete local preview

After the final public handbook export, assemble the website around it:

```powershell
node build-preview.mjs --out P:/Git/bottled-up/.sbox-reference/design-review-20260910/integrated --handbook P:/Git/bottled-up/.sbox-reference/design-review-20260910/integrated/sbox/handbook --library P:/Git/bottled-up/.sbox-reference/portfolio-library
node preview-server.mjs --root P:/Git/bottled-up/.sbox-reference/design-review-20260910/integrated --port 8767
```

Routes: `/`, `/#portfolio`, `/#contact`, `/terms/`, `/sbox/handbook/`, `/sbox/handbook/api/`, `/sbox/handbook/api/catalogue.html`, `/sbox/handbook/graph/`.

The build checks identical shared styles, preserves handbook routes and includes only selected portfolio entries. Titles, descriptions and credits are pre-rendered. The interactive model viewer loads near the viewport. This command does not publish or deploy anything.

## Private portfolio studio

```powershell
npm run studio -- --library P:/Git/bottled-up/.sbox-reference/portfolio-library --port 8768
```

Open **http://127.0.0.1:8768/**. Upload a self-contained GLB, edit its title, description, attribution and exposure, then choose whether to include it in the local portfolio. New models start as private drafts. Orbit, pan and zoom in the editor and use **Save current framing** to store a model-specific default camera. Existing framing survives later metadata edits. The running development preview updates when the library changes.

The editor binds only to loopback. Writes require the session token and exact origin/host. Editor source, API routes and the private library are excluded from the public build and blocked on the Vite preview. A hidden public URL is not the privacy boundary.

Models are limited to 64 MiB. External buffers/textures and compressed extensions requiring separate decoders are rejected. Export an embedded-texture GLB from your art application. The supplied sword remains a labelled viewer example; its authorship/publication attribution is unresolved. The source under `V:/Downloads/Browser` is unchanged.

## Interactions and inspection

- Qube: drag any row, including middle layers; the selected row glows once the direction is established. Right-drag or drag outside the object to rotate it. Scramble, Undo, Solve and Reset use the same puzzle state. Solve retraces session moves; Reset does not celebrate. Keyboard shortcuts were removed as requested; buttons retain native focus and activation. Real WebGL multisample antialiasing uses the existing locally bundled renderer, with the CSS object as a fallback. Directional particles are finite and disabled with reduced motion.
- Material: neutral studio lighting preserves the supplied material appearance. Tall assets receive a portrait composition. Saved camera framing takes precedence over automatic framing.
- Wireframe: antialiased edges with a restrained hover glow; keyboard focus also illuminates it.
- Normals: a direction spectrum and adjustable sampled surface vectors, bounded to approximately 1,600.
- UV layout: per-material UV0, sampled at 192 x 192 in the 0–1 tile. Coverage, overlapping samples, out-of-tile triangles and degenerate triangles are separate facts. **Texel density and sensible distribution matter more than packing percentage.** The meter is not a production-readiness or optimisation grade.
- Brain: live procedural left/right cortical geometry, a tucked rear cerebellum and a separate short stem, with 290 interior neurons and selectively shuffled local connections. The hemispheres meet at a narrow fissure; section-relative formation, slow rotation and local simulated activity remain. The geometry is a decorative anatomical interpretation. The opening has stars only. Reduced motion shows static information; hidden pages pause rendering. Ordinary handbook entries load neither the brain nor model effects.

## Checks

```powershell
npm test
```

This covers puzzle layer closure/reversal, UV analysis, GLB validation, public/draft filtering, safe paths, framing preservation, escaped pre-rendered content and editor write protections. Browser captures and motion evidence are retained in `P:/Git/bottled-up/.sbox-reference/design-refinement-20260910/`.

Discord is preferred: https://discord.com/users/196682910768562179 (`@PixelQubed`). Email: `pixelqubed@pm.me`. The portfolio separates agent-assisted software from artwork, which does not and will not involve agentic tools. Commission legal paragraphs remain unchanged.

Generated dependencies and local preview outputs stay local. The website is published through the GitHub Pages workflow described below; the private editor and library remain excluded from the public repository and deployment.

## GitHub Pages delivery

GitHub Pages deploys a validated public artifact through `.github/workflows/pages.yml`. Pull requests test and build; main-branch pushes build and deploy through the `github-pages` environment. The repository root is not the publishing directory, so `editor/`, local library data, Node tooling and dependencies are absent from the deployed site.

`public-content/handbook-public.tar.gz` is the compressed, public-filtered reference snapshot, pinned by SHA-256 and snapshot identity in `public-content/manifest.json`. It is generated by the authoritative reference exporter; do not hand-edit its HTML. `public-content/portfolio/` contains only deliberately included public models and public metadata. No raw reference database, engine snapshot or private portfolio library is checked in there.

Reproduce the deployment build with Node.js 22.12+ and the system `tar` command (present on the tested Windows machine and GitHub Ubuntu runner):

```powershell
node build-published.mjs --out P:/Git/bottled-up/.sbox-reference/new-public-build
```

Choose a fresh output directory outside the website source checkout. The public build verifies the snapshot checksum, rejects unsafe archive members, uses the current website source and shared CSS, and emits `deployment.json` with the source revision when run by GitHub Actions. Nothing is deployed by this local command.

Portfolio changes made in the private studio update the local development preview. Publishing them is a separate deliberate source/release update: build the filtered local portfolio, refresh the versioned `public-content/portfolio/` input with included entries only, then review and merge the change. Never copy `library.json` or private drafts into `public-content/`.

The private editor UI (`editor/`) is deliberately local-only and ignored by Git, as is the private library outside this checkout. The existing machine retains the complete working editor and a local backup; a fresh public checkout does not contain that UI. Public tests use a minimal synthetic token page to exercise server access controls without committing the private interface. The public model viewer and publishing build remain self-contained.
