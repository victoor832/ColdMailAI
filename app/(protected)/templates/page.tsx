'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { LoadingPage, LoadingButton } from '@/components/ui/loading';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Template {
  id: string;
  name: string;
  description: string;
  category: 'general' | 'sales' | 'support' | 'followup';
  subject_template: string;
  body_template: string;
  is_public: boolean;
  is_shared: boolean;
  shared_with: string[];
  created_at: string;
  updated_at: string;
}

export default function TemplatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingTemplate, setSharingTemplate] = useState<Template | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    category: 'general' | 'sales' | 'support' | 'followup';
    subject_template: string;
    body_template: string;
    is_public: boolean;
  }>({
    name: '',
    description: '',
    category: 'general',
    subject_template: '',
    body_template: '',
    is_public: false,
  });

  const [shareData, setShareData] = useState({
    userEmail: '',
    makePublic: false,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTemplates();
    }
  }, [status]);

  async function fetchTemplates() {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      if (response.ok) {
        setTemplates(data.templates || []);
      } else {
        toast.error('Failed to fetch templates', { description: data.error });
      }
    } catch (error) {
      toast.error('Error fetching templates');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOrUpdate() {
    if (!formData.name.trim() || !formData.subject_template.trim() || !formData.body_template.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const method = editingTemplate ? 'PATCH' : 'POST';
      const url = editingTemplate ? `/api/templates/${editingTemplate.id}` : '/api/templates';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(editingTemplate ? 'Template updated' : 'Template created', {
          description: data.template?.name,
        });
        setShowModal(false);
        resetForm();
        fetchTemplates();
      } else {
        toast.error('Failed to save template', { description: data.error });
      }
    } catch (error) {
      toast.error('Error saving template');
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(templateId: string, templateName: string) {
    if (!confirm(`Delete template "${templateName}"?`)) return;

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Template deleted');
        fetchTemplates();
      } else {
        const data = await response.json();
        toast.error('Failed to delete template', { description: data.error });
      }
    } catch (error) {
      toast.error('Error deleting template');
      console.error(error);
    }
  }

  async function handleShare() {
    if (!sharingTemplate) return;

    if (!shareData.makePublic && !shareData.userEmail.trim()) {
      toast.error('Please enter an email or make it public');
      return;
    }

    try {
      const userIds = shareData.userEmail
        ? [shareData.userEmail] // In production, you'd look up the user ID
        : undefined;

      const response = await fetch(`/api/templates/${sharingTemplate.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds,
          makePublic: shareData.makePublic,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Template sharing updated');
        setShowShareModal(false);
        resetShareForm();
        fetchTemplates();
      } else {
        toast.error('Failed to share template', { description: data.error });
      }
    } catch (error) {
      toast.error('Error sharing template');
      console.error(error);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      category: 'general' as const,
      subject_template: '',
      body_template: '',
      is_public: false,
    });
    setEditingTemplate(null);
  }

  function resetShareForm() {
    setShareData({
      userEmail: '',
      makePublic: false,
    });
    setSharingTemplate(null);
  }

  function openCreateModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(template: Template) {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      category: template.category,
      subject_template: template.subject_template,
      body_template: template.body_template,
      is_public: template.is_public,
    });
    setShowModal(true);
  }

  function openShareModal(template: Template) {
    setSharingTemplate(template);
    setShareData({
      userEmail: '',
      makePublic: template.is_public,
    });
    setShowShareModal(true);
  }

  if (status === 'loading' || loading) {
    return <LoadingPage />;
  }

  const categoryColors = {
    general: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    sales: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    support: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    followup: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Email Templates</h1>
            <p className="text-slate-600 dark:text-slate-400">Create, manage, and share your email templates</p>
          </div>
          <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white">
            + New Template
          </Button>
        </div>

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📧</div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No templates yet</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Create your first email template to get started
            </p>
            <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white">
              Create First Template
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Template Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                      {template.name}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${categoryColors[template.category]}`}>
                      {template.category}
                    </span>
                  </div>
                  {template.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                      {template.description}
                    </p>
                  )}
                </div>

                {/* Template Content */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950">
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Subject
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 truncate">
                      {template.subject_template}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Body Preview
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                      {template.body_template}
                    </p>
                  </div>
                </div>

                {/* Sharing Status */}
                <div className="p-4 bg-slate-100 dark:bg-slate-800 text-xs">
                  {template.is_public ? (
                    <span className="text-green-600 dark:text-green-400 font-semibold">🌍 Public</span>
                  ) : template.is_shared ? (
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">👥 Shared</span>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-400">🔒 Private</span>
                  )}
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openEditModal(template)}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openShareModal(template)}
                    className="flex-1"
                  >
                    Share
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDelete(template.id, template.name)}
                    className="flex-1 text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingTemplate ? 'Edit Template' : 'New Template'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Template Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Sales Follow-up"
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description..."
              rows={2}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as 'general' | 'sales' | 'support' | 'followup' })}
              className="input"
            >
              <option value="general">General</option>
              <option value="sales">Sales</option>
              <option value="support">Support</option>
              <option value="followup">Follow-up</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Subject Template *</label>
            <input
              type="text"
              value={formData.subject_template}
              onChange={(e) => setFormData({ ...formData, subject_template: e.target.value })}
              placeholder="e.g., {{company}} - Quick question"
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Body Template *</label>
            <textarea
              value={formData.body_template}
              onChange={(e) => setFormData({ ...formData, body_template: e.target.value })}
              placeholder="Email body..."
              rows={6}
              className="input"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_public"
              checked={formData.is_public}
              onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="is_public" className="text-sm font-semibold">
              Make template public
            </label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateOrUpdate}
              disabled={isCreating}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isCreating ? <LoadingButton>Saving...</LoadingButton> : 'Save Template'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Share Modal */}
      <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)} title={`Share "${sharingTemplate?.name}"`}>
        <div className="space-y-4">
          <div>
            <label className="flex text-sm font-semibold mb-2 items-center gap-2">
              <input
                type="checkbox"
                checked={shareData.makePublic}
                onChange={(e) => setShareData({ ...shareData, makePublic: e.target.checked })}
                className="rounded"
              />
              Make Public (Anyone can use)
            </label>
          </div>

          {!shareData.makePublic && (
            <div>
              <label className="block text-sm font-semibold mb-2">Share with Email</label>
              <input
                type="email"
                value={shareData.userEmail}
                onChange={(e) => setShareData({ ...shareData, userEmail: e.target.value })}
                placeholder="user@example.com"
                className="input"
              />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowShareModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleShare}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Update Sharing
            </Button>
          </div>
        </div>
      </Modal>

      {/* Navigation Link */}
      <div className="max-w-6xl mx-auto px-4 py-4 border-t border-slate-200 dark:border-slate-700 mt-8">
        <Link href="/research" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm">
          ← Back to Research
        </Link>
      </div>
    </div>
  );
}
