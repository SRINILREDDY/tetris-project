# STACK — Tetris DevOps Project

A browser-based Tetris game containerized with Docker, tested and published by
GitHub Actions, and deployed manually to a local Kubernetes cluster using kind.

## Current status

- Docker image built and tested locally.
- GitHub Actions runs game tests, builds the image, checks HTTP endpoints, and
  pushes the tested image to Docker Hub after successful checks on `main`.
- Kubernetes deployment verified with two Ready pods and browser access.
- Argo CD is planned and has not been implemented.
- ECR, EKS and Terraform are planned extensions.
- Vulnerability scanning is currently removed from CI. Successful CI does not
  indicate that previously reported vulnerabilities have been fixed.

## Architecture

```text
Code pushed to GitHub
        |
        v
GitHub Actions: game tests -> Docker build -> container HTTP checks
        |
        v
Docker Hub: srinilreddy/tetris-app:<Git-commit-SHA>
        |
        | Manual kubectl apply using the image tag in the manifest
        v
kind Kubernetes cluster
        |
        v
Namespace: tetris -> Deployment: tetris (2 pods)
        ^
        |
Browser -> localhost:8081 -> kubectl port-forward -> ClusterIP Service: tetris
```

CI publishes a new image tag for each successful main-branch run. It does not
update the image tag in the Kubernetes manifest or deploy automatically.

## Technology

| Component | Technology |
| --- | --- |
| Game | HTML, CSS and JavaScript |
| Web server | Nginx on port 8080, running as the nginx user |
| Tests | Node.js built-in test runner |
| Container registry | Docker Hub |
| CI | GitHub Actions |
| Kubernetes | kind |

The game runs in the browser. There is no backend API or database. Personal best
scores are stored in the browser's local storage. Node.js is used for tests, not
as a production application server. A PVC is not required by this application.

## Project structure

```text
.
├── .dockerignore
├── .github/workflows/ci.yml
├── .gitignore
├── CI-SETUP.md
├── Dockerfile
├── app.js
├── engine.js
├── index.html
├── k8s/tetris.yaml
├── kind.yaml
├── nginx.conf
├── package.json
├── styles.css
└── tests/engine.test.js
```

## Prerequisites

- Git
- Docker Desktop running, or another compatible Docker Engine setup
- Node.js 24 or newer for local tests
- kubectl and kind for local Kubernetes deployment

The CI workflow builds **linux/arm64** images to match the Apple Silicon lab.
Use ARM64 Kubernetes nodes for these CI images. AMD64 nodes require a compatible
image build; the current workflow does not publish a multi-platform image.

## Get the source and run tests

```bash
git clone https://github.com/SRINILREDDY/tetris-project.git
cd tetris-project
npm test
```

There are no npm dependencies to install. The ten tests cover game startup,
piece generation, movement and collision, rotation, hard drop, row clearing,
scoring, level progression, game over, and pause/restart behavior.

## Build and run with Docker

```bash
docker build -t tetris-app:v1 .
docker run -d --name tetris-game -p 127.0.0.1:8080:8080 tetris-app:v1
```

Open [http://localhost:8080](http://localhost:8080).

```bash
curl --fail http://localhost:8080/healthz
docker ps
docker logs tetris-game
```

The health endpoint returns `ok`. Docker's health check calls this endpoint;
Kubernetes uses the readiness and liveness probes defined in its own manifest.

To remove the local Docker container:

```bash
docker rm -f tetris-game
```

## GitHub Actions

The workflow runs for pushes to `main`, pull requests targeting `main`, and
manual dispatches. It performs these steps:

1. Check out the source and set up Node.js.
2. Run the game tests.
3. Build the ARM64 Docker image.
4. Start a container and check `/healthz`, the game page and its JavaScript/CSS.
5. Log in and push the same tested image on successful main-branch runs.
6. Show container logs and clean up the test container.

Pull requests run checks without logging in or publishing images. Publishing
uses full Git commit SHA tags rather than overwriting `v1` or `latest`.

Configure these **repository secrets** under GitHub Settings -> Secrets and
variables -> Actions:

| Secret | Value |
| --- | --- |
| `DOCKERHUB_USERNAME` | `srinilreddy` |
| `DOCKERHUB_TOKEN` | Actual Docker Hub personal access token with Read & Write permissions |

Keep credentials out of source control. A local Docker login does not supply
credentials to GitHub Actions. See [CI-SETUP.md](CI-SETUP.md) for more details.

## Deploy to Kubernetes

The demonstrated lab uses the default kind cluster, with context `kind-kind`.
If that cluster does not already exist, create it:

```bash
kind create cluster --name kind --wait 120s
```

Verify the cluster, then deploy:

```bash
kubectl --context kind-kind get nodes
kubectl --context kind-kind apply -f k8s/tetris.yaml
kubectl --context kind-kind rollout status deployment/tetris -n tetris --timeout=180s
kubectl --context kind-kind get pods,svc -n tetris
```

The manifest creates:

- Namespace `tetris`.
- Deployment `tetris` with two replicas.
- Per-container requests of 100m CPU and 64Mi memory; limits of 500m CPU and 128Mi.
- Readiness and liveness probes using `/healthz` on container port 8080.
- ClusterIP Service `tetris`, forwarding port 80 to container port 8080.

It currently references the image published for commit
`4390e097122ea906e185d5efb22a952d632d9a2f`. After publishing a new version, edit
the image tag in `k8s/tetris.yaml`, commit the change and apply the manifest.
An image in a private repository also requires Kubernetes pull credentials;
GitHub Actions secrets are not automatically available to the cluster.

### Access the application

```bash
kubectl --context kind-kind port-forward svc/tetris -n tetris 8081:80
```

Keep the terminal running and open
[http://localhost:8081](http://localhost:8081). Ctrl+C stops the forwarding.

The included `kind.yaml` contains a host-port mapping for NodePort 30080. The
current Service is ClusterIP, so that mapping is not used by this deployment.
Use the port-forward command above with the current manifest.

## Manual game checks

Click **Start game** and keep the board focused while testing:

- Left/right arrows: move.
- Up arrow: rotate.
- Down arrow: soft drop.
- Space: hard drop.
- P or Escape: pause/resume.

Confirm that pieces move and rotate, full rows clear, and the score changes.
Game logic tests and HTTP checks do not replace browser interaction testing.

## Troubleshooting

```bash
kubectl --context kind-kind describe deployment tetris -n tetris
kubectl --context kind-kind describe pods -n tetris
kubectl --context kind-kind logs deployment/tetris -n tetris --tail=50
kubectl --context kind-kind get events -n tetris --sort-by=.metadata.creationTimestamp
```

- **ImagePullBackOff:** verify the exact registry/tag, repository access and
  network connectivity. The node architecture must match the published image.
- **Browser cannot connect:** confirm the Service exists and port-forwarding
  is still running. Kubernetes access uses port 8081; the Docker example uses 8080.
- **HTTP test passes but gameplay fails:** inspect browser console errors and
  check that both JavaScript modules load.

## Next stages

1. Learn Argo CD concepts and connect it to the manifests in `k8s/`.
2. Demonstrate Git-driven deployment and reconciliation.
3. Revisit vulnerability findings and restore scanning after reviewing them.
4. Extend the project to ECR/EKS and provision the AWS infrastructure with Terraform.

These stages are planned; they are not part of the completed implementation.
