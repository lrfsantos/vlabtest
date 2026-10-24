# Verb Lab v39 --- Implementation, GitHub Deployment, Testing, and Handoff Brief

## Mission

Take ownership of the existing **Verb Lab v39** project and bring it to
a reliable, classroom-ready state. This is an implementation task, not
just an audit or a list of recommendations.

The source currently supplied for this task is `Verb-Lab-V39.html`. The
current app is a Portuguese-language English-verb learning tool. Work in
the existing GitHub repository that the user has available in their
authenticated browser session. Inspect the repository and its deployment
configuration before deciding what to change.

**Required end state:** correct learning/content logic; a coherent
curriculum covering the major English tense/aspect forms; focused
lessons and quizzes; a maintainable static-site structure; successful
automated and browser-based checks; deployment to the intended GitHub
Pages site; and a final Markdown report describing exactly what was
changed, why, how it was tested, and what remains incomplete.

Do not stop after writing a plan. Implement, test, deploy if authorized
by the available authenticated session, and report honestly. Do not
claim a step succeeded unless you observed evidence that it succeeded.

## Operating rules

1.  **Preserve the existing project and its useful features.** Inspect
    the full repository, README, license, current GitHub Pages
    configuration, service worker, manifest, assets, and current
    application before making changes. Do not replace working features
    casually.
2.  **Protect the original.** Create a working branch or otherwise
    preserve a recoverable baseline before substantial edits. Record the
    original deployed URL and current commit/version if available. Do
    not delete the original file until the replacement is verified.
3.  **Use the authenticated GitHub interface safely.** Work through the
    user's already-authenticated browser/session if the environment
    supports it. Never request or expose passwords, session cookies,
    access tokens, or other secrets. If login, permissions, branch
    protection, or a confirmation step prevents progress, stop at that
    boundary and explain precisely what the user must do.
4.  **Avoid destructive or irreversible actions without explicit
    confirmation.** Do not delete repositories, rewrite history, change
    repository visibility, alter licensing, or overwrite unrelated work.
    Use a branch and pull request when appropriate. If the user has
    clearly authorized direct deployment and repository permissions
    permit it, follow the repository's established workflow.
5.  **Do not invent success.** Distinguish completed, partially
    completed, blocked, and not attempted work. Include evidence such as
    test commands/results, the deployed URL, commit/PR identifiers, and
    observed browser checks where available.
6.  **Keep the UI concise.** Avoid AI-generated filler, slogans,
    decorative explanations, and long commentary inside the app. Every
    UI label and explanation should teach something, guide an action, or
    provide necessary context.
7.  **Use Brazilian Portuguese for learner-facing explanations**, unless
    the existing app has a deliberate reason to use another language.
    English examples must sound natural.
8.  **Respect the existing license.** The source currently mentions the
    PolyForm Noncommercial License 1.0.0 and `LICENSE.txt`. Inspect the
    repository's actual license and preserve its terms; do not silently
    change or remove it.
9.  **Do not add unnecessary backend infrastructure.** GitHub Pages is a
    static host. Prefer HTML, CSS, JavaScript, JSON, and static assets
    unless a demonstrated requirement justifies a backend.
10. **Maintain a detailed work log while working**, then produce the
    final report specified at the end of this brief.

## Findings already identified in the supplied v39 source

Treat these as concrete leads to verify against the current repository,
not as a substitute for inspecting the current version.

-   The current `TABS` curriculum contains broad categories for `pres`
    (a combined "Presente" tab covering base form, third-person `-s`,
    and `-ing`), `past` (simple past), `part` (past participle), and
    `prep` (verb/preposition combinations). It does not constitute a
    complete tense curriculum.
-   The pronunciation tip for `want` says not to add a final "i" sound,
    but a similar reminder is also inserted in general tab guidance.
    This risks showing the warning where it is irrelevant.
-   `microPool()` filters questions by learner level, but
    `keepQuestions(n)` was seen selecting from `MICRO.slice()` directly
    instead of the filtered pool. Verify and correct this mismatch.
-   `makeQuiz()` appears to append micro-lesson questions for non-basic
    levels on tabs other than `prep`. This may mix unrelated learning
    targets into a focused quiz. Verify all quiz-building paths,
    including review, missed-question, and "Keep Your English" modes.
-   The app has a self-test/autotest, but its existence does not prove
    semantic accuracy, naturalness, unambiguous answers, or curriculum
    alignment.
-   The source includes an inline Content Security Policy with
    `script-src 'unsafe-inline'` but not `'self'`. If JavaScript is
    moved to external files, update the policy appropriately or the app
    may block its own scripts.
-   The source registers `sw.js` and references `manifest.webmanifest`,
    icons, and local storage. Inspect these carefully when
    restructuring, especially cache versioning and update behavior.
-   Local-storage keys still contain `verb-lab-v36-*` in several places
    despite the v39 filename/title. Determine whether this is
    intentional backward compatibility or stale versioning; migrate
    safely rather than resetting user progress without a reason.
-   Do not assume every issue above remains present after inspecting the
    actual GitHub repository. Record what was confirmed, already fixed
    upstream, or disproved.

## Workstream 1 --- Full source and content audit

Audit the entire application, not just a sample of visible examples.

### Inventory

-   Identify all verbs and their forms: base, third-person singular,
    present participle, simple past, past participle, pronunciation
    guidance, translations, example sentences, distractors, and answer
    keys.
-   Identify every question generator, template, randomizer, quiz mode,
    difficulty path, lesson tab, feedback path, persistence mechanism,
    service worker, and PWA asset.
-   Find duplicate or near-duplicate examples, unused data, dead code,
    inconsistent naming, invalid references, and obsolete version
    strings.
-   Trace the full route from data source → question generation →
    displayed question → accepted answer → feedback → score/progress
    update.

### Language and pedagogy review

For every example and exercise, verify:

-   Natural, idiomatic contemporary English.
-   Correct grammar, spelling, inflection, and punctuation.
-   Correct Brazilian Portuguese translation that preserves the intended
    meaning.
-   Appropriate vocabulary and context for the selected difficulty.
-   A clear instruction that states the target form when needed.
-   Enough context for **one defensible intended answer**.
-   Plausible distractors that are wrong in the given context, not
    merely less likely.
-   Answer key, accepted typed answers, explanation, and feedback agree
    with one another.
-   No exercise tests an untaught form unless it is explicitly marked as
    cumulative review.
-   No sentence is technically grammatical but semantically bizarre,
    unnatural, or unhelpful for learners.

Prefer relatable contexts---school, work, commuting, games, social
media, shopping, friends, routines, deadlines, and plans---without
forcing slang or stereotypes. Avoid examples that are contrived solely
to fit a verb.

### Ambiguity rule

A prompt such as **"She \_\_\_ her keys."** is ambiguous without
context. Depending on context, several forms can be grammatical. Fix it
by naming the target form and adding context, for example:

> Complete using the **Past Simple**: "She \_\_\_ her keys yesterday, so
> she couldn't get into her apartment."

The correct answer and distractors must be checked against the exact
sentence. Do not rely on the answer being "what the author probably
meant."

## Workstream 2 --- Pronunciation guidance for Brazilian learners

Audit every pronunciation hint and the code that decides when to display
it.

-   The warning about adding a final Brazilian Portuguese-style "i" must
    appear **only when it helps with the specific word/form being
    learned**.
-   For example, `want` may warrant a concise warning against adding an
    extra vowel after the final consonant. Do not automatically show
    that warning for `wants`, where the final `-s` ending and its
    pronunciation are a different learning target.
-   Teach relevant distinctions separately: base forms, third-person
    `-s/-es`, regular past `-ed` pronunciations (`/t/`, `/d/`, `/ɪd/`),
    and other high-value pronunciation contrasts.
-   Check every approximation written with Portuguese spelling. It must
    be useful and not imply that an approximation is exact phonetic
    transcription.
-   Prefer a structured, data-driven mapping from a specific word/form
    or rule to a concise hint over one global warning inserted into
    every tab.
-   Ensure the hint is accessible, non-repetitive, and does not
    overwhelm the exercise.

## Workstream 3 --- Build a coherent tense/aspect curriculum

Expand the current content into a structured curriculum. Do not treat
the existing four tabs as comprehensive.

Use the familiar **12-form teaching framework** below as a practical
curriculum organization. Be linguistically accurate: English
tense/aspect terminology differs across grammar frameworks, so avoid
claiming that these are twelve distinct morphological tenses in every
linguistic analysis.

### Core 12-form sequence

**Present** 1. Present Simple 2. Present Continuous 3. Present Perfect
4. Present Perfect Continuous

**Past** 5. Past Simple 6. Past Continuous 7. Past Perfect 8. Past
Perfect Continuous

**Future-oriented forms** 9. Future Simple (`will`) 10. Future
Continuous 11. Future Perfect 12. Future Perfect Continuous

Also teach these as clearly labeled **related constructions**, not as if
they were simply extra members of the same 12-form list:

-   `be going to` for plans and predictions
-   Present Continuous and Present Simple used for future
    arrangements/schedules
-   Modal verbs and modal meanings where appropriate
-   Conditionals, passive voice, and common verb patterns in separate
    modules
-   Phrasal verbs and verb + preposition combinations as a separate
    vocabulary/usage area

### Required lesson structure for each core form

Each form must have a real, reviewed lesson---not merely a tab label or
a one-line definition. Include:

1.  **Meaning and uses:** when it is used, with practical examples and
    any important limits.
2.  **Formation:** affirmative, negative, questions, short answers where
    useful, contractions, and auxiliary placement.
3.  **Subject agreement:** all relevant person/number patterns,
    including third-person singular where applicable.
4.  **Spelling and pronunciation:** only rules relevant to that form.
5.  **Common Brazilian learner errors:** concise, accurate, respectful
    guidance.
6.  **Contrast with likely confusions:** e.g. Present Simple vs Present
    Continuous, Past Simple vs Present Perfect, Past Perfect vs Past
    Simple, and future constructions. Teach contrasts in a dedicated
    comparison module after the forms are introduced.
7.  **Natural examples:** multiple contexts and
    affirmative/negative/interrogative variations.
8.  **Portuguese translations:** natural translations that preserve the
    English meaning; note when a literal translation would mislead.
9.  **Guided practice:** a small set with feedback.
10. **Focused review quiz:** a larger, varied set with explanations for
    answers and common errors.

Do not publish shallow filler to meet a count. If time or capacity
prevents completing a form to this standard, report the exact forms and
components still incomplete. Prefer a smaller, accurate set over a
misleading claim of completeness---but the goal for this task is to
complete the full sequence.

## Workstream 4 --- Strict quiz targeting

A focused lesson or quiz must test only the form or skill the learner
selected.

-   A Present Simple quiz must not unexpectedly test Past Simple,
    Present Perfect, or unrelated micro-lessons.
-   A Past Simple quiz must not mix in another tense merely because the
    learner selected "advanced."
-   Keep cumulative/mixed-tense review as a **separate, explicitly
    labeled mode**, available only after the learner has been taught the
    relevant forms.
-   Make the target form visible in the instruction or lesson context.
-   Review mode, missed-question practice, randomization, typed-answer
    validation, and "Keep Your English" must follow their own clearly
    stated scopes.
-   Randomization should vary questions and option order without making
    the correct answer ambiguous or breaking grammatical agreement.
-   Ensure refresh/new round functionality genuinely produces a new
    eligible set where enough content exists. Avoid accidental
    repetition until the pool is exhausted when possible.

## Workstream 5 --- Meaningful difficulty levels

Audit the difficulty control end to end. The levels must differ in the
actual cognitive demand, not just in the number of questions or a label.

Suggested model:

-   **Basic:** recognition and controlled form-building; familiar
    vocabulary; explicit target tense; strong time/context clues.
-   **Intermediate:** contextual selection, negatives/questions,
    transformations, error correction, and discrimination among forms
    already taught.
-   **Advanced:** richer context, timelines/sequences, subtle but fair
    distinctions, editing, and short original production. Advanced
    questions still need one defensible answer or an explicitly
    open-ended rubric.

Requirements:

-   Difficulty is applied through the actual question pool and
    generator, including micro-lessons and special modes.
-   A focused quiz stays focused on the selected tense at every level.
-   Advanced must not mean "mix in untaught tenses."
-   Add tests proving each level produces the intended level of content
    and that changing the setting actually changes the question
    selection/demand.
-   Do not silently reset the learner's level or stored progress on
    refresh.

## Workstream 6 --- Data and architecture for GitHub Pages

The app can be hosted on GitHub Pages as a static site. Use that
capability to improve maintainability; do not split files merely for the
sake of splitting them.

A reasonable target structure, adjusted to the actual repository and
build needs:

``` text
verb-lab/
├── index.html
├── assets/
│   ├── styles.css
│   ├── app.js
│   └── pronunciation.js
├── data/
│   ├── curriculum.json
│   ├── verbs.json
│   └── pronunciation-tips.json
├── lessons/
│   ├── present-simple.json
│   ├── present-continuous.json
│   └── ... one file per lesson/form as appropriate
├── exercises/
│   ├── present-simple.json
│   ├── present-continuous.json
│   └── ... one file per focused exercise set as appropriate
├── tests/
│   └── content-validation.js
├── manifest.webmanifest
├── sw.js
├── icon-192.png
├── icon-512.png
├── LICENSE.txt
└── README.md
```

This is a proposed structure, not a requirement to copy literally.
Choose a structure that works with the existing repository, deployment
setup, and test environment.

### Static hosting requirements

-   Ensure the entry point works at the GitHub Pages project-site path
    (often `/<repository-name>/`), not only at `/`.
-   Use relative asset URLs or correctly configured base paths.
-   Verify JSON fetch paths, script/style paths, icons, manifest, and
    service-worker scope under the deployed subpath.
-   If scripts move to external files, update the current CSP to allow
    only what is needed, including same-origin scripts where required.
    Do not weaken the policy unnecessarily.
-   Keep the app functional offline only if the service worker
    implements that behavior correctly. Version caches, remove stale
    caches safely, and ensure a newly deployed version is not trapped
    behind an old cache.
-   Preserve progress and settings. If storage keys or schemas change,
    implement and test a safe migration where possible. Do not call
    `localStorage.clear()` as a routine migration strategy.
-   Avoid unnecessary third-party runtime dependencies, trackers,
    analytics, and network requests.
-   Check browser-console errors and failed network requests after
    deployment.

### Keep content separate from logic

Where practical, keep lesson content, examples, translations,
pronunciation tips, and exercise data separate from rendering and quiz
logic. Use a consistent schema and validation so content can be reviewed
without editing core application code. If JSON is used, validate parsing
and required fields. Do not introduce a build system unless it solves a
real problem and can be deployed/tested reliably.

## Workstream 7 --- Automated validation and tests

Build on existing tests rather than deleting or weakening them. Add
deterministic tests wherever possible.

### Content/data validation

Test for:

-   Missing required fields and invalid references.
-   Duplicate IDs, malformed options, duplicate answer choices, and
    impossible correct answers.
-   Empty prompts, missing feedback, missing translations where
    required, and invalid target-form IDs.
-   Focused quizzes containing questions tagged for unrelated forms.
-   Questions whose declared correct answer is not accepted by the
    answer checker.
-   Answer options and typed-answer variants that disagree with the
    answer key.
-   Missing or invalid verb forms and spelling-rule edge cases.
-   Pronunciation hints shown for forms/words to which they do not
    apply.
-   Broken links or asset references, malformed JSON, and invalid
    curriculum references.

Automated tests cannot reliably decide whether every sentence sounds
natural. Combine automated checks with a manual review of every content
item and record any remaining uncertainty.

### Functional tests

Test at minimum:

-   App startup with no stored data and with existing stored data.
-   Every lesson opens and renders all its content.
-   Each focused quiz contains only the selected target.
-   Each difficulty setting changes content/demand as intended.
-   Correct and incorrect answers, retries, explanations, typed answers,
    score, XP, and progress.
-   Randomization, refreshing/restarting a round, and avoiding unwanted
    immediate repeats.
-   Review and missed-question modes.
-   Settings, theme, text size, spacing, and persistence.
-   Reset behavior only when deliberately requested by the learner.
-   Mobile/small viewport and desktop/projector readability.
-   Keyboard navigation, visible focus, labels, and basic accessibility.
-   Offline/update behavior if the service worker is retained.
-   GitHub Pages deployment at the actual published URL, including
    subpath assets and browser console/network errors.

Use the available test runner and browser tools. If browser automation
is available, run it against a local preview and the deployed URL. If
not, do manual browser checks and clearly disclose the limitation. Do
not claim tests ran if they did not.

### Regression checklist

Keep a record of existing functionality and verify that the
restructuring has not silently removed useful features such as verb
browsing, pronunciation support, quizzes, progress, settings,
install/PWA support, classroom link sharing, or other features found in
the repository.

## Workstream 8 --- GitHub workflow and deployment

1.  Inspect repository owner/name, default branch, current deployment
    method, current site URL, recent history, and existing open changes.
2.  Establish a recoverable baseline (branch/commit or backup).
3.  Implement in coherent steps. Keep the changes scoped and
    explainable.
4.  Run tests locally or in the available environment before committing.
5.  Review the final diff for accidental deletions, secrets, debug
    output, broken paths, licensing changes, and unrelated edits.
6.  Commit changes with a clear message. If appropriate, open a pull
    request with a concise summary and test evidence.
7.  Deploy using the repository's established GitHub Pages workflow. Do
    not change the repository's publishing source or permissions without
    understanding the effect.
8.  Wait for deployment completion if the environment supports checking
    it. Open the **actual published URL** and verify the deployed
    version, not just the local preview.
9.  Test refresh, navigation, assets, lesson loading, quizzes,
    persistence, and service-worker updates on the deployed site.
10. If deployment is blocked by permissions, a missing action, branch
    protection, or an unavailable authenticated browser, leave the work
    in the safest useful state and give exact next steps. Never imply
    deployment occurred when it did not.

## Workstream 9 --- Final deliverables

Create and commit a final report named something like
`IMPLEMENTATION-HANDOFF.md` or `VERB-LAB-V40-IMPLEMENTATION-REPORT.md`
in the repository, and also make it available to the user if the
environment supports downloading or sharing it.

The report must be specific to the work actually performed and include:

### A. Summary

-   What was delivered.
-   Final app version and deployed URL, if deployed.
-   Commit hash, branch, and PR URL if applicable.

### B. Audit findings

-   Confirmed issues.
-   Suspected issues that were checked and disproved.
-   Any newly discovered problems.

### C. Changes made

For each major change: - Files created, edited, moved, or removed. -
Before/after behavior. - Reason for the change. - Relevant logic or
design decisions. - Any compatibility or migration implications.

### D. Curriculum and content

-   Which tense/aspect forms and related constructions were completed.
-   Which lesson sections and exercise types exist for each.
-   What validation was applied to examples, translations, distractors,
    answer keys, and pronunciation tips.
-   Any content not fully reviewed or still uncertain.

### E. Testing evidence

-   Exact commands/tools used.
-   Number of tests passed/failed/skipped where available.
-   Manual browser tests performed.
-   Devices/viewports/browsers actually tested, if known.
-   Deployment checks and any console/network issues.
-   Do not fabricate metrics or testing coverage.

### F. GitHub/deployment steps

-   Repository and branch used.
-   Commits/PRs.
-   Workflow or Pages settings changed, if any, and why.
-   Actual deployed URL and observed deployment result.
-   Any step the agent could not perform and the exact blocker.

### G. Limitations and remaining work

-   What could not be done and why.
-   Known bugs or risks.
-   Untested browsers/devices.
-   Any incomplete lessons or review tasks.
-   The next most useful steps, prioritized.

### H. Reproduction instructions

-   How to run the static app locally.
-   How to run all tests.
-   How to preview/build/deploy, according to the repository's actual
    setup.
-   Any required tools or prerequisites.

## Definition of done

Do not call the task complete until all applicable points below are
satisfied or explicitly reported as blocked:

-   [ ] Existing repository and license inspected.
-   [ ] Original version recoverable.
-   [ ] Full source/content audit completed and findings recorded.
-   [ ] Pronunciation reminders are contextual and correct.
-   [ ] Ambiguous exercises fixed or clearly redesigned.
-   [ ] Focused quizzes do not mix unrelated/untaught forms.
-   [ ] Difficulty modes differ meaningfully and are tested.
-   [ ] All 12 core forms have substantive, reviewed lessons and focused
    practice, or each omission is explicitly documented.
-   [ ] Related constructions are clearly separated from the 12-form
    framework.
-   [ ] Content is maintainable and validated.
-   [ ] CSP, asset paths, manifest, service worker, and storage
    migration are checked after any restructuring.
-   [ ] Automated tests pass, with failures and skips disclosed.
-   [ ] Manual/browser checks are completed to the extent tools permit.
-   [ ] GitHub Pages deployment is verified at the actual published URL,
    or the blocker is documented.
-   [ ] Final implementation report is written, committed, and made
    available to the user.
-   [ ] No unsupported claim of completion, test coverage, or deployment
    remains.

**Priority:** correctness and learning quality first; curriculum
completeness second; maintainability and deployment reliability third;
visual polish only after the learning experience is reliable. Keep
changes focused on real user value.
