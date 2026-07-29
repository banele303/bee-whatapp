import type {
  DetailedHTMLProps,
  HTMLAttributes,
  RefAttributes,
} from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "elevenlabs-convai": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > &
        RefAttributes<HTMLElement> & {
          "signed-url": string;
          "dynamic-variables"?: string;
          variant?: "tiny" | "compact" | "full";
          placement?:
            | "top-left"
            | "top"
            | "top-right"
            | "bottom-left"
            | "bottom"
            | "bottom-right";
          dismissible?: "true" | "false";
          "text-input"?: "true" | "false";
          "avatar-orb-color-1"?: string;
          "avatar-orb-color-2"?: string;
        };
    }
  }
}
