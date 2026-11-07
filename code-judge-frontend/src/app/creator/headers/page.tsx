import { MyHeadersPage } from "@/components/creator/headers/MyHeadersPage";

export const metadata = {
  title: "Paper Headers",
  description: "Manage custom college letterheads for your question paper PDFs.",
};

export default function HeadersRoute() {
  return <MyHeadersPage />;
}
