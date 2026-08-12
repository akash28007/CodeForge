# Deploying CodeForge

Everything here is on a free tier. Budget about 90 minutes end to end, most of it waiting
on account verification.

---

## Why this shape

| Piece | Where | Why not somewhere easier |
|---|---|---|
| Client (Vite SPA) | **Vercel** | — |
| Postgres | **Neon** | — |
| Redis (BullMQ) | **Upstash** | — |
| API **+ judge worker** | **A real VM** — Oracle Always Free, or AWS EC2 | The judge shells out to the real `docker` CLI. Render, Railway and Fly give a container, not a Docker *daemon*, so it cannot run there without gutting the sandbox. |
| HTTPS | **Caddy + sslip.io** | A browser refuses to let an HTTPS page call a plain-HTTP API. Without a certificate the deployed site silently fails every request. |

A hosted execution API was evaluated instead of the VM and rejected: Piston's public
instance is whitelist-gated (verified — it returns 401), and using one would have replaced
the sandbox that is the most interesting part of this project.

The judge worker runs **in the same process** as the API. There is no separate worker to
deploy.

---

## 1. Neon (Postgres)

1. Create a project at [neon.tech](https://neon.tech). Pick the region closest to your VM.
2. Copy the connection string.

**Use the direct connection string, not the pooled one.** Neon offers a PgBouncer endpoint
for serverless callers. This app is a single long-lived process and Prisma runs its own
pool, so pooling buys nothing — and `prisma migrate deploy` cannot run through PgBouncer.
It fails with a prepared-statement error that reads like a syntax error, which is a
miserable thing to debug.

The string must end with `?sslmode=require`.

## 2. Upstash (Redis)

1. Create a database at [upstash.com](https://upstash.com), same region again.
2. Copy the **`rediss://`** URL (two s's — TLS).

`REDIS_URL` takes priority over `REDIS_HOST`/`REDIS_PORT`; see
`src/queue/redis-connection.util.ts`.

## 3. The VM

Pick **one** provider. Everything after this section is identical for both.

### What the judge actually needs

These numbers decide the instance size, so they are worth stating plainly. From
`docker-executor.service.ts`:

| | |
|---|---|
| Compile container | **512 MB** |
| Each run container | **256 MB** |
| Concurrent containers | `EXEC_QUEUE_CONCURRENCY`, default **4** |
| Executor image on disk | **~2 GB** |

At the default concurrency the judge can ask for 2 GB of RAM on its own, before Node and
the OS. That is fine on Oracle's free shape and **not** fine on AWS's, which is the single
thing to get right below.

---

### Option A — AWS EC2

Use this if Oracle will not let you in. It works, with two adjustments.

> **Free tier is time-limited here.** Unlike Oracle's Always Free, AWS's EC2 free
> allowance runs for a fixed window from account creation (historically 12 months of
> `t3.micro`; newer accounts get a credit-based plan instead). After it lapses this
> instance bills at roughly $8–10/month. Check **Billing → Free tier** in the console for
> what your account actually has, and set a **zero-spend budget alert** while you are
> there. Oracle's tier does not expire; AWS's does.

1. **Launch instance** — EC2 → Launch instance.
   - **AMI:** **Ubuntu Server 24.04 LTS**. Plain 22.04 is no longer in the Quick Start
     list (as of Aug 2026 the only 22.04 entry is bundled with SQL Server 2022 Standard
     — a licensed, non-free-tier image; do not pick it).
     Prefer the newest LTS that is at least a year old over the very newest. Node
     (NodeSource), Docker (`get.docker.com`) and Caddy (Cloudsmith) all serve apt repos
     keyed to the release *codename*, and a brand-new release frequently has no
     published repo yet — which surfaces as a 404 from the setup script, or an install
     that quietly does nothing.
   - **Type:** `t3.micro` (x86) or `t4g.small` (ARM) if either is free-tier eligible for
     your account. `t4g.small` has 2 GB and is the better box if you have it.
   - **Key pair:** create one, choose **`.pem`** format, and download it. Then lock its
     permissions down — `ssh` refuses a key others can read.

     Linux/macOS: `chmod 400 <key>.pem`

     **Windows** has no `chmod`, and the inherited permissions on a file in `Downloads`
     are exactly what `ssh` rejects (`UNPROTECTED PRIVATE KEY FILE`). Use `icacls` in
     PowerShell — disable inheritance, then grant only yourself:

     ```powershell
     icacls .\codeforge-key.pem /inheritance:r
     icacls .\codeforge-key.pem /grant:r "$($env:USERNAME):(R)"
     ```
   - **Storage:** change the root volume from the 8 GB default to **30 GB** — the free
     tier includes 30 GB, and the executor image alone is ~2 GB. An 8 GB disk gets
     uncomfortable once Ubuntu, Node, `node_modules` and Docker layers are on it.

2. **Security group** — allow inbound **22** (your IP), **80** and **443** (`0.0.0.0/0`).
   AWS has only this one firewall; Ubuntu AMIs here do not ship blocking `iptables`, so
   unlike Oracle there is no second layer to open.

3. **Elastic IP — do not skip this.** A default EC2 public IP is released when the
   instance stops and you get a different one on start. Your HTTPS hostname is derived
   from the IP, so losing it breaks the certificate *and* the frontend's `VITE_API_URL`.
   EC2 → Elastic IPs → Allocate → Associate with the instance. It is free while attached
   to a running instance.

4. **Connect:** `ssh -i <key>.pem ubuntu@<elastic-ip>`

   Windows 10/11 ship OpenSSH at `C:\Windows\System32\OpenSSH\ssh.exe`, so this works
   from PowerShell as-is — no PuTTY, no key conversion. Everything from step 4 onward
   runs *on the VM*, which is Ubuntu, so the Unix commands below are correct there.

5. **Two required adjustments for a 1 GB box.** Skip these and the judge will be
   OOM-killed under load, which surfaces as submissions failing for no visible reason.

   Add swap, so a memory spike degrades instead of killing the process:

   ```bash
   sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
   sudo mkswap /swapfile && sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   free -h
   ```

   And drop the concurrency in `.env` (step 4) — on 1 GB use `1`, on 2 GB use `2`:

   ```ini
   EXEC_QUEUE_CONCURRENCY=1
   ```

   This does not make the judge less correct; submissions queue instead of running in
   parallel. The cap exists precisely so load degrades predictably rather than taking the
   box down.

---

### Option B — Oracle Cloud

Create an **Always Free** instance — `VM.Standard.A1.Flex` (Ampere ARM) at 2 OCPU / 12 GB
is the most generous shape and works fine; everything in the stack has arm64 builds.
Ubuntu 22.04 or later. Save the SSH key. Keep `EXEC_QUEUE_CONCURRENCY=4`.

> **On the card requirement.** Oracle asks for a card at signup for identity verification.
> Always Free is a permanent tier rather than a trial — staying within the Always Free
> shapes means no charge.

**Oracle has two firewalls and you must open both.** This is the single most common way
this deployment appears broken while being fine:

1. **Cloud level** — VCN → Security List → add ingress rules for TCP **80** and **443**
   from `0.0.0.0/0`.
2. **Instance level** — Ubuntu images ship with restrictive iptables:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

If port 443 times out from outside but `curl localhost` works on the box, it is one of
these two.

## 4. Provision the VM

```bash
# Docker — the judge needs the daemon, not just the CLI
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker

# Node 20, plus a toolchain: `bcrypt` is a native module and compiles on install,
# which is a confusing failure on a fresh box if the compiler is missing.
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git build-essential python3

git clone https://github.com/akash28007/CodeForge.git codeforge && cd codeforge/server
npm ci

# The sandbox image. The judge will not run without it.
docker build -t codeforge-executor -f ../docker/executor/Dockerfile ../docker/executor
```

### Environment

`server/.env` on the VM:

```ini
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
REDIS_URL="rediss://default:...@...upstash.io:6379"

JWT_SECRET=<openssl rand -base64 32>
JWT_REFRESH_SECRET=<a different one>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

PORT=4000
NODE_ENV=production
CLIENT_URL=https://<your-app>.vercel.app

UPLOAD_DIR=/home/ubuntu/codeforge-uploads

EXEC_CPU_LIMIT=1
EXEC_MEMORY_LIMIT_MB=256
EXEC_TIMEOUT_MS=5000
# 4 on Oracle's 12 GB shape. On a 1 GB AWS t3.micro use 1; on a 2 GB box use 2.
# A single compile container asks for 512 MB, so 4 concurrent on 1 GB is an OOM.
EXEC_QUEUE_CONCURRENCY=4
```

Generate the secrets, do not invent them by hand:

```bash
openssl rand -base64 32
```

**`UPLOAD_DIR` must point outside the repository.** Admin-uploaded images are runtime data;
leaving them in `server/uploads` means a `git clean` or a fresh clone destroys every logo
and avatar on the site.

```bash
mkdir -p /home/ubuntu/codeforge-uploads
```

### Migrate, seed, build

```bash
npx prisma generate            # the client is not committed; generate before migrating
npx prisma migrate deploy      # NOT `migrate dev` — never on a real database
npm run build
```

**Do not run the seed yet.** Seeded problems need an owner, so `db:seed` aborts with
*"No ADMIN user found"* against an empty database. The order has to be: start the
service, register an account, promote it, *then* seed. Sections 4–5 below assume this,
and section 7 is the promotion step.

The seed is idempotent and never overwrites rows an admin has edited, so it is safe to
re-run after a content update.

### Run it as a service

`/etc/systemd/system/codeforge.service`:

```ini
[Unit]
Description=CodeForge API and judge
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/codeforge/server
EnvironmentFile=/home/ubuntu/codeforge/server/.env
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now codeforge
sudo systemctl status codeforge
```

`WorkingDirectory` matters: `UPLOAD_DIR` and the judge's temp paths resolve from it.

## 5. HTTPS with Caddy

`sslip.io` resolves any IP embedded in the hostname straight back to that IP, with no DNS
setup — enough for Let's Encrypt to issue a real certificate. For `140.238.12.34` the
hostname is `140-238-12-34.sslip.io` (dots work too).

Caddy is not in Ubuntu's default repositories, so add the official one:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

`/etc/caddy/Caddyfile`:

```
140-238-12-34.sslip.io {
    reverse_proxy localhost:4000
}
```

```bash
sudo systemctl reload caddy
curl https://140-238-12-34.sslip.io/home     # JSON, real cert, no warnings
```

Caddy requests and renews the certificate on first request. Nothing else to configure.

## 6. Vercel (client)

1. Import the repo; set **root directory** to `client`.
2. Environment variable: `VITE_API_URL=https://<your-ip>.sslip.io`
3. Deploy.

`VITE_API_URL` is read **at build time**, not at runtime. Changing it means redeploying,
not restarting.

`client/vercel.json` is already committed and does two things:

- **Rewrites** everything except `assets/` and the three brand images to `/index.html`,
  because React Router owns every path. Without it, opening `/problems/<id>` directly —
  or just refreshing that page — returns 404, since the host looks for a real file there.
- **Caches** hashed build output for a year (immutable by construction) and the
  stable-named brand images for a day with revalidation.

**Do not put `"//"` comment keys in that file.** JSON has no comments, and Vercel
validates `vercel.json` against a strict schema that rejects unknown properties — the
build fails before it installs anything, with
`headers[0] should NOT have additional property "//"`. Rationale goes here instead.

Then set `CLIENT_URL` on the VM to the Vercel URL and `sudo systemctl restart codeforge`,
or CORS will reject the browser.

## 7. Promote yourself to admin

There is deliberately no self-service admin promotion. **This has to happen before the
seed**, which needs an ADMIN to own the problems it creates.

Register through the running API rather than inserting a row by hand, so the password is
hashed by the same code path as a real signup. The prompts keep the password out of your
shell history:

```bash
read -rp "Name: " N; read -rp "Email: " E; read -rsp "Password (8+): " W; echo
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$N\",\"email\":\"$E\",\"password\":\"$W\"}"; unset W
```

Then promote it. `npx prisma studio` opens a browser UI, which is useless over SSH on a
headless box — do it from the CLI instead:

```bash
cd ~/codeforge/server
node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();
p.user.update({where:{email:'you@example.com'},data:{role:'ADMIN'}},
).then(u=>console.log('now',u.role))"
```

Now run `npm run db:seed`.

---

## Verify before calling it live

Work through this in a browser, not just with curl:

- [ ] Home page renders with the seeded content and real counts
- [ ] Register, log out, log back in
- [ ] Problems list loads, filters and pagination work
- [ ] **Submit a solution and get ACCEPTED** — this is the one that exercises Redis, the
      queue, Docker and the sandbox together
- [ ] Submit deliberately wrong code and get WRONG_ANSWER
- [ ] Leaderboard shows the solve
- [ ] Upload a profile picture, confirm it survives `systemctl restart codeforge`
- [ ] Admin panel loads; edit a homepage string and see it change
- [ ] Open a deep link directly (`/problems/<id>`) — checks the SPA rewrite
- [ ] Toggle light/dark

## Troubleshooting

| Symptom | Cause |
|---|---|
| Site loads, every request fails in the console | `CLIENT_URL` does not exactly match the Vercel origin — no trailing slash |
| "Mixed content" blocked | `VITE_API_URL` is `http://`; it must be the HTTPS Caddy address |
| 443 times out, `curl localhost:4000` works | Oracle's two firewalls — see step 3 |
| `migrate deploy` fails on a prepared statement | Using Neon's **pooled** string; switch to the direct one |
| Submissions stay PENDING forever | `codeforge-executor` image missing, or the `ubuntu` user is not in the `docker` group |
| Judge returns infrastructure errors | Docker daemon not running: `sudo systemctl status docker` |
| Uploaded images vanish after a redeploy | `UPLOAD_DIR` still points inside the repo |
| 429s during normal use | Expected: 100 req/min globally, 10/min on login and register |
| **AWS:** everything breaks after stopping the instance | The public IP changed — you skipped the Elastic IP. The sslip.io hostname and `VITE_API_URL` both encode the old one |
| **AWS:** submissions fail sporadically under load | Judge OOM-killed. Confirm swap is on (`free -h`) and `EXEC_QUEUE_CONCURRENCY=1` on a 1 GB box |
| **AWS:** `npm ci` or `docker build` dies with ENOSPC | Root volume left at the 8 GB default. `df -h`; the executor image alone is ~2 GB |
| `npm ci` fails compiling bcrypt | Missing `build-essential` / `python3` |
| **Windows:** `UNPROTECTED PRIVATE KEY FILE`, `ssh` refuses the key | `chmod` does not exist on Windows — use the `icacls` pair in Option A step 1 |
| The VM builds and runs, but the site is the old scaffold | The clone pulled a branch without the work. Confirm `git log -1` on the VM matches `origin/main` |

## Updating

```bash
cd ~/codeforge && git pull
cd server && npm ci && npx prisma migrate deploy && npm run build
sudo systemctl restart codeforge
```

The client redeploys itself from the Vercel Git integration.

## Known limits of the free tier

- **Neon suspends an idle database.** The first request after a quiet period takes a few
  seconds while it wakes.
- **One VM, no redundancy.** Rebooting takes the judge offline. Queued submissions survive
  in Upstash and are picked up on restart.
- **On AWS the free window expires**, unlike Oracle's. Set a zero-spend budget alert at
  signup so the first bill is not a surprise, and remember an *unattached* Elastic IP is
  billed — release it if you tear the instance down.
- **`EXEC_QUEUE_CONCURRENCY=4`** caps concurrent containers. Under load, submissions queue
  rather than exhausting the box — this is deliberate and should not be raised without
  watching memory.
