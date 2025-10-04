import { ReactNode } from "react";
import { QuizProvider } from "./_QuizContext";

export default function QuizLayout({ children }: { children: ReactNode }) {
  return <QuizProvider>{children}</QuizProvider>;
}
