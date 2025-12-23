"use client";
import React, { useMemo, useState } from 'react';
import { ImageSelectorContentModal } from '../modals';
import { Image, Item } from '../../types';

interface ManualEventInput {
  code: string;
  label: string;
  description: string;
  image?: Image;
  color: string;
  borderColor: string;
  textColor: string;
  actif: boolean;
  type: 'chantier' | 'autre';
}

interface ManualEventsManagerProps {
  events: Item[];
  images: Image[];
  onCreate: (payload: ManualEventInput) => void;
  onToggleActive: (id: number) => void;
  onImageUpload: (file: File) => Promise<Image>;
  isUploading: boolean;
  uploadError: string | null;
}

const defaultForm: ManualEventInput = {
  code: '',
  label: '',
  description: '',
  color: '#f5f5f5',
  borderColor: '#d1d5db',
  textColor: '#0f172a',
  actif: true,
  type: 'autre',
};

const ManualEventsManager: React.FC<ManualEventsManagerProps> = ({
  events,
  images,
  onCreate,
  onToggleActive,
  onImageUpload,
  isUploading,
  uploadError,
}) => {
  const [form, setForm] = useState<ManualEventInput>(defaultForm);
  const [errors, setErrors] = useState<{ code?: string; label?: string; description?: string }>({});
  const [isImageSelectorOpen, setIsImageSelectorOpen] = useState(false);

  const handleChange = <K extends keyof ManualEventInput>(key: K, value: ManualEventInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { code?: string; label?: string; description?: string } = {};
    if (!form.code.trim()) nextErrors.code = 'Code requis';
    if (!form.label.trim()) nextErrors.label = 'Libellé requis';
    if (!form.description.trim()) nextErrors.description = 'Description requise';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onCreate(form);
    setForm({ ...defaultForm, color: form.color, borderColor: form.borderColor, textColor: form.textColor });
  };

  const rows = useMemo(() => events.filter((e) => e.category === 'manual'), [events]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="rounded-3xl border border-default bg-white shadow-sm p-6">
        <h2 className="text-xl font-semibold text-primary mb-4">Créer une rubrique manuelle</h2>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-secondary">Libellé</label>
            <input
              className="rounded-xl border border-default px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.label}
              onChange={(e) => handleChange('label', e.target.value)}
              placeholder="Libellé affiché"
            />
            {errors.label && <span className="text-xs text-red-600">{errors.label}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-secondary">Code</label>
            <input
              className="rounded-xl border border-default px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.code}
              onChange={(e) => handleChange('code', e.target.value)}
              placeholder="EX: EVT001"
            />
            {errors.code && <span className="text-xs text-red-600">{errors.code}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-secondary">Description</label>
            <input
              className="rounded-xl border border-default px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Description de l'événement"
            />
            {errors.description && <span className="text-xs text-red-600">{errors.description}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-secondary">Type d'événement</label>
            <select
              className="rounded-xl border border-default px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.type}
              onChange={(e) => handleChange('type', e.target.value as ManualEventInput['type'])}
            >
              <option value="chantier">Chantier</option>
              <option value="autre">Rubrique sociale</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-secondary">Image (optionnel)</label>
            <div className="flex items-center gap-3">
              {form.image ? (
                <img
                  src={form.image.image}
                  alt={form.label || form.code || 'aperçu'}
                  className="w-12 h-12 rounded-lg object-cover border border-default"
                  onError={(e) => { e.currentTarget.src = 'https://placehold.co/48x48/eeeeee/666666'; }}
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-xs text-gray-600">N/A</div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-3 py-2 rounded-xl border border-default text-primary hover:border-primary"
                  onClick={() => setIsImageSelectorOpen(true)}
                >
                  Choisir / Uploader
                </button>
                {form.image && (
                  <button
                    type="button"
                    className="px-3 py-2 rounded-xl border border-default text-secondary hover:border-red-200 hover:text-red-600"
                    onClick={() => handleChange('image', undefined)}
                  >
                    Retirer
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-secondary">Fond</label>
              <input
                type="color"
                className="h-10 w-full rounded-xl border border-default"
                value={form.color}
                onChange={(e) => handleChange('color', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-secondary">Bordure</label>
              <input
                type="color"
                className="h-10 w-full rounded-xl border border-default"
                value={form.borderColor}
                onChange={(e) => handleChange('borderColor', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-secondary">Couleur texte</label>
              <input
                type="color"
                className="h-10 w-full rounded-xl border border-default"
                value={form.textColor}
                onChange={(e) => handleChange('textColor', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="manual-actif"
              type="checkbox"
              className="h-4 w-4 text-primary"
              checked={form.actif}
              onChange={(e) => handleChange('actif', e.target.checked)}
            />
            <label htmlFor="manual-actif" className="text-sm text-secondary">Actif</label>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary-dark transition"
            >
              Créer
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-3xl border border-default bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-default">
          <h3 className="text-lg font-semibold text-primary">Tableau des événements manuels</h3>
          <span className="text-sm text-secondary">{rows.length} élément(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="bg-primary-ultra-light text-secondary text-sm">
                <th className="px-4 py-3 w-20">Image</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 w-28 text-center">Actif</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((event) => (
                <tr key={event.id} className="border-t border-default hover:bg-primary-ultra-light">
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      {event.image?.image ? (
                        <img
                          src={event.image.image}
                          alt={event.label}
                          className="w-10 h-10 rounded-lg object-cover border border-default"
                          onError={(e) => { e.currentTarget.src = 'https://placehold.co/40x40/eeeeee/666666'; }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                          N/A
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-primary">{event.label}</span>
                      <span className="text-xs text-secondary">{event.code}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${ (event as any).actif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' }`}
                      onClick={() => onToggleActive(event.id)}
                    >
                      {(event as any).actif ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-secondary" colSpan={3}>
                    Aucun événement manuel pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ImageSelectorContentModal
        isOpen={isImageSelectorOpen}
        images={images}
        actualImage={form.image || null}
        onImageSelect={(image) => {
          handleChange('image', image);
          setIsImageSelectorOpen(false);
        }}
        onClose={() => setIsImageSelectorOpen(false)}
        onImageUpload={onImageUpload}
        isUploading={isUploading}
        uploadError={uploadError}
      />
    </div>
  );
};

export default ManualEventsManager;
