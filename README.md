# Only Two — private communication prototype

A small two-member invite-code room with:
- Persistent invite code saved in the browser's `localStorage`
- Maximum two simultaneous members per room
- Live text chat relayed through a Node.js/Socket.IO server
- WebRTC voice/video calling, microphone mute, camera toggle, hang-up
- No database and no chat-history persistence

## Important: prototype, not a security-audited messenger

**Do not send sensitive or confidential information through this version.**

- Chat text is sent to the signaling server in plaintext and relayed to the other member. The server operator could read it. This is **not end-to-end encrypted chat**.
- WebRTC media uses browser-managed encrypted transport (DTLS-SRTP). This project has not been independently audited and does not add an identity-verification layer or independently verify end-to-end encryption.
- Invite codes are bearer secrets, not verified identities. Anyone who obtains a code may try to join when a slot is available. Share it privately and regenerate/use a new code if it leaks.
- Room membership exists in server memory only. The invite code persists locally, but there is no permanent account, identity binding, or guaranteed lifetime connection.
- Calls only work while both people have the site open and connected. Browser backgrounding, device sleep, network loss, server downtime, or permissions can interrupt them.
- Only a public STUN server is configured. Some networks need a TURN relay server, which may cost money and may relay encrypted media traffic.
- The app has basic room capacity checks and message length/rate limits, but no formal abuse protection, rate limiting at the edge, account recovery, audit, or penetration testing.

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
npm start
```

Open `http://localhost:3000` in two separate browsers/devices on the same computer/network for a basic test. For camera/microphone, localhost is considered a secure context. To test between devices over the internet, deploy the server over HTTPS/WSS; browsers require a secure context for camera and microphone access.

## Deploy to a Node host

GitHub Pages alone cannot run this Node.js signaling server. Use GitHub to store the source and a Node-capable host to run it (for example, a web service host with a free tier, if available). Service pricing/limits can change.

Generic steps:
1. Create a GitHub repository and upload `server.js`, `package.json`, `README.md`, and `public/index.html`.
2. On a Node.js hosting provider, create a Web Service from that repository.
3. Build command: `npm install`
4. Start command: `npm start`
5. Set Node runtime to 18+.
6. Wait for the provider's HTTPS URL and open it on both devices.
7. Keep the app on HTTPS so microphone/camera access works. Test on two different networks if possible.
8. If calls fail on some networks, configure a TURN service and add its credentials to `iceServers` in `public/index.html`. Do not publish permanent TURN credentials in a public repository; use server-side configuration or short-lived credentials.

## Use the invite code

1. Person A opens the deployed app and clicks **Generate**.
2. Person A shares the code privately with Person B.
3. Person B enters the exact code and taps **Join room**.
4. Once both are in the room, text chat is available. Either person can start a voice/video call.
5. The code is remembered in that browser for convenience. It is not a permanent secure identity and can be used by someone else if shared.

## Security architecture and next steps for real E2EE

This prototype deliberately does **not** claim verified E2EE for chat. A production design should use a well-reviewed end-to-end messaging protocol/library, authenticated key exchange, identity verification/safety numbers, encrypted message storage, key rotation, recovery design, server-side rate limiting, abuse controls, dependency updates, and an independent security review. Do not invent your own cryptographic protocol. The signaling service should only relay opaque signaling data; authentication must prevent room-code guessing and unauthorized member replacement. A proper production implementation needs careful threat modeling and testing.

## Repository layout

- `public/index.html` — client UI, chat client, WebRTC call controls
- `server.js` — room membership, transient chat relay, signaling relay
- `package.json` — Node dependencies and scripts
- `.gitignore` — ignores local dependency and environment files
