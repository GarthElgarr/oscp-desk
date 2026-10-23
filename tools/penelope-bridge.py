#!/usr/bin/env python3
"""Give Penelope a terminal, and relay this process's stdin and stdout to it."""

import os
import select
import signal
import sys

def main() -> None:
    args = sys.argv[1:]
    if not args:
        sys.stderr.write("penelope-bridge needs the Penelope command.\n")
        sys.exit(1)
    pid, fd = os.forkpty()
    if pid == 0:
        os.execvp(args[0], args)
        return

    def stop(_signum, _frame) -> None:
        try:
            os.kill(pid, signal.SIGTERM)
        except OSError:
            pass
        sys.exit(0)

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    stdin_fd = sys.stdin.fileno()
    stdin_open = True
    try:
        while True:
            watch = [fd]
            if stdin_open:
                watch.append(stdin_fd)
            try:
                ready, _, _ = select.select(watch, [], [], 0.4)
            except InterruptedError:
                continue
            if fd in ready:
                try:
                    data = os.read(fd, 4096)
                except OSError:
                    break
                if not data:
                    break
                sys.stdout.buffer.write(data)
                sys.stdout.buffer.flush()
            if stdin_open and stdin_fd in ready:
                data = os.read(stdin_fd, 4096)
                if not data:
                    stdin_open = False
                else:
                    os.write(fd, data)
            done, _ = os.waitpid(pid, os.WNOHANG)
            if done:
                break
    finally:
        try:
            os.kill(pid, signal.SIGTERM)
        except OSError:
            pass
        try:
            os.waitpid(pid, 0)
        except ChildProcessError:
            pass


if __name__ == "__main__":
    main()
