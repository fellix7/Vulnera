<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&height=220&color=0:09090B,50:17112B,100:082F49&text=VULNERA&fontSize=72&fontColor=FFFFFF&fontAlignY=42&desc=INTELLIGENT%20DEPENDENCY%20SECURITY&descSize=15&descAlignY=64&animation=fadeIn&stroke=8B5CF6&strokeWidth=1" width="100%" alt="Vulnera — Intelligent Dependency Security"/>

<br/>

### **Know what to fix. Understand why. Ship with confidence.**

An AI-powered dependency vulnerability intelligence platform that transforms noisy security scans into prioritized, explainable remediation.

<br/>

<a href="https://github.com/YOUR_USERNAME/YOUR_REPOSITORY">
  <img src="https://img.shields.io/badge/STATUS-BUILDATHON%202026-8B5CF6?style=for-the-badge&labelColor=09090B" alt="Buildathon 2026"/>
</a>
<img src="https://img.shields.io/badge/SECURITY-FIRST-06B6D4?style=for-the-badge&labelColor=09090B" alt="Security First"/>
<img src="https://img.shields.io/badge/AI-GROUNDED-22C55E?style=for-the-badge&labelColor=09090B" alt="Grounded AI"/>

<br/><br/>

**Tech Yuva × Google Developer Groups Gurugram · Build-a-thon 2026**

`PS-09` — Software Dependency Vulnerability Checker

<br/>

[ Overview ](#-the-vision) ·
[ Features ](#-what-makes-vulnera-different) ·
[ Architecture ](#-system-architecture) ·
[ Installation ](#-get-started) ·
[ Security ](#-security-by-design)

</div>

---

## ◈ The Vision

<div align="center">

> **A vulnerability report should tell you what matters, not just what exists.**

</div>

Modern applications depend on hundreds of third-party packages. A conventional audit may identify dozens of vulnerabilities, but developers still need to figure out which ones are exploitable, which affect production, and which require immediate action.

**Vulnera bridges that gap.**

It combines vulnerability intelligence, exploitation probability, known-exploitation evidence, dependency context, and source-code analysis to help developers make informed remediation decisions.

<table>
<tr>
<td width="50%" valign="top">

### ◉ Traditional Scanning

* Long lists of security findings
* Severity scores without enough context
* Unclear remediation order
* Manual investigation of vulnerable code
* Uncertainty about the safest upgrade

</td>
<td width="50%" valign="top">

### ◈ Vulnera Intelligence

* Risk-ranked, actionable findings
* EPSS and known-exploitation signals
* Production-aware prioritization
* Evidence-backed code usage analysis
* Verified safe-version recommendations

</td>
</tr>
</table>

**The goal:** Spend less time sorting vulnerabilities and more time fixing the ones that matter.

---

## ◈ What Makes Vulnera Different?

<table>
<tr>
<td width="50%" valign="top">

### 01 · Risk Intelligence

**Beyond CVSS severity.**

Combine vulnerability information with EPSS exploitation probability, CISA Known Exploited Vulnerabilities data, and production-versus-development context.

</td>
<td width="50%" valign="top">

### 02 · Code-Aware Analysis

**Understand your exposure.**

Gemini examines relevant source snippets to determine whether your code appears to use a vulnerable function, with citations pointing to the supporting source lines.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 03 · Actionable Remediation

**From finding to fix.**

Identify a minimum safe version, validate the recommendation against OSV, and provide an upgrade command developers can use.

</td>
<td width="50%" valign="top">

### 04 · Explainable Priorities

**Know why it matters.**

Every priority comes with explicit reasons. AI adds contextual evidence but does not independently determine whether a vulnerability exists.

</td>
</tr>
</table>

---

## ◈ The Risk Priority Engine

Not every vulnerability deserves the same response time.

Vulnera uses deterministic rules to organize findings into four remediation tiers.

| Priority               | Meaning                                                  | Recommended response           |
| :--------------------- | :------------------------------------------------------- | :----------------------------- |
| 🔴 **FIX NOW**         | Strong evidence of immediate risk                        | Address immediately            |
| 🟠 **FIX THIS SPRINT** | Significant risk requiring prompt remediation            | Schedule in the current sprint |
| 🟡 **PLAN**            | Meaningful risk suitable for planned remediation         | Add to the engineering backlog |
| 🔵 **MONITOR**         | Lower current urgency or limited supporting risk signals | Track and reassess             |

### What influences the ranking?

* **Known exploitation:** Is the vulnerability listed in the CISA KEV catalogue?
* **Exploitation probability:** What does the FIRST EPSS score indicate?
* **Deployment context:** Is the affected package a production or development dependency?
* **Source-code usage:** Does the application appear to call the vulnerable functionality?
* **Fix availability:** Is there a verified safe version to upgrade to?

> **Important:** These tiers are remediation guidance, not a guarantee that a vulnerability is exploitable or harmless. Missing code evidence does not prove that a vulnerability is unreachable.

---

## ◈ How Vulnera Works

<div align="center">

```text
┌────────────────────────────────────────┐
│           01 · INPUT                   │
│                                        │
│  package-lock.json + optional source   │
└───────────────────┬────────────────────┘
                    ▼
┌────────────────────────────────────────┐
│           02 · DISCOVERY               │
│                                        │
│  Match installed packages against OSV  │
└───────────────────┬────────────────────┘
                    ▼
┌────────────────────────────────────────┐
│           03 · ENRICHMENT               │
│                                        │
│  EPSS + CISA KEV + dependency context  │
└───────────────────┬────────────────────┘
                    ▼
┌────────────────────────────────────────┐
│           04 · PRIORITIZATION           │
│                                        │
│  Deterministic risk rules and reasons  │
└───────────────────┬────────────────────┘
                    ▼
┌────────────────────────────────────────┐
│           05 · AI INVESTIGATION         │
│                                        │
│  Gemini + relevant source-code evidence│
└───────────────────┬────────────────────┘
                    ▼
┌────────────────────────────────────────┐
│           06 · REMEDIATION              │
│                                        │
│  Safe-version checks + upgrade command │
└────────────────────────────────────────┘
```

</div>

### The complete workflow

**01 — Upload**

Provide your `package-lock.json`. Optionally include source code for code-aware analysis.

**02 — Identify**

Match installed dependencies against vulnerability information from OSV.dev.

**03 — Enrich**

Add exploitation probability from FIRST EPSS and known-exploitation evidence from CISA KEV.

**04 — Prioritize**

Apply explicit rules to rank findings and explain why each issue belongs in its assigned tier.

**05 — Investigate**

Use Gemini to analyze relevant code snippets, assess apparent vulnerable-function usage, and provide supporting citations. Validate citations automatically.

**06 — Remediate**

Identify a candidate minimum safe version, re-check the recommendation against OSV, and display the corresponding upgrade command.

---

## ◈ System Architecture

<div align="center">

```text
                  ┌─────────────────────┐
                  │   Developer / User  │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │   React + Vite UI   │
                  │  Security Dashboard │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Express + TypeScript│
                  │    Scan Pipeline   │
                  └──────────┬──────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
       ┌────────────┐ ┌────────────┐ ┌────────────┐
       │   OSV.dev  │ │ FIRST EPSS │ │  CISA KEV  │
       │Vulnerability│ │ Probability│ │ Known-Exploited
       │  Database  │ │   Scores   │ │ Catalogue  │
       └──────┬─────┘ └──────┬─────┘ └──────┬─────┘
              └──────────────┼──────────────┘
                             ▼
                  ┌─────────────────────┐
                  │ Deterministic Risk  │
                  │ Prioritization      │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Gemini Code Context│
                  │ + Citation Checks  │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Verified Findings  │
                  │ + Fix Recommendations
                  └─────────────────────┘
```

</div>

### Technology stack

<div align="center">

<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
<img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express"/>
<img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React"/>
<img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
<img src="https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Google Gemini"/>

<br/>

<img src="https://img.shields.io/badge/OSV.dev-2563EB?style=for-the-badge" alt="OSV.dev"/>
<img src="https://img.shields.io/badge/FIRST%20EPSS-0F766E?style=for-the-badge" alt="FIRST EPSS"/>
<img src="https://img.shields.io/badge/CISA%20KEV-B91C1C?style=for-the-badge" alt="CISA KEV"/>

</div>

| Component                  | Technology           | Responsibility                                           |
| :------------------------- | :------------------- | :------------------------------------------------------- |
| Frontend                   | React + Vite         | Security dashboard and scan results                      |
| API                        | Express + TypeScript | Scan orchestration and processing                        |
| Vulnerability intelligence | OSV.dev              | Package vulnerability matching                           |
| Exploitation intelligence  | FIRST EPSS           | Exploitation probability signals                         |
| Known exploitation         | CISA KEV             | Known-exploited vulnerability evidence                   |
| AI analysis                | Google Gemini        | Contextual source-code analysis and explanations         |
| Risk engine                | Deterministic rules  | Consistent priority assignment                           |
| Demo data                  | Local snapshots      | Support the demo without depending entirely on live data |

---

## ◈ Get Started

### Prerequisites

* Node.js and npm
* A Google Gemini API key for AI-assisted analysis
* A compatible `package-lock.json` for scanning

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
```

Replace `YOUR_USERNAME` and `YOUR_REPOSITORY` with your actual GitHub details.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Add your Gemini API key to the appropriate server-side environment variable:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Use the exact variable name expected by your server configuration. Never commit real API keys.

### 4. Start the application

```bash
npm run dev
```

By default:

| Service    | Local address           |
| :--------- | :---------------------- |
| API server | `http://localhost:8787` |
| Frontend   | `http://localhost:5173` |

### 5. Run your first scan

1. Open the dashboard.
2. Upload a `package-lock.json`.
3. Add source code if you want code-aware analysis.
4. Review the findings and their priority explanations.
5. Inspect the supporting evidence and suggested remediation.

**Tip:** Start with the included `samples/` project to explore the demo workflow.

---

## ◈ Security by Design

Security tools must handle potentially untrusted input carefully.

Vulnera follows these design principles:

| Principle                                  | Implementation                                                                     |
| :----------------------------------------- | :--------------------------------------------------------------------------------- |
| No project execution                       | Uploaded projects are read, not installed or executed                              |
| Minimal AI context                         | Only small code snippets around relevant usages are sent to Gemini                 |
| Server-side secrets                        | The Gemini API key stays on the server                                             |
| Deterministic vulnerability identification | Vulnerability matching relies on structured security data, not AI-generated claims |
| Evidence-backed analysis                   | AI explanations include source citations that are checked automatically            |
| Human oversight                            | Lowering a finding's priority requires human judgment                              |

### A note on accuracy

Vulnera supports security triage; it does not replace a full security review.

A missing source-code match does not establish that a vulnerability cannot be exploited. Likewise, a version recommended by a vulnerability database should be checked against your application's compatibility requirements before deployment.

---

## ◈ Project Structure

```text
Vulnera/
│
├── server/       # Express + TypeScript API and scan pipeline
├── client/       # React + Vite dashboard
├── samples/      # Deliberately outdated demo project
├── data/         # KEV data and offline API snapshots
├── docs/         # Planning and design documentation
│   └── PLAN.md
│
├── .env.example
├── package.json
└── README.md
```

---

## ◈ Project Documentation

Explore the implementation and design decisions:

* **[Project Plan](docs/PLAN.md)** — architecture, design decisions, and implementation plan.
* **[OSV.dev](https://osv.dev/)** — open-source vulnerability database.
* **[FIRST EPSS](https://www.first.org/epss/)** — Exploit Prediction Scoring System.
* **[CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)** — Known Exploited Vulnerabilities catalogue.
* **[Google Gemini](https://ai.google.dev/gemini-api/docs)** — documentation for the Gemini API.

---

## ◈ Built for the Build-a-thon

<div align="center">

**TECH YUVA × GOOGLE DEVELOPER GROUPS GURUGRAM**

### Build-a-thon 2026

**Problem Statement PS-09**
Software Dependency Vulnerability Checker

<br/>

*Making dependency security more explainable, actionable, and developer-friendly.*

<br/>

<img src="https://img.shields.io/badge/BUILT%20WITH-INTELLIGENCE-8B5CF6?style=for-the-badge&labelColor=09090B" alt="Built with intelligence"/>
<img src="https://img.shields.io/badge/FOCUSED%20ON-SECURITY-06B6D4?style=for-the-badge&labelColor=09090B" alt="Focused on security"/>

</div>

---

<div align="center">

### **VULNERA**

*Know the risk. Prioritize the fix.*

<br/>

<sub>Developed for Tech Yuva × GDG Gurugram Build-a-thon 2026.</sub>

</div>
