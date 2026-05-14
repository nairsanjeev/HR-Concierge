import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Search, ChevronRight } from 'lucide-react';

interface PromptCategory {
  category: string;
  prompts: { title: string; text: string }[];
}

interface Props {
  onSelect: (text: string) => void;
}

const FALLBACK_PROMPTS: PromptCategory[] = [
  {
    category: 'HR Policy (Foundry IQ)',
    prompts: [
      { title: 'Parental Leave Policy', text: 'What is the parental leave policy? How many weeks do primary and secondary caregivers get?' },
      { title: 'PTO & Vacation Balance', text: 'How does the PTO accrual system work? What is the annual vacation entitlement and carryover policy?' },
      { title: 'Health Insurance Plans', text: 'What health insurance plans does the company offer? Can you compare the PPO and HDHP options?' },
      { title: 'Code of Conduct', text: 'What are the key principles in the company code of conduct policy?' },
      { title: 'Grievance Filing Process', text: 'What is the formal grievance filing procedure? What are the steps and timelines?' },
      { title: '401(k) Match Policy', text: 'What is the company 401(k) matching policy? What is the vesting schedule?' },
      { title: 'FMLA Eligibility', text: 'Who is eligible for FMLA leave and how much leave can I take? What documentation is required?' },
      { title: 'Pay Period & Direct Deposit', text: 'What are the pay periods and when are paychecks issued? How do I set up or change direct deposit?' },
      { title: 'Anti-Harassment Policy', text: 'What does the anti-harassment policy cover? What are the reporting channels and protections against retaliation?' },
      { title: 'Equal Employment Opportunity', text: 'What is the company equal employment opportunity policy? What protected classes are covered?' },
      { title: 'Employee Retention Program', text: 'What retention programs and incentives does the company offer for long-term employees?' },
      { title: 'Sick Leave Policy', text: 'How many sick days do employees get per year? Can unused sick days be carried over or paid out?' },
    ],
  },
  {
    category: 'Life Events',
    prompts: [
      { title: 'Marriage & Name Change', text: 'I recently got married and need to update my legal name, tax withholdings, and add my spouse to my benefits.' },
      { title: 'Multi-Change Request', text: 'I got married, moved to a new address, and need to update my legal name, emergency contact, and bank details.' },
      { title: 'New Baby', text: 'I just had a baby and need to add them to my health insurance, update my tax withholdings, and request parental leave.' },
      { title: 'Adoption', text: 'We are finalizing the adoption of our child next month. I need to add them to my insurance, request adoption leave, and update my beneficiaries.' },
      { title: 'Divorce', text: 'I am going through a divorce and need to remove my ex-spouse from my benefits, update my emergency contact, and change my tax filing status.' },
      { title: 'Domestic Partnership', text: 'I want to register my domestic partner and add them to my health and dental plans.' },
      { title: 'Relocation — New State', text: 'I moved from California to Texas. I need to update my address, state tax withholdings, and check if my current health plan covers my new state.' },
      { title: 'International Transfer', text: 'I am relocating from our New York office to London. I need guidance on my visa sponsorship, international payroll transition, and benefits portability.' },
      { title: 'Address & Bank Change', text: 'I just moved and need to update my home address, direct deposit bank account, and emergency contact information.' },
    ],
  },
  {
    category: 'Leave & Time Off',
    prompts: [
      { title: 'Parental Leave', text: 'My baby is due in 8 weeks. I would like to understand my parental leave options, how to apply, and what paperwork is required.' },
      { title: 'Extended Medical Leave', text: 'I need to take a 3-month medical leave for surgery and recovery. What forms do I need, and how does it affect my benefits and pay?' },
      { title: 'Bereavement Leave', text: 'My father passed away. I need to request bereavement leave and understand how many days I am entitled to.' },
      { title: 'Sabbatical Request', text: 'I have been with the company for 7 years and want to request a 3-month sabbatical. What is the process and eligibility?' },
      { title: 'FMLA Inquiry', text: 'I need to take intermittent FMLA leave to care for my elderly parent. How do I apply and what documentation is needed?' },
      { title: 'Jury Duty', text: 'I have been summoned for jury duty next month. What is the company policy on jury duty leave and pay?' },
      { title: 'Military Leave', text: 'I am a reservist and have been called for a two-week training deployment. What are my rights under USERRA and company policy?' },
    ],
  },
  {
    category: 'Benefits & Compensation',
    prompts: [
      { title: 'Open Enrollment Help', text: 'Open enrollment is coming up. Can you compare my current health plan options and recommend the best one for a family of four?' },
      { title: '401(k) Contribution Change', text: 'I want to increase my 401(k) contribution to the maximum allowed and also update my investment allocation.' },
      { title: 'HSA/FSA Setup', text: 'I would like to set up a Health Savings Account and understand the contribution limits, eligible expenses, and tax benefits.' },
      { title: 'Tuition Reimbursement', text: 'I am enrolling in a part-time MBA program. How do I apply for tuition reimbursement and what is the annual cap?' },
      { title: 'Life Insurance Beneficiary', text: 'I need to update the beneficiary on my company life insurance policy after my recent marriage.' },
      { title: 'Stock Options Vesting', text: 'I would like to understand my stock option vesting schedule, exercise windows, and tax implications.' },
      { title: 'Disability Insurance', text: 'Can you explain the difference between short-term and long-term disability coverage and help me choose the right plan?' },
    ],
  },
  {
    category: 'Grievances & Complaints',
    prompts: [
      { title: 'Meeting Exclusion', text: 'My manager has been consistently excluding me from important team meetings and I feel I am being treated unfairly compared to other team members.' },
      { title: 'Workplace Harassment', text: 'A coworker has been making inappropriate comments about my appearance. I have asked them to stop but it continues. I want to file a formal complaint.' },
      { title: 'Retaliation Concern', text: 'After I reported a safety violation, my manager reduced my hours and gave me a negative performance review. I believe this is retaliation.' },
      { title: 'Discrimination Complaint', text: 'I was passed over for promotion despite having the best performance metrics. I believe the decision was influenced by my age.' },
      { title: 'Workplace Bullying', text: 'A senior colleague regularly belittles my work in front of the team and has spread rumors about me. I need help addressing this behavior.' },
      { title: 'Hostile Work Environment', text: 'My team lead frequently makes offensive jokes targeting specific ethnic groups. Several of us are uncomfortable but afraid to speak up.' },
      { title: 'Pay Equity Concern', text: 'I discovered that a colleague with the same title and fewer years of experience earns significantly more than me. I would like to understand the pay equity review process.' },
      { title: 'Whistleblower Protection', text: 'I discovered financial irregularities in our department budget reporting. I want to report this but need assurance about whistleblower protections.' },
    ],
  },
  {
    category: 'Onboarding & Offboarding',
    prompts: [
      { title: 'New Hire Setup', text: 'I am starting next Monday. I need to complete my I-9, set up direct deposit, choose my benefits, and get my laptop and access badges.' },
      { title: 'Resignation Process', text: 'I am submitting my two-week notice. What steps do I need to follow for a smooth exit, including returning equipment and final paycheck?' },
      { title: 'Internal Transfer', text: 'I accepted an internal transfer to the Marketing department. What do I need to do for the transition, including manager changes and cost center updates?' },
      { title: 'Contractor to FTE', text: 'I have been a contractor for 18 months and just received an offer to convert to full-time. What changes in my benefits and payroll?' },
      { title: 'Retirement Planning', text: 'I am planning to retire in 6 months. What steps should I take now regarding pension, health coverage continuation, and 401(k) rollover?' },
    ],
  },
  {
    category: 'Payroll & Tax',
    prompts: [
      { title: 'W-4 Update', text: 'I need to update my W-4 form after getting married. How do I change my filing status and adjust withholdings?' },
      { title: 'Paycheck Discrepancy', text: 'My last paycheck was $500 less than expected. I need help reviewing my pay stub for errors in deductions or hours.' },
      { title: 'Expense Reimbursement', text: 'I traveled for a client meeting and have $2,400 in expenses including flights, hotel, and meals. How do I submit for reimbursement?' },
      { title: 'Bonus & Commission Inquiry', text: 'I have not received my Q1 sales commission yet. Can you check the status and expected payout date?' },
      { title: 'Multi-State Tax', text: 'I work remotely from New Jersey but my office is in New York. How are my state taxes handled and do I need to file in both states?' },
    ],
  },
  {
    category: 'Workplace Accommodations',
    prompts: [
      { title: 'ADA Accommodation', text: 'I have a medical condition that requires a standing desk and flexible break schedule. How do I formally request an ADA accommodation?' },
      { title: 'Remote Work Request', text: 'Due to a family medical situation, I need to work remotely full-time for the next three months. What is the approval process?' },
      { title: 'Religious Accommodation', text: 'I need to adjust my work schedule to observe religious holidays that are not on the company calendar. How do I request this accommodation?' },
      { title: 'Ergonomic Assessment', text: 'I am experiencing chronic back pain from my workstation setup. Can I get an ergonomic assessment and equipment upgrade?' },
      { title: 'Lactation Room Request', text: 'I am returning from maternity leave and need access to a private lactation room near my workspace. How do I arrange this?' },
    ],
  },
  {
    category: 'Performance & Development',
    prompts: [
      { title: 'Performance Review Dispute', text: 'I disagree with my annual performance rating. My manager rated me "meets expectations" but I exceeded all my KPIs. How do I appeal?' },
      { title: 'Training Budget', text: 'I would like to attend an industry conference next quarter. How do I request professional development funds and what is the approval process?' },
      { title: 'Promotion Criteria', text: 'I have been in my current role for 3 years and want to understand the criteria and process for promotion to Senior Engineer.' },
      { title: 'Mentorship Program', text: 'I am interested in joining the company mentorship program either as a mentor or mentee. How do I sign up?' },
      { title: 'PIP Concerns', text: 'I was just placed on a Performance Improvement Plan. I want to understand my rights, the timeline, and what resources are available to help me succeed.' },
    ],
  },
];

export default function PromptGallery({ onSelect }: Props) {
  const [prompts, setPrompts] = useState<PromptCategory[]>(FALLBACK_PROMPTS);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/prompts')
      .then((r) => r.json())
      .then((data: PromptCategory[]) => {
        if (Array.isArray(data) && data.length > 0) setPrompts(data);
      })
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  const filtered = prompts
    .map((cat) => ({
      ...cat,
      prompts: cat.prompts.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.text.toLowerCase().includes(search.toLowerCase()),
      ),
    }))
    .filter((cat) => cat.prompts.length > 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold">Prompt Gallery</span>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs focus:outline-none focus:border-brand-500/40"
          />
        </div>
      </div>

      {/* Prompts list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {filtered.map((cat) => (
          <div key={cat.category}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              {cat.category}
            </div>
            <div className="space-y-2">
              {cat.prompts.map((prompt, i) => (
                <motion.button
                  key={`${cat.category}-${i}`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onSelect(prompt.text)}
                  className="w-full text-left p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] hover:border-brand-500/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold group-hover:text-brand-400 transition-colors">
                      {prompt.title}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed line-clamp-2">
                    {prompt.text}
                  </p>
                </motion.button>
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center text-xs text-[var(--text-muted)] py-8">
            No prompts match your search.
          </div>
        )}
      </div>
    </div>
  );
}
