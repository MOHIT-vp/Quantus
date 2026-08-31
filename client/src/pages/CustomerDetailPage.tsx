import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import type { Customer, ActivityType } from '../types';
import { Check } from 'lucide-react';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [activityForm, setActivityForm] = useState({ type: 'NOTE' as ActivityType, description: '', dueDate: '' });
  const [saving, setSaving] = useState(false);

  const fetchCustomer = async () => {
    try { const res = await api.get(`/customers/${id}`); setCustomer(res.data.customer); }
    catch (err: any) { setError('Failed to load profile.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomer(); }, [id]);

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/activities', { type: activityForm.type, description: activityForm.description, dueDate: activityForm.dueDate ? new Date(activityForm.dueDate).toISOString() : null, customerId: id }); setShowAddActivity(false); setActivityForm({ type: 'NOTE', description: '', dueDate: '' }); fetchCustomer(); }
    catch {} finally { setSaving(false); }
  };

  const toggleActivityComplete = async (activityId: string, completed: boolean) => {
    try { await api.put(`/activities/${activityId}`, { completed: !completed }); fetchCustomer(); } catch {}
  };

  if (loading) return <div className="p-12 text-stone text-sm">Loading record...</div>;
  if (error || !customer) return <div className="p-12 text-signal-negative text-sm">{error}</div>;

  return (
    <div className="fade-in w-full pb-20 space-y-12">
      <div className="border-b border-hairline pb-8">
        <div className="flex items-center gap-2 mb-6">
          <Link to="/customers" className="text-stone hover:text-charcoal text-[10px] uppercase tracking-widest transition-colors font-semibold">Accounts</Link>
          <span className="text-stone text-xs">/</span>
          <span className="text-charcoal text-[10px] uppercase tracking-widest font-semibold">{customer.companyName}</span>
        </div>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-5xl font-400 text-charcoal tracking-tight mb-4">{customer.companyName}</h1>
            <p className="text-stone text-sm">{customer.industry && <span className="mr-4">{customer.industry}</span>}<span>Managed by {customer.assignedUser?.name}</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-4 space-y-10">
          <div>
            <h2 className="text-charcoal text-[11px] uppercase tracking-widest mb-6 border-b border-hairline pb-3 font-semibold">Company Details</h2>
            <div className="space-y-6">
              <InfoRow label="Industry" value={customer.industry || '—'} />
              <InfoRow label="Website" value={customer.website || '—'} />
              <InfoRow label="Address" value={customer.address || '—'} />
              {customer.lead && <div><span className="block text-[10px] uppercase tracking-widest text-stone mb-1 font-semibold">Originated From</span><Link to={`/leads/${customer.lead.id}`} className="text-sm font-medium text-bronze hover:underline">{customer.lead.companyName}</Link></div>}
            </div>
          </div>
          <div>
            <h2 className="text-charcoal text-[11px] uppercase tracking-widest mb-6 border-b border-hairline pb-3 font-semibold">Contacts</h2>
            {customer.contacts && customer.contacts.length > 0 ? (
              <div className="space-y-6">{customer.contacts.map(contact => (<div key={contact.id}><p className="font-medium text-charcoal">{contact.name}</p>{contact.jobTitle && <p className="text-stone text-xs mb-1">{contact.jobTitle}</p>}<p className="text-sm text-charcoal">{contact.email}</p>{contact.phone && <p className="text-sm text-charcoal">{contact.phone}</p>}</div>))}</div>
            ) : <p className="text-stone text-sm italic">No contacts added yet.</p>}
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-8 border-b border-hairline pb-3">
            <h2 className="text-charcoal text-[11px] uppercase tracking-widest font-semibold">Activity History <span className="ml-2 text-stone tabular-nums">({customer.activities?.length || 0})</span></h2>
            <button onClick={() => setShowAddActivity(!showAddActivity)} className="text-[10px] uppercase tracking-widest text-bronze hover:text-charcoal transition-colors font-semibold">Log Activity +</button>
          </div>

          {showAddActivity && (
            <form onSubmit={handleAddActivity} className="mb-12 p-8 bg-stone-light/30 border border-hairline fade-in">
              <div className="grid grid-cols-2 gap-8 mb-6">
                <div><label className="block text-[10px] uppercase tracking-widest text-stone mb-2 font-semibold">Activity Type</label><select value={activityForm.type} onChange={e => setActivityForm(f => ({ ...f, type: e.target.value as ActivityType }))} className="w-full input-institutional"><option value="NOTE">Note</option><option value="CALL">Call</option><option value="MEETING">Meeting</option><option value="EMAIL">Email</option><option value="FOLLOW_UP">Follow-up</option></select></div>
                <div><label className="block text-[10px] uppercase tracking-widest text-stone mb-2 font-semibold">Due Date (Optional)</label><input type="date" value={activityForm.dueDate} onChange={e => setActivityForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full input-institutional" /></div>
              </div>
              <div className="mb-8"><label className="block text-[10px] uppercase tracking-widest text-stone mb-2 font-semibold">Description</label><textarea required value={activityForm.description} onChange={e => setActivityForm(f => ({ ...f, description: e.target.value }))} rows={4} className="w-full input-institutional resize-none" placeholder="Enter activity details..." /></div>
              <div className="flex gap-4"><button type="submit" disabled={saving} className="btn-institutional">{saving ? 'Saving...' : 'Save Activity'}</button><button type="button" onClick={() => setShowAddActivity(false)} className="btn-outline">Cancel</button></div>
            </form>
          )}

          {customer.activities && customer.activities.length > 0 ? (
            <div className="space-y-0">
              {customer.activities.map((activity) => (
                <div key={activity.id} className="flex gap-6 py-6 border-b border-hairline group">
                  <div className="shrink-0 mt-1">
                    <button onClick={() => toggleActivityComplete(activity.id, activity.completed)} className={`w-4 h-4 border flex items-center justify-center transition-colors ${activity.completed ? 'bg-signal-positive border-signal-positive text-ivory' : 'border-stone hover:border-bronze'}`}>
                      {activity.completed && <Check size={10} strokeWidth={3} />}
                    </button>
                  </div>
                  <div className={`flex-1 transition-opacity ${activity.completed ? 'opacity-50' : 'opacity-100'}`}>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-charcoal">{activity.type.replace('_', ' ')}</span>
                      <span className="text-stone text-xs tabular-nums">{new Date(activity.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className={`text-sm leading-relaxed ${activity.completed ? 'line-through text-stone' : 'text-charcoal'}`}>{activity.description}</p>
                    {activity.dueDate && !activity.completed && <p className="text-[10px] text-bronze uppercase tracking-widest mt-4 font-semibold">Due: {new Date(activity.dueDate).toLocaleDateString()}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-stone text-sm italic py-8 border-b border-hairline">No activity recorded.</p>}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div><span className="block text-[10px] uppercase tracking-widest text-stone mb-1 font-semibold">{label}</span><p className="text-sm font-medium text-charcoal">{value}</p></div>;
}
