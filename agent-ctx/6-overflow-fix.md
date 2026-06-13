# Task 6: Fix scrollability/overflow issues in rvsm-panel.tsx

## Summary
Fixed all overflow and scrollability issues in the RVSM (Remote Vital Sign Monitoring) panel component (~3197 lines).

## Changes Made

### Charts (12 ResponsiveContainer instances)
- Wrapped each `<ResponsiveContainer>` in `<div className="w-full overflow-hidden">` to prevent horizontal overflow
- Added `min-w-0` to grid containers and Card components holding charts
- Applied to: 5 trend tab charts + 6 dialog charts + 1 score trend chart

### Dialogs (5 instances)
- Changed all DialogContent to use `max-h-[90vh] flex flex-col` pattern
- Added `shrink-0` to DialogHeader and DialogFooter
- Wrapped content in `flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4 pr-1`
- Dialogs: Add Device, Add Family Access, Real-Time, Trend, Skor Paliatif

### Table (1 instance)
- Wrapped audit trail `<Table>` in `<div className="overflow-x-auto table-scroll-wrapper">`

### TabsContent (11 instances)
- Added `overflow-y-auto custom-scrollbar` to all 11 TabsContent elements

### Dashboard/Cards
- Added `min-w-0` to grid containers, Card elements, flex containers
- Added `shrink-0` to icon containers
- Added `truncate` to text that might overflow (device names, type labels, etc.)

### Alert/Warning Lists
- Standardized max-height constraints: `max-h-[400px]` for main lists, `max-h-[200px]` for smaller sub-lists

## Verification
- `bun run lint` passes with no errors
- Dev server compiles successfully
