-- Fixed UUIDs so memoryRepository and Postgres share ids.
INSERT INTO trainees (id, display_name, leaderboard_opt_in) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Demo Trainee', false);

INSERT INTO warning_signs (code, label, fcp_category) VALUES
  ('hopelessness', 'Hopelessness', 'desire'),
  ('perceived_burden', 'Perceived burden', 'desire'),
  ('recent_loss', 'Recent loss', 'desire'),
  ('withdrawal', 'Withdrawal / isolation', 'desire'),
  ('giving_things_away', 'Giving things away', 'intent'),
  ('access_to_means', 'Access to means', 'capability'),
  ('prior_attempt', 'Prior attempt', 'capability'),
  ('substance_use', 'Substance use', 'capability');

INSERT INTO personas (id, slug, name, age, voice_id, backstory, speaking_style, baseline_emotion, is_recurring, content_notes) VALUES
  (
    'b0000000-0000-4000-8000-000000000001',
    'maya-first-semester',
    'Maya',
    19,
    'EXAVITQu4vr4xnSDxMaL',
    'First-year college student living in a dorm. Feeling lonely after moving far from home. Midterms are next week.',
    'soft, trails off, apologizes a lot, short sentences',
    'anxious',
    false,
    ARRAY['exam stress', 'loneliness', 'homesickness']
  ),
  (
    'b0000000-0000-4000-8000-000000000002',
    'ray-callback',
    'Ray',
    46,
    'EXAVITQu4vr4xnSDxMaL',
    'Warehouse supervisor laid off 3 weeks ago. Divorced, one adult daughter. Has been staying in and sleeping poorly.',
    'short sentences, sighs, deflects with dry humor',
    'flat',
    true,
    ARRAY['job loss', 'hopelessness', 'suicidal thoughts (non-graphic)']
  ),
  (
    'b0000000-0000-4000-8000-000000000003',
    'dana-frustrated',
    'Dana',
    34,
    'EXAVITQu4vr4xnSDxMaL',
    'Called crisis services before and felt dismissed. Frustrated with systems. Caring for an aging parent and exhausted.',
    'clipped, irritated, challenges the volunteer, then softens if heard',
    'irritated',
    false,
    ARRAY['frustration with services', 'caregiver stress', 'irritability']
  );

INSERT INTO scenarios (id, persona_id, title, call_number, difficulty_tier, situation_brief, hidden_state, expected_risk_level, initial_distress, is_active) VALUES
  (
    'c0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000001',
    'Can''t sleep before finals',
    1, 1,
    'A young woman calls late at night saying she can''t calm down about exams and feels alone in her dorm.',
    'Homesick and lonely. No suicidal thoughts. Wants someone to listen and help her feel less alone tonight.',
    'low', 55, true
  ),
  (
    'c0000000-0000-4000-8000-000000000002',
    'b0000000-0000-4000-8000-000000000002',
    'Can''t sleep, can''t stop thinking',
    1, 2,
    'A man calls late at night saying he can''t sleep. Recently laid off. Sounds flat and tired.',
    'Feels like a burden to his daughter. Has had passing thoughts of not wanting to wake up. No plan. Has withdrawn from friends.',
    'moderate', 65, true
  ),
  (
    'c0000000-0000-4000-8000-000000000003',
    'b0000000-0000-4000-8000-000000000003',
    'I''ve tried this before',
    1, 3,
    'A caller is irritated and skeptical. They say previous help lines did not listen. Caregiver stress is high.',
    'Angry at being bounced around. Exhausted. Will open up if the volunteer stays calm and does not argue. Moderate distress, low immediate risk.',
    'moderate', 70, true
  ),
  (
    'c0000000-0000-4000-8000-000000000004',
    'b0000000-0000-4000-8000-000000000002',
    'It''s Ray again',
    2, 2,
    'Ray is calling back about a week later. He may reference what you talked about last time.',
    'Tried one coping step from last call. Still struggling with sleep and isolation. Trust depends on how call 1 went.',
    'moderate', 55, true
  );

-- Maya: loneliness / withdrawal-ish cues (low risk)
INSERT INTO scenario_warning_signs (scenario_id, warning_sign_id, cue_hint)
SELECT 'c0000000-0000-4000-8000-000000000001', id, 'Mentions being alone in the dorm / nobody to talk to'
FROM warning_signs WHERE code = 'withdrawal';

INSERT INTO scenario_warning_signs (scenario_id, warning_sign_id, cue_hint)
SELECT 'c0000000-0000-4000-8000-000000000001', id, 'Says everything feels overwhelming lately'
FROM warning_signs WHERE code = 'hopelessness';

-- Ray call 1
INSERT INTO scenario_warning_signs (scenario_id, warning_sign_id, cue_hint)
SELECT 'c0000000-0000-4000-8000-000000000002', id, 'Says things won''t get better / no point trying'
FROM warning_signs WHERE code = 'hopelessness';

INSERT INTO scenario_warning_signs (scenario_id, warning_sign_id, cue_hint)
SELECT 'c0000000-0000-4000-8000-000000000002', id, 'Says his daughter would be better off not dealing with him'
FROM warning_signs WHERE code = 'perceived_burden';

INSERT INTO scenario_warning_signs (scenario_id, warning_sign_id, cue_hint)
SELECT 'c0000000-0000-4000-8000-000000000002', id, 'Hasn''t left the apartment or answered calls in a week'
FROM warning_signs WHERE code = 'withdrawal';

-- Dana
INSERT INTO scenario_warning_signs (scenario_id, warning_sign_id, cue_hint)
SELECT 'c0000000-0000-4000-8000-000000000003', id, 'Mentions cutting off friends because they are tired of hearing it'
FROM warning_signs WHERE code = 'withdrawal';

INSERT INTO scenario_warning_signs (scenario_id, warning_sign_id, cue_hint)
SELECT 'c0000000-0000-4000-8000-000000000003', id, 'Hints that caring for parent took everything and nothing will change'
FROM warning_signs WHERE code = 'hopelessness';

-- Ray call 2
INSERT INTO scenario_warning_signs (scenario_id, warning_sign_id, cue_hint)
SELECT 'c0000000-0000-4000-8000-000000000004', id, 'Still feels stuck even after trying one step'
FROM warning_signs WHERE code = 'hopelessness';

INSERT INTO scenario_warning_signs (scenario_id, warning_sign_id, cue_hint)
SELECT 'c0000000-0000-4000-8000-000000000004', id, 'Still isolating most days'
FROM warning_signs WHERE code = 'withdrawal';
