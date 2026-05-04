# Lexicon Merge Plan

**Status as of 2026-05-04:** Phase 0 diagnosis complete. Phases 1-4 pending next session.

This document is the resume-from-cold instruction set for merging `claude/review-lexicon-structure-Rn7s5` into main.

---

## Section 1 — State at end of Phase 0 diagnosis (2026-05-04)

**Main currently has:**
- 7-stage skeleton in `custom-lexicon.js` (488 lines)
- `id: 'texture'` at line 70 — empty stage shell
- `id: 'overall'` at line 98 — empty stage shell
- 11 references to "stages"
- No expanded attribute content

**Branches diagnosed:**
- `claude/update-texture-emotions-r0kHi` — `SUPERSEDED` (do not merge)
- `claude/review-lexicon-structure-Rn7s5` — `KEEP-MERGE` (target of this plan)

**Disk at end of diagnosis session:** 12 GiB free. Below 20 GiB target.

---

## Section 2 — Prerequisites before Phase 1

Verify ALL of the following before proceeding to Phase 1:

```
df -h /              # must show 20+ GiB free
git status           # must show "nothing to commit, working tree clean" on main
git fetch origin     # must succeed silently
```

If terminal looks at all weird (stuck `>` prompt, fragmented prior commands), Ctrl-C to clean prompt before continuing. Per CLAUDE.md: silent paste fragmentation is a known failure mode below 11 GiB free.

---

## Section 3 — Phase 1: create work branch

Single command. Does not modify main.

```
git checkout -b merge/lexicon-expansion-from-Rn7s5
```

Verify with:

```
git branch --show-current     # should output: merge/lexicon-expansion-from-Rn7s5
```

---

## Section 4 — Phase 2: the merge

Run on the work branch only. The `--no-commit` flag stages the merge without sealing it, allowing inspection and rollback. The `--no-ff` ensures a real merge commit (preserves rollback path).

```
git merge origin/claude/review-lexicon-structure-Rn7s5 --no-commit --no-ff
```

### Expected conflict hot spots, in priority order:

1. **`custom-lexicon.js`** — main's texture/overall skeletons (lines 70 and 98) vs Rn7s5's full content. Almost certainly take Rn7s5's version: `git checkout --theirs custom-lexicon.js`, then verify the file is structurally intact.

2. **`index.html`** — main may have form fields that Rn7s5 deleted as part of the dynamic-form rewrite (-336 lines on Rn7s5 side). Take Rn7s5's version if so.

3. **`industry-benchmarks.js`** — high risk per CLAUDE.md prior truncation history. `tail -3` and `wc -l` BEFORE and AFTER any conflict resolution on this file. If line count or ending looks wrong, abort.

4. **`app.js`** — 504 lines churn. May need genuine manual conflict resolution if main's `app.js` has diverged in non-lexicon ways.

5. **`demo-mode.js`, `batch-import.js`** — likely conflicts because of unmerged batch-import branches on main's history.

If a conflict is genuinely beyond mechanical resolution, `git merge --abort` and stop. Re-plan rather than guess.

---

## Section 5 — Phase 3: verification before commit

DO NOT `git commit` to seal the merge until ALL of the following pass.

### Per-file integrity (run on every modified file):

```
tail -3 <file>                      # confirm intact ending
node -c <file>                      # JS syntax valid (skip for HTML/CSS/MD)
wc -l <file>                        # line count reasonable
LC_ALL=C grep -n '[^ -~]' <file>    # ASCII-only (mandatory per CLAUDE.md)
```

### Lexicon content checks:

```
grep -c "id: 'texture'" custom-lexicon.js          # expect 1 (stage), or higher if attributes also use texture in id
grep -c "label:" custom-lexicon.js                 # expect ~242 if expansion is complete
grep -c "id: 'overall'" custom-lexicon.js          # expect 1 (stage)
grep -n "Overall Assessment" custom-lexicon.js     # expect at least one match
wc -l custom-lexicon.js                            # expect dramatic increase from 488
```

### Local visual test:

```
python3 -m http.server 8000
```

Then in browser at http://localhost:8000 — must verify ALL of:

1. App loads without console errors
2. Form shows all 7 stages: Appearance, Aroma, Front of Mouth, Mid/Rear Mouth, Texture, Aftertaste, Overall Assessment
3. Texture stage renders 101 attributes
4. Overall Assessment renders 21 attributes
5. Sliders default to 0, not 5 (confirm by inspecting initial DOM state)
6. No Claude/Anthropic branding in user-facing strings
7. CSV "Download Full Template" produces 262-column file
8. Demo products still render correctly

If any check fails, see Section 7 for rollback. Do not commit a partially working merge.

---

## Section 6 — Phase 4: ship

Only after Phase 3 passes completely.

```
git commit                                      # seals the merge with a default merge commit message
```

Bump service worker version (separate commit, separate concern):

```
# Edit service worker file to bump VERSION constant
# Then:
git add <sw-file>
git commit -m "Bump SW version for lexicon expansion deploy"
```

Fast-forward main onto work branch and push:

```
git checkout main
git merge --ff-only merge/lexicon-expansion-from-Rn7s5
git push origin main
```

Watch Vercel deploy at qeptastesignature.com. Hard refresh and possibly unregister service worker manually to bypass cache.

---

## Section 7 — Rollback if Phase 3 fails

The work branch is isolated from main. Failure costs nothing.

If mid-merge (before commit):

```
git merge --abort
```

If post-commit on work branch but pre-merge to main:

```
git checkout main
git branch -D merge/lexicon-expansion-from-Rn7s5
```

Either way: main is untouched, production is untouched.

---

## Section 8 — Open questions / known unknowns

1. **Did prior partial lexicon work in main introduce conflicts with Rn7s5's full version?** Skeleton stages at lines 70 and 98 of `custom-lexicon.js` suggest yes; conflict resolution will tell us how deep.

2. **Will Rn7s5's two already-live duplicate commits cause merge issues?** `912e8b7` (branding) and `85d009c` (sliders) are already in main per handoff. Git should no-op these. Watch for surprises.

3. **Does `r0kHi`'s 2-line `claude-api.js` change matter?** Inspect before declaring `r0kHi` fully deletable from origin. Command:

   ```
   git diff main...origin/claude/update-texture-emotions-r0kHi -- claude-api.js
   ```

4. **Are any of the other 15 unmerged branches relevant prerequisites?** Audit notes several with potential interactions (`fix-shape-of-taste-chart-YM8ec`, `slider-defaults-zero-wd4Rb`). Confirm none are blocking before Phase 1.

---

## Section 9 — After lexicon is live

Next session, separate work:

- Fix dormant imported products. Imported CSV products appear in Comparison views but are not active in Shape of Taste, Emotional Mapping, Portfolio Map. Goal: imported products fully indistinguishable from manually-evaluated ones. This fix depends on the lexicon being live, which is why it follows this merge.
