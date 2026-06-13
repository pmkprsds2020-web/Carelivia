# Task 4 - Fix scrollability/overflow issues in social-needs-screening-panel.tsx

## Agent: Main Agent

## Summary
Fixed scrollability/overflow issues across all 3 tabs of the Social Needs Screening Panel component by changing from fixed-height clipping layout to natural scroll layout.

## Changes Made
1. **Main wrapper**: Changed `overflow-hidden` to `min-h-0 overflow-y-auto` for both embedded and standalone modes
2. **Screening Tab**: Removed `h-full` and height-constraining classes, added `max-h-[60vh] overflow-y-auto custom-scrollbar` to CardContent, made nav buttons sticky
3. **All TabsContent**: Added `overflow-y-auto custom-scrollbar` (screening was `overflow-hidden`, results/monitoring already had `overflow-y-auto` but lacked `custom-scrollbar`)

## Verification
- Lint passes cleanly
- Dev server compiles without errors
