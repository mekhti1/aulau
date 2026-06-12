'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });

const COLORS = ['#1E5A96', '#2F7ABF', '#2E7D32', '#F9A825', '#C62828', '#7B1FA2'];

interface Transaction {
  id: string;
  price: number;
  createdAt: string;
  batch: {
    species: string;
    weightKg: number;
    batchCode: string;
  };
}

export default function BuyerAnalytics() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/buyer/transactions')
      .then(r => r.json())
      .then(data => setTransactions(data.transactions || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-8 text-gov-text-secondary">Загрузка...</div>;
  }

  const totalKg = transactions.reduce((s, t) => s + t.batch.weightKg, 0);
  const totalSpent = transactions.reduce((s, t) => s + t.price, 0);

  // Species distribution
  const speciesMap: Record<string, number> = {};
  transactions.forEach(t => {
    speciesMap[t.batch.species] = (speciesMap[t.batch.species] || 0) + t.batch.weightKg;
  });
  const pieData = Object.entries(speciesMap).map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Мои покупки</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-sm text-gov-text-secondary">Всего куплено</p>
          <p className="text-2xl font-bold text-gray-900">{Math.round(totalKg * 10) / 10} кг</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gov-text-secondary">Потрачено</p>
          <p className="text-2xl font-bold text-primary">{totalSpent.toLocaleString('ru-RU')} ₸</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gov-text-secondary">Транзакций</p>
          <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
        </div>
      </div>

      {/* Species chart */}
      {pieData.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gov-text-secondary uppercase tracking-wider mb-3">
            По видам рыбы
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value} кг`}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Transaction list */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gov-text-secondary uppercase tracking-wider mb-3">
          История покупок
        </h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-gov-text-secondary text-center py-4">Нет покупок</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-gov">
              <thead>
                <tr>
                  <th>Партия</th>
                  <th>Вид</th>
                  <th>Вес</th>
                  <th>Цена</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id}>
                    <td className="font-mono text-xs">{t.batch.batchCode}</td>
                    <td>{t.batch.species}</td>
                    <td>{t.batch.weightKg} кг</td>
                    <td className="font-medium">{t.price.toLocaleString('ru-RU')} ₸</td>
                    <td className="text-gov-text-secondary">{new Date(t.createdAt).toLocaleDateString('ru-RU')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
