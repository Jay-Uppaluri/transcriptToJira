import React from 'react';
import { FileText } from 'lucide-react';

export const PLACEHOLDER_TRANSCRIPTS = [
  {
    id: 't1',
    title: 'Sprint Planning — Q1 Roadmap Review',
    date: '2026-02-28',
    time: '2:30 PM',
    duration: '45 min',
    participants: ['Sarah Chen', 'Mike Rivera', 'Priya Patel'],
    summary: 'The team aligned on Q1 priorities, focusing on the new onboarding flow, API performance improvements, and enterprise SSO. Sarah proposed pushing the analytics dashboard to Q2 given resource constraints.',
    lines: [
      { speaker: 'Sarah Chen', timestamp: '0:00', text: 'Alright, let\'s get started. We have a lot to cover for Q1 planning. I\'ve pulled together the backlog items and I want to make sure we\'re aligned on priorities.' },
      { speaker: 'Mike Rivera', timestamp: '0:15', text: 'Sounds good. I had a chance to review the list — my main concern is the API performance work. We\'ve been getting more complaints from enterprise customers about response times.' },
      { speaker: 'Sarah Chen', timestamp: '0:32', text: 'That\'s definitely on the list. Priya, can you give us a quick status on where we are with the onboarding flow redesign?' },
      { speaker: 'Priya Patel', timestamp: '0:45', text: 'Sure. The designs are finalized and we got sign-off from the stakeholders last week. Engineering-wise, I think we need about three sprints to implement the full flow. The biggest piece is the interactive tutorial system.' },
      { speaker: 'Mike Rivera', timestamp: '1:12', text: 'Three sprints for onboarding plus the API work is going to be tight. Are we also committing to the SSO feature for enterprise?' },
      { speaker: 'Sarah Chen', timestamp: '1:28', text: 'That\'s what I wanted to discuss. I think we should prioritize onboarding and API performance, and see if we can fit SSO into the last few weeks of the quarter.' },
      { speaker: 'Priya Patel', timestamp: '1:45', text: 'I agree. The onboarding improvements will impact all users, not just enterprise. The data shows we\'re losing 40% of new signups in the first week.' },
      { speaker: 'Mike Rivera', timestamp: '2:03', text: 'Fair point. What about the analytics dashboard? That\'s been requested by several large accounts.' },
      { speaker: 'Sarah Chen', timestamp: '2:18', text: 'I\'m proposing we push that to Q2. We can\'t do everything, and I\'d rather ship three things well than five things half-baked.' },
      { speaker: 'Mike Rivera', timestamp: '2:35', text: 'Makes sense. Let me put together the technical spec for the API improvements this week. I\'ll need to audit the slowest endpoints first.' },
      { speaker: 'Priya Patel', timestamp: '2:50', text: 'And I\'ll break down the onboarding work into sprint-sized chunks. Should we sync again Thursday to finalize the sprint commitments?' },
      { speaker: 'Sarah Chen', timestamp: '3:05', text: 'Perfect. Thursday works. Let\'s also loop in the design team for the onboarding kickoff. I\'ll send the invite.' },
    ],
  },
  {
    id: 't2',
    title: 'Customer Feedback Sync — Enterprise Accounts',
    date: '2026-02-25',
    time: '10:00 AM',
    duration: '32 min',
    participants: ['Jason Kim', 'Emily Torres'],
    summary: 'Jason and Emily reviewed recent enterprise customer feedback. Key themes included request for bulk operations, improved audit logging, and better role-based access controls. Three accounts are at risk of churning without the audit log feature.',
    lines: [
      { speaker: 'Jason Kim', timestamp: '0:00', text: 'Emily, thanks for putting together the feedback summary. I wanted to go through the top themes before our product review tomorrow.' },
      { speaker: 'Emily Torres', timestamp: '0:12', text: 'Of course. So the biggest theme by far is audit logging. We have three enterprise accounts — Acme Corp, GlobalTech, and Meridian — all saying it\'s a blocker for their compliance teams.' },
      { speaker: 'Jason Kim', timestamp: '0:30', text: 'Are any of them at risk of churning over this?' },
      { speaker: 'Emily Torres', timestamp: '0:38', text: 'Acme and Meridian both mentioned it during their renewal conversations. GlobalTech has a longer contract but they\'ve escalated it through their CSM twice.' },
      { speaker: 'Jason Kim', timestamp: '0:55', text: 'Okay, that\'s concerning. What\'s the second biggest theme?' },
      { speaker: 'Emily Torres', timestamp: '1:05', text: 'Bulk operations. A lot of teams are managing hundreds of items and having to do everything one by one. They want multi-select, bulk edit, bulk export — the standard stuff.' },
      { speaker: 'Jason Kim', timestamp: '1:22', text: 'That\'s more of a quality-of-life improvement. Important but not a churn risk. What else?' },
      { speaker: 'Emily Torres', timestamp: '1:35', text: 'Role-based access controls. Right now we have admin and member, but enterprises want custom roles — like a "viewer" who can see but not edit, or a "manager" who can approve but not create.' },
      { speaker: 'Jason Kim', timestamp: '1:55', text: 'RBAC is a big project. Let me talk to engineering about what a phased approach could look like. For the audit logging — do we have a spec?' },
      { speaker: 'Emily Torres', timestamp: '2:10', text: 'I drafted a requirements doc based on the customer conversations. I\'ll share it after this call. The core ask is: who did what, when, with before/after values.' },
      { speaker: 'Jason Kim', timestamp: '2:28', text: 'Great. Let\'s prioritize audit logging for next quarter and get a prototype in front of Acme by March. That should buy us time on the renewal.' },
    ],
  },
  {
    id: 't3',
    title: 'Design Review — Onboarding Flow v2',
    date: '2026-02-20',
    time: '1:52 PM',
    duration: '58 min',
    participants: ['Priya Patel', 'Alex Johnson', 'Sarah Chen', 'Luis Hernandez'],
    summary: 'The team reviewed Priya\'s updated onboarding designs. Major discussion points included progressive disclosure vs. upfront configuration, the role of templates in reducing time-to-value, and accessibility concerns raised by Luis. The team agreed to A/B test two approaches.',
    lines: [
      { speaker: 'Priya Patel', timestamp: '0:00', text: 'Okay, I\'m going to share my screen. So this is the updated onboarding flow. The main change from v1 is we\'re using progressive disclosure instead of a big setup wizard.' },
      { speaker: 'Alex Johnson', timestamp: '0:20', text: 'Can you walk us through what the user sees on first login?' },
      { speaker: 'Priya Patel', timestamp: '0:28', text: 'Sure. They land on a minimal dashboard with a single call-to-action: "Create your first project." No sidebar, no settings — just that one button. Once they click it, we guide them through creating a project with inline tips.' },
      { speaker: 'Sarah Chen', timestamp: '0:50', text: 'I like the simplicity. My worry is that power users — especially folks coming from competing tools — might feel like it\'s too hand-holdy.' },
      { speaker: 'Luis Hernandez', timestamp: '1:08', text: 'Could we add a "Skip tour" option? That way advanced users can bypass it.' },
      { speaker: 'Priya Patel', timestamp: '1:18', text: 'Absolutely. I have that on slide 4 — there\'s a subtle "I know what I\'m doing" link at the bottom that drops them into the full interface.' },
      { speaker: 'Alex Johnson', timestamp: '1:35', text: 'What about templates? Our data shows that users who start from a template have 3x higher retention in week one.' },
      { speaker: 'Priya Patel', timestamp: '1:48', text: 'Great point. On the project creation screen, the first option is "Start from a template" with our four most popular templates shown. Below that is "Start from scratch."' },
      { speaker: 'Sarah Chen', timestamp: '2:05', text: 'I think we should make templates the default path and make "Start from scratch" secondary. The data supports it.' },
      { speaker: 'Luis Hernandez', timestamp: '2:20', text: 'One accessibility concern — the inline tips use low-contrast text on some of the mockups. Can we make sure those meet WCAG AA at minimum?' },
      { speaker: 'Priya Patel', timestamp: '2:35', text: 'Good catch. I\'ll audit all the text contrast ratios this week. Also, I want to make sure the entire flow is keyboard-navigable.' },
      { speaker: 'Alex Johnson', timestamp: '2:50', text: 'Should we A/B test the progressive disclosure approach against a more traditional wizard? I know we\'re confident in this direction, but it\'d be good to have data.' },
      { speaker: 'Sarah Chen', timestamp: '3:08', text: 'I think that\'s smart. Let\'s set up two variants — the progressive flow and a simplified three-step wizard — and measure time-to-first-project and week-one retention.' },
      { speaker: 'Priya Patel', timestamp: '3:25', text: 'I can have both variants ready for engineering by next Friday. Luis, can you do an accessibility pass on both before we hand them off?' },
      { speaker: 'Luis Hernandez', timestamp: '3:38', text: 'Definitely. Send me the Figma links when they\'re ready and I\'ll do a full audit.' },
    ],
  },
  {
    id: 't4',
    title: 'API Integration Kickoff — Payments Service',
    date: '2026-02-14',
    time: '11:15 AM',
    duration: '40 min',
    participants: ['Mike Rivera', 'Jason Kim', 'Tanya Brooks'],
    summary: 'Kickoff meeting for the payments service integration. The team discussed using Stripe as the primary payment processor, handling subscription lifecycle events via webhooks, and PCI compliance requirements. Tanya flagged the need for idempotency keys on all payment operations.',
    lines: [
      { speaker: 'Mike Rivera', timestamp: '0:00', text: 'Welcome everyone. This is the kickoff for the payments service integration. Our goal is to have subscription billing live by end of Q1. Tanya, you\'ve done payment integrations before — want to set the context?' },
      { speaker: 'Tanya Brooks', timestamp: '0:18', text: 'Sure. So we\'re going with Stripe for the payment processor. They handle the hard parts — PCI compliance, card storage, SCA for European customers. Our job is to integrate their APIs and handle the subscription lifecycle.' },
      { speaker: 'Jason Kim', timestamp: '0:40', text: 'What does the subscription lifecycle look like from our end?' },
      { speaker: 'Tanya Brooks', timestamp: '0:50', text: 'We need to handle: plan creation, upgrades and downgrades, cancellations, failed payments and retry logic, and invoice generation. Stripe has webhooks for all of these events.' },
      { speaker: 'Mike Rivera', timestamp: '1:12', text: 'How are we going to handle the webhook reliability? I\'ve seen issues in past projects where webhooks get dropped or arrive out of order.' },
      { speaker: 'Tanya Brooks', timestamp: '1:28', text: 'Good question. Two things: first, we need idempotency keys on all payment operations so we can safely retry. Second, we should implement a webhook event queue so we process events in order and don\'t lose any.' },
      { speaker: 'Jason Kim', timestamp: '1:48', text: 'What about the pricing page on our marketing site? Does that need to be dynamic or can it be static?' },
      { speaker: 'Mike Rivera', timestamp: '2:02', text: 'I\'d prefer dynamic. If product wants to run pricing experiments, we don\'t want to need a code deploy. Let\'s pull pricing from Stripe and cache it.' },
      { speaker: 'Tanya Brooks', timestamp: '2:20', text: 'Agreed. We can cache Stripe prices with a short TTL — maybe 5 minutes — and have an admin endpoint to force-refresh the cache when plans change.' },
      { speaker: 'Jason Kim', timestamp: '2:38', text: 'What about the customer portal? Stripe has a hosted portal for managing subscriptions.' },
      { speaker: 'Tanya Brooks', timestamp: '2:50', text: 'I\'d recommend using Stripe\'s hosted portal for phase one. It handles plan changes, payment method updates, and invoice history out of the box. We can build a custom one later if needed.' },
      { speaker: 'Mike Rivera', timestamp: '3:10', text: 'That makes sense for MVP. Let\'s scope phase one as: Stripe integration, three pricing plans, webhook handling, and the hosted customer portal. Phase two can add custom portal and usage-based billing.' },
      { speaker: 'Tanya Brooks', timestamp: '3:28', text: 'I\'ll write up the technical design doc this week. Mike, can you set up the Stripe test environment so I can start building against it?' },
      { speaker: 'Mike Rivera', timestamp: '3:40', text: 'On it. I\'ll have the test keys and webhook endpoints set up by tomorrow.' },
    ],
  },
  {
    id: 't5',
    title: 'Retrospective — January Release Cycle',
    date: '2026-02-10',
    time: '3:00 PM',
    duration: '35 min',
    participants: ['Sarah Chen', 'Emily Torres', 'Alex Johnson'],
    summary: 'The team reflected on the January release. Positives: the new editor shipped on time and had strong adoption. Negatives: QA was rushed due to late design changes, and there were two production incidents in the first week. Action items: establish a design freeze two sprints before release and create a rollback playbook.',
    lines: [
      { speaker: 'Sarah Chen', timestamp: '0:00', text: 'Let\'s run through our retro for the January release. I\'ll start with what went well. The editor shipped on time, which is a first for us in a while. Adoption has been strong — 60% of active users tried the new editor in the first week.' },
      { speaker: 'Alex Johnson', timestamp: '0:22', text: 'That\'s a great adoption number. I think the in-app announcement and the guided tour really helped. Users knew exactly what was new and how to use it.' },
      { speaker: 'Emily Torres', timestamp: '0:38', text: 'Agreed on the positives. On the flip side, QA was really rushed. We had design changes coming in up until the last sprint, and the QA team didn\'t have enough time to do a thorough regression.' },
      { speaker: 'Sarah Chen', timestamp: '0:58', text: 'That\'s fair. The late design changes were partly my fault — I approved a scope addition that should have waited for a follow-up release.' },
      { speaker: 'Alex Johnson', timestamp: '1:12', text: 'And the result was two production incidents in the first week. The image upload bug affected about 200 users, and the formatting glitch was visible on all shared documents.' },
      { speaker: 'Emily Torres', timestamp: '1:30', text: 'Both of those would have been caught with another day of QA. The fixes were straightforward — the bugs weren\'t deep, they just weren\'t tested.' },
      { speaker: 'Sarah Chen', timestamp: '1:48', text: 'So what do we want to change going forward? I think we need a hard design freeze at least two sprints before the release date.' },
      { speaker: 'Alex Johnson', timestamp: '2:05', text: 'I\'d support that. And any changes after the freeze go into the next release unless they\'re critical bug fixes.' },
      { speaker: 'Emily Torres', timestamp: '2:20', text: 'I also want to propose a rollback playbook. When those incidents happened, it took us too long to decide whether to roll back or hotfix. We need a clear decision tree.' },
      { speaker: 'Sarah Chen', timestamp: '2:38', text: 'That\'s a great idea. Alex, can you draft the rollback playbook? Think about criteria like: number of users affected, severity, time-to-fix estimate.' },
      { speaker: 'Alex Johnson', timestamp: '2:52', text: 'Will do. I\'ll have a draft by end of week and we can review it as a team.' },
      { speaker: 'Emily Torres', timestamp: '3:05', text: 'One more thing — the cross-team communication during the incidents was good. The Slack channel worked well and everyone knew who was on point. I want to make sure we keep that going.' },
      { speaker: 'Sarah Chen', timestamp: '3:20', text: 'Agreed. Okay, action items: design freeze policy, rollback playbook, and we\'ll keep the incident communication as-is. Good retro, everyone.' },
    ],
  },
];

function formatSectionDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function groupByDate(transcripts) {
  const groups = {};
  for (const t of transcripts) {
    if (!groups[t.date]) groups[t.date] = [];
    groups[t.date].push(t);
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

export default function TranscriptList({ onOpenTranscript }) {
  const grouped = groupByDate(PLACEHOLDER_TRANSCRIPTS);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium text-[#37352f]">Meeting Transcripts</h2>
          <p className="text-sm text-[#787774]">{PLACEHOLDER_TRANSCRIPTS.length} transcript{PLACEHOLDER_TRANSCRIPTS.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="space-y-6">
        {grouped.map(([date, transcripts]) => (
          <div key={date}>
            <p className="text-sm text-[#9b9a97] mb-2 px-1">{formatSectionDate(date)}</p>
            <div className="space-y-2">
              {transcripts.map(t => (
                <div
                  key={t.id}
                  onClick={() => onOpenTranscript?.(t)}
                  className="bg-white border border-[#e9e8e4] rounded-[3px] p-4 hover:bg-[rgba(55,53,47,0.08)] cursor-pointer group flex items-center gap-3"
                >
                  <div className="p-2 rounded-lg bg-[rgba(55,53,47,0.06)] text-[#9b9a97] shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[#37352f] text-sm">{t.title}</h3>
                    <p className="text-xs text-[#9b9a97] mt-0.5 truncate">
                      {t.participants.join(', ')}
                    </p>
                  </div>
                  <span className="text-xs text-[#9b9a97] shrink-0">{t.time}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
