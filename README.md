<!-- Project logo and badges -->
<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-7.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-8.1-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Vitest-4.1-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License: MIT" />
</p>

# Fertility Care

**Repository:** [github.com/gsuquet/fertility-care](https://github.com/gsuquet/fertility-care)  
**Maintained by:** [gsuquet](https://github.com/gsuquet)

---

## Table of contents

1. [Project description](#project-description)
2. [Who this project is for](#who-this-project-is-for)
3. [Project dependencies](#project-dependencies)
4. [Instructions for using Fertility Care](#instructions-for-using-fertility-care)
    - [Install Fertility Care](#install-fertility-care)
    - [Configure Fertility Care](#configure-fertility-care)
    - [Run Fertility Care](#run-fertility-care)
    - [Troubleshoot Fertility Care](#troubleshoot-fertility-care)
5. [Contributing guidelines](#contributing-guidelines)
6. [Additional documentation](#additional-documentation)
7. [How to get help](#how-to-get-help)
8. [Terms of use](#terms-of-use)

---

## Project description

With **Fertility Care**, you can track, chart, and analyze your natural fertility cycles using standardized Creighton Model FertilityCare System (CrMS) biomarker observations.

**Fertility Care** helps you log daily observations—such as cervical mucus characteristics, sensation, bleeding codes, and observation frequency—while automatically calculating stamp colors, identifying peak day indicators, and determining post-peak phase transitions.

Unlike generic period trackers that rely on opaque calendar-math algorithms, **Fertility Care** follows clinically grounded CrMS charting rules to provide true physiological insight, interactive paper-style cycle rows, calendar grid views, and exportable cycle charts.

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

- **Individuals and Couples** who use natural family planning (NFP) and FertilityCare / Creighton Model methods to track their reproductive health, achieve pregnancy, or avoid pregnancy naturally.
- **Open Source Developers** interested in health technology, bio-parsing algorithms, and modern React web applications.

---

## Project dependencies

Before using **Fertility Care**, ensure your development environment includes:

- **Node.js:** v18.0.0 or higher (v20+ recommended)
- **Package Manager:** `npm` v9.0.0 or higher (or `pnpm` / `yarn`)
- **Modern Web Browser:** Google Chrome, Mozilla Firefox, Safari, or Microsoft Edge with ES2022+ support

---

## Instructions for using Fertility Care

Get started with **Fertility Care** by cloning the repository and launching the development server.

### Install Fertility Care

1. Clone the repository to your local machine:

   ```bash
   git clone https://github.com/gsuquet/fertility-care.git
   ```

2. Navigate into the project directory:

   ```bash
   cd fertility-care
   ```

3. Install project dependencies:

   ```bash
   npm install
   ```

### Configure Fertility Care

1. **Environment Setup (Optional):**
   Create a `.env.local` file in the root directory if you wish to override default environment variables (e.g., base path or port configuration).

2. **Tailwind / Style Verification:**
   Styles and themes are configured via CSS variables and Vite. Ensure all assets compile cleanly by running a dry build:

   ```bash
   npm run build
   ```

### Run Fertility Care

1. **Start Development Server:**
   Launch the local live-reload development server:

   ```bash
   npm run dev
   ```

   Open `http://localhost:5173` in your browser to interact with the web app.

2. **Run Automated Test Suite:**
   Execute unit and integration tests using Vitest:

   ```bash
   npm run test
   ```

3. **Build for Production:**
   Type-check TypeScript code and bundle production-ready static assets:

   ```bash
   npm run build
   ```

4. **Preview Production Build:**
   Preview the generated static build locally:

   ```bash
   npm run preview
   ```

### Troubleshoot Fertility Care

| Issue | Solution |
| :--- | :--- |
| `npm install` fails or throws peer dependency conflicts | Ensure you are using Node.js $\ge 18$. Run `npm install --legacy-peer-deps` if node version mismatches persist. |
| Port `5173` is already in use when running `npm run dev` | Vite will automatically try the next available port (e.g., `5174`). Alternatively, specify a port explicitly: `npx vite --port 3000`. |
| TypeScript check fails during `npm run build` | Clear local Vite cache and re-run build: `rm -rf node_modules/.vite dist && npm run build`. |
| Tests fail in headless environment | Ensure `jsdom` is installed correctly and run `npm run test -- --update`. |

**Other troubleshooting supports:**

- [GitHub Issue Tracker](https://github.com/gsuquet/fertility-care/issues)
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

For more information regarding Creighton Model principles and underlying web technologies:

- [Creighton Model FertilityCare System Official Page](https://creightonmodel.com/)
- [React 19 Documentation](https://react.dev/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Vitest Framework](https://vitest.dev/)
- [The Good Docs Project Templates](https://thegooddocsproject.dev/template/)

---

## How to get help

If you encounter bugs, have feature requests, or need assistance:

- **Report Bugs & Feature Requests:** Open an issue on [GitHub Issues](https://github.com/gsuquet/fertility-care/issues).
- **Project Maintainer:** Contact [gsuquet on GitHub](https://github.com/gsuquet).

---

## Terms of use

**Fertility Care** is licensed under the [MIT License](LICENSE).

---

> Explore other templates from [The Good Docs Project](https://thegooddocsproject.dev/). Use their [feedback form](https://thegooddocsproject.dev/feedback/?template=Readme%20template) to give feedback on this template guide.
