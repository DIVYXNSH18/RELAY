# Relay

> **Role-Aware Context Layer for Distributed Development**  
> Real-time contextual synchronization between developer IDEs and companion devices.

## Overview

Relay intercepts IDE workspace diffs and save events, evaluates their significance, and synchronizes actionable contextual digests across teammates' IDEs and mobile companion apps in real time.

---

## Architecture & Monorepo Structure

- **`backend/`**: High-performance Go Context Engine (`:8080`) built with Chi HTTP router, Server-Sent Events (SSE), and in-memory event distribution.
- **`expo-app/`**: React Native / Expo companion mobile application with real-time diff feeds, speech recognition, and OCR capabilities.
- **`vscode-ext/`**: Visual Studio Code extension that captures file diffs and integrates with GitHub Copilot Chat (`@relay` participant).
- **`voice-prototype/`**: Web-based prototype demonstrating voice synthesis and interaction.
- **`system_design.md`**: Complete system architecture, API specifications, and design manifesto.

---

## Getting Started

### 1. Backend (Go)
```bash
cd backend
cp .env.example .env
go run main.go
```

### 2. Mobile App (Expo)
```bash
cd expo-app
cp .env.example .env
npm install
npx expo start
```

### 3. VS Code Extension
```bash
cd vscode-ext
npm install
npm run compile
```

---

## License

Private repository. All rights reserved.
