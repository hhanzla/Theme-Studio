# AGENTS.md — Theme Studio Build Instructions

Ye file un dono spec docs (`milestone-1-spec.md`, `milestone-2-spec.md`) ke
saath is repo mein rakhni hai. Koi bhi AI coding agent (Codex, Antigravity,
etc.) is project pe kaam shuru karne se pehle ye poori file padhe.

---

## Zaban / Communication

- Har message, har explanation, har question **Roman Urdu mein** likho.
  Code, file names, aur commands English/technical hi rahenge (jaisa hona
  chahiye) — sirf tumhari baatcheet (chat) Roman Urdu mein ho.
- Casual aur seedha tone rakho, jaise ek dev doosre dev se baat kar raha ho.

---

## Sabse Zaroori Qaida: Ek Waqt Mein Ek Phase

Ye project 2 milestones mein banega, aur har milestone kai phases mein
divided hai:

- `milestone-1-spec.md` → Section 9 mein Phase 1 se Phase 5 tak
- `milestone-2-spec.md` → Section 7 mein Phase 1 se Phase 4 tak

**Tumhe ek waqt mein sirf EK phase pe kaam karna hai.** Poora project ek
sath likhne ki koshish mat karo, chahe tumhe scope samajh mein aa jaye.

Is tarah kaam karo:

1. Bata do ab kaunsa phase shuru kar rahe ho aur uska goal kya hai (2-3
   lines, Roman Urdu mein).
2. Sirf usi phase ke files banao/edit karo jo spec mein us phase ke andar
   list ki gayi hain.
3. Phase khatam hone par:
   - Chhota summary do ki kya bana (Roman Urdu mein) — files ke naam, kya
     kaam karte hain.
   - Agar kuch test/verify karne layak hai (jaise "npm start chala kar dekho
     Browse tab load ho raha hai ya nahi"), wo bhi bata do.
   - **Phir ruk jao aur pucho**: "Agla phase (Phase X: <naam>) shuru karun?"
4. Jab tak user "haan", "next", "shuru karo" ya isi tarah ka clear
   confirmation na de, **agle phase ka koi bhi file mat banao, mat edit
   karo**.
5. Agar user kahe "ruk jao" ya "yahi theek hai", to wahin ruk jao, aage mat
   badho.

---

## Milestone Order

1. Pehle **poora Milestone 1** (Phase 1 se Phase 5) complete karo, ek phase
   ek waqt mein, upar wale qaide ke mutabiq.
2. Milestone 1 ke Phase 5 ke exit criteria (spec ke end mein likhe hain) pura
   hone tak **Milestone 2 ka koi file mat chuna, koi code mat likho.**
3. Milestone 1 poora hone ke baad hi pucho: "Milestone 1 complete ho gaya —
   Milestone 2 (GDM/Lock Screen) shuru karun?"
4. Haan milne par hi Milestone 2 ke phases isi tarah ek-ek karke shuru karo.

---

## Har Phase Shuru Karne Se Pehle

- Relevant spec section dobara padho (Milestone 1 ya 2 ki file mein us phase
  ka hissa) — assumptions apni taraf se mat lagao, jo likha hai wahi follow
  karo.
- Agar spec mein koi cheez ambiguous lage ya missing lage, kaam rok kar user
  se Roman Urdu mein pucho — guess mat karo especially jab file paths,
  catalog schema fields, ya IPC channel names ki baat ho.
- `sources/themes.json`, `sources/icons.json`, `sources/cursors.json` mein
  diye gaye starter entries ko as-is use karo — inhe restructure ya rename
  mat karo, sirf spec mein bataye gaye jagah pe consume karo.

---

## Jo Cheezein Kabhi Skip Nahi Karni

- Phase order kabhi mat badlo (jaise Phase 3 se pehle Phase 4 shuru karna).
- Ek phase ke andar bhi, agar wo phase khud spec mein kai steps mein bata
  gaya hai (jaise Phase 2: downloader + installer + fixes wiring), to sab
  steps usi phase ke andar poora karo, phir hi ruk kar pucho.
- Milestone 2 ke koi bhi system-level (root/pkexec) changes Milestone 1
  complete hone se pehle mat likho — GDM/system directories ko chhuna
  Milestone 1 ke scope mein bilkul nahi hai.
- Kabhi bhi ek confirmation se zyada phases aage mat badho — chahe agla
  phase "chhota sa hai" lage.

---

## Quick Reference — Phase List

**Milestone 1**
1. Foundation (paths, state-store, catalog loader, static Browse grid)
2. zip-static installs (downloader, installer, gtk4 fixer wiring)
3. script installs + variant picker + dependency checker
4. Uninstall manager + state polish
5. Looks + Settings (flatpak override toggle)

**Milestone 2**
1. System copy mechanism (gdm-assets fixer, debug wiring)
2. GDM session enablement (gdm.js, status check)
3. Lock Screen tab UI
4. Safety pass (VM testing, recovery/reset path, README documentation)

Har phase ka poora detail respective spec file mein hai — ye sirf ek
checklist/reminder hai, poori detail ke liye spec files hi authoritative
hain.
