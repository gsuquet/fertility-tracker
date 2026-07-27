# Tutorial: Getting Started with Fertility Tracker

This hands-on tutorial will guide you through setting up **Fertility Tracker** locally, understanding the main user interface, and charting your first fertility cycle.

---

## Prerequisites

Before starting this tutorial, ensure you have:

* **mise** (recommended for managing Node.js versions and tasks) or **Node.js** installed ($\ge v26.5.0$).
* **Git** installed on your system.
* A modern web browser (Chrome, Firefox, Safari, or Edge).

---

## Step 1: Clone and Launch the Application

1. Open your terminal and clone the repository:

   ```bash
   git clone https://github.com/gsuquet/fertility-tracker.git
   cd fertility-tracker
   ```

2. (Optional) Set up your tool environment using `mise`:

   ```bash
   mise install
   ```

3. Install dependencies:

   ```bash
   mise run install  # or: npm install
   ```

4. Launch the development server:

   ```bash
   mise run dev  # or: npm run dev
   ```

5. Open `http://localhost:5173` in your browser. You should see the main **Fertility Tracker** dashboard.

---

## Step 2: Explore the Dashboard Views

The application provides three primary views selectable via the navigation header:

1. **Chart View (Default):** Displays cycle days as horizontal, authentic Creighton paper chart rows with colored stamps (`RED`, `DARK_GREEN`, `WHITE_BABY`, `LIGHT_GREEN_BABY`).
2. **Calendar View:** Shows observations mapped across a monthly calendar grid.
3. **Analytics View:** Displays cycle statistics, mucific score, post-peak phase length, and cycle length metrics.

---

## Step 3: Log Your First Daily Observation

1. In the **Chart View**, click on any empty cycle day card or click the floating **"+" / "Log Observation"** drawer button.
2. Select the observation date and cycle day.
3. Choose a **Bleeding Code** if applicable (e.g., `M` for Moderate or `L` for Light).
4. If no bleeding is present, select a **Mucus Stretch** (e.g., `10` for 1 inch or more) and **Mucus Modifiers** (e.g., `K` for Clear, `L` for Lubricative).
5. Select the **Frequency Code** (e.g., `AD` for All Day or `X3` for 3 times daily).
6. Click **Save Observation**.

---

## Step 4: Observe Stamp & Peak Day Automatic Calculations

Once saved, observe how **Fertility Tracker** processes your observation:

* An observation with `10KL AD` will automatically render a **White with Baby** fertile stamp.
* When mucus observations change from lubricative/clear to dry on subsequent days, the domain engine automatically calculates the **Peak Day ($P$)** and tags post-peak days as $P+1$, $P+2$, and $P+3$ with light green stamps.

---

## Step 5: Export Your Chart

1. Click the **Export** button in the top navigation header.
2. Select your desired format:
   * **PDF:** Printable chart layout for clinical review.
   * **PNG:** High-resolution image of your current cycle row.
   * **JSON:** Portable data backup.
3. Click **Download**.

---

## Next Steps

Congratulations! You have completed your first cycle logging workflow.

* To learn more about Creighton codes, read the [CrMS Biomarker Code Reference](../reference/crms-biomarker-codes.md).
* To understand how peak detection works programmatically, read [Creighton Model Methodology](../explanation/crms-methodology.md).
