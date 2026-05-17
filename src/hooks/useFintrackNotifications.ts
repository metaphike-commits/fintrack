"use client";

import { useEffect } from "react";
import { usePreferencesStore } from "@/store/preferences";
import { sendFintrackNotification } from "@/lib/notifications";

interface NotifInputs {
  runwayJours: number | null;
  pointBas: number | null;
  confortThreshold: number;
  monthlyNet: number;
}

export function useFintrackNotifications({
  runwayJours,
  pointBas,
  confortThreshold,
  monthlyNet,
}: NotifInputs) {
  const { notificationsEnabled, notificationRunwayThreshold } = usePreferencesStore();

  useEffect(() => {
    if (!notificationsEnabled) return;

    if (runwayJours !== null && runwayJours < notificationRunwayThreshold) {
      sendFintrackNotification(
        "Runway critique — Fintrack",
        `Il vous reste ${runwayJours} jour${runwayJours > 1 ? "s" : ""} de trésorerie. Révisez vos dépenses dès maintenant.`,
        "runway"
      );
    }

    if (pointBas !== null && pointBas < confortThreshold) {
      sendFintrackNotification(
        "Point bas sous le seuil de confort — Fintrack",
        `Votre solde projeté descendra sous ${confortThreshold} €. Anticipez une rentrée d'argent.`,
        "pointbas"
      );
    }

    if (monthlyNet < 0) {
      sendFintrackNotification(
        "Flux mensuel négatif — Fintrack",
        `Vos dépenses dépassent vos revenus de ${Math.abs(Math.round(monthlyNet))} € ce mois-ci.`,
        "flux"
      );
    }
  }, [notificationsEnabled, notificationRunwayThreshold, runwayJours, pointBas, confortThreshold, monthlyNet]);
}
