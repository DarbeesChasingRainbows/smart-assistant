@echo off
REM Wrapper to run podman-compose when the pip entrypoint is not on PATH.
REM This intentionally uses the Python module invocation, which works as long as `py` is available.

py -m podman_compose %*
