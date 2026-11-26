-- CKM syndrome morning report: schedule, meeting card, round questions,
-- pinned update and a training program. Based on the 2023 AHA presidential
-- advisory and the 2026 AHA/ACC/ADA/ASN CKM syndrome guideline.
-- Safe to run more than once (it replaces its own items).

-- Previous round questions stay saved but are hidden from the new round.
update public.questions set active = false where active and text not like 'CKM %';

delete from public.questions where text like 'CKM %';
insert into public.questions (text, options, sort_order, active) values
($$CKM 1. A 52-year-old with BMI 33 kg/m², type 2 diabetes (HbA1c 6.9%), BP 138/86, eGFR 72 and UACR 45 mg/g. No known cardiovascular disease and no subclinical disease on testing. Which CKM stage?$$,
 '["Stage 1", "Stage 2", "Stage 3", "Stage 4"]'::jsonb, 1, true),
($$CKM 2. Which tool does the 2026 CKM guideline recommend to estimate 10- and 30-year cardiovascular risk in stages 0–3?$$,
 '["Pooled Cohort Equations", "PREVENT equations", "Framingham Risk Score", "SCORE2"]'::jsonb, 2, true),
($$CKM 3. A person without clinical cardiovascular disease has a PREVENT 10-year total CVD risk of 22%. How does this change the stage?$$,
 '["No change — staging ignores risk scores", "It is one criterion for Stage 3", "It means Stage 4", "It means Stage 1"]'::jsonb, 3, true),
($$CKM 4. The patient in question 1 is already on a maximally tolerated ACE inhibitor. What is the best next step for heart and kidney protection?$$,
 '["Add an SGLT2 inhibitor", "Add a sulfonylurea", "Stop the ACE inhibitor", "No change, recheck in a year"]'::jsonb, 4, true);

-- Schedule item (Monday Nov 30, 2026, 08:30–09:30)
delete from public.schedules where topic like 'CKM Syndrome%';
insert into public.schedules (date, start_time, end_time, topic, notes) values
('2026-11-30', '08:30', '09:30', 'CKM Syndrome: Staging and Treatment in 2026',
$$Case presentation: obesity, type 2 diabetes and albuminuria
CKM stages 0–4 and how to apply them
Risk with the PREVENT equations
Therapies that protect heart and kidney together
Round questions and discussion$$);

-- Meeting card on the morning report (keeps the existing video link)
update public.app_settings
set meeting = coalesce(meeting, '{}'::jsonb) || jsonb_build_object(
  'enabled', true,
  'title', 'CKM Syndrome: Staging and Treatment in 2026',
  'time', '08:30 - 09:30',
  'notes', 'Cardiovascular-kidney-metabolic (CKM) syndrome links obesity, diabetes, chronic kidney disease and heart disease. We will stage a real-world case, estimate risk with PREVENT, and choose therapies that protect the heart and the kidney together. Please answer the round questions before or during the session.'
)
where id = true;

-- Pinned update
delete from public.announcements where title like 'Next morning report: CKM%';
insert into public.announcements (title, body, category, pinned, active, link_url) values
('Next morning report: CKM syndrome — Monday 8:30',
$$Our next morning report covers cardiovascular-kidney-metabolic (CKM) syndrome and the new 2026 AHA/ACC/ADA/ASN guideline.
Before the session: answer the 4 round questions and review the short CKM training program in the Training tab.$$,
 'event', true, true,
 'https://professional.heart.org/en/science-news/2026-guideline-for-the-prevention-detection-evaluation-and-management-of-ckm-syndrome/top-things-to-know');

-- Training program with lessons
delete from public.training_programs where title in ('CKM Syndrome Essentials (2026 guideline)', 'CKM round — answer key (panelists only)');
with program as (
  insert into public.training_programs (title, summary, level, audience, active, sort_order)
  values ('CKM Syndrome Essentials (2026 guideline)',
          'A 30-minute primer before the morning report: what CKM syndrome is, how to stage it, how to estimate risk with PREVENT, and which therapies protect the heart and the kidney.',
          'Residents & fellows', 'all', true, 0)
  returning id
)
insert into public.training_lessons (program_id, title, body, resource_url, resource_name, duration_minutes, sort_order)
select program.id, l.title, l.body, l.url, l.url_name, l.minutes, l.ord
from program, (values
  (1, 'What is CKM syndrome?', 5,
$$• Cardiovascular-kidney-metabolic (CKM) syndrome describes how obesity, type 2 diabetes, chronic kidney disease and cardiovascular disease drive one another.
• The term was introduced in the 2023 American Heart Association presidential advisory (Ndumele et al., Circulation 2023).
• In June 2026 it became the first joint clinical practice guideline on CKM syndrome from the AHA, ACC, ADA and ASN.
• Why it matters for nephrology: cardiovascular disease is the most common cause of death in people with type 2 diabetes and CKD, so kidney care and heart care have to be planned together.$$,
   'https://newsroom.heart.org/news/first-ever-guideline-on-cardiovascular-kidney-metabolic-syndrome-issued', 'AHA news release'),
  (2, 'The five stages (0–4)', 8,
$$• Stage 0 — no CKM risk factors. Focus: prevention.
• Stage 1 — excess or dysfunctional adiposity, early metabolic risk.
• Stage 2 — metabolic risk factors (type 2 diabetes, hypertension, high triglycerides / metabolic syndrome) and/or moderate- to high-risk CKD.
• Stage 3 — subclinical cardiovascular disease with CKM risk factors, OR the risk equivalents: very-high-risk CKD or a high predicted 10-year CVD risk (PREVENT ≥20%).
• Stage 4 — clinical cardiovascular disease (coronary disease, heart failure, stroke, peripheral artery disease, atrial fibrillation) with CKM risk factors; may include kidney failure.
• Stages can move backward: weight loss and risk-factor control can promote regression.$$,
   'https://professional.heart.org/en/science-news/2026-guideline-for-the-prevention-detection-evaluation-and-management-of-ckm-syndrome/top-things-to-know', 'Top things to know (AHA)'),
  (3, 'Estimating risk with PREVENT', 6,
$$• For people in stages 0–3, the guideline recommends the PREVENT equations to estimate 10- and 30-year risk of ASCVD, heart failure and total CVD.
• PREVENT includes kidney measures (eGFR, and optionally UACR), so CKD directly raises the estimate.
• A predicted 10-year total CVD risk of 20% or more is one criterion for Stage 3.
• A 10-year risk of 7.5% or more helps prioritize preventive drug therapy.
• Practice: run PREVENT for the case in round question 1 using the AHA online calculator.$$,
   'https://professional.heart.org/en/guidelines-and-statements/prevent-calculator', 'PREVENT calculator'),
  (4, 'Therapies that protect heart and kidney', 8,
$$• Foundation for every stage: healthy eating, physical activity, sleep, no tobacco, weight management; screen for social barriers to care.
• Blood pressure and lipids: treat to guideline targets; RAS inhibition (ACE inhibitor or ARB) for albuminuric CKD.
• SGLT2 inhibitors: kidney and heart failure protection in CKD with or without diabetes (initiation down to eGFR ≥20 in current guidelines).
• GLP-1-based therapies: weight loss and ASCVD benefit; recommended for selected people with obesity and/or type 2 diabetes, including CKD with type 2 diabetes and UACR ≥100 mg/g despite an ACE inhibitor/ARB plus an SGLT2 inhibitor.
• Finerenone (non-steroidal MRA): reduces kidney and cardiovascular events in type 2 diabetes with albuminuric CKD.
• Metabolic and bariatric surgery when appropriate.
• Always check the full guideline and local protocols before prescribing.$$,
   'https://www.acc.org/latest-in-cardiology/journal-scans/2026/06/08/17/44/first-ever-guideline-addresses-ckm-syndrome', 'ACC guideline summary')
) as l(ord, title, minutes, body, url, url_name);

-- Answer key: visible to panelists (admins) only
with program as (
  insert into public.training_programs (title, summary, level, audience, active, sort_order)
  values ('CKM round — answer key (panelists only)',
          'Answers and teaching points for the CKM round questions. Only admins / panelists can see this.',
          'Panelists', 'admin', true, 99)
  returning id
)
insert into public.training_lessons (program_id, title, body, resource_url, resource_name, duration_minutes, sort_order)
select program.id, l.title, l.body, l.url, l.url_name, l.minutes, l.ord
from program, (values
  (1, 'Round questions: answers and teaching points', 3,
$$1. Stage 2. Type 2 diabetes, hypertension and moderate-risk CKD (eGFR 72, UACR 45 mg/g) without subclinical or clinical CVD. It would become Stage 3 with subclinical CVD, very-high-risk CKD, or PREVENT 10-year risk ≥20%.
2. The PREVENT equations.
3. It is one criterion for Stage 3 (a risk equivalent of subclinical CVD).
4. Add an SGLT2 inhibitor: it protects the kidney and lowers heart failure risk on top of RAS blockade. Consider GLP-1-based therapy or finerenone next, depending on weight, albuminuria and potassium.
Note: questions are for teaching; individual patients need individual decisions.$$,
   '', '')
) as l(ord, title, minutes, body, url, url_name);
