# Fertility Tracker Documentation

Welcome to the **Fertility Tracker** documentation hub. This documentation is organized using the **[Diátaxis framework](https://diataxis.fr/)**, which structures documentation into four distinct quadrants based on user needs: **Tutorials**, **How-To Guides**, **Reference**, and **Explanation**.

Additionally, this repository maintains formal records for architectural evolution via **Architecture Decision Records (ADRs)** and feature proposals via **Request for Comments (RFCs)**.

---

## 🧭 Documentation Map

```ascii
                          PRACTICAL
                             ▲
                             │
     Tutorials               │               How-To Guides
  (Learning-oriented)        │             (Task-oriented)
                             │
  • Getting Started          │             • Log Biomarker Observations
                             │             • Export Cycle Charts
                             │             • Add a New Language (i18n)
   LEARNING ───────────────────┼─────────────────── WORKING
                             │
     Explanation             │                 Reference
(Understanding-oriented)     │           (Information-oriented)
                             │
  • CrMS Methodology         │             • CrMS Biomarker Codes
  • Architecture Overview    │             • Domain Engine API
                             │             • Project Structure
                             ▼
                        THEORETICAL
```

---

## 📚 1. Tutorials (Learning-Oriented)

Tutorials guide newcomers step-by-step through creating their first cycle chart and understanding the core application workflow.

* **[Getting Started with Fertility Tracker](tutorials/01-getting-started.md):** Hands-on walkthrough for set up, navigation, and logging your first cycle.

---

## 🛠️ 2. How-To Guides (Task-Oriented)

How-To guides provide actionable, step-by-step instructions to accomplish specific real-world tasks.

* **[Log Biomarker Observations](how-to/log-biomarkers.md):** Step-by-step guide to using the observation drawer, Creighton codes, and manual Peak Day overrides.
* **[Export Cycle Charts](how-to/export-cycle-charts.md):** Step-by-step guide to generating PDF reports, PNG chart images, or JSON data backups.
* **[Add a New Language](how-to/add-new-language.md):** Instructions for contributing new i18n locale translations.
* **[Deploy to Cloudflare Pages](how-to/deploy-cloudflare.md):** Step-by-step guide for manual CLI deployment and GitHub Actions automated CD to Cloudflare Pages.

---

## 📖 3. Reference (Information-Oriented)

Reference documentation provides precise, technical specifications and schemas for developer reference.

* **[CrMS Biomarker Codes & Stamp Rules](reference/crms-biomarker-codes.md):** Complete catalog of stretch, bleeding, frequency, symptom, and stamp color codes.
* **[Domain Engine API Reference](reference/domain-engine-api.md):** Function signatures, inputs, and output types for `codeParser`, `stampCalculator`, `peakDetector`, and `cycleBoundaryDetector`.
* **[Project & Component Structure](reference/project-structure.md):** High-level breakdown of directories, React components, context providers, and tests.

---

## 💡 4. Explanation (Understanding-Oriented)

Explanation articles offer high-level context, background concepts, and design rationales behind the system.

* **[Creighton Model Methodology](explanation/crms-methodology.md):** Clinical principles of CrMS, biomarker scoring, and peak day calculation mechanics.
* **[Architecture Overview](explanation/architecture-overview.md):** System design, data flow, reactive state management, and separation of concerns.
