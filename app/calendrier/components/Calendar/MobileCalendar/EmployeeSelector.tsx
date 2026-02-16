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
import { Employee } from '../../../types';
import { useDebounce } from '../../../hooks';
import { useRecentEmployees } from '../../../hooks/useRecentEmployees';

interface EmployeeSelectorProps {
  employees: Employee[];
  selectedEmployee: Employee | null;
  onSelect: (employee: Employee) => void;
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
    const groups: Record<string, Employee[]> = {};
    
    searchResults.forEach(emp => {
      const groupName = emp.group?.name || 'Sans équipe';
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
      employees.some(emp => emp.id === recent.id)
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
  const handleSelect = (emp: Employee) => {
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
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1 flex items-center cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="bg-teal-50 rounded-xl p-2.5 text-teal-600 mr-3">
          <Search size={20} />
        </div>
        
        <div className="flex-1">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Employé</p>
          <p className="text-sm font-semibold text-gray-800 truncate">
            {selectedEmployee ? `${selectedEmployee.name} ${selectedEmployee.firstName}` : 'Sélectionner...'}
          </p>
        </div>

        <div className="p-2 text-gray-400">
          <ChevronDown size={20} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Panel de sélection */}
      {isOpen && (
        <div className="absolute left-6 right-6 top-full mt-2 bg-white rounded-3xl shadow-xl p-4 border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-96">
          {/* Barre de recherche */}
          <div className="sticky top-0 bg-white pb-3 border-b border-gray-100 mb-3">
            <input 
              type="text"
              placeholder="Rechercher un employé..."
              className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
            {search && (
              <p className="text-xs text-gray-400 mt-2">
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
                icon={<Clock size={14} className="text-teal-500" />}
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
                icon={<Users size={14} className="text-gray-400" />}
                employees={groupEmployees}
                isExpanded={expandedGroups.has(groupName)}
                onToggle={() => toggleGroup(groupName)}
                selectedEmployee={selectedEmployee}
                onSelect={handleSelect}
              />
            ))}
            
            {/* Message si aucun résultat */}
            {searchResults.length === 0 && (
              <div className="text-center py-8 text-gray-400">
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
  employees: Employee[];
  isExpanded: boolean;
  onToggle: () => void;
  selectedEmployee: Employee | null;
  onSelect: (employee: Employee) => void;
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
      className="flex items-center justify-between w-full px-2 py-1 hover:bg-gray-50 rounded-lg transition-colors mb-2"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{title}</span>
        <span className="text-xs text-gray-400">({employees.length})</span>
      </div>
      <ChevronDown 
        size={16} 
        className={`text-gray-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
      />
    </button>
    
    {isExpanded && (
      <div className="space-y-1 pl-1">
        {employees.map(emp => (
          <EmployeeItem 
            key={showBadge ? `recent-${emp.id}` : emp.id}
            employee={emp}
            isSelected={selectedEmployee?.id === emp.id}
            onSelect={onSelect}
            showBadge={showBadge}
          />
        ))}
      </div>
    )}
  </div>
);

interface EmployeeItemProps {
  employee: Employee;
  isSelected: boolean;
  onSelect: (employee: Employee) => void;
  showBadge?: boolean;
}

const EmployeeItem: React.FC<EmployeeItemProps> = ({ employee, isSelected, onSelect, showBadge }) => {
  const avatarUrl = employee.image?.image || `https://ui-avatars.com/api/?name=${employee.name}+${employee.firstName}&background=009580&color=fff`;
  
  return (
  <div 
    onClick={() => onSelect(employee)}
    className={`flex items-center p-2 rounded-xl cursor-pointer transition-colors ${
      isSelected ? 'bg-teal-50 border border-teal-200' : 'hover:bg-gray-50'
    }`}
  >
    <div className="relative w-9 h-9 rounded-full overflow-hidden mr-3 border border-gray-200 flex-shrink-0">
      <img 
        src={avatarUrl}
        alt={`${employee.name} ${employee.firstName}`}
        width="36"
        height="36"
        className="object-cover"
        loading="lazy"
      />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className={`text-sm font-medium truncate ${
          isSelected ? 'text-teal-700' : 'text-gray-700'
        }`}>
          {employee.name} {employee.firstName}
        </p>
        {showBadge && (
          <span className="flex-shrink-0 px-1.5 py-0.5 bg-teal-100 text-teal-700 text-[10px] font-semibold rounded">
            Récent
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <p className="text-xs text-gray-400">
          {employee.type === 'interim' ? 'Intérimaire' : 'Employé'}
        </p>
        {employee.code && (
          <>
            <span className="text-gray-300">•</span>
            <p className="text-xs text-gray-400">{employee.code}</p>
          </>
        )}
      </div>
    </div>
    {isSelected && <Check size={18} className="text-teal-500 flex-shrink-0" />}
  </div>
  );
};
