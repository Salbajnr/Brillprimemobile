// Global type declarations for third-party SDKs

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
        };
      };
    };
    FB: {
      init: (config: any) => void;
      login: (callback: (response: any) => void, options?: any) => void;
      api: (path: string, params: any, callback: (response: any) => void) => void;
    };
    AppleID: {
      auth: {
        init: (config: any) => Promise<void>;
        signIn: () => Promise<any>;
      };
    };
  }
}

export {};