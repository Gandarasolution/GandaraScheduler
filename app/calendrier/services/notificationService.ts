/**
 * @fileoverview Service de gestion centralisée des notifications
 * 
 * Ce service fournit une interface unifiée pour :
 * - Création de notifications avec types et priorités
 * - Gestion automatique des notifications temporaires
 * - Templates de notifications prédéfinis
 * - Intégration avec les différents composants de l'application
 * 
 * @service NotificationService
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { Notification } from '../hooks/useNotifiactions';

export interface NotificationTemplate {
  type: Notification['type'];
  title: string;
  message: string;
}

export interface NotificationTemplates {
  // Rendez-vous
  appointmentCreated: (count?: number) => NotificationTemplate;
  appointmentUpdated: () => NotificationTemplate;
  appointmentDeleted: () => NotificationTemplate;
  appointmentMoved: () => NotificationTemplate;
  appointmentCopied: () => NotificationTemplate;
  appointmentRepeated: (count: number) => NotificationTemplate;
  appointmentDivided: () => NotificationTemplate;
  appointmentExtended: () => NotificationTemplate;
  
  // Historique
  undoSuccess: (action: string) => NotificationTemplate;
  undoEmpty: () => NotificationTemplate;
  
  // Configuration
  configSaved: (name: string) => NotificationTemplate;
  configUpdated: (name: string) => NotificationTemplate;
  configDeleted: (name: string) => NotificationTemplate;
  configDuplicated: (name: string) => NotificationTemplate;
  
  // Erreurs
  dateNotWorked: () => NotificationTemplate;
  appointmentNotFound: () => NotificationTemplate;
  operationFailed: (operation: string) => NotificationTemplate;
  
  // Succès génériques
  operationSuccess: (operation: string) => NotificationTemplate;
  
  // Avertissements
  unsavedChanges: () => NotificationTemplate;
  weekendWarning: () => NotificationTemplate;
}

/**
 * Classe de service pour la gestion des notifications
 */
export class NotificationService {
  private static instance: NotificationService;
  private addNotificationCallback?: (type: Notification['type'], title: string, message: string) => void;

  private constructor() {}

  /**
   * Obtient l'instance singleton du service
   */
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Configure le callback pour ajouter des notifications
   * @param callback - Fonction d'ajout de notification du hook
   */
  public setNotificationCallback(
    callback: (type: Notification['type'], title: string, message: string) => void
  ): void {
    this.addNotificationCallback = callback;
  }

  /**
   * Ajoute une notification
   * @param type - Type de notification
   * @param title - Titre de la notification
   * @param message - Message de la notification
   */
  public notify(type: Notification['type'], title: string, message: string): void {
    if (this.addNotificationCallback) {
      this.addNotificationCallback(type, title, message);
    } else {
      console.warn('NotificationService: No callback set for notifications');
    }
  }

  /**
   * Ajoute une notification à partir d'un template
   * @param template - Template de notification
   */
  public notifyFromTemplate(template: NotificationTemplate): void {
    this.notify(template.type, template.title, template.message);
  }

  /**
   * Templates de notifications prédéfinis
   */
  public templates: NotificationTemplates = {
    // Rendez-vous
    appointmentCreated: (count = 1) => ({
      type: 'success',
      title: 'Rendez-vous créé',
      message: count > 1 ? `${count} rendez-vous créés avec succès` : 'Rendez-vous créé avec succès'
    }),

    appointmentUpdated: () => ({
      type: 'success',
      title: 'Rendez-vous modifié',
      message: 'Le rendez-vous a été mis à jour avec succès'
    }),

    appointmentDeleted: () => ({
      type: 'success',
      title: 'Rendez-vous supprimé',
      message: 'Le rendez-vous a été supprimé avec succès'
    }),

    appointmentMoved: () => ({
      type: 'success',
      title: 'Rendez-vous déplacé',
      message: 'Le rendez-vous a été déplacé avec succès'
    }),

    appointmentCopied: () => ({
      type: 'info',
      title: 'Rendez-vous copié',
      message: 'Le rendez-vous a été copié dans le presse-papier'
    }),

    appointmentRepeated: (count: number) => ({
      type: 'success',
      title: 'Rendez-vous répétés',
      message: `${count} rendez-vous créé${count > 1 ? 's' : ''} avec succès`
    }),

    appointmentDivided: () => ({
      type: 'success',
      title: 'Rendez-vous divisé',
      message: 'Le rendez-vous a été divisé en deux parties'
    }),

    appointmentExtended: () => ({
      type: 'success',
      title: 'Rendez-vous prolongé',
      message: 'Le rendez-vous a été prolongé avec succès'
    }),

    // Historique
    undoSuccess: (action: string) => ({
      type: 'success',
      title: 'Annulation',
      message: `${action} annulé avec succès`
    }),

    undoEmpty: () => ({
      type: 'warning',
      title: 'Aucune action',
      message: 'Aucune action à annuler'
    }),

    // Configuration
    configSaved: (name: string) => ({
      type: 'success',
      title: 'Configuration sauvegardée',
      message: `La configuration "${name}" a été créée avec succès`
    }),

    configUpdated: (name: string) => ({
      type: 'success',
      title: 'Configuration modifiée',
      message: `La configuration "${name}" a été mise à jour`
    }),

    configDeleted: (name: string) => ({
      type: 'success',
      title: 'Configuration supprimée',
      message: `La configuration "${name}" a été supprimée`
    }),

    configDuplicated: (name: string) => ({
      type: 'success',
      title: 'Configuration dupliquée',
      message: `Une copie de "${name}" a été créée`
    }),

    // Erreurs
    dateNotWorked: () => ({
      type: 'error',
      title: 'Date non travaillée',
      message: 'Les dates sélectionnées ne sont pas des jours travaillés'
    }),

    appointmentNotFound: () => ({
      type: 'error',
      title: 'Rendez-vous introuvable',
      message: 'Le rendez-vous sélectionné n\'a pas pu être trouvé'
    }),

    operationFailed: (operation: string) => ({
      type: 'error',
      title: 'Opération échouée',
      message: `L'opération "${operation}" a échoué`
    }),

    // Succès génériques
    operationSuccess: (operation: string) => ({
      type: 'success',
      title: 'Opération réussie',
      message: `L'opération "${operation}" a été effectuée avec succès`
    }),

    // Avertissements
    unsavedChanges: () => ({
      type: 'warning',
      title: 'Modifications non sauvegardées',
      message: 'Vous avez des modifications non sauvegardées'
    }),

    weekendWarning: () => ({
      type: 'warning',
      title: 'Week-end inclus',
      message: 'Les week-ends sont inclus dans la planification'
    })
  };

  // Méthodes de convenance pour les notifications courantes
  public success(title: string, message: string): void {
    this.notify('success', title, message);
  }

  public error(title: string, message: string): void {
    this.notify('error', title, message);
  }

  public warning(title: string, message: string): void {
    this.notify('warning', title, message);
  }

  public info(title: string, message: string): void {
    this.notify('info', title, message);
  }

  // Méthodes spécialisées utilisant les templates
  public appointmentCreated(count?: number): void {
    this.notifyFromTemplate(this.templates.appointmentCreated(count));
  }

  public appointmentUpdated(): void {
    this.notifyFromTemplate(this.templates.appointmentUpdated());
  }

  public appointmentDeleted(): void {
    this.notifyFromTemplate(this.templates.appointmentDeleted());
  }

  public appointmentMoved(): void {
    this.notifyFromTemplate(this.templates.appointmentMoved());
  }

  public configSaved(name: string): void {
    this.notifyFromTemplate(this.templates.configSaved(name));
  }

  public configUpdated(name: string): void {
    this.notifyFromTemplate(this.templates.configUpdated(name));
  }

  public configDeleted(name: string): void {
    this.notifyFromTemplate(this.templates.configDeleted(name));
  }

  public configDuplicated(name: string): void {
    this.notifyFromTemplate(this.templates.configDuplicated(name));
  }

  public appointmentRepeated(count: number): void {
    this.notifyFromTemplate(this.templates.appointmentRepeated(count));
  }

  public undoSuccess(action: string): void {
    this.notifyFromTemplate(this.templates.undoSuccess(action));
  }
}

// Export d'une instance singleton prête à l'emploi
export const notificationService = NotificationService.getInstance();