import { MyNamaeApp } from "@/components/app/MyNamaeApp";
import { readServerPreferences } from "@/features/consent/server";
import { SHARE_MODE_PARAM, SHARE_PARAM, resultFromShare } from "@/features/share/shareLink";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function Home({ searchParams }: PageProps<"/">) {
  const [{ locale, consent }, params] = await Promise.all([readServerPreferences(), searchParams]);
  // A shared link (?r=…&m=…) restores that exact result card on the first render.
  const shared = resultFromShare(first(params[SHARE_PARAM]), first(params[SHARE_MODE_PARAM]));
  return <MyNamaeApp initialLocale={locale} initialConsent={consent} initialShared={shared} />;
}
