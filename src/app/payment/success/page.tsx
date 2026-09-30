import { PaymentConfirmationClient } from "@/components/PaymentConfirmationClient";

export const dynamic = "force-dynamic";

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = await searchParams;
  return <PaymentConfirmationClient sessionId={params.session_id} />;
}
