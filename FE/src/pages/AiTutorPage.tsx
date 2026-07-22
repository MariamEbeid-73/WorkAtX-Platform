import { useAuth } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import { ComingSoonModal } from "../components/ComingSoonModal";

export function AiTutorPage() {
  const { has } = useAuth();
  const navigate = useNavigate();
  const hasAccess = has({ plan: "elite" });

  return (
    <ComingSoonModal
      open
      onClose={() => navigate("/dashboard")}
      featureName="AI Tutoring"
      hasAccess={hasAccess}
    />
  );
}
