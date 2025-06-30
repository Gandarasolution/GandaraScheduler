"use client";
// components/AppointmentForm.tsx
import React, { useState, useEffect } from 'react';
import { Appointment, Employee } from '../types';
import { format, parseISO, setHours, setMinutes, isSameDay } from 'date-fns';
import { chantier, absences, autres } from '../../datasource'

interface AppointmentFormProps {
  appointment: Appointment | null;
  initialDate?: Date | null;
  initialEmployeeId?: number | null; // Nouvelle prop
  employees: Employee[]; // Nouvelle prop : liste de tous les employés
  onSave: (appointment: Appointment) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({
  appointment,
  initialDate,
  initialEmployeeId,
  employees,
  onSave,
  onDelete,
  onClose,
}) => {
  const [formData, setFormData] = useState<Omit<Appointment, 'id'> & { id?: number }>(
    appointment
      ? { ...appointment, startDate: appointment.startDate, endDate: appointment.endDate }
      : {
          title: '',
          description: '',
          startDate: initialDate || new Date(),
          endDate: initialDate ? setHours(setMinutes(initialDate, 0), initialDate.getHours() + 4) : new Date(),
          imageUrl: '',
          employeeId: initialEmployeeId || (employees.length > 0 ? employees[0].id : ''), // Par défaut au premier employé ou vide
        }
  );


  useEffect(() => {
    if (appointment) {
      setFormData({ ...appointment, startDate: appointment.startDate, endDate: appointment.endDate });
    } else if (initialDate || initialEmployeeId) {
      const defaultStartTime = isSameDay(initialDate || new Date(), new Date()) ? new Date().getHours() : 9;
      setFormData({
        title: '',
        description: '',
        startDate: setHours(setMinutes(initialDate || new Date(), 0), defaultStartTime),
        endDate: setHours(setMinutes(initialDate || new Date(), 0), defaultStartTime + 4),
        imageUrl: '',
        employeeId: initialEmployeeId || (employees.length > 0 ? employees[0].id : ''),
      });
    }
  }, [appointment, initialDate, initialEmployeeId, employees]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'employeeId') {
      // Si l'ID de l'employé change, on met à jour le champ employeeId
      setFormData((prev) => ({ ...prev, employeeId: Number(value) }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const datePart = parseISO(value);
    let newDate: Date;

    if (name === 'startDate') {
        newDate = setHours(setMinutes(datePart, (formData.startDate || new Date()).getMinutes()), (formData.startDate || new Date()).getHours());
        const diffHours = (formData.endDate.getTime() - formData.startDate.getTime()) / (1000 * 60 * 60);
        const newEndDate = setHours(setMinutes(datePart, (formData.endDate || new Date()).getMinutes()), (formData.endDate || new Date()).getHours());
        setFormData(prev => ({ ...prev, startDate: newDate, endDate: newEndDate }));
    } else if (name === 'endDate') {
        newDate = setHours(setMinutes(datePart, (formData.endDate || new Date()).getMinutes()), (formData.endDate || new Date()).getHours());
        setFormData(prev => ({ ...prev, endDate: newDate }));
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const [hours, minutes] = value.split(':').map(Number);
    let newDate: Date;

    if (name === 'startTime') {
        newDate = setHours(setMinutes(formData.startDate, minutes), hours);
        const diff = formData.endDate.getTime() - formData.startDate.getTime();
        setFormData(prev => ({ ...prev, startDate: newDate, endDate: new Date(newDate.getTime() + diff) }));
    } else if (name === 'endTime') {
        newDate = setHours(setMinutes(formData.endDate, minutes), hours);
        setFormData(prev => ({ ...prev, endDate: newDate }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();    
    onSave(formData as Appointment);
  };

  const handleDelete = () => {
    if (formData.id && confirm('Êtes-vous sûr de vouloir supprimer ce rendez-vous ?')) {
      onDelete(formData.id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Chantier:</label>
        <select
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          {appointment?.type === 'Chantier' ? chantier.map((c) => (
            <option key={c.id} value={c.label}>
              {c.label}
            </option>
          )) : appointment?.type === 'Absence' ? absences.map((a) => (
            <option key={a.id} value={a.label}>
              {a.label}
            </option>
          )) : appointment?.type === 'Autre' ? autres.map((o) => (
            <option key={o.id} value={o.label}>
              {o.label}
            </option>
          )) : null}
        </select>
      </div>
  
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description:</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        ></textarea>
      </div>

      <div>
        <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">URL Image (optionnel):</label>
        <input
          type="text"
          id="imageUrl"
          name="imageUrl"
          value={formData.imageUrl || ''}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">Assigné à:</label>
        <select
          id="employeeId"
          name="employeeId"
          value={formData.employeeId}
          onChange={handleChange}
          required
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Date de début:</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={format(formData.startDate, 'yyyy-MM-dd')}
            onChange={handleDateChange}
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">Heure de début:</label>
          <input
            type="time"
            id="startTime"
            name="startTime"
            value={format(formData.startDate, 'HH:mm')}
            onChange={handleTimeChange}
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">Date de fin:</label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={format(formData.endDate, 'yyyy-MM-dd')}
            onChange={handleDateChange}
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">Heure de fin:</label>
          <input
            type="time"
            id="endTime"
            name="endTime"
            value={format(formData.endDate, 'HH:mm')}
            onChange={handleTimeChange}
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-4">
        {appointment && (
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Supprimer
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {appointment ? 'Enregistrer les modifications' : 'Créer le rendez-vous'}
        </button>
      </div>
    </form>
  );
};

export default AppointmentForm;