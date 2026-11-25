# Invoicing, tax and managed services

KaamHub can invoice clients in any country. Tax, currency, calendar and invoice numbering are set once by an administrator in **Billing** settings and apply everywhere.

> KaamHub produces invoices in common formats, but it is not certified by any tax authority. Some countries require registered or approved billing software, real-time reporting or e-invoicing (for example India's e-invoicing threshold, Nepal's CBMS or the EU's e-invoicing rules). Check your obligations with a local accountant.

## Billing settings

Open **Billing** in the sidebar (Super Admin and Admin).

### Country presets

Pick a preset to fill in tax, calendar and currency. Every value stays editable.

| Preset | Tax | Tax number label | Fiscal year | Calendar | Currency | Total in words |
|---|---|---|---|---|---|---|
| Generic | None | Tax ID | January | Gregorian | USD | No |
| Nepal | VAT 13% | PAN/VAT No. | Shrawan (BS) | Gregorian + Bikram Sambat | NPR | Yes |
| India | GST 18% | GSTIN | April | Gregorian | INR | Yes |
| United Kingdom | VAT 20% | VAT Reg. No. | April | Gregorian | GBP | No |
| European Union | VAT 21% | VAT ID | January | Gregorian | EUR | No |
| United States | None | EIN | January | Gregorian | USD | No |
| Australia | GST 10% | ABN | July | Gregorian | AUD | No |

Presets live in [`src/config/billing-presets.ts`](../src/config/billing-presets.ts). Pull requests for more countries are welcome.

### Settings reference

| Setting | Purpose |
|---|---|
| Registered company name, address, contact | Printed as the seller on every invoice |
| Tax registration number | Your VAT/GST/tax ID. Required before issuing invoices that charge tax |
| We charge tax | Turn off if your company is not registered for tax. Invoices then use “No tax” only |
| Tax name and standard rate | e.g. VAT 20%, GST 18% |
| Tax number label | Printed next to tax numbers, e.g. “GSTIN” or “VAT No.” |
| Document title | e.g. “Tax Invoice”. Invoices without tax are titled “Invoice” |
| Calendar | Gregorian, or Gregorian with Bikram Sambat dates and fiscal year (Nepal) |
| Fiscal year starts in | Invoice numbers restart each fiscal year |
| Currency code, symbol, names and number format | Used for every amount. Number format is either 1,00,000 (lakh/crore) or 100,000 |
| Print the total in words | Adds “Rupees One Thousand … Only” style text |
| Number prefix | e.g. `INV-` gives `INV-2026-0001` |
| Payment terms | Default due date for new invoices |
| Payment details and footer | Printed at the bottom of the invoice |

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

### Numbering

Numbers are `{prefix}{fiscal year}-{sequence}` and the sequence comes from an atomic counter per fiscal year, so two people issuing at the same moment can never get the same number.

| Fiscal year rule | Example |
|---|---|
| Starts in January | `INV-2026-0001` |
| Starts in April or July | `INV-2026-27-0001` |
| Bikram Sambat | `INV-2083/84-0001` |

### Tax treatments

Each invoice and service uses one of:

| Treatment | Meaning |
|---|---|
| Standard | Charges the standard rate from Billing settings |
| Zero-rated | Taxable at 0%, e.g. exports of services |
| No tax | Exempt or outside the scope of tax |

If the rate or currency changes after a draft was saved, KaamHub asks you to save the draft again before issuing, so totals always match the printed rate.

## Managed services and recurring billing

When your company manages a client's domain, hosting or maintenance, turn on **We manage the domain and hosting** on the project. A **Services** tab appears.

For each service, record the type, name (e.g. the domain), provider, renewal date with the provider, amount, billing cycle (monthly, quarterly, every 6 months or yearly) and the next billing date.

- **Recurring drafts**: every day, KaamHub creates a draft invoice for each active service due within the configured lead time (7 days by default) and moves its next billing date forward one cycle. Each billing period is invoiced only once, guaranteed by a database constraint.
- **Bill next period**: create the next draft immediately from the Services tab.
- **Renewal reminders**: admins get an email 30, 7 and 1 day before a service expires with its provider, and the dashboard lists renewals due within 30 days.

Drafts are never issued automatically; someone reviews and issues them.

### Scheduling the daily job

The daily job runs at `POST /api/cron/daily` and requires `Authorization: Bearer <CRON_SECRET>`.

With the provided Docker Compose stack, set `CRON_SECRET` in `.env`; the updater service calls the job every hour and the job is safe to run repeatedly. Without the updater, call it from any scheduler:

```bash
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://hub.example.com/api/cron/daily
```

## PDF output

Invoices are rendered as A4 PDFs on the server with [react-pdf](https://react-pdf.org). They include the document title, invoice number, dates (with Bikram Sambat dates when that calendar is enabled), fiscal year, seller and buyer tax numbers, line items, discount, taxable amount, tax, total, optional amount in words, payments, payment details and footer.

The built-in fonts cover Latin characters and common currency symbols such as `$`, `£` and `€`. For symbols outside that set (for example `₹`), use a text symbol such as `Rs.` until custom fonts are supported.
