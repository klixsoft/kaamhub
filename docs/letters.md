# Company letters

KaamHub prints offer letters, appointment letters, NDAs, certificates and any other letter on your company letterhead, numbers them, emails them and keeps them on each person's profile.

Open **Letters** in the sidebar. Super Admins, Admins and HR can manage letters.

## 1. Set up the letterhead

Open **Letters → Letterhead**.

| Setting | Description |
|---|---|
| Letterhead | One full A4 page as a PNG or JPG image, up to 5 MB, with your logo, address and footer where they should print. Export it from your design tool at 1240 × 1754 pixels (150 dpi) or 2480 × 3508 pixels (300 dpi). It is used as the background of every page |
| Top, bottom, left and right (mm) | How far from each edge of the page the text may start, so it never covers your letterhead. Measure your header and footer, then add a few millimetres of space |
| Number prefix | Printed before the letter number. `LTR-` gives `LTR-2026-0001`. Numbering restarts every year |
| Signatory name and title | Printed under a signature line at the end of every letter. Leave the name empty to leave the block out |

Use **Preview** on any template to check the margins on a real page. Long letters continue onto new pages with the letterhead repeated and the page number printed above the bottom margin.

Replacing the letterhead does not change letters issued earlier: each letter keeps the letterhead and margins it was issued with.

## 2. Templates

Open **Letters → Templates**. **Add starter templates** creates five drafts to adapt: Offer letter, Appointment letter, Non-disclosure agreement, Experience letter and Salary certificate. Review them with your lawyer or HR advisor before using them; they are starting points, not legal advice.

Each template has a name (only shown inside KaamHub), a heading printed on the letter and the letter text.

### Formatting

| Write | Result |
|---|---|
| A blank line | New paragraph |
| `# Terms of the offer` | Heading |
| `- Start date: 1 January` | Bullet point |
| `**Senior Engineer**` | **Bold** text |

### Placeholders

Placeholders in double braces are replaced when the letter is issued. Click a placeholder below the text box to insert it.

| Placeholder | Filled with |
|---|---|
| `{{recipient.name}}`, `{{recipient.email}}` | The person's name and email |
| `{{recipient.designation}}`, `{{recipient.department}}`, `{{recipient.manager}}` | From their profile |
| `{{recipient.employee_code}}`, `{{recipient.engagement}}` | Employee code and engagement type |
| `{{recipient.joined_on}}`, `{{recipient.ends_on}}` | Joining date and engagement end date |
| `{{company.name}}` | Company name from **Settings** |
| `{{company.legal_name}}`, `{{company.address}}` | Registered name and address from **Billing**, falling back to the company name |
| `{{signatory.name}}`, `{{signatory.title}}` | From the letterhead settings |
| `{{letter.number}}`, `{{letter.date}}` | Added when the letter is issued |

Any other name, for example `{{salary}}`, `{{position}}` or `{{probation_period}}`, becomes a field to fill in when the letter is issued. The same happens for a profile placeholder when that detail is missing from the person's profile.

## 3. Issue a letter

Click **Issue letter**, either on **Letters** or on a person's page under **People**:

1. Choose the person and the template.
2. Fill in the details the template asks for.
3. Check the heading, date and text. You can edit the text for this one letter without changing the template.
4. Leave **Email the PDF** on to send it to the person, then click **Issue letter**.

The letter gets the next number and is listed on **Letters**, on the person's page and under **My profile → My letters** for the person. KaamHub refuses to issue a letter while any placeholder is still unfilled.

Letters can be issued to employees and freelancers, including inactive people, for example for an experience letter after they leave. Clients cannot receive letters.

## 4. After issuing

| Action | Where | What happens |
|---|---|---|
| Open or download the PDF | Row menu, or the letter's title | The PDF is generated from the stored text, letterhead and margins |
| Email again | Row menu | Sends the PDF to the person again |
| Revoke | Row menu, with a reason | The letter stays on record with a **REVOKED** watermark and disappears from the person's My letters. It cannot be undone; issue a new letter instead |

Every issue, email and revocation is recorded in the audit log.

## Who can see what

| Role | Access |
|---|---|
| Super Admin, Admin, HR | All letters, templates and settings; issue, email and revoke |
| Everyone else | Only their own issued letters, under **My profile → My letters** |

Letter PDFs are served only to signed-in users with access; a person asking for someone else's letter gets "not found".
