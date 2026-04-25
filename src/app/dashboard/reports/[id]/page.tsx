import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import ReportDetailClient from './ReportDetailClient';

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      scenario: {
        include: {
          scenarioInterventions: {
            include: {
              intervention: {
                include: {
                  place: {
                    select: {
                      id: true, name: true,
                      vulnerabilityLevel: true, vulnerabilityScore: true,
                      population: true, areaSqkm: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!report) notFound();

  // DRAFT reports require login
  if (report.status === 'DRAFT') {
    if (!session?.user?.id) redirect('/login');
  }

  return <ReportDetailClient report={report as any} />;
}

