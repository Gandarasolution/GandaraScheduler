/**
 * @fileoverview Composant d'indicateur de collaboration en temps réel
 * 
 * Affiche l'état de la connexion et les utilisateurs actuellement connectés
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

import React from 'react';
import { Users, Wifi, WifiOff } from 'lucide-react';

interface ConnectedUser {
  id: string | number;
  name: string;
  color: string;
}

interface CollaborationIndicatorProps {
  isConnected: boolean;
  isSynced: boolean;
  connectedUsers: ConnectedUser[];
  className?: string;
}

export const CollaborationIndicator: React.FC<CollaborationIndicatorProps> = ({
  isConnected,
  isSynced,
  connectedUsers,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const statusColor = isConnected && isSynced 
    ? 'text-green-600' 
    : isConnected 
    ? 'text-yellow-600' 
    : 'text-red-600';

  const statusText = isConnected && isSynced 
    ? 'Synchronisé' 
    : isConnected 
    ? 'Connexion...' 
    : 'Déconnecté';

  return (
    <div className={`relative ${className}`}>
      {/* Bouton principal */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
          isConnected 
            ? 'bg-white border-gray-200 hover:bg-gray-50' 
            : 'bg-gray-100 border-gray-300'
        }`}
        title={statusText}
      >
        {isConnected ? (
          <Wifi className={`w-4 h-4 ${statusColor}`} />
        ) : (
          <WifiOff className="w-4 h-4 text-red-600" />
        )}
        
        {connectedUsers.length > 0 && (
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              {connectedUsers.length}
            </span>
          </div>
        )}
        
        {/* Indicateur pulsant si synchronisé */}
        {isConnected && isSynced && (
          <div className="relative">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75"></div>
          </div>
        )}
      </button>

      {/* Menu déroulant des utilisateurs */}
      {isExpanded && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className={`w-4 h-4 ${statusColor}`} />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${statusColor}`}>
                {statusText}
              </span>
            </div>
          </div>

          {connectedUsers.length > 0 ? (
            <div className="p-2 max-h-64 overflow-y-auto">
              <div className="text-xs font-medium text-gray-500 px-2 py-1 mb-1">
                Utilisateurs connectés ({connectedUsers.length})
              </div>
              {connectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: user.color }}
                  />
                  <span className="text-sm text-gray-700">{user.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">
              Aucun autre utilisateur connecté
            </div>
          )}
        </div>
      )}

      {/* Overlay pour fermer le menu */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};
