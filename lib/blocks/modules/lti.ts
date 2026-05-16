import { Link2 } from "lucide-react";
import { LtiFields } from "@/components/blocks/LtiFields";
import type { LtiBlock } from "@/lib/schema";
import type { BlockModule } from "../types";

export const ltiModule: BlockModule<"lti"> = {
  type: "lti",
  meta: {
    icon: Link2,
    iconBg: "bg-info",
    badgeColor: "default",
    title: "LTI Block",
  },
  badgeLabel: () => "LTI 1.3",
  Editor: LtiFields,
  empty: (overrides) => ({
    type: "lti",
    displayName: "LTI ใหม่",
    ltiVersion: "lti_1p3",
    launchUrl: "https://example.com/lti/launch",
    oidcUrl: "",
    keysetUrl: "",
    hasScore: false,
    weight: 1,
    launchTarget: "new_window",
    buttonText: "",
    ...overrides,
  }) as LtiBlock,
};
