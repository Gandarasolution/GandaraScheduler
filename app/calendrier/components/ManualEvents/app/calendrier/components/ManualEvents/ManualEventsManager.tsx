"use client";
import React, { useMemo } from 'react';
import { Item } from '@/app/calendrier/types';
import { DataTableFrame, CategoryStructure } from '@/app/calendrier/components/Table';

interface ManualEventsManagerProps {
  events: Item[];
}

const ManualEventsManager: React.FC<ManualEventsManagerProps> = ({
  events,
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
            <div className="flex items-center justify-center">
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
        }
      ]
    }
  ], []);

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
      />
    </div>
  );
};

export default ManualEventsManager;