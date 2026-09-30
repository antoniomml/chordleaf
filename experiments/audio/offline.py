"""Prevent Python network connections during explicitly offline inference.

An audit hook is a regression guard for Python network APIs, not an OS sandbox
for arbitrary native code. Inference uses only local files and cached weights.
"""
import sys


def block_network(event, args):
    if event in ('socket.connect', 'socket.connect_ex', 'socket.getaddrinfo', 'socket.sendto'):
        raise RuntimeError('Network disabled for local audio inference')


def require_offline():
    sys.addaudithook(block_network)
