'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';

type DashboardStats = {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
};

type DashboardResponse = {
  stats: DashboardStats;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const data = await apiGet<DashboardResponse>('/admin/dashboard');
        setStats(data.stats);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return <div className="text-sm text-slate-500">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
      <h1 className="text-2xl font-bold text-slate-800 mb-4">Dashboard Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-100 border border-slate-200">
          <p className="text-xs text-slate-500">Total Revenue</p>
          <p className="text-xl font-bold text-slate-800">${stats?.totalRevenue?.toLocaleString() ?? 0}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-100 border border-slate-200">
          <p className="text-xs text-slate-500">Total Orders</p>
          <p className="text-xl font-bold text-slate-800">{stats?.totalOrders?.toLocaleString() ?? 0}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-100 border border-slate-200">
          <p className="text-xs text-slate-500">Total Users</p>
          <p className="text-xl font-bold text-slate-800">{stats?.totalUsers?.toLocaleString() ?? 0}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-100 border border-slate-200">
          <p className="text-xs text-slate-500">Total Products</p>
          <p className="text-xl font-bold text-slate-800">{stats?.totalProducts?.toLocaleString() ?? 0}</p>
        </div>
      </div>
    </div>
  );
}
