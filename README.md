# RetailCortex

RetailCortex is a modern, high-performance retail management platform built with a robust monorepo architecture. It leverages a full-stack TypeScript and Python ecosystem, designed for scalability and ease of deployment.

## Live Demo

The hosted web application is available at [https://retailcortex.yellowlabs.space/](https://retailcortex.yellowlabs.space/).

## 🏗️ Architecture

The project is organized as a monorepo using [Turborepo](https://turbo.build/), managing four primary components:

-   **`frontend/`**: A modern web interface built with [Next.js](https://nextjs.org/).
-   **`app/`**: A cross-platform mobile application built with [Expo](https://expo.dev/) (React Native).
-   **`backend/`**: A high-performance API built with [FastAPI](https://fastapi.tiangolo.com/).
-   **`infra/`**: Infrastructure as Code (IaC) using [Terraform](https://www.terraform.io/) for automated provisioning on Google Cloud Platform.

## 🛠️ Tech Stack

### Frontend & Mobile
- **Web Framework**: Next.js (App Router)
- **Mobile Framework**: Expo (React Native)
- **Styling**: Tailwind CSS (Web), Nativewind/React Native StyleSheet
- **Language**: TypeScript
- **Package Manager**: pnpm

### Backend
- **Framework**: FastAPI
- **Server**: Uvicorn
- **Language**: Python 3.9+
- **Package Manager**: [uv](https://github.com/astral-sh/uv)

### Infrastructure & DevOps
- **Cloud**: Google Cloud Platform (GCP)
- **IaC**: Terraform
- **Monorepo Tooling**: Turborepo

## 🚀 Getting Started

### Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/installation)
- [Python](https://www.python.org/) (v3.9+)
- [uv](https://github.com/astral-sh/uv)
- [Terraform](https://developer.hashicorp.com/terraform/downloads)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yellowwlabs/RetailCortex.git
   cd RetailCortex
   ```

2. **Install dependencies**:
   ```bash
   # Install all frontend, mobile, and root dependencies
   pnpm install

   # Install backend dependencies
   cd backend
   uv sync
   cd ..
   ```

### Running Locally

You can run the frontend, mobile app (web), and backend simultaneously using Turbo:

```bash
pnpm dev
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Mobile (Web)**: [http://localhost:8081](http://localhost:8081)
- **Backend**: [http://localhost:8000](http://localhost:8000) (Check `/health` for status)

## ☁️ Infrastructure

The `infra/` directory contains Terraform configurations to deploy the application to GCP.

1. **Setup Credentials**:
   Place your Google Cloud service account key at `keys/googleServiceAccount.json`.

2. **Deploy**:
   ```bash
   cd infra
   terraform init
   terraform plan
   terraform apply
   ```

## 📂 Project Structure

```text
RetailCortex/
├── app/              # Expo mobile application
├── backend/          # FastAPI application
├── frontend/         # Next.js web application
├── infra/            # Terraform configurations
├── keys/             # (Ignored) GCP service account keys
├── package.json      # Monorepo configuration
└── turbo.json        # Turborepo pipeline configuration
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
