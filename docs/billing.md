# Invoicing, taxes and managed services

KaamHub invoices clients in any country. It does not assume any tax rules: you add the taxes each invoice needs, and administrators set the currency, numbering and document style once in **Billing** settings.

> KaamHub is not certified by any tax authority. Some countries require registered billing software, real-time reporting or e-invoicing. Check your obligations with a local accountant.

## Billing settings

Open **Billing** in the sidebar (Super Admin and Admin).

| Setting | Purpose |
|---|---|
| Registered company name, address, contact | Printed as the seller on every invoice |
| Tax number label and your tax number | e.g. “VAT No.”, “GSTIN”, “EIN” or “Tax ID”. Printed for you and your clients |
| Currency code, symbol, names and number format | Used for every amount. Number format is 100,000 or 1,00,000 (lakh/crore) |
| Print the total in words | Adds “Dollars One Hundred Only” style text where invoices are expected to show it |
| Document title | e.g. “Invoice” or “Tax Invoice” |
| Number prefix | e.g. `INV-` gives `INV-2026-0001` |
| Credit note prefix | e.g. `CN-` gives `CN-2026-0001` |
| Fiscal year starts in | Invoice numbers restart each fiscal year |
| Calendar | Gregorian, or Gregorian with Bikram Sambat dates and fiscal year (Nepal) |
| Payment terms | Default due date for new invoices |
| Create recurring drafts | How many days before a service's billing date its draft is prepared |
| Payment details and footer | Printed at the bottom of the invoice |

## Taxes

Taxes are added on each invoice, so one installation can handle VAT, GST, sales tax, withholding, service charges or no tax at all.

Each tax line has:

| Field | Example |
|---|---|
| Name | VAT, GST, Sales tax, Service charge |
| Type | **Percentage** of the taxable amount, or a **fixed amount** |
| Value | `13` for 13%, or `50.00` for a fixed amount |

The invoice calculates:

```
Subtotal        = sum of item quantity × rate
Taxable amount  = Subtotal − Discount
Each tax        = Taxable amount × rate / 100   (percentage)
                = amount as entered             (fixed)
Total           = Taxable amount + all taxes
```

Each tax is printed as its own line on the invoice and the PDF. Use up to ten taxes per invoice.

## Invoice lifecycle

```
Draft ──issue──▶ Unpaid ──payment──▶ Partially paid ──payment──▶ Paid
  │                 │
delete           cancel (with reason, only before any payment)
```

- **Draft**: freely editable, no number, can be deleted.
- **Issue**: assigns the next number for the fiscal year, sets the issue date to today (keeping the same payment terms), and records the seller and buyer details as they are at that moment. Issued invoices cannot be edited or deleted.
- **Payments**: record full or partial payments with method and reference. The status updates automatically and overpayments are rejected.
- **Cancel**: keeps the invoice and its number on record, marked as cancelled with the reason.
- **Email to client**: sends the PDF to the client's email and all active portal contacts.
- **Client portal**: clients see their issued invoices and can download the PDF. Drafts are never visible to clients.

## Credit notes

A credit note reduces what a client owes on an issued invoice, for example for a discount agreed after delivery, a returned item or work that was not delivered. Issued invoices are never edited; credit notes keep the record correct.

On an issued invoice, click **Issue credit note** under **Credit notes**:

1. Choose the date (on or after the invoice date) and give the reason.
2. Add one or more lines with the amount credited before tax.
3. Check the total: percentage taxes on the invoice, such as VAT or GST, are applied to the credited amount at the same rates. Fixed charges are not reversed automatically; add them as a line if they should be credited too.
4. Click **Issue credit note**.

Each credit note gets its own number per fiscal year, for example `CN-2026-0001`, and a PDF in the same layout as invoices that names the original invoice and the reason. Open it or email it to the client from the invoice page; clients see credit notes in the portal with the invoice.

The invoice then shows the amount credited, and its balance and status update:

| Situation | Status |
|---|---|
| Credits and payments cover part of the total | Partially paid |
| Credits and payments cover the whole total | Paid |
| Credit notes cover the whole total | Credited |

You cannot credit more than the invoice total. If the client has already paid in full, the invoice shows the **refund due**; record the refund in your accounts. Invoices with credit notes cannot be cancelled.

### Numbering

Numbers are `{prefix}{fiscal year}-{sequence}`. The sequence comes from an atomic counter per fiscal year, so two people issuing at the same moment never get the same number.

| Fiscal year rule | Example |
|---|---|
| Starts in January | `INV-2026-0001` |
| Starts in any other month | `INV-2026-27-0001` |
| Bikram Sambat calendar | `INV-2083/84-0001` |

If the currency changes after a draft was saved, KaamHub asks you to save the draft again before issuing.

## Recurring services

Open **Services** in the sidebar (the Recurring services module must be on). Every recurring service is listed there, with search and filters by status, billing cycle, type and project. A project's overview also lists its services.

For each service, choose the project (its client is billed) and record the type (from your own list in Settings), name, supplier, renewal date with the provider, amount before tax, billing cycle (monthly, quarterly, every 6 months or yearly) and the next billing date.

- **Recurring drafts**: every day, KaamHub creates a draft invoice for each active service due within the configured lead time and moves its next billing date forward one cycle. Each billing period is invoiced only once, guaranteed by a database constraint.
- **Taxes on recurring drafts**: drafts start without taxes. Add the taxes that apply while reviewing the draft, then issue it.
- **Bill next period**: create the next draft immediately from the row menu on the Services page.
- **Renewal reminders**: admins get an email 30, 7 and 1 day before a service expires with its provider, and the dashboard lists renewals due within 30 days.

### Scheduling the daily job

The scheduled job (hourly with the provided stack) prepares recurring drafts, sends reminders once a day and checks environment uptime. It runs at `POST /api/cron/daily` and requires `Authorization: Bearer <CRON_SECRET>`.

With the provided Docker Compose stack, the updater service calls the job every hour with a token derived from `SESSION_SECRET`; nothing needs to be configured, and the job is safe to run repeatedly. Without the updater, set `CRON_SECRET` in `.env` and call the job from any scheduler:

```bash
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://hub.example.com/api/cron/daily
```

## PDF output

Invoices are rendered as A4 PDFs on the server with [react-pdf](https://react-pdf.org), using the bundled Noto Sans fonts. They print Latin, Greek and Cyrillic text, Devanagari (Nepali, Hindi, Marathi) and currency symbols such as `$`, `£`, `€` and `₹`.

To print your logo at the top of every invoice, upload it under **Settings → Logo** (PNG or JPG, up to 2 MB; a PNG with a transparent background works best). It is printed at most 160 × 48 points, about 56 × 17 mm. Changing the logo also changes the PDF of invoices issued earlier, because PDFs are generated when they are opened.
