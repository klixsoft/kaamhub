export interface StarterTemplate {
  name: string
  title: string
  body: string
}

/*
 * Starting points that administrators add with one click and then adapt.
 * Values in double braces are filled in when a letter is issued; names that
 * are not built in, such as {{salary}}, are asked for at that moment.
 */
export const STARTER_LETTER_TEMPLATES: readonly StarterTemplate[] = [
  {
    name: "Offer letter",
    title: "Offer of employment",
    body: `Dear {{recipient.name}},

We are pleased to offer you the position of **{{position}}** at {{company.name}}.

# Terms of the offer

- Start date: {{start_date}}
- Department: {{recipient.department}}
- Reporting to: {{recipient.manager}}
- Monthly salary: {{salary}}
- Probation period: {{probation_period}}

This offer is subject to the verification of your documents and to the terms of the employment agreement you will receive on joining.

Please confirm your acceptance by {{acceptance_deadline}}.

We look forward to welcoming you to the team.`,
  },
  {
    name: "Appointment letter",
    title: "Letter of appointment",
    body: `Dear {{recipient.name}},

Further to your acceptance of our offer, we are pleased to appoint you as **{{recipient.designation}}** in the {{recipient.department}} department of {{company.legal_name}}, with effect from {{recipient.joined_on}}.

# Terms of appointment

- Employee code: {{recipient.employee_code}}
- Engagement: {{recipient.engagement}}
- Reporting to: {{recipient.manager}}
- Monthly salary: {{salary}}
- Working hours: {{working_hours}}

Your employment is governed by the company's policies as amended from time to time. Either party may end the employment by giving {{notice_period}} written notice.

Please sign and return a copy of this letter as your acceptance.`,
  },
  {
    name: "Non-disclosure agreement",
    title: "Non-disclosure agreement",
    body: `This agreement is made on {{letter.date}} between {{company.legal_name}}, {{company.address}} (the "Company"), and {{recipient.name}} (the "Recipient").

# Confidential information

The Recipient may receive information about the Company's clients, projects, source code, finances and business plans. All such information is confidential unless it is already public.

# Obligations

- Use confidential information only to perform work for the Company.
- Do not share it with anyone outside the Company without written permission.
- Return or delete all confidential material when the engagement ends.

These obligations continue for {{confidentiality_period}} after the engagement ends.

Signed by the Recipient: ____________________`,
  },
  {
    name: "Experience letter",
    title: "Experience certificate",
    body: `To whom it may concern,

This is to certify that **{{recipient.name}}** worked with {{company.legal_name}} as {{recipient.designation}} in the {{recipient.department}} department from {{recipient.joined_on}} to {{recipient.ends_on}}.

During this period, {{recipient.name}} was responsible for {{responsibilities}}.

We wish {{recipient.name}} every success in the future.`,
  },
  {
    name: "Salary certificate",
    title: "Salary certificate",
    body: `To whom it may concern,

This is to certify that **{{recipient.name}}** (employee code {{recipient.employee_code}}) has been employed with {{company.legal_name}} as {{recipient.designation}} since {{recipient.joined_on}}.

Their current gross monthly salary is {{salary}}.

This certificate is issued at the employee's request for {{purpose}}.`,
  },
]
