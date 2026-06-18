import { useEffect, useRef } from "react";

interface Props {
  googleClientId: string;
  onCredential: (credential: string) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          renderButton: (element: HTMLElement, config: object) => void;
        };
      };
    };
  }
}

export function GoogleSignInButton({ googleClientId, onCredential, disabled }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  useEffect(() => { callbackRef.current = onCredential; });

  useEffect(() => {
    if (!googleClientId || disabled) return;

    const init = () => {
      if (!window.google?.accounts?.id || !containerRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response: { credential: string }) => {
          callbackRef.current(response.credential);
        },
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "filled_black",
        size: "large",
        type: "standard",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: "368",
      });
    };

    if (window.google?.accounts?.id) {
      init();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      existing.addEventListener("load", init);
      return () => existing.removeEventListener("load", init);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = init;
    document.head.appendChild(script);
  }, [googleClientId, disabled]);

  if (!googleClientId) return null;

  return (
    <div className="flex justify-center overflow-hidden rounded-xl">
      <div ref={containerRef} />
    </div>
  );
}
