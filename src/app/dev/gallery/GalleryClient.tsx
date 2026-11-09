'use client';

/* Dev-only gallery: placeholder strings below are sample data, not product copy. */
import { useState, type ReactNode } from 'react';

import { ArrowLeftIcon } from '@/components/icons/ArrowLeftIcon';
import { PersonIcon } from '@/components/icons/PersonIcon';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminTopbar } from '@/components/layout/AdminTopbar';
import { Brace } from '@/components/layout/Brace';
import { Decoration } from '@/components/layout/Decoration';
import { MobileActionBar } from '@/components/layout/MobileActionBar';
import { VoterFooter } from '@/components/layout/VoterFooter';
import { VoterNavbar } from '@/components/layout/VoterNavbar';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { PasswordField } from '@/components/ui/PasswordField';
import { SearchField } from '@/components/ui/SearchField';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { StatCard } from '@/components/ui/StatCard';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toaster';

function Section({
  title,
  children,
  dark = false,
}: {
  title: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <section
      data-surface={dark ? 'dark' : undefined}
      className={dark ? 'flex flex-col gap-16 bg-bg-navy p-24' : 'flex flex-col gap-16 p-24'}
    >
      <h2
        className={dark ? 'text-heading-6 text-text-on-dark' : 'text-heading-6 text-text-primary'}
      >
        {title}
      </h2>
      <div className="flex flex-wrap items-start gap-16">{children}</div>
    </section>
  );
}

export function GalleryClient() {
  const [dialog, setDialog] = useState(false);
  const [sheet, setSheet] = useState(false);
  const { toast } = useToast();

  return (
    <div className="flex flex-col">
      <VoterNavbar />
      <VoterNavbar
        voterName="Member name"
        signOutSlot={<Button variant="on-dark">Sign out</Button>}
      />

      <h1 className="p-24 text-heading-3">Component gallery</h1>

      <Section title="Buttons">
        <Button>Select</Button>
        <Button variant="secondary">Vision &amp; mission</Button>
        <Button variant="dark">Selected</Button>
        <Button disabled>Review &amp; submit</Button>
        <Button variant="secondary" disabled>
          Previous
        </Button>
        <Button loading>Submit vote</Button>
      </Section>
      <Section title="Buttons on navy" dark>
        <Button variant="on-dark">Sign out</Button>
        <Button variant="on-dark">Select this candidate</Button>
        <Button variant="outline-on-dark" icon={<ArrowLeftIcon />}>
          Back to candidates
        </Button>
      </Section>

      <Section title="Badges">
        <Badge tone="info">Open</Badge>
        <Badge tone="success">Open</Badge>
        <Badge tone="warning">Open</Badge>
        <Badge tone="danger">Open</Badge>
        <Badge tone="neutral">Not voted</Badge>
      </Section>

      <Section title="Stat cards">
        <StatCard label="Registered voters" value="300" className="w-255" />
        <StatCard
          label="Turnout"
          value="80%"
          note="Members on the voter register"
          className="w-255"
        />
      </Section>

      <Section title="Fields">
        <div className="flex w-456 flex-col gap-20">
          <TextField label="Email" required placeholder="committee@bcc.ub.ac.id" />
          <TextField
            label="Email"
            required
            defaultValue="member@student.ub.ac.id"
            error="This email isn't on the voter register."
          />
          <PasswordField label="Password" required placeholder="Enter your password" />
          <SearchField label="Search voters" placeholder="Search by name or email" />
        </div>
        <div className="flex w-456 flex-col gap-16">
          <Alert tone="danger" role="alert">
            That email and password don&apos;t match. Check them and try again.
          </Alert>
          <Alert tone="info">Shares are based on 240 valid votes.</Alert>
          <Skeleton className="h-48 w-full" />
          <div className="flex items-center gap-16">
            <Spinner />
            <Spinner size={40} />
            <PersonIcon size={48} className="text-primary-300" />
          </div>
        </div>
      </Section>

      <Section title="Overlays">
        <Button
          onClick={() => {
            setDialog(true);
          }}
        >
          Open dialog
        </Button>
        <Button
          onClick={() => {
            setSheet(true);
          }}
        >
          Open bottom sheet
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            toast({
              title: 'Someone else changed the state',
              description: 'The page has been refreshed.',
              tone: 'info',
            });
          }}
        >
          Show toast
        </Button>
      </Section>

      <Section title="Brace" dark>
        <Brace pose="hello" width={200} />
        <Brace pose="woah" width={200} />
        <Brace pose="glory" width={200} />
      </Section>

      <Section title="Decoration" dark>
        <Decoration corner="top-right" />
        <Decoration corner="bottom-left" />
      </Section>

      <Section title="Admin">
        <div className="flex h-640 overflow-hidden rounded-xl border border-border-card">
          <AdminSidebar
            active="overview"
            resultsLocked
            onResultsLocked={() => undefined}
            onSignOut={() => undefined}
          />
          <div className="w-760 p-40">
            <AdminTopbar page="Overview" accountName="Election Committee" />
          </div>
        </div>
      </Section>

      <VoterFooter />
      <MobileActionBar
        label="Your pick"
        value="Candidate Name 01"
        action={<Button>Review &amp; submit</Button>}
      />

      <Dialog
        open={dialog}
        onOpenChange={setDialog}
        title="Vote for Candidate Name 01?"
        description="You can only vote once. After you submit, you cannot change your vote."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button>Submit vote</Button>
          </>
        }
      />
      <BottomSheet
        open={sheet}
        onOpenChange={setSheet}
        title="Vote for Candidate Name 01?"
        description="You can only vote once. After you submit, you can't change it."
        actions={
          <>
            <Button fullWidth>Submit vote</Button>
            <Button
              fullWidth
              variant="secondary"
              onClick={() => {
                setSheet(false);
              }}
            >
              Cancel
            </Button>
          </>
        }
      />
    </div>
  );
}
