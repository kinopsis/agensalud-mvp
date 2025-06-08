# 🔧 WhatsApp State Inconsistency Resolution Guide

**Document Version**: 1.0  
**Date**: January 28, 2025  
**Status**: Production Ready  
**Audience**: System Administrators, DevOps, Support Team

---

## 📋 Problem Description

### Symptoms
- WhatsApp instance appears in AgentSalud frontend but cannot be deleted
- Error messages like "La instancia no existe o ya fue eliminada" when trying to delete
- Instance shows in UI but doesn't exist in Evolution API backend
- State mismatch between local database and Evolution API

### Root Cause
This occurs when:
1. Instance is manually deleted from Evolution API backend
2. Database cleanup fails or is skipped
3. Frontend cache shows stale data
4. State synchronization service is not running

---

## 🚨 Immediate Resolution Steps

### Option 1: Quick Command Line Fix (Recommended)

```bash
# 1. Navigate to project directory
cd /path/to/agentsalud-project

# 2. Run diagnostic (safe, no changes)
node scripts/fix-whatsapp-state-inconsistency.js --dry-run

# 3. Apply the fix
node scripts/fix-whatsapp-state-inconsistency.js

# 4. Verify results
node scripts/fix-whatsapp-state-inconsistency.js --dry-run
```

### Option 2: Web Interface Resolution

1. **Access Admin Panel**
   ```
   Navigate to: https://app.agentsalud.com/admin/whatsapp-state-resolver
   ```

2. **Diagnose Issues**
   - Click "Diagnose State" button
   - Review orphaned instances found

3. **Resolve Inconsistencies**
   - Click "Resolve Inconsistencies" button
   - Confirm deletion of orphaned instances
   - Wait for completion

4. **Verify Resolution**
   - Refresh browser
   - Check that problematic instances no longer appear

### Option 3: API Resolution

```bash
# Diagnose via API
curl -X GET "https://app.agentsalud.com/api/admin/whatsapp/resolve-state-inconsistency" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Resolve via API
curl -X POST "https://app.agentsalud.com/api/admin/whatsapp/resolve-state-inconsistency" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"action": "cleanup", "forceCleanup": true}'
```

---

## 🔍 Detailed Diagnostic Procedures

### Step 1: Identify Problematic Instance

```bash
# Get instance details from error message or UI
INSTANCE_ID="problematic-instance-id"
INSTANCE_NAME="problematic-instance-name"
```

### Step 2: Verify State Mismatch

```bash
# Check database state
node scripts/diagnose-whatsapp-state-inconsistency.js --verbose

# Check Evolution API state
curl -X GET "https://evo.torrecentral.com/instance/connectionState/${INSTANCE_NAME}" \
  -H "apikey: YOUR_EVOLUTION_API_KEY"
```

### Step 3: Analyze Inconsistency

**Expected Results:**
- **Database**: Instance exists with status (connected/disconnected/error)
- **Evolution API**: 404 Not Found or Instance not found error

**If both exist**: No inconsistency, check other issues
**If only database exists**: State inconsistency confirmed

### Step 4: Document Findings

```bash
# Create incident report
echo "Instance: ${INSTANCE_NAME}" > incident_report.txt
echo "Database Status: EXISTS" >> incident_report.txt
echo "Evolution API Status: NOT_FOUND" >> incident_report.txt
echo "Timestamp: $(date)" >> incident_report.txt
```

---

## 🛠️ Resolution Implementation

### Automated Resolution (Recommended)

```bash
# Target specific instance
node scripts/fix-whatsapp-state-inconsistency.js --instance-id=${INSTANCE_ID}

# Or fix all orphaned instances
node scripts/fix-whatsapp-state-inconsistency.js
```

### Manual Resolution (If Automated Fails)

```sql
-- Connect to Supabase database
-- Replace INSTANCE_ID with actual ID

-- 1. Check instance exists
SELECT * FROM channel_instances WHERE id = 'INSTANCE_ID';

-- 2. Create audit log before deletion
INSERT INTO channel_audit_logs (
  organization_id,
  channel_type,
  instance_id,
  action,
  actor_type,
  details,
  created_at
) VALUES (
  (SELECT organization_id FROM channel_instances WHERE id = 'INSTANCE_ID'),
  'whatsapp',
  'INSTANCE_ID',
  'manual_orphan_cleanup',
  'admin',
  '{"reason": "Manual cleanup of orphaned instance", "timestamp": "' || NOW() || '"}',
  NOW()
);

-- 3. Delete orphaned instance
DELETE FROM channel_instances WHERE id = 'INSTANCE_ID';

-- 4. Verify deletion
SELECT * FROM channel_instances WHERE id = 'INSTANCE_ID';
```

### State Sync Service Activation

```typescript
// Trigger state synchronization
import { getStateSyncService } from '@/lib/services/WhatsAppStateSyncService';

const stateSyncService = getStateSyncService();
await stateSyncService.syncAllInstances();
```

---

## ✅ Validation & Verification

### Post-Resolution Checklist

- [ ] **Frontend Check**: Instance no longer appears in UI
- [ ] **Database Check**: Instance removed from `channel_instances` table
- [ ] **Evolution API Check**: Confirms instance doesn't exist
- [ ] **Audit Trail**: Cleanup action logged in audit table
- [ ] **Functionality Test**: Can create new instances normally

### Validation Commands

```bash
# 1. Verify no orphaned instances remain
node scripts/fix-whatsapp-state-inconsistency.js --dry-run

# 2. Test instance creation
curl -X POST "https://app.agentsalud.com/api/channels/whatsapp/instances" \
  -H "Content-Type: application/json" \
  -d '{"instance_name": "test-instance", "phone_number": "+1234567890"}'

# 3. Check audit logs
# (Access via Supabase dashboard or admin panel)
```

### Success Criteria

1. **No Error Messages**: Frontend operations work without "instance not found" errors
2. **Clean State**: Diagnostic tools show no orphaned instances
3. **Functional UI**: Can create, connect, and delete instances normally
4. **Audit Trail**: All cleanup actions properly logged

---

## 🛡️ Prevention Measures

### Automated Monitoring

```bash
# Set up daily state consistency check
# Add to cron job:
0 2 * * * cd /path/to/project && node scripts/diagnose-whatsapp-state-inconsistency.js --dry-run
```

### State Sync Service

```typescript
// Ensure state sync service is running
import { getStateSyncService } from '@/lib/services/WhatsAppStateSyncService';

// Start continuous sync for all instances
const stateSyncService = getStateSyncService();
stateSyncService.startContinuousSync(instanceId, instanceName);
```

### Best Practices

1. **Always use UI for deletions**: Avoid manual Evolution API deletions
2. **Monitor audit logs**: Regular review of instance operations
3. **State sync enabled**: Ensure sync service is active
4. **Regular diagnostics**: Weekly state consistency checks

---

## 📞 Escalation Procedures

### Level 1: Self-Service Resolution
- Use automated scripts
- Follow this guide
- Document actions taken

### Level 2: Admin Intervention
- Access admin panel tools
- Manual database cleanup
- Coordinate with team

### Level 3: Developer Support
- Complex state issues
- Multiple organization impact
- System-wide inconsistencies

### Emergency Contacts
- **Technical Lead**: [Contact Info]
- **DevOps Team**: [Contact Info]
- **On-Call Support**: [Contact Info]

---

## 📚 Related Documentation

- [WhatsApp Integration Debug Report](./WHATSAPP_INTEGRATION_DEBUG_REPORT.md)
- [Evolution API v2 Integration Guide](./EVOLUTION_API_V2_QR_CODE_ANALYSIS.md)
- [State Synchronization Service Documentation](../src/lib/services/WhatsAppStateSyncService.ts)

---

## 🔄 Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-01-28 | Initial version with complete resolution procedures | AgentSalud Team |

---

**Last Updated**: January 28, 2025  
**Next Review**: February 28, 2025
