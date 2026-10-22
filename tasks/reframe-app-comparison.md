# Reframe the Splitwise comparison around Side Badger's strengths

Requested by the owner on 22 October 2026. Status: captured; implementation pending.

## Aim

Revise `/compare/splitwise/` so it leads with the reasons to choose Side Badger. The current emphasis on “what Splitwise does better” does not reflect the angle the owner wants. Present Side Badger as a social app centred on shared expenses, with collaboration and group configuration as core strengths.

This task records the owner's requested positioning. Comparative claims and the precise scope of individual features need verification when writing the copy.

## Points to cover

- [ ] **Browser and installed app in one.** Explain that Side Badger is a progressive web app (PWA): use it on the website or install it for an app experience. Frame this as a benefit rather than a shortcoming beside native apps. Features that appear on the web are also available in the installed PWA; users do not need to wait for a separate native-app release. Explain this in everyday language.
- [ ] **No bank connection as a security benefit.** Reframe the absence of banking/payment integration around avoiding the extra access and security exposure involved in connecting a bank account to another app. Side Badger keeps the shared-expense record; people pay through their preferred method and record the payment. The owner's point is that even well-built bank integrations introduce security considerations. Express that concrete benefit without claiming competitors are insecure or that Side Badger is risk-free.
- [ ] **A broader social experience around expenses.** Bring out the breadth of features, rather than presenting Side Badger as only an expense calculator. The owner wants the comparison to convey a more fully featured social app centred on expenses.
- [ ] **Comments on expenses and settlements.** Explain the discussion attached to financial records. Verify whether settlements support comments before making that specific claim.
- [ ] **Questions and blocking disputed expenses.** Explain how members can question an expense and hold it out of balances while the question is open. Check the exact supported actions and distinguish this from any claim about questioning or blocking settlements.
- [ ] **More group configuration.** Highlight roles, permissions, collaboration presets and custom group controls, with concrete examples. Verify any claim that there is more configuration than in the competing products.
- [ ] **General group discussion.** Show that conversations can happen at group level, beyond individual expense records.
- [ ] **Images and attachments.** Include uploading images and sharing attachments in the supported discussion and expense contexts.
- [ ] **Built-in support.** Include the app's support/feedback functionality and replies, using the actual feature name and supported workflow.
- [ ] **AI integrations and voice control.** Present this as a supported feature in the revised comparison: Side Badger supports ChatGPT, Claude and any MCP-compatible LLM agent, so people can manage shared expenses conversationally through their AI assistant, including by voice where the client supports it. The owner explicitly wants supported-feature wording, with no “in progress” or “coming soon” language. Confirm launch readiness when publishing, and describe supported actions, account linking and confirmation requirements accurately. A public directory listing is separate from connecting an MCP-compatible client.
- [ ] **Groups, lists and polls.** Highlight the group organisation and planning features, including lists and polls, as part of the social experience around shared spending.
- [ ] **Position against both Splitwise and Tricount.** The owner sees these as more expense-driven, while Side Badger combines expenses with social and planning features. Use that as the intended positioning; verify their current collaboration features before stating a comparative advantage. The immediate deliverable is the existing Splitwise page; this request does not require a new Tricount page.
- [ ] **Languages and currencies.** Highlight both translation coverage and currency support: the current feature registry records 39 languages and 140 currencies. Include the owner's requested point that language coverage is substantially wider than Splitwise or Tricount. Verify current app and competitor counts before publication and compare equivalent coverage (app interface versus marketing-site translations). Describe currency breadth as its own strength; claim a larger currency count than a competitor only if verified.
- [ ] **Remove the recurring-expenses drawback.** The owner says recurring expenses are in the backlog and wants the comparison's mentions of their absence removed, including the section, table and FAQ references. Do not imply that the feature is already available or promise a delivery date.

## Implementation

- [ ] Review the English comparison content in `src/content/compare/splitwise/en.yaml`, including its title, introduction, section headings, table and FAQ, against all the points above.
- [ ] Check Side Badger's feature registry and app implementation for exact feature scope; update approved claims where needed.
- [ ] Check current primary sources for Splitwise and Tricount before publishing comparative statements, and retain dated source links for claims about competitors.
- [ ] Keep practical limitations clear while leading with Side Badger's strengths and reasons to choose it.
- [ ] Update the other 38 locales and their translation review records after the English wording is settled, following the repository's strict release requirements.
- [ ] Run the relevant content, translation and output checks serially with one worker; include layout/browser checks if the change affects presentation.

## Done when

The comparison covers every positioning point above, makes Side Badger's installed-PWA experience and social collaboration strengths clear, and explains the benefit of keeping bank accounts unconnected. Every published feature and competitor claim is supported, and all locales meet the release gate.
