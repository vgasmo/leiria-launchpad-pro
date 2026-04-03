
# Audit Fix Plan — 3 Batches

## Batch 1: Data Integrity + Contract Lifecycle + Release Wrapper
1. **Package.json cleanup**: Move test deps to devDependencies, rename package
2. **Contract creation invariant**: Add DB trigger to ensure contract_id on critical intake states
3. **Orphan contract detection**: Query and flag contracts linked to rejected leads
4. **Transition guards**: Add validation trigger for intake status transitions
5. **.gitignore/.env**: Report read-only constraint, document residual risk

## Batch 2: Founder/Staff Trust + Public UX
6. **Public token error UX**: Replace technical errors with user-friendly messages in contract intake/signing pages
7. **Space occupancy validation**: Check if 0/106 is real data or bug
8. **Email failure feedback**: Ensure staff sees clear feedback on failed sends

## Batch 3: Code Quality + Polish
9. **React ref warnings**: Fix ScrollToTop and EcosystemHeatmap
10. **Tour conditioning**: Hide tour for admins, improve copy
11. **Minor label/UX fixes**
