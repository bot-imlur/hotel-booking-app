import "./globals.css";

export const metadata = {
  title: "Rajmandir Kunj — Hotel Management",
  description: "Hotel booking management system for Rajmandir Kunj",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
