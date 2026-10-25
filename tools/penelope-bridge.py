#!/usr/bin/env python3
"""Give Penelope a terminal, and relay this process's stdin and stdout to it."""

import fcntl
import os
import select
import signal
import struct
import sys
import termios

def main() -> None:
    args = sys.argv[1:]
    if not args:
        sys.stderr.write("penelope-bridge needs the Penelope command.\n")
        sys.exit(1)
    os.environ["TERM"] = "xterm-256color"
    os.environ["COLUMNS"] = "120"
    os.environ["LINES"] = "40"
    pid, fd = os.forkpty()
    if pid == 0:
        try:
            import ctypes
            ctypes.CDLL(None).prctl(1, signal.SIGKILL)
        except Exception:
            pass
        os.execvp(args[0], args)
        return
    try:
        fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", 40, 120, 0, 0))
    except OSError:
        pass

    def kill_child() -> None:
        try:
            os.killpg(os.getpgid(pid), signal.SIGKILL)
        except OSError:
            try:
                os.kill(pid, signal.SIGKILL)
            except OSError:
                pass

    def stop(_signum, _frame) -> None:
        kill_child()
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
        kill_child()
        try:
            os.waitpid(pid, 0)
        except ChildProcessError:
            pass


if __name__ == "__main__":
    main()
