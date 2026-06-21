import { ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '@/components/Logo';

function H({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mt-lg font-display text-headline-sm text-on-surface">{children}</Text>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mt-xs font-sans text-body-md leading-6 text-on-surface-variant">{children}</Text>
  );
}

export default function PrivacyScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="w-full max-w-[760px] self-center p-lg pb-xl">
        <Logo size={30} />
        <Text className="mt-lg font-display-bold text-headline-lg text-on-surface">Privacy Policy</Text>
        <Text className="mt-xs font-sans text-body-sm text-on-surface-variant">
          Last updated: 21 June 2026
        </Text>

        <P>
          FocusFlow is a time-tracking app. This policy explains what data the app handles and how.
          The guiding principle: your time data is yours, and it is never sold or used for advertising.
        </P>

        <H>What we store</H>
        <P>
          • Time entries and categories you create (task title, optional note, start/end times, duration).{'\n'}
          • If you choose to create an account: your email address, used only to sign you in and sync your
          data across your devices.{'\n'}
          • If you connect an integration (e.g. a custom API, Jira, or Azure DevOps): the connection
          settings and access credentials you provide.
        </P>

        <H>Where it is stored</H>
        <P>
          The app works fully offline — your data is stored on your device. If you sign in, your time
          entries and categories are also synced to our hosted database (Supabase) so you can access them
          on other devices. Each account can only access its own data. Integration credentials are kept in
          your device's secure storage (iOS Keychain / Android Keystore) and are not synced.
        </P>

        <H>How it is used</H>
        <P>
          Your data is used solely to provide the app's features — tracking, displaying, and syncing your
          time. We do not sell your data, share it with advertisers, or use it for profiling. Data is only
          sent to a third-party system when you explicitly connect an integration and push time to it.
        </P>

        <H>Third parties</H>
        <P>
          • Supabase — hosts authentication and the synced database.{'\n'}
          • Integrations you connect (Jira, Azure DevOps, custom APIs) receive only the time data you
          choose to push to them.
        </P>

        <H>Deleting your data</H>
        <P>
          You can delete individual entries and categories at any time inside the app. Signing out clears
          your account's data from that device. To delete your account and all associated cloud data,
          contact us at the email below and we will remove it.
        </P>

        <H>Children</H>
        <P>FocusFlow is not directed to children under 13 and does not knowingly collect their data.</P>

        <H>Contact</H>
        <P>Questions about this policy: mhammedyldz@gmail.com</P>

        <View className="h-xl" />
      </ScrollView>
    </SafeAreaView>
  );
}
