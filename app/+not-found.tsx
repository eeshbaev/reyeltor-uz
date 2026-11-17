import { Redirect } from 'expo-router';

/** Fallback for unknown deep links (e.g. bare reyeltor:///) — send to app entry. */
export default function NotFound() {
  return <Redirect href="/" />;
}
