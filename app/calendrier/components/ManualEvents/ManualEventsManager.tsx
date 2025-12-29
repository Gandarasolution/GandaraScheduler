"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { ImageSelectorContentModal } from '../modals';
import { Image, Item } from '../../types';
import { getEventCategories } from '@/app/datasource';

interface ManualEventInput {
  code: string;
  label: string;
  description: string;
  image?: Image;
  color: string;
  borderColor: string;
  textColor: string;
  actif: boolean;
  type: 'autre';
  category: string;
}

interface ManualEventsManagerProps {
  events: Item[];
  images: Image[];
  onCreate: (payload: ManualEventInput) => void;
  onToggleActive: (id: number) => void;
  onDelete: (id: number) => void;
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
  category: '',
};

const ManualEventsManager: React.FC<ManualEventsManagerProps> = ({
  events,
  images,
  onCreate,
  onToggleActive,
  onDelete,
  onImageUpload,
  isUploading,
  uploadError,
}) => {
  const [form, setForm] = useState<ManualEventInput>(defaultForm);
  const [errors, setErrors] = useState<{ code?: string; label?: string; description?: string; category?: string }>({});
  const [isImageSelectorOpen, setIsImageSelectorOpen] = useState(false);

  const handleChange = <K extends keyof ManualEventInput>(key: K, value: ManualEventInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const categoryOptions = useMemo(() => {
    const cat = getEventCategories();
    const categories = new Set(cat.map(c => c.name));
    if (categories.size === 0) categories.add('Autre');
    return Array.from(categories);
  }, [events]);

  useEffect(() => {
    if (!form.category && categoryOptions.length > 0) {
      setForm((prev) => ({ ...prev, category: categoryOptions[0] }));
    }

    if (form.category && categoryOptions.length > 0 && !categoryOptions.includes(form.category)) {
      setForm((prev) => ({ ...prev, category: categoryOptions[0] }));
    }
  }, [form.category, categoryOptions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { code?: string; label?: string; description?: string; category?: string } = {};
    if (!form.code.trim()) nextErrors.code = 'Code requis';
    if (!form.label.trim()) nextErrors.label = 'Libellé requis';
    if (!form.description.trim()) nextErrors.description = 'Description requise';
    if (!form.category.trim()) nextErrors.category = 'Catégorie requise';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onCreate(form);
    setForm({
      ...defaultForm,
      color: form.color,
      borderColor: form.borderColor,
      textColor: form.textColor,
      category: form.category || categoryOptions[0] || defaultForm.category,
    });
  };

  const rows = useMemo(() => events.filter((e) => e.isManual), [events]);

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
            <label className="text-sm text-secondary">Catégorie</label>
            <select
              className="rounded-xl border border-default px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
            >
              {categoryOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {errors.category && <span className="text-xs text-red-600">{errors.category}</span>}
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
                <th className="px-4 py-3 w-24 text-center">Actions</th>
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
                  <td className="px-4 py-3 text-center">
                    <button
                      className="px-3 py-2 rounded-full text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200"
                      onClick={() => onDelete(event.id)}
                    >
                      <svg id="Layer_1" enableBackground="new 0 0 512 512" height="24" viewBox="0 0 512 512" width="24" xmlns="http://www.w3.org/2000/svg"><g><path d="m479.867 111.4c0-25.99-21.145-47.134-47.135-47.134h-81.398v-9.101c0-30.417-24.748-55.165-55.168-55.165h-80.332c-30.42 0-55.168 24.748-55.168 55.166v9.101h-81.4c-25.989 0-47.133 21.144-47.133 47.134 0 20.745 13.478 38.39 32.133 44.671v300.761c0 30.419 24.748 55.167 55.167 55.167h273.133c30.419 0 55.166-24.748 55.166-55.167v-300.761c18.657-6.281 32.135-23.926 32.135-44.672zm-289.201-56.234c0-13.876 11.291-25.166 25.168-25.166h80.332c13.878 0 25.168 11.29 25.168 25.166v9.101h-130.668zm201.9 426.834h-273.132c-13.877 0-25.167-11.29-25.167-25.167v-298.3h323.466v298.3c-.001 13.877-11.29 25.167-25.167 25.167zm40.166-353.467h-353.466c-9.447 0-17.133-7.686-17.133-17.133 0-9.448 7.686-17.134 17.133-17.134h353.466c9.448 0 17.135 7.686 17.135 17.134s-7.686 17.133-17.135 17.133z"/><path d="m167.633 192.8c-8.284 0-15 6.716-15 15v224.934c0 8.284 6.716 15 15 15s15-6.716 15-15v-224.934c0-8.284-6.716-15-15-15z"/><path d="m256 192.8c-8.284 0-15 6.716-15 15v224.934c0 8.284 6.716 15 15 15s15-6.716 15-15v-224.934c0-8.284-6.716-15-15-15z"/><path d="m344.367 192.8c-8.284 0-15 6.716-15 15v224.934c0 8.284 6.716 15 15 15s15-6.716 15-15v-224.934c0-8.284-6.716-15-15-15z"/></g></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-secondary" colSpan={4}>
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
