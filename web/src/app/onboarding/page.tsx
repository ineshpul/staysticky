import { Suspense } from "react";
import { OnboardingPage } from "@/components/OnboardingPage";

export default function OnboardingRoute() {
  return (
    <Suspense
      fallback={
        <div className="marketing-wrap" style={{ minHeight: "50vh", color: "#6E6A62" }}>
          Loading setup…
        </div>
      }
    >
      <OnboardingPage />
    </Suspense>
  );
}
