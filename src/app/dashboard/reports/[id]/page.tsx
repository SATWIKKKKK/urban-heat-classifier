import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import ReportDetailClient from './ReportDetailClient';

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      scenario: {
        include: {
          scenarioInterventions: {
            include: {
              intervention: {
                include: {
                  place: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!report) {
    notFound();
  }

  const download = resolvedSearchParams.download === 'true';

  return <ReportDetailClient report={report as any} download={download} />;
}
