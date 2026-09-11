# Team workflow

1. Before starting work, update your local main branch:

   git switch main
   git pull --ff-only origin main

2. Create one short-lived branch per task:

   git switch -c feat/short-description

3. Keep commits small and focused. Never commit customer names or email addresses from the supplied data.

4. Run the relevant checks before sharing your work:

   pnpm build
   pnpm test

5. Push the branch and open a pull request into main. At least one teammate should review it before merging.

6. After a merge, everyone should pull main before beginning their next task. Resolve conflicts together; do not force-push shared branches.

## Branch names

- feat/... for new functionality
- fix/... for bug fixes
- docs/... for documentation
- chore/... for maintenance
