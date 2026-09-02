# Explanation: Creighton Model Methodology

This document explains the medical and clinical background of the **Creighton Model FertilityCare System (CrMS)** and how its principles are implemented in **Fertility Tracker**.

---

## What is the Creighton Model?

The Creighton Model FertilityCare System (CrMS) is a standardized, clinically tested system for tracking a woman's natural fertility biomarkers. Developed by Dr. Thomas W. Hilgers at the Pope Paul VI Institute for the Study of Human Reproduction, CrMS is based on the observation of cervical mucus, vaginal discharge, and bleeding patterns throughout the menstrual cycle.

Unlike rhythm or calendar calculation methods, CrMS relies entirely on **real-time prospective observations** recorded throughout each day.

---

## Physiological Foundations

1. **Estrogen & Cervical Mucus:** As ovarian follicles mature prior to ovulation, rising estrogen levels cause the cervix to produce mucus that changes from pasty/dry to clear, stretchable ($\ge 1$ inch), and lubricative. This mucus nourishes and aids sperm survival.
2. **Ovulation & Peak Day:** Peak Day ($P$) is clinically defined as the **last day of mucus that has Peak-type characteristics** (clear, stretchable $\ge 1$ inch, or lubricative). Ovulation typically occurs on Peak Day or within 1–2 days after.
3. **Progesterone & Post-Peak Phase:** Following ovulation, the corpus luteum produces progesterone, causing cervical mucus to abruptly dry up. The post-peak phase ($P+1$ through $P+3$) marks the closing of the fertile window.

---

## How Fertility Tracker Applies CrMS Rules

**Fertility Tracker** automates CrMS rules while respecting clinical workflow:

```text
Observation Input  --->  Code Parsing  --->  Stamp Assignment  --->  Peak Day Evaluation
 (e.g. 10KL AD)            (Stretch/Color)      (White + Baby)          (Identifies 'P' & P+1..P+3)
```

- **Automatic Peak Calculation:** The domain engine evaluates complete cycle observations sequentially to identify the final day of Peak-type mucus before a permanent dry shift.
- **Manual Override Support:** Because clinical circumstances (such as double peak cycles or continuous mucus patterns) require certified practitioner evaluation, **Fertility Tracker** allows users to set a manual Peak Day override.
- **Mucific Score Calculation:** In the Analytics View, the application computes the cycle's mucific score, measuring peak mucus quality across the fertile window.
