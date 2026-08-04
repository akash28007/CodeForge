# Sandboxed C++ execution image (used in Milestone 7).
# Built and run with strict flags — see docs/MILESTONES.md security notes:
#   docker run --rm --network none --read-only --cap-drop=ALL \
#     --memory=256m --cpus=1 --pids-limit=64 \
#     --user 1000:1000 --tmpfs /tmp:rw,size=64m \
#     codeforge-executor

FROM gcc:13-bookworm

# GNU time (not the shell builtin) gives us peak resident-set-size for memory reporting.
RUN apt-get update && apt-get install -y --no-install-recommends time && rm -rf /var/lib/apt/lists/*

RUN useradd --no-create-home --uid 1000 runner
WORKDIR /sandbox
USER runner

ENTRYPOINT ["/bin/sh", "-c"]
