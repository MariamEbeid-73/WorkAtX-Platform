import { useAuth } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import { ComingSoonModal } from "../components/ComingSoonModal";

export function CvOptimizerPage() {
  const { has } = useAuth();
  const navigate = useNavigate();
  const hasAccess = has({ plan: "elite" });

  return (
    <ComingSoonModal
      open
      onClose={() => navigate("/dashboard")}
      featureName="CV Optimizer"
      hasAccess={hasAccess}
    />
  );
}
