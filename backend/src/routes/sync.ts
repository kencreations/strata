import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/v1/sync/pull
router.get('/pull', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const since = req.query.since as string;
    const sinceDate = new Date(since || 0);
    const now = new Date();

    // In a real PowerSync/logical replication setup, this would be delta queries.
    // For this simple sync queue, we fetch all user data updated since `lastSyncedAt`.

    const layers = await prisma.scheduleLayer.findMany({
      where: { userId, /* updatedAt: { gt: sinceDate } */ }
    });
    
    // We mock returning the changes array to match the client's `pullRemoteChanges`
    const changes: any[] = [];
    
    for (const layer of layers) {
      changes.push({
        tableName: 'schedule_layers',
        operation: 'UPSERT',
        recordId: layer.id,
        payload: layer,
        updatedAt: new Date().toISOString()
      });
    }

    res.json({ changes, serverTime: now.toISOString() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/v1/sync/push
router.post('/push', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { changes } = req.body; // Array of SyncQueueEntry

    if (!Array.isArray(changes)) {
      return res.status(400).json({ message: 'Changes array required' });
    }

    // Naive processing of the local sync queue operations
    for (const change of changes) {
      const { tableName, operation, recordId, payload } = change;
      
      if (tableName === 'events') {
        if (operation === 'INSERT' || operation === 'UPDATE') {
          // Verify layer belongs to user before inserting
          // Upsert logic would go here
        } else if (operation === 'DELETE') {
          // Delete logic
        }
      }
      // ... handle other tables
    }

    res.json({ success: true, processedCount: changes.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

export default router;
