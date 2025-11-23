import { createContext, useContext, useState, ReactNode } from "react";

interface LoadingState {
  isLoading: boolean;
  progress: number;
  message: string;
  operation: string;
}

interface LoadingContextValue {
  loading: LoadingState;
  startLoading: (operation: string, message: string) => void;
  updateProgress: (progress: number, message?: string) => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextValue | undefined>(undefined);

export const LoadingProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: false,
    progress: 0,
    message: "",
    operation: "",
  });

  const startLoading = (operation: string, message: string) => {
    setLoading({
      isLoading: true,
      progress: 0,
      message,
      operation,
    });
  };

  const updateProgress = (progress: number, message?: string) => {
    setLoading((prev) => ({
      ...prev,
      progress,
      message: message || prev.message,
    }));
  };

  const stopLoading = () => {
    setLoading({
      isLoading: false,
      progress: 0,
      message: "",
      operation: "",
    });
  };

  return (
    <LoadingContext.Provider value={{ loading, startLoading, updateProgress, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within LoadingProvider");
  }
  return context;
};
