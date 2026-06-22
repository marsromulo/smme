import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "M&E Platform | SMME",
  description:
    "Static platform screens for school management, monitoring, evaluation, and regulatory document review.",
};

export default function PlatformRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
