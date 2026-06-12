import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  const user = await getAuthUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const [totalFishers, totalNets, totalBatches, totalIncidents, totalTransactions, totalOperations, closedOperations, avgResponseTimeResult] = await Promise.all([
    db.user.count({ where: { role: 'FISHER' } }),
    db.net.count(),
    db.batch.count(),
    db.incident.count(),
    db.transaction.count(),
    db.operation.count(),
    db.operation.count({ where: { status: 'CLOSED' } }),
    db.operation.aggregate({ _avg: { estimatedArrival: true } }),
  ]);

  const batches = await db.batch.findMany({});
  const totalWeight = batches.reduce((sum: number, b: { weightKg: number }) => sum + b.weightKg, 0);
  
  const speciesCount: Record<string, number> = {};
  batches.forEach((b: { species: string; weightKg: number }) => {
    speciesCount[b.species] = (speciesCount[b.species] || 0) + b.weightKg;
  });

  const speciesStats = Object.entries(speciesCount)
    .map(([species, weight]) => ({ species, weight: Math.round(weight * 100) / 100 }))
    .sort((a, b) => b.weight - a.weight);

  const statusCounts = {
    PENDING: batches.filter((b: { status: string }) => b.status === 'PENDING').length,
    VERIFIED: batches.filter((b: { status: string }) => b.status === 'VERIFIED').length,
    FLAGGED: batches.filter((b: { status: string }) => b.status === 'FLAGGED').length,
  };

  const recentBatches = batches.slice(0, 10);

  return NextResponse.json({
    totalFishers,
    totalNets,
    totalBatches,
    totalIncidents,
    totalTransactions,
    totalOperations,
    closedOperations,
    avgResponseTime: avgResponseTimeResult._avg.estimatedArrival || 0,
    totalWeight: Math.round(totalWeight * 100) / 100,
    speciesStats,
    statusCounts,
    recentBatches,
  });
}
