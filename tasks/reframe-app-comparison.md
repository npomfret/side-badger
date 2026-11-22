# Reframe the Splitwise comparison around Side Badger's strengths

Requested by the owner on 22 October 2026. Status: implemented on 22 November 2026, in English and all 38 locales; see Result.

## Aim

Revise `/compare/splitwise/` so it leads with the reasons to choose Side Badger. The current emphasis on “what Splitwise does better” does not reflect the angle the owner wants. Present Side Badger as a social app centred on shared expenses, with collaboration and group configuration as core strengths.

This task records the owner's requested positioning. The page must not promise no ads or no paid tier, since both may come; brag about what Side Badger does better, for free (owner decision, 22 November 2026). Comparative claims and the precise scope of individual features need verification when writing the copy.

## Points to cover

- [x] **Browser and installed app in one.** Explain that Side Badger is a progressive web app (PWA): use it on the website or install it for an app experience. Frame this as a benefit rather than a shortcoming beside native apps. Features that appear on the web are also available in the installed PWA; users do not need to wait for a separate native-app release. Explain this in everyday language.
- [x] **No bank connection as a security benefit.** Reframe the absence of banking/payment integration around avoiding the extra access and security exposure involved in connecting a bank account to another app. Side Badger keeps the shared-expense record; people pay through their preferred method and record the payment. The owner's point is that even well-built bank integrations introduce security considerations. Express that concrete benefit without claiming competitors are insecure or that Side Badger is risk-free.
- [x] **A broader social experience around expenses.** Bring out the breadth of features, rather than presenting Side Badger as only an expense calculator. The owner wants the comparison to convey a more fully featured social app centred on expenses.
- [x] **Comments on expenses and settlements.** Explain the discussion attached to financial records. Verify whether settlements support comments before making that specific claim.
- [x] **Questions and blocking disputed expenses.** Explain how members can question an expense and hold it out of balances while the question is open. Check the exact supported actions and distinguish this from any claim about questioning or blocking settlements.
- [x] **More group configuration.** Highlight roles, permissions, collaboration presets and custom group controls, with concrete examples. Verify any claim that there is more configuration than in the competing products.
- [x] **General group discussion.** Show that conversations can happen at group level, beyond individual expense records.
- [x] **Images and attachments.** Include uploading images and sharing attachments in the supported discussion and expense contexts.
- [x] **Built-in support.** Include the app's support/feedback functionality and replies, using the actual feature name and supported workflow.
- [x] **AI integrations and voice control.** Present this as a supported feature in the revised comparison: Side Badger supports ChatGPT, Claude and any MCP-compatible LLM agent, so people can manage shared expenses conversationally through their AI assistant, including by voice where the client supports it. The owner explicitly wants supported-feature wording, with no “in progress” or “coming soon” language. Confirm launch readiness when publishing, and describe supported actions, account linking and confirmation requirements accurately. A public directory listing is separate from connecting an MCP-compatible client.
- [x] **Groups, lists and polls.** Highlight the group organisation and planning features, including lists and polls, as part of the social experience around shared spending.
- [x] **Position against both Splitwise and Tricount.** (Splitwise only; see Decisions.) The owner sees these as more expense-driven, while Side Badger combines expenses with social and planning features. Use that as the intended positioning; verify their current collaboration features before stating a comparative advantage. The immediate deliverable is the existing Splitwise page; this request does not require a new Tricount page.
- [x] **Languages and currencies.** Highlight both translation coverage and currency support: the current feature registry records 39 languages and 140 currencies. Include the owner's requested point that language coverage is substantially wider than Splitwise or Tricount. Verify current app and competitor counts before publication and compare equivalent coverage (app interface versus marketing-site translations). Describe currency breadth as its own strength; claim a larger currency count than a competitor only if verified.
- [x] **Remove the recurring-expenses drawback.** The owner says recurring expenses are in the backlog and wants the comparison's mentions of their absence removed, including the section, table and FAQ references. Do not imply that the feature is already available or promise a delivery date.

## Decisions (22 November 2026)

- **Evidence:**
  - App facts are from the registry, plus a code read of wl-bill-splitter on 22 November 2026.
  - Splitwise facts are from its own pages, read the same day (`asOf` 2026-11-22).
  - New claims: `comments.group-and-everything`, `permissions.presets-or-your-own`, `groups.default-currency-and-header`, `home-screen.same-app-everywhere`, `settlements.no-bank-connection`, `ai-assistants.ask-your-assistant` and `comments.attach-files`.
- **Settlements:** no comments, attachments or questions on settlements; the app doesn't support them. Payments take reactions only, and the copy says so.
- **Attachments:**
  - Up to three receipts on each expense.
  - Photos or PDFs on comments on the group, a list or a poll.
  - Not on expense comments: the app turns uploads off there (`ExpenseDetailModal`). The registry's `comments` capability now says so.
- **Bank:** "doesn't connect to your bank or ask for your bank details", in the present tense. "Never" and "card" are left out because a paid tier may come and would take card details.
- **AI assistants:**
  - The copy names ChatGPT and Claude only. The app's sign-in accepts only those two, so "any MCP-compatible agent" would be false.
  - No voice claim: the app has no voice support.
  - MCP is not named, under the no-internals rule.
  - The wording is "supported", as the owner asked. The homepage hero already makes the same claim, by owner decision.
  - Still open for the owner: the registry rates `ai-assistants` low confidence. Production account linking and the production tool set are unverified, and it is not accepted in the phone apps. The brief's "confirm launch readiness when publishing" has not been done.
- **Tricount:**
  - No Tricount claims.
  - Its help centre lists 38 languages to our 39, so "substantially wider than Tricount" is false.
  - Tricount also says "Free. No ads. No limits."
- **Splitwise head-to-head:**
  - Roles and permissions: Splitwise's help centre says it "does not support group admins or special permissions".
  - Languages: 39 to its "7+".
  - Bank connection: Pay by Bank "connects a personal checking account".
  - Splitwise's comments, lists and polls are not stated on its pages, so the page makes no comparison there.
- **Recurring expenses:** removed from the section, the table and the FAQ.
- **Limitations stay visible.** "Where Splitwise still wins" keeps app-store apps, offline use, in-app payments, shares and itemised splits, and charts. The browser and home-screen app is presented as a strength first, and the limitation then appears in "Where Splitwise still wins", the table and two FAQ answers ("Keep practical limitations clear").
- **Support:** the app labels it "Get Help" in the header on wide screens and "Feedback" in the user menu, so the copy names the action ("Tell us from the app") rather than one label.
- **Currencies:** the brief's 140 is out of date. The registry and the app say 133, so the page uses 133.
- **"Pro has no daily limit":** the "Expenses per day" row cites the Pro help article. Its free-plan limit and the Pro page's "Unlimited expenses" both back the row.
- **Like-for-like languages:** "7+ languages" is Splitwise's home-page figure for its product, and 39 is the app's interface languages. The page quotes Splitwise's figure as Splitwise's own words.
- **No ads or paid tier:** the page promises neither (see AGENTS.md).

## Implementation

- [x] Review the English comparison content in `src/content/compare/splitwise/en.yaml`, including its title, introduction, section headings, table and FAQ, against all the points above.
- [x] Check Side Badger's feature registry and app implementation for exact feature scope; update approved claims where needed.
- [x] Check current primary sources for Splitwise and Tricount before publishing comparative statements, and retain dated source links for claims about competitors.
- [x] Keep practical limitations clear while leading with Side Badger's strengths and reasons to choose it.
- [x] Update the other 38 locales and their translation review records after the English wording is settled, following the repository's strict release requirements.
- [x] Run the relevant content, translation and output checks serially with one worker; include layout/browser checks if the change affects presentation.

## Done when

The comparison covers every positioning point above, makes Side Badger's installed-PWA experience and social collaboration strengths clear, and explains the benefit of keeping bank accounts unconnected. Every published feature and competitor claim is supported, and all locales meet the release gate.

## Result

- **English:** `src/content/compare/splitwise/en.yaml` was rewritten. An independent review found nine issues. A second pass confirmed seven resolved; the AI claim and the support name are recorded under Decisions as owner calls. The main fixes were future-tense bank wording, missing attachments, admin-only questions, `notApproved` wording and repetition.
- **Locales:** all 38 were translated, then patched to the reviewed English, then checked blind.
  - Sonnet wrote back-translations without seeing the English, and separate agents compared them with it.
  - The fixes covered meaning drift (for example el "you get paid", zh "stay free forever", sw "split the payer", uk "lets slip"), mixed forms of address, terminology and register.
  - The pass is recorded as `checked` by `BT-compare-reframe`. No person has reviewed these translations.
- **App terms:** role and preset names keep the app's own labels, so people recognise them in the app.
- **Checks:** the content, registry and compare-page tests pass (147), and `i18n audit` is clean. Strict `npm run verify` passes: 1243 unit tests, 0 type errors, `check:site` 185 out of 185. Rule 13 needed three Pidgin labels to be put into Pidgin. The e2e `layouts.spec` passes 222. `tmp/ad-hoc-scripts/compare-structure-check.cjs` confirms every locale matches the English shape.
