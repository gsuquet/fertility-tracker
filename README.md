# Fertility Tracker

**Repository:** [github.com/gsuquet/fertility-tracker](https://github.com/gsuquet/fertility-tracker)  
**Maintained by:** [gsuquet](https://github.com/gsuquet)

---

## Table of contents

1. [Project description](#project-description)
2. [Who this project is for](#who-this-project-is-for)
3. [Project dependencies](#project-dependencies)
4. [Instructions for using Fertility Tracker](#instructions-for-using-fertility-tracker)
    - [Install Fertility Tracker](#install-fertility-tracker)
    - [Configure Fertility Tracker](#configure-fertility-tracker)
    - [Run Fertility Tracker](#run-fertility-tracker)
    - [Troubleshoot Fertility Tracker](#troubleshoot-fertility-tracker)
5. [Contributing guidelines](#contributing-guidelines)
6. [Additional documentation](#additional-documentation)
7. [How to get help](#how-to-get-help)
8. [Terms of use](#terms-of-use)

---

## Project description

With **Fertility Tracker**, you can track, chart, and analyze your natural fertility cycles using standardized Creighton Model System (CrMS) biomarker observations.

**Fertility Tracker** helps you log daily observations—such as cervical mucus characteristics, sensation, bleeding codes, and observation frequency—while automatically calculating stamp colors, identifying peak day indicators, and determining post-peak phase transitions.

Unlike generic period trackers that rely on opaque calendar-math algorithms, **Fertility Tracker** follows clinically grounded CrMS charting rules to provide true physiological insight, interactive paper-style cycle rows, calendar grid views, and exportable cycle charts.

### Key Features

- **Standardized CrMS Code Parsing:** Enter standardized codes (e.g., `2`, `2W`, `10KL`, `10WL`) with real-time interpretation of stretch, color, and consistency.
- **Automated Stamp & Peak Rules:** Automatic assignment of Red (bleeding), Green (dry), Yellow (pre-peak/post-peak dry variants), and White with Baby (fertile/mucus) stamps alongside Peak Day calculation ($P+1$, $P+2$, $P+3$).
- **Multiple Visual Views:** Toggle between authentic paper-style **Chart Rows**, a monthly **Calendar Grid**, and comprehensive **Cycle Analytics**.
- **Cycle Analytics & Statistics:** Detailed insights into cycle length, post-peak phase length, mucific score, and fertility windows.
- **Data Export:** Export charts to high-resolution PNG, PDF, or JSON format for sharing with FertilityCare Medical Consultants or Practitioners.
- **Internationalization & Accessibility:** Built-in multi-language support (English, French, Spanish) and Dark/Light theme customization.

---

## Who this project is for

This project is intended for:

- **Individuals and Couples** who use natural family planning (NFP) and Creighton Model methods to track their reproductive health, achieve pregnancy, or avoid pregnancy naturally.
- **Open Source Developers** interested in health technology, bio-parsing algorithms, and modern React web applications.

---

## Project dependencies

Before using **Fertility Tracker**, ensure your development environment includes:

- **mise (Recommended):** [mise](https://mise.jdx.dev/) for managing tool versions (Node.js) and task automation.
- **Node.js:** v26.5.0 or higher (managed automatically via `mise`).
- **Package Manager:** `npm` v9.0.0 or higher (or `pnpm` / `yarn`).
- **Modern Web Browser:** Google Chrome, Mozilla Firefox, Safari, or Microsoft Edge with ES2022+ support.

---

## Instructions for using Fertility Tracker

Get started with **Fertility Tracker** by cloning the repository and launching the development server.

### Install Fertility Tracker

1. Clone the repository to your local machine:

   ```bash
   git clone https://github.com/gsuquet/fertility-tracker.git
   ```

2. Navigate into the project directory:

   ```bash
   cd fertility-tracker
   ```

3. Install tool versions using `mise` (optional but recommended):

   ```bash
   mise install
   ```

4. Install project dependencies:

   ```bash
   mise run install  # or: npm install
   ```

### Configure Fertility Tracker

1. **Environment Setup (Optional):**
   Create a `.env.local` file in the root directory if you wish to override default environment variables (e.g., base path or port configuration).

2. **Tailwind / Style Verification:**
   Styles and themes are configured via CSS variables and Vite. Ensure all assets compile cleanly by running a dry build:

   ```bash
   mise run build  # or: npm run build
   ```

### Run Fertility Tracker

1. **Start Development Server:**
   Launch the local live-reload development server:

   ```bash
   mise run dev  # or: npm run dev
   ```

   Open `http://localhost:5173` in your browser to interact with the web app.

2. **Run Automated Test Suite:**
   Execute unit and integration tests using Vitest:

   ```bash
   mise run test  # or: npm run test
   ```

3. **Build for Production:**
   Type-check TypeScript code and bundle production-ready static assets:

   ```bash
   mise run build  # or: npm run build
   ```

4. **Preview Production Build:**
   Preview the generated static build locally:

   ```bash
   mise run preview  # or: npm run preview
   ```

5. **Deploy to Cloudflare Pages:**
   Deploy static assets to Cloudflare Pages:

   ```bash
   mise run deploy  # or: npm run deploy
   ```

   For automated GitHub Actions deployment details, see the [Cloudflare Deployment How-To Guide](docs/how-to/deploy-cloudflare.md).

### Troubleshoot Fertility Tracker

| Issue | Solution |
| :--- | :--- |
| `npm install` fails or throws peer dependency conflicts | Ensure you are using Node.js $\ge 18$. Run `npm install --legacy-peer-deps` if node version mismatches persist. |
| Port `5173` is already in use when running `npm run dev` | Vite will automatically try the next available port (e.g., `5174`). Alternatively, specify a port explicitly: `npx vite --port 3000`. |
| TypeScript check fails during `npm run build` | Clear local Vite cache and re-run build: `rm -rf node_modules/.vite dist && npm run build`. |
| Tests fail in headless environment | Ensure `jsdom` is installed correctly and run `npm run test -- --update`. |

**Other troubleshooting supports:**

- [GitHub Issue Tracker](https://github.com/gsuquet/fertility-tracker/issues)
- [Vite Troubleshooting Documentation](https://vitejs.dev/guide/troubleshooting.html)

---

## Contributing guidelines

We welcome contributions from developers, technical writers, and FertilityCare experts!

To contribute:

1. Fork the repository on GitHub.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Ensure all tests pass (`npm run test`) and code compiles without warnings (`npm run build`).
4. Commit your changes with clear, descriptive commit messages.
5. Push to your branch and open a Pull Request explaining your changes and motivation.

---

## Additional documentation

This project uses the **[Diátaxis Framework](docs/README.md)** for developer and user documentation:

- **[Diátaxis Documentation Hub](docs/README.md)**
  - 🎓 **[Tutorials](docs/tutorials/01-getting-started.md)** – Step-by-step onboarding walkthrough.
  - 🛠️ **[How-To Guides](docs/how-to/log-biomarkers.md)** – Actionable task-oriented guides.
  - 📖 **[Reference](docs/reference/crms-biomarker-codes.md)** – CrMS codes, domain engine API, and project structure.
  - 💡 **[Explanation](docs/explanation/architecture-overview.md)** – Clinical background and architecture overview.
- 🏛️ **[Architecture Decision Records (ADR)](docs/adr/0001-domain-driven-crms-engine.md)** – Architectural design records.
- 📋 **[Request for Comments (RFC)](docs/rfcs/0001-cloud-sync-and-pwa.md)** – Proposed feature specifications.

### External References

- [Creighton Model FertilityCare System Official Page](https://creightonmodel.com/)
- [React 19 Documentation](https://react.dev/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Vitest Framework](https://vitest.dev/)
- [The Good Docs Project Templates](https://thegooddocsproject.dev/template/)

---

## How to get help

If you encounter bugs, have feature requests, or need assistance:

- **Report Bugs & Feature Requests:** Open an issue on [GitHub Issues](https://github.com/gsuquet/fertility-tracker/issues).
- **Project Maintainer:** Contact [gsuquet on GitHub](https://github.com/gsuquet).

---

## Terms of use

**Fertility Tracker** is licensed under the [MIT License](LICENSE).

---

## Legal & Trademark Disclaimers

> [!IMPORTANT]
> **Trademark Notice:**  
> `FertilityCare™` and `Creighton Model FertilityCare™ System (CrMS)` are registered trademarks owned by the **Saint Paul VI Institute for the Study of Human Reproduction**.

> [!NOTE]
> **Non-Affiliation Notice:**  
> **Fertility Tracker** is an independent, open-source software application. It is not affiliated with, endorsed by, certified by, or sponsored by the Saint Paul VI Institute, FertilityCare™ Centers of America (FCCA), or FertilityCare™ Centers International (FCCI).

> [!WARNING]
> **Medical Disclaimer:**  
> This software is intended for personal tracking, record-keeping, and educational purposes only. It does not provide medical advice, diagnosis, or clinical treatment. Always consult a certified FertilityCare Practitioner or Medical Consultant for clinical guidance.

---

> Explore other templates from [The Good Docs Project](https://thegooddocsproject.dev/). Use their [feedback form](https://thegooddocsproject.dev/feedback/?template=Readme%20template) to give feedback on this template guide.
