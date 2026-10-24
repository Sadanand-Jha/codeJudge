# Button Inventory — code-judge-frontend

Complete list of every button on the site, grouped by area → file.
Type is inferred from usage/className/props: `primary` (main CTA), `secondary`, `ghost`,
`icon-only`, `close`, `tab`, `filter` (chip/dropdown option), `toggle` (switch/aria-pressed),
`pagination`, `danger` (destructive), `submit`, `link` (anchor/Link styled as button).

> Not included: plain text links that don't look like buttons, `<details>/<summary>`, radios.
> Icon-only buttons show `[icon: …]` plus aria-label/title when present.

---

## 1. Landing, Marketing, Auth & Pricing

### src/components/marketing/landing/FeatureTabs.tsx
- `"Live quizzes" / "Responses" / "Analytics" / "Game mode"` — tab — :227

### src/components/marketing/landing/FeedbackForm.tsx
- `"Send another"` — secondary — :96
- `"Bug or problem" / "Feature request" / "Quiz or question issue" / "Credits and billing" / "Something else"` (category chips) — filter — :114
- `"Sending…" / "Send feedback"` — submit — :150

### src/components/marketing/landing/GeneratorStudio.tsx
- `"Deadlocks" / "Paging" / "Synchronization"` (topic chips) — filter — :280
- `[icon: −]` aria-label `Fewer {difficulty}` — icon-only — :297
- `[icon: +]` aria-label `More {difficulty}` — icon-only — :306
- `"Generating…" / "Generate {n} questions"` — primary — :318
- `"✓ In paper" / "+ Add to paper"` — toggle — :360
- `"Include in paper"` — toggle — :417
- `"Export PDF"` — secondary — :432
- `"Export Word"` — secondary — :435
- `[icon: ×]` aria-label `Remove question {n}` — close — :460

### src/components/marketing/QuizCodeForm.tsx
- `"Join quiz"` (ctaLabel) — submit — :51

### src/components/marketing/SampleQuizDemo.tsx
- `"Try again"` — secondary — :76
- answer option buttons `{option}` — secondary — :98
- `"See score" / "Next question"` — primary — :122

### src/components/auth/AuthThemeChrome.tsx
- Theme toggle (renders `ThemeToggle`) — icon-only — :273

### src/components/forms/RegistrationForm.tsx
- `"Sending..." / "Continue"` — submit — :564
- `"Verifying..." / "Verify"` — submit — :601
- `"Resending..." / "Resend code in {n}s" / "Resend code"` — secondary — :610
- `"Start over"` — secondary — :662
- `"I'm a student" / "I'm a teacher"` (account type radios) — toggle — :698
- `"Continue as {accountType}"` — primary — :719
- `"Continue"` — primary — :784
- `"Avatar 1" … "Avatar 6"` (avatar radios) — toggle — :819
- `"Back"` — secondary — :843
- `"Continue"` — primary — :850
- `[icon: Eye/EyeOff]` aria-label `Hide password / Show password` — icon-only — :884
- `[icon: Eye/EyeOff]` aria-label `Hide password / Show password` (confirm) — icon-only — :917
- `"Back"` — secondary — :958
- `"Creating..." / "Create account"` — submit — :965

### src/components/modals/AuthModal.tsx
- `[icon: X]` (no aria-label) — close — :112

### src/app/(auth)/login/page.tsx
- `[icon: Eye/EyeOff]` aria-label `Hide password / Show password` — icon-only — :146
- `"Signing in..." / "Continue to QuizSupport"` — submit — :167

### src/app/(auth)/forgot-password/page.tsx
- `"Sending..." / "Continue"` — submit — :270
- `"Verifying..." / "Verify"` — submit — :309
- `"Resend in {n}s" / "Resend code"` — secondary — :318
- `[icon: Eye/EyeOff]` aria-label `Hide password / Show password` — icon-only — :353
- `[icon: Eye/EyeOff]` aria-label `Hide password / Show password` (confirm) — icon-only — :392
- `"Resetting..." / "Reset password"` — submit — :416

### src/app/meet-the-developer/DeveloperPortfolio.tsx
- `[icon: Sun/Moon]` aria-label `Switch to light/dark theme` — icon-only — :230

### src/app/scratch-credits/page.tsx
- `[icon: hamburger]` aria-label `Open Studio navigation` — icon-only — :22
- `[icon: X]` aria-label `Close menu` — close — :55

### src/components/pricing/story/ArrivalSection.tsx
- `"Explore the Universe"` — primary — :70

### src/components/pricing/story/PricingCardsSection.tsx
- `"Choose Student Pro" / "Choose Creator Pro" / "Go Ultimate"` — primary — :177
- `"Build your own custom plan →"` — ghost — :199

### src/components/pricing/story/AICompanionSection.tsx
- `"AI Coding" / "AI Debugging" / "AI Hints" / "AI Complexity" / "AI Review"` (orbit cards) — secondary — :50
- `[icon: X]` aria-label `Close` — close — :164

### src/components/pricing/story/light/LightArrivalSection.tsx
- `"Explore the Cloud"` — primary — :97

### src/components/pricing/story/light/LightPricingCardsSection.tsx
- `"Choose Student Pro" / "Choose Creator Pro" / "Go Ultimate"` — primary — :201
- `"Build your own custom plan →"` — ghost — :223

### src/components/pricing/story/light/LightAICompanionSection.tsx
- `"AI Coding" / "AI Debugging" / "AI Hints" / "AI Complexity" / "AI Review"` (orbit cards) — secondary — :50
- `[icon: X]` aria-label `Close` — close — :181

### src/app/pricing/page.tsx
- `"Hide details" / "What's included"` — secondary — :511
- `"Enabled" / "Add to plan"` (feature checkbox) — toggle — :544
- `{opt.label}` radio options with price — toggle — :566
- `"Enabled" / "Add to plan"` (quantity feature) — toggle — :588
- `[icon: Minus]` (no aria-label) — icon-only — :596
- `[icon: Plus]` (no aria-label) — icon-only — :604
- `"Monthly" / "Yearly"` — tab — :653
- `[icon: remove]` aria-label `Remove {feature}` — close — :696
- `"Upgrade to Ultimate"` — primary — :745
- `"Processing..." / "Select features to continue" / "Checkout · ₹{total}"` — primary — :751
- `"Add"` — primary — :797
- `"Upgrade to Ultimate"` — primary — :870
- `"Buy Credits"` — primary — :1138
- `"Everything" / "For Students" / "For Creators"` — tab — :1194
- `"Get Started" / "Choose Teacher Pack" / "Get Master Pack"` — primary — :1785
- `{faq.q}` (FAQ toggle) — ghost — :1833
- `"Your plan" + count + ₹{total}/mo` (opens summary) — secondary — :1917
- `[icon: X]` aria-label `Close summary` — close — :1956

### Link CTAs styled as buttons (landing/about/contact/privacy/docs/dev-portfolio)
- `"Log in"`, `"Create a quiz"` — link — src/app/page.tsx:221, :224
- `"Find practice sets" / "See AI credits" / "Explore features"` — link — src/app/page.tsx:336
- `"Get Started" / "Choose Teacher Pack" / "Get Master Pack"` — link — src/app/page.tsx:372
- `"Create a quiz"`, `"Join with a code"` — link — src/app/page.tsx:403, :407
- `"Create a quiz"`, `"Meet the developer"` — link — src/app/about/page.tsx:106, :197
- `"Create a quiz"`, `"Join with a code"` — link — src/app/about/page.tsx:228, :239
- GitHub / LinkedIn — icon-only link — src/app/about/page.tsx:208, :217
- `"Create a quiz"` — link — src/app/contact/page.tsx:58
- `"Compose email" / "Open docs" / "Read policy"` — link — src/app/contact/page.tsx:103–107
- `"Create a quiz"`, `"Email support"`, `"Contact page"` — link — src/app/privacy/page.tsx:84, :118, :155, :159
- `"Back to Home"` — link — src/app/docs/page.tsx:56
- `"About QuizSupport"`, `"Platform"` — link — DeveloperPortfolio.tsx:229, :231
- GitHub / LinkedIn — icon-only link — DeveloperPortfolio.tsx:245, :246
- `"Explore the platform" / "Connect on LinkedIn" / "View GitHub"` — link — DeveloperPortfolio.tsx:300, :304

## 2. Layout, Common UI, Feed, Profile, Settings, Leaderboard, Collections

### src/components/layout/AppLayout.tsx
- `[icon: X]` aria-label `Close` (logout modal) — close — :92
- `"Cancel"` — secondary — :120
- `"Log out"` — danger — :128
- `"Sign in to unlock all features →"` — primary — :436
- `[icon: hamburger]` aria-label `Open navigation` — icon-only — :497
- `<BackButton />` (default label "Back") — secondary — :506
- Profile menu trigger (avatar + `{username}`) — secondary — :626
- `"Switch account"` — secondary — :684
- `"Log out"` — danger — :693

### src/components/layout/BackButton.tsx
- `{label}` (default `"Back"`) — secondary — :42

### src/components/layout/NotificationBell.tsx
- `[icon: Bell]` aria-label `Notifications` (unread badge) — icon-only — :119
- `"Mark all read"` — secondary — :163

### src/components/layout/Navbar.tsx
- `"EN"` (Globe icon, language selector) — secondary — :60
- `"Logout"` — danger — :70

### src/components/layout/NavbarRightActions.tsx
- `"Sign in"` — primary — :75

### src/components/layout/NavbarPromoWidget.tsx
- `"Upgrade"` — primary — :309

### src/components/layout/WorkspaceSwitcher.tsx
- `"Studio" / "Student"` (trigger, title `Switch workspace`) — secondary — :68

### src/components/common/ComingSoonOverlay.tsx
- `"Dismiss"` — secondary — :50
- `[icon: ×]` aria-label `Close` — close — :57

### src/components/ui/ThemeToggle.tsx
- `[icon: Sun/Moon]` aria-label `Switch to light/dark theme` — icon-only — :31
- pill switch `role="switch"` same aria-label — toggle — :47

### src/components/ui/settings.tsx
- Toggle `role="switch"` (no text) — toggle — :22
- SettingsSelect trigger `{label / "Select..."}` — secondary — :243
- option `{opt.label}` — filter — :279
- ConfirmDialog `{cancelLabel / "Cancel"}` — secondary — :404
- ConfirmDialog `{confirmLabel / "Confirm"}` — primary — :410

### src/components/ui/SortDropdown.tsx
- trigger `{selected.label}` — secondary — :50
- option `{opt.label}` — filter — :87

### src/components/ui/searchable-dropdown.tsx
- `[icon: X]` aria-label `Clear selection` — icon-only — :383
- `"Retry"` — secondary — :429
- option `{option.label}` — filter — :460

### src/components/ui/toast/ToastCard.tsx
- `{toast.action.label}` action — secondary — :154
- `[icon: X]` aria-label `Dismiss notification` — close — :168

### src/components/dashboard/CollaboratorRequestsInbox.tsx
- `"Accept"` — primary — :159
- `"Reject"` — secondary — :167

### src/components/dashboard/RatingHistory.tsx
- `"7D" / "1M" / "6M" / "1Y"` — tab — :85

### src/components/settings/AvatarSettings.tsx
- `"Change Avatar"` — secondary — :72

### src/components/settings/AvatarSelectionModal.tsx
- `[icon: X]` (no aria-label) — close — :163
- avatar choices `{img.label}` aria-label `Select {label}` — toggle — :218
- `"Cancel"` — secondary — :307
- `"Saving..." / "Save Changes"` — primary — :314
- `"Got it"` — primary — :376

### src/components/settings/SettingsSidebar.tsx
- nav items: Profile, Personal Info, Competitive, Coding Prefs, Account, Privacy, Notifications, Appearance, Connected, Danger Zone — tab — :80
- `[icon: X]` aria-label `Close settings navigation` — close — :206

### src/components/feed/ArticleView.tsx
- `"Like"` — secondary — :215
- `"Comment"` — secondary — :224
- `"Save"` — secondary — :231
- `"Share"` — secondary — :239
- `"Share"` — secondary — :131
- `"Saved" / "Save"` — toggle — :139
- `[icon: MoreHorizontal]` aria-label `More options` — icon-only — :152

### src/components/feed/AuthorCard.tsx
- `"Following" / "Follow"` — toggle — :61
- `[icon: Heart]` `{likeCount}` — icon-only — :84
- `[icon: MessageSquare]` `{commentCount}` — icon-only — :95
- `"Saved" / "Save"` — toggle — :103
- `"Share"` — secondary — :114

### src/components/feed/ArticleHero.tsx
- `"Following" / "Follow"` — toggle — :241
- `{likeCount} Likes` — secondary — :258
- `{commentCount} Comments` — secondary — :269
- `"Saved" / "Save"` — toggle — :277
- `"Share"` — secondary — :288

### src/components/feed/ArticleToc.tsx
- `"In this article" + {activeLabel}` toggle — ghost — :68

### src/components/feed/StepByStepVisualizer.tsx
- `"Previous"` — pagination — :211
- `"Replay" / "Pause" / "Play"` — primary — :220
- `"Next"` — pagination — :233

### src/components/feed/ArticleSidebar.tsx
- `"Following" / "Follow"` — toggle — :76

### src/components/feed/ArticleMarkdown.tsx
- `[icon: Copy]` title `Copy code` (shows "Copied") — icon-only — :51

### src/components/feed/CommentsSection.tsx
- `[icon: Heart]` `{likes}` — icon-only — :61
- `"Reply"` — ghost — :72
- `[icon: Send]` aria-label `Post reply` — icon-only — :96
- `"Post Comment"` — primary — :222

### src/components/profile/PurchaseInvoice.tsx
- `"Download / Print"` — secondary — :14
- `[icon: X]` aria-label `Close invoice` — close — :20

### src/components/profile/ProfileWorkspace.tsx
- `{activeItem.label / "Profile"}` (mobile nav opener) — secondary — :39

### src/components/profile/ProfileSidebar.tsx
- `[icon: X]` aria-label `Close profile navigation` — close — :240

### src/components/profile/InboxPage.tsx
- `"Mark all read"` — secondary — :165
- tabs `{tab.label}` (All, Collaboration, Notifications) — tab — :179
- `"Accept"` — primary — :291
- `"Reject"` — secondary — :302

### src/components/profile/SocialPage.tsx
- `"Search"` — primary — :189
- `"Following" / "Follow"` — toggle — :227
- `"Follow"` (suggested) — primary — :268
- `"Unfollow"` — danger — :369
- `"Following" / "Follow"` — toggle — :379

### src/components/profile/ProfileOverview.tsx
- `"Link Copied" / "Copy Profile Link"` — secondary — :474

### src/components/profile/PurchasesPage.tsx
- product card `role="button"` — secondary — :127
- `"View Results"` — primary — :172
- `"View Details"` — secondary — :179
- `"Continue →"` — primary — :186
- `"Continue →"` — primary — :281
- `[icon: X]` aria-label `Dismiss` — close — :315
- `"Start now"` — primary — :324
- `"Go to My Purchases"` — secondary — :327
- `[icon: X]` (no aria-label) — close — :420
- `"View Results"` — primary — :469
- `"View Details" / "Continue Test Series"` — secondary — :473
- `"Download Invoice"` — secondary — :477
- `[icon: X]` (no aria-label) — close — :553
- `"Download Invoice (PDF)"` — primary — :588
- `[icon: Eye]` aria-label `View order {id}` — icon-only — :636
- filters: ALL, TEST SERIES, ACTIVE, COMPLETED, EXPIRED, RECENTLY PURCHASED — filter — :729
- sort trigger — secondary — :746
- sort options {s.label} — filter — :759

### src/app/error.tsx
- `"Try again"` — primary — :29

### src/app/leaderboard/page.tsx
- `[icon: X]` (close) — close — :231
- scope options: Global, Country, College, Friends, Company — filter — :500
- timeframe options: Weekly, Monthly, All Time — filter — :517
- `"Load More"` — secondary — :564
- `"Register Now"` — primary — :639
- `"Attempt Challenge"` — primary — :687

### src/app/collections/page.tsx
- `"Continue Learning"` — primary — :462
- `"Filters"` — secondary — :484
- `"Clear all"` — ghost — :495
- difficulty filter chips `{f}` — filter — :509
- category filter chips `{f}` — filter — :527
- status filter chips `{f}` — filter — :545
- `"Completed" / "Continue" / "Start"` — primary — :638
- `"Close"` — secondary — :677
- `"Solve"` — primary — :755
- `[icon: Bookmark]` (no aria-label) — icon-only — :758
- `"Register"` — primary — :922

### src/app/(dashboard)/settings/page.tsx
- `{activeSectionLabel}` mobile section menu — secondary — :503
- `"Reset"` (disabled) — secondary — :548
- `"Saving..." / "Save Changes"` (disabled) — primary — :556
- `"Change Password"` — secondary — :762
- theme options: Dark, Light, System — toggle — :856
- `[icon: accent swatch]` title `{color.label}` (Purple/Blue/Green/Orange/Red) — icon-only — :878
- `"Verify"` (VerifyButton used at :645, :707–:712) — secondary — :1189
- `"Disconnect"` — danger — :1251
- `"Connect"` — primary — :1259
- DangerAction `{buttonLabel}`: Delete Account, Export Data, Deactivate, Clear Sessions, Delete Conversations — danger — :1301 (call sites :938–:1023, disabled)
- ConfirmDialog dynamic `{confirmLabel}`: Reset, Delete Forever, Deactivate, Clear All, Delete All — primary/danger — confirmState :1032
- `"View Profile"`-style ExternalLinkButton is an `<a>` — link — :1203

## 3. Preparation, Problems & Editor

### src/components/preparation/PreparationHero.tsx
- `"Goal {role}"` — primary — :78

### src/components/preparation/PreparationWorkspace.tsx
- `{activeItem.label / "Preparation"}` (mobile nav opener) — secondary — :38

### src/components/preparation/PreparationSidebar.tsx
- `[icon: X]` aria-label `Close preparation navigation` — close — :149

### src/app/(app)/preparation/page.tsx
- `[icon: close]` aria-label `Close` — close — :695
- preset buttons `{preset.role}` (+ target/date) — secondary — :708

### src/app/(app)/preparation/roadmaps/page.tsx
- `"Continue Learning"` — primary — :362
- `"Filters"` (+ count) — secondary — :384
- `"Clear all"` — ghost — :397
- difficulty filters: Beginner, Intermediate, Advanced — filter — :419
- category filters: DSA, Competitive Programming, Interview Preparation, System Design, Backend, Frontend, AI/ML — filter — :437
- language filters: C++, Java, Python, JavaScript, TypeScript — filter — :455
- status filters: Not Started, In Progress, Completed — filter — :473
- `"Completed" / "Continue" / "Start"` — primary — :556
- `"Close"` — secondary — :591
- `"Review" / "Start"` — primary — :657
- `"Mark Complete"` — primary — :661
- `"Register"` — primary — :798

### src/app/(app)/preparation/companies/page.tsx
- category filters `{cat}` — filter — :49

### src/app/(app)/preparation/interviews/page.tsx
- `"Organize by {t}"` (Company, Role, Difficulty, Topic, Experience) — filter — :238
- difficulty filters: Easy, Medium, Hard — filter — :254

### src/app/(app)/preparation/discussions/page.tsx
- `"Write Article"` — primary — :224
- `"Ask Question"` — primary — :228
- tabs: Latest, Trending, Following, My Discussions, Interview Experiences, Company Prep, Roadmaps, Study Strategies — tab — :267
- categories: Interview Experiences, Company Preparation, DSA, System Design, CS Fundamentals, Roadmaps, Career Advice, Study Strategies, Contests, Bookmarks, Following — filter — :291
- likes count — icon-only — :370
- comments count — icon-only — :374
- `[icon: bookmark]` — icon-only — :384
- `[icon: share]` — icon-only — :393
- `"Follow"` — primary — :465

### src/app/(app)/preparation/practice/page.tsx
- subjects: DSA, System Design, DBMS, OS, CN, OOP, Aptitude, SQL, Coding — filter — :110

### src/app/(app)/preparation/progress/page.tsx
- `"Export report"` — secondary — :88
- timeframes: This week, This month, All time — tab — :98

### src/components/problem/ProblemSidebar.tsx
- `"Run Code"` — secondary — :74
- `"Ask AI Coach"` — primary — :77
- NavItem buttons (Editorial, Discussion, Accepted Solutions, Related Problems; disabled) — tab — :117

### src/components/problem/SubmitWidget.tsx
- `"Submit"` — primary — :71

### src/components/problem/SampleTestTabs.tsx
- `"Sample {n}"` — tab — :43
- `"Copied" / "Copy"` — secondary — :124

### src/components/problem/SampleTestCard.tsx
- `"Copied" / "Copy"` — secondary — :62

### src/components/problemset/FilterBar.tsx
- quick filters: All, Solved, Attempted, Unsolved, Bookmarked, Daily Challenge, Company Questions, Recommended — filter — :59
- `"All Ratings"` — filter — :77
- difficulty: 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200+ — filter — :90
- topics: Arrays, DP, Graphs, Trees, Greedy, Math, Binary Search, Strings, Segment Tree, Bitmask, Implementation, Sorting, Interactive, Geometry — filter — :115

### src/components/problemset/Pagination.tsx
- `"Previous"` — pagination — :23
- `{p}` page numbers — pagination — :36
- `"Next"` — pagination — :50

### src/components/problemset/RightSidebar.tsx
- `"Register Now"` — primary — :116

### src/components/problemset/FilterProblemsWidget.tsx
- `"Add tag"` — secondary — :19
- `"Apply"` — primary — :22

### src/components/problemset/ProblemCard.tsx
- `[icon: bookmark]` (no aria-label) — icon-only — :41

### src/app/(app)/problems/ProblemBrowser.tsx
- dropdown toggle `{current.label / label}` (Exam, Subject, Topic, Difficulty, Type) — filter — :147
- dropdown options `{o.label}` — filter — :170
- `"Tags"` (+ count) — secondary — :216
- tag option buttons `{t}` — filter — :269
- `"Sort: {label}"` — filter — :301
- sort options: Default, Most Solved, Highest Acceptance, Recently Added, Rating — filter — :325
- `[icon: Clear search]` — icon-only — :682
- status filters: All, Solved, Unsolved, Bookmarked — filter — :701
- price filters: All, Free, Premium — filter — :766
- `"Filters"` (+ active count) — secondary — :782
- `[icon: remove tag]` aria-label `Remove {tag} tag` — close — :809
- `"Clear Filters"` — secondary — :825
- `[icon: bookmark]` aria-label `Remove bookmark / Bookmark problem` — icon-only — :910 (desktop), :978 (mobile)
- `"Prev"` — pagination — :1012
- `{p}` — pagination — :1025
- `"Next"` — pagination — :1039

### src/app/(app)/problems/ProblemsHero.tsx
- quick chips: Programming & DSA, JEE, NEET, GATE, CAT, SSC — filter — :108

### src/app/(app)/problems/StreamPractice.tsx
- modes: Mix Problems, Subject wise — tab — :110
- breadcrumb `{streamLabel}` — ghost — :133
- breadcrumb `{subject}` — ghost — :146
- subject cards `{s.name}` (+ counts) — secondary — :194
- chapter chips `{c.name}` (+ count) — filter — :238

### src/app/(app)/problems/competitive-programming/CompetitiveProgrammingPage.tsx
- `"Syncing with database…" / "Refresh from database"` — secondary — :78

### src/app/problems/[problemId]/ProblemClient.tsx
- `[icon: bookmark]` (dynamic aria) — icon-only — :207
- `"Run Code"` — secondary — :230
- `"Submit"` — primary — :237
- tabs: Description, Examples, Constraints, Hints, Editorial, Solutions, Discussion, Submissions, AI Analysis — tab — :291
- `"Ask AI"` — primary — :362
- `[icon: Editor settings]` — icon-only — :663
- `[icon: Fullscreen]` aria-label `Exit fullscreen / Fullscreen` — icon-only — :669
- console tabs: Test Results, Console, Custom Input, Accepted Runs, Runtime, Memory, Submissions, AI Feedback, Discussion — tab — :713
- `"Example {n}"` — tab — :821
- `"Run Sample"` — primary — :846
- `"Copied" / "Copy"` — secondary — :876

### src/components/editor/AskAIButton.tsx
- `"Ask AI"` (title "Ask AI about the current file") — primary — :20

### src/components/editor/RunButton.tsx
- `"Running..." / "Run"` — secondary — :18

### src/components/editor/SubmitButton.tsx
- `"Submitting..." / "Submit"` — primary — :15

### src/components/editor/CodeAssistantPanel.tsx
- `"Review ({pendingCount})"` — secondary — :584
- `"Reject all ({pendingCount})"` — danger — :592
- `"New chat"` — secondary — :603
- `[icon: X]` aria-label `Close Code Assistant` — close — :619
- `"Plan"` — tab — :683
- `"Build"` — tab — :696
- `"Stop generating"` — danger — :745
- `"Ask AI"` — primary — :753

### src/components/editor/SuggestedChangesCard.tsx
- `[icon: Code2]` aria-label `Collapse / Expand` — icon-only — :83
- `"Reject"` — secondary — :153
- `"Accept"` — primary — :161
- `"Recalculate"` (stale state) — secondary — :179
- `"Reject"` (stale state) — secondary — :186

### src/components/editor/SuggestionReviewOverlay.tsx
- `[icon: X]` aria-label `Close review` — close — :351
- `"Copied" / "Copy"` — secondary — :412
- `"Collapse" / "Expand"` — ghost — :429
- `"Reject"` — secondary — :468
- `"Applying…" / "Accept changes"` — primary — :476

## 4. Quiz, Contests & Tests

### src/components/quiz/AssessmentSettingsPanel.tsx
- toggles: Randomize Questions, Randomize Options, Allow Revisiting Questions, Enable Leaderboard, Enable Certificate, Enable Discussion, Enable Bookmarks, Practice Mode — toggle — :100
- lifeline toggle `{lifeline.label}` — toggle — :141

### src/components/quiz/CollaboratorManager.tsx
- `[icon: Trash2]` remove collaborator (no aria-label) — danger — :90

### src/components/quiz/CollegeFilterPanel.tsx
- colleges/companies/orgs/classrooms chips — filter — :36
- departments `{dept}` — filter — :59
- years: 1st Year, 2nd Year, 3rd Year, 4th Year — filter — :82
- sections: A, B, C, D, All — filter — :105

### src/components/quiz/GenerateResultsButton.tsx
- `"Generate Results & Email"` — primary — :124
- `"Dismiss"` — ghost — :207
- `"Retry Email"` — secondary — :233
- `"Dismiss"` — ghost — :240
- `"Try Again"` — secondary — :266
- `[icon: X]` (no aria-label) — close — :296
- `"Cancel"` — secondary — :356
- `"Regenerate" / "Generate"` — secondary — :362

### src/components/quiz/PermissionToggle.tsx
- toggle `{perm.label}` — toggle — :46

### src/components/quiz/QuizDashboard.tsx
- `"Go Back"` (legacy builder notice) — primary — :173
- `[icon: ArrowLeft] "Back"` title `Back to Quizzes` — secondary — :201
- `[icon: ListChecks] "Questions"` — secondary — :222
- `[icon: Settings] "Settings"` — secondary — :229
- NAV_ITEMS tabs: Overview, Questions, Settings, Participants, Registrations, Leaderboard, Analytics, Discussion, Certificates, Announcements, Collaborators, Preview, Publish — tab — :255
- `"Preview Quiz"` — secondary — :407
- `"Publish Quiz"` — primary — :410
- `"Edit Information"` (QuickActionButton) — secondary — :431
- `"Open Question Builder"` (QuickActionButton) — secondary — :432
- `"Preview Quiz"` (QuickActionButton) — secondary — :433
- `"Publish Quiz"` (QuickActionButton) — secondary — :434
- `"Generate Results & Email"` (GenerateResultsButton) — primary — :441
- `[icon: Plus] "Open Question Builder"` — primary — :498
- `[icon: RefreshCw] "Refresh"` — secondary — :610
- `"All ({n})"` — filter — :622
- source filters: Self-registered, Invited, Room — filter — :636
- `"Retry"` — secondary — :672
- `[icon: Plus] "Open Question Builder"` — primary — :765
- `"Edit Questions"` — secondary — :777
- `"Fix"` — secondary — :836, :839
- `"Preview"` — secondary — :842
- `"Publish Quiz" / "Complete Checklist to Publish"` — primary — :848

### src/components/quiz/QuizSettings.tsx
- Toggle component (no text) — toggle — :115
- `[icon: X]` remove tag — close — :402
- lifecycle config toggles `{meta.label}` — toggle — :480
- visibility options: Global, College, Company, Organization, Private, Invite Only, Classroom, Contest — filter — :523
- `[icon: ArrowLeft]` title `Back to Dashboard` — icon-only — :735
- `"Done"` — primary — :755
- categories: General, Assessment, Attempts, Lifelines, Navigation, Visibility, Scheduling, Scoring, Certificates, Leaderboard, Discussion, Security, Notifications, Advanced — tab — :784

### src/components/quiz/VisibilitySelector.tsx
- `{option.label} / {option.description}` — filter — :45

### src/components/quiz/quizComponents.tsx
- `"Start" / "Register" / "View"` — primary — :186
- correct-answer toggle (dot only) — toggle — :350
- `[icon: ⤴]` title `Add image` — icon-only — :408
- `[icon: ⤡]` title `Duplicate` — icon-only — :432
- `[icon: ✕]` title `Delete option` — danger — :442
- `"← Exit"` — ghost — :484
- `"👁️ Preview"` — secondary — :525
- `"Save Draft"` — secondary — :532
- `"Publish"` — primary — :539

### src/components/quiz/live/AttemptReviewExperience.tsx
- `{question.number}` aria-label `Question N: state` — pagination — :620
- `[icon: ChevronDown]` aria-label `Expand/Collapse question` — icon-only — :662
- `"Previous"` — pagination — :823
- `"Next"` — pagination — :834
- `"Submitting…" / "Submit feedback"` — primary — :1003
- `[icon: Star]` aria-label `{n} stars` (1–5) — icon-only — :1054

### src/components/quiz/live/AvatarHoverPreview.tsx
- `"👋 Wave"` — ghost — :197
- `"👏 Clap"` — ghost — :205
- `"❤️ React"` — ghost — :213

### src/components/quiz/live/CollaborationSection.tsx
- `[icon: RefreshCw] "Try again"` — secondary — :235

### src/components/quiz/live/HeaderControls.tsx
- `[icon: ArrowLeft] "Back"` — ghost — :57
- `[icon: Play] "Start Quiz"` — primary — :104
- `[icon: Pause] "Pause"` — secondary — :110
- `[icon: Play] "Resume"` — primary — :116
- `[icon: Square] "End"` — danger — :121
- `[icon: RefreshCw]` title `Refresh` — icon-only — :125
- `[icon: Users] "Participants"` — secondary — :131

### src/components/quiz/live/JoinQuizModal.tsx
- `[icon: X]` (no aria-label) — close — :59
- `"Join Quiz"` — primary — :91

### src/components/quiz/live/LiveAssessmentRoom.tsx
- `"Statistics"` (TabButton) — tab — :112
- `"Activity"` (TabButton + badge) — tab — :113
- `"View all"` — ghost — :126
- `[icon: Users] "Participants {n}"` — secondary — :141

### src/components/quiz/live/ParticipantsDrawer.tsx
- `[icon: X]` aria-label `Close drawer` — close — :91
- filters: All, Online, Submitted, Idle, Disconnected — filter — :110
- sorts: Alphabetical, Progress, Submission Time, Join Time — filter — :124

### src/components/quiz/live/PreviousQuizzesSection.tsx
- `[icon: ChevronLeft] "Prev"` — pagination — :458
- `{pageNumber}` — pagination — :471
- `"Next"` — pagination — :486
- `{attempt.title} {attempt.subject}` row — secondary — :606
- `[icon: Filter] "Filters"` + count — filter — :766
- `[icon: X]` (no aria-label) — close — :802
- `"Reset All Filters"` — secondary — :876

### src/components/quiz/live/StudentQuizShell.tsx
- QuizPrimaryButton (renders `{children}`) — primary — :142 (def :124)

### src/components/quiz/live/ThemeSelector.tsx
- theme options: Deep Space, AI Cloud, Cyber City, Floating Islands, Ancient Temple, Underwater, Cherry Blossom, Winter, Volcano, Hacker Matrix, Fantasy Forest, Space Station — secondary — :28, :110
- `"Sound On" / "Sound Off"` — toggle — :41
- `[icon: ✕]` — close — :83

### src/components/quiz/live/WaitingRoomToast.tsx
- `[icon: X]` (no aria-label) — close — :87

### src/components/quiz/live/YourActivitySection.tsx
- FilterSelect trigger "Filter by status" (All, Completed, Submitted, Timed Out, Left Early) / "Sort attempts" (Newest, Oldest, Highest Score, Lowest Score) — filter — :159, :178
- `"Less" / "Details"` — ghost — :270, :333
- `[icon: ChevronLeft]` aria-label `Previous page` — pagination — :556
- `{page}` — pagination — :560
- `[icon: ChevronRight]` aria-label `Next page` — pagination — :564

### src/components/quiz/live/live-campus/LiveCampus.tsx
- `"Retry"` — secondary — :617
- `"+"` zoom in — icon-only — :650
- `"−"` zoom out — icon-only — :651
- `"Wave 👋"` — secondary — :717
- `"Close"` — secondary — :722
- joystick `"↑" / "←" / "→" / "↓"` — icon-only — :734–:740
- `"Interact E"` — secondary — :742

### src/components/quiz/live/live-campus/WaitingRoomModeToggle.tsx
- `"Classic"` — tab — :7
- `"Live Campus"` — tab — :11

### src/components/quiz/creator/AIQuestionReviewOverlay.tsx
- `"Edit"` — secondary — :240
- `[icon: X]` aria-label `Close preview` — close — :248
- `"Previous"` — pagination — :423
- `"Next"` — pagination — :434
- `"Cancel"` — secondary — :448
- `"Save Changes"` — primary — :455
- `"Add to Problem List"` — primary — :466
- `"Reject All"` — danger — :474
- `"Accept All ({total})"` — primary — :481
- `"Add Option"` — secondary — :620
- option letter title `Mark as correct answer` — toggle — :637
- `[icon: Minus]` title `Remove option` — icon-only — :655

### src/components/quiz/creator/AIStudio.tsx
- `"AI Studio"` — ghost — :405
- `[icon: X]` (no aria-label) — close — :434
- mode tabs: "From Your Material", "Generate by Topic" — tab — :449
- tabs: Upload, Generate, Review / Configure, Review — tab — :491
- `[icon: Minus] / [icon: Plus]` bank count — icon-only — :544, :549
- `[icon: Minus] / [icon: Plus]` distribution — icon-only — :566, :568
- presets: `"Auto 40/30/30"`, `"5/3/2"`, `"Equal split"` — filter — :577–:579
- `"Generating... {n}%" / "Generate {bank} Questions"` — primary — :594
- `[icon: X]` close suggestions — close — :663
- `[icon: Eye]` preview file — icon-only — :732
- `[icon: Download]` — icon-only — :735
- `[icon: X]` remove file — close — :740
- `"Continue to Generation"` — primary — :780
- question types: MCQ, Coding, True/False, Fill, Integer, Short Answer, Long Answer — filter — :807
- difficulty: Easy, Medium, Hard, Expert — filter — :846
- `[icon: Minus] / [icon: Plus]` question count — icon-only — :875, :889
- toggles: Include Explanations, Include Hints, Include Reference Notes, Include Tags, Include Images — toggle — :938
- `"Generating... {n}%" / "Generate Questions"` — primary — :985
- `"Accept"` — primary — :1094
- `"Regenerate"` — secondary — :1101
- `[icon: Trash2]` (no aria-label) — danger — :1108
- `"Review All Questions ({n})"` — primary — :1119

### src/components/quiz/creator/QuizDetailsForm.tsx
- toggle (prop label) — toggle — :60
- subject dropdown trigger/options (Mathematics, Physics, …) — filter — :184, :201
- difficulty: Easy, Medium, Hard, Expert — filter — :235
- visibility: Public, Private, College, Classroom — filter — :268
- `[icon: X]` remove tag — close — :412
- `"Add"` — secondary — :427
- `"Continue to Question Builder"` — primary — :456

### src/components/quiz/creator/QuizSettingsPage.tsx
- sections: Quiz Info, Availability, Registration, Responses — tab — :569, :730
- `[icon: Square] "End Quiz"` — danger — :677
- `[icon: Zap] "Start Quiz"` — primary — :686
- `"Save Draft"` — secondary — :697, :1351
- `"Saving Quiz..." / "Save & Continue"` — primary — :704, :1365
- `[icon: X]` remove tag — close — :813
- visibility options (Public, Private, College, Classroom) — filter — :842
- `"Start Immediately"` — secondary — :895
- `"Schedule"` — secondary — :922
- result visibility options: Immediately after submission, After quiz ends, When creator publishes results — filter — :1312
- `"Cancel"` — secondary — :1359, :1557
- ConfirmActionModal `{confirmLabel}`: "Start Quiz" (primary) / "End Quiz" (danger) — :1397, :1415, :1564

### src/components/quiz/creator/QuizWorkspace.tsx
- tabs: Overview, Questions, Sections, Settings, Participants, Review, Publish — tab — :115, :156
- `"Save"` — secondary — :131, :172
- `"Preview"` — secondary — :134, :175, :237
- `"Publish"` — primary — :137, :178, :245
- `[icon: MoreHorizontal]` aria-label `Open menu` — icon-only — :188
- `[icon: ArrowLeft]` aria-label `Back to Studio` — icon-only — :197
- `"Saving..." / "Save"` — secondary — :228

### src/components/quiz/creator/settings/PdfConfigModal.tsx
- accordion headers: Content, Layout, PDF Generation — ghost — :33
- radio/report rows: Include answer key, Include student details block, Shuffle questions, Shuffle options; Single Column, Two Columns; Single Question Paper, Individual Student PDFs, Combined PDF; All registered students, Select students manually — toggle — :72
- `[icon: X]` aria-label `Close` — close — :322
- `"Select All"` — secondary — :439
- `"Clear All"` — secondary — :442
- `"Cancel"` — secondary — :499
- `"Answer Key"` — secondary — :505
- `"Generating…" / "Question Paper"` — primary — :513

### src/components/quiz/creator/settings/PdfPreview.tsx
- `"Previous"` — pagination — :166
- `"Next"` — pagination — :180

### src/components/quiz/creator/settings/ProblemDeleteModal.tsx
- `[icon: X]` aria-label `Close` — close — :85
- `"Cancel"` — secondary — :95
- `"Delete"` — danger — :101

### src/components/quiz/creator/settings/QuizPdfFormatModal.tsx
- `"Without Answers" / "With Answers"` — secondary — :93
- `[icon: X]` aria-label `Close` — close — :240
- `"Cancel"` — secondary — :275, :356
- `"Continue"` — primary — :281
- `"Full Width" / "Two Column"` — secondary — :303
- `"Back"` — secondary — :349
- `"Generating…" / "Generate PDF"` — primary — :362

### src/components/quiz/creator/settings/QuizProblemsPreview.tsx
- `[icon: Plus] "Add Question"` — primary — :373
- `[icon: Plus] "Create Question"` — secondary — :386
- `"Generate with AI"` — secondary — :389
- `[icon: ArrowLeft]` (no aria-label) — icon-only — :411
- `[icon: MoreHorizontal]` (no aria-label) — icon-only — :414
- `"PDF"` — secondary — :438
- `[icon: Save] "Save Draft"` — secondary — :441, :902
- `"Continue"` — primary — :444, :905
- `[icon: Copy]` duplicate (no aria-label) — icon-only — :496
- `[icon: Trash2]` delete (no aria-label) — danger — :506
- `[icon: Plus] "Add question"` — secondary — :524
- `"AI Generate"` — secondary — :527
- type chips: MCQ, Multi, T/F, Fill, Short — filter — :545
- type options: Multiple Choice, Multiple Select, True / False, Fill in the Blank, Short Answer — filter — :552
- difficulty chip `{current.difficulty}` — filter — :573
- difficulties: Easy, Medium, Hard, Expert — filter — :579
- `"{marks} marks"` — filter — :595
- `"Done"` — primary — :611
- `"Bold" / "Italic" / "Underline" / "Inline code" / "Code block" / "Attachment"` (ToolbarBtn) — ghost — :630–:636
- `[icon: X]` remove image — close — :655, :757
- `[icon: Save] "Saving…" / "Save Question"` — primary — :680
- correct answer toggle — toggle — :726
- `[icon: ImageIcon]` — icon-only — :733
- `[icon: ChevronUp/ChevronDown]` reorder — icon-only — :736, :739
- `[icon: Trash2]` delete option — danger — :743
- `"Add option"` — secondary — :769
- `"Add option with AI"` — secondary — :772
- `[icon: BookOpen] "After Answer"` — ghost — :793
- tabs: explanation, hint, solution — tab — :805
- `[icon: X]` close right panel — close — :830
- `"Properties"` — tab — :883
- `"Back"` — ghost — :892
- `"Cancel"` — secondary — :925
- `"Delete All"` — danger — :928

### src/components/quiz/creator/settings/QuizSettingsShell.tsx
- `[icon: Square] "End Quiz"` — danger — :172
- `[icon: Play] "Start Quiz"` — primary — :181
- `[icon: Save] "Saving..." / "Save Draft"` — secondary — :192
- `"Cancel"` — secondary — :375
- `[icon: CheckCircle2] "{confirmLabel}"` → Start Quiz / End Quiz — primary/danger — :382 (:257, :275)

### src/components/quiz/creator/settings/QuizWorkspaceFrame.tsx
- `[icon: Plus] "Adding..." / "Add"` title `Add problem` — secondary — :347
- `[icon: Trash2] "Delete All"` — danger — :363, :565
- `[icon: Copy]` title `Duplicate problem` — icon-only — :456
- `[icon: Trash2]` title `Delete problem` — danger — :468
- `[icon: Plus] "Adding..." / "Add Problem"` — primary — :486
- `"Cancel"` — secondary — :558

### src/components/quiz/creator/settings/audience/AddStudentsModal.tsx
- `"Cancel"` — secondary — :261
- `"Done"` — primary — :262
- tabs: By Username, Import Excel, Choose from Rooms — tab — :273
- `[icon: Search] "Search"` — secondary — :295
- `[icon: Plus] "Add to {room}"` — primary — :310
- `"Add"` — primary — :336
- `"Or choose from existing rooms"` — ghost — :351
- room row `{room.name} … Open →` — secondary — :367
- `"Back to rooms"` — ghost — :381
- `"Unselect all" / "Select all"` — secondary — :392
- `"Add @{q} directly"` — secondary — :407
- `"Add {n} selected to {room/list}"` — primary — :441

### src/components/quiz/creator/settings/audience/AudienceModal.tsx
- `[icon: X]` aria-label `Close` — close — :80

### src/components/quiz/creator/settings/audience/CreateRoomModal.tsx
- `"Cancel"` — secondary — :225
- `[icon: Check] "Create Room"` — primary — :225
- tabs: By Username, Import Excel, Rooms — tab — :240
- `[icon: Search] "Search"` — secondary — :253
- `"Add to list"` — primary — :265
- `"Or choose from existing rooms"` — ghost — :273
- room row `{room.name} … Open →` — secondary — :284
- `"Back to rooms"` — ghost — :295
- `"Unselect all" / "Select all"` — secondary — :303
- `"Add @{q} directly"` — secondary — :317
- `"Add {n} selected to list"` — primary — :339
- `"Remove"` — danger — :355

### src/components/quiz/creator/settings/audience/RoomMenu.tsx
- `[icon: MoreHorizontal]` aria-label `Room actions` — icon-only — :37
- menu items `{item.label}` — ghost — :66

### src/components/quiz/creator/settings/audience/SelectRoomsModal.tsx
- `"Cancel"` — secondary — :106
- `"Add Rooms"` — primary — :112
- `"Create New Room"` — secondary — :134
- tabs: All, My Rooms, Recently Used — tab — :152
- room card — secondary — :184

### src/components/quiz/creator/settings/audience/SelectStudentsModal.tsx
- student row — secondary — :101
- `"Cancel"` — secondary — :153
- `"Add Students"` — primary — :159
- tabs: Search, Browse by Room — tab — :178
- tabs: All Students, From My Rooms, Recently Used — tab — :215
- `"Select All"` — secondary — :230, :300
- `"Clear Selection"` — secondary — :237
- `"Clear All" / "Select All"` — secondary — :300

### src/components/quiz/creator/settings/audience/StudentImportPanel.tsx
- `"Back to Upload"` — ghost — :152
- `"Download Excel Template"` — secondary — :359
- `[icon: X]` dismiss error — close — :409
- `"Back"` — secondary — :510, :692
- `"Continue to Review"` — primary — :516
- `"Show all rows" / "Review Issues"` — secondary — :586
- `"Import {n} Valid Student(s)"` — primary — :698
- `"Done"` — primary — :753

### src/components/quiz/exam/ExamModeShell.tsx
- `"Back"` — ghost — :372
- `[icon: Rocket] "Starting your attempt…" / "Start Exam"` — primary — :380
- `[icon: Maximize2] "Checking eligibility…" / "Enter Exam Mode"` — primary — :443
- `"Cancel"` — secondary — :457
- `[icon: X]` aria-label `Exit exam mode` — close — :500
- `"Return to Quiz"` — primary — :559
- `"View Result" / "Exit Preview"` — secondary — :592

### src/app/(app)/quiz/page.tsx
- `[icon: pagination dot]` aria-label `Show {source} example` — pagination — :405

### src/app/(app)/quiz/join/page.tsx
- `"Verify & continue"` — primary — :345
- `"Join Quiz" / "Quiz Has Ended"` — primary — :519
- `{creatorName} + stars + ChevronDown` (about creator) — secondary — :574
- `[icon: X]` aria-label `Close teacher stats` — close — :632

### src/app/(app)/quiz/[quizId]/attempt/page.tsx
- `[icon: Volume2/VolumeX]` aria-label `Mute quiz sounds / Enable quiz sounds` — toggle — :418
- answer options `{A/B/C/D} {option}` — secondary — :459
- `"Previous"` — pagination — :512
- `"Next"` — pagination — :516
- `[icon: Send] "Submitting…" / "Submit"` — primary — :520
- `"Back to Home"` — secondary — :613

### src/app/(app)/quiz/[quizId]/results/page.tsx
- `"Retry"` — primary — :134

### src/app/(app)/quiz/[quizId]/register/page.tsx
- `"Registered"` — secondary — :481
- `[icon: RefreshCw/Play] "Verifying…" / "Register & Continue"` — primary — :489
- `"Cancel"` — secondary — :546
- `"Unregister"` — danger — :552

### src/app/(app)/quiz/[quizId]/lobby/page.tsx
- `"Enter assessment"` (QuizPrimaryButton) — link — :79

### src/app/(app)/quiz/[quizId]/waiting/page.tsx
- `[motion] "Back"` — ghost — :260
- `"Light"` — secondary — :281
- `"Dark"` — secondary — :288
- `"Real World"` — secondary — :295
- `[icon: Sun/Moon/Globe]` view mode (no aria-label) — icon-only — :305–:307
- `"Participants ({n})"` — secondary — :310
- `[icon: Music] "Music"` — ghost — :422
- `[icon: MessageSquare] "Chat"` — ghost — :438
- `"Stay Here"` — secondary — :549
- `"Leave Room"` — danger — :555

### src/app/contests/ContestsHero.tsx
- chips: "🔥 LIVE NOW", "Starting soon", "Weekly Clash", "Monthly Championship" — filter — :304

### src/app/contests/ContestsLanding.tsx
- dropdown triggers: Category, Difficulty, Duration — filter — :158
- options: All categories, Any level, Any duration + full lists — filter — :170
- `"Reset filters"` — secondary — :568
- tabs: ALL, LIVE, UPCOMING, MY CONTESTS, COMPLETED — tab — :704
- category cards `{cat.label}` — filter — :899

### src/app/contests/[contestId]/register/page.tsx
- Rated Contest toggle — toggle — :216
- contest rules checkbox — toggle — :228
- agree to participate checkbox — toggle — :239
- `[icon: Trophy] "Registering..." / "Confirm Registration"` — primary — :252

### src/components/tests/AIPerformanceCoach.tsx
- `"Start Personalized Practice"` — primary — :53

### src/components/tests/CreateTestSeries.tsx
- steps: Basic Information, Exam & Subjects, Add Tests, Pricing, Preview, Submit/Publish — tab — :89
- `"Thumbnail selected — click to remove" / "Upload thumbnail (or auto-generate)"` — secondary — :142
- exams: DSA, JEE, NEET, SSC, UPSC, Banking, CUET, GATE, CAT, CLAT, Defence, Teaching, School, Railway, ESE, State Engg, Boards, Olympiads — filter — :166
- subjects: Physics, Chemistry, Mathematics, Biology, Quant, Reasoning, English, GK, VARC, DILR — filter — :187
- difficulty: easy, medium, hard, mixed — filter — :222
- `"Clear all" / "Select all"` (GhostButton) — ghost — :250
- test pool row — secondary — :260
- `"Create a New Test"` — secondary — :291
- `"Free"` — secondary — :305
- `"Paid"` — secondary — :317
- `"Back to Preview"` (GhostButton) — ghost — :423
- `"Publishing…" / "Publish Test Series"` (PrimaryButton) — primary — :424
- `"Back"` (GhostButton) — ghost — :436
- `"Continue"` (PrimaryButton) — primary — :444

### src/components/tests/Hero.tsx
- `"View all in marketplace"` — ghost — :182

### src/components/tests/QuestionPalette.tsx
- `{e.index}` aria-label `Question {n}` — pagination — :42

### src/components/tests/RecommendedTestCard.tsx
- `"Start Free Test" / "View Test Series"` (PrimaryButton) — link — :52

### src/components/tests/TeacherCard.tsx
- `[icon: Check/UserPlus] "Following" / "Follow"` — toggle — :55

### src/components/tests/TeacherCta.tsx
- `"Start Creating"` (PrimaryButton) — link — :51

### src/components/tests/TeacherProfile.tsx
- `[icon: Check/UserPlus] "Following" / "Follow"` — toggle — :77
- `"View"` (PrimaryButton) — link — :163

### src/components/tests/TeacherTestDashboard.tsx
- `"Create Test"` (GhostButton) — link — :47
- `"Create Test Series"` (PrimaryButton) — link — :50
- tabs: all, published, draft — filter — :81
- `[icon: Settings2]` (no aria-label) — icon-only — :149
- `[icon: Trash2]` (no aria-label) — danger — :152
- `"View all series →"` — ghost — :162

### src/components/tests/TestAttempt.tsx
- `[icon: X]` aria-label `Exit test` — close — :181
- `"Submit"` — primary — :206
- section tabs: Physics, Chemistry, Mathematics — tab — :223
- option rows A, B, C, D — secondary — :295
- `"Previous"` — pagination — :329
- `"Marked for Review" / "Mark for Review"` — secondary — :336
- `"Clear Response"` — ghost — :348
- `"Palette"` — ghost — :357
- `"Submit Test" / "Save & Next →"` — primary — :363
- `"Continue Test"` (modal) — secondary — :472
- `"Submit"` (modal) — primary — :478

### src/components/tests/TestResult.tsx
- `"Back to Tests"` (GhostButton) — link — :267
- `"Practice My Weak Areas"` (PrimaryButton) — link — :268

### src/components/tests/TestSeriesDetail.tsx
- `"View Profile"` (GhostButton) — link — :276
- `"Continue Access" / "Buy Test Series · ₹{price}"` (PrimaryButton) — primary — :299
- `"Start Free Trial Test"` (GhostButton) — link — :305

### src/components/tests/TestSeriesExplorer.tsx
- tabs: Popular, Free, Paid, Teacher-created — tab — :60

### src/components/tests/TopSeriesMarketplace.tsx
- filters: All, JEE, NEET, SSC, UPSC, Banking, CUET, GATE, CAT, DSA — filter — :150
- `"All"` (SegBtn) — tab — :194
- `"Free"` (SegBtn) — tab — :195
- `"Paid"` (SegBtn) — tab — :196
- `[icon: FilterX] "Clear ({n})"` — secondary — :240

## 5. Creator Studio

### src/components/creator/advertise/AdvertisePage.tsx
- `"+ Create Campaign" / "Create Campaign"` — primary — :68
- SegmentedControl: All, Active, Paused, Completed, Draft — tab — :200
- `"Create Campaign"` — primary — :209
- `"Edit"` — secondary — :278
- `"Publish"` — primary — :281
- `"View Campaign"` — secondary — :300
- `"Pause"` — secondary — :304
- `"Resume"` — primary — :313

### src/components/creator/advertise/CampaignBuilder.tsx
- `"Open Test Series"` — secondary — :174
- `"Selected" / "Select"` — toggle — :237
- duration options: "3 Days", "7 Days", "Until Reach Is Completed", "Custom" — filter — :413
- `"Back"` — secondary — :627
- `"Launch Campaign — ₹{budget}" / "Select a test series"` — primary — :632
- `"Continue"` — primary — :636

### src/components/creator/advertise/CampaignDetail.tsx
- `"Pause"` — secondary — :53
- `"Resume"` — primary — :57

### src/components/creator/advertise/ui.tsx
- budget chips: ₹500 / ₹1k / ₹2.5k / ₹5k / ₹10k — filter — :201

### src/components/creator/ai-quiz-generator/AiQuizGenerator.tsx
- step nav: Upload / Generate / Review / Create — tab — :97
- `"Back"` — secondary — :131

### src/components/creator/ai-quiz-generator/EditableField.tsx
- `[icon: Pencil]` edit — icon-only — :40
- `"Save"` — primary — :66
- `"Cancel"` — secondary — :74

### src/components/creator/ai-quiz-generator/FileCard.tsx
- `[icon: X]` remove file — close — :57

### src/components/creator/ai-quiz-generator/ProblemTable.tsx
- `[icon: Pencil]` edit (mobile) — icon-only — :48
- `[icon: Trash2]` remove (mobile) — danger — :55
- `[icon: GripVertical]` title `Drag to reorder` — icon-only — :92
- `[icon: Pencil]` edit — icon-only — :119
- `[icon: Trash2]` remove — danger — :126

### src/components/creator/ai-quiz-generator/ReviewStep.tsx
- difficulty: Easy / Medium / Hard / Expert — filter — :158
- `"Collapse" / "Expand"` — ghost — :240
- `"Remove"` thumbnail — close — :325
- `"Create Quiz"` — primary — :340
- `[icon: X]` remove tag — close — :407

### src/components/creator/ai-quiz-generator/UploadStep.tsx
- `"Browse Files"` — secondary — :185

### src/components/creator/analytics/AnalyticsOverviewPage.tsx
- `"Export Report"` — secondary — :198
- `"Create a Test"` — primary — :226
- SegmentedControl: 7D / 30D / 90D — tab — :287

### src/components/creator/analytics/ContentAnalyticsPage.tsx
- `"Create a Test"` — primary — :143
- OverflowMenu — icon-only — :241, :281
- SegmentedControl — tab — :310

### src/components/creator/analytics/StudentAnalyticsPage.tsx
- OverflowMenu — icon-only — :249, :289

### src/components/creator/analytics/TestAnalyticsPage.tsx
- SegmentedControl: All tests + test names — filter — :235
- `"Create a Test"` — primary — :260
- SegmentedControl: 7D / 30D / 90D — tab — :314

### src/components/creator/analytics/QuizAnalyticsContent.tsx
- `"Try again"` — secondary — :128
- tabs: Overview / Questions / Students / Game — tab — :161

### src/components/creator/analytics/quiz/AnalyticsTopBar.tsx
- `{code}` copy quiz code — icon-only — :50
- `"Exporting…" / "Export CSV"` — secondary — :73

### src/components/creator/analytics/quiz/StudentsTab.tsx
- sort chips: Rank / Score / Time — filter — :136
- `"Collapse answers"` — ghost — :185
- `"Expand answers"` — ghost — :316

### src/components/creator/audience/BatchesPage.tsx
- `"New Batch"` — primary — :136, :159
- `[icon: MoreHorizontal]` batch actions — icon-only — :59
- menu: Edit / Students / Schedule / Archive — ghost — :83

### src/components/creator/audience/ClassesPage.tsx
- `"New Class"` — primary — :66, :99
- actions: Manage / Share Link / Duplicate / Archive — secondary — :158
- `[icon: MoreHorizontal]` title `More actions` — icon-only — :173

### src/components/creator/audience/OrganizationsPage.tsx
- `[icon: MoreHorizontal]` aria-label `Actions for {org}` — icon-only — :67
- menu: Manage / Licenses / Assign Tests / Suspend/Reinstate — ghost — :91
- `"Add Organization"` — primary — :128, :151
- `"Retry"` (ErrorState) — secondary — :145

### src/components/creator/audience/StudentsPage.tsx
- `"Invite Students"` — primary — :147, :172
- `"Export"` — secondary — :148
- `"Retry"` — secondary — :166
- SegmentedControl: All / Active / Inactive / Blocked — tab — :197
- `[icon: MoreHorizontal]` aria-label `Actions for {student}` — icon-only — :73
- menu: View Profile / Message / View Attempts / Block/Unblock — ghost — :97

### src/components/creator/billing/ui.tsx
- BillButton / IconButton / SegmentedControl definitions; ErrorState → `"Retry"` — secondary — :70, :108, :546

### src/components/creator/billing/BillingDashboard.tsx
- `"Transactions"` — secondary — :43
- `"Buy Credits"` — primary — :46, :67

### src/components/creator/billing/AICreditsPage.tsx
- `"Try again"` — secondary — :161

### src/components/creator/billing/CreditPackCheckout.tsx
- payment app tiles `{app.n}` — filter — :158
- `"Back to packs"` — ghost — :336
- pack radios `{p.name}` — toggle — :361
- method tabs: UPI / Cards / Net Banking / Wallets / Pay Later — tab — :403
- `"Apply"` (coupon) — secondary — :672
- `{payLabel}` ("Pay ₹… securely" / "Processing…") — primary — :697
- `"Processing…" / "Pay now"` — primary — :752

### src/components/creator/billing/CreditPacksSection.tsx
- `{pack.cta}` aria-label `Buy {pack.name} for ₹{price}` — primary — :154

### src/components/creator/billing/credits/CreditPacks.tsx
- pack CTA `{pack.cta}` — primary — :99

### src/components/creator/billing/credits/OrderSummaryDialog.tsx
- `[icon: X]` `Close` — close — :89
- methods: UPI / Card / Net Banking — toggle — :125
- `"Pay ₹{total}"` — primary — :148
- `"Choose another method"` — secondary — :179
- `"Done"` — primary — :209
- `"Back"` — secondary — :227
- `"Try again"` — secondary — :234
- `"Close"` — secondary — :255
- `"Resume"` — primary — :262

### src/components/creator/billing/DocumentsPage.tsx
- `"Generate Statement"` — primary — :74
- `"View"` — secondary — :132
- `"PDF" / "CSV" / "Excel"` — secondary — :141, :151, :161
- format buttons `{f.toUpperCase()}` — filter — :198
- `[icon: X]` `Close` — close — :238
- `"Cancel"` — secondary — :251
- `"Generating..." / "Generate"` — primary — :254

### src/components/creator/billing/EarningsPage.tsx
- `"View transactions"` — secondary — :55
- `"Create a Test"` — primary — :70
- SegmentedControl ranges 7/10/30 + metrics — tab — :100–:101

### src/components/creator/billing/exportModal.tsx
- `[icon: X]` `Close` — close — :88
- scopes: Transactions / Sales / Payouts / Refunds / Revenue / Tax statements — filter — :98
- formats: CSV / Excel / PDF — filter — :118
- `"Cancel"` — secondary — :187
- `"Exporting..." / "Export"` — primary — :190

### src/components/creator/billing/notifications.tsx
- `[icon: Bell]` aria-label `Financial notifications` — icon-only — :47
- `"Mark all read"` — secondary — :68
- notification item `{n.title}` — secondary — :83

### src/components/creator/billing/ProductsPage.tsx
- `"Create a Test"` — primary — :53, :63
- SegmentedControl: All products / Tests / Test series / Assessments — tab — :70

### src/components/creator/billing/RefundsPage.tsx
- `"Export"` — secondary — :75
- SegmentedControl: All / Requested / Approved / Processing / Completed / Rejected — tab — :94
- `"View"` — secondary — :140
- `"Approve"` — primary — :149, :269
- `"Reject"` — danger — :157, :276
- `[icon: X]` `Close` — close — :248

### src/components/creator/billing/PayoutsPage.tsx
- `"Export"` — secondary — :54
- `"Withdraw"` — primary — :57, :71
- SegmentedControl: All / Completed / Processing / Pending / Failed / Cancelled — tab — :78
- `"View"` — secondary — :123
- `"Receipt"` — secondary — :130

### src/components/creator/billing/TaxPage.tsx
- `"All documents"` — secondary — :43
- SegmentedControl: Monthly / Quarterly / Annual statement — tab
- `"PDF" / "CSV"` — secondary — :159, :167
- `"Download"` — primary — :202

### src/components/creator/billing/transactionDrawer.tsx
- `[icon: X]` `Close` — close — :57
- `"Download receipt"` — secondary — :113
- `"View test"` — secondary — :116
- `"View student"` — secondary — :119
- `"Report issue"` — secondary — :122

### src/components/creator/billing/TransactionsPage.tsx
- `[icon: X]` aria-label `Close transaction details` — close — :329
- `"Receipt"` — secondary — :410
- `"GST invoice"` — secondary — :413
- `"Buy Credits"` — primary — :601, :623
- `"Export CSV"` — secondary — :693
- `"Clear filters"` — secondary — :705
- `[icon]` aria-label `Retry payment for {pack}` — icon-only — :839
- `[icon]` aria-label `Check status for {pack}` — icon-only — :849
- `[icon]` aria-label `Download receipt for {pack}` — icon-only — :859
- `[icon]` aria-label `Previous page` — pagination — :881
- `{n}` aria-label `Page {n}` — pagination — :891
- `[icon]` aria-label `Next page` — pagination — :907
- mobile row actions — icon-only — :968, :978, :988
- `[icon: MoreHorizontal]` aria-label `More actions for {pack}` — icon-only — :999
- menu: Download GST invoice / Copy order ID / Contact support — ghost — :1011–:1019

### src/components/creator/billing/PaymentSettingsPage.tsx
- QsToggle — toggle — :173
- `"Retry"` — secondary — :206
- `[icon: X]` aria-label `Close dialog` — close — :307
- `"Resend OTP"` — secondary — :418
- `{actionLabel}` — primary — :432
- Kebab menu `{label}` + items `{item.label}` — ghost — :464, :482
- `"Complete KYC"` — primary — :724
- `"Withdraw"` — primary — :743
- `"Add account"` — secondary — :785, :799
- `"Make primary"` — secondary — :838
- `[icon: MoreHorizontal]` aria-label `More actions for {bank}` — icon-only — :845
- bank menu: Make primary / Edit nickname / Remove — ghost — :854–:857
- `[icon: MoreHorizontal]` aria-label `More actions for UPI ID` — icon-only — :885
- UPI menu: Change UPI ID / Remove — ghost — :888–:889
- `"Add bank account"` — secondary — :897
- `"Add UPI ID"` — secondary — :907
- weekday buttons Sun–Sat ara-label `Pay out every {day}` — toggle — :950
- SegmentedControl: Manual / Weekly / Monthly — tab
- monthly-day chips 1/5/10/15/20/25/last — filter
- `"Save schedule"` — primary — :999
- alert channels: Email / SMS / WhatsApp — toggle — :1058
- `"View all"` — ghost — :1115
- audit filters: All / Withdrawals / Account changes / Security / Settings — filter — :1126
- `"Load more"` — secondary — :1189
- `"Cancel"` — secondary — :1278, :1631
- `"Continue"` — primary — :1281, :1447, :1487
- `"Keep on"` — secondary — :1325
- `"Turn off"` — danger — :1328
- `"Verifying…" / "Verify with ₹1"` — primary — :1469
- `"Back"` — secondary — :1483
- `"Back to details"` — secondary — :1498
- `"Verifying…" / "Verify"` — primary — :1578
- `"Confirm and continue"` — primary — :1590
- `"Save"` — primary — :1634

### src/components/creator/billing/withdraw.tsx
- `[icon: X]` `Close` — close — :105
- quick %: 25 / 50 / 75 / MAX — filter — :170
- account cards — toggle — :213
- `"Add bank account"` — secondary — :244
- `"Back"` — secondary — :334
- `"Continue"` — primary — :346, :351
- `"Processing..." / "Confirm Withdrawal"` — primary — :356
- `"Done"` — primary — :364

### src/components/creator/common/AiGenerateButton.tsx
- default label `"Generate with AI"` (prop-driven) — primary — :32

### src/components/creator/common/MaskedCopyCode.tsx
- reveal/copy control aria-label `Reveal {label}` — secondary — :62

### src/components/creator/layout/CreatorNavbar.tsx
- profile menu trigger aria-label `Open creator profile menu` — icon-only — :39
- hamburger — icon-only — :93

### src/components/creator/layout/CreatorStudioLayout.tsx
- `[icon: X]` aria-label `Close menu` — close — :99

### src/components/creator/manage/QuizzesPage.tsx
- `"Try again"` — secondary — :239
- tabs: All / Live / Draft / Scheduled / Completed — tab — :318
- `[icon: X]` — close — :397
- `"Cancel"` — secondary — :445
- `"Deleting…" / "Delete"` — danger — :448
- `[icon: MoreHorizontal]` aria-label `More actions for {quiz}` — icon-only — :582
- overlay — icon-only — :593
- `"Delete quiz"` — danger — :595
- `"Add questions"` — primary — :625
- `"Edit"` — secondary — :646
- `"Preview"` — secondary — :650
- `"Analytics"` — secondary — :654
- `"Responses"` — secondary — :658
- AiGenerateButton — primary — :212, :257

### src/components/creator/manage/TestSeriesPage.tsx
- `"New Series"` — primary — :180
- `"Create your first series"` — primary — :207
- menu: Edit / Manage Tests / Analytics / Duplicate / Archive — ghost — :298

### src/components/creator/preview/QuizPreviewContent.tsx
- mechanics: 50-50, Extra Time, Hint, Skip Question, Shield, Double Score, Extra Life — secondary — :275
- `[icon: Bookmark]` — icon-only — :319
- option buttons — secondary — :337
- `"Explanation"` — ghost — :358
- `"Previous"` — pagination — :374
- `"Mark for Review"` — secondary — :377
- `"Submit Quiz"` — primary — :382, :581
- `"Next"` — pagination — :386
- emoji buttons — icon-only — :398
- question nav `{n}` — pagination — :444
- `"Report an Issue"` — secondary — :488
- `[icon: X]` — close — :505
- `"Use Now"` — primary — :519
- `"Continue Preview"` — secondary — :578

### src/components/creator/dashboard/CreatorDashboardPage.tsx
- `"Change timing"` — secondary — :415
- `"Reschedule"` — secondary — :977

### src/components/creator/dashboard/TimingModal.tsx
- `"No end time"` — secondary — :217
- presets: +15m / +30m / +1h — filter — :245
- `"Ending…" / "Confirm end" / "End now"` — danger — :274
- `"Cancel"` — secondary — :292
- `"Save timing"` — primary — :295

### src/components/creator/problems/CreateProblemGenerator.tsx
- chips — filter — :74
- `[icon: minus/plus]` aria-label `Decrease/Increase {label}` — icon-only — :119, :129
- `"Retry"` — secondary — :660
- `"Select all"` — secondary — :672, :1092
- `"Clear"` — secondary — :680
- `"Reset"` — secondary — :823, :865
- `"Generating…" / "Generate Questions"` (AiGenerateButton) — primary — :910
- `"Done" / "Edit"` — secondary — :1057
- `"Regenerating…" / "Regenerate"` — secondary — :1065
- `"Delete"` — danger — :1074
- `"Regenerate all"` — secondary — :1099
- PDF/Word toggle — toggle — :1108
- `"Preparing…" / "Download PDF" / "Download Word"` — primary — :1124
- `"Copied" / "Copy selected"` — secondary — :1133

### src/components/creator/problems/ManualProblemCreator.tsx
- `"Retry"` — secondary — :149
- difficulty: Easy / Medium / Hard / Expert — filter — :179
- `[icon: Check]` aria-label `Mark option {n} correct` — toggle — :224
- `[icon: X]` aria-label `Remove option {n}` — danger — :250
- `"Add option"` — secondary — :262
- `"Save Problem"` — primary — :285

### src/components/creator/problems/ProblemsLanding.tsx
- `"Create Problem"` — primary — :118

### src/components/creator/problems/QsSelect.tsx
- trigger — secondary — :163
- options — filter — :215

### src/components/creator/profile/ProfileHeader.tsx
- `[icon: Globe]` aria-label `View public profile` — icon-only — :85
- `[icon: Settings]` aria-label `Profile settings` — icon-only — :94
- `"Edit Profile"` — primary — :103

### src/components/creator/profile/StudioPreferences.tsx
- `"Public" / "Private"` — toggle — :21
- switch — toggle — :68

### src/components/creator/profile/AccountSection.tsx
- Account Settings / Security / Sessions / Connected Services — tab — :26

### src/components/creator/profile/AccountDetails.tsx
- `"Edit"` — secondary — :42

### src/components/creator/profile/BankDetails.tsx
- `"Add Account"` — secondary — :32

### src/components/creator/profile/CreatorFinance.tsx
- `"Manage Payments"` — secondary — :26

### src/components/creator/profile/CreatorProfilePage.tsx
- `"Retry"` — secondary — :90

### src/components/creator/profile/DangerZone.tsx
- `"Deactivate Creator Account"` (disabled) — danger — :16

### src/components/creator/questions/AIStudioPage.tsx
- `"Get started"` — primary — :240
- SegmentedControl: Generate from Files / Generate by Topic / Ask AI — tab — :249
- generating buttons — primary — :307, :362
- `[icon: Minus]` aria-label `Fewer questions` — icon-only — :342
- `[icon: Plus]` aria-label `More questions` — icon-only — :351
- `[icon: Send]` aria-label `Send message` — icon-only — :413
- `"Review"` — primary — :458

### src/components/creator/questions/QuestionBankPage.tsx
- `[icon: MoreHorizontal]` aria-label `Question actions` — icon-only — :141
- menu: Edit / Add to Test / Add to Quiz / Duplicate / Delete — ghost — :159
- `"Add Question"` — primary — :302
- `"Import"` — secondary — :305
- `"Add your first question"` — primary — :329
- SegmentedControl: All / Single Choice / Multiple Choice / Integer / True-False / Subjective — tab — :386
- Easy / Medium / Hard — filter — :393
- `"Add to Test"` — primary — :424
- `"Add to Quiz"` — primary — :432
- `"Delete"` — danger — :440
- `"Clear" / "Clear filters"` — secondary — :448, :467

### src/components/creator/quiz-studio/StudioShell.tsx
- `"Help"` — ghost — :116
- `[motion]` aria-label `Close help` — close — :131
- `[icon: X]` aria-label `Close help` — close — :152
- `[icon: ArrowLeft]` aria-label `Exit quiz studio` — icon-only — :224
- title button — secondary — :241
- `[icon: ChevronLeft]` aria-label `Previous step` — icon-only — :259
- `"Back"` — secondary — :268, :545
- `"Save"` — secondary — :288
- `"Continue"` — primary — :296
- `"Continue →" / "Saving…"` — primary — :319, :613
- step menu trigger — secondary — :384
- step items `{step.label}` — ghost — :419, :446
- `[icon: prev/next question]` — icon-only — :560, :570
- `"Start Quiz"` — primary — :589
- `"Cancel"` — secondary — :603
- `"Starting…" / "Yes, Start Quiz"` — primary — :604

### src/components/creator/quiz-studio/StudioRouter.tsx
- `"Back to Quizzes"` — secondary — :83

### src/components/creator/quiz-studio/components/QuestionList.tsx
- `[icon: X]` — close — :95
- `"+ Add Question"` — primary — :110
- `[icon: GripVertical]` aria-label `Reorder question {n}` — icon-only — :145
- `[icon: up/down]` reorder — icon-only — :179, :190
- `[icon: Copy]` — icon-only — :201
- `[icon: Trash2]` — danger — :210
- `"AI Generate"` (AiGenerateButton) — primary — :229
- `"Download PDF"` — secondary — :235
- `"Saving X/Y…" / "Save Changes"` — primary — :243

### src/components/creator/quiz-studio/components/QuestionEditor.tsx
- type button `{TYPE_SHORT[q.type]}` — filter — :203
- type options — filter — :216
- duplicate — icon-only — :234
- `[icon: Trash2]` — danger — :243
- `{q.difficulty}` — filter — :255
- true/false options — secondary — :266, :357
- correct toggles — toggle — :390
- `[icon: Trash2]` option — danger — :415
- `"+ Add option"` — secondary — :429
- tabs — tab — :461
- `"Cancel"` — secondary — :518
- `"Continue, remove data"` — danger — :519

### src/components/creator/quiz-studio/components/RichToolbar.tsx
- Bold / Italic / Underline / Strikethrough / Code / Undo / Redo — icon-only — (title props)
- `"x₂"` / `"x²"` — icon-only — :33, :34

### src/components/creator/quiz-studio/components/MatchFollowingEditor.tsx
- type menu — filter — :338, :350
- duplicate — icon-only — :368
- `"Delete question"` — danger — :378
- `"Hide help" / "How to?"` — ghost — :427
- `[icon: X]` — close — :471
- `"Add First Pair"` — secondary — :487
- image/trash — icon-only — :533, :539
- `"Add Item"` — secondary — :554
- right column — icon-only — :612, :618
- `"Add Match"` — secondary — :630
- `"Preview Question"` — secondary — :643
- `"Advanced Settings"` — ghost — :662
- `"Tap to pair"` — ghost — :737
- `"Cancel"` — secondary — :801
- `"Continue, remove data"` — danger — :802

### src/components/creator/quiz-studio/components/AiGenerateModal.tsx
- `[icon: X]` aria-label `Close AI generator` — close — :455
- `"From your material"` — secondary — :468
- `"Generate by topic"` — secondary — :492
- `"Done"` — primary — :531
- `"Try again"` (AiGenerateButton) — primary — :616
- `"Back to settings"` — secondary — :622
- styles: Mixed / Theory / Numerical — filter — :743
- fewer/more questions — icon-only — :797, :808
- `Decrease/Increase {item.label}` — icon-only — :841, :850
- `[icon: X]` aria-label `Remove {file}` — close — :918
- `"+ Add more files"` — secondary — :932
- `"Cancel"` — secondary — :972
- `"Generate {n} questions" / "Generate questions"` — primary — :979

### src/components/creator/quiz-studio/components/AiAssistantPanel.tsx
- `[icon: X/Sparkles]` toggle — close — :110
- actions: Generate Explanation / Generate Distractors / Improve Question / Generate Hint / Generate Solution / Translate — filter — :125
- `"Apply"` — primary — :158
- `"Discard"` — secondary — :165

### src/components/creator/quiz-studio/components/GameMechanicsPanel.tsx
- `"Remove"` — danger — :208
- `"+ Add hint level"` — secondary — :247
- `{sec}s`: 15s / 30s / 60s — filter — :287
- `"Custom"` — filter — :291
- `{d}s`: 10s / 15s / 30s — filter — :310
- `"Preview Game Controls"` — secondary — :413, :490
- `[icon: X]` — close — :502
- `"Done"` — primary — :536

### src/components/creator/quiz-studio/components/LiveRail.tsx
- `"Properties →"` — ghost — :30
- collapse toggle — icon-only — :90
- `"Preview"` — ghost — :177

### src/components/creator/quiz-studio/components/QuizGameConfigPanel.tsx
- `"Save" / "Saving…"` — primary — :97
- `"Save configuration" / "Saving…"` — primary — :192

### src/components/creator/quiz-studio/components/StudentPreviewModal.tsx
- `[icon: X]` aria-label `Close preview` — close — :119
- option buttons `{opt.content}` — secondary — :175
- `"Previous"` — pagination — :290
- dots `Go to question {n}` — pagination — :300
- `"Next"` — pagination — :316

### src/components/creator/quiz-studio/components/MatchingStudentPreview.tsx
- `[icon: X]` — close — :152
- `"Clear All"` — secondary — :161
- `"Shuffle preview"` — secondary — :306
- `"Done"` — primary — :311

### src/components/creator/quiz-studio/components/mobile/MobileQuestionEditor.tsx
- `"Switch to Single Choice on mobile"` — secondary — :91
- type button — filter — :178
- type options `{TYPE_LABEL[t]}` — filter — :187
- `[icon: MoreVertical]` — icon-only — :204
- `"Duplicate"` — secondary — :212
- `"Delete"` — danger — :221
- T/F — secondary — :268
- correct toggles — toggle — :305
- image/trash — icon-only — :324, :327
- `"+ Add option"` — secondary — :339
- `"Question Settings"` — secondary — :362
- `"Open full settings"` — secondary — :437
- tabs — tab — :470

### src/components/creator/quiz-studio/components/mobile/MobileQuestionSettingsSheet.tsx
- `[icon: X]` — close — :54
- `"Done"` — primary — :148

### src/components/creator/quiz-studio/components/mobile/MobileQuestionBankSheet.tsx
- `[icon: X]` aria-label `Close questions` — close — :66
- `"+ Add"` — primary — :85
- `"AI Generate"` (AiGenerateButton) — primary — :93
- question items — secondary — :136

### src/components/creator/quiz-studio/components/timing/*
- ConfirmModal: `"Cancel"` — secondary — ConfirmModal.tsx:127
- ConfirmModal: `{confirmLabel}` — primary — ConfirmModal.tsx:134
- TimingSection: `"Schedule"` / `"Start manually"` — toggle — TimingSection.tsx:262, :278
- AdvancedTiming: toggle; `"15 minutes before quiz ends" / "At quiz end"` — toggle — AdvancedTiming.tsx:20, :77
- DurationPicker: `{min} min`, `"Custom"` — filter — DurationPicker.tsx:53, :65
- EndQuizModal: `[icon: X]`, `"Cancel"`, `"End Quiz"` — close/secondary/danger — EndQuizModal.tsx:50, :130, :137
- ModeLockModal: `[icon: X]`, `"Cancel"`, `"End Quiz & Change Setting"`, `"Keep current quiz running"` — ModeLockModal.tsx:56, :149, :156, :165
- ManualMode: `"Start Quiz"` — primary — :59; `"End quiz"` — danger — :95; `"Restart Quiz"` — secondary — :125; ConfirmModal labels "Start Quiz"/"Restart Quiz" — :174, :292
- ScheduleMode: `"Set an end time (optional)"` — secondary — :62; `"Start Now"` — primary — :89; ConfirmModal "Start Now" — :113

### src/components/creator/quiz-studio/steps/SetupStep.tsx
- difficulty: Easy / Medium / Hard / Expert — filter — :178–:191
- ChoiceCard: `"AI Generate" / "From Scratch"` — toggle — :357

### src/components/creator/quiz-studio/steps/SettingsStep.tsx
- group toggles: General / Question Behavior / Result & Visibility / Security — tab — :182

### src/components/creator/quiz-studio/steps/QuestionsStep.tsx
- `"Questions"` mobile bank trigger — secondary — :162
- `"AI"` (AiGenerateButton) aria-label `AI Generate` — primary — :174
- `"Settings" / "Set"` — secondary — :181
- `[icon: prev/next]` — icon-only — :199, :208
- `"Create Question"` (mobile) — primary — :238
- `"Generate with AI"` — primary — :245, :362
- `"Saving..." / "Save"` — primary — :262
- `"AI"` — primary — :270
- `"Preview"` — secondary — :277
- `"Questions ({count})"` — tab — :320
- `"Properties"` — tab — :332
- `"Create Question"` — primary — :355
- `[icon: ✕]` close properties — close — :385

### src/components/creator/quiz-studio/steps/AudienceStep.tsx
- `"Select Rooms"` — secondary — :316
- `[icon: X]` aria-label `Remove room` — close — :341
- `"Sample CSV"` (disabled) — secondary — :396
- `"Add Student"` (disabled) — secondary — :415
- `"Select all"` — secondary — :592
- `"Unselect"` — secondary — :600
- `"Saving…" / "Save"` — primary — :608
- `[icon: X]` clear search — close — :639

### src/components/creator/quiz-studio/steps/PublishStep.tsx
- `"Starting…" / "Start Quiz"` — primary — :114
- `"Cancel"` — secondary — :199
- `"Publishing…" / "Yes, Publish"` — primary — :207
- `[icon: Copy]` aria-label `Copy link` — icon-only — :255
- `"Open Quiz"` — primary — :275
- `"Copy Link"` — secondary — :282
- `"Edit Quiz"` — secondary — :292
- `"Create New Quiz"` — secondary — :299
- `"Go to Dashboard"` — secondary — :311

### src/components/creator/quiz-studio/steps/RegistrationStep.tsx
- `"Save"` — primary — :162
- `"Add Registration Field"` — secondary — :171
- `{field.name / "Untitled field"}` — secondary — :218
- `[icon: Move up/down]` — icon-only — :230, :233
- `[icon: Remove field]` — close — :240
- `[icon: ChevronDown]` aria-label `Collapse configuration / Configure field` — icon-only — :243

### src/components/creator/quiz-studio/steps/ReviewStep.tsx
- `"Fix"` — secondary — :106

### src/components/creator/responses/StudioResponsesPage.tsx
- `"Refresh"` — secondary — :513
- `"Download Results"` — secondary — :517
- `"Send on Email"` — secondary — :521
- `"End Quiz"` — danger — :525, :596
- `"Retry"` — secondary — :539
- `[icon: MoreVertical]` aria-label `More actions` — icon-only — :605
- `"Pause"` — secondary — :615
- `"Restart"` — secondary — :622
- filters: All / Submitted / In Progress / Not Started / Auto Submitted — filter — :762
- `"Export"` — secondary — :781
- `"Sort: {label}"` — filter — :784
- `[icon: MoreVertical]` aria-label `Actions for {student}` — icon-only — :851, :924
- `"View attempt"` — secondary — :953
- `"Re-open attempt"` — secondary — :960
- `"Delete attempt"` — danger — :967
- `[icon: X]` — close — :997
- `"Cancel"` + `"Pause Quiz"` — secondary/danger — :1135, :1142
- `"Cancel"` + `"Restart Quiz"` — secondary/danger — :1186, :1193
- `"Cancel"` + `"End Quiz"` — secondary/danger — :1242, :1249

### src/components/creator/tests/CreateTestWizard.tsx
- step nav: Basic Information / Sections / Questions / Pricing / Preview / Submit(Publish) — tab — :397
- `"Back"` — secondary — :421
- `"Saving…" / "Continue"` — primary — :445
- `"Create new section"` — primary — :632
- `"Use existing section"` — secondary — :645
- `"Change option"` — secondary — :682
- `"Save for reuse"` — secondary — :690
- `"Open AI Question Generator"` — secondary — :707
- `"Add Section"` — primary — :737
- `"Free"` — toggle — :761
- `"Paid"` — toggle — :772
- `"Back to Preview"` — ghost — :897
- `"Publishing…" / "Publish Test"` — primary — :898
- `[icon: X]` aria-label `Close` — close — :930
- `"Cancel"` — secondary — :959
- `"Saving…" / "Save blueprint"` — primary — :960

### src/components/creator/tests/sections/SectionCard.tsx
- `"Generate with AI"` (motion) — secondary — :220
- `[icon: ChevronUp/Down]` reorder — icon-only — :253, :261
- `[icon]` aria-label `Collapse/Expand` — icon-only — :294
- `[icon: Copy]` aria-label `Duplicate` — icon-only — :302
- `[icon: Trash2]` aria-label `Delete` — danger — :310
- `"All"` — toggle — :474
- `"Any N"` — toggle — :488
- `[icon: X]` aria-label `Remove {group}` — close — :537
- `[icon: Trash2]` — danger — :626
- `"Add Type"` — secondary — :638
- `"Generate {n} Sub-Questions"` — primary — :647
- `[icon]` correct toggle — toggle — :723
- `[icon]` reorder sub-question — icon-only — :768, :776
- `[icon: Copy]` — icon-only — :784
- `[icon: Trash2]` — danger — :791
- `"Add Sub Question"` — secondary — :805
- `[icon: X]` — close — :828
- type options: Objective / Subjective / Composite / Technical / Other — filter — :844–:924
- `"Add Question Group"` — secondary — :942

### src/components/creator/tests/sections/PaperScopeFilters.tsx
- subject trigger/options — filter — :134, :154
- chapter trigger/options, `"Select all"`, `"Clear"`, `"Apply ({n})"` — filter — :245, :265, :283, :300, :303
- topic trigger/options, `"Select all topics"`, `"Clear"`, `"Apply ({n})"` — filter — :399, :419, :442, :461, :464

### src/components/creator/tests/sections/AIGenerateModal.tsx
- `[icon: X]` — close — :308
- `[icon: Trash2]` aria-label `Remove {file}` — danger — :365
- `"Add more files"` — secondary — :372
- `"Try Again"` — secondary — :410, :619
- `"Create Sections Manually"` — secondary — :421, :612
- `"Cancel"` — secondary — :459, :660
- `"Generate & Replace"` — primary — :466
- `"Generate Test Structure"` — primary — :667

### src/components/creator/tests/sections/QuestionsStep.tsx
- difficulty: Easy / Balanced / Challenging — filter — :248
- `"Generating paper…" / "Generate Question Paper"` — primary — :304
- `"Regenerate"` — secondary — :446
- `"Preparing…" / "Download Paper"` — primary — :454

### src/components/creator/tests/sections/SectionsPage.tsx
- `"Back"` — secondary — :162
- `"Saving…" / "Save Draft"` — secondary — :170
- `"Done" / "Continue to Questions"` — primary — :179
- step nav: Basic Details / Sections / Questions / Settings / Preview — tab — :199
- `"Add Section"` — primary — :299

### src/components/creator/tests/sections/SectionBlueprintLibrary.tsx
- `"Back to section options"` — secondary — :23
- `"Create new"` — primary — :27
- `"Create your first section"` — primary — :37
- `"Use blueprint"` — primary — :78
- `[icon: Trash2]` aria-label `Delete {blueprint}` — danger — :81

### src/components/creator/tests/sections/QuestionBankFilters.tsx
- trigger/options — filter — :78, :93, :109
- `"Clear all" / "Select all"` — secondary — :185
- `[icon: X]` aria-label `Clear subject` — close — :281
- `[icon: X]` aria-label `Remove {chapter}` — close — :303
- `[icon: X]` aria-label `Remove {topic}` — close — :322

### src/components/creator/tests/sections/QuestionGeneratorPanel.tsx
- `[icon: Minus/Plus]` aria-label `Decrease/Increase {label}` — icon-only — :139, :158
- `"Effort"` / `"Plus"` — toggle — :325
- `[icon: RotateCcw]` aria-label `Reset to Plus` — icon-only — :353
- `"Reset"` — secondary — :408, :431
- `"Generating questions…" / "Generate Questions"` — primary — :470
- `"Regenerate"` — secondary — :518
- `"Copied!" / "Copy all"` — secondary — :526

### src/components/creator/workspace/CompanyPage.tsx
- `"Save changes"` — primary — :70
- SegmentedControl: Individual / Organization — tab — :77
- `"Upload logo"` — secondary — :251

### src/components/creator/workspace/CreatorDashboard.tsx
- `"Dismiss"` — ghost — :292
- `[icon: X]` aria-label `Close` — close — :299
- SegmentedControl: 7D / 30D / 90D — tab — :314
- `"View earnings"` — secondary — :320
- `"Retry"` — secondary — :336
- `"Create your first test"` — primary — :339

### src/components/creator/workspace/CreatorProfilePage.tsx
- `"View public profile"` — secondary — :70
- `"Saved" / "Save changes"` — primary — :74
- `[icon: Pencil]` aria-label `Remove {label}` (tag chips) — close — :281
- `"Add"` — secondary — :295

### src/components/creator/workspace/CreatorSettingsPage.tsx
- QsToggle — toggle — :35
- `"Sign out"` — danger — :110, :199
- `"Edit profile"` — secondary — :159
- `"Cancel"` — secondary — :196
- section tabs: Account, Notifications, Privacy, Organization, Finance — tab — :218
- QsToggle row switches — toggle — :281

### src/components/creator/workspace/MembersPage.tsx
- `"Invite member"` — primary — :86
- role options: Teacher / Editor / Analyst — filter — :133
- `"Cancel"` — secondary — :150
- `"Send invitation"` — primary — :157
- `"Clear search"` — secondary — :182
- RoleSelect trigger/options: Owner / Admin / Teacher / Editor / Analyst — filter — :245, :267

### src/components/creator/workspace/notifications.tsx
- `[icon: Bell]` aria-label `Creator notifications` — icon-only — :50
- `"Mark all read"` — secondary — :84
- notification items `{n.title}` — secondary — :99

### src/components/creator/workspace/PublicProfilePage.tsx
- `"Edit profile"` — secondary — :30

### src/components/creator/workspace/VerificationPage.tsx
- `"Payment settings"` — secondary — :51
- `"Start verification" / "Review"` — primary — :160

### src/app/creator/questions/new/page.tsx
- `"Back to Question Bank"` — secondary — :10

### src/app/creator/series/create/page.tsx
- `"Back to Test Series"` — secondary — :10

## 6. AI, Platform, Rooms & Misc

### src/components/ai/AiAssistantPanel.tsx
- `[icon: X]` aria-label `Close AI Assistant` — close — :377
- `[icon: X]` aria-label `Remove {file}` — close — :555
- `"Stop generating"` — danger — :650
- `"Ask AI"` — primary — :658

### src/components/ai/AICreditsDashboard.tsx
- `"Buy Credits"` — primary — :112
- `"View Credit Packs"` — secondary — :153
- `"Buy"` (credit pack) — primary — :384
- `[icon: close]` (no label) — close — :420
- pack-purchase buttons `{pack.name} / {credits} credits / ₹{price}` — primary — :427

### src/components/ai/AIHintExample.tsx
- `"Generating hint..." / "Get AI Hint"` — primary — :138
- `"Buy Credits"` — primary — :158

### src/components/ai/AIMessageRow.tsx
- `"Thinking..."/"Thinking"` toggle — ghost — :92
- `"↓ New reasoning"` — ghost — :123
- `[icon: Copy]` title `Copy/Copied` — icon-only — :210, :264
- `[icon: RefreshCw]` title `Regenerate` — icon-only — :272

### src/components/ai/AIThinkingBlock.tsx
- `"Thinking" / "Thinking · completed"` toggle — ghost — :100
- `"↓ New reasoning"` — ghost — :147

### src/components/ai/LowCreditNotification.tsx
- `[icon: X]` (no label) — close — :45
- `"Buy Now"` — primary — :77
- `"View all credit packs"` — secondary — :87

### src/components/ai/MarkdownRenderer.tsx
- `[icon: copy]` aria-label `Copy code` (shows "Copied") — icon-only — :49

### src/components/ai/AiAssistantStrip.tsx
- `"✨ AI ASSISTANT"` strip title `AI Assistant` — secondary — :69
- `"AI Assistant"` mobile pill — secondary — :113

### src/app/ai/chat/page.tsx
- `[icon: Play]` title `Run` — icon-only — :119
- `[icon: Download]` — icon-only — :120
- `[icon: Copy/CheckCircle]` title `Copy` — icon-only — :121
- `[icon: Bookmark]` — icon-only — :169
- `[icon: Save]` — icon-only — :172
- `[icon: Notes]` — icon-only — :175
- `"New Chat"` — primary — :261
- `[icon: Settings]` — icon-only — :291
- `[icon: PanelLeftOpen]` title `Show sidebar` — icon-only — :482
- quick actions: Explain Code, Optimize, Debug, Dry Run, Complexity, Generate Tests, Interview Prep, Competitive — filter — :513
- `[icon: ImageIcon]` title `Upload Image` — icon-only — :529
- `[icon: Paperclip]` title `Attach File` — icon-only — :530
- `[icon: FileCode]` title `Paste Code` — icon-only — :531
- `[icon: Code]` title `Import Editor` — icon-only — :532
- `[icon: Mic]` title `Voice` — icon-only — :533
- `[icon: Send/Square]` title `Send` / `Stop generating` — icon-only — :546

### src/components/platform/charts.tsx
- legend series toggles `{k.label}` — toggle — :43

### src/components/platform/GlobalSearch.tsx
- `"Search ⌘K"` — secondary — :47

### src/components/platform/OwnerGate.tsx
- `"Retry authorization"` — secondary — :165
- `"Sign in with a different account"` — secondary — :171
- `"Sending…" / "Send one-time code"` — primary — :189
- `"Use a different account"` — secondary — :197
- `"Verifying…" / "Verify & sign in"` — primary — :220
- `"Resend in {n}s" / "Resend code"` — secondary — :228
- `"Change email"` — secondary — :235

### src/components/platform/PlatformSidebar.tsx
- `"Signing out…" / "Sign out"` — danger — :140

### src/components/platform/ui.tsx
- `"Retry"` (ErrorState) — secondary — :177

### src/app/platform/layout.tsx
- `[icon: Menu]` aria-label `Open navigation` — icon-only — :68

### src/app/platform/page.tsx
- `"Refresh"` — secondary — :104
- `"Apply"` — primary — :112
- ranges: Today / 7 days / 30 days / 90 days / Custom — tab — :117
- `"Refresh live"` — secondary — :213
- activity tabs: DAU / WAU / MAU — tab — :461
- feed filters: All / Users / Quizzes / Attempts / Ai / System / Security — filter — :509
- `"Prev"` / `"Next"` — pagination — :538, :539

### src/app/platform/activity/page.tsx
- filter chips (7 scopes) — filter — :35
- `"Prev"` / `"Next"` — pagination — :60, :61

### src/app/platform/engagement/page.tsx
- ranges: today / 7d / 30d / 90d — tab — :19

### src/app/platform/feedback/page.tsx
- `"All ({total})"` — filter — :57
- category chips (Bug or problem, Feature request, Quiz or question issue, Credits and billing, Something else + counts) — filter — :61

### src/app/platform/health/page.tsx
- service expand buttons `{name}` — secondary — :32

### src/app/platform/live/page.tsx
- `"Refresh live"` — secondary — :46

### src/app/platform/observability/page.tsx
- ranges: today / 7d / 30d / 90d — tab — :33
- `"Inspect"` — secondary — :81
- backdrop close aria-label `Close request inspector` — close — :114
- `[icon: X]` aria-label `Close` — close — :118

### src/app/platform/questions/page.tsx
- `"Reset"` — secondary — :223
- grouping tabs: Subject-wise / Chapter-wise / Topic-wise — tab — :283
- group collapse headers `{group.title}` — ghost — :307
- `[icon: Pencil]` aria-label `Edit question {id}` — icon-only — :344
- `[icon: Trash2]` aria-label `Delete question {id}` — danger — :353
- `"Prev"` / `"Next"` — pagination — :376, :377
- `"Close"` (edit dialog) — secondary — :404
- `"Cancel"` — secondary — :463
- `"Saving…" / "Save changes"` — primary — :471

### src/app/platform/question-import/page.tsx
- `"Validating JSON…" / "Validate JSON & create preview"` — primary — :187
- `"AI is analysing the document…" / "Regenerate HTML preview" / "Generate question preview"` — primary — :211
- `"Start another import"` — secondary — :223
- `"Clear selection" / "Select all"` — secondary — :226
- `"Inserting transaction…" / "Insert {n} into question bank"` — primary — :241

### src/components/rooms/RoomsManager.tsx
- `"Create Room"` — primary — :299, :693
- filters: All / Active / Archived / Recently Updated ({n}) — filter — :367
- `[icon: MoreVertical]` aria-label `Actions for {room}` — icon-only — :459, :519
- row menu: View Students / Edit Room / Add Students / Import Students / Export Students / Duplicate Room / Archive Room / Restore Room — ghost — :654
- `"Import Students"` — secondary — :697
- `"Cancel"` — secondary — :741
- `"Save"` — primary — :744

### src/components/rooms/RoomDetailsView.tsx
- `[icon: Edit3]` aria-label `Rename room` — icon-only — :428
- `"Export"` — secondary — :453
- `"Import"` — secondary — :457
- `"Add Students"` — primary — :468
- `[icon: MoreHorizontal]` aria-label `Room actions` — icon-only — :480
- header menu: Export Students / Archive Room / Restore Room / Duplicate Room — ghost — :349–:377
- filters: All / Recently Added / Issues ({n}) — filter — :528
- `"Remove"` (bulk) — danger — :571
- `"Clear"` — secondary — :578
- `[icon: checkbox]` aria-label `Select {student}` — toggle — :624, :720
- `[icon: checkbox]` aria-label `Select all visible` — toggle — :679
- `"Prev"` / `"Next"` — pagination — :780, :790
- `"Cancel"` / `"Remove"` (modal) — secondary/danger — :889, :892

### src/components/rooms/StudentDetailsPanel.tsx
- `[icon: X]` aria-label `Close` — close — :86
- `"Edit"` — secondary — :186
- `"Remove"` — danger — :193
- `"Done"` — primary — :201

### src/components/rooms/DuplicateRoomModal.tsx
- `"Cancel"` — secondary — :56
- `"Duplicate Room"` — primary — :62
- options: "Room information only" / "Room information + students" — toggle — :74

### src/components/rooms/EditStudentModal.tsx
- `"Cancel"` — secondary — :65
- `"Save Changes"` — primary — :71
- toggle — toggle — :111

### src/app/meet-the-developer/DeveloperPortfolio.tsx
- `[icon: theme]` aria-label `Switch to light/dark theme` — icon-only — :230

### src/app/scratch-credits/page.tsx
- `[icon: hamburger]` aria-label `Open Studio navigation` — icon-only — :22
- `[icon: X]` aria-label `Close menu` — close — :55

---

### Notes
- Some shared components render call-site-specific labels (e.g. `ConfirmDialog {confirmLabel}`, `GenerateResultsButton`, `PrimaryButton/GhostButton` in tests) — resolved at call sites above.
- `src/app/api/**` has no UI buttons. `src/components/contest` has no buttons (empty barrel).
- `role="button"` elements: `PurchasesPage.tsx:127` product card; `EditorToolbar.tsx` "×" span (not a `<button>`).
- Buttons in root files `src/app/error.tsx`, `not-found.tsx`, `loading.tsx` covered in section 2 (only error.tsx has one).

