'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, Building2, Lock, RotateCcw, Save, Settings2, ShieldCheck, Truck } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { useAuth } from '@/context/AuthContext';

type AdminSettings = {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  currency: string;
  timezone: string;
  taxRate: number;
  shippingFee: number;
  freeShippingThreshold: number;
  lowStockThreshold: number;
  autoConfirmOrders: boolean;
  autoPublishNewProducts: boolean;
  emailNewOrders: boolean;
  emailLowStock: boolean;
  weeklySalesReport: boolean;
  systemAlertNotifications: boolean;
  requireAdminTwoFactor: boolean;
  sessionTimeoutMinutes: number;
  allowMultipleAdminSessions: boolean;
};

const SETTINGS_KEY = 'admin-dashboard-settings-v1';

const defaultSettings: AdminSettings = {
  storeName: 'e-Store',
  supportEmail: 'support@estore.com',
  supportPhone: '+1 000 000 0000',
  currency: 'USD',
  timezone: 'UTC',
  taxRate: 7,
  shippingFee: 8,
  freeShippingThreshold: 120,
  lowStockThreshold: 5,
  autoConfirmOrders: false,
  autoPublishNewProducts: true,
  emailNewOrders: true,
  emailLowStock: true,
  weeklySalesReport: true,
  systemAlertNotifications: true,
  requireAdminTwoFactor: false,
  sessionTimeoutMinutes: 30,
  allowMultipleAdminSessions: false,
};

const currencies = ['USD', 'EUR', 'GBP', 'INR', 'AED'];
const timezones = ['UTC', 'Asia/Karachi', 'Asia/Dubai', 'Europe/London', 'America/New_York'];

type ToggleProps = {
  id: keyof AdminSettings;
  label: string;
  description: string;
  checked: boolean;
  onChange: (id: keyof AdminSettings, value: boolean) => void;
};

function ToggleRow({ id, label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="min-w-0 flex-1 pr-2">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(id, !checked)}
        className={`inline-flex h-6 w-11 min-w-[44px] shrink-0 items-center rounded-full p-0.5 transition-colors ${checked ? 'justify-end bg-emerald-600' : 'justify-start bg-slate-300'}`}
        aria-pressed={checked}
      >
        <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState<AdminSettings>(defaultSettings);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) {
        setIsHydrated(true);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<AdminSettings>;
      setSettings((current) => ({ ...current, ...parsed }));
    } catch {
      toast.error('Failed to load saved settings. Using defaults.');
    } finally {
      setIsHydrated(true);
    }
  }, [toast]);

  const updateField = <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    if (!settings.storeName.trim()) {
      toast.error('Store name is required.');
      return;
    }

    if (!settings.supportEmail.trim()) {
      toast.error('Support email is required.');
      return;
    }

    setIsSaving(true);

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      toast.success('Settings saved successfully.');
    } catch {
      toast.error('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    localStorage.removeItem(SETTINGS_KEY);
    toast.info('Settings reset to default values.');
  };

  const adminName = useMemo(() => {
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    return fullName || user?.username || 'Admin User';
  }, [user]);

  if (!isHydrated) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
        <p className="text-slate-500 text-sm">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
            <p className="text-sm text-slate-500 mt-1">Control store behavior, notifications, shipping and security.</p>
          </div>
          <div className="rounded-xl border border-slate-200 px-4 py-3 bg-slate-50">
            <p className="text-xs text-slate-500">Signed in as</p>
            <p className="text-sm font-semibold text-slate-800">{adminName}</p>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={16} className="text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-800">Store Profile</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={settings.storeName}
              onChange={(e) => updateField('storeName', e.target.value)}
              placeholder="Store name"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-700"
            />
            <input
              type="email"
              value={settings.supportEmail}
              onChange={(e) => updateField('supportEmail', e.target.value)}
              placeholder="Support email"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-700"
            />
            <input
              type="text"
              value={settings.supportPhone}
              onChange={(e) => updateField('supportPhone', e.target.value)}
              placeholder="Support phone"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-700"
            />
            <select
              value={settings.currency}
              onChange={(e) => updateField('currency', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-700"
            >
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
            <select
              value={settings.timezone}
              onChange={(e) => updateField('timezone', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-700 md:col-span-2"
            >
              {timezones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Truck size={16} className="text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-800">Order And Shipping Rules</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Tax Rate (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.taxRate}
                onChange={(e) => updateField('taxRate', Number(e.target.value || 0))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Shipping Fee</label>
              <input
                type="number"
                min={0}
                value={settings.shippingFee}
                onChange={(e) => updateField('shippingFee', Number(e.target.value || 0))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Free Shipping Threshold</label>
              <input
                type="number"
                min={0}
                value={settings.freeShippingThreshold}
                onChange={(e) => updateField('freeShippingThreshold', Number(e.target.value || 0))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Low Stock Alert Threshold</label>
              <input
                type="number"
                min={1}
                value={settings.lowStockThreshold}
                onChange={(e) => updateField('lowStockThreshold', Number(e.target.value || 1))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-700"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <ToggleRow
              id="autoConfirmOrders"
              label="Auto Confirm Orders"
              description="Automatically confirm newly placed orders."
              checked={settings.autoConfirmOrders}
              onChange={updateField}
            />
            <ToggleRow
              id="autoPublishNewProducts"
              label="Auto Publish New Products"
              description="New products become visible in client store immediately."
              checked={settings.autoPublishNewProducts}
              onChange={updateField}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-800">Notifications</h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <ToggleRow
              id="emailNewOrders"
              label="Email New Orders"
              description="Send an email notification when an order is placed."
              checked={settings.emailNewOrders}
              onChange={updateField}
            />
            <ToggleRow
              id="emailLowStock"
              label="Email Low Stock Alerts"
              description="Receive alerts when inventory hits low stock threshold."
              checked={settings.emailLowStock}
              onChange={updateField}
            />
            <ToggleRow
              id="weeklySalesReport"
              label="Weekly Sales Report"
              description="Get a weekly summary report for revenue and orders."
              checked={settings.weeklySalesReport}
              onChange={updateField}
            />
            <ToggleRow
              id="systemAlertNotifications"
              label="System Alerts"
              description="Show admin-side warnings and critical system alerts."
              checked={settings.systemAlertNotifications}
              onChange={updateField}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={16} className="text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-800">Security</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Session Timeout (Minutes)</label>
              <input
                type="number"
                min={5}
                max={240}
                value={settings.sessionTimeoutMinutes}
                onChange={(e) => updateField('sessionTimeoutMinutes', Number(e.target.value || 30))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-700"
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-2">
              <Lock size={14} className="text-slate-600" />
              <p className="text-xs text-slate-600">Security settings apply to future backend enforcement.</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <ToggleRow
              id="requireAdminTwoFactor"
              label="Require Two-Factor Authentication"
              description="Admins must pass a second verification step at login."
              checked={settings.requireAdminTwoFactor}
              onChange={updateField}
            />
            <ToggleRow
              id="allowMultipleAdminSessions"
              label="Allow Multiple Admin Sessions"
              description="Let admins stay signed in from multiple devices at once."
              checked={settings.allowMultipleAdminSessions}
              onChange={updateField}
            />
          </div>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-2 text-slate-600">
            <Settings2 size={16} className="mt-0.5" />
            <p className="text-sm">Save your admin settings to keep the dashboard behavior consistent.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <RotateCcw size={14} />
              Reset
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={14} />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
