# SolCircle: Seeker-First Contact dApp

## Vision
Consol is a mobile contact app where each contact is also a Solana payment endpoint.
Instead of remembering wallet strings, users store people by name and send SOL/SPL from the contact detail page.

## First Principles
1. Human identity first:
Users think in names, not public keys.
2. Contacts as dApp endpoints:
A contact record is actionable, not just informational.
3. Local-first reliability:
Core contact data lives in local SQLite and works offline.
4. Wallet-native mobile UX:
Use Solana Mobile Wallet Adapter patterns for Seeker and compatible wallets.
5. Fast repeat payments:
One-tap templates reduce friction for frequent transfers.

## Problem Solved
Solana users frequently copy/paste long addresses and can send to wrong wallets.
SolContact reduces this risk by linking identity (name, notes, handle, phone) with validated wallet addresses and consistent send flows.

## What Is Implemented
### Core product
- Contact CRUD with SQLite.
- Profile and QR share/import flows.
- Standardized QR payload format with backward compatibility.

### dApp send flow
- `contact/[id]` now includes a real send flow.
- Wallet connect/disconnect integrated with `@wallet-ui/react-native-web3js`.
- SOL transfer support.
- SPL token transfer support with wallet token discovery.
- Optional memo support.
- Transaction confirmation and explorer deep links.

### Network + settings
- Persistent network switch (`devnet` / `mainnet-beta`).
- Dedicated RPC endpoint support via env vars.

### Hackathon differentiator
- Smart payment templates per contact.
- Prefill amount/asset/memo from template chips.
- Template usage tracking via `lastUsedAt`.

## User Journeys
1. Save contact:
Add name + wallet + optional `.skr`/phone/notes.
2. Scan/import:
Scan QR, parse payload, prefill contact add form.
3. Open contact:
See profile + quick actions.
4. Send payment:
Tap `Pay` -> connect wallet -> choose SOL/SPL -> enter amount -> approve in wallet.
5. Reuse templates:
Pick saved template chip and send with minimal input.

## Architecture
### Wallet + provider
- Root uses `MobileWalletProvider` in `app/_layout.tsx`.
- Hooked via `useMobileWallet` in `app/contact/[id].tsx`.
- Seeker-first behavior with wallet adapter compatibility.

### Network management
- App network context: `contexts/AppNetworkContext.tsx`.
- Persistence: `repositories/AppSettingsRepository.ts`.
- RPC/explorer helpers: `services/network.ts`.

### Transfer logic
- `services/solanaTransfers.ts`
- Includes:
  - wallet token discovery
  - amount conversion helpers
  - SOL transfer transaction builder/sender
  - SPL transfer transaction builder/sender
  - optional memo instruction

### QR consistency
- `services/contactQr.ts` handles build/parse.
- New canonical fields: `walletAddress`, `skrAddress`, `phoneNumber`.
- Old payloads still accepted (`wallet`, `phone`, `skr`).

## Data Model (SQLite)
### Existing tables
- `contacts`
- `user_profile`

### Added tables
- `app_settings`
  - `key`, `value`, `updatedAt`
- `payment_templates`
  - `id`, `contactId`, `label`, `mintAddress`, `amountRaw`, `memo`, `createdAt`, `updatedAt`, `lastUsedAt`

## Key Types
Defined in `types/index.ts`:
- `NetworkType`
- `TokenBalance`
- `SendDraft`
- `PaymentTemplate`

## Send Flow (Technical)
1. Validate recipient wallet address.
2. Connect wallet if disconnected.
3. Load token balances (SOL + SPL token accounts).
4. User selects asset + amount + memo.
5. Build transaction:
   - SOL: `SystemProgram.transfer`
   - SPL: ATA checks + `createTransferInstruction`
6. Sign/send through wallet adapter.
7. Confirm transaction via RPC.
8. Show signature and explorer link.

## Validation + Failure Handling
- Invalid recipient address -> blocked early.
- Empty/zero amount -> blocked.
- Insufficient token/SOL balance -> blocked.
- Missing source token account -> blocked.
- Wallet rejection/errors -> surfaced in alert.
- Network/RPC issues -> surfaced with retry path.

## Environment Configuration
Set in `.env` (or Expo env source):

```env
EXPO_PUBLIC_SOLANA_RPC_DEVNET=https://your-devnet-rpc
EXPO_PUBLIC_SOLANA_RPC_MAINNET=https://your-mainnet-rpc
```

Fallback is Solana public cluster RPC when env is not set.

## Demo Script (60-90 seconds)
1. Open app, show contact list.
2. Open one contact with wallet address.
3. Tap `Pay`, connect wallet (Seeker flow).
4. Select asset, enter amount, send.
5. Show confirmed signature + explorer link.
6. Save same payment as template.
7. Re-open send flow and execute one-tap template payment.

## Milestones
### M1 Foundation (done)
- Wallet provider wiring
- Network context and settings persistence
- DB schema updates

### M2 Payments (done)
- `contact/[id]` send modal
- SOL/SPL transfer logic
- token discovery and confirmation UX

### M3 UX + polish (partially done)
- template chips and save flow
- QR schema hardening
- additional polish pending (share flow, richer errors, token metadata)

## Test Scenarios
1. Wallet connect from disconnected state.
2. Wallet reconnect with cached authorization.
3. SOL transfer success.
4. SPL transfer success.
5. SPL transfer blocked on zero balance.
6. Invalid recipient blocked.
7. Insufficient balance blocked.
8. Devnet/mainnet switch reflected in send + explorer links.
9. Contact without wallet cannot send.
10. Template save + prefill + usage update.
11. Old and new QR payload formats both import.
12. Offline behavior preserves contacts/templates; transfer fails gracefully.

## Current Gaps / Next Improvements
1. Add native share action in QR generate screen.
2. Token metadata lookup (symbol/logo) for better SPL labels.
3. Add transaction history per contact.
4. Add payment request links and trust labels.
5. Add biometric lock enforcement (currently UI toggle only).

## File Map (Main Changes)
- `app/_layout.tsx`
- `app/contact/[id].tsx`
- `app/settings/index.tsx`
- `app/qr/scan.tsx`
- `app/qr/generate.tsx`
- `components/SendSheet.tsx`
- `components/TokenSelector.tsx`
- `components/TemplateChips.tsx`
- `contexts/AppNetworkContext.tsx`
- `repositories/AppSettingsRepository.ts`
- `repositories/PaymentTemplateRepository.ts`
- `services/Database.ts`
- `services/solanaTransfers.ts`
- `services/contactQr.ts`
- `services/network.ts`
- `types/index.ts`

## Reference Links
1. Solana Mobile React Native + wallet UI adapter:
https://docs.solanamobile.com/react-native/wallet_ui_mobile_wallet_adapter
2. Solana Mobile first dApp tutorial:
https://docs.solanamobile.com/react-native/first_mobile_dapp
3. Solana Mobile wallet adapter repo:
https://github.com/solana-mobile/mobile-wallet-adapter
4. Wallet UI React Native getting started:
https://www.wallet-ui.dev/docs/react-native/getting-started
5. Wallet UI `useMobileWallet`:
https://www.wallet-ui.dev/docs/react-native/hooks/use-mobile-wallet
6. Wallet UI `useAuthorization`:
https://www.wallet-ui.dev/docs/react-native/hooks/use-authorization
