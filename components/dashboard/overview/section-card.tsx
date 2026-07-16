import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SectionCardProps = {
  title: string;
  viewAllHref?: string;
  children: React.ReactNode;
};

export function SectionCard({ title, viewAllHref, children }: SectionCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {viewAllHref ? (
          <Link href={viewAllHref} className="text-xs font-medium text-primary hover:underline">
            Lihat semua
          </Link>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
