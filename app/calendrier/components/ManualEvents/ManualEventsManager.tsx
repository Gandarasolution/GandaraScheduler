"use client";
import React, { useMemo } from 'react';
import { Item } from '@/app/calendrier/types';
import { DataTableFrame, CategoryStructure } from '@/app/calendrier/components/Table';
import { GenericDataItem } from '../Table/DataTableFrame';

interface ManualEventsManagerProps {
  events: Item[];
  onDeleteRequest?: (item: Item) => void;
  onEditRequest?: (item: Item) => void;
}

const ManualEventsManager: React.FC<ManualEventsManagerProps> = ({
  events,
  onDeleteRequest,
  onEditRequest,
}) => {
  const rows = useMemo(() => events.filter((e) => e.isManual), [events]);

  const categoriesStructure: CategoryStructure[] = useMemo(() => [
    {
      key: 'general',
      label: 'Informations',
      attributes: [
        {
          key: 'image',
          label: 'Image',
          type: 'custom',
          sortable: false,
          align: 'center',
          width: 200,
          renderer: (value, item) => (
            <div 
              className="flex items-center justify-center"
              onDoubleClick={() => onEditRequest && onEditRequest(item as Item)}
            >
              {(item as any).image?.image ? (
                <img
                  src={(item as any).image.image}
                  alt={item.label}
                  className="w-10 h-10 rounded-lg object-cover border border-default"
                  onError={(e) => { e.currentTarget.src = 'https://placehold.co/40x40/eeeeee/666666'; }}
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                  N/A
                </div>
              )}
            </div>
          )
        },
        {
          key: 'description',
          label: 'Description',
          type: 'custom',
          sortable: true,
          align: 'left',
          width: { min: 200, weight: 2 },
          renderer: (value, item) => (
            <div className="flex flex-col">
              <span className="font-semibold text-primary">{item.label}</span>
              <span className="text-xs text-secondary">{item.code}</span>
            </div>
          )
        },
        {
          key: 'actif',
          label: 'Statut',
          type: 'custom',
          sortable: true,
          align: 'center',
          width: 150,
          renderer: (value, item) => {
            const isActive = 'actif' in item ? (item as any).actif : true;
            return (
              <div className="flex items-center justify-center">
                {isActive ? (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Actif
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Désactivé
                  </span>
                )}
              </div>
            );
          }
        }
      ]
    }
  ], []);
  const handleRightClick = (item: GenericDataItem, e: React.MouseEvent) => {
    e.preventDefault();
    // Pour l'instant, on appelle directement onDeleteRequest
    // Le menu contextuel sera géré dans le parent ou via une modal
    if (onDeleteRequest) {
      onDeleteRequest(item as Item);
    }
  };


  return (
    <div className="">
      <DataTableFrame
        categoriesStructure={categoriesStructure}
        items={rows}
        enableHighlight={true}
        showGroupHeaders={false}
        withHeader={true}
        heightCell={70}
        cellPadding={12}
        FontSize={14}
        showColumnVisibilityToggle={false}
        onRightClick={handleRightClick}
      />
    </div>
  );
};

export default ManualEventsManager;