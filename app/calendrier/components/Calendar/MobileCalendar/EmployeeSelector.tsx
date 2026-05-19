/**
 * @fileoverview Composant de sélection d'employé intelligent pour mobile
 * 
 * Fonctionnalités :
 * - Recherche fuzzy avec Fuse.js
 * - Employés récents (3 derniers)
 * - Groupement par équipe
 * - Sections collapsables
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, Clock, Users } from 'lucide-react';
import Fuse from 'fuse.js';
import { User } from '../../../types';
import { Image } from '../../ui/Image';
import { getCachedImageById } from '../../../utils/imageCacheStore';
import { 
  useDebounce,
  useRecentEmployees
} from '@/app/calendrier/hooks';

interface EmployeeSelectorProps {
  employees: User[];
  selectedEmployee: User | null;
  onSelect: (employee: User) => void;
}

export const EmployeeSelector: React.FC<EmployeeSelectorProps> = ({ 
  employees, 
  selectedEmployee, 
  onSelect 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['récents']));
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { recentEmployees, addRecentEmployee } = useRecentEmployees();
  
  // Debouncing de la recherche pour optimiser les performances
  const debouncedSearch = useDebounce(search, 300);

  // Configuration de Fuse.js pour la recherche floue
  const fuse = useMemo(() => {
    return new Fuse(employees, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'firstName', weight: 2 },
        { name: 'code', weight: 1 },
        { name: 'group.name', weight: 0.5 },
      ],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 2,
    });
  }, [employees]);

  // Recherche intelligente avec Fuse.js
  const searchResults = useMemo(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      return employees;
    }
    const results = fuse.search(debouncedSearch);
    return results.map(result => result.item);
  }, [debouncedSearch, fuse, employees]);

  // Grouper les employés par équipe
  const groupedEmployees = useMemo(() => {
    const groups: Record<string, User[]> = {};
    
    searchResults.forEach(emp => {
      const groupName = emp.Equipe?.Nom || 'Sans équipe';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(emp);
    });
    
    return groups;
  }, [searchResults]);

  // Filtrer les employés récents qui sont dans la liste actuelle
  const validRecentEmployees = useMemo(() => {
    return recentEmployees.filter(recent => 
      employees.some(emp => emp.IdPersonnel === recent.IdPersonnel)
    );
  }, [recentEmployees, employees]);

  // Basculer l'expansion d'un groupe
  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  // Gestion de la sélection
  const handleSelect = (emp: User) => {
    addRecentEmployee(emp);
    onSelect(emp);
    setIsOpen(false);
    setSearch('');
  };

  // Fermeture au clic extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  return (
    <div className="px-6 mb-6 relative z-5" ref={wrapperRef}>
      {/* Bouton de sélection */}
      <div 
        className="rounded-2xl border p-1 flex items-center cursor-pointer transition-shadow"
        style={{
          backgroundColor: 'var(--bg-card)',
          boxShadow: 'var(--shadow-sm)',
          borderColor: 'var(--border-light)'
        }}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        }}
      >
        <div 
          className="rounded-xl p-2.5 mr-3"
          style={{
            backgroundColor: 'var(--color-primary-100)',
            color: 'var(--color-primary-500)'
          }}
        >
          <Search size={20} />
        </div>
        
        <div className="flex-1">
          <p 
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Employé
          </p>
          <p 
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {selectedEmployee ? `${selectedEmployee.Nom} ${selectedEmployee.Prenom}` : 'Sélectionner...'}
          </p>
        </div>

        <div className="p-2" style={{ color: 'var(--text-tertiary)' }}>
          <ChevronDown size={20} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Panel de sélection */}
      {isOpen && (
        <div 
          className="absolute left-6 right-6 top-full mt-2 rounded-3xl p-4 border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-96"
          style={{
            backgroundColor: 'var(--bg-card)',
            boxShadow: 'var(--shadow-xl)',
            borderColor: 'var(--border-light)'
          }}
        >
          {/* Barre de recherche */}
          <div 
            className="sticky top-0 pb-3 border-b mb-3"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-light)'
            }}
          >
            <input 
              type="text"
              placeholder="Rechercher un employé..."
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)'
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = '2px solid var(--color-primary-500)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
              }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
            {search && (
              <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
          
          {/* Liste des employés */}
          <div className="overflow-y-auto max-h-72 no-scrollbar space-y-3">
            {/* Section Employés Récents */}
            {validRecentEmployees.length > 0 && !search && (
              <EmployeeGroup
                title="Récents"
                icon={<Clock size={14} style={{ color: 'var(--color-primary-500)' }} />}
                employees={validRecentEmployees}
                isExpanded={expandedGroups.has('récents')}
                onToggle={() => toggleGroup('récents')}
                selectedEmployee={selectedEmployee}
                onSelect={handleSelect}
                showBadge
              />
            )}

            {/* Sections par Équipe */}
            {Object.entries(groupedEmployees).map(([groupName, groupEmployees]) => (
              <EmployeeGroup
                key={groupName}
                title={groupName}
                icon={<Users size={14} style={{ color: 'var(--text-tertiary)' }} />}
                employees={groupEmployees}
                isExpanded={expandedGroups.has(groupName)}
                onToggle={() => toggleGroup(groupName)}
                selectedEmployee={selectedEmployee}
                onSelect={handleSelect}
              />
            ))}
            
            {/* Message si aucun résultat */}
            {searchResults.length === 0 && (
              <div className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
                <Search size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">Aucun employé trouvé</p>
                <p className="text-xs mt-1">Essayez un autre terme de recherche</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ===== COMPOSANTS SECONDAIRES =====

interface EmployeeGroupProps {
  title: string;
  icon: React.ReactNode;
  employees: User[];
  isExpanded: boolean;
  onToggle: () => void;
  selectedEmployee: User | null;
  onSelect: (employee: User) => void;
  showBadge?: boolean;
}

const EmployeeGroup: React.FC<EmployeeGroupProps> = ({
  title,
  icon,
  employees,
  isExpanded,
  onToggle,
  selectedEmployee,
  onSelect,
  showBadge,
}) => (
  <div className="mb-3">
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="flex items-center justify-between w-full px-2 py-1 rounded-lg transition-colors mb-2"
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span 
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-secondary)' }}
        >
          {title}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>({employees.length})</span>
      </div>
      <ChevronDown 
        size={16} 
        className={`transition-transform ${isExpanded ? '' : '-rotate-90'}`}
        style={{ color: 'var(--text-tertiary)' }}
      />
    </button>
    
    {isExpanded && (
      <div className="space-y-1 pl-1">
        {employees.map(emp => (
          <EmployeeItem 
            key={showBadge ? `recent-${emp.IdPersonnel}` : emp.IdPersonnel}
            employee={emp}
            isSelected={selectedEmployee?.IdPersonnel === emp.IdPersonnel}
            onSelect={onSelect}
            showBadge={showBadge}
          />
        ))}
      </div>
    )}
  </div>
);

interface EmployeeItemProps {
  employee: User;
  isSelected: boolean;
  onSelect: (employee: User) => void;
  showBadge?: boolean;
}

const EmployeeItem: React.FC<EmployeeItemProps> = ({ employee, isSelected, onSelect, showBadge }) => {
  const cachedImage = employee.IdImage ? getCachedImageById(employee.IdImage) : undefined;
  const avatarSource = employee.IdImage
    ? (cachedImage?.image || employee.IdImage)
    : `https://ui-avatars.com/api/?name=${employee.Nom}+${employee.Prenom}&background=009580&color=fff`;
  const isInactive = employee.Actif === false;
  
  return (
  <div 
    onClick={() => onSelect(employee)}
    className="flex items-center p-2 rounded-xl cursor-pointer transition-colors border"
    style={{
      backgroundColor: isSelected ? 'var(--color-primary-100)' : 'transparent',
      borderColor: isSelected ? 'var(--color-primary-500)' : 'transparent',
      opacity: isInactive ? 0.5 : 1
    }}
    onMouseEnter={(e) => {
      if (!isSelected) {
        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
      }
    }}
    onMouseLeave={(e) => {
      if (!isSelected) {
        e.currentTarget.style.backgroundColor = 'transparent';
      }
    }}
  >
    <div 
      className={`relative w-9 h-9 rounded-full overflow-hidden mr-3 border flex-shrink-0 ${isInactive ? 'grayscale' : ''}`}
      style={{ borderColor: 'var(--border-light)' }}
    >
      <Image 
        image={avatarSource}
        className="w-9 h-9 object-cover"
      />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p 
          className="text-sm font-medium truncate"
          style={{ 
            color: isInactive ? 'var(--text-tertiary)' : (isSelected ? 'var(--color-primary-600)' : 'var(--text-primary)')
          }}
        >
          {employee.Nom} {employee.Prenom}
        </p>
        {showBadge && (
          <span 
            className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded"
            style={{
              backgroundColor: 'var(--color-primary-100)',
              color: 'var(--color-primary-600)'
            }}
          >
            Récent
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {employee.Type === 'INTERIM' ? 'Intérimaire' : 'Employé'}
        </p>
        {employee.Code && (
          <>
            <span style={{ color: 'var(--border-light)' }}>•</span>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{employee.Code}</p>
          </>
        )}
      </div>
    </div>
    {isSelected && <Check size={18} className="flex-shrink-0" style={{ color: 'var(--color-primary-500)' }} />}
  </div>
  );
};
