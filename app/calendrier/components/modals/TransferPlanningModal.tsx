"use client";

import { FormEvent, useEffect, useState, useMemo } from "react";
import { employeeService, evenementService } from "@/app/service";
import type { User } from "@/app/calendrier/types";
import Modal from "./Modal";
import { Loader } from "../..";
import Combobox, { type ComboboxOption } from "../ui/Combobox";

type TransferPlanningModalProps = {
  isOpen: boolean;
  sourceEmployee: User | null;
  onClose: () => void;
  onSuccess?: (data: any) => void;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

const fieldClassName = [
  "w-full min-h-12 px-4 py-3",
  "rounded-xl border border-default",
  "bg-secondary-bg text-primary",
  "text-sm transition-colors duration-200",
  "hover:border-gray-400",
  "focus:outline-none focus:border-focus",
  "focus:ring-2 focus:ring-color",
  "disabled:opacity-50 disabled:cursor-not-allowed",
].join(" ");

function getResponseData<T>(response: ApiResponse<T> | T): T | null {
  if (response && typeof response === "object" && "data" in response) {
    return (response as ApiResponse<T>).data ?? null;
  }
  return (response as T) ?? null;
}

export default function TransferPlanningModal({
  isOpen,
  sourceEmployee,
  onClose,
  onSuccess,
}: TransferPlanningModalProps) {
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [employees, setEmployees] = useState<User[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setTargetEmployeeId("");
    setStartDate("");
    setEndDate("");
    setError(null);

    const employeeId = sourceEmployee?.IdPersonnel;
    if (!employeeId || !Number.isFinite(employeeId) || employeeId <= 0) {
      setError("Identifiant du personnel invalide.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const loadEmployees = async () => {
      try {
        const response = await employeeService.getAllUsersActif();
        const data = getResponseData<User[] | { data?: User[]; rows?: User[] }>(response);
        const loadedEmployees = Array.isArray(data)
          ? data
          : data?.data ?? data?.rows ?? [];


        if (isMounted) {
          setEmployees(loadedEmployees);
          if (!loadedEmployees.some((emp) => Number(emp.IdPersonnel) === Number(employeeId))) {
            setError("Le personnel sélectionné est introuvable.");
          }
        }
      } catch {
        if (isMounted) {
          setError("Impossible de charger la liste du personnel.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadEmployees();

    return () => {
      isMounted = false;
    };
  }, [isOpen, sourceEmployee?.IdPersonnel]);

  const targetEmployees = useMemo(
    () => employees.filter((employee) => employee.IdPersonnel !== sourceEmployee?.IdPersonnel),
    [employees, sourceEmployee?.IdPersonnel]
  );

  const targetEmployeeOptions: ComboboxOption[] = useMemo(
    () =>
      targetEmployees.map((emp) => ({
        value: String(emp.IdPersonnel),
        label: `${emp.Nom}`,
      })),
    [targetEmployees]
  );

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!sourceEmployee) {
      setError("Le personnel source est invalide.");
      return;
    }
    if (!targetEmployeeId) {
      setError("Sélectionnez le personnel destinataire.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Sélectionnez une date de début et une date de fin.");
      return;
    }
    if (startDate > endDate) {
      setError("La date de début doit être antérieure ou égale à la date de fin.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = (await evenementService.transferPlanning({
        sourceEmployeeId: sourceEmployee.IdPersonnel,
        targetEmployeeId: Number(targetEmployeeId),
        startDate,
        endDate,
      })) as ApiResponse<unknown>;

      if (response?.success === false || response?.data === false) {
        throw new Error(response.message || "Le transfert n'a pas pu être effectué.");
      }

      onSuccess?.(response.data);
      onClose();
    } catch (transferError) {
      setError(
        transferError instanceof Error
          ? transferError.message
          : "Le transfert n'a pas pu être effectué."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transférer un planning"
      className="w-full max-w-2xl"
      classNameContent="px-6 pb-6"
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader message="Chargement du personnel..." />
        </div>
      ) : (
        <>
          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-xl border px-4 py-3.5 text-sm"
              style={{
                backgroundColor: "var(--color-error-50)",
                borderColor: "var(--border-error)",
                color: "var(--color-error-700)",
              }}
            >
              <span className="mt-0.5 font-bold" aria-hidden="true">!</span>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personnel source */}
            <section>
              <div className="mb-2.5 flex items-center justify-between">
                <label className="text-sm font-semibold text-primary">Personnel source</label>
                <span className="text-xs text-secondary">Point de départ</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-default bg-secondary-bg p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-600">
                  {sourceEmployee?.Prenom?.charAt(0) ?? ""}{" "}
                  {sourceEmployee?.Nom?.charAt(0) ?? ""}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-primary">
                    {sourceEmployee?.Prenom} {sourceEmployee?.Nom}
                  </p>
                </div>
              </div>
            </section>

            {/* Personnel destinataire */}
            <section>
              <label className="mb-2.5 block text-sm font-semibold text-primary">
                Personnel destinataire <span className="ml-1 text-error">*</span>
              </label>
              
              <Combobox
                multiple={false}
                options={targetEmployeeOptions}
                value={targetEmployeeId}
                onValueChange={(val: string) => setTargetEmployeeId(val)}
                placeholder="Sélectionnez un collaborateur"
                disabled={isSubmitting || targetEmployees.length === 0}
              />

              <p className="mt-2 text-xs text-secondary">
                Les événements seront affectés au collaborateur sélectionné.
              </p>
            </section>

            {/* Période */}
            <section>
              <div className="mb-2.5">
                <h3 className="text-sm font-semibold text-primary">Période du transfert</h3>
                <p className="mt-1 text-xs text-secondary">Choisissez les dates de début et de fin incluses.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="transfer-start-date" className="mb-2 block text-sm font-medium text-secondary">
                    Du <span className="ml-1 text-error">*</span>
                  </label>
                  <input
                    id="transfer-start-date"
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(event) => setStartDate(event.target.value)}
                    required
                    disabled={isSubmitting}
                    className={fieldClassName}
                  />
                </div>
                <div>
                  <label htmlFor="transfer-end-date" className="mb-2 block text-sm font-medium text-secondary">
                    Au <span className="ml-1 text-error">*</span>
                  </label>
                  <input
                    id="transfer-end-date"
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(event) => setEndDate(event.target.value)}
                    required
                    disabled={isSubmitting}
                    className={fieldClassName}
                  />
                </div>
              </div>
            </section>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 border-t border-light pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="cursor-pointer min-h-11 rounded-xl border border-default bg-primary-bg px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !sourceEmployee || targetEmployees.length === 0}
                className="cursor-pointer inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-color focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                    Transfert en cours...
                  </>
                ) : (
                  "Transférer le planning"
                )}
              </button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}