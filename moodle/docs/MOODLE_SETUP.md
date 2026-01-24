# Moodle Setup for OnlyApps

## Quick Start

```bash
# Start Moodle
docker compose up -d

# Wait 2-3 minutes, then access:
# http://localhost:8080
# Login: admin / Admin123!
```

## Install MCP Plugin

```bash
# Install the MCP web service plugin
docker exec -it onlyapps_moodle bash -c "
  cd /bitnami/moodle/webservice && \
  git clone https://github.com/onbirdev/moodle-webservice_mcp.git mcp
"

# Restart to trigger installation
docker compose restart moodle
```

Then visit http://localhost:8080 and complete the plugin upgrade.

## Configure Web Services

1. **Site admin → Advanced features** → Enable "Web services"
2. **Site admin → Plugins → Web services → Manage protocols** → Enable "MCP"
3. **Site admin → Server → Web services → External services** → Add new service
4. Add these functions to the service:
   - `core_course_get_courses`
   - `core_course_get_contents`
   - `mod_assign_get_assignments`
   - `mod_assign_get_submission_status`
   - `gradereport_user_get_grades_table`
   - `core_calendar_get_calendar_events`
   - `core_user_get_users_by_field`
5. **Site admin → Server → Web services → Manage tokens** → Create token

## Test Courses

| Course | Assignments |
|--------|-------------|
| Statistical Methods in AI | HW1: Linear Regression, Quiz: Probability |
| Distributed Systems | Project: Raft Consensus, HW: MapReduce |
| Operating Systems & Networks | Lab: Process Scheduling, Quiz: TCP/IP |
| Software Engineering | Sprint Demo, Code Review Report |

## Test Connection

```bash
curl -X POST "http://localhost:8080/webservice/mcp/server.php" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'
```
