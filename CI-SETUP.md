# Tetris continuous integration

The application is static HTML, CSS and JavaScript served by Nginx. Node.js runs
the automated tests in CI; it is not part of the final container image.

## Add these files

Extract this bundle into the existing Tetris Project directory. It adds the
workflow, package.json, tests, .dockerignore and this guide. It does not replace
your game source, Dockerfile or Nginx configuration.

## Configure credentials

In the GitHub repository, open Settings → Secrets and variables → Actions.
Add these repository secrets:

| Secret | Value |
| --- | --- |
| DOCKERHUB_USERNAME | srinilreddy |
| DOCKERHUB_TOKEN | A Docker Hub personal access token with Read and Write permissions |

Create the token in your Docker account settings. Save its value directly in the
GitHub secret; do not paste it in chat, source files or Git commits. Your local
Docker browser login does not provide credentials to GitHub's runner.

## What happens after a push

1. GitHub checks out the source code.
2. Ten automated tests verify game rules, scoring, collisions and pause/restart.
3. Docker builds the ARM64 image using the current nginx:stable-alpine base.
4. A container starts; HTTP checks verify /healthz, the game page and its assets.
5. Trivy scans the built image. High or Critical findings fail the job, including
   findings without a fix. The JSON report is saved as a workflow artifact.
6. If every check succeeds on main, the same image is pushed to Docker Hub as
   srinilreddy/tetris-app:<full-Git-commit-SHA>.

Pull requests run checks without logging into Docker Hub or publishing images.
The image is built once, tested, scanned and then tagged for publication. The
workflow does not overwrite v1 or latest. Kubernetes deployment and Argo CD will
be added in a later step.

## Run and review

No dependencies need to be installed. With Node.js 24 or newer:

```sh
npm test
```

Commit and push these added files, then open the repository's Actions tab.
If scanning fails, download the trivy-report artifact and review its findings.
The earlier Docker Scout scan reported High vulnerabilities; rebuilding does
not guarantee they are fixed. A blocked push is expected while findings remain.
Trivy and Scout may report different findings because their databases differ.

These checks cover engine rules and HTTP delivery. They do not automate browser
keyboard interaction or prove the image is free of every security issue. Keep
the manual browser play test as well.

## Architecture

The ubuntu-24.04-arm runner builds and checks linux/arm64 to match your Mac and
local kind cluster. This is a single-platform image. An x86 Kubernetes node will
need an amd64 build with equivalent tests and scanning before deployment.

## References

- https://docs.docker.com/build/ci/github-actions/test-before-push/
- https://github.com/aquasecurity/trivy-action
- https://docs.docker.com/security/access-tokens/
- https://docs.github.com/en/actions/reference/runners/github-hosted-runners
