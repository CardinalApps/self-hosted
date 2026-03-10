# Topology

This library provides infrastructure topology helpers and `fetch` functions for
Cardinal apps to use. This is intended to be used by both backend and frontend
Cardinal apps.

## Authorization

This package has no concept of authentication or authorization. It doesn't know
how to retrieve auth tokens from whatever environment it's running in. The apps
that use this package must extend the exported `fetch` functions by adding the
necessary auth headers.
