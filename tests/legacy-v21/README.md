# v0.21 test archive

These 132 historical tests target the v0.21 card IDs and rules. Reproduce them at commit 5ff9446f815828d6588e8e29ae6f547d0bbcd5ef. This directory is excluded from `npm test` and is not a passing compatibility suite for the new card pool.

The first 53 v0.22 tests did not replace all still-applicable regression coverage. That gap is explicitly acknowledged. The active suite now includes 75 additional regression and full-acquisition tests (128 total, in `tests/*.test.mjs`). Retained behavior, changed rules, retired assertions, fixture limits and commands are documented in [the coverage migration report](../../docs/test-coverage-v0.22.md). Test counts are not a one-to-one coverage equivalence claim.
