# 1. Automated Backup & Multi-Device Synchronization with Zero-Knowledge Privacy

Date: 2026-08-14

## Status

Proposed

## Context

Fertility Tracker is an offline-first, client-side web application handling highly sensitive personal reproductive health data (biomarkers, cycle timing, intercourse, and clinical indicators). The application currently persists data solely to browser `localStorage` with manual JSON export and import capabilities.

Users require:
1. **Automated, transparent backups** to prevent data loss upon browser cache clearing or device loss.
2. **Multi-device synchronization** (e.g. logging on mobile, reviewing analytics on desktop/tablet, or partner sharing).
3. **The highest standard of privacy**: Zero plaintext data or medical metadata must ever be accessible to hosting providers, servers, or intermediaries.
4. **Local-first resilience**: The application must remain fully functional offline, syncing opportunistically when online.

---

## Architectural Options Evaluated

### Option A: Zero-Knowledge E2EE Serverless Sync (Cloudflare Workers + D1/KV)
The client application encrypts payloads using WebCrypto (AES-256-GCM) before transmitting to a serverless endpoint running on Cloudflare Pages / Workers with D1 (SQLite) or KV/R2.

* **Pros:**
  * Zero user configuration required (no external cloud accounts needed).
  * 100% zero-knowledge: Server stores only cryptographically blinded room hashes and encrypted ciphertext blobs.
  * Real-time sync capability (via WebSockets / SSE or lightweight delta polling).
  * Free-tier compatible on Cloudflare Pages ($0 operational overhead).
* **Cons:**
  * Requires maintaining a minimal backend relay script and database schema.

### Option B: Bring-Your-Own-Storage (BYOS / WebDAV / Nextcloud / Google Drive AppData / iCloud)
The client connects directly to user-managed storage providers (e.g. WebDAV, Nextcloud, Google Drive `drive.appdata` hidden sandbox, or local folder via File System Access API).

* **Pros:**
  * Zero server maintenance for the application author.
  * Absolute user custody of raw encrypted files.
* **Cons:**
  * High friction: Requires configuring OAuth credentials, WebDAV URLs, or API tokens.
  * Limited background sync on iOS/Safari PWAs due to mobile background execution limits.
  * Risk of merge conflicts with full-file overwrites.

### Option C: Decentralized Peer-to-Peer Sync (WebRTC + CRDTs / Automerge / Yjs)
Devices connect directly over WebRTC DataChannels using an ephemeral signaling server to exchange CRDT update logs.

* **Pros:**
  * Zero data stored on any server or intermediary storage provider.
  * Mathematical conflict-free convergence.
* **Cons:**
  * Requires both devices to be online concurrently; provides zero disaster recovery if the only active device is lost.
  * Substantial bundle size and memory overhead (~50KB–200KB WASM/JS for Automerge/Yjs).
  * Complex NAT traversal requiring STUN/TURN relays.

### Option D: Hybrid Adapter Architecture (Selected Direction)
A unified `SyncAdapter` interface in `src/domain/sync/` featuring a default **Zero-Knowledge E2EE Serverless Sync** relay with optional pluggable **WebDAV / BYOS** and **Encrypted File Export**.

---

## Key Management & Pairing Strategy

| Mechanism | Security / Cryptography | Pairing / Setup UX | Recovery Post-Device Loss | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **1. 12-Word Recovery Phrase (BIP39)** | PBKDF2 / Argon2id from 128-bit entropy; generates master symmetric key (AES-GCM). | User writes down 12 words once; enters words on 2nd device. | **Excellent:** Can recover from scratch anytime. | **Recommended Default** |
| **2. Ephemeral QR Code Pairing (ECIES / DH)** | Device 1 generates ephemeral ECDH public key via QR; Device 2 scans and completes Diffie-Hellman handshake over local channel to transfer master key. | 5-second camera scan; zero typing required. | Requires at least one existing active device. | **Recommended for Fast Pairing** |
| **3. User Passphrase + Salt** | Master key derived from user password via PBKDF2 (600,000+ iterations) or Argon2id. | Familiar password entry on all devices. | Depends on user password strength; susceptible to weak passwords. | **Good Secondary Option** |
| **4. Anonymous Sync Link / Room Key** | `https://fertility.app/#sync=<RoomID>&key=<Base64Key>` (Key stored in URL hash fragment, never sent to server). | Copy/paste link or QR code. Instant 1-click sync. | If URL/QR is lost, data in room cannot be decrypted. | **Ideal for Partner Sharing** |
| **5. WebAuthn / Passkeys (PRF Extension)** | Hardware-backed authenticator derives symmetric key using PRF (Pseudo-Random Function) extension. | FaceID / TouchID biometric prompt. | Browser support for PRF extension is still evolving (Chrome/Safari partial). | **Future-Proof Candidate (Phase 3)** |

---

## Synchronization Granularity & Conflict Resolution

| Strategy | Mechanism | Storage Overhead | Conflict Resolution | Implementation Complexity |
| :--- | :--- | :--- | :--- | :--- |
| **A. Snapshot Replacement** | Encrypts full `Observation[]` array as single JSON blob with `version` and `lastModified` timestamp. | Low (entire dataset < 200KB for years of data). | Last-Write-Wins (LWW) at file level. Concurrent edits on two offline devices can overwrite each other. | Very Low |
| **B. Observation-Level Delta Sync (Selected)** | Each observation has `{ id, date, updatedAt, deletedAt }`. Client sends only changes/tombstones since `lastSyncTimestamp`. | Extremely low bandwidth (< 1KB per sync). | Observation-level LWW based on `updatedAt`. Different days/cycles never conflict. Same-day edits resolve to latest timestamp. | Moderate / Optimal |
| **C. CRDT Field-Level Log (Automerge / Yjs)** | Every field mutation is an immutable operation in an encrypted causal DAG. | High log growth over time; requires compaction. | Deterministic convergent merging without data loss. | High |

---

## Comprehensive Decision Matrix

| Evaluation Vector | Option A: E2EE Serverless (Cloudflare) | Option B: BYOS / WebDAV / Nextcloud | Option C: Pure P2P (WebRTC) | Option D: Hybrid Adapter (Selected) |
| :--- | :---: | :---: | :---: | :---: |
| **Privacy / Zero Knowledge** | ★★★★★ (Client AES-256-GCM) | ★★★★★ (Client Encrypted) | ★★★★★ (Direct P2P) | ★★★★★ (Client E2EE) |
| **Onboarding Simplicity** | ★★★★★ (1-click / 12 words / QR) | ★★☆☆☆ (App passwords / URLs) | ★★★☆☆ (Simultaneous online pairing) | ★★★★★ (Default simple, BYOS optional) |
| **Automated Background Sync** | ★★★★★ (Web Background / On-change) | ★★☆☆☆ (API throttles / Mobile limits) | ★☆☆☆☆ (Requires concurrent online devices) | ★★★★★ (Adaptive) |
| **Disaster Recovery (Device Loss)** | ★★★★★ (Encrypted Cloud Backup) | ★★★★★ (Cloud Storage) | ★☆☆☆☆ (Zero recovery if single device) | ★★★★★ (Full Redundancy) |
| **Operational & Hosting Cost** | ★★★★★ ($0 free tier on Cloudflare) | ★★★★★ ($0 to app author) | ★★★★☆ (Signaling/STUN costs) | ★★★★★ ($0 free tier) |
| **Bundle Size & Overhead** | ★★★★★ (< 5KB WebCrypto native) | ★★★★☆ (~15KB WebDAV/OAuth) | ★★☆☆☆ (~120KB Automerge/Yjs) | ★★★★★ (Modular / Lazy loaded) |
| **Multi-Device Partner Sharing** | ★★★★★ (Shared Room Key / QR) | ★★☆☆☆ (Shared Cloud Folder) | ★★★☆☆ (Manual Peer Pairing) | ★★★★★ (Seamless Room Key) |

---

## Decision

We will implement the **Hybrid Zero-Knowledge Sync Architecture (Option D)** with an **Observation-Level Delta Engine (Strategy B)**:

1. **Client-Side Cryptography (`src/utils/cryptoUtils.ts`):**
   - Pure WebCrypto implementation (`AES-256-GCM` authenticated encryption).
   - Key derivation using `PBKDF2-SHA256` (600,000 iterations) and standard BIP39 12-word mnemonic phrases.
   - Zero external cryptographic dependencies to maintain minimal bundle size.

2. **Observation Delta Model:**
   - Extend `Observation` type with `updatedAt: number` and `deletedAt?: number` (tombstones).
   - Implement deterministic observation-level Last-Write-Wins (LWW) merger.

3. **Cloudflare Relay (`/api/sync`):**
   - Cloudflare Pages Functions with D1 / KV to store blind encrypted blobs indexed by `HMAC-SHA256(MasterKey, 'sync-room')`.

4. **Pairing & UX:**
   - 12-word recovery phrase for cold recovery.
   - Encrypted ephemeral QR code transfer for immediate device pairing.

---

## Phased Implementation Plan

```mermaid
graph TD
    subgraph Phase 1: Cryptographic Foundation & Encrypted Backups
        P1A[WebCrypto Service: AES-256-GCM + PBKDF2] --> P1B[Encrypted JSON Backup Export / Import with Password]
        P1C[12-Word Recovery Phrase Generator] --> P1B
    end

    subgraph Phase 2: Observation-Level Delta Engine
        P2A[Observation Schema: updatedAt, deletedAt, syncStatus] --> P2B[Local Sync Queue in IndexedDB/LocalStorage]
        P2B --> P2C[Deterministic LWW Merger]
    end

    subgraph Phase 3: Zero-Knowledge Serverless Sync Relay
        P3A[Cloudflare Worker Endpoint: /api/sync/delta] --> P3B[D1 / KV Encrypted Blob Table]
        P3C[Fast QR Code Pairing between Devices] --> P3A
    end

    subgraph Phase 4: Extended BYOS Adapters
        P4A[WebDAV / Nextcloud Adapter]
        P4B[Google Drive AppData Sandbox Adapter]
    end

    Phase 1 --> Phase 2 --> Phase 3 --> Phase 4
```

---

## Consequences

### Positive
- **Guaranteed Privacy:** Medical data is encrypted prior to transit; third-party hosts and network eavesdroppers have zero access to plaintext records.
- **Seamless User Experience:** Non-technical users enjoy automated multi-device sync without provisioning cloud credentials or configuring complex servers.
- **Offline Reliability:** All reads and writes remain instant and local; syncing occurs asynchronously and opportunistically.
- **Cost Effective:** Fits completely within existing zero-cost Cloudflare Pages tier.

### Negative / Trade-offs
- Requires introducing a backend relay endpoint (`/api/sync`) for cloud distribution (though architecturally zero-knowledge).
- Requires careful handling of observation tombstones (`deletedAt`) to ensure deletions propagate correctly across offline devices.
