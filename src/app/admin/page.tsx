'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });

const COLORS = ['#1E5A96', '#2F7ABF', '#2E7D32', '#F9A825', '#C62828', '#7B1FA2', '#00838F'];

interface Stats {
  totalFishers: number;
  totalNets: number;
  totalBatches: number;
  totalIncidents: number;
  totalTransactions: number;
  totalOperations: number;
  closedOperations: number;
  avgResponseTime: number;
  totalWeight: number;
  speciesStats: Array<{ species: string; weight: number }>;
  statusCounts: { PENDING: number; VERIFIED: number; FLAGGED: number };
  recentBatches: Array<{
    id: string;
    batchCode: string;
    species: string;
    weightKg: number;
    status: string;
    createdAt: string;
    owner: { name: string };
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return <div className="text-center py-8 text-gov-text-secondary">Загрузка...</div>;
  }

  const statusData = [
    { name: 'На рассмотрении', value: stats.statusCounts.PENDING },
    { name: 'Проверено', value: stats.statusCounts.VERIFIED },
    { name: 'Подозрительно', value: stats.statusCounts.FLAGGED },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Панель администратора</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="stat-card">
          <p className="text-xs text-gov-text-secondary">Рыбаков</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalFishers}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-gov-text-secondary">Сетей</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalNets}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-gov-text-secondary">Уловов</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalBatches}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-gov-text-secondary">Инцидентов</p>
          <p className="text-2xl font-bold text-gov-danger">{stats.totalIncidents}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-gov-text-secondary">Продаж</p>
          <p className="text-2xl font-bold text-gov-success">{stats.totalTransactions}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-gov-text-secondary">Общий вес</p>
          <p className="text-2xl font-bold text-primary">{stats.totalWeight} кг</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card border-l-4 border-red-600 bg-red-50">
          <p className="text-xs text-gov-text-secondary uppercase">Создано операций</p>
          <p className="text-3xl font-black text-red-700">{stats.totalOperations}</p>
        </div>
        <div className="stat-card border-l-4 border-orange-500 bg-orange-50">
          <p className="text-xs text-gov-text-secondary uppercase">Ср. время реагирования</p>
          <p className="text-3xl font-black text-orange-700">{stats.avgResponseTime} мин</p>
        </div>
        <div className="stat-card border-l-4 border-green-600 bg-green-50">
          <p className="text-xs text-gov-text-secondary uppercase">Закрытых операций</p>
          <p className="text-3xl font-black text-green-700">{stats.closedOperations}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Species Chart */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gov-text-secondary uppercase tracking-wider mb-4">
            Вылов по видам (кг)
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.speciesStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DDE3EA" />
                <XAxis dataKey="species" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="weight" fill="#1E5A96" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gov-text-secondary uppercase tracking-wider mb-4">
            Статусы партий
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  <Cell fill="#F9A825" />
                  <Cell fill="#2E7D32" />
                  <Cell fill="#C62828" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Batches */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gov-text-secondary uppercase tracking-wider mb-4">
          Последние уловы
        </h2>
        <div className="overflow-x-auto">
          <table className="table-gov">
            <thead>
              <tr>
                <th>Код</th>
                <th>Рыбак</th>
                <th>Вид</th>
                <th>Вес</th>
                <th>Статус</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentBatches.map(b => (
                <tr key={b.id}>
                  <td className="font-mono text-xs">{b.batchCode}</td>
                  <td>{b.owner.name}</td>
                  <td>{b.species}</td>
                  <td>{b.weightKg} кг</td>
                  <td>
                    <span className={`badge ${
                      b.status === 'VERIFIED' ? 'badge-success' :
                      b.status === 'FLAGGED' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {b.status === 'VERIFIED' ? 'Проверено' : b.status === 'FLAGGED' ? 'Подозрительно' : 'На рассмотрении'}
                    </span>
                  </td>
                  <td className="text-gov-text-secondary text-xs">
                    {new Date(b.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
