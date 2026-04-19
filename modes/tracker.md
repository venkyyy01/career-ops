# Mode: tracker — Application Tracker

Read and display `data/applications.md`.

**Tracker format:**
```markdown
| # | Date | Company | Role | Score | Status | PDF | Report |
```

Valid statuses: `Evaluated` → `Applied` → `Responded` → `Interview` → `Offer` / `Rejected` / `Discarded` / `SKIP`

- `Applied` = candidate submitted their application
- `Responded` = A recruiter/company reached out and the candidate responded (inbound)
- `Interview` = Active interview process

If the user asks to update a status, edit the corresponding row.

Also show statistics:
- Total applications
- By status
- Average score
- % with PDF generated
- % with report generated
