# Manual test runbook: PortMapper (UPnP / NAT-PMP)

There are no automated integration tests for the port mapper because actually
creating a mapping requires a real UPnP-capable router, which CI does not
have. The unit tests in
[port-mapper.service.spec.ts](../../src/modules/port-mapper/port-mapper.service.spec.ts)
mock the `nat-upnp` library entirely; this runbook covers the real thing.

## Prerequisites

- A machine on a LAN behind a router with UPnP enabled (check the router's
  admin page, usually under "Advanced" or "NAT forwarding").
- The Media Server running directly on the machine, or in Docker with
  **host networking** (`network_mode: host`). UPnP discovery uses multicast
  and silently fails on Docker's default bridge network.

## Steps

1. Enable the option (there is no Admin UI surface yet). The mapping is
   triggered by the Remote Access HTTPS listener, so Remote Access must also
   be enabled with stored cert material (`connect_enabled`,
   `connect_tls_cert_pem`, `connect_tls_key_pem`):

   ```sql
   INSERT INTO option (name, value) VALUES ('port_mapping_enabled', 'true')
   ON CONFLICT (name) DO UPDATE SET value = 'true';
   ```

2. Start the Media Server and watch the logs for
   `[HTTPS] Remote Access HTTPS listening on port <port>` followed by one of:
   - `[PortMapper] Port mapping active: <externalIp>:<externalPort>` — success.
     Unless `connect_https_port` is set, both the internal and external ports
     are randomized (internal is OS-assigned, external is drawn from
     20000–60000).
   - `[PortMapper] Port mapping failed: <reason>` — see the reason table below.

3. Verify the status endpoint (admin JWT required):

   ```
   GET /api/v1/port-mapper/status
   ```

   Expect `state: "active"` with `externalIp`, `externalPort`, `internalPort`,
   and `leaseExpiresAt`.

4. Verify the mapping on the router's admin page (UPnP lease table). The
   description is `Cardinal Media Server`, protocol TCP, lease 30 minutes.

5. Verify renewal: wait 20 minutes and check that `leaseExpiresAt` in the
   status response has moved forward.

6. Verify port conflicts: set `connect_https_port` to a port that already has
   a manual forward on the router (or a second mapped service), restart the
   Media Server, and expect the external mapping to land one port above.

7. Verify clean shutdown: stop the Media Server with SIGTERM and confirm the
   mapping disappears from the router's UPnP lease table.

8. Verify crash behaviour: kill the server with SIGKILL and confirm the
   router expires the lease on its own within 30 minutes.

## Failure reasons

| Reason | Meaning |
|---|---|
| `port_conflict` | The desired port and the 10 above it are all taken. |
| `no_gateway` | Discovery timed out — no UPnP gateway answered. Check the router setting and that the server is not on a bridge network. |
| `unknown` | Anything else — check the logs for the underlying error. |
