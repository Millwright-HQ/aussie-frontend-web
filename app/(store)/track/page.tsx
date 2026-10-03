import { TrackForm } from './track-form';

export const metadata = { title: 'Track your order' };

export default function TrackPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-6">
      <h1 className="text-h1">Track your order</h1>
      <p className="mt-2 mb-8 text-muted">
        Enter your order number and the mobile number you ordered with. Signed-in customers can also
        see every order under <span className="font-medium">My account</span>.
      </p>
      <TrackForm />
    </div>
  );
}
