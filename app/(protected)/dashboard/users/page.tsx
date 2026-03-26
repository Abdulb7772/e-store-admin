'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

type User = {
  _id?: string;
  id?: string;
  firstName: string;
  lastName: string;
  username: string;
  emailPhone: string;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: string;
};

type CustomerRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  joinedDate: string;
};

type StaffRow = {
  id: string;
  fullName: string;
  userId: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  isActive: boolean;
  joinedDate: string;
};

const extractEmail = (emailPhone: string): string => {
  return emailPhone.includes('@') ? emailPhone : '-';
};

const extractPhone = (emailPhone: string): string => {
  return emailPhone.includes('@') ? '-' : emailPhone;
};

const generateUserId = (role: string, index: number): string => {
  const prefix = role === 'admin' ? 'ADMIN' : 'STAFF';
  return `${prefix}${String(index + 1).padStart(3, '0')}`;
};

export default function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError('');

        const userData = await apiGet<User[]>('/admin/users');
        setUsers(Array.isArray(userData) ? userData : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    void loadUsers();
  }, []);

  const { customers, staff } = useMemo(() => {
    const customersList = users
      .filter((user) => user.role === 'user')
      .map((user): CustomerRow => ({
        id: String(user._id || user.id || ''),
        fullName: `${user.firstName} ${user.lastName}`,
        email: extractEmail(user.emailPhone),
        phone: extractPhone(user.emailPhone),
        isActive: user.isActive,
        joinedDate: new Date(user.createdAt).toLocaleDateString(),
      }));

    const staffList = users
      .filter((user) => user.role !== 'user')
      .map((user, index): StaffRow => ({
        id: String(user._id || user.id || ''),
        fullName: `${user.firstName} ${user.lastName}`,
        userId: generateUserId(user.role, index),
        email: extractEmail(user.emailPhone),
        phone: extractPhone(user.emailPhone),
        role: user.role,
        isActive: user.isActive,
        joinedDate: new Date(user.createdAt).toLocaleDateString(),
      }));

    return { customers: customersList, staff: staffList };
  }, [users]);

  const activeCustomers = useMemo(() => customers.filter((c) => c.isActive).length, [customers]);
  const inactiveCustomers = useMemo(() => customers.filter((c) => !c.isActive).length, [customers]);
  const activeStaff = useMemo(() => staff.filter((s) => s.isActive).length, [staff]);
  const inactiveStaff = useMemo(() => staff.filter((s) => !s.isActive).length, [staff]);

  const handleCustomerStatusToggle = (customerId: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        String(user._id || user.id) === customerId ? { ...user, isActive: !user.isActive } : user,
      ),
    );
    toast.success('Customer status updated.');
  };

  const handleStaffStatusToggle = (staffId: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        String(user._id || user.id) === staffId ? { ...user, isActive: !user.isActive } : user,
      ),
    );
    toast.success('Staff status updated.');
  };

  const handleStaffRoleChange = (staffId: string, newRole: 'user' | 'admin') => {
    setUsers((prev) =>
      prev.map((user) =>
        String(user._id || user.id) === staffId ? { ...user, role: newRole } : user,
      ),
    );
    toast.success('Staff role updated.');
  };

  if (loading) {
    return <div className="text-sm text-slate-500">Loading users...</div>;
  }

  if (error) {
    return <div className="text-sm text-rose-600">{error}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Customers Section */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
          <p className="text-sm text-slate-500 mt-1">Manage customer accounts and activity.</p>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">Total: {customers.length}</span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">
            Active: {activeCustomers}
          </span>
          <span className="rounded-full bg-rose-100 px-3 py-1 font-semibold text-rose-700">
            Inactive: {inactiveCustomers}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-black text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Full Name</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Phone</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-800">{customer.fullName}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{customer.email}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{customer.phone}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleCustomerStatusToggle(customer.id)}
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                          customer.isActive
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{customer.joinedDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Section */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Other Users</h1>
          <p className="text-sm text-slate-500 mt-1">Manage admin, staff, and other user roles.</p>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">Total: {staff.length}</span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">
            Active: {activeStaff}
          </span>
          <span className="rounded-full bg-rose-100 px-3 py-1 font-semibold text-rose-700">
            Inactive: {inactiveStaff}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-black text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Full Name</th>
                <th className="px-4 py-3 text-left font-semibold">User ID</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Phone</th>
                <th className="px-4 py-3 text-left font-semibold">Role</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No other users found.

                  </td>
                </tr>
              ) : (
                staff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-800">{member.fullName}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">{member.userId}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{member.email}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{member.phone}</td>
                    <td className="px-4 py-3">
                      <select
                        value={member.role}
                        onChange={(e) => handleStaffRoleChange(member.id, e.target.value as 'user' | 'admin')}
                        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-700"
                      >
                        <option value="admin">Admin</option>
                        <option value="user">Staff</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleStaffStatusToggle(member.id)}
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                          member.isActive
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {member.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{member.joinedDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
